package protocol

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// ProtocolVersion is the canonical version string.
const ProtocolVersion = "1.0"

// Message Type Categories
const (
	// Discovery
	MsgAgentAnnounce     = "AgentAnnounce"
	MsgCapabilityQuery   = "CapabilityQuery"
	MsgCapabilityResponse = "CapabilityResponse"

	// Economic
	MsgServiceRequest     = "ServiceRequest"
	MsgQuoteRequest       = "QuoteRequest"
	MsgQuoteResponse      = "QuoteResponse"
	MsgNegotiationRequest = "NegotiationRequest"
	MsgNegotiationResponse = "NegotiationResponse"

	// Contract
	MsgContractProposal = "ContractProposal"
	MsgContractAccepted = "ContractAccepted"
	MsgContractRejected = "ContractRejected"
	MsgContractExpired  = "ContractExpired"

	// Execution
	MsgTaskStarted   = "TaskStarted"
	MsgTaskProgress  = "TaskProgress"
	MsgTaskCompleted = "TaskCompleted"
	MsgTaskFailed    = "TaskFailed"
	MsgTaskCancelled = "TaskCancelled"

	// Result
	MsgResultSubmitted = "ResultSubmitted"
	MsgResultAccepted  = "ResultAccepted"
	MsgResultRejected  = "ResultRejected"
	MsgResultDisputed  = "ResultDisputed"

	// Financial
	MsgPaymentRequest   = "PaymentRequest"
	MsgPaymentAuthorized = "PaymentAuthorized"
	MsgPaymentDenied    = "PaymentDenied"
	MsgPaymentPending   = "PaymentPending"
	MsgPaymentSubmitted = "PaymentSubmitted"
	MsgPaymentConfirmed = "PaymentConfirmed"
	MsgPaymentFailed    = "PaymentFailed"

	// Control
	MsgPauseRequest     = "PauseRequest"
	MsgResumeRequest    = "ResumeRequest"
	MsgCancelRequest    = "CancelRequest"
	MsgReconcileRequest = "ReconcileRequest"
	MsgAgentHeartbeat   = "AgentHeartbeat"
)

// Trust Levels (Section 17)
type TrustLevel string

const (
	TrustUnverified TrustLevel = "UNVERIFIED"
	TrustIdentified TrustLevel = "IDENTIFIED"
	TrustVerified   TrustLevel = "VERIFIED"
	TrustTrusted    TrustLevel = "TRUSTED"
)

// Contract States (Section 11)
type ContractState string

const (
	ContractProposed         ContractState = "PROPOSED"
	ContractNegotiating      ContractState = "NEGOTIATING"
	ContractAccepted         ContractState = "ACCEPTED"
	ContractActive           ContractState = "ACTIVE"
	ContractMilestonePending ContractState = "MILESTONE_PENDING"
	ContractCompleted        ContractState = "COMPLETED"
	ContractDisputed         ContractState = "DISPUTED"
	ContractCancelled        ContractState = "CANCELLED"
	ContractExpired          ContractState = "EXPIRED"
	ContractRejected         ContractState = "REJECTED"
	ContractFailed           ContractState = "FAILED"
)

// Dispute States (Section 32)
type DisputeState string

const (
	DisputeOpen          DisputeState = "OPEN"
	DisputeInvestigating DisputeState = "INVESTIGATING"
	DisputeMediation     DisputeState = "MEDIATION"
	DisputeResolved      DisputeState = "RESOLVED"
	DisputeEscalated     DisputeState = "ESCALATED"
	DisputeClosed        DisputeState = "CLOSED"
)

// ProtocolMessage represents the canonical envelope for all protocol communications (Section 2).
type ProtocolMessage struct {
	ProtocolVersion string          `json:"protocol_version"` // Must be "1.0"
	MessageType     string          `json:"message_type"`
	MessageID       string          `json:"message_id"`
	Timestamp       time.Time       `json:"timestamp"`
	SenderID        string          `json:"sender_id"`
	RecipientID     string          `json:"recipient_id"`
	CorrelationID   string          `json:"correlation_id"`
	CausationID     string          `json:"causation_id,omitempty"`
	IdempotencyKey  string          `json:"idempotency_key,omitempty"`
	Nonce           string          `json:"nonce,omitempty"`
	Signature       string          `json:"signature,omitempty"`
	TenantID        string          `json:"tenant_id,omitempty"`
	Payload         json.RawMessage `json:"payload"`
}

