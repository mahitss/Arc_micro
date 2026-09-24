package clearinghouse

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrInvalidStateTransition = errors.New("invalid state transition")
	ErrTerminalState          = errors.New("cannot transition from terminal state")
	ErrConditionNotMet        = errors.New("prerequisite condition not satisfied for state transition")
)

// StateMachine enforces valid transitions and auditability across all clearinghouse entities.
type StateMachine struct{}

func NewStateMachine() *StateMachine {
	return &StateMachine{}
}

// -----------------------------------------------------------------------------
// 1. Economic Obligation Lifecycle
//
// Valid transitions:
//   PROPOSED -> AUTHORIZED
//   AUTHORIZED -> RESERVED
//   RESERVED -> DUE
//   DUE -> SUBMITTED (or DISPUTED)
//   SUBMITTED -> VERIFIED (or DISPUTED)
//   VERIFIED -> SETTLEMENT_PENDING
//   SETTLEMENT_PENDING -> SETTLED (or PARTIALLY_SETTLED)
//   SETTLED -> REFUNDED
//   AUTHORIZED -> CANCELLED
//   PROPOSED -> EXPIRED / CANCELLED
//
// Strictly prohibited:
//   SETTLED -> AUTHORIZED
//   REFUNDED -> SETTLED
//   Terminal -> Any
// -----------------------------------------------------------------------------

func (sm *StateMachine) ValidateObligationTransition(from, to ObligationStatus) error {
	// Terminal states cannot transition to anything, including themselves
	if from == ObligationCancelled || from == ObligationExpired || from == ObligationRefunded {
		return fmt.Errorf("%w: cannot transition from terminal state %s to %s", ErrTerminalState, from, to)
	}

	if from == to {
		return nil
	}

	// Strictly prohibited transitions (Financial Invariant)
	if from == ObligationSettled && to == ObligationAuthorized {
		return fmt.Errorf("%w: cannot transition from SETTLED to AUTHORIZED (prohibited invariant)", ErrInvalidStateTransition)
	}
	if from == ObligationRefunded && to == ObligationSettled {
		return fmt.Errorf("%w: cannot transition from REFUNDED to SETTLED without new financial event", ErrInvalidStateTransition)
	}

	switch from {
	case ObligationCreated:
		if to == ObligationValidating || to == ObligationProposed || to == ObligationCancelled || to == ObligationExpired {
			return nil
		}
	case ObligationValidating:
		if to == ObligationConfirmed || to == ObligationAuthorized || to == ObligationCancelled || to == ObligationFailed {
			return nil
		}
	case ObligationConfirmed:
		if to == ObligationReserved || to == ObligationDue || to == ObligationCancelled || to == ObligationDisputed {
			return nil
		}
	case ObligationProposed:
		if to == ObligationAuthorized || to == ObligationValidating || to == ObligationConfirmed || to == ObligationCancelled || to == ObligationExpired {
			return nil
		}
	case ObligationAuthorized:
		if to == ObligationReserved || to == ObligationDue || to == ObligationCancelled || to == ObligationExpired {
			return nil
		}
	case ObligationReserved:
		if to == ObligationDue || to == ObligationCancelled || to == ObligationDisputed {
			return nil
		}
	case ObligationDue:
		if to == ObligationSubmitted || to == ObligationDisputed || to == ObligationCancelled || to == ObligationSettlementPending {
			return nil
		}
	case ObligationSubmitted:
		if to == ObligationVerified || to == ObligationDisputed || to == ObligationCancelled {
			return nil
		}
	case ObligationVerified:
		if to == ObligationSettlementPending || to == ObligationDisputed {
			return nil
		}
	case ObligationSettlementPending:
		if to == ObligationSettled || to == ObligationPartiallySettled || to == ObligationSettlementSubmitted || to == ObligationDisputed || to == ObligationFailed || to == ObligationReconciling {
			return nil
		}
	case ObligationSettlementSubmitted:
		if to == ObligationSettled || to == ObligationPartiallySettled || to == ObligationFailed || to == ObligationReconciling || to == ObligationDisputed {
			return nil
		}
	case ObligationPartiallySettled:
		if to == ObligationSettled || to == ObligationSettlementPending || to == ObligationSettlementSubmitted || to == ObligationDisputed || to == ObligationRefunded || to == ObligationReconciling {
			return nil
		}
	case ObligationReconciling:
		if to == ObligationSettled || to == ObligationPartiallySettled || to == ObligationFailed || to == ObligationDisputed {
			return nil
		}
	case ObligationFailed:
		if to == ObligationReconciling || to == ObligationSettlementPending || to == ObligationCancelled {
			return nil
		}
	case ObligationDisputed:
		// After dispute resolution, can re-verify, settle, or cancel
		if to == ObligationVerified || to == ObligationSettlementPending || to == ObligationCancelled || to == ObligationRefunded {
			return nil
		}
	case ObligationSettled:
		if to == ObligationRefunded {
			return nil
		}
		return fmt.Errorf("%w: SETTLED is a terminal settlement state, can only be REFUNDED via new operation", ErrTerminalState)
	case ObligationCancelled, ObligationExpired, ObligationRefunded:
		return fmt.Errorf("%w: cannot transition from terminal state %s to %s", ErrTerminalState, from, to)
	}

	return fmt.Errorf("%w: from %s to %s", ErrInvalidStateTransition, from, to)
}

