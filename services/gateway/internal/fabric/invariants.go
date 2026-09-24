package fabric

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrFabricCannotAuthorizePayment     = errors.New("INV-141: EconomicFabric cannot authorize payment")
	ErrCompilerCannotCreateAuthority     = errors.New("INV-142: ObjectiveCompiler cannot create financial authority")
	ErrBlueprintCannotIncreaseLimits     = errors.New("INV-143: Blueprint cannot increase financial limits")
	ErrStaleSimulationExecution          = errors.New("INV-144: Stale simulation cannot silently authorize execution")
	ErrReplanningCannotWeakenPolicy      = errors.New("INV-145: Replanning cannot weaken policy")
	ErrProviderSubstitutionPolicyBypass  = errors.New("INV-146: Provider substitution cannot bypass policy")
	ErrAgentSubstitutionPolicyBypass     = errors.New("INV-147: Agent substitution cannot bypass policy")
	ErrEconomicEnvelopeSelfIncrease      = errors.New("INV-148: EconomicEnvelope cannot self-increase")
	ErrRiskEnvelopeWeakensConstitution   = errors.New("INV-149: RiskEnvelope cannot weaken Constitution")
	ErrResourceEnvelopeModifiesTreasury  = errors.New("INV-150: ResourceEnvelope cannot modify treasury authority")
	ErrLearningCannotChangeAuthority     = errors.New("INV-151: Learning cannot silently change authority")
	ErrObjectiveStateOverridesPayment    = errors.New("INV-152: Objective state cannot override payment state")
	ErrFinancialTruthNotAuthoritative    = errors.New("INV-153: Financial source-of-truth remains authoritative")
	ErrReadModelMutatesFinancialTruth    = errors.New("INV-154: Read models cannot mutate financial truth")
	ErrDryRunMutatesProductionState      = errors.New("INV-155: Dry-run cannot mutate production state")
	ErrSimulationCannotBroadcast         = errors.New("INV-156: Simulation cannot broadcast")
	ErrLiveModeRequiresAuthorization     = errors.New("INV-157: Live mode requires current authorization")
	ErrExpiredApprovalCannotExecute      = errors.New("INV-158: Expired approval cannot execute")
	ErrChangedPolicyInvalidatesAuth      = errors.New("INV-159: Changed policy invalidates stale financial authorization")
	ErrUnverifiedArcEvidencePresented    = errors.New("INV-160: Unverified Arc evidence cannot be displayed as verified")
)

// ValidateINV141 verifies that EconomicFabric decision outputs retain financial authority as UNCHANGED
func ValidateINV141(decision *FabricDecision) error {
	if decision.FinancialAuthority != "UNCHANGED" {
		return fmt.Errorf("%w: decision attempted to grant authority %s", ErrFabricCannotAuthorizePayment, decision.FinancialAuthority)
	}
	return nil
}

// ValidateINV142 verifies that ObjectiveCompiler output cannot exceed objective constraints
func ValidateINV142(obj *EconomicObjective, bp *ExecutionBlueprint) error {
	if bp.EconomicEnvelope.MaxTotalCostUSDC > obj.EconomicBudgetUSDC {
		return fmt.Errorf("%w: blueprint budget %.2f exceeds objective budget %.2f", ErrCompilerCannotCreateAuthority, bp.EconomicEnvelope.MaxTotalCostUSDC, obj.EconomicBudgetUSDC)
	}
	return nil
}

// ValidateINV143 verifies that blueprint versioning never raises the economic limit above base envelope
func ValidateINV143(originalEnvelope EconomicEnvelope, newEnvelope EconomicEnvelope) error {
	if newEnvelope.MaxTotalCostUSDC > originalEnvelope.MaxTotalCostUSDC {
		return fmt.Errorf("%w: new blueprint cost %.2f exceeds original limit %.2f", ErrBlueprintCannotIncreaseLimits, newEnvelope.MaxTotalCostUSDC, originalEnvelope.MaxTotalCostUSDC)
	}
	return nil
}

// ValidateINV144 verifies that stale simulations cannot trigger live execution without revalidation
func ValidateINV144(bp *ExecutionBlueprint, currentPolicyHash string, currentConstitutionVersion int) error {
	if bp.SimulationStale {
		return fmt.Errorf("%w: blueprint simulation marked stale", ErrStaleSimulationExecution)
	}
	if bp.PolicyHash != "" && bp.PolicyHash != currentPolicyHash {
		return fmt.Errorf("%w: policy hash changed since simulation (%s != %s)", ErrStaleSimulationExecution, bp.PolicyHash, currentPolicyHash)
	}
	return nil
}

// ValidateINV145 verifies that replanning cannot weaken policy requirements
func ValidateINV145(oldPolicyDecision string, newPolicyDecision string) error {
	if oldPolicyDecision == "DENY" && newPolicyDecision != "DENY" {
		return fmt.Errorf("%w: cannot transition denied step to %s without policy engine re-evaluation", ErrReplanningCannotWeakenPolicy, newPolicyDecision)
	}
	return nil
}

// ValidateINV146 verifies that substituting a provider complies with policy allowlists
func ValidateINV146(newProvider string, policyAllowedProviders []string) error {
	for _, p := range policyAllowedProviders {
		if p == newProvider {
			return nil
		}
	}
	return fmt.Errorf("%w: provider %s is not permitted by policy", ErrProviderSubstitutionPolicyBypass, newProvider)
}

