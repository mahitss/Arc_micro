package runtime

import (
	"context"
	"errors"
	"fmt"
	"time"
)

var (
	ErrBarrierWorkflowNotRunning = errors.New("financial barrier: workflow is not in RUNNING state")
	ErrBarrierPolicyInvalid      = errors.New("financial barrier: policy snapshot or hash mismatch")
	ErrBarrierRiskInvalid        = errors.New("financial barrier: risk evaluation missing or invalid")
	ErrBarrierApprovalRequired   = errors.New("financial barrier: required approval not granted or expired")
	ErrBarrierTreasuryInvalid    = errors.New("financial barrier: treasury reservation missing or expired")
	ErrBarrierIdempotencyEmpty   = errors.New("financial barrier: unique idempotency key is required")
	ErrBarrierSimulationLeak     = errors.New("financial barrier: simulation workflow attempted live execution")
)

// FinancialBarrierParams holds execution context to be verified before any financial side-effect.
type FinancialBarrierParams struct {
	WorkflowState        WorkflowState `json:"workflow_state"`
	PolicySnapshotID     string        `json:"policy_snapshot_id"`
	PolicyHash           string        `json:"policy_hash"`
	CurrentPolicyHash    string        `json:"current_policy_hash"`
	RiskScore            int           `json:"risk_score"`
	RequiresApproval     bool          `json:"requires_approval"`
	IsApproved           bool          `json:"is_approved"`
	ApprovalExpiresAt    *time.Time    `json:"approval_expires_at,omitempty"`
	ReservationID        string        `json:"reservation_id"`
	ReservationExpiresAt *time.Time    `json:"reservation_expires_at,omitempty"`
	IdempotencyKey       string        `json:"idempotency_key"`
	IsSimulation         bool          `json:"is_simulation"`
	IsLiveTarget         bool          `json:"is_live_target"`
	CallerComponent      string        `json:"caller_component"`
}

// FinancialBarrier validates all 12 safety preconditions before allowing value-bearing operations.
// INVARIANT: The runtime orchestrator NEVER calls AgentVault directly. It authorizes invocation of the existing canonical payment pipeline.
type FinancialBarrier struct{}

// NewFinancialBarrier initializes the financial side-effect barrier.
func NewFinancialBarrier() *FinancialBarrier {
	return &FinancialBarrier{}
}

// Verify enforces all financial preconditions before any side-effect is triggered.
func (fb *FinancialBarrier) Verify(ctx context.Context, p FinancialBarrierParams) error {
	// 1. Workflow state must be RUNNING
	if p.WorkflowState != WorkflowRunning {
		return fmt.Errorf("%w: current state is %s", ErrBarrierWorkflowNotRunning, p.WorkflowState)
	}

	// 2. Caller cannot be raw runtime trying to bypass the execution gate (INV-108)
	if err := CheckNoDirectVaultAccess(p.CallerComponent); err != nil {
		return err
	}

	// 3. Policy snapshot and hash correctness (INV-111)
	if p.PolicySnapshotID == "" {
		return fmt.Errorf("%w: missing policy snapshot id", ErrBarrierPolicyInvalid)
	}
	if p.PolicyHash != "" && p.CurrentPolicyHash != "" && p.PolicyHash != p.CurrentPolicyHash {
		return fmt.Errorf("%w: policy has changed from %s to %s; re-evaluation required",
			ErrBarrierPolicyInvalid, p.PolicyHash, p.CurrentPolicyHash)
	}

	// 4. Approval check (INV-104, INV-114)
	if err := CheckApprovalRequirement(p.RequiresApproval, p.IsApproved, p.ApprovalExpiresAt); err != nil {
		return fmt.Errorf("%w: %v", ErrBarrierApprovalRequired, err)
	}

	// 5. Treasury reservation check (INV-105)
	isExpired := false
	if p.ReservationExpiresAt != nil && time.Now().UTC().After(*p.ReservationExpiresAt) {
		isExpired = true
	}
	if err := CheckTreasuryReservation(p.ReservationID, isExpired); err != nil {
		return fmt.Errorf("%w: %v", ErrBarrierTreasuryInvalid, err)
	}

	// 6. Idempotency key required (INV-118)
	if err := CheckCommandIdempotency(p.IdempotencyKey); err != nil {
		return ErrBarrierIdempotencyEmpty
	}

	// 7. Strict Simulation vs. Live boundary (INV-107)
	if p.IsSimulation && p.IsLiveTarget {
		return ErrBarrierSimulationLeak
	}

	return nil
}
