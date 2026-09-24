package runtime

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

// JobStore defines persistence operations for scheduled jobs.
type JobStore interface {
	SaveScheduledJob(ctx context.Context, job *ScheduledJob) error
	ListDueScheduledJobs(ctx context.Context, now time.Time, limit int) ([]*ScheduledJob, error)
	MarkJobExecuted(ctx context.Context, jobID string, executedAt time.Time) error
	CancelJob(ctx context.Context, jobID string) error
}

// DurableScheduler provides persistent, database-backed scheduling without in-process sleep timers.
type DurableScheduler struct {
	store JobStore
}

// NewDurableScheduler initializes a DurableScheduler.
func NewDurableScheduler(store JobStore) *DurableScheduler {
	return &DurableScheduler{store: store}
}

// Schedule creates a new durable scheduled job.
func (ds *DurableScheduler) Schedule(
	ctx context.Context,
	tenantID, jobType, targetType, targetID string,
	scheduledAt time.Time,
	idempotencyKey string,
	payload map[string]interface{},
) (*ScheduledJob, error) {
	if idempotencyKey == "" {
		return nil, ErrInv118
	}

	b := make([]byte, 16)
	_, _ = rand.Read(b)
	job := &ScheduledJob{
		JobID:          "job_" + hex.EncodeToString(b),
		TenantID:       tenantID,
		JobType:        jobType,
		TargetType:     targetType,
		TargetID:       targetID,
		ScheduledAt:    scheduledAt,
		State:          "SCHEDULED",
		IdempotencyKey: idempotencyKey,
		Payload:        payload,
		CreatedAt:      time.Now().UTC(),
	}

	if ds.store != nil {
		if err := ds.store.SaveScheduledJob(ctx, job); err != nil {
			return nil, fmt.Errorf("failed to schedule job: %w", err)
		}
	}
	return job, nil
}

// ListDueJobs retrieves pending jobs whose scheduled time has arrived.
func (ds *DurableScheduler) ListDueJobs(ctx context.Context, limit int) ([]*ScheduledJob, error) {
	if ds.store == nil {
		return []*ScheduledJob{}, nil
	}
	now := time.Now().UTC()
	return ds.store.ListDueScheduledJobs(ctx, now, limit)
}

// MarkExecuted marks a scheduled job as executed.
func (ds *DurableScheduler) MarkExecuted(ctx context.Context, jobID string) error {
	if ds.store == nil {
		return nil
	}
	return ds.store.MarkJobExecuted(ctx, jobID, time.Now().UTC())
}

// Cancel cancels a scheduled job before execution.
func (ds *DurableScheduler) Cancel(ctx context.Context, jobID string) error {
	if ds.store == nil {
		return nil
	}
	return ds.store.CancelJob(ctx, jobID)
}