// ComputePayloadHash computes the SHA-256 hash of the raw payload.
func (m *ProtocolMessage) ComputePayloadHash() string {
	h := sha256.Sum256(m.Payload)
	return hex.EncodeToString(h[:])
}

// CanonicalSigningString returns the string over which cryptographic signatures are verified.
func (m *ProtocolMessage) CanonicalSigningString() string {
	return fmt.Sprintf("%s.%s.%s.%d.%s.%s",
		m.MessageID,
		m.SenderID,
		m.RecipientID,
		m.Timestamp.Unix(),
		m.ComputePayloadHash(),
		m.ProtocolVersion,
	)
}

// AgentManifest represents a discoverable, machine-readable agent manifest (Section 4).
type AgentManifest struct {
	ProtocolVersion      string                 `json:"protocol_version"` // "1.0"
	AgentID              string                 `json:"agent_id"`
	OrganizationID       string                 `json:"organization_id"`
	DisplayName          string                 `json:"display_name"`
	Capabilities         []CapabilityDescriptor `json:"capabilities"`
	Endpoints            map[string]string      `json:"endpoints"` // task, health, status, webhook
	SupportedProtocols   []string               `json:"supported_protocols"` // ["agentpay.protocol.v1"]
	Pricing              []ManifestPricing      `json:"pricing"`
	Availability         string                 `json:"availability"` // AVAILABLE, BUSY, OFFLINE
	ServiceRegions       []string               `json:"service_regions,omitempty"`
	Authentication       map[string]string      `json:"authentication"` // type: "api_key" or "signature"
	ResultFormats        []string               `json:"result_formats"` // ["application/json", "sha256_sealed"]
	ReputationReference  *ReputationMetrics     `json:"reputation_reference,omitempty"`
	SecurityRequirements []string               `json:"security_requirements,omitempty"`
}

// ManifestPricing describes pricing per capability.
type ManifestPricing struct {
	Capability string `json:"capability"`
	Model      string `json:"model"` // FIXED, VARIABLE, QUOTE_REQUIRED
	BasePrice  string `json:"base_price"` // in USDC, e.g. "10.00"
	MaxPrice   string `json:"max_price,omitempty"`
	Currency   string `json:"currency"` // "USDC"
}

// CapabilityDescriptor represents a machine-readable capability (Section 5).
type CapabilityDescriptor struct {
	CapabilityID            string                 `json:"capability_id"`
	Name                    string                 `json:"name"`
	Version                 string                 `json:"version"`
	Description             string                 `json:"description"`
	InputSchema             map[string]interface{} `json:"input_schema,omitempty"`
	OutputSchema            map[string]interface{} `json:"output_schema,omitempty"`
	Constraints             map[string]interface{} `json:"constraints,omitempty"`
	EstimatedLatencyMs      int64                  `json:"estimated_latency_ms"`
	PricingModel            string                 `json:"pricing_model"`
	SupportedAssets         []string               `json:"supported_assets"` // ["USDC"]
	RequiredTrustLevel      TrustLevel             `json:"required_trust_level"`
	VerificationRequirement string                 `json:"verification_requirements"` // "SCHEMA", "CHECKSUM", "MULTI_AGENT"
}

// ServiceRequest represents a formal demand for an agent capability (Section 7).
type ServiceRequest struct {
	RequestID          string                 `json:"request_id"`
	RequesterID        string                 `json:"requester_id"`
	Capability         string                 `json:"capability"`
	InputData          map[string]interface{} `json:"input_data"`
	Constraints        map[string]interface{} `json:"constraints,omitempty"`
	Deadline           time.Time              `json:"deadline"`
	BudgetCap          string                 `json:"budget_cap"` // USDC
	QualityRequirements map[string]interface{} `json:"quality_requirements,omitempty"`
	RiskRequirements    map[string]interface{} `json:"risk_requirements,omitempty"`
	ResultRequirements  map[string]interface{} `json:"result_requirements,omitempty"`
}