// ValidateINV147 verifies that substituting an agent complies with policy constraints
func ValidateINV147(newAgentID string, policyAllowedAgents []string) error {
	if len(policyAllowedAgents) == 0 {
		return nil
	}
	for _, a := range policyAllowedAgents {
		if a == newAgentID {
			return nil
		}
	}
	return fmt.Errorf("%w: agent %s is not permitted by policy", ErrAgentSubstitutionPolicyBypass, newAgentID)
}

// ValidateINV148 verifies that an EconomicEnvelope cannot increase its own limits
func ValidateINV148(env *EconomicEnvelope, requestedIncrease float64) error {
	if requestedIncrease > 0 {
		return fmt.Errorf("%w: envelope cannot self-increase by %.2f USDC", ErrEconomicEnvelopeSelfIncrease, requestedIncrease)
	}
	return nil
}

// ValidateINV149 verifies that a RiskEnvelope does not relax Constitutional limits
func ValidateINV149(constitutionalMaxRisk int, envelopeMaxRisk int) error {
	if envelopeMaxRisk > constitutionalMaxRisk {
		return fmt.Errorf("%w: envelope risk %d exceeds constitutional ceiling %d", ErrRiskEnvelopeWeakensConstitution, envelopeMaxRisk, constitutionalMaxRisk)
	}
	return nil
}

// ValidateINV150 verifies that ResourceEnvelope adjustments do not grant financial authority
func ValidateINV150(resEnv *ResourceEnvelope, grantsTreasuryAuthority bool) error {
	if grantsTreasuryAuthority {
		return fmt.Errorf("%w: resource allocation cannot grant treasury rights", ErrResourceEnvelopeModifiesTreasury)
	}
	return nil
}

// ValidateINV151 verifies that learning/recommendation output cannot elevate spending limits
func ValidateINV151(isRecommendation bool, modifiesLimitsDirectly bool) error {
	if modifiesLimitsDirectly {
		return fmt.Errorf("%w: learning output must remain recommendations only", ErrLearningCannotChangeAuthority)
	}
	return nil
}

// ValidateINV152 verifies that objective status does not hide lower-level financial truth
func ValidateINV152(objectiveStatus ObjectiveStatus, paymentStatus string) error {
	if objectiveStatus == ObjectiveCompleted && (paymentStatus == "FAILED" || paymentStatus == "BLOCKED") {
		return fmt.Errorf("%w: cannot mark objective COMPLETED while payment is %s", ErrObjectiveStateOverridesPayment, paymentStatus)
	}
	return nil
}

// ValidateINV153 verifies that financial operations reference authoritative domain records
func ValidateINV153(hasAuthoritativeIntent bool, hasAuthoritativeReservation bool) error {
	if !hasAuthoritativeIntent || !hasAuthoritativeReservation {
		return fmt.Errorf("%w: missing authoritative PaymentIntent or Treasury reservation", ErrFinancialTruthNotAuthoritative)
	}
	return nil
}

// ValidateINV154 verifies that read model queries cannot mutate financial state
func ValidateINV154(isReadModelQuery bool, attemptedMutation bool) error {
	if isReadModelQuery && attemptedMutation {
		return fmt.Errorf("%w: read model cannot mutate domain state", ErrReadModelMutatesFinancialTruth)
	}
	return nil
}

// ValidateINV155 verifies that dry-run invocations do not persist state changes
func ValidateINV155(dryRun bool, stateMutated bool) error {
	if dryRun && stateMutated {
		return fmt.Errorf("%w: dry-run modified state", ErrDryRunMutatesProductionState)
	}
	return nil
}

// ValidateINV156 verifies that simulations never broadcast to live Arc blockchain
func ValidateINV156(executionMode string, attemptedBroadcast bool) error {
	if executionMode == "SIMULATION" && attemptedBroadcast {
		return fmt.Errorf("%w: simulation attempted on-chain broadcast", ErrSimulationCannotBroadcast)
	}
	return nil
}

// ValidateINV157 verifies that live execution mode requires active, unexpired authorization
func ValidateINV157(executionMode string, isAuthorized bool, authExpired bool) error {
	if executionMode == "LIVE" && (!isAuthorized || authExpired) {
		return fmt.Errorf("%w: live execution missing active authorization", ErrLiveModeRequiresAuthorization)
	}
	return nil
}

// ValidateINV158 verifies that expired approvals block financial execution
func ValidateINV158(requiresApproval bool, approved bool, approvalExpiry time.Time, now time.Time) error {
	if requiresApproval {
		if !approved {
			return fmt.Errorf("%w: step requires approval which has not been granted", ErrExpiredApprovalCannotExecute)
		}
		if !approvalExpiry.IsZero() && now.After(approvalExpiry) {
			return fmt.Errorf("%w: approval expired at %s (current: %s)", ErrExpiredApprovalCannotExecute, approvalExpiry, now)
		}
	}
	return nil
}

// ValidateINV159 verifies that a constitutional policy change invalidates stale authorization
func ValidateINV159(policySnapshotHash string, activePolicyHash string) error {
	if policySnapshotHash != activePolicyHash {
		return fmt.Errorf("%w: snapshot policy hash %s != active policy hash %s", ErrChangedPolicyInvalidatesAuth, policySnapshotHash, activePolicyHash)
	}
	return nil
}

// ValidateINV160 verifies that unverified Arc state is not presented as verified
func ValidateINV160(rpcAvailable bool, vaultDeployed bool, presentedAsVerified bool) error {
	if rpcAvailable && !vaultDeployed && presentedAsVerified {
		return fmt.Errorf("%w: RPC available does not equal AgentVault verified", ErrUnverifiedArcEvidencePresented)
	}
	return nil
}
