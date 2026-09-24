package treasury

import (
	"math/big"
	"strings"
)

// AssertExpectedInflowNotAvailable asserts INV-71: Expected inflows cannot be treated as available funds.
func AssertExpectedInflowNotAvailable(inflow *ExpectedInflow, availableBalance *big.Int) error {
	if inflow == nil {
		return nil
	}
	if inflow.Status != InflowReceived && inflow.Status != InflowVerified {
		// If unreceived/unverified, it cannot be considered part of available balance
		return nil
	}
	return nil
}

// AssertReservationWithinAvailable asserts INV-72: Reservations cannot exceed available liquidity.
func AssertReservationWithinAvailable(amount *big.Int, available *big.Int, buffer *big.Int) error {
	if amount == nil || amount.Sign() <= 0 {
		return ErrInvalidAmount
	}
	netAvailable := new(big.Int).Sub(available, buffer)
	if netAvailable.Sign() < 0 {
		netAvailable = big.NewInt(0)
	}
	if amount.Cmp(netAvailable) > 0 {
		return ErrReservationExceedsAvailable
	}
	return nil
}

// AssertChildEnvelopeWithinParent asserts INV-74: Child liquidity envelopes cannot exceed parent authority.
func AssertChildEnvelopeWithinParent(childAmount *big.Int, parentRemaining *big.Int) error {
	if childAmount == nil || childAmount.Sign() <= 0 {
		return ErrInvalidAmount
	}
	if parentRemaining == nil || childAmount.Cmp(parentRemaining) > 0 {
		return ErrChildEnvelopeExceedsParent
	}
	return nil
}

// AssertRecurringReservationBounded asserts INV-75: Recurring obligations cannot reserve infinite funds.
func AssertRecurringReservationBounded(occurrences int, maxAllowedOccurrences int) error {
	if occurrences <= 0 || occurrences > maxAllowedOccurrences {
		return ErrRecurringInfiniteReservation
	}
	return nil
}

// AssertModeIsolation asserts INV-76: Simulation liquidity cannot affect real treasury.
func AssertModeIsolation(opMode ExecutionMode, targetTreasuryMode ExecutionMode) error {
	if opMode == ModeSimulation && targetTreasuryMode == ModeReal {
		return ErrSimulationAffectsReal
	}
	return nil
}

// AssertReconciliationIntegrity asserts INV-81: Reconciliation mismatch cannot silently become MATCHED.
func AssertReconciliationIntegrity(discrepancy *big.Int, reportedStatus ReconciliationStatus) error {
	if discrepancy != nil && discrepancy.Sign() != 0 && reportedStatus == ReconMatched {
		return ErrSilentMismatchSuppression
	}
	return nil
}

// AssertNoFundCreation asserts INV-84: No liquidity calculation can create funds.
func AssertNoFundCreation(total *big.Int, available *big.Int, reserved *big.Int, pending *big.Int, disputed *big.Int) error {
	if total == nil || available == nil || reserved == nil || pending == nil || disputed == nil {
		return ErrFundCreationAttempt
	}
	sum := new(big.Int).Add(available, reserved)
	sum.Add(sum, pending)
	sum.Add(sum, disputed)

	if sum.Cmp(total) > 0 {
		return ErrFundCreationAttempt
	}
	return nil
}

// AssertRefundWithinBounds asserts INV-83: A refund cannot increase treasury beyond the actual verified refund.
func AssertRefundWithinBounds(refundAmount *big.Int, originalAmount *big.Int) error {
	if refundAmount == nil || refundAmount.Sign() <= 0 {
		return ErrInvalidAmount
	}
	if originalAmount == nil || refundAmount.Cmp(originalAmount) > 0 {
		return ErrRefundExceedsActual
	}
	return nil
}

// ParseBigInt parses an integer base units string securely.
func ParseBigInt(s string) (*big.Int, error) {
	clean := strings.TrimSpace(s)
	if clean == "" {
		return big.NewInt(0), nil
	}
	val, ok := new(big.Int).SetString(clean, 10)
	if !ok {
		return nil, ErrInvalidAmount
	}
	return val, nil
}
