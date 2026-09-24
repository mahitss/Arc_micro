package runtime

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"
)

// CheckpointStore defines persistence operations for checkpoints.
type CheckpointStore interface {
	SaveCheckpoint(ctx context.Context, cp *Checkpoint) error
	GetLatestCheckpoint(ctx context.Context, workflowID string) (*Checkpoint, error)
	ListCheckpoints(ctx context.Context, workflowID string) ([]*Checkpoint, error)
}

// CheckpointManager coordinates the creation and retrieval of durable workflow checkpoints.
type CheckpointManager struct {
	store CheckpointStore
}

// NewCheckpointManager initializes a CheckpointManager.
func NewCheckpointManager(store CheckpointStore) *CheckpointManager {
	return &CheckpointManager{store: store}
}

// CreateCheckpoint captures an immutable state snapshot with SHA-256 state hashing.
func (cm *CheckpointManager) CreateCheckpoint(
	ctx context.Context,
	workflowID, stepID, tenantID string,
	snapshotData map[string]interface{},
	eventPosition int64,
) (*Checkpoint, error) {
	if snapshotData == nil {
		snapshotData = make(map[string]interface{})
	}

	raw, err := json.Marshal(snapshotData)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize checkpoint data: %w", err)
	}

	h := sha256.Sum256(raw)
	stateHash := hex.EncodeToString(h[:])

	b := make([]byte, 16)
	_, _ = rand.Read(b)
	cp := &Checkpoint{
		CheckpointID:  "cp_" + hex.EncodeToString(b),
		WorkflowID:    workflowID,
		StepID:        stepID,
		TenantID:      tenantID,
		StateHash:     stateHash,
		EventPosition: eventPosition,
		SchemaVersion: 1,
		SnapshotData:  snapshotData,
		CreatedAt:     time.Now().UTC(),
	}

	if err := cm.store.SaveCheckpoint(ctx, cp); err != nil {
		return nil, fmt.Errorf("failed to save checkpoint: %w", err)
	}

	return cp, nil
}

// GetLatestCheckpoint retrieves the most recent checkpoint for a workflow.
func (cm *CheckpointManager) GetLatestCheckpoint(ctx context.Context, workflowID string) (*Checkpoint, error) {
	return cm.store.GetLatestCheckpoint(ctx, workflowID)
}

// ListCheckpoints lists all historical checkpoints for a workflow in descending order.
func (cm *CheckpointManager) ListCheckpoints(ctx context.Context, workflowID string) ([]*Checkpoint, error) {
	return cm.store.ListCheckpoints(ctx, workflowID)
}