// -----------------------------------------------------------------------------
// 2. Economic Escrow Lifecycle
//
// Valid transitions:
//   CREATED -> RESERVED
//   RESERVED -> PARTIALLY_RELEASED
//   PARTIALLY_RELEASED -> RELEASED / PARTIALLY_RELEASED
//   RESERVED -> RELEASED
//   RESERVED -> DISPUTED
//   DISPUTED -> RELEASED / REFUNDED / RESERVED
//   RESERVED -> REFUNDED / CANCELLED
// -----------------------------------------------------------------------------

func (sm *StateMachine) ValidateEscrowTransition(from, to EscrowStatus) error {
	if from == to {
		return nil
	}

	switch from {
	case EscrowCreated:
		if to == EscrowReserved || to == EscrowCancelled {
			return nil
		}
	case EscrowReserved:
		if to == EscrowPartiallyReleased || to == EscrowReleased || to == EscrowDisputed || to == EscrowRefunded || to == EscrowCancelled {
			return nil
		}
	case EscrowPartiallyReleased:
		if to == EscrowPartiallyReleased || to == EscrowReleased || to == EscrowDisputed || to == EscrowRefunded {
			return nil
		}
	case EscrowDisputed:
		if to == EscrowReleased || to == EscrowPartiallyReleased || to == EscrowRefunded || to == EscrowReserved {
			return nil
		}
	case EscrowReleased, EscrowRefunded, EscrowCancelled:
		return fmt.Errorf("%w: escrow is in terminal state %s", ErrTerminalState, from)
	}

	return fmt.Errorf("%w: escrow cannot transition from %s to %s", ErrInvalidStateTransition, from, to)
}

// -----------------------------------------------------------------------------
// 3. Payment Milestone Lifecycle
//
// Valid transitions:
//   PENDING -> SUBMITTED
//   SUBMITTED -> VERIFIED
//   SUBMITTED -> REJECTED
//   REJECTED -> SUBMITTED
//   VERIFIED -> SETTLED
//   SUBMITTED / VERIFIED -> DISPUTED
//   DISPUTED -> VERIFIED / REJECTED / SETTLED
// -----------------------------------------------------------------------------

