package marketplace

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrINV181 = errors.New("INV-181: marketplace matching cannot authorize payment")
	ErrINV182 = errors.New("INV-182: marketplace ranking cannot bypass policy")
	ErrINV183 = errors.New("INV-183: marketplace selection cannot bypass risk")
	ErrINV184 = errors.New("INV-184: marketplace selection cannot bypass required human/governance approval")
	ErrINV185 = errors.New("INV-185: marketplace cannot increase authorized opportunity budget")
	ErrINV186 = errors.New("INV-186: marketplace cannot select arbitrary recipient address (raw 0x... prohibited)")
	ErrINV187 = errors.New("INV-187: expired quote cannot be awarded")
	ErrINV188 = errors.New("INV-188: paused or suspended listing cannot receive new work")
	ErrINV189 = errors.New("INV-189: cross-tenant listings and opportunities are strictly isolated")
	ErrINV190 = errors.New("INV-190: provider reputation cannot create financial authority")
	ErrINV191 = errors.New("INV-191: performance metrics cannot fabricate outcomes (confidence requires valid sample size)")
	ErrINV192 = errors.New("INV-192: marketplace simulation cannot mutate persistent production state")
	ErrINV193 = errors.New("INV-193: marketplace compare view is strictly read-only")
	ErrINV194 = errors.New("INV-194: duplicate award cannot create duplicate contract")
	ErrINV195 = errors.New("INV-195: duplicate payment request cannot create duplicate payment intent")
	ErrINV196 = errors.New("INV-196: provider substitution requires policy and risk revalidation")
	ErrINV197 = errors.New("INV-197: policy changes invalidate stale marketplace authorization")
	ErrINV198 = errors.New("INV-198: risk DENY cannot be overridden by marketplace selection or ranking")
	ErrINV199 = errors.New("INV-199: market scarcity cannot automatically increase financial authority or budget")
	ErrINV200 = errors.New("INV-200: concentration signals cannot directly mutate or freeze financial controls")
)

// ValidateINV181 checks that matching output never directly authorizes money movement.
func ValidateINV181(isMatching bool, paymentAuthorized bool) error {
	if isMatching && paymentAuthorized {
		return fmt.Errorf("%w: matching engine produced payment authorization", ErrINV181)
	}
	return nil
}

// ValidateINV182 checks that provider ranking never overrides a policy DENY.
func ValidateINV182(policyDecision string, allowSelection bool) error {
	if strings.ToUpper(policyDecision) == "DENY" && allowSelection {
		return fmt.Errorf("%w: cannot select provider with policy decision DENY", ErrINV182)
	}
	return nil
}

// ValidateINV183 checks that risk evaluation is not bypassed.
func ValidateINV183(riskScore int, maxAllowedRisk int, isSelected bool) error {
	if riskScore > maxAllowedRisk && isSelected {
		return fmt.Errorf("%w: provider risk %d exceeds allowed %d", ErrINV183, riskScore, maxAllowedRisk)
	}
	return nil
}

// ValidateINV184 checks that approvals are not skipped.
func ValidateINV184(requiresApproval bool, isApproved bool, awardAttempted bool) error {
	if requiresApproval && !isApproved && awardAttempted {
		return fmt.Errorf("%w: opportunity requires approval prior to award", ErrINV184)
	}
	return nil
}

// ValidateINV185 checks that requested or negotiated price does not exceed opportunity budget cap.
func ValidateINV185(proposedPrice float64, budgetCap float64) error {
	if proposedPrice > budgetCap {
		return fmt.Errorf("%w: proposed price %.2f exceeds budget cap %.2f", ErrINV185, proposedPrice, budgetCap)
	}
	return nil
}

// ValidateINV186 checks that recipient is a registered agent ID rather than a raw blockchain address.
func ValidateINV186(recipientID string) error {
	if strings.HasPrefix(strings.ToLower(recipientID), "0x") {
		return fmt.Errorf("%w: raw hex recipient %s injection blocked", ErrINV186, recipientID)
	}
	if !strings.HasPrefix(recipientID, "agent_") && !strings.HasPrefix(recipientID, "srv_") {
		return fmt.Errorf("%w: recipient must resolve to approved directory identifier", ErrINV186)
	}
	return nil
}

// ValidateINV187 checks that an expired quote cannot be awarded.
func ValidateINV187(expiration time.Time, now time.Time) error {
	if now.After(expiration) {
		return fmt.Errorf("%w: quote expired at %s, current time %s", ErrINV187, expiration.Format(time.RFC3339), now.Format(time.RFC3339))
	}
	return nil
}

