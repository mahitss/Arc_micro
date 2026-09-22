package economy

import (
	"math/big"
	"time"
)

// MissionStatus represents the explicit lifecycle states of an autonomous mission.
type MissionStatus string

const (
	StatusCreated          MissionStatus = "CREATED"
	StatusPlanning         MissionStatus = "PLANNING"
	StatusDiscovering      MissionStatus = "DISCOVERING"
	StatusEvaluating       MissionStatus = "EVALUATING"
	StatusSelecting        MissionStatus = "SELECTING"
	StatusAwaitingApproval MissionStatus = "AWAITING_APPROVAL"
	StatusExecuting        MissionStatus = "EXECUTING"
	StatusWaitingForResult MissionStatus = "WAITING_FOR_RESULT"
	StatusEvaluatingResult MissionStatus = "EVALUATING_RESULT"
	StatusContinuing       MissionStatus = "CONTINUING"
	StatusCompleted        MissionStatus = "COMPLETED"
	StatusFailed           MissionStatus = "FAILED"
	StatusCancelled        MissionStatus = "CANCELLED"
	StatusBudgetExhausted  MissionStatus = "BUDGET_EXHAUSTED"
	StatusExpired          MissionStatus = "EXPIRED"
)

// Mission represents an autonomous economic objective governed by AgentPay controls.
// All financial amounts are integer base-unit strings (e.g., micro-USDC).
type Mission struct {
	ID                 string            `json:"id"`
	OrganizationID     string            `json:"organization_id"`
	AgentID            string            `json:"agent_id"`
	Objective          string            `json:"objective"`
	Status             MissionStatus     `json:"status"`
	Budget             string            `json:"budget"`               // Total authorized budget in base units
	Spent              string            `json:"spent"`                // Settled disbursements in base units
	RemainingBudget    string            `json:"remaining_budget"`     // Available uncommitted budget in base units
	Currency           string            `json:"currency"`             // e.g. "USDC"
	MaxExecutionAmount string            `json:"max_execution_amount"` // Maximum allowable spend per single step
	CreatedAt          time.Time         `json:"created_at"`
	StartedAt          *time.Time        `json:"started_at,omitempty"`
	CompletedAt        *time.Time        `json:"completed_at,omitempty"`
	Deadline           *time.Time        `json:"deadline,omitempty"`
	CurrentStep        string            `json:"current_step,omitempty"`
	FailureReason      string            `json:"failure_reason,omitempty"`
	Metadata           map[string]string `json:"metadata,omitempty"`
	CorrelationID      string            `json:"correlation_id"`
}

// MissionStep represents a planned operational unit within a mission.
type MissionStep struct {
	StepID             string            `json:"step_id"`
	MissionID          string            `json:"mission_id"`
	Index              int               `json:"index"`
	RequiredCapability string            `json:"required_capability"`
	Category           string            `json:"category,omitempty"`
	MaxBudget          string            `json:"max_budget"` // Max base units allocated to this step
	SelectedServiceID  string            `json:"selected_service_id,omitempty"`
	SelectedQuoteID    string            `json:"selected_quote_id,omitempty"`
	PaymentIntentID    string            `json:"payment_intent_id,omitempty"`
	Status             string            `json:"status"` // PENDING, EXECUTING, COMPLETED, FAILED, SKIPPED
	ResultData         string            `json:"result_data,omitempty"`
	Error              string            `json:"error,omitempty"`
	StartedAt          *time.Time        `json:"started_at,omitempty"`
	CompletedAt        *time.Time        `json:"completed_at,omitempty"`
}

// MissionPlan encapsulates the structured decomposition of an objective.
type MissionPlan struct {
	MissionID string        `json:"mission_id"`
	Steps     []MissionStep `json:"steps"`
}