// ProtocolQuote represents a binding time-bound quote offered by a provider (Section 8).
type ProtocolQuote struct {
	QuoteID                  string    `json:"quote_id"`
	ProviderID               string    `json:"provider_id"`
	RequestID                string    `json:"request_id"`
	Amount                   string    `json:"amount"` // in USDC
	Currency                 string    `json:"currency"`
	Expiration               time.Time `json:"expiration"`
	ExpectedDurationSeconds  int64     `json:"expected_duration_seconds"`
	Deliverables             []string  `json:"deliverables"`
	Assumptions              []string  `json:"assumptions,omitempty"`
	CancellationTerms        string    `json:"cancellation_terms,omitempty"`
	VerificationRequirements string    `json:"verification_requirements"`
	PolicySnapshotHash       string    `json:"policy_snapshot_hash"`
}

// NegotiationPayload represents negotiation round offers (Section 9).
type NegotiationPayload struct {
	NegotiationID   string                 `json:"negotiation_id"`
	ContractID      string                 `json:"contract_id,omitempty"`
	Round           int                    `json:"round"`
	SenderID        string                 `json:"sender_id"`
	ProposedPrice   string                 `json:"proposed_price"`
	ProposedDeadline *time.Time            `json:"proposed_deadline,omitempty"`
	Deliverables    []string               `json:"deliverables,omitempty"`
	Terms           map[string]string      `json:"terms,omitempty"`
	ExpiresAt       time.Time              `json:"expires_at"`
}

// ProtocolContract represents a formal agreement between agents (Section 10).
type ProtocolContract struct {
	ContractID         string                 `json:"contract_id"`
	TenantID           string                 `json:"tenant_id"`
	RequesterID        string                 `json:"requester_id"`
	ProviderID         string                 `json:"provider_id"`
	Capability         string                 `json:"capability"`
	Deliverables       []string               `json:"deliverables"`
	Milestones         []ContractMilestone    `json:"milestones"`
	TotalAmount        string                 `json:"total_amount"` // USDC
	Currency           string                 `json:"currency"`
	Deadline           time.Time              `json:"deadline"`
	VerificationPolicy string                 `json:"verification_policy"`
	DisputeTerms       string                 `json:"dispute_terms"`
	PolicySnapshotHash string                 `json:"policy_snapshot_hash"`
	State              ContractState          `json:"state"`
	CreatedAt          time.Time              `json:"created_at"`
	AcceptedAt         *time.Time             `json:"accepted_at,omitempty"`
	ExpiresAt          time.Time              `json:"expires_at"`
}

// ContractMilestone models intermediate progress checkpoints (Section 31).
type ContractMilestone struct {
	MilestoneID        string    `json:"milestone_id"`
	Title              string    `json:"title"`
	DeliverableSpec    string    `json:"deliverable_spec"`
	Amount             string    `json:"amount"` // USDC
	VerificationMethod string    `json:"verification_method"`
	DueAt              time.Time `json:"due_at"`
	Status             string    `json:"status"` // PENDING, SUBMITTED, VERIFIED, PAID
}

// ResultSubmittedPayload represents untrusted output submitted by an agent (Section 15).
type ResultSubmittedPayload struct {
	ResultID        string                 `json:"result_id"`
	ContractID      string                 `json:"contract_id"`
	TaskID          string                 `json:"task_id"`
	MilestoneID     string                 `json:"milestone_id,omitempty"`
	SchemaVersion   string                 `json:"schema_version"`
	ResultHash      string                 `json:"result_hash"` // SHA-256 sealed
	DeliverableData map[string]interface{} `json:"deliverable_data"`
	Evidence        map[string]interface{} `json:"evidence,omitempty"`
	QualityMetadata map[string]interface{} `json:"quality_metadata,omitempty"`
	SubmittedAt     time.Time              `json:"submitted_at"`
}

