package webhook

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// DeliveryStatus constants
const (
	DeliveryStatusPending    = "PENDING"
	DeliveryStatusDelivering = "DELIVERING"
	DeliveryStatusDelivered  = "DELIVERED"
	DeliveryStatusRetrying   = "RETRYING"
	DeliveryStatusFailed     = "FAILED"
)

// OutboxStatus constants
const (
	OutboxStatusPending    = "PENDING"
	OutboxStatusProcessing = "PROCESSING"
	OutboxStatusProcessed  = "PROCESSED"
	OutboxStatusFailed     = "FAILED"
)

// WebhookEndpoint represents a customer-registered webhook URL and its subscription.
type WebhookEndpoint struct {
	ID               string     `json:"id"`
	OrganizationID   string     `json:"organization_id"`
	URL              string     `json:"url"`
	SecretHash       string     `json:"secret_hash,omitempty"`
	MaskedSecret     string     `json:"masked_secret,omitempty"`
	Description      string     `json:"description"`
	SubscribedEvents []string   `json:"subscribed_events"`
	Enabled          bool       `json:"enabled"`
	FailureCount     int        `json:"failure_count"`
	LastDeliveryAt   *time.Time `json:"last_delivery_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// WebhookDelivery tracks an individual delivery attempt for a domain event.
type WebhookDelivery struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	EndpointID     string     `json:"endpoint_id"`
	EventID        string     `json:"event_id"`
	EventType      string     `json:"event_type"`
	Status         string     `json:"status"`
	HTTPStatus     *int       `json:"http_status,omitempty"`
	RequestPayload string     `json:"request_payload"`
	ResponseBody   *string    `json:"response_body,omitempty"`
	ErrorMessage   *string    `json:"error_message,omitempty"`
	AttemptCount   int        `json:"attempt_count"`
	MaxAttempts    int        `json:"max_attempts"`
	NextRetryAt    *time.Time `json:"next_retry_at,omitempty"`
	LatencyMs      *int       `json:"latency_ms,omitempty"`
	DeliveredAt    *time.Time `json:"delivered_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// OutboxEvent represents an atomic outbox record for transactional event publishing.
type OutboxEvent struct {
	ID             string     `json:"id"`
	EventID        string     `json:"event_id"`
	OrganizationID string     `json:"organization_id"`
	EventType      string     `json:"event_type"`
	Payload        string     `json:"payload"`
	Status         string     `json:"status"`
	RetryCount     int        `json:"retry_count"`
	NextRetryAt    *time.Time `json:"next_retry_at,omitempty"`
	ProcessedAt    *time.Time `json:"processed_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// GenerateEndpointID produces a new "we_" prefixed identifier.
func GenerateEndpointID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("we_%s", hex.EncodeToString(b))
}

// GenerateDeliveryID produces a new "del_" prefixed identifier.
func GenerateDeliveryID() string {
	b := make([]byte, 10)
	_, _ = rand.Read(b)
	return fmt.Sprintf("del_%s", hex.EncodeToString(b))
}

// GenerateOutboxID produces a new "outbox_" prefixed identifier.
func GenerateOutboxID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("outbox_%s", hex.EncodeToString(b))
}

// GenerateWebhookSecret creates a cryptographically secure "whsec_" secret.
func GenerateWebhookSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return fmt.Sprintf("whsec_%s", hex.EncodeToString(b)), nil
}

// HashSecret computes the SHA-256 hash of a webhook secret for safe database storage.
func HashSecret(secret string) string {
	h := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(h[:])
}

