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
	DecisionAllow            Decision = "ALLOW"
	DecisionDeny             Decision = "DENY"
	DecisionApprovalRequired Decision = "APPROVAL_REQUIRED"
)

// ReasonCode represents deterministic policy evaluation reason codes.
type ReasonCode string

const (
	ReasonApproved               ReasonCode = "APPROVED"
	ReasonApprovalRequired       ReasonCode = "APPROVAL_REQUIRED"
	ReasonAboveApprovalThreshold ReasonCode = "ABOVE_APPROVAL_THRESHOLD"
	ReasonPolicyDisabled         ReasonCode = "POLICY_DISABLED"
	ReasonAgentPaused            ReasonCode = "AGENT_PAUSED"
	ReasonOrganizationPaused     ReasonCode = "ORGANIZATION_PAUSED"
	ReasonGlobalPaused           ReasonCode = "GLOBAL_PAUSED"
	ReasonInvalidAmount          ReasonCode = "INVALID_AMOUNT"
	ReasonAmountExceedsLimit     ReasonCode = "AMOUNT_EXCEEDS_TRANSACTION_LIMIT"
	ReasonDailyLimitExceeded     ReasonCode = "DAILY_LIMIT_EXCEEDED"
	ReasonRecipientNotAllowed    ReasonCode = "RECIPIENT_NOT_ALLOWED"
	ReasonRecipientBlocked       ReasonCode = "RECIPIENT_BLOCKED"
	ReasonServiceNotAllowed      ReasonCode = "SERVICE_NOT_ALLOWED"
	ReasonAssetNotAllowed        ReasonCode = "ASSET_NOT_ALLOWED"
	ReasonDailyTxLimitExceeded   ReasonCode = "DAILY_TRANSACTION_LIMIT_EXCEEDED"
	ReasonHourlyVelocityExceeded ReasonCode = "HOURLY_VELOCITY_EXCEEDED"
	ReasonRiskLow                ReasonCode = "RISK_LOW"
	ReasonRiskMedium             ReasonCode = "RISK_MEDIUM"
	ReasonRiskHigh               ReasonCode = "RISK_HIGH"
	ReasonServiceBlocked         ReasonCode = "SERVICE_BLOCKED"
	ReasonAssetBlocked           ReasonCode = "ASSET_BLOCKED"
	ReasonBudgetUtilizationHigh  ReasonCode = "BUDGET_UTILIZATION_HIGH"
	ReasonDuplicateRequest       ReasonCode = "DUPLICATE_REQUEST"
	ReasonTreasuryLimitExceeded  ReasonCode = "TREASURY_LIMIT_EXCEEDED"
	ReasonInvalidRequest         ReasonCode = "INVALID_REQUEST"
)

// RiskLevel represents deterministic risk classification levels.
type RiskLevel string

const (
	RiskLevelLow    RiskLevel = "LOW"
	RiskLevelMedium RiskLevel = "MEDIUM"
	RiskLevelHigh   RiskLevel = "HIGH"
)

// RuleCheck represents a single deterministic check result for explainability.
type RuleCheck struct {
	Rule    string `json:"rule"`
	Passed  bool   `json:"passed"`
	Message string `json:"message"`
}

// RiskContext represents deterministic historical signals for risk scoring.
type RiskContext struct {
	RecipientPriorTxCount uint32 `json:"recipient_prior_tx_count"`
	ServicePriorTxCount   uint32 `json:"service_prior_tx_count"`
	RecentFailuresCount   uint32 `json:"recent_failures_count"`
	Recent15mTxCount      uint32 `json:"recent_15m_tx_count"`
}

// PaymentRequest represents an incoming payment authorization request.
// Note: Amount MUST remain a string to prevent floating-point precision loss.
type PaymentRequest struct {
	RequestID      string       `json:"request_id"`
	AgentID        string       `json:"agent_id"`
	OrganizationID string       `json:"organization_id,omitempty"`
	ServiceID      string       `json:"service_id,omitempty"`
	Recipient      string       `json:"recipient"`
	Amount         string       `json:"amount"`
	Asset          string       `json:"asset"`
	Purpose        string       `json:"purpose"`
	Timestamp      *int64       `json:"timestamp,omitempty"`
	RiskContext    *RiskContext `json:"risk_context,omitempty"`
}

// AuthorizationDecision represents the deterministic policy outcome.
type AuthorizationDecision struct {
	RequestID           string      `json:"request_id"`
	Decision            Decision    `json:"decision"`
	ReasonCode          ReasonCode  `json:"reason_code"`
	Reason              string      `json:"reason"`
	PolicyID            string      `json:"policy_id,omitempty"`
	PolicyVersion       string      `json:"policy_version,omitempty"`
	EvaluatedAt         *int64      `json:"evaluated_at,omitempty"`
	RiskLevel           *RiskLevel  `json:"risk_level,omitempty"`
	RiskScore           *uint32     `json:"risk_score,omitempty"`
	Checks              []RuleCheck `json:"checks,omitempty"`
	RemainingDailyLimit *uint64     `json:"remaining_daily_limit,omitempty"`
	Simulation          bool        `json:"simulation,omitempty"`
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
