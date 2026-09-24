package runtime

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"
)

var (
	ErrLeaseAlreadyHeld    = errors.New("lease is currently held by an active worker")
	ErrLeaseNotFound       = errors.New("lease not found")
	ErrLeaseWorkerMismatch = errors.New("lease is held by a different worker")
	ErrLeaseExpired        = errors.New("lease has expired")
)

// LeaseStore defines persistence operations for distributed leases.
type LeaseStore interface {
	SaveLease(ctx context.Context, l *Lease) error
	GetLease(ctx context.Context, resourceType, resourceID string) (*Lease, error)
	DeleteLease(ctx context.Context, leaseID string) error
	ListExpiredLeases(ctx context.Context, now time.Time) ([]*Lease, error)
}

// LeaseManager orchestrates mutual exclusion across distributed workers with monotonic fencing tokens.
type LeaseManager struct {
	mu    sync.RWMutex
	store LeaseStore
}

// NewLeaseManager initializes a LeaseManager.
func NewLeaseManager(store LeaseStore) *LeaseManager {
	return &LeaseManager{
		store: store,
	}
}

// AcquireLease attempts to acquire an exclusive execution lease on a target resource.
// If an unexpired lease exists with a different worker, acquisition fails with ErrLeaseAlreadyHeld.
// If the lease has expired, it allows preemption and increments the fencing token (INV-101).
func (lm *LeaseManager) AcquireLease(
	ctx context.Context,
	resourceType, resourceID, workerID, tenantID string,
	duration time.Duration,
) (*Lease, error) {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	now := time.Now().UTC()
	existing, err := lm.store.GetLease(ctx, resourceType, resourceID)
	if err == nil && existing != nil {
		// Existing lease found
		if existing.ExpiresAt.After(now) {
			if existing.WorkerID != workerID {
				return nil, fmt.Errorf("%w: resource %s:%s owned by %s until %s",
					ErrLeaseAlreadyHeld, resourceType, resourceID, existing.WorkerID, existing.ExpiresAt)
			}
			// Same worker renewing early
			existing.ExpiresAt = now.Add(duration)
			existing.HeartbeatAt = now
			if err := lm.store.SaveLease(ctx, existing); err != nil {
				return nil, err
			}
			return existing, nil
		}

		// Existing lease has expired: preempt and increment fencing token
		existing.WorkerID = workerID
		existing.TenantID = tenantID
		existing.AcquiredAt = now
		existing.ExpiresAt = now.Add(duration)
		existing.HeartbeatAt = now
		existing.FencingToken++
		if err := lm.store.SaveLease(ctx, existing); err != nil {
			return nil, err
		}
		return existing, nil
	}

	// Create brand new lease
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	newLease := &Lease{
		LeaseID:      "lease_" + hex.EncodeToString(b),
		ResourceType: resourceType,
		ResourceID:   resourceID,
		WorkerID:     workerID,
		TenantID:     tenantID,
		AcquiredAt:   now,
		ExpiresAt:    now.Add(duration),
		HeartbeatAt:  now,
		FencingToken: 1,
	}

	if err := lm.store.SaveLease(ctx, newLease); err != nil {
		return nil, err
	}
	return newLease, nil
}

// RenewLease extends an existing lease while verifying worker identity and fencing token.
func (lm *LeaseManager) RenewLease(
	ctx context.Context,
	resourceType, resourceID, workerID string,
	fencingToken int64,
	extension time.Duration,
) (*Lease, error) {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	now := time.Now().UTC()
	lease, err := lm.store.GetLease(ctx, resourceType, resourceID)
	if err != nil || lease == nil {
		return nil, ErrLeaseNotFound
	}

	if lease.WorkerID != workerID {
		return nil, ErrLeaseWorkerMismatch
	}

	if err := CheckLeaseFencing(fencingToken, lease.FencingToken); err != nil {
		return nil, err
	}

	lease.ExpiresAt = now.Add(extension)
	lease.HeartbeatAt = now

	if err := lm.store.SaveLease(ctx, lease); err != nil {
		return nil, err
	}
	return lease, nil
}

// ReleaseLease explicitly yields a held lease.
func (lm *LeaseManager) ReleaseLease(
	ctx context.Context,
	resourceType, resourceID, workerID string,
	fencingToken int64,
) error {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	lease, err := lm.store.GetLease(ctx, resourceType, resourceID)
	if err != nil || lease == nil {
		return nil // Already released or gone
	}

	if lease.WorkerID != workerID {
		return ErrLeaseWorkerMismatch
	}

	if err := CheckLeaseFencing(fencingToken, lease.FencingToken); err != nil {
		return err
	}

	return lm.store.DeleteLease(ctx, lease.LeaseID)
}

// ValidateFencingToken checks if a worker's token matches the active lease (INV-101).
func (lm *LeaseManager) ValidateFencingToken(
	ctx context.Context,
	resourceType, resourceID string,
	token int64,
) error {
	lm.mu.RLock()
	defer lm.mu.RUnlock()

	lease, err := lm.store.GetLease(ctx, resourceType, resourceID)
	if err != nil || lease == nil {
		return ErrLeaseNotFound
	}

	if err := CheckLeaseValidity(lease.ExpiresAt); err != nil {
		return err
	}

	return CheckLeaseFencing(token, lease.FencingToken)
}
