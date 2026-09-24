package protocol

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrINV161 = errors.New("INV-161: Protocol authentication does not imply financial authorization")
	ErrINV162 = errors.New("INV-162: External agents cannot sign financial transactions")
	ErrINV163 = errors.New("INV-163: External agents cannot select arbitrary recipients")
	ErrINV164 = errors.New("INV-164: External agents cannot select arbitrary calldata")
	ErrINV165 = errors.New("INV-165: Protocol messages cannot bypass policy")
	ErrINV166 = errors.New("INV-166: Protocol messages cannot bypass risk")
	ErrINV167 = errors.New("INV-167: Protocol messages cannot bypass approval")
	ErrINV168 = errors.New("INV-168: Protocol messages cannot bypass treasury")
	ErrINV169 = errors.New("INV-169: Duplicate payment requests are idempotent")
	ErrINV170 = errors.New("INV-170: Replayed messages are rejected")
	ErrINV171 = errors.New("INV-171: Expired messages are rejected")
	ErrINV172 = errors.New("INV-172: Cross-tenant protocol access is impossible")
	ErrINV173 = errors.New("INV-173: Result submission cannot directly trigger payment")
	ErrINV174 = errors.New("INV-174: Fake payment confirmations cannot change financial truth")
	ErrINV175 = errors.New("INV-175: Protocol simulation cannot broadcast")
	ErrINV176 = errors.New("INV-176: Protocol precheck cannot mutate financial state")
	ErrINV177 = errors.New("INV-177: Webhook delivery failure cannot alter completed financial state")
	ErrINV178 = errors.New("INV-178: Disputes cannot directly mutate ledger state")
	ErrINV179 = errors.New("INV-179: Trust level cannot grant financial authority")
	ErrINV180 = errors.New("INV-180: Reputation cannot grant financial authority")
)

// ValidateINV161 ensures protocol authentication never bypasses financial policy.
func ValidateINV161(isAuthenticated bool, hasPolicyApproval bool) error {
	if isAuthenticated && !hasPolicyApproval {
		return ErrINV161
	}
	return nil
}

// ValidateINV162 ensures external agents never hold or supply raw transaction private keys.
func ValidateINV162(externalKeyPresent bool) error {
	if externalKeyPresent {
		return ErrINV162
	}
	return nil
}

// ValidateINV163 ensures recipient addresses are resolved strictly via the authoritative registry.
func ValidateINV163(rawRecipientAddress string, isRegisteredService bool) error {
	if strings.HasPrefix(rawRecipientAddress, "0x") && !isRegisteredService {
		return fmt.Errorf("%w: raw recipient %s not registered in service directory", ErrINV163, rawRecipientAddress)
	}
	return nil
}

// ValidateINV164 ensures arbitrary calldata injection from external agents is prohibited.
func ValidateINV164(calldataProvidedByUser bool) error {
	if calldataProvidedByUser {
		return ErrINV164
	}
	return nil
}

// ValidateINV165 ensures policy decisions are strictly respected.
func ValidateINV165(policyDecision string) error {
	if strings.ToUpper(policyDecision) == "DENY" {
		return ErrINV165
	}
	return nil
}

// ValidateINV166 ensures risk thresholds cannot be overridden by protocol messages.
func ValidateINV166(riskScore int, maxAllowedRisk int) error {
	if riskScore > maxAllowedRisk {
		return fmt.Errorf("%w: risk score %d exceeds envelope threshold %d", ErrINV166, riskScore, maxAllowedRisk)
	}
	return nil
}

// ValidateINV167 ensures approval gates are strictly enforced when required.
func ValidateINV167(requiresApproval bool, isApproved bool) error {
	if requiresApproval && !isApproved {
		return ErrINV167
	}
	return nil
}

// ValidateINV168 ensures treasury reservations are present before payment release.
func ValidateINV168(hasLockedTreasuryReservation bool) error {
	if !hasLockedTreasuryReservation {
		return ErrINV168
	}
	return nil
}

// ValidateINV169 ensures duplicate payment requests return the original intent without creating new obligations.
func ValidateINV169(isDuplicate bool, existingIntentID string) error {
	if isDuplicate && existingIntentID == "" {
		return ErrINV169
	}
	return nil
}

// ValidateINV170 ensures replayed messages with reused nonces are blocked.
func ValidateINV170(nonceReused bool) error {
	if nonceReused {
		return ErrINV170
	}
	return nil
}

// ValidateINV171 ensures timestamps outside allowed tolerance are rejected.
func ValidateINV171(msgTimestamp time.Time, tolerance time.Duration) error {
	now := time.Now().UTC()
	diff := now.Sub(msgTimestamp)
	if diff < 0 {
		diff = -diff
	}
	if diff > tolerance {
		return fmt.Errorf("%w: timestamp delta %v exceeds tolerance %v", ErrINV171, diff, tolerance)
	}
	return nil
}

// ValidateINV172 ensures tenant contexts cannot bleed across boundaries.
func ValidateINV172(msgTenant string, targetTenant string) error {
	if msgTenant != targetTenant {
		return fmt.Errorf("%w: msg tenant %s != target tenant %s", ErrINV172, msgTenant, targetTenant)
	}
	return nil
}

// ValidateINV173 ensures result submission must pass quality gates before becoming eligible for payment.
func ValidateINV173(qualityGatePassed bool) error {
	if !qualityGatePassed {
		return ErrINV173
	}
	return nil
}

// ValidateINV174 ensures non-authoritative payment confirmations cannot update ledger state.
func ValidateINV174(sourceOfTruth string) error {
	if sourceOfTruth != "ARC_BLOCKCHAIN" && sourceOfTruth != "TREASURY_LEDGER" {
		return fmt.Errorf("%w: invalid source of truth %s", ErrINV174, sourceOfTruth)
	}
	return nil
}

// ValidateINV175 ensures simulation mode never broadcasts on-chain transactions.
func ValidateINV175(isSimulation bool, broadcastAttempted bool) error {
	if isSimulation && broadcastAttempted {
		return ErrINV175
	}
	return nil
}

// ValidateINV176 ensures precheck requests are strictly read-only and mutate zero state.
func ValidateINV176(mutatedDatabase bool) error {
	if mutatedDatabase {
		return ErrINV176
	}
	return nil
}

// ValidateINV177 ensures webhook failures do not roll back confirmed financial operations.
func ValidateINV177(financialConfirmed bool, rollbackTriggered bool) error {
	if financialConfirmed && rollbackTriggered {
		return ErrINV177
	}
	return nil
}

// ValidateINV178 ensures dispute states cannot mutate ledger balances directly without authoritative settlement.
func ValidateINV178(disputeDirectLedgerMutation bool) error {
	if disputeDirectLedgerMutation {
		return ErrINV178
	}
	return nil
}

// ValidateINV179 ensures high trust levels cannot bypass policy limits or approval requirements.
func ValidateINV179(trustLevel TrustLevel, policyApproved bool) error {
	if !policyApproved {
		return fmt.Errorf("%w: trust level %s cannot bypass policy requirements", ErrINV179, trustLevel)
	}
	return nil
}

// ValidateINV180 ensures high reputation scores cannot authorize payments above budget ceilings.
func ValidateINV180(reputationScore float64, requestedAmount float64, budgetCap float64) error {
	if requestedAmount > budgetCap {
		return fmt.Errorf("%w: reputation score %.2f cannot authorize amount %.2f above cap %.2f", ErrINV180, reputationScore, requestedAmount, budgetCap)
	}
	return nil
}
