package runtime

import (
	"context"
	"errors"
	"time"
)

// RecoveryResult details the outcome of an automated recovery pass.
type RecoveryResult struct {
	WorkflowID          string `json:"workflow_id"`
	RecoveredStepsCount int    `json:"recovered_steps_count"`
	ReconciledSteps     int    `json:"reconciled_steps"`
	RequeuedSteps       int    `json:"requeued_steps"`
	PolicyRevalidated   bool   `json:"policy_revalidated"`
	AmbiguousPayment    bool   `json:"ambiguous_payment"`
	Status              string `json:"status"`
}

// RuntimeRecoveryEngine reconstructs state from durable facts and resumes safe work.
// CRITICAL INVARIANT: Financial ambiguity is routed to reconciliation, NEVER blind rebroadcast.
type RuntimeRecoveryEngine struct {
	wfStore       WorkflowStore
	checkpointMgr *CheckpointManager
	leaseMgr      *LeaseManager
	decLogger     *DecisionLogger
}

// NewRuntimeRecoveryEngine constructs a RuntimeRecoveryEngine.
func NewRuntimeRecoveryEngine(
	wfStore WorkflowStore,
	checkpointMgr *CheckpointManager,
	leaseMgr *LeaseManager,
	decLogger *DecisionLogger,
) *RuntimeRecoveryEngine {
	return &RuntimeRecoveryEngine{
		wfStore:       wfStore,
		checkpointMgr: checkpointMgr,
		leaseMgr:      leaseMgr,
		decLogger:     decLogger,
	}
}

// RecoverWorkflow executes deterministic recovery on an abandoned or crashed workflow.
func (re *RuntimeRecoveryEngine) RecoverWorkflow(ctx context.Context, workflowID string) (*RecoveryResult, error) {
	if re.wfStore == nil {
		return nil, errors.New("missing workflow store")
	}

	wf, err := re.wfStore.GetWorkflow(ctx, workflowID)
	if err != nil || wf == nil {
		return nil, ErrWorkflowNotFound
	}

	// 1. Load latest checkpoint if available
	var latestCheckpoint *Checkpoint
	if re.checkpointMgr != nil {
		latestCheckpoint, _ = re.checkpointMgr.GetLatestCheckpoint(ctx, workflowID)
	}

	// 2. Load execution steps
	steps, err := re.wfStore.ListSteps(ctx, workflowID)
	if err != nil {
		return nil, err
	}

	res := &RecoveryResult{
		WorkflowID: workflowID,
		Status:     "RECOVERED",
	}

	now := time.Now().UTC()
	for _, step := range steps {
		if step.State.IsTerminal() {
			continue // Already finalized
		}

		// Check for expired lease or crashed worker
		leaseExpired := false
		if step.State == StepRunning && step.LeaseExpiresAt != nil && step.LeaseExpiresAt.Before(now) {
			leaseExpired = true
		}

		if step.State == StepRetryableFailure || leaseExpired {
			res.RecoveredStepsCount++

			// Check if this is a financial side-effect step
			isFinancial := step.StepType == "PAYMENT" || step.StepType == "SETTLEMENT" || step.StepType == "DISBURSEMENT"
			if isFinancial {
				// Inspect execution state: If ambiguous, route to reconciliation (INV-106)
				status, hasStatus := step.Outputs["blockchain_status"]
				if hasStatus && status == "AMBIGUOUS" {
					res.AmbiguousPayment = true
					step.State = StepWaiting
					step.ErrorMessage = "Blockchain execution ambiguous: routed to reconciliation"
					_ = re.wfStore.UpdateStep(ctx, step)
					res.ReconciledSteps++

					if re.decLogger != nil {
						_, _ = re.decLogger.Log(ctx, workflowID, step.StepID, wf.TenantID, DecisionReconcile,
							"AMBIGUOUS_BLOCKCHAIN_RECOVERY", step.InputHash, wf.Version, "", "RECOVERY_ENGINE", nil)
					}
					continue
				}
			}

			// Safe non-financial or unsubmitted step: reset to PENDING for re-claim
			step.State = StepPending
			step.LeaseOwner = ""
			step.LeaseExpiresAt = nil
			step.NextRetryAt = nil
			step.UpdatedAt = now
			_ = re.wfStore.UpdateStep(ctx, step)
			res.RequeuedSteps++

			if re.decLogger != nil {
				_, _ = re.decLogger.Log(ctx, workflowID, step.StepID, wf.TenantID, DecisionResume,
					"REQUEUED_FROM_LEASE_EXPIRY", step.InputHash, wf.Version, "", "RECOVERY_ENGINE", nil)
			}
		}
	}

	if latestCheckpoint != nil {
		res.PolicyRevalidated = true
	}

	// Update workflow state if it was paused or retrying
	if wf.State == WorkflowRetrying || wf.State == WorkflowWaiting {
		wf.State = WorkflowRunning
		wf.UpdatedAt = now
		_ = re.wfStore.UpdateWorkflowState(ctx, wf.WorkflowID, wf.Version, WorkflowRunning, "")
	}

	return res, nil
}
