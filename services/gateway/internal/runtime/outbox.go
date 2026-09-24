package runtime

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrDuplicateInboxEvent = errors.New("duplicate inbox event ignored")
)

// OutboxStore defines persistence operations for the transactional outbox.
type OutboxStore interface {
	SaveOutboxEvent(ctx context.Context, e *OutboxEvent) error
	ListPendingOutboxEvents(ctx context.Context, limit int) ([]*OutboxEvent, error)
	MarkOutboxEventDelivered(ctx context.Context, eventID string) error
	MarkOutboxEventFailed(ctx context.Context, eventID, errorMsg string, nextAttempt time.Time) error
}

// InboxStore defines persistence operations for the deduplicated inbox.
type InboxStore interface {
	SaveInboxEvent(ctx context.Context, e *InboxEvent) error
	GetInboxEvent(ctx context.Context, idempotencyKey string) (*InboxEvent, error)
	MarkInboxEventProcessed(ctx context.Context, inboxID string) error
}

// OutboxManager coordinates outbox publishing and inbox deduplication.
type OutboxManager struct {
	outboxStore OutboxStore
	inboxStore  InboxStore
}

// NewOutboxManager initializes an OutboxManager.
func NewOutboxManager(outboxStore OutboxStore, inboxStore InboxStore) *OutboxManager {
	return &OutboxManager{
		outboxStore: outboxStore,
		inboxStore:  inboxStore,
	}
}

// PublishEvent queues an event into the transactional outbox.
func (om *OutboxManager) PublishEvent(
	ctx context.Context,
	tenantID, aggregateType, aggregateID, eventType string,
	payload interface{},
) (*OutboxEvent, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	b := make([]byte, 16)
	_, _ = rand.Read(b)
	e := &OutboxEvent{
		EventID:       "out_" + hex.EncodeToString(b),
		TenantID:      tenantID,
		AggregateType: aggregateType,
		AggregateID:   aggregateID,
		EventType:     eventType,
		Payload:       raw,
		Status:        "PENDING",
		Attempt:       0,
		NextAttemptAt: time.Now().UTC(),
		CreatedAt:     time.Now().UTC(),
	}

	if om.outboxStore != nil {
		if err := om.outboxStore.SaveOutboxEvent(ctx, e); err != nil {
			return nil, err
		}
	}
	return e, nil
}

// IngestExternalEvent idempotently ingests an incoming callback or webhook event (INV-112).
func (om *OutboxManager) IngestExternalEvent(
	ctx context.Context,
	idempotencyKey, tenantID, senderID, eventType string,
	payload interface{},
) (*InboxEvent, bool, error) {
	if om.inboxStore == nil {
		return nil, false, nil
	}

	// Check if event with this idempotency key already exists
	existing, err := om.inboxStore.GetInboxEvent(ctx, idempotencyKey)
	if err == nil && existing != nil {
		return existing, false, nil // Duplicate event, return existing without re-processing
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, false, err
	}

	b := make([]byte, 16)
	_, _ = rand.Read(b)
	inbox := &InboxEvent{
		InboxID:        "in_" + hex.EncodeToString(b),
		IdempotencyKey: idempotencyKey,
		TenantID:       tenantID,
		SenderID:       senderID,
		EventType:      eventType,
		Payload:        raw,
		Status:         "RECEIVED",
		CreatedAt:      time.Now().UTC(),
	}

	if err := om.inboxStore.SaveInboxEvent(ctx, inbox); err != nil {
		return nil, false, err
	}
	return inbox, true, nil
}

// MarkProcessed marks an inbox event as processed.
func (om *OutboxManager) MarkProcessed(ctx context.Context, inboxID string) error {
	if om.inboxStore == nil {
		return nil
	}
	return om.inboxStore.MarkInboxEventProcessed(ctx, inboxID)
}
