package domain

import (
	"time"
)

// ExecutionMode represents the environment in which a payment was executed.
type ExecutionMode string

const (
	ExecutionModeLive       ExecutionMode = "LIVE"
	ExecutionModeSimulation ExecutionMode = "SIMULATION"
)

// Canonical Trace Step Types
const (
	TraceStepPaymentRequested       = "PAYMENT_REQUESTED"
	TraceStepIdentityVerified       = "IDENTITY_VERIFIED"
	TraceStepServiceResolved        = "SERVICE_RESOLVED"
	TraceStepQuoteSelected          = "QUOTE_SELECTED"
	TraceStepPolicyEvaluated        = "POLICY_EVALUATED"
	TraceStepRiskEvaluated          = "RISK_EVALUATED"
	TraceStepApprovalRequired       = "APPROVAL_REQUIRED"
	TraceStepPaymentApproved        = "PAYMENT_APPROVED"
	TraceStepPaymentRejected        = "PAYMENT_REJECTED"
	TraceStepPaymentDenied          = "PAYMENT_DENIED"
	TraceStepTreasuryReserved       = "TREASURY_RESERVED"
	TraceStepTreasuryReleased       = "TREASURY_RELEASED"
	TraceStepExecutionStarted       = "EXECUTION_STARTED"
	TraceStepTransactionBuilt       = "TRANSACTION_BUILT"
	TraceStepTransactionSigned      = "TRANSACTION_SIGNED"
	TraceStepTransactionBroadcast  = "TRANSACTION_BROADCAST"
	TraceStepTransactionAmbiguous  = "TRANSACTION_AMBIGUOUS"
	TraceStepTransactionConfirmed  = "TRANSACTION_CONFIRMED"
	TraceStepTransactionFailed     = "TRANSACTION_FAILED"
	TraceStepPaymentCompleted       = "PAYMENT_COMPLETED"
)

// TraceStep represents a single discrete, verified action in the payment lifecycle.
type TraceStep struct {
	StepNumber    int                    `json:"step_number"` // Monotonic ordering sequence: 1, 2, 3...
	StepID        string                 `json:"step_id"`
	TraceID       string                 `json:"trace_id"`
	Type          string                 `json:"type"` // One of TraceStep* constants
	Status        string                 `json:"status"` // "COMPLETED", "FAILED", "PENDING", "SKIPPED"
	Timestamp     time.Time              `json:"timestamp"`
	Actor         string                 `json:"actor"` // "AGENT:{id}", "USER:{id}", "SYSTEM"
	CorrelationID string                 `json:"correlation_id"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
	ReasonCodes   []string               `json:"reason_codes,omitempty"`
}

// PaymentSummary captures basic immutable payment parameters.
type PaymentSummary struct {
	IntentID       string `json:"intent_id"`
	OrganizationID string `json:"organization_id"`
	AgentID        string `json:"agent_id"`
	ServiceID      string `json:"service_id"`
	Recipient      string `json:"recipient"`
	Amount         string `json:"amount"` // Base units integer string (micro-USDC)
	Asset          string `json:"asset"`  // Canonical asset (e.g. "USDC")
	Purpose        string `json:"purpose"`
	Justification  string `json:"justification,omitempty"`
	RequestID      string `json:"request_id,omitempty"`
}

// PolicyEvidence holds immutable proof of deterministic policy evaluation.
type PolicyEvidence struct {
	PolicyID            string      `json:"policy_id,omitempty"`
	PolicyVersion       string      `json:"policy_version,omitempty"`
	Decision            Decision    `json:"decision"`
	ReasonCode          ReasonCode  `json:"reason_code"`
	Reason              string      `json:"reason"`
	RiskLevel           *RiskLevel  `json:"risk_level,omitempty"`
	RiskScore           *uint32     `json:"risk_score,omitempty"`
	Checks              []RuleCheck `json:"checks,omitempty"`
	RemainingDailyLimit *uint64     `json:"remaining_daily_limit,omitempty"`
	EvaluatedAt         time.Time   `json:"evaluated_at"`
}

// ApprovalEvidence holds immutable human-in-the-loop audit proof.
type ApprovalEvidence struct {
	ApprovalID      string     `json:"approval_id"`
	Required        bool       `json:"required"`
	Status          string     `json:"status"` // "PENDING", "APPROVED", "REJECTED", "EXPIRED"
	RequestedAt     time.Time  `json:"requested_at"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty"`
	ApprovedBy      string     `json:"approved_by,omitempty"`
	RejectionReason string     `json:"rejection_reason,omitempty"`
}

// TreasuryEvidence holds off-chain balance reservation and settlement locks.
type TreasuryEvidence struct {
	ReservationID string     `json:"reservation_id,omitempty"`
	VaultAddress  string     `json:"vault_address"`
	Amount        string     `json:"amount"`
	Asset         string     `json:"asset"`
	Status        string     `json:"status"` // "RESERVED", "SETTLED", "RELEASED"
	ReservedAt    time.Time  `json:"reserved_at"`
	SettledAt     *time.Time `json:"settled_at,omitempty"`
	ReleasedAt    *time.Time `json:"released_at,omitempty"`
	ReleaseReason string     `json:"release_reason,omitempty"`
}

// BlockchainEvidence holds on-chain execution and settlement proof on Arc.
type BlockchainEvidence struct {
	ChainID         string     `json:"chain_id"` // "5042" for Arc mainnet
	Network         string     `json:"network"`  // "arc-mainnet" or "arc-testnet"
	TransactionHash string     `json:"transaction_hash,omitempty"`
	BlockNumber     string     `json:"block_number,omitempty"`
	From            string     `json:"from,omitempty"`
	To              string     `json:"to,omitempty"`
	SubmittedAt     *time.Time `json:"submitted_at,omitempty"`
	ConfirmedAt     *time.Time `json:"confirmed_at,omitempty"`
	Status          string     `json:"status"` // "CONFIRMED", "AMBIGUOUS", "FAILED", "EXECUTION_DISABLED"
	ExplorerURL     string     `json:"explorer_url,omitempty"`
	ErrorMessage    string     `json:"error_message,omitempty"`
}

// PaymentTrace is the complete, canonical financial flight recorder record for a payment intent.
type PaymentTrace struct {
	TraceID            string              `json:"trace_id"`
	OrganizationID     string              `json:"organization_id"`
	AgentID            string              `json:"agent_id"`
	PaymentIntentID    string              `json:"payment_intent_id"`
	PaymentExecutionID string              `json:"payment_execution_id,omitempty"`
	Status             string              `json:"status"` // Current lifecycle status
	ExecutionMode      ExecutionMode       `json:"execution_mode"` // "LIVE" or "SIMULATION"
	CreatedAt          time.Time           `json:"created_at"`
	UpdatedAt          time.Time           `json:"updated_at"`
	Steps              []TraceStep         `json:"steps"`
	PaymentSummary     PaymentSummary      `json:"payment_summary"`
	PolicyEvidence     *PolicyEvidence     `json:"policy_evidence,omitempty"`
	ApprovalEvidence   *ApprovalEvidence   `json:"approval_evidence,omitempty"`
	TreasuryEvidence   *TreasuryEvidence   `json:"treasury_evidence,omitempty"`
	BlockchainEvidence *BlockchainEvidence `json:"blockchain_evidence,omitempty"`
}