// Quote represents a time-bound, cryptographically identified pricing commitment.
// All prices are strictly base-unit strings (e.g., micro-USDC).
type Quote struct {
	QuoteID            string    `json:"quote_id"`
	ServiceID          string    `json:"service_id"`
	MissionID          string    `json:"mission_id,omitempty"`
	Price              string    `json:"price"` // micro-USDC
	Asset              string    `json:"asset"` // "USDC"
	EstimatedLatencyMs int64     `json:"estimated_latency_ms"`
	QualityScore       int64     `json:"quality_score"`    // Scaled basis points: 0 - 10000
	RiskScore          int64     `json:"risk_score"`       // Scaled basis points: 0 - 10000
	ReputationScore    int64     `json:"reputation_score"` // Scaled basis points: 0 - 10000
	ExpiresAt          time.Time `json:"expires_at"`
	RecipientBinding   string    `json:"recipient_binding"` // Server-resolved authoritative address
	CreatedAt          time.Time `json:"created_at"`
}

// ScoredCandidate holds a quote evaluated by the Economic Selection Engine.
type ScoredCandidate struct {
	Quote               *Quote `json:"quote"`
	UtilityScore        int64  `json:"utility_score"` // Scaled integer score
	QualityContribution int64  `json:"quality_contrib"`
	ReliabilityContrib  int64  `json:"reliability_contrib"`
	ReputationContrib   int64  `json:"reputation_contrib"`
	LatencyContrib      int64  `json:"latency_contrib"`
	PricePenalty        int64  `json:"price_penalty"`
	RiskPenalty         int64  `json:"risk_penalty"`
	Explanation         string `json:"explanation"`
}

// SelectionWeights defines deterministic weights for the utility scoring formula.
// All weights are integers in basis points (summing to 10,000 for standard normalization).
type SelectionWeights struct {
	PriceWeight       int64 `json:"price_weight"`
	QualityWeight     int64 `json:"quality_weight"`
	ReputationWeight  int64 `json:"reputation_weight"`
	ReliabilityWeight int64 `json:"reliability_weight"`
	LatencyWeight     int64 `json:"latency_weight"`
	RiskWeight        int64 `json:"risk_weight"`
}

// DefaultSelectionWeights returns the production baseline weights.
func DefaultSelectionWeights() SelectionWeights {
	return SelectionWeights{
		PriceWeight:       2500, // 25%
		QualityWeight:     2000, // 20%
		ReputationWeight:  1500, // 15%
		ReliabilityWeight: 2000, // 20%
		LatencyWeight:     1000, // 10%
		RiskWeight:        1000, // 10%
	}
}

// ServiceReputation tracks long-term economic performance of a service.
type ServiceReputation struct {
	ServiceID             string     `json:"service_id"`
	OrganizationID        string     `json:"organization_id"` // Multi-tenant isolation
	TotalRequests         uint64     `json:"total_requests"`
	SuccessfulRequests    uint64     `json:"successful_requests"`
	FailedRequests        uint64     `json:"failed_requests"`
	PaymentCount          uint64     `json:"payment_count"`
	TotalVolumeSettled    *big.Int   `json:"total_volume_settled"` // micro-USDC
	AveragePrice          *big.Int   `json:"average_price"`        // micro-USDC
	AverageLatencyMs      int64      `json:"average_latency_ms"`
	FailureRateBps        int64      `json:"failure_rate_bps"`        // Basis points (0-10000)
	ReputationScore       int64      `json:"reputation_score"`       // Basis points (0-10000)
	LastFailureAt         *time.Time `json:"last_failure_at,omitempty"`
	LastSuccessAt         *time.Time `json:"last_success_at,omitempty"`
	HistoricalReliability string     `json:"historical_reliability"` // e.g. "99.8%"
	UpdatedAt             time.Time  `json:"updated_at"`
}