// ValidateINV188 checks that paused, suspended, or retired listings cannot receive awards.
func ValidateINV188(status ListingStatus) error {
	if status != ListingStatusActive {
		return fmt.Errorf("%w: listing is %s (must be ACTIVE)", ErrINV188, status)
	}
	return nil
}

// ValidateINV189 checks strict tenant boundary isolation.
func ValidateINV189(callerTenant string, resourceTenant string) error {
	if callerTenant != resourceTenant {
		return fmt.Errorf("%w: caller tenant %s cannot access resource in tenant %s", ErrINV189, callerTenant, resourceTenant)
	}
	return nil
}

// ValidateINV190 checks that high reputation score does not bypass financial authorization pipelines.
func ValidateINV190(reputationScore float64, bypassFinancialControls bool) error {
	if bypassFinancialControls {
		return fmt.Errorf("%w: agent with reputation %.1f cannot bypass financial controls", ErrINV190, reputationScore)
	}
	return nil
}

// ValidateINV191 checks that sample size and confidence claims are grounded.
func ValidateINV191(sampleSize int, reportedConfidence float64) error {
	if sampleSize <= 0 && reportedConfidence > 0.5 {
		return fmt.Errorf("%w: zero sample size cannot report high confidence %.2f", ErrINV191, reportedConfidence)
	}
	return nil
}

// ValidateINV192 checks that simulations do not write to live persistent storage.
func ValidateINV192(isSimulation bool, attemptedLiveWrite bool) error {
	if isSimulation && attemptedLiveWrite {
		return fmt.Errorf("%w: digital twin simulation attempted live database write", ErrINV192)
	}
	return nil
}

// ValidateINV193 checks that compare views perform no state mutations.
func ValidateINV193(isCompareView bool, mutationAttempted bool) error {
	if isCompareView && mutationAttempted {
		return fmt.Errorf("%w: marketplace compare endpoint is strictly read-only", ErrINV193)
	}
	return nil
}

// ValidateINV194 checks that an opportunity cannot be awarded twice concurrently or sequentially.
func ValidateINV194(currentStatus OpportunityStatus, hasExistingContract bool) error {
	if currentStatus == OpportunityStatusAwarded || hasExistingContract {
		return fmt.Errorf("%w: opportunity already awarded (contract exists)", ErrINV194)
	}
	return nil
}

// ValidateINV195 checks that payment requests on the same milestone are idempotent.
func ValidateINV195(isDuplicate bool, decisionExists bool) error {
	if isDuplicate && !decisionExists {
		return fmt.Errorf("%w: duplicate payment request detected without recorded idempotency decision", ErrINV195)
	}
	return nil
}

// ValidateINV196 checks that substituting a provider requires full re-validation of policy and risk.
func ValidateINV196(isSubstitute bool, isRevalidated bool) error {
	if isSubstitute && !isRevalidated {
		return fmt.Errorf("%w: fallback provider substitution must undergo fresh policy and risk evaluation", ErrINV196)
	}
	return nil
}

// ValidateINV197 checks that changed policy invalidates stale marketplace quotes or authorizations.
func ValidateINV197(quotePolicyHash string, currentPolicyHash string) error {
	if quotePolicyHash != currentPolicyHash {
		return fmt.Errorf("%w: policy has changed (quote hash %s != current hash %s)", ErrINV197, quotePolicyHash, currentPolicyHash)
	}
	return nil
}

// ValidateINV198 checks that risk DENY is absolute.
func ValidateINV198(riskDecision string, selectionAttempted bool) error {
	if strings.ToUpper(riskDecision) == "DENY" && selectionAttempted {
		return fmt.Errorf("%w: risk engine DENY cannot be overridden by marketplace ranking", ErrINV198)
	}
	return nil
}

// ValidateINV199 checks that scarcity does not elevate authorized budget.
func ValidateINV199(scarcityObserved bool, budgetElevated bool) error {
	if scarcityObserved && budgetElevated {
		return fmt.Errorf("%w: market scarcity cannot self-elevate financial authorization ceiling", ErrINV199)
	}
	return nil
}

// ValidateINV200 checks that concentration warnings do not execute unmonitored hard freezes without governance.
func ValidateINV200(isInformationalSignal bool, directLedgerFreezeAttempt bool) error {
	if isInformationalSignal && directLedgerFreezeAttempt {
		return fmt.Errorf("%w: concentration signal is informational and cannot directly bypass governance to freeze funds", ErrINV200)
	}
	return nil
}
