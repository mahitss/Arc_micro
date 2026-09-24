package protocol

import (
	"errors"
	"fmt"
	"math/big"
	"strings"
)

var (
	ErrUnsupportedVersion = errors.New("unsupported protocol version: must be 1.0")
	ErrMissingField       = errors.New("required protocol envelope field missing")
	ErrInvalidMessageType = errors.New("unknown or invalid protocol message type")
	ErrInvalidAmount      = errors.New("invalid financial amount: must be positive decimal representation")
)

// MessageValidator validates incoming protocol envelopes.
type MessageValidator struct{}

// NewMessageValidator creates a MessageValidator.
func NewMessageValidator() *MessageValidator {
	return &MessageValidator{}
}

// ValidateEnvelope performs deterministic schema validation on the outer envelope.
func (v *MessageValidator) ValidateEnvelope(msg *ProtocolMessage) error {
	if msg == nil {
		return ErrMalformedEnvelope
	}

	// 1. Version check (Section 2)
	if msg.ProtocolVersion != ProtocolVersion {
		return fmt.Errorf("%w: received '%s'", ErrUnsupportedVersion, msg.ProtocolVersion)
	}

	// 2. Required fields
	if strings.TrimSpace(msg.MessageID) == "" {
		return fmt.Errorf("%w: message_id", ErrMissingField)
	}
	if strings.TrimSpace(msg.MessageType) == "" {
		return fmt.Errorf("%w: message_type", ErrMissingField)
	}
	if strings.TrimSpace(msg.SenderID) == "" {
		return fmt.Errorf("%w: sender_id", ErrMissingField)
	}
	if strings.TrimSpace(msg.RecipientID) == "" {
		return fmt.Errorf("%w: recipient_id", ErrMissingField)
	}
	if strings.TrimSpace(msg.CorrelationID) == "" {
		return fmt.Errorf("%w: correlation_id", ErrMissingField)
	}
	if msg.Timestamp.IsZero() {
		return fmt.Errorf("%w: timestamp", ErrMissingField)
	}

	// 3. Payload size check (Section 44)
	if len(msg.Payload) > MaxMessagePayloadBytes {
		return fmt.Errorf("%w: payload size %d bytes exceeds 10MB limit", ErrPayloadTooLarge, len(msg.Payload))
	}

	// 4. Validate known message type
	if !v.isValidMessageType(msg.MessageType) {
		return fmt.Errorf("%w: '%s'", ErrInvalidMessageType, msg.MessageType)
	}

	return nil
}

func (v *MessageValidator) isValidMessageType(msgType string) bool {
	switch msgType {
	case MsgAgentAnnounce, MsgCapabilityQuery, MsgCapabilityResponse,
		MsgServiceRequest, MsgQuoteRequest, MsgQuoteResponse, MsgNegotiationRequest, MsgNegotiationResponse,
		MsgContractProposal, MsgContractAccepted, MsgContractRejected, MsgContractExpired,
		MsgTaskStarted, MsgTaskProgress, MsgTaskCompleted, MsgTaskFailed, MsgTaskCancelled,
		MsgResultSubmitted, MsgResultAccepted, MsgResultRejected, MsgResultDisputed,
		MsgPaymentRequest, MsgPaymentAuthorized, MsgPaymentDenied, MsgPaymentPending,
		MsgPaymentSubmitted, MsgPaymentConfirmed, MsgPaymentFailed,
		MsgPauseRequest, MsgResumeRequest, MsgCancelRequest, MsgReconcileRequest,
		MsgAgentHeartbeat:
		return true
	default:
		return false
	}
}

// ValidateServiceRequest validates a ServiceRequest payload.
func (v *MessageValidator) ValidateServiceRequest(req *ServiceRequest) error {
	if req.RequestID == "" || req.RequesterID == "" || req.Capability == "" {
		return fmt.Errorf("%w: request_id, requester_id, capability are mandatory", ErrMissingField)
	}
	if req.Deadline.IsZero() {
		return fmt.Errorf("%w: deadline must be a valid future timestamp", ErrMissingField)
	}
	if err := v.validateAmount(req.BudgetCap); err != nil {
		return err
	}
	return nil
}

// ValidatePaymentRequest validates a PaymentRequest payload.
func (v *MessageValidator) ValidatePaymentRequest(p *PaymentRequestPayload) error {
	if p.ContractID == "" || p.MilestoneID == "" || p.RecipientServiceID == "" {
		return fmt.Errorf("%w: contract_id, milestone_id, recipient_service_id are mandatory", ErrMissingField)
	}
	if err := v.validateAmount(p.Amount); err != nil {
		return err
	}
	if p.Currency != "USDC" {
		return fmt.Errorf("unsupported asset: %s (only USDC is supported)", p.Currency)
	}
	return nil
}

// ValidateContractStateTransition enforces valid contract lifecycle transitions (Section 11).
func (v *MessageValidator) ValidateContractStateTransition(current, next ContractState) error {
	valid := false
	switch current {
	case ContractProposed:
		valid = (next == ContractNegotiating || next == ContractAccepted || next == ContractRejected || next == ContractExpired)
	case ContractNegotiating:
		valid = (next == ContractAccepted || next == ContractRejected || next == ContractCancelled || next == ContractExpired)
	case ContractAccepted:
		valid = (next == ContractActive || next == ContractCancelled || next == ContractExpired)
	case ContractActive:
		valid = (next == ContractMilestonePending || next == ContractCompleted || next == ContractDisputed || next == ContractCancelled || next == ContractFailed)
	case ContractMilestonePending:
		valid = (next == ContractActive || next == ContractCompleted || next == ContractDisputed || next == ContractFailed)
	case ContractDisputed:
		valid = (next == ContractActive || next == ContractCompleted || next == ContractCancelled)
	case ContractCompleted, ContractCancelled, ContractExpired, ContractRejected:
		// Terminal states cannot transition (e.g. COMPLETED -> ACTIVE fails)
		valid = false
	default:
		valid = false
	}

	if !valid {
		return fmt.Errorf("%w: cannot transition from %s to %s", ErrContractTransition, current, next)
	}
	return nil
}

func (v *MessageValidator) validateAmount(amountStr string) error {
	if amountStr == "" {
		return fmt.Errorf("%w: amount cannot be empty", ErrInvalidAmount)
	}
	r := new(big.Rat)
	_, ok := r.SetString(amountStr)
	if !ok || r.Sign() <= 0 {
		return fmt.Errorf("%w: %s", ErrInvalidAmount, amountStr)
	}
	return nil
}
