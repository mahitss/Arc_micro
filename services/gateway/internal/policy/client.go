package policy

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

var (
	// ErrUnavailable indicates that the Rust Policy Engine is unreachable or returned a 5xx error.
	ErrUnavailable = errors.New("policy engine is unavailable")
	// ErrTimeout indicates that the authorization request to Rust timed out.
	ErrTimeout = errors.New("policy engine request timed out")
	// ErrInvalidResponse indicates that Rust returned an unexpected or unparseable response.
	ErrInvalidResponse = errors.New("policy engine returned an invalid response")
	// ErrBadRequest indicates that Rust rejected the request format.
	ErrBadRequest = errors.New("policy engine rejected the request as invalid")
)

// Client defines the interface for interacting with the Rust Policy Engine.
type Client interface {
	Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error)
	Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error)
	CheckHealth(ctx context.Context) error
}

// HTTPClient is the concrete implementation of Client using net/http.
type HTTPClient struct {
	baseURL    string
	httpClient *http.Client
	timeout    time.Duration
}

// NewClient creates a new HTTPClient.
func NewClient(baseURL string, timeout time.Duration) *HTTPClient {
	trimmed := strings.TrimRight(baseURL, "/")
	return &HTTPClient{
		baseURL: trimmed,
		httpClient: &http.Client{
			// Individual requests will use context deadlines, but this provides a fallback guard.
			Timeout: timeout + 500*time.Millisecond,
		},
		timeout: timeout,
	}
}

// Authorize sends a payment authorization request to the Rust Policy Engine.
func (c *HTTPClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return c.postRequest(ctx, "/v1/authorize", req)
}

// Simulate sends a policy simulation request to the Rust Policy Engine without mutating state.
func (c *HTTPClient) Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return c.postRequest(ctx, "/v1/simulate", req)
}

func (c *HTTPClient) postRequest(ctx context.Context, path string, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	var decision domain.AuthorizationDecision

	// Apply configured timeout if caller context doesn't already have a shorter deadline
	ctxWithTimeout, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	payloadBytes, err := json.Marshal(req)
	if err != nil {
		return decision, fmt.Errorf("failed to encode request: %w", err)
	}

	targetURL := fmt.Sprintf("%s%s", c.baseURL, path)
	httpReq, err := http.NewRequestWithContext(ctxWithTimeout, http.MethodPost, targetURL, bytes.NewReader(payloadBytes))
	if err != nil {
		return decision, fmt.Errorf("failed to create http request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if req.RequestID != "" {
		httpReq.Header.Set("X-Request-ID", req.RequestID)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		if errors.Is(ctxWithTimeout.Err(), context.DeadlineExceeded) || errors.Is(err, context.DeadlineExceeded) {
			return decision, ErrTimeout
		}
		if errors.Is(ctxWithTimeout.Err(), context.Canceled) {
			return decision, ctx.Err()
		}
		var urlErr *url.Error
		if errors.As(err, &urlErr) && urlErr.Timeout() {
			return decision, ErrTimeout
		}
		return decision, fmt.Errorf("%w: %v", ErrUnavailable, err)
	}
	defer resp.Body.Close()

	// Limit response body reading to 1MB to avoid memory exhaustion
	limitReader := io.LimitReader(resp.Body, 1<<20)
	bodyBytes, err := io.ReadAll(limitReader)
	if err != nil {
		return decision, fmt.Errorf("%w: failed to read response body", ErrInvalidResponse)
	}

	switch resp.StatusCode {
	case http.StatusOK:
		if err := json.Unmarshal(bodyBytes, &decision); err != nil {
			return decision, fmt.Errorf("%w: malformed JSON from policy engine", ErrInvalidResponse)
		}
		return decision, nil

	case http.StatusBadRequest:
		return decision, ErrBadRequest

	case http.StatusGatewayTimeout:
		return decision, ErrTimeout

	case http.StatusServiceUnavailable, http.StatusBadGateway, http.StatusInternalServerError:
		return decision, ErrUnavailable

	default:
		return decision, fmt.Errorf("%w: unexpected status code %d", ErrInvalidResponse, resp.StatusCode)
	}
}

// CheckHealth checks whether the Rust Policy Engine's /health endpoint is responding.
func (c *HTTPClient) CheckHealth(ctx context.Context) error {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()

	targetURL := fmt.Sprintf("%s/health", c.baseURL)
	req, err := http.NewRequestWithContext(ctxWithTimeout, http.MethodGet, targetURL, nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check returned status %d", resp.StatusCode)
	}
	return nil
}
