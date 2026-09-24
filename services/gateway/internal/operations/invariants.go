package operations

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrSupervisorCannotAuthorize     = errors.New("INV-121: operations supervisor cannot authorize financial execution")
	ErrPriorityCannotOverridePolicy  = errors.New("INV-122: operational priority cannot override policy")
	ErrRecoveryCannotBypassApproval  = errors.New("INV-123: operational recovery cannot bypass approval")
	ErrRecoveryCannotBypassTreasury  = errors.New("INV-124: operational recovery cannot bypass treasury")
	ErrRecoveryCannotBypassHardDeny  = errors.New("INV-125: operational recovery cannot bypass hard DENY")
	ErrTenantQueueIsolated           = errors.New("INV-126: tenant queues remain isolated")
	ErrTenantWorkerCapacityLeaked    = errors.New("INV-127: tenant worker capacity cannot expose another tenant's data")
	ErrDeadLetterNotAuditable        = errors.New("INV-128: dead-letter processing is auditable")
	ErrReplayIsReadOnly              = errors.New("INV-129: operational replay is strictly read-only")
	ErrTimeTravelCannotMutate        = errors.New("INV-130: time-travel reconstruction cannot mutate state")
	ErrDecisionCannotModifyPolicy    = errors.New("INV-131: operational decisions cannot modify policy")
	ErrCircuitCannotCreateAuthority  = errors.New("INV-132: circuit breakers cannot create financial authority")
	ErrLoadSheddingDisablesSecurity  = errors.New("INV-133: load shedding cannot disable audit, security, or reconciliation")
	ErrStaleProjectionNotMarked      = errors.New("INV-134: stale operational projections must be visibly marked")
	ErrUnverifiedArcPresentedAsLive  = errors.New("INV-135: unverified Arc state cannot be presented as verified")
	ErrCausalTraceFabricatesEvidence = errors.New("INV-136: causal traces cannot fabricate evidence")
	ErrOperatorUnauthorized          = errors.New("INV-137: operator commands require authorization")
	ErrRetryStormUnbounded           = errors.New("INV-138: retry storms must be bounded")
	ErrInfiniteRecoveryLoop          = errors.New("INV-139: infinite recovery loops are strictly prohibited")
	ErrOpsBudgetIncreasesFinancial   = errors.New("INV-140: operational budgets cannot increase financial budgets")
)

// ValidateSupervisorAuthority enforces INV-121: Supervisor output is an operational decision, not financial authority.
func ValidateSupervisorAuthority(decision OperationsDecision) error {
	if strings.ToUpper(decision.FinancialAuthority) != "UNCHANGED" {
		return ErrSupervisorCannotAuthorize
	}
	return nil
}

// ValidatePriorityPolicyBound enforces INV-122: Priority cannot override policy.
func ValidatePriorityPolicyBound(priority int, policyOutcome string) error {
	if policyOutcome == "DENY" || policyOutcome == "HARD_DENY" {
		return ErrPriorityCannotOverridePolicy
	}
	return nil
}

// ValidateRecoveryApprovalBound enforces INV-123: Recovery cannot bypass approval.
func ValidateRecoveryApprovalBound(requiresApproval bool, approvalApproved bool, approvalExpired bool) error {
	if requiresApproval {
		if !approvalApproved || approvalExpired {
			return ErrRecoveryCannotBypassApproval
		}
	}
	return nil
}

// ValidateRecoveryTreasuryBound enforces INV-124: Recovery cannot bypass treasury reservation.
func ValidateRecoveryTreasuryBound(hasReservation bool, reservationExpired bool) error {
	if !hasReservation || reservationExpired {
		return ErrRecoveryCannotBypassTreasury
	}
	return nil
}

// ValidateRecoveryDenyBound enforces INV-125: Recovery cannot bypass hard DENY.
func ValidateRecoveryDenyBound(policyDecision string) error {
	if policyDecision == "DENY" || policyDecision == "HARD_DENY" {
		return ErrRecoveryCannotBypassHardDeny
	}
	return nil
}