func (sm *StateMachine) ValidateMilestoneTransition(from, to MilestoneStatus) error {
	if from == to {
		return nil
	}

	switch from {
	case MilestonePending:
		if to == MilestoneSubmitted {
			return nil
		}
	case MilestoneSubmitted:
		if to == MilestoneVerified || to == MilestoneRejected || to == MilestoneDisputed {
			return nil
		}
	case MilestoneRejected:
		// Provider can re-submit corrected deliverable
		if to == MilestoneSubmitted || to == MilestoneDisputed {
			return nil
		}
	case MilestoneVerified:
		if to == MilestoneSettled || to == MilestoneDisputed {
			return nil
		}
	case MilestoneDisputed:
		if to == MilestoneVerified || to == MilestoneRejected || to == MilestoneSettled {
			return nil
		}
	case MilestoneSettled:
		return fmt.Errorf("%w: milestone already settled", ErrTerminalState)
	}

	return fmt.Errorf("%w: milestone from %s to %s", ErrInvalidStateTransition, from, to)
}

// -----------------------------------------------------------------------------
// 4. Economic Invoice Lifecycle
//
// Valid transitions:
//   DRAFT -> ISSUED
//   ISSUED -> ACCEPTED
//   ISSUED -> REJECTED
//   ISSUED -> DISPUTED
//   ACCEPTED -> DUE
//   DUE -> SETTLED
//   DUE -> PARTIALLY_SETTLED
//   PARTIALLY_SETTLED -> SETTLED
//   DRAFT / ISSUED -> VOID
// -----------------------------------------------------------------------------

func (sm *StateMachine) ValidateInvoiceTransition(from, to InvoiceStatus) error {
	if from == to {
		return nil
	}

	switch from {
	case InvoiceDraft:
		if to == InvoiceIssued || to == InvoiceVoid {
			return nil
		}
	case InvoiceIssued:
		if to == InvoiceAccepted || to == InvoiceRejected || to == InvoiceDisputed || to == InvoiceVoid {
			return nil
		}
	case InvoiceAccepted:
		if to == InvoiceDue || to == InvoiceDisputed {
			return nil
		}
	case InvoiceDue:
		if to == InvoiceSettled || to == InvoicePartiallySettled || to == InvoiceDisputed {
			return nil
		}
	case InvoicePartiallySettled:
		if to == InvoiceSettled || to == InvoiceDisputed {
			return nil
		}
	case InvoiceDisputed:
		if to == InvoiceAccepted || to == InvoiceRejected || to == InvoiceSettled || to == InvoiceVoid {
			return nil
		}
	case InvoiceRejected, InvoiceSettled, InvoiceVoid:
		return fmt.Errorf("%w: invoice in terminal state %s", ErrTerminalState, from)
	}

	return fmt.Errorf("%w: invoice from %s to %s", ErrInvalidStateTransition, from, to)
}

// -----------------------------------------------------------------------------
// 5. Netting Proposal Lifecycle
//
// Valid transitions:
//   PROPOSED -> ELIGIBLE
//   ELIGIBLE -> APPROVED
//   APPROVED -> EXECUTED
//   PROPOSED / ELIGIBLE -> REJECTED
//   PROPOSED / ELIGIBLE -> EXPIRED
// -----------------------------------------------------------------------------

func (sm *StateMachine) ValidateNettingTransition(from, to NettingStatus) error {
	if from == to {
		return nil
	}

	switch from {
	case NettingProposed:
		if to == NettingEligible || to == NettingRejected || to == NettingExpired {
			return nil
		}
	case NettingEligible:
		if to == NettingApproved || to == NettingRejected || to == NettingExpired {
			return nil
		}
	case NettingApproved:
		if to == NettingExecuted || to == NettingRejected {
			return nil
		}
	case NettingExecuted, NettingRejected, NettingExpired:
		return fmt.Errorf("%w: netting proposal in terminal state %s", ErrTerminalState, from)
	}

	return fmt.Errorf("%w: netting from %s to %s", ErrInvalidStateTransition, from, to)
}

