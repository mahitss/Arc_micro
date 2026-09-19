package domain

import (
	"errors"
	"fmt"
	"math/big"
	"strings"
)

// Decision represents the authorization outcome.
type Decision string

const (
	DecisionAllow Decision = "ALLOW"
	DecisionDeny  Decision = "DENY"
)

// ReasonCode represents deterministic policy evaluation reason codes.
type ReasonCode string

const (
	ReasonApproved             ReasonCode = "APPROVED"
	ReasonPolicyDisabled       ReasonCode = "POLICY_DISABLED"
	ReasonInvalidAmount        ReasonCode = "INVALID_AMOUNT"
	ReasonAmountExceedsLimit   ReasonCode = "AMOUNT_EXCEEDS_TRANSACTION_LIMIT"
	ReasonDailyLimitExceeded   ReasonCode = "DAILY_LIMIT_EXCEEDED"
	ReasonRecipientNotAllowed  ReasonCode = "RECIPIENT_NOT_ALLOWED"
	ReasonRecipientBlocked     ReasonCode = "RECIPIENT_BLOCKED"
	ReasonAssetNotAllowed      ReasonCode = "ASSET_NOT_ALLOWED"
	ReasonDailyTxLimitExceeded ReasonCode = "DAILY_TRANSACTION_LIMIT_EXCEEDED"
	ReasonInvalidRequest       ReasonCode = "INVALID_REQUEST"
)

// PaymentRequest represents an incoming payment authorization request.
// Note: Amount MUST remain a string to prevent floating-point precision loss.
type PaymentRequest struct {
	RequestID string `json:"request_id"`
	AgentID   string `json:"agent_id"`
	Recipient string `json:"recipient"`
	Amount    string `json:"amount"`
	Asset     string `json:"asset"`
	Purpose   string `json:"purpose"`
}

// AuthorizationDecision represents the deterministic policy outcome.
type AuthorizationDecision struct {
	RequestID  string     `json:"request_id"`
	Decision   Decision   `json:"decision"`
	ReasonCode ReasonCode `json:"reason_code"`
	Reason     string     `json:"reason"`
}

// ErrorDetail contains error code and human-readable explanation.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ErrorResponse represents a normalized error response.
type ErrorResponse struct {
	Error     ErrorDetail `json:"error"`
	RequestID string      `json:"request_id,omitempty"`
}

// Validate checks basic request structure and required fields.
// Go only checks basic shape and syntax; Rust remains authoritative for policy rules.
func (r *PaymentRequest) Validate() error {
	if strings.TrimSpace(r.AgentID) == "" {
		return errors.New("missing required field: agent_id")
	}
	if strings.TrimSpace(r.Recipient) == "" {
		return errors.New("missing required field: recipient")
	}
	if !strings.HasPrefix(r.Recipient, "0x") || len(r.Recipient) != 42 {
		return fmt.Errorf("invalid recipient address format: expected 42-character hex string starting with 0x")
	}
	if strings.TrimSpace(r.Amount) == "" {
		return errors.New("missing required field: amount")
	}
	amt, ok := new(big.Int).SetString(r.Amount, 10)
	if !ok || amt.Sign() <= 0 {
		return errors.New("invalid amount: must be a positive integer base unit string")
	}
	if strings.TrimSpace(r.Asset) == "" {
		return errors.New("missing required field: asset")
	}
	if strings.TrimSpace(r.Purpose) == "" {
		return errors.New("missing required field: purpose")
	}
	return nil
}
