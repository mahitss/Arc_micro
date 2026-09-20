package webhook

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

// WebhookRepository defines data persistence operations required by the Dispatcher.
type WebhookRepository interface {
	ListWebhookEndpoints(ctx context.Context, orgID string) ([]*WebhookEndpoint, error)
	GetWebhookEndpoint(ctx context.Context, id, orgID string) (*WebhookEndpoint, error)
	SaveWebhookDelivery(ctx context.Context, delivery *WebhookDelivery) error
	UpdateWebhookDelivery(ctx context.Context, delivery *WebhookDelivery) error
	UpdateWebhookEndpointStatus(ctx context.Context, id, orgID string, failureCount int, lastDelivery time.Time) error
	SaveDomainEvent(ctx context.Context, event *domain.DomainEvent) error
}

// Dispatcher coordinates event matching, signing, and reliable delivery to webhook endpoints.
type Dispatcher struct {
	repo       WebhookRepository
	validator  *SSRFValidator
	httpClient *http.Client
	secrets    map[string]string // In-memory/cached plaintext secrets keyed by endpoint ID (for signing)
}

// NewDispatcher initializes a new webhook dispatcher.
func NewDispatcher(repo WebhookRepository, validator *SSRFValidator, client *http.Client) *Dispatcher {
	if validator == nil {
		validator = NewSSRFValidator(false)
	}
	if client == nil {
		transport := &http.Transport{
			DialContext:           validator.SafeDialContext(),
			ResponseHeaderTimeout: 5 * time.Second,
		}
		client = &http.Client{
			Transport: transport,
			Timeout:   5 * time.Second,
		}
	}
	return &Dispatcher{
		repo:       repo,
		validator:  validator,
		httpClient: client,
		secrets:    make(map[string]string),
	}
}

// RegisterSecret caches an endpoint's plaintext secret in memory for signing.
func (d *Dispatcher) RegisterSecret(endpointID, secret string) {
	d.secrets[endpointID] = secret
}

// DispatchEvent evaluates eligible endpoints and launches asynchronous delivery attempts.
// Webhook delivery is downstream and never blocks or mutates financial state.
func (d *Dispatcher) DispatchEvent(ctx context.Context, event *domain.DomainEvent) error {
	// 1. Atomically persist domain event & outbox record if repository supports it
	if d.repo != nil {
		_ = d.repo.SaveDomainEvent(ctx, event)
	}

	endpoints, err := d.repo.ListWebhookEndpoints(ctx, event.OrganizationID)
	if err != nil {
		return fmt.Errorf("failed to list webhook endpoints: %w", err)
	}

	payloadBytes, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to serialize event payload: %w", err)
	}

	for _, ep := range endpoints {
		if !ep.Enabled {
			continue
		}
		if !isSubscribed(ep.SubscribedEvents, string(event.Type)) {
			continue
		}

		delivery := &WebhookDelivery{
			ID:             GenerateDeliveryID(),
			OrganizationID: event.OrganizationID,
			EndpointID:     ep.ID,
			EventID:        event.ID,
			EventType:      string(event.Type),
			Status:         DeliveryStatusPending,
			RequestPayload: string(payloadBytes),
			AttemptCount:   0,
			MaxAttempts:    5,
			CreatedAt:      time.Now().UTC(),
		}

		if err := d.repo.SaveWebhookDelivery(ctx, delivery); err != nil {
			continue
		}

		// Execute delivery in background goroutine
		go func(endpoint WebhookEndpoint, del WebhookDelivery) {
			_ = d.ExecuteDelivery(context.Background(), &endpoint, &del)
		}(*ep, *delivery)
	}

	return nil
}

