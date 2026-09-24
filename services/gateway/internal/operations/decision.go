package operations

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// DecisionInputs groups all operational factors considered by the OperationsDecisionEngine.
type DecisionInputs struct {
	TenantID          string        `json:"tenant_id"`
	WorkflowID        string        `json:"workflow_id"`
	StepID            string        `json:"step_id,omitempty"`
	WorkflowState     string        `json:"workflow_state"`
	StepState         string        `json:"step_state,omitempty"`
	StepType          string        `json:"step_type,omitempty"`
	IsFinancial       bool          `json:"is_financial"`
	PolicyDecision    string        `json:"policy_decision,omitempty"` // ALLOW, DENY, APPROVAL_REQUIRED
	RiskScore         float64       `json:"risk_score,omitempty"`
	ApprovalApproved  bool          `json:"approval_approved"`
	ApprovalExpired   bool          `json:"approval_expired"`
	HasReservation    bool          `json:"has_reservation"`
	ReservationExpiry bool          `json:"reservation_expired"`
	ProviderStatus    string        `json:"provider_status,omitempty"` // HEALTHY, DEGRADED, DOWN, CIRCUIT_OPEN
	Attempts          int           `json:"attempts"`
	MaxAttempts       int           `json:"max_attempts"`
	TimeRemaining     time.Duration `json:"time_remaining"`
	StateVersion      int           `json:"state_version"`
}

// ComputeHash calculates a deterministic SHA-256 fingerprint of the decision inputs.
func (in *DecisionInputs) ComputeHash() string {
	payload := fmt.Sprintf("%s:%s:%s:%s:%s:%s:%t:%s:%.2f:%t:%t:%t:%t:%s:%d:%d:%d:%d",
		in.TenantID, in.WorkflowID, in.StepID, in.WorkflowState, in.StepState, in.StepType,
		in.IsFinancial, in.PolicyDecision, in.RiskScore, in.ApprovalApproved, in.ApprovalExpired,
		in.HasReservation, in.ReservationExpiry, in.ProviderStatus, in.Attempts, in.MaxAttempts,
		in.TimeRemaining.Milliseconds(), in.StateVersion,
	)
	h := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(h[:])
}

// OperationsDecisionEngine evaluates operational factors and yields deterministic decisions.
type OperationsDecisionEngine struct{}

// NewOperationsDecisionEngine creates an instance of OperationsDecisionEngine.
func NewOperationsDecisionEngine() *OperationsDecisionEngine {
	return &OperationsDecisionEngine{}
}

