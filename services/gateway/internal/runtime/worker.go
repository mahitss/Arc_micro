package runtime

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

var (
	ErrWorkerNotFound = errors.New("worker not found")
	ErrWorkerDraining = errors.New("worker is currently draining and cannot accept new work")
	ErrWorkerStopped  = errors.New("worker is stopped")
)

// WorkerStore defines persistence operations for workers.
type WorkerStore interface {
	SaveWorker(ctx context.Context, w *Worker) error
	GetWorker(ctx context.Context, workerID string) (*Worker, error)
	ListWorkers(ctx context.Context) ([]*Worker, error)
	UpdateWorkerHeartbeat(ctx context.Context, workerID string, status WorkerStatus, heartbeat time.Time) error
}

// WorkerCoordinator manages worker lifecycles, heartbeats, and stale worker detection.
type WorkerCoordinator struct {
	mu          sync.RWMutex
	store       WorkerStore
	workerID    string
	workerType  string
	hostname    string
	version     string
	stopChan    chan struct{}
	isRunning   bool
}

// NewWorkerCoordinator initializes a worker coordinator.
func NewWorkerCoordinator(
	store WorkerStore,
	workerID, workerType, hostname, version string,
) *WorkerCoordinator {
	return &WorkerCoordinator{
		store:      store,
		workerID:   workerID,
		workerType: workerType,
		hostname:   hostname,
		version:    version,
		stopChan:   make(chan struct{}),
	}
}

// Register registers this worker with the durable store.
func (wc *WorkerCoordinator) Register(ctx context.Context, capabilities map[string]interface{}) (*Worker, error) {
	wc.mu.Lock()
	defer wc.mu.Unlock()

	now := time.Now().UTC()
	worker := &Worker{
		WorkerID:     wc.workerID,
		WorkerType:   wc.workerType,
		Hostname:     wc.hostname,
		Status:       WorkerHealthy,
		Capabilities: capabilities,
		Version:      wc.version,
		HeartbeatAt:  now,
		LastSeen:     now,
		CreatedAt:    now,
	}

	if err := wc.store.SaveWorker(ctx, worker); err != nil {
		return nil, fmt.Errorf("failed to register worker: %w", err)
	}
	wc.isRunning = true
	return worker, nil
}

// Heartbeat updates the worker's heartbeat and last seen timestamp.
func (wc *WorkerCoordinator) Heartbeat(ctx context.Context) error {
	wc.mu.RLock()
	defer wc.mu.RUnlock()

	if !wc.isRunning {
		return ErrWorkerStopped
	}

	now := time.Now().UTC()
	return wc.store.UpdateWorkerHeartbeat(ctx, wc.workerID, WorkerHealthy, now)
}

// Drain flags the worker as draining so no new tasks are scheduled on it.
func (wc *WorkerCoordinator) Drain(ctx context.Context) error {
	wc.mu.Lock()
	defer wc.mu.Unlock()

	now := time.Now().UTC()
	return wc.store.UpdateWorkerHeartbeat(ctx, wc.workerID, WorkerDraining, now)
}

// Stop marks the worker stopped.
func (wc *WorkerCoordinator) Stop(ctx context.Context) error {
	wc.mu.Lock()
	defer wc.mu.Unlock()

	wc.isRunning = false
	now := time.Now().UTC()
	return wc.store.UpdateWorkerHeartbeat(ctx, wc.workerID, WorkerStopped, now)
}

// ScanStaleWorkers scans for workers that haven't heartbeated within the timeout threshold and flags them STALE.
func (wc *WorkerCoordinator) ScanStaleWorkers(ctx context.Context, timeout time.Duration) ([]*Worker, error) {
	workers, err := wc.store.ListWorkers(ctx)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	threshold := now.Add(-timeout)
	stale := make([]*Worker, 0)

	for _, w := range workers {
		if w.Status == WorkerStopped {
			continue
		}
		if w.HeartbeatAt.Before(threshold) {
			w.Status = WorkerStale
			_ = wc.store.UpdateWorkerHeartbeat(ctx, w.WorkerID, WorkerStale, w.HeartbeatAt)
			stale = append(stale, w)
		}
	}

	return stale, nil
}
