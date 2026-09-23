package network

import (
	"errors"
	"fmt"
	"math/big"
	"regexp"
	"strings"
	"time"
)

// Canonical Protocol Version
const (
	ProtocolVersionV1 = "agentpay.network.v1"

	// Hard bounded limits
	MaxAgentDelegationDepth = 3
	MaxNegotiationRounds    = 3
	MaxDiscoveryResults     = 100
	MaxQuotesPerTask        = 20
	MaxGraphDepth           = 4
	MaxContractDuration     = 72 * time.Hour
)

// IdentityStatus represents the operational lifecycle of a network agent.
type IdentityStatus string

const (
	IdentityStatusActive    IdentityStatus = "ACTIVE"
	IdentityStatusSuspended IdentityStatus = "SUSPENDED"
	IdentityStatusRevoked   IdentityStatus = "REVOKED"
	IdentityStatusDegraded  IdentityStatus = "DEGRADED"
	IdentityStatusOffline   IdentityStatus = "OFFLINE"
)

// AgentNetworkIdentity defines the discoverable, machine-readable identity of an autonomous agent.
// INVARIANT: AgentNetworkIdentity NEVER contains private keys, signing secrets, or raw treasury credentials.
type AgentNetworkIdentity struct {
	AgentID                string                 `json:"agent_id"`
	OrganizationID         string                 `json:"organization_id"`
	DisplayName            string                 `json:"display_name"`
	Description            string                 `json:"description"`
	Version                string                 `json:"version"`
	ProtocolVersion        string                 `json:"protocol_version"` // "agentpay.network.v1"
	Capabilities           []string               `json:"capabilities"`
	SupportedTaskTypes     []string               `json:"supported_task_types"`
	SupportedInputSchemas  map[string]interface{} `json:"supported_input_schemas,omitempty"`
	SupportedOutputSchemas map[string]interface{} `json:"supported_output_schemas,omitempty"`
	PricingModels          []string               `json:"pricing_models"`     // FIXED, VARIABLE, QUOTE_REQUIRED
	Currencies             []string               `json:"currencies"`         // ["USDC"]
	SettlementMethods      []string               `json:"settlement_methods"` // ["ARC_USDC"]
	Availability           string                 `json:"availability"`       // ACTIVE, BUSY, OFFLINE
	GeographicScope        string                 `json:"geographic_scope,omitempty"`
	TrustMetadata          map[string]string      `json:"trust_metadata,omitempty"`
	ReputationSummary      *ReputationSummary     `json:"reputation_summary,omitempty"`
	EndpointMetadata       map[string]string      `json:"endpoint_metadata,omitempty"`
	CallbackCapabilities   []string               `json:"callback_capabilities,omitempty"`
	AuthenticationMetadata map[string]string      `json:"authentication_metadata,omitempty"`
	Status                 IdentityStatus         `json:"status"`
	CreatedAt              time.Time              `json:"created_at"`
	UpdatedAt              time.Time              `json:"updated_at"`
}

// ReputationSummary summarizes long-term historical performance.
type ReputationSummary struct {
	TotalJobs          uint64  `json:"total_jobs"`
	CompletedJobs      uint64  `json:"completed_jobs"`
	FailedJobs         uint64  `json:"failed_jobs"`
	DisputedJobs       uint64  `json:"disputed_jobs"`
	CompletionRateBps  int64   `json:"completion_rate_bps"`  // Basis points (0-10000)
	ReputationScoreBps int64   `json:"reputation_score_bps"` // Basis points (0-10000)
	AverageLatencyMs   int64   `json:"average_latency_ms"`
	TotalSettledUSDC   *big.Int `json:"total_settled_usdc"`
}

// ManifestPricing defines pricing declarations for a capability within an agent manifest.
type ManifestPricing struct {
	Capability string `json:"capability"`
	Model      string `json:"model"` // FIXED, VARIABLE, QUOTE_REQUIRED
	BasePrice  string `json:"base_price"` // micro-USDC base units
	MaxPrice   string `json:"max_price,omitempty"`
	Currency   string `json:"currency"` // "USDC"
}

// ManifestEndpoints contains verified service URLs for task dispatch and health checks.
type ManifestEndpoints struct {
	TaskURL   string `json:"task_url"`
	HealthURL string `json:"health_url,omitempty"`
	StatusURL string `json:"status_url,omitempty"`
}