// Evaluate produces a deterministic OperationsDecision based on structured inputs.
func (e *OperationsDecisionEngine) Evaluate(in DecisionInputs) (OperationsDecision, error) {
	decision := OperationsDecision{
		DecisionID:         "dec_" + uuid.NewString()[:8],
		TenantID:           in.TenantID,
		WorkflowID:         in.WorkflowID,
		StepID:             in.StepID,
		InputsHash:         in.ComputeHash(),
		StateVersion:       in.StateVersion,
		Actor:              "SYSTEM_SUPERVISOR",
		FinancialAuthority: "UNCHANGED",
		Timestamp:          time.Now().UTC(),
		Constraints: map[string]interface{}{
			"is_financial":   in.IsFinancial,
			"attempts":       in.Attempts,
			"max_attempts":   in.MaxAttempts,
			"time_remaining": in.TimeRemaining.String(),
		},
	}

	// 1. Check if workflow is paused or cancelled
	if in.WorkflowState == "PAUSED" {
		decision.DecisionType = DecisionPause
		decision.ReasonCode = "WORKFLOW_PAUSED"
		decision.Evidence = "Workflow execution currently suspended by operator or policy"
		decision.Action = "Await explicit operator resume"
		return decision, nil
	}
	if in.WorkflowState == "CANCELLED" || in.WorkflowState == "ABORTED" {
		decision.DecisionType = DecisionCancel
		decision.ReasonCode = "WORKFLOW_CANCELLED"
		decision.Evidence = "Workflow has been cancelled"
		decision.Action = "Halt all pending execution"
		return decision, nil
	}

	// 2. Deadline expiration check
	if in.TimeRemaining <= 0 {
		decision.DecisionType = DecisionEscalate
		decision.ReasonCode = "DEADLINE_EXPIRED"
		decision.Evidence = "Workflow deadline has expired"
		decision.Action = "Escalate to operator or trigger graceful abandonment"
		return decision, nil
	}

	// 3. Retry limits
	if in.Attempts >= in.MaxAttempts {
		decision.DecisionType = DecisionEscalate
		decision.ReasonCode = "RETRY_BUDGET_EXHAUSTED"
		decision.Evidence = fmt.Sprintf("Step exceeded max attempts (%d/%d)", in.Attempts, in.MaxAttempts)
		decision.Action = "Escalate or route to dead-letter queue"
		return decision, nil
	}

	// 4. Financial Barrier Pre-flight Evaluator
	if in.IsFinancial {
		// Strict Policy Deny check (INV-122, INV-125)
		if in.PolicyDecision == "DENY" || in.PolicyDecision == "HARD_DENY" {
			decision.DecisionType = DecisionCancel
			decision.ReasonCode = "POLICY_HARD_DENY"
			decision.Evidence = "Policy engine returned immutable DENY"
			decision.Action = "Cancel financial step; retries are forbidden"
			return decision, nil
		}

		// Human Approval Required check (INV-123)
		if in.PolicyDecision == "APPROVAL_REQUIRED" || !in.ApprovalApproved {
			if !in.ApprovalApproved || in.ApprovalExpired {
				if in.ApprovalExpired {
					decision.DecisionType = DecisionEscalate
					decision.ReasonCode = "APPROVAL_EXPIRED"
					decision.Evidence = "Required human approval expired before execution"
					decision.Action = "Request fresh approval"
					return decision, nil
				}
				decision.DecisionType = DecisionWait
				decision.ReasonCode = "AWAITING_APPROVAL"
				decision.Evidence = "Financial step requires pending human approval"
				decision.Action = "Wait for human-in-the-loop authorization"
				return decision, nil
			}
		}

		// Treasury Reservation check (INV-124)
		if !in.HasReservation || in.ReservationExpiry {
			decision.DecisionType = DecisionWait
			decision.ReasonCode = "TREASURY_RESERVATION_REQUIRED"
			decision.Evidence = "Active treasury liquidity reservation missing or expired"
			decision.Action = "Obtain fresh treasury reservation before dispatch"
			return decision, nil
		}
	}

	// 5. External Provider / Circuit Breaker check
	if in.ProviderStatus == "CIRCUIT_OPEN" || in.ProviderStatus == "DOWN" {
		decision.DecisionType = DecisionReplan
		decision.ReasonCode = "PROVIDER_UNAVAILABLE"
		decision.Evidence = fmt.Sprintf("Target provider status is %s", in.ProviderStatus)
		decision.Action = "Replan to alternate authorized provider"
		return decision, nil
	}

	// 6. Step State Specific Handling
	switch in.StepState {
	case "RECOVERY_REQUIRED":
		decision.DecisionType = DecisionRecover
		decision.ReasonCode = "STEP_NEEDS_RECOVERY"
		decision.Evidence = "Worker lease expired or process crashed"
		decision.Action = "Reclaim lease and resume from latest checkpoint"
	case "RETRYABLE_FAILURE":
		decision.DecisionType = DecisionRetry
		decision.ReasonCode = "TRANSIENT_FAILURE"
		decision.Evidence = "Step encountered retryable transient error"
		decision.Action = "Schedule exponential backoff retry"
	case "AMBIGUOUS":
		decision.DecisionType = DecisionReconcile
		decision.ReasonCode = "AMBIGUOUS_STATE"
		decision.Evidence = "Blockchain submission or external side effect is unconfirmed"
		decision.Action = "Route to reconciliation; do not rebroadcast"
	default:
		decision.DecisionType = DecisionRun
		decision.ReasonCode = "READY_TO_EXECUTE"
		decision.Evidence = "All operational constraints satisfied and financial controls verified"
		decision.Action = "Dispatch step to authorized worker"
	}

	// Enforce invariant INV-121
	if err := ValidateSupervisorAuthority(decision); err != nil {
		return decision, err
	}

	return decision, nil
}
