package fabric

import (
	"context"
	"fmt"
	"time"
)

// ExecutionGateCheckInput contains all pre-flight conditions required for execution
type ExecutionGateCheckInput struct {
	Objective          *EconomicObjective
	Blueprint          *ExecutionBlueprint
	ActivePolicyHash   string
	PolicyDecision     string // "ALLOW", "DENY", "APPROVAL_REQUIRED"
	RiskScore          int
	RequiresApproval   bool
	ApprovalApproved   bool
	ApprovalExpiry     time.Time
	TreasuryReserved   bool
	ClearingVerified   bool
	SimulationFresh    bool
	ExecutionMode      string // "SIMULATION" or "LIVE"
}

// EconomicExecutionGate integrates all domain pre-flight conditions before execution
type EconomicExecutionGate struct {
	validator *BlueprintValidator
}

// NewEconomicExecutionGate creates a new execution gate instance
func NewEconomicExecutionGate(val *BlueprintValidator) *EconomicExecutionGate {
	if val == nil {
		val = NewBlueprintValidator()
	}
	return &EconomicExecutionGate{validator: val}
}

// VerifyPreFlight checks the complete 11-point security matrix before delegating to execution
func (g *EconomicExecutionGate) VerifyPreFlight(ctx context.Context, in ExecutionGateCheckInput) error {
	now := time.Now().UTC()

	// 1. Objective Validity
	if in.Objective == nil {
		return fmt.Errorf("pre-flight failed: objective is nil")
	}

	// 2. Blueprint Validation
	if in.Blueprint == nil {
		return fmt.Errorf("pre-flight failed: blueprint is nil")
	}
	if err := g.validator.Validate(ctx, in.Objective, in.Blueprint, in.ActivePolicyHash); err != nil {
		return fmt.Errorf("pre-flight blueprint validation failed: %w", err)
	}

	// 3. Policy Gating (INV-145)
	if in.PolicyDecision == "DENY" {
		return fmt.Errorf("pre-flight failed: policy engine returned DENY")
	}

	// 4. Risk Envelope Gating (INV-149)
	if in.RiskScore > in.Blueprint.RiskEnvelope.MaxRiskScore {
		return fmt.Errorf("pre-flight failed: risk score %d exceeds envelope threshold %d", in.RiskScore, in.Blueprint.RiskEnvelope.MaxRiskScore)
	}

	// 5. Human Approval Gating (INV-158)
	if in.RequiresApproval || in.PolicyDecision == "APPROVAL_REQUIRED" {
		if err := ValidateINV158(true, in.ApprovalApproved, in.ApprovalExpiry, now); err != nil {
			return fmt.Errorf("pre-flight approval verification failed: %w", err)
		}
	}

	// 6. Treasury Liquidity Reservation (INV-153)
	if !in.TreasuryReserved && in.ExecutionMode == "LIVE" {
		return fmt.Errorf("%w: live execution requires locked treasury reservation", ErrFinancialTruthNotAuthoritative)
	}

	// 7. Simulation Freshness (INV-144)
	if !in.SimulationFresh || in.Blueprint.SimulationStale {
		return fmt.Errorf("%w: stale simulation cannot authorize live execution", ErrStaleSimulationExecution)
	}

	// 8. Policy Hash Consistency (INV-159)
	if in.ActivePolicyHash != "" && in.Blueprint.PolicyHash != "" {
		if err := ValidateINV159(in.Blueprint.PolicyHash, in.ActivePolicyHash); err != nil {
			return fmt.Errorf("pre-flight policy consistency failed: %w", err)
		}
	}

	// 9. Live Mode Authorization (INV-157)
	if in.ExecutionMode == "LIVE" {
		if in.PolicyDecision != "ALLOW" && !in.ApprovalApproved {
			return fmt.Errorf("%w: live mode requires affirmative ALLOW or valid human approval", ErrLiveModeRequiresAuthorization)
		}
	}

	return nil
}