// AgentManifest represents the canonical machine-readable manifest published by an agent.
type AgentManifest struct {
	ProtocolVersion string                 `json:"protocol_version"` // Must be "agentpay.network.v1"
	AgentID         string                 `json:"agent_id"`
	OrganizationID  string                 `json:"organization_id"`
	Name            string                 `json:"name"`
	Description     string                 `json:"description"`
	Version         string                 `json:"version"`
	Capabilities    []string               `json:"capabilities"`
	Pricing         []ManifestPricing      `json:"pricing"`
	Settlement      []string               `json:"settlement"` // ["ARC_USDC"]
	Endpoints       ManifestEndpoints      `json:"endpoints"`
	Schemas         map[string]interface{} `json:"schemas,omitempty"`
	TrustMetadata   map[string]string      `json:"trust_metadata,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
}

// StructuredCapability defines a versioned, machine-readable capability contract.
type StructuredCapability struct {
	CapabilityID            string                 `json:"capability_id"` // e.g. "security.audit@1.2"
	Name                    string                 `json:"name"`
	Version                 string                 `json:"version"`
	Category                string                 `json:"category"`
	InputSchema             map[string]interface{} `json:"input_schema,omitempty"`
	OutputSchema            map[string]interface{} `json:"output_schema,omitempty"`
	PricingModel            string                 `json:"pricing_model"`
	ExpectedLatencyMs       int64                  `json:"expected_latency_ms"`
	ResourceRequirements    map[string]string      `json:"resource_requirements,omitempty"`
	ReliabilityMetadata     map[string]string      `json:"reliability_metadata,omitempty"`
	VerificationRequirement string                 `json:"verification_requirement"` // SCHEMA, CHECKSUM, MULTI_AGENT
}

// TrustSignal represents an individual explainable signal in a deterministic trust evaluation.
type TrustSignal struct {
	Signal      string  `json:"signal"`
	Value       float64 `json:"value"`
	Weight      float64 `json:"weight"`
	Impact      int64   `json:"impact_bps"` // Impact in basis points
	Explanation string  `json:"explanation"`
}

// TrustEvaluation provides an explainable, deterministic trust score.
// INVARIANT: Computed purely via deterministic math — no LLM in trust boundary.
type TrustEvaluation struct {
	AgentID     string        `json:"agent_id"`
	TrustScore  int64         `json:"trust_score"` // 0 - 10000 basis points
	Confidence  float64       `json:"confidence"`  // 0.00 to 1.00
	Signals     []TrustSignal `json:"signals"`
	Warnings    []string      `json:"warnings,omitempty"`
	EvaluatedAt time.Time     `json:"evaluated_at"`
}

// AgentTrustProfile holds persistent trust signals for an agent.
type AgentTrustProfile struct {
	AgentID                 string    `json:"agent_id"`
	OrganizationID          string    `json:"organization_id"`
	SuccessfulJobs          uint64    `json:"successful_jobs"`
	FailedJobs              uint64    `json:"failed_jobs"`
	TimeoutCount            uint64    `json:"timeout_count"`
	DisputeCount            uint64    `json:"dispute_count"`
	VerificationSuccesses   uint64    `json:"verification_successes"`
	VerificationFailures    uint64    `json:"verification_failures"`
	HistoricalCostAccurate  uint64    `json:"historical_cost_accurate"`
	HistoricalCostDeviated  uint64    `json:"historical_cost_deviated"`
	AverageLatencyMs        int64     `json:"average_latency_ms"`
	PolicyViolationsCount   uint64    `json:"policy_violations_count"`
	SecurityIncidentsCount  uint64    `json:"security_incidents_count"`
	FirstSeenAt             time.Time `json:"first_seen_at"`
	LastActiveAt            time.Time `json:"last_active_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

// ContractState represents the finite state machine of an AgentServiceContract.
type ContractState string

const (
	ContractDiscovered      ContractState = "DISCOVERED"
	ContractNegotiating     ContractState = "NEGOTIATING"
	ContractProposed        ContractState = "PROPOSED"
	ContractAccepted        ContractState = "ACCEPTED"
	ContractFunded          ContractState = "FUNDED"
	ContractExecuting       ContractState = "EXECUTING"
	ContractResultSubmitted ContractState = "RESULT_SUBMITTED"
	ContractVerifying       ContractState = "VERIFYING"
	ContractCompleted       ContractState = "COMPLETED"
	ContractRejected        ContractState = "REJECTED"
	ContractCancelled       ContractState = "CANCELLED"
	ContractExpired         ContractState = "EXPIRED"
	ContractFailed          ContractState = "FAILED"
	ContractDisputed        ContractState = "DISPUTED"
)

// AgentServiceContract represents a binding economic contract between two agents.
// INVARIANT: The contract itself does NOT move money. Money movement requires PaymentIntent -> Policy -> Treasury.
type AgentServiceContract struct {
	ContractID         string                 `json:"contract_id"`
	OrganizationID     string                 `json:"organization_id"`
	RequesterAgentID   string                 `json:"requester_agent_id"`
	ProviderAgentID    string                 `json:"provider_agent_id"`
	Capability         string                 `json:"capability"`
	MissionID          string                 `json:"mission_id,omitempty"`
	RootMissionID      string                 `json:"root_mission_id,omitempty"`
	ParentContractID   string                 `json:"parent_contract_id,omitempty"`
	DelegationDepth    int                    `json:"delegation_depth"`
	InputSpec          map[string]interface{} `json:"input_spec"`
	OutputSpec         map[string]interface{} `json:"output_spec,omitempty"`
	Price              string                 `json:"price"` // micro-USDC
	Currency           string                 `json:"currency"` // "USDC"
	BudgetCeiling      string                 `json:"budget_ceiling"` // micro-USDC
	Deadline           time.Time              `json:"deadline"`
	Expiration         time.Time              `json:"expiration"`
	VerificationPolicy string                 `json:"verification_policy"` // SCHEMA_STRICT, CHECKSUM, MULTI_AGENT
	CancellationPolicy string                 `json:"cancellation_policy"`
	DisputePolicy      string                 `json:"dispute_policy"`
	PaymentTerms       string                 `json:"payment_terms"` // ON_VERIFIED_RESULT, MILESTONE
	PaymentIntentID    string                 `json:"payment_intent_id,omitempty"`
	QuoteID            string                 `json:"quote_id,omitempty"`
	State              ContractState          `json:"state"`
	Result             *AgentResultPayload    `json:"result,omitempty"`
	Error              string                 `json:"error,omitempty"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
	CompletedAt        *time.Time             `json:"completed_at,omitempty"`
}

// NegotiationMessageType represents structured negotiation actions.
type NegotiationMessageType string

const (
	MsgServiceRequest NegotiationMessageType = "SERVICE_REQUEST"
	MsgQuote          NegotiationMessageType = "QUOTE"
	MsgCounterQuote   NegotiationMessageType = "COUNTER_QUOTE"
	MsgAccept         NegotiationMessageType = "ACCEPT"
	MsgReject         NegotiationMessageType = "REJECT"
	MsgExpire         NegotiationMessageType = "EXPIRE"
	MsgCancel         NegotiationMessageType = "CANCEL"
)

// NegotiationMessage is a structured, tamper-proof proposal during negotiation.
type NegotiationMessage struct {
	ID              string                 `json:"id"`
	ContractID      string                 `json:"contract_id,omitempty"`
	Round           int                    `json:"round"`
	MessageType     NegotiationMessageType `json:"message_type"`
	SenderAgentID   string                 `json:"sender_agent_id"`
	ReceiverAgentID string                 `json:"receiver_agent_id"`
	ProposedPrice   string                 `json:"proposed_price"` // micro-USDC
	Terms           map[string]string      `json:"terms,omitempty"`
	ExpiresAt       time.Time              `json:"expires_at"`
	CreatedAt       time.Time              `json:"created_at"`
}

// NetworkQuote represents an immutable, time-bound price quote offered by a provider agent.
type NetworkQuote struct {
	QuoteID            string            `json:"quote_id"`
	ProviderAgentID    string            `json:"provider_agent_id"`
	Capability         string            `json:"capability"`
	Price              string            `json:"price"` // micro-USDC
	Currency           string            `json:"currency"` // "USDC"
	EstimatedLatencyMs int64             `json:"estimated_latency_ms"`
	ValidUntil         time.Time         `json:"valid_until"`
	Constraints        map[string]string `json:"constraints,omitempty"`
	Assumptions        string            `json:"assumptions,omitempty"`
	RefundTerms        string            `json:"refund_terms,omitempty"`
	VerificationTerms  string            `json:"verification_terms,omitempty"`
	RecipientBinding   string            `json:"recipient_binding"` // Server-resolved authoritative address
	CreatedAt          time.Time         `json:"created_at"`
}

// AgentResultPayload represents an untrusted output returned by an external provider agent.
type AgentResultPayload struct {
	ContractID       string                 `json:"contract_id"`
	ProviderAgentID  string                 `json:"provider_agent_id"`
	Output           map[string]interface{} `json:"output"`
	SchemaVersion    string                 `json:"schema_version"`
	ExecutionMetadata map[string]string     `json:"execution_metadata,omitempty"`
	ClaimedCost      string                 `json:"claimed_cost"` // micro-USDC
	ClaimedDurationMs int64                 `json:"claimed_duration_ms"`
	Evidence         string                 `json:"evidence,omitempty"`
	ChecksumSHA256   string                 `json:"checksum_sha256"`
	Timestamp        time.Time              `json:"timestamp"`
}

// VerificationReport details the outcome of AgentResultVerifier evaluation.
type VerificationReport struct {
	ContractID     string    `json:"contract_id"`
	Passed         bool      `json:"passed"`
	SchemaValid    bool      `json:"schema_valid"`
	ChecksumValid  bool      `json:"checksum_valid"`
	DeadlineMet    bool      `json:"deadline_met"`
	CostCompliant  bool      `json:"cost_compliant"`
	ScoreBasisPoints int64   `json:"score_basis_points"` // 0-10000
	Reason         string    `json:"reason"`
	VerifiedAt     time.Time `json:"verified_at"`
}

// DisputeState represents the lifecycle of a contract dispute.
type DisputeState string

const (
	DisputeStateOpen              DisputeState = "OPEN"
	DisputeStateUnderReview       DisputeState = "UNDER_REVIEW"
	DisputeStateResolvedProvider  DisputeState = "RESOLVED_PROVIDER"
	DisputeStateResolvedRequester DisputeState = "RESOLVED_REQUESTER"
	DisputeStatePartialSettlement DisputeState = "PARTIAL_SETTLEMENT"
	DisputeStateRefundRequired    DisputeState = "REFUND_REQUIRED"
	DisputeStateClosed            DisputeState = "CLOSED"
)

// DisputeRecord represents a formal dispute opened against a contract.
type DisputeRecord struct {
	DisputeID        string       `json:"dispute_id"`
	ContractID       string       `json:"contract_id"`
	OrganizationID   string       `json:"organization_id"`
	InitiatorAgentID string       `json:"initiator_agent_id"`
	RespondentAgentID string      `json:"respondent_agent_id"`
	Reason           string       `json:"reason"`
	Evidence         string       `json:"evidence,omitempty"`
	State            DisputeState `json:"state"`
	ResolutionNotes  string       `json:"resolution_notes,omitempty"`
	RefundAmount     string       `json:"refund_amount,omitempty"`
	CreatedAt        time.Time    `json:"created_at"`
	ResolvedAt       *time.Time   `json:"resolved_at,omitempty"`
}

// GraphNode represents an entity in the economic network graph.
type GraphNode struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"` // "AGENT", "ORGANIZATION", "CAPABILITY", "MISSION", "CONTRACT"
	Label    string                 `json:"label"`
	Status   string                 `json:"status,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// GraphEdge represents a directed relationship between entities in the network.
type GraphEdge struct {
	Source   string                 `json:"source"`
	Target   string                 `json:"target"`
	Type     string                 `json:"type"` // "HIRED", "DELEGATED_TO", "DEPENDS_ON", "COLLABORATED_WITH", "PAID", "VERIFIED", "REFERRED"
	Label    string                 `json:"label,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// NetworkGraph represents the complete graph of persisted economic interactions.
type NetworkGraph struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}

// ParseCapabilityVersion decomposes a capability identifier like "security.audit@1.2" into name and version.
func ParseCapabilityVersion(capStr string) (name, version string, err error) {
	capStr = strings.TrimSpace(capStr)
	if capStr == "" {
		return "", "", errors.New("empty capability identifier")
	}

	parts := strings.Split(capStr, "@")
	if len(parts) == 1 {
		return parts[0], "1.0", nil
	}
	if len(parts) == 2 {
		return parts[0], parts[1], nil
	}
	return "", "", fmt.Errorf("invalid capability format: %s", capStr)
}

// FormatCapabilityVersion formats capability name and version into standard string.
func FormatCapabilityVersion(name, version string) string {
	if version == "" {
		version = "1.0"
	}
	return fmt.Sprintf("%s@%s", strings.TrimSpace(name), strings.TrimSpace(version))
}

var validCapRegex = regexp.MustCompile(`^[a-z0-9_\-\.]+$`)

// ValidateCapabilityName ensures capability names follow clean namespace conventions.
func ValidateCapabilityName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("capability name cannot be empty")
	}
	if !validCapRegex.MatchString(name) {
		return fmt.Errorf("capability name contains invalid characters: %s", name)
	}
	return nil
}