// -----------------------------------------------------------------------------
// 6. Settlement Batch Lifecycle
//
// Valid transitions:
//   OPEN -> READY
//   READY -> AUTHORIZED
//   AUTHORIZED -> EXECUTING
//   EXECUTING -> SETTLED
//   EXECUTING -> PARTIALLY_SETTLED
//   EXECUTING -> FAILED
//   EXECUTING -> RECONCILING
//   RECONCILING -> SETTLED / FAILED
// -----------------------------------------------------------------------------

func (sm *StateMachine) ValidateBatchTransition(from, to BatchStatus) error {
	if from == to {
		return nil
	}

	switch from {
	case BatchOpen:
		if to == BatchBuilding || to == BatchReady || to == BatchAwaitingApproval || to == BatchFailed || to == BatchCancelled {
			return nil
		}
	case BatchBuilding:
		if to == BatchReady || to == BatchAwaitingApproval || to == BatchCancelled || to == BatchFailed {
			return nil
		}
	case BatchReady:
		if to == BatchAwaitingApproval || to == BatchApproved || to == BatchAuthorized || to == BatchFailed || to == BatchOpen || to == BatchCancelled {
			return nil
		}
	case BatchAwaitingApproval:
		if to == BatchApproved || to == BatchAuthorized || to == BatchFailed || to == BatchCancelled {
			return nil
		}
	case BatchApproved:
		if to == BatchSubmitting || to == BatchExecuting || to == BatchAuthorized || to == BatchFailed || to == BatchCancelled {
			return nil
		}
	case BatchAuthorized:
		if to == BatchSubmitting || to == BatchExecuting || to == BatchFailed || to == BatchCancelled {
			return nil
		}
	case BatchSubmitting:
		if to == BatchExecuting || to == BatchSettled || to == BatchPartiallySettled || to == BatchFailed || to == BatchReconciling {
			return nil
		}
	case BatchExecuting:
		if to == BatchSettled || to == BatchPartiallySettled || to == BatchFailed || to == BatchReconciling {
			return nil
		}
	case BatchPartiallySettled:
		if to == BatchSettled || to == BatchFailed || to == BatchReconciling {
			return nil
		}
	case BatchReconciling:
		if to == BatchSettled || to == BatchPartiallySettled || to == BatchFailed {
			return nil
		}
	case BatchSettled, BatchFailed, BatchCancelled:
		return fmt.Errorf("%w: settlement batch in terminal state %s", ErrTerminalState, from)
	}

	return fmt.Errorf("%w: settlement batch from %s to %s", ErrInvalidStateTransition, from, to)
}

// -----------------------------------------------------------------------------
// 7. Refund Request Lifecycle
//
// Valid transitions:
//   REQUESTED -> VALIDATING
//   VALIDATING -> APPROVED
//   VALIDATING -> REJECTED
//   APPROVED -> EXECUTING
//   EXECUTING -> SETTLED
// -----------------------------------------------------------------------------

func (sm *StateMachine) ValidateRefundTransition(from, to RefundStatus) error {
	if from == to {
		return nil
	}

	switch from {
	case RefundRequested:
		if to == RefundValidating || to == RefundRejected {
			return nil
		}
	case RefundValidating:
		if to == RefundApproved || to == RefundRejected {
			return nil
		}
	case RefundApproved:
		if to == RefundExecuting || to == RefundRejected {
			return nil
		}
	case RefundExecuting:
		if to == RefundSettled || to == RefundRejected {
			return nil
		}
	case RefundSettled, RefundRejected:
		return fmt.Errorf("%w: refund in terminal state %s", ErrTerminalState, from)
	}

	return fmt.Errorf("%w: refund from %s to %s", ErrInvalidStateTransition, from, to)
}

// TransitionRecord creates an auditable record of an entity state change.
type TransitionRecord struct {
	EntityID     string    `json:"entity_id"`
	EntityType   string    `json:"entity_type"`
	FromState    string    `json:"from_state"`
	ToState      string    `json:"to_state"`
	TriggeredBy  string    `json:"triggered_by"`
	Reason       string    `json:"reason,omitempty"`
	Timestamp    time.Time `json:"timestamp"`
}