// EconomicProfile summarizes agent or organization level spending metrics.
type EconomicProfile struct {
	EntityID            string    `json:"entity_id"` // agent_id or org_id
	EntityType          string    `json:"entity_type"` // "AGENT", "ORGANIZATION"
	MissionsCreated     uint64    `json:"missions_created"`
	MissionsCompleted   uint64    `json:"missions_completed"`
	MissionsFailed      uint64    `json:"missions_failed"`
	TotalSpentBaseUnits *big.Int  `json:"total_spent_base_units"`
	AverageMissionCost  *big.Int  `json:"average_mission_cost"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// AgentCapability defines a structured, machine-readable capability contract.
type AgentCapability struct {
	Capability   string                 `json:"capability"`
	Version      string                 `json:"version"`
	Name         string                 `json:"name,omitempty"`
	Description  string                 `json:"description,omitempty"`
	Category     string                 `json:"category,omitempty"`
	InputSchema  map[string]interface{} `json:"input_schema,omitempty"`
	OutputSchema map[string]interface{} `json:"output_schema,omitempty"`
}

// AgentService represents a registered economic service provided by a peer AI agent.
type AgentService struct {
	AgentID                string                 `json:"agent_id"`
	ServiceID              string                 `json:"service_id"`
	OrganizationID         string                 `json:"organization_id"`
	Name                   string                 `json:"name"`
	Description            string                 `json:"description"`
	Capabilities           []string               `json:"capabilities"`
	StructuredCapabilities []AgentCapability      `json:"structured_capabilities,omitempty"`
	PricingModel           string                 `json:"pricing_model"` // FIXED, VARIABLE, QUOTE_REQUIRED
	BasePrice              string                 `json:"base_price"`    // micro-USDC integer string
	MaxPrice               string                 `json:"max_price"`     // micro-USDC integer string
	SupportedAssets        []string               `json:"supported_assets"` // ["USDC"]
	Availability           string                 `json:"availability"`  // ONLINE, BUSY, OFFLINE
	Reputation             int64                  `json:"reputation"`    // Basis points (0-10000)
	SuccessRateBps         int64                  `json:"success_rate_bps"`
	AverageLatencyMs       int64                  `json:"average_latency_ms"`
	RiskProfile            string                 `json:"risk_profile"`  // LOW, MEDIUM, HIGH
	Enabled                bool                   `json:"enabled"`
	Verified               bool                   `json:"verified"`
	TrustMetadata          map[string]string      `json:"trust_metadata,omitempty"`
	CreatedAt              time.Time              `json:"created_at"`
	UpdatedAt              time.Time              `json:"updated_at"`
}

// QuoteStatus represents the explicit lifecycle states of an inter-agent quote.
type QuoteStatus string

const (
	QuoteStatusRequested QuoteStatus = "REQUESTED"
	QuoteStatusOffered   QuoteStatus = "OFFERED"
	QuoteStatusAccepted  QuoteStatus = "ACCEPTED"
	QuoteStatusExpired   QuoteStatus = "EXPIRED"
	QuoteStatusRejected  QuoteStatus = "REJECTED"
	QuoteStatusCancelled QuoteStatus = "CANCELLED"
	QuoteStatusCompleted QuoteStatus = "COMPLETED"
)

// NegotiationProposal tracks an individual round of structured economic negotiation.
type NegotiationProposal struct {
	Round           int               `json:"round"`
	ProposerAgentID string            `json:"proposer_agent_id"`
	ProposedPrice   string            `json:"proposed_price"` // micro-USDC
	Terms           map[string]string `json:"terms,omitempty"`
	Status          string            `json:"status"` // PENDING, ACCEPTED, REJECTED, COUNTERED
	CreatedAt       time.Time         `json:"created_at"`
}

// AgentQuote represents a binding cryptographic pricing commitment between two agents.
type AgentQuote struct {
	QuoteID            string                `json:"quote_id"`
	BuyerAgentID       string                `json:"buyer_agent_id"`
	SellerAgentID      string                `json:"seller_agent_id"`
	ServiceID          string                `json:"service_id"`
	MissionID          string                `json:"mission_id,omitempty"`
	Price              string                `json:"price"` // micro-USDC base units
	Asset              string                `json:"asset"` // "USDC"
	EstimatedLatencyMs int64                 `json:"estimated_latency_ms"`
	Quality            int64                 `json:"quality"` // Basis points (0-10000)
	ValidUntil         time.Time             `json:"valid_until"`
	Terms              map[string]string     `json:"terms,omitempty"`
	Status             QuoteStatus           `json:"status"`
	NegotiationRounds  []NegotiationProposal `json:"negotiation_rounds,omitempty"`
	CreatedAt          time.Time             `json:"created_at"`
}

// HireStatus represents the explicit lifecycle states of an inter-agent hiring agreement.
type HireStatus string

const (
	HireStatusProposed       HireStatus = "PROPOSED"
	HireStatusAccepted       HireStatus = "ACCEPTED"
	HireStatusPaymentPending HireStatus = "PAYMENT_PENDING"
	HireStatusPaid           HireStatus = "PAID"
	HireStatusExecuting      HireStatus = "EXECUTING"
	HireStatusResultPending  HireStatus = "RESULT_PENDING"
	HireStatusResultReceived HireStatus = "RESULT_RECEIVED"
	HireStatusValidating     HireStatus = "VALIDATING"
	HireStatusCompleted      HireStatus = "COMPLETED"
	HireStatusFailed         HireStatus = "FAILED"
	HireStatusCancelled      HireStatus = "CANCELLED"
)

// MAX_AGENT_CALL_DEPTH defines the hard recursion ceiling to prevent infinite inter-agent loops.
const MAX_AGENT_CALL_DEPTH = 3

// Hire represents a binding economic agreement between two agents within a mission context.
type Hire struct {
	ID              string            `json:"id"`
	OrganizationID  string            `json:"organization_id"`
	BuyerAgentID    string            `json:"buyer_agent_id"`
	SellerAgentID   string            `json:"seller_agent_id"`
	ServiceID       string            `json:"service_id"`
	Capability      string            `json:"capability"`
	MissionID       string            `json:"mission_id"`
	RootMissionID   string            `json:"root_mission_id"`
	ParentHireID    string            `json:"parent_hire_id,omitempty"`
	CallDepth       int               `json:"call_depth"`
	QuoteID         string            `json:"quote_id"`
	Price           string            `json:"price"` // micro-USDC base units
	Asset           string            `json:"asset"` // "USDC"
	PaymentIntentID string            `json:"payment_intent_id,omitempty"`
	ExpectedResult  string            `json:"expected_result"`
	Status          HireStatus        `json:"status"`
	Result          *AgentResult      `json:"result,omitempty"`
	Error           string            `json:"error,omitempty"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	CompletedAt     *time.Time        `json:"completed_at,omitempty"`
}

