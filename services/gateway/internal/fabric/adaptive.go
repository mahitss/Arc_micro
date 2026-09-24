package fabric

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// AdaptiveInput captures current telemetry for deterministic scheduling
type AdaptiveInput struct {
	ObjectiveID         string
	TenantID            string
	CurrentStepFailed   bool
	ProviderUnavailable bool
	ProviderFailureRate float64
	AgentUnresponsive   bool
	PolicyChanged       bool
	PolicyDecision      string // "ALLOW", "DENY", "APPROVAL_REQUIRED"
	TreasuryExhausted   bool
	AmbiguousTx         bool
	RetryCount          int
	ReplanCount         int
	DeadlineExpired     bool
}

// AdaptiveExecutionEngine deterministically evaluates execution progress
type AdaptiveExecutionEngine struct{}

// NewAdaptiveExecutionEngine creates a new adaptive engine
func NewAdaptiveExecutionEngine() *AdaptiveExecutionEngine {
	return &AdaptiveExecutionEngine{}
}

// Evaluate determines the next operational action based on real-time telemetry
func (e *AdaptiveExecutionEngine) Evaluate(ctx context.Context, in AdaptiveInput) (*FabricDecision, error) {
	decisionID := fmt.Sprintf("dec_%s", uuid.New().String()[:8])
	hashInput := fmt.Sprintf("%s:%s:%t:%t:%d:%d:%s", in.ObjectiveID, in.TenantID, in.CurrentStepFailed, in.ProviderUnavailable, in.RetryCount, in.ReplanCount, in.PolicyDecision)
	h := sha256.Sum256([]byte(hashInput))
	inputsHash := hex.EncodeToString(h[:])

	// 1. Deadline Expired -> CANCEL / ESCALATE
	if in.DeadlineExpired {
		return &FabricDecision{
			DecisionID:         decisionID,
			ObjectiveID:        in.ObjectiveID,
			TenantID:           in.TenantID,
			DecisionType:       DecisionCancel,
			ReasonCode:         "DEADLINE_EXPIRED",
			Explanation:        "Objective execution exceeded maximum deadline SLA",
			InputsHash:         inputsHash,
			FinancialAuthority: "UNCHANGED",
			CreatedAt:          time.Now().UTC(),
		}, nil
	}

	// 2. Policy Denied -> PAUSE (INV-145: cannot retry DENY)
	if in.PolicyDecision == "DENY" {
		return &FabricDecision{
			DecisionID:         decisionID,
			ObjectiveID:        in.ObjectiveID,
			TenantID:           in.TenantID,
			DecisionType:       DecisionPause,
			ReasonCode:         "POLICY_DENIED",
			Explanation:        "Policy engine returned hard DENY; operational step paused",
			InputsHash:         inputsHash,
			FinancialAuthority: "UNCHANGED",
			CreatedAt:          time.Now().UTC(),
		}, nil
	}

	// 3. Ambiguous Blockchain Tx -> RECONCILE (INV-106)
	if in.AmbiguousTx {
		return &FabricDecision{
			DecisionID:         decisionID,
			ObjectiveID:        in.ObjectiveID,
			TenantID:           in.TenantID,
			DecisionType:       DecisionReconcile,
			ReasonCode:         "BLOCKCHAIN_TX_AMBIGUOUS",
			Explanation:        "Transaction state ambiguous; awaiting reconciliation before further steps",
			InputsHash:         inputsHash,
			FinancialAuthority: "UNCHANGED",
			CreatedAt:          time.Now().UTC(),
		}, nil
	}

	// 4. Policy Changed Mid-Flight -> PAUSE (INV-159)
	if in.PolicyChanged {
		return &FabricDecision{
			DecisionID:         decisionID,
			ObjectiveID:        in.ObjectiveID,
			TenantID:           in.TenantID,
			DecisionType:       DecisionPause,
			ReasonCode:         "POLICY_REVALIDATION_REQUIRED",
			Explanation:        "Active constitution changed; operational plan paused for revalidation",
			InputsHash:         inputsHash,
			FinancialAuthority: "UNCHANGED",
			CreatedAt:          time.Now().UTC(),
		}, nil
	}

	// 5. Treasury Liquidity Exhausted -> WAIT (INV-124)
	if in.TreasuryExhausted {
		return &FabricDecision{
			DecisionID:         decisionID,
			ObjectiveID:        in.ObjectiveID,
			TenantID:           in.TenantID,
			DecisionType:       DecisionWait,
			ReasonCode:         "WAITING_FOR_LIQUIDITY",
			Explanation:        "Treasury reservation unavailable; waiting for liquidity release",
			InputsHash:         inputsHash,
			FinancialAuthority: "UNCHANGED",
			CreatedAt:          time.Now().UTC(),
		}, nil
	}

	// 6. Provider Outage / High Failure Rate -> FALLBACK or REPLAN
	if in.ProviderUnavailable || in.ProviderFailureRate > 0.30 {
		if in.ReplanCount < 3 {
			return &FabricDecision{
				DecisionID:         decisionID,
				ObjectiveID:        in.ObjectiveID,
				TenantID:           in.TenantID,
				DecisionType:       DecisionFallback,
				ReasonCode:         "PROVIDER_OUTAGE_FALLBACK",
				Explanation:        "Primary provider degraded; transitioning to configured fallback provider",
				InputsHash:         inputsHash,
				FinancialAuthority: "UNCHANGED",
				CreatedAt:          time.Now().UTC(),
			}, nil
		}
		// Replan limit exceeded
		return &FabricDecision{
			DecisionID:         decisionID,
			ObjectiveID:        in.ObjectiveID,
			TenantID:           in.TenantID,
			DecisionType:       DecisionEscalate,
			ReasonCode:         "MAX_REPLANS_EXCEEDED",
			Explanation:        "Maximum autonomous replan limit reached (3); escalating to human operator",
			InputsHash:         inputsHash,
			FinancialAuthority: "UNCHANGED",
			CreatedAt:          time.Now().UTC(),
		}, nil
	}

	// 7. Step Failed -> RETRY (within bounds) or ESCALATE
	if in.CurrentStepFailed {
		if in.RetryCount < 3 {
			return &FabricDecision{
				DecisionID:         decisionID,
				ObjectiveID:        in.ObjectiveID,
				TenantID:           in.TenantID,
				DecisionType:       DecisionRetry,
				ReasonCode:         "TRANSIENT_STEP_FAILURE",
				Explanation:        fmt.Sprintf("Step failure eligible for retry attempt #%d", in.RetryCount+1),
				InputsHash:         inputsHash,
				FinancialAuthority: "UNCHANGED",
				CreatedAt:          time.Now().UTC(),
			}, nil
		}
		return &FabricDecision{
			DecisionID:         decisionID,
			ObjectiveID:        in.ObjectiveID,
			TenantID:           in.TenantID,
			DecisionType:       DecisionEscalate,
			ReasonCode:         "MAX_RETRIES_EXCEEDED",
			Explanation:        "Step retry attempts exhausted (3); escalating to operator",
			InputsHash:         inputsHash,
			FinancialAuthority: "UNCHANGED",
			CreatedAt:          time.Now().UTC(),
		}, nil
	}

	// 8. Normal Progression -> CONTINUE
	return &FabricDecision{
		DecisionID:         decisionID,
		ObjectiveID:        in.ObjectiveID,
		TenantID:           in.TenantID,
		DecisionType:       DecisionContinue,
		ReasonCode:         "NORMAL_EXECUTION",
		Explanation:        "All pre-flight telemetry healthy; continuing execution pipeline",
		InputsHash:         inputsHash,
		FinancialAuthority: "UNCHANGED",
		CreatedAt:          time.Now().UTC(),
	}, nil
}