// PaymentRequestPayload models a demand for milestone disbursement (Section 13).
type PaymentRequestPayload struct {
	ContractID          string `json:"contract_id"`
	MilestoneID         string `json:"milestone_id"`
	Amount              string `json:"amount"` // USDC
	Currency            string `json:"currency"`
	RecipientServiceID  string `json:"recipient_service_id"`
	ResultReference     string `json:"result_reference"`
	EvidenceReference   string `json:"evidence_reference"`
	ProposedJustification string `json:"proposed_justification,omitempty"`
}

// PaymentDecision models structured feedback for payment authorization or denial (Section 14).
type PaymentDecision struct {
	Decision              string   `json:"decision"` // AUTHORIZED, DENIED, PENDING, REQUIRED_APPROVAL
	PaymentIntentID       string   `json:"payment_intent_id,omitempty"`
	ReasonCode            string   `json:"reason_code,omitempty"`
	PolicyReference       string   `json:"policy_reference,omitempty"`
	RiskReference         string   `json:"risk_reference,omitempty"`
	ApprovalState         string   `json:"approval_state,omitempty"`
	Retryable             bool     `json:"retryable"`
	RecommendedSafeAction string   `json:"recommended_safe_action,omitempty"`
	Details               []string `json:"details,omitempty"`
}

// AgentHeartbeat models long-running progress reports (Section 29).
type AgentHeartbeat struct {
	AgentID            string    `json:"agent_id"`
	ContractID         string    `json:"contract_id"`
	Timestamp          time.Time `json:"timestamp"`
	Status             string    `json:"status"` // RUNNING, WAITING, BLOCKED
	ProgressPercentage int       `json:"progress_percentage"` // 0-100
	ExpectedCompletion time.Time `json:"expected_completion"`
	DiagnosticMessage  string    `json:"diagnostic_message,omitempty"`
}

// ProtocolDispute models formal contestation of a result or milestone (Section 32).
type ProtocolDispute struct {
	DisputeID           string                 `json:"dispute_id"`
	ContractID          string                 `json:"contract_id"`
	TenantID            string                 `json:"tenant_id"`
	Initiator           string                 `json:"initiator"`
	Reason              string                 `json:"reason"`
	Evidence            map[string]interface{} `json:"evidence,omitempty"`
	RequestedResolution string                 `json:"requested_resolution"`
	State               DisputeState           `json:"state"`
	ResolutionNotes     string                 `json:"resolution_notes,omitempty"`
	CreatedAt           time.Time              `json:"created_at"`
	UpdatedAt           time.Time              `json:"updated_at"`
}

// ReputationMetrics models explainable, empirical track records (Section 34).
type ReputationMetrics struct {
	AgentID          string    `json:"agent_id"`
	SampleSize       uint64    `json:"sample_size"`
	CompletionRate   float64   `json:"completion_rate"`   // 0.0 - 1.0
	AverageLatencyMs int64     `json:"average_latency_ms"`
	ResultQualityAvg float64   `json:"result_quality_avg"` // 0.0 - 1.0
	DisputeRate      float64   `json:"dispute_rate"`      // 0.0 - 1.0
	QuoteAccuracy    float64   `json:"quote_accuracy"`    // 0.0 - 1.0
	ObservationDays  int       `json:"observation_days"`
	ConfidenceScore  float64   `json:"confidence_score"`  // 0.0 - 1.0
	LastEvaluatedAt  time.Time `json:"last_evaluated_at"`
}

// SimulationRequest models dry-run inquiries for external agents (Section 50).
type SimulationRequest struct {
	RequesterID  string `json:"requester_id"`
	Capability   string `json:"capability"`
	TargetAmount string `json:"target_amount"`
	Currency     string `json:"currency"`
}