// AgentResult represents structured output returned by an untrusted hired peer agent.
type AgentResult struct {
	HireID           string                 `json:"hire_id"`
	Status           string                 `json:"status"` // "SUCCESS", "FAILED"
	ResultType       string                 `json:"result_type"`
	Result           map[string]interface{} `json:"result"`
	Quality          float64                `json:"quality"` // 0.00 to 1.00
	ExecutionTimeMs  int64                  `json:"execution_time_ms"`
	ProviderMetadata map[string]string      `json:"provider_metadata,omitempty"`
	ChecksumSHA256   string                 `json:"checksum_sha256"`
	IsSanitized      bool                   `json:"is_sanitized"`
	CreatedAt        time.Time              `json:"created_at"`
}

// GraphNodeType categorizes vertices in the economic graph.
type GraphNodeType string

const (
	NodeTypeAgent   GraphNodeType = "AGENT"
	NodeTypeService GraphNodeType = "SERVICE"
	NodeTypeMission GraphNodeType = "MISSION"
	NodeTypeHire    GraphNodeType = "HIRE"
	NodeTypePayment GraphNodeType = "PAYMENT"
)

// GraphEdgeType categorizes directed edges in the economic graph.
type GraphEdgeType string

const (
	EdgeTypeHired       GraphEdgeType = "HIRED"
	EdgeTypePaid        GraphEdgeType = "PAID"
	EdgeTypeDependsOn   GraphEdgeType = "DEPENDS_ON"
	EdgeTypeProduced    GraphEdgeType = "PRODUCED"
	EdgeTypeValidatedBy GraphEdgeType = "VALIDATED_BY"
)

// GraphNode represents a single vertex in the economic DAG.
type GraphNode struct {
	ID       string                 `json:"id"`
	Type     GraphNodeType          `json:"type"`
	Label    string                 `json:"label"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// GraphEdge represents a directed economic relationship between vertices.
type GraphEdge struct {
	Source   string                 `json:"source"`
	Target   string                 `json:"target"`
	Type     GraphEdgeType          `json:"type"`
	Label    string                 `json:"label,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// EconomicGraph represents the complete queryable directed economic network for a mission.
type EconomicGraph struct {
	MissionID string      `json:"mission_id"`
	Nodes     []GraphNode `json:"nodes"`
	Edges     []GraphEdge `json:"edges"`
}