// ExecuteDelivery sends the signed HTTP request to the endpoint and records the result.
func (d *Dispatcher) ExecuteDelivery(ctx context.Context, ep *WebhookEndpoint, del *WebhookDelivery) error {
	del.AttemptCount++
	del.Status = DeliveryStatusDelivering

	// 1. SSRF URL validation
	parsedURL, err := d.validator.ValidateURL(ep.URL)
	if err != nil {
		errMsg := fmt.Sprintf("SSRF validation failed: %v", err)
		del.Status = DeliveryStatusFailed
		del.ErrorMessage = &errMsg
		_ = d.repo.UpdateWebhookDelivery(ctx, del)
		return err
	}

	// 2. Prepare signature
	now := time.Now().UTC()
	secret := d.secrets[ep.ID]
	if secret == "" {
		secret = "whsec_default_fallback_secret"
	}
	sigHeader := SignPayload(secret, now.Unix(), []byte(del.RequestPayload))

	req, err := http.NewRequestWithContext(ctx, "POST", parsedURL.String(), bytes.NewReader([]byte(del.RequestPayload)))
	if err != nil {
		errMsg := err.Error()
		del.Status = DeliveryStatusFailed
		del.ErrorMessage = &errMsg
		_ = d.repo.UpdateWebhookDelivery(ctx, del)
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("AgentPay-Signature", sigHeader)
	req.Header.Set("X-AgentPay-Signature", sigHeader)
	req.Header.Set("AgentPay-Event-Id", del.EventID)
	req.Header.Set("X-AgentPay-Event-Id", del.EventID)
	req.Header.Set("AgentPay-Timestamp", fmt.Sprintf("%d", now.Unix()))
	req.Header.Set("X-AgentPay-Timestamp", fmt.Sprintf("%d", now.Unix()))

	// 3. Execute HTTP call
	startTime := time.Now()
	resp, err := d.httpClient.Do(req)
	latency := int(time.Since(startTime).Milliseconds())
	del.LatencyMs = &latency

	if err != nil {
		// Transient network error or timeout
		errMsg := err.Error()
		del.ErrorMessage = &errMsg
		d.handleRetry(del)
		_ = d.repo.UpdateWebhookDelivery(ctx, del)
		_ = d.repo.UpdateWebhookEndpointStatus(ctx, ep.ID, ep.OrganizationID, ep.FailureCount+1, time.Now().UTC())
		return err
	}
	defer resp.Body.Close()

	del.HTTPStatus = &resp.StatusCode
	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
	respSnippet := string(bodyBytes)
	del.ResponseBody = &respSnippet

	// 4. Handle HTTP status outcomes
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		del.Status = DeliveryStatusDelivered
		nowUTC := time.Now().UTC()
		del.DeliveredAt = &nowUTC
		del.NextRetryAt = nil
		_ = d.repo.UpdateWebhookDelivery(ctx, del)
		_ = d.repo.UpdateWebhookEndpointStatus(ctx, ep.ID, ep.OrganizationID, 0, nowUTC)
		return nil
	}

	// Transient failures (408 Request Timeout, 429 Rate Limited, 5xx Server Errors)
	if resp.StatusCode == 408 || resp.StatusCode == 429 || resp.StatusCode >= 500 {
		errMsg := fmt.Sprintf("HTTP %d received", resp.StatusCode)
		del.ErrorMessage = &errMsg
		d.handleRetry(del)
	} else {
		// Permanent 4xx client errors (400, 401, 403, 404, 410) -> Do not retry
		del.Status = DeliveryStatusFailed
		errMsg := fmt.Sprintf("Permanent client failure: HTTP %d", resp.StatusCode)
		del.ErrorMessage = &errMsg
		del.NextRetryAt = nil
	}

	_ = d.repo.UpdateWebhookDelivery(ctx, del)
	_ = d.repo.UpdateWebhookEndpointStatus(ctx, ep.ID, ep.OrganizationID, ep.FailureCount+1, time.Now().UTC())
	return nil
}

// TestEndpoint sends a synthetic test.ping event without financial impact.
func (d *Dispatcher) TestEndpoint(ctx context.Context, ep *WebhookEndpoint) (*WebhookDelivery, error) {
	testEvent := domain.NewDomainEvent(
		domain.EventTestPing,
		ep.OrganizationID,
		"SYSTEM",
		"dev_console",
		"req_test_ping",
		"corr_test_ping",
		map[string]interface{}{
			"message":     "This is a test webhook event from AgentPay. Zero financial actions were taken.",
			"endpoint_id": ep.ID,
			"url":         ep.URL,
		},
	)

	payloadBytes, _ := json.Marshal(testEvent)
	delivery := &WebhookDelivery{
		ID:             GenerateDeliveryID(),
		OrganizationID: ep.OrganizationID,
		EndpointID:     ep.ID,
		EventID:        testEvent.ID,
		EventType:      string(testEvent.Type),
		Status:         DeliveryStatusPending,
		RequestPayload: string(payloadBytes),
		AttemptCount:   0,
		MaxAttempts:    1,
		CreatedAt:      time.Now().UTC(),
	}

	if err := d.repo.SaveWebhookDelivery(ctx, delivery); err != nil {
		return nil, err
	}

	_ = d.ExecuteDelivery(ctx, ep, delivery)
	return delivery, nil
}

// handleRetry calculates bounded exponential backoff with jitter.
func (d *Dispatcher) handleRetry(del *WebhookDelivery) {
	if del.AttemptCount >= del.MaxAttempts {
		del.Status = DeliveryStatusFailed
		del.NextRetryAt = nil
		return
	}

	del.Status = DeliveryStatusRetrying

	// Base backoff schedule: Attempt 1: 15s, Attempt 2: 60s, Attempt 3: 300s (5m), Attempt 4: 1800s (30m)
	var baseSec float64
	switch del.AttemptCount {
	case 1:
		baseSec = 15
	case 2:
		baseSec = 60
	case 3:
		baseSec = 300
	default:
		baseSec = 1800
	}

	// Add 10-20% random jitter to avoid thundering herd
	jitter := baseSec * (0.1 + (rand.Float64() * 0.1))
	nextDuration := time.Duration(math.Round(baseSec+jitter)) * time.Second
	nextAt := time.Now().UTC().Add(nextDuration)
	del.NextRetryAt = &nextAt
}

// isSubscribed checks if an event type matches endpoint subscriptions.
func isSubscribed(patterns []string, eventType string) bool {
	for _, p := range patterns {
		p = strings.TrimSpace(p)
		if p == "*" || p == eventType {
			return true
		}
		if strings.HasSuffix(p, ".*") {
			prefix := strings.TrimSuffix(p, ".*")
			if strings.HasPrefix(eventType, prefix+".") {
				return true
			}
		}
	}
	return false
}
