package runtime

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"
)

// DecisionStore defines persistence operations for runtime decisions.
type DecisionStore interface {
	SaveDecision(ctx context.Context, d *RuntimeDecision) error
	ListDecisions(ctx context.Context, workflowID string) ([]*RuntimeDecision, error)
}

// DecisionLogger creates auditable records for every autonomous recovery or state decision.
type DecisionLogger struct {
	store DecisionStore
}

// NewDecisionLogger initializes a DecisionLogger.
func NewDecisionLogger(store DecisionStore) *DecisionLogger {
	return &DecisionLogger{store: store}
}

// Log records a runtime decision with complete audit context.
func (dl *DecisionLogger) Log(
	ctx context.Context,
	workflowID, stepID, tenantID string,
	decisionType DecisionType,
	reasonCode string,
	inputsHash string,
	stateVersion int,
	policySnapshotID string,
	actor string,
	result map[string]interface{},
) (*RuntimeDecision, error) {
	b := make([]byte, 16)
	_, _ = rand.Read(b)

	d := &RuntimeDecision{
		DecisionID:       "dec_" + hex.EncodeToString(b),
		WorkflowID:       workflowID,
		StepID:           stepID,
		TenantID:         tenantID,
		DecisionType:     decisionType,
		ReasonCode:       reasonCode,
		InputsHash:       inputsHash,
		StateVersion:     stateVersion,
		PolicySnapshotID: policySnapshotID,
		Actor:            actor,
		Result:           result,
		CreatedAt:        time.Now().UTC(),
	}

	if dl.store != nil {
		if err := dl.store.SaveDecision(ctx, d); err != nil {
			return nil, err
		}
	}

	return d, nil
}

// ListDecisions returns chronological decisions for a workflow.
func (dl *DecisionLogger) ListDecisions(ctx context.Context, workflowID string) ([]*RuntimeDecision, error) {
	if dl.store == nil {
		return []*RuntimeDecision{}, nil
	}
	return dl.store.ListDecisions(ctx, workflowID)
}