// SimulationResponse models dry-run pre-flight findings without moving money.
type SimulationResponse struct {
	SimulatedMode        string   `json:"simulated_mode"` // "DRY_RUN_NO_MONEY_MOVED"
	PolicyDecision       string   `json:"policy_decision"` // ALLOW, DENY, APPROVAL_REQUIRED
	RiskScore            int      `json:"risk_score"`
	EstimatedCost        string   `json:"estimated_cost"`
	RequiresHumanApproval bool    `json:"requires_human_approval"`
	TreasurySolvent      bool     `json:"treasury_solvent"`
	ExecutionPath        []string `json:"execution_path"`
}

// PrecheckRequest models eligibility verification (Section 51).
type PrecheckRequest struct {
	RequesterID string `json:"requester_id"`
	ServiceID   string `json:"service_id"`
	Amount      string `json:"amount"`
}

// PrecheckResponse models eligibility status.
type PrecheckResponse struct {
	Status  string   `json:"status"` // ELIGIBLE, INELIGIBLE, REQUIRES_APPROVAL, REQUIRES_MORE_INFORMATION
	Reasons []string `json:"reasons,omitempty"`
}

// ProtocolTrafficEntry models telemetry for the Control Tower (Section 57).
type ProtocolTrafficEntry struct {
	TrafficID     string    `json:"traffic_id"`
	Timestamp     time.Time `json:"timestamp"`
	MessageType   string    `json:"message_type"`
	SenderID      string    `json:"sender_id"`
	RecipientID   string    `json:"recipient_id"`
	Status        string    `json:"status"` // PROCESSED, REJECTED, DENIED
	CorrelationID string    `json:"correlation_id"`
	LatencyMs     int64     `json:"latency_ms"`
	Error         string    `json:"error,omitempty"`
	TenantID      string    `json:"tenant_id"`
}

// ProtocolError standardized error structure (Section 42).
type ProtocolError struct {
	Code          string `json:"code"`
	Message       string `json:"message"`
	Retryable     bool   `json:"retryable"`
	CorrelationID string `json:"correlation_id,omitempty"`
}

func (e *ProtocolError) Error() string {
	return fmt.Sprintf("[%s] %s (retryable=%v)", e.Code, e.Message, e.Retryable)
}

// Standard Error Codes
const (
	ErrProtocolVersionUnsupported = "PROTOCOL_VERSION_UNSUPPORTED"
	ErrInvalidMessage             = "INVALID_MESSAGE"
	ErrInvalidSignature           = "INVALID_SIGNATURE"
	ErrMessageExpired             = "MESSAGE_EXPIRED"
	ErrReplayDetected             = "REPLAY_DETECTED"
	ErrUnauthorized               = "UNAUTHORIZED"
	ErrTenantAccessDenied         = "TENANT_ACCESS_DENIED"
	ErrCapabilityNotFound         = "CAPABILITY_NOT_FOUND"
	ErrQuoteExpired               = "QUOTE_EXPIRED"
	ErrContractExpired            = "CONTRACT_EXPIRED"
	ErrPolicyDenied               = "POLICY_DENIED"
	ErrRiskDenied                 = "RISK_DENIED"
	ErrApprovalRequired           = "APPROVAL_REQUIRED"
	ErrTreasuryBlocked            = "TREASURY_BLOCKED"
	ErrPaymentPending             = "PAYMENT_PENDING"
	ErrPaymentAmbiguous           = "PAYMENT_AMBIGUOUS"
	ErrResultInvalid              = "RESULT_INVALID"
	ErrDisputeOpen                = "DISPUTE_OPEN"
	ErrRateLimited                = "RATE_LIMITED"
	ErrOversizedPayload           = "OVERSIZED_PAYLOAD"
)

var (
	ErrMalformedEnvelope   = errors.New("malformed protocol envelope")
	ErrReplayBlocked       = errors.New("message replay blocked by nonce cache")
	ErrSignatureFailed     = errors.New("cryptographic signature verification failed")
	ErrPayloadTooLarge     = errors.New("message payload exceeds maximum size limit (10MB)")
	ErrContractTransition  = errors.New("illegal contract state transition")
)