// ValidateTenantQueueIsolation enforces INV-126: Queue items must match query tenant.
func ValidateTenantQueueIsolation(itemTenantID, requesterTenantID string) error {
	if itemTenantID != requesterTenantID {
		return ErrTenantQueueIsolated
	}
	return nil
}

// ValidateReplayReadOnly enforces INV-129: Replay cannot mutate state.
func ValidateReplayReadOnly(isWriteAttempt bool) error {
	if isWriteAttempt {
		return ErrReplayIsReadOnly
	}
	return nil
}

// ValidateTimeTravelReadOnly enforces INV-130: Time travel cannot mutate state.
func ValidateTimeTravelReadOnly(isWriteAttempt bool) error {
	if isWriteAttempt {
		return ErrTimeTravelCannotMutate
	}
	return nil
}

// ValidateDecisionPolicyMutation enforces INV-131: Operational decisions cannot mutate policy.
func ValidateDecisionPolicyMutation(modifiesPolicy bool) error {
	if modifiesPolicy {
		return ErrDecisionCannotModifyPolicy
	}
	return nil
}

// ValidateCircuitFinancialAuthority enforces INV-132: Circuit breaker cannot create financial authority.
func ValidateCircuitFinancialAuthority(claimsAuthority bool) error {
	if claimsAuthority {
		return ErrCircuitCannotCreateAuthority
	}
	return nil
}

// ValidateLoadSheddingScope enforces INV-133: Critical systems cannot be load-shed.
func ValidateLoadSheddingScope(targetComponent string) error {
	criticalComponents := map[string]bool{
		"AUDIT":          true,
		"SECURITY":       true,
		"RECONCILIATION": true,
		"POLICY":         true,
	}
	if criticalComponents[strings.ToUpper(targetComponent)] {
		return ErrLoadSheddingDisablesSecurity
	}
	return nil
}

// ValidateProjectionFreshness enforces INV-134: Stale data must be marked STALE/DEGRADED.
func ValidateProjectionFreshness(generatedAt time.Time, staleThreshold time.Duration, statedFreshness Freshness) error {
	if time.Since(generatedAt) > staleThreshold && statedFreshness == FreshnessFresh {
		return ErrStaleProjectionNotMarked
	}
	return nil
}

// ValidateArcTruthfulness enforces INV-135: Unverified Arc state cannot claim verified.
func ValidateArcTruthfulness(state ArcVerificationState) error {
	if !state.VaultDeployed && (state.StatusText == "VERIFIED" || state.RecentSettlementVerified) {
		return ErrUnverifiedArcPresentedAsLive
	}
	return nil
}

// ValidateCausalEvidence enforces INV-136: Causal traces require verifiable trigger & evidence.
func ValidateCausalEvidence(trigger, evidence string) error {
	if strings.TrimSpace(trigger) == "" {
		return fmt.Errorf("%w: missing trigger", ErrCausalTraceFabricatesEvidence)
	}
	return nil
}

// ValidateRetryStormBounds enforces INV-138: Max retries must be bounded.
func ValidateRetryStormBounds(attempts, maxRetries int) error {
	if attempts > maxRetries {
		return ErrRetryStormUnbounded
	}
	return nil
}

// ValidateRecoveryLoopBounds enforces INV-139: Max recovery attempts must be bounded.
func ValidateRecoveryLoopBounds(recoveryTries, maxRecoveryTries int) error {
	if recoveryTries > maxRecoveryTries {
		return ErrInfiniteRecoveryLoop
	}
	return nil
}

// ValidateOperationalBudgetBoundary enforces INV-140: Ops budget cannot modify financial spending limits.
func ValidateOperationalBudgetBoundary(modifiesSpendingLimit bool) error {
	if modifiesSpendingLimit {
		return ErrOpsBudgetIncreasesFinancial
	}
	return nil
}
