package operations

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

var (
	ErrDuplicateQueueItem = errors.New("duplicate queue item detected")
	ErrQueueItemNotFound  = errors.New("queue item not found")
	ErrQueueEmpty         = errors.New("queue is empty")
)

// QueueManager manages durable work queues and the dead-letter system.
type QueueManager struct {
	mu          sync.RWMutex
	queues      map[string][]*QueueItem // keyed by "tenant_id:queue_name"
	items       map[string]*QueueItem   // keyed by item_id
	idempKeys   map[string]string       // "tenant_id:queue_name:idemp_key" -> item_id
	deadLetters []*DeadLetterItem
}

// NewQueueManager initializes an instance of QueueManager.
func NewQueueManager() *QueueManager {
	return &QueueManager{
		queues:      make(map[string][]*QueueItem),
		items:       make(map[string]*QueueItem),
		idempKeys:   make(map[string]string),
		deadLetters: make([]*DeadLetterItem, 0),
	}
}

// Enqueue adds an item to a durable queue with idempotency protection.
func (qm *QueueManager) Enqueue(item QueueItem) (*QueueItem, error) {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	key := fmt.Sprintf("%s:%s:%s", item.TenantID, item.QueueName, item.IdempotencyKey)
	if existingID, exists := qm.idempKeys[key]; exists {
		return qm.items[existingID], ErrDuplicateQueueItem
	}

	if item.ItemID == "" {
		item.ItemID = "qitem_" + uuid.NewString()[:8]
	}
	item.State = QueueItemQueued
	item.CreatedAt = time.Now().UTC()
	item.UpdatedAt = item.CreatedAt
	if item.MaxAttempts <= 0 {
		item.MaxAttempts = 5
	}

	queueKey := fmt.Sprintf("%s:%s", item.TenantID, item.QueueName)
	qm.items[item.ItemID] = &item
	qm.idempKeys[key] = item.ItemID

	// Insert maintaining descending priority order
	list := qm.queues[queueKey]
	inserted := false
	for i, existing := range list {
		if item.Priority > existing.Priority {
			list = append(list[:i], append([]*QueueItem{&item}, list[i:]...)...)
			inserted = true
			break
		}
	}
	if !inserted {
		list = append(list, &item)
	}
	qm.queues[queueKey] = list

	return &item, nil
}

// Dequeue claims the highest priority item from the queue with a visibility lease.
func (qm *QueueManager) Dequeue(tenantID string, queueName QueueName, workerID string, visibilityTimeout time.Duration) (*QueueItem, error) {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	queueKey := fmt.Sprintf("%s:%s", tenantID, queueName)
	list := qm.queues[queueKey]

	now := time.Now().UTC()
	for _, item := range list {
		// Enforce tenant queue isolation (INV-126)
		if err := ValidateTenantQueueIsolation(item.TenantID, tenantID); err != nil {
			continue
		}

		// Available if QUEUED or visibility lease expired
		if item.State == QueueItemQueued ||
			(item.State == QueueItemInFlight && item.VisibilityExpiresAt != nil && now.After(*item.VisibilityExpiresAt)) {

			item.State = QueueItemInFlight
			item.LeaseOwner = workerID
			item.Attempts++
			expiresAt := now.Add(visibilityTimeout)
			item.VisibilityExpiresAt = &expiresAt
			item.UpdatedAt = now

			return item, nil
		}
	}

	return nil, ErrQueueEmpty
}

// Acknowledge marks a queue item as successfully processed and removes it.
func (qm *QueueManager) Acknowledge(tenantID, itemID string) error {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	item, exists := qm.items[itemID]
	if !exists || item.TenantID != tenantID {
		return ErrQueueItemNotFound
	}

	item.State = QueueItemCompleted
	item.UpdatedAt = time.Now().UTC()

	// Remove from queue slice
	queueKey := fmt.Sprintf("%s:%s", item.TenantID, item.QueueName)
	list := qm.queues[queueKey]
	filtered := make([]*QueueItem, 0, len(list))
	for _, qItem := range list {
		if qItem.ItemID != itemID {
			filtered = append(filtered, qItem)
		}
	}
	qm.queues[queueKey] = filtered

	return nil
}

// Reject routes an item back to retry or sends it to the dead-letter queue if attempts exhausted.
func (qm *QueueManager) Reject(tenantID, itemID, reason, evidence string) (*DeadLetterItem, error) {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	item, exists := qm.items[itemID]
	if !exists || item.TenantID != tenantID {
		return nil, ErrQueueItemNotFound
	}

	now := time.Now().UTC()
	item.Attempts++
	item.UpdatedAt = now

	// If attempts exhausted, route to DeadLetterItem (INV-128)
	if item.Attempts >= item.MaxAttempts {
		item.State = QueueItemDeadLettered
		dl := &DeadLetterItem{
			DeadLetterID:    "dl_" + uuid.NewString()[:8],
			TenantID:        item.TenantID,
			ItemID:          item.ItemID,
			QueueName:       item.QueueName,
			WorkflowID:      item.WorkflowID,
			Reason:          reason,
			Evidence:        evidence,
			OriginalPayload: item.Payload,
			AttemptHistory: []AttemptRecord{
				{
					Attempt:   item.Attempts,
					Timestamp: now,
					WorkerID:  item.LeaseOwner,
					Error:     reason,
				},
			},
			CreatedAt: now,
		}
		qm.deadLetters = append(qm.deadLetters, dl)

		// Remove from active queue
		queueKey := fmt.Sprintf("%s:%s", item.TenantID, item.QueueName)
		list := qm.queues[queueKey]
		filtered := make([]*QueueItem, 0, len(list))
		for _, qItem := range list {
			if qItem.ItemID != itemID {
				filtered = append(filtered, qItem)
			}
		}
		qm.queues[queueKey] = filtered

		return dl, nil
	}

	// Otherwise reset to queued for retry
	item.State = QueueItemQueued
	item.VisibilityExpiresAt = nil
	item.LeaseOwner = ""
	return nil, nil
}

// GetQueueStats returns queue depths across categories for a tenant.
func (qm *QueueManager) GetQueueStats(tenantID string) map[string]int {
	qm.mu.RLock()
	defer qm.mu.RUnlock()

	stats := make(map[string]int)
	categories := []QueueName{
		QueueMission, QueueSwarm, QueueTask, QueueRecovery,
		QueueReconciliation, QueueCallback, QueueScheduled, QueueIncident,
	}

	for _, cat := range categories {
		queueKey := fmt.Sprintf("%s:%s", tenantID, cat)
		stats[string(cat)] = len(qm.queues[queueKey])
	}

	return stats
}

// ListDeadLetters returns auditable dead-letter records for a tenant.
func (qm *QueueManager) ListDeadLetters(tenantID string) []*DeadLetterItem {
	qm.mu.RLock()
	defer qm.mu.RUnlock()

	var result []*DeadLetterItem
	for _, dl := range qm.deadLetters {
		if dl.TenantID == tenantID {
			result = append(result, dl)
		}
	}
	return result
}
