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
	Quote               *Quote          `json:"quote"`
	UtilityScore        int64           `json:"utility_score"` // Scaled integer score
	QualityContribution int64           `json:"quality_contrib"`
	ReliabilityContrib  int64           `json:"reliability_contrib"`
	ReputationContrib   int64           `json:"reputation_contrib"`
	LatencyContrib      int64           `json:"latency_contrib"`
	ContextualContrib   int64           `json:"contextual_contrib,omitempty"`
	RecentPerfContrib   int64           `json:"recent_perf_contrib,omitempty"`
	PricePenalty        int64           `json:"price_penalty"`
	RiskPenalty         int64           `json:"risk_penalty"`
	Confidence          ConfidenceLevel `json:"confidence,omitempty"`
	Explanation         string          `json:"explanation"`
}

// SelectionWeights defines deterministic weights for the utility scoring formula.
// All weights are integers in basis points (summing to 10,000 for standard normalization).
type SelectionWeights struct {
	Version           string `json:"version"` // "v2.0"
	PriceWeight       int64  `json:"price_weight"`
	QualityWeight     int64  `json:"quality_weight"`
	ReputationWeight  int64  `json:"reputation_weight"`
	ReliabilityWeight int64  `json:"reliability_weight"`
	LatencyWeight     int64  `json:"latency_weight"`
	RiskWeight        int64  `json:"risk_weight"`
	ContextualWeight  int64  `json:"contextual_weight,omitempty"`
	RecentPerfWeight  int64  `json:"recent_perf_weight,omitempty"`
}

// DefaultSelectionWeights returns the production baseline weights.
func DefaultSelectionWeights() SelectionWeights {
	return SelectionWeights{
		Version:           "v2.0",
		PriceWeight:       2000, // 20%
		QualityWeight:     1500, // 15%
		ReputationWeight:  1500, // 15%
		ReliabilityWeight: 1500, // 15%
		LatencyWeight:     1000, // 10%
		RiskWeight:        1000, // 10%
		ContextualWeight:  1000, // 10%
		RecentPerfWeight:  500,  // 5%
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
	NodeTypeSwarm   GraphNodeType = "SWARM"
	NodeTypeTask    GraphNodeType = "TASK"
)

// GraphEdgeType categorizes directed edges in the economic graph.
type GraphEdgeType string

const (
	EdgeTypeHired       GraphEdgeType = "HIRED"
	EdgeTypePaid        GraphEdgeType = "PAID"
	EdgeTypeDependsOn   GraphEdgeType = "DEPENDS_ON"
	EdgeTypeProduced    GraphEdgeType = "PRODUCED"
	EdgeTypeValidatedBy GraphEdgeType = "VALIDATED_BY"
	EdgeTypeAssigned    GraphEdgeType = "ASSIGNED"
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

// Bounded loop execution limits to prevent infinite loops and guarantee fail-closed behavior
const (
	MAX_MISSION_ITERATIONS = 10
	MAX_RECOVERY_ATTEMPTS  = 3
	MAX_REPLAN_COUNT       = 3
	MAX_RETRIES_PER_HIRE   = 2
)

// ObservationType defines canonical economic interaction observation events.
type ObservationType string

const (
	ObservationServiceSuccess   ObservationType = "SERVICE_SUCCESS"
	ObservationServiceFailure   ObservationType = "SERVICE_FAILURE"
	ObservationQuoteAccepted    ObservationType = "QUOTE_ACCEPTED"
	ObservationQuoteRejected    ObservationType = "QUOTE_REJECTED"
	ObservationQuoteExpired     ObservationType = "QUOTE_EXPIRED"
	ObservationPaymentSuccess   ObservationType = "PAYMENT_SUCCESS"
	ObservationPaymentFailure   ObservationType = "PAYMENT_FAILURE"
	ObservationResultValidated  ObservationType = "RESULT_VALIDATED"
	ObservationResultRejected   ObservationType = "RESULT_REJECTED"
	ObservationMissionCompleted ObservationType = "MISSION_COMPLETED"
	ObservationMissionFailed    ObservationType = "MISSION_FAILED"

	// Canonical Event Types (Task 9)
	ObservationDiscovery   ObservationType = "DISCOVERY"
	ObservationQuote       ObservationType = "QUOTE"
	ObservationSelection   ObservationType = "SELECTION"
	ObservationContract    ObservationType = "CONTRACT"
	ObservationExecution   ObservationType = "EXECUTION"
	ObservationSuccess     ObservationType = "SUCCESS"
	ObservationFailure     ObservationType = "FAILURE"
	ObservationTimeout     ObservationType = "TIMEOUT"
	ObservationRetry       ObservationType = "RETRY"
	ObservationVerification ObservationType = "VERIFICATION"
	ObservationPayment     ObservationType = "PAYMENT"
	ObservationRefund      ObservationType = "REFUND"
	ObservationDispute     ObservationType = "DISPUTE"
	ObservationReplan      ObservationType = "REPLAN"
	ObservationDelegation  ObservationType = "DELEGATION"
)

// OutcomeStatus defines the high-level evaluation of an economic action.
type OutcomeStatus string

const (
	OutcomeSuccess            OutcomeStatus = "SUCCESS"
	OutcomePartialSuccess     OutcomeStatus = "PARTIAL_SUCCESS"
	OutcomeFailure            OutcomeStatus = "FAILURE"
	OutcomeTimeout            OutcomeStatus = "TIMEOUT"
	OutcomeCancelled          OutcomeStatus = "CANCELLED"
	OutcomeDisputed           OutcomeStatus = "DISPUTED"
	OutcomeRefunded           OutcomeStatus = "REFUNDED"
	OutcomeVerificationFailed OutcomeStatus = "VERIFICATION_FAILED"
)

// SimulationMode defines whether an interaction was real or simulated.
// MANDATORY INVARIANT: Simulated data must NEVER contaminate real reputation.
type SimulationMode string

const (
	ModeReal       SimulationMode = "REAL"
	ModeSimulation SimulationMode = "SIMULATION"
)

// ObservationScope defines tenant visibility boundaries.
type ObservationScope string

const (
	ScopePrivate      ObservationScope = "PRIVATE"
	ScopeOrganization ObservationScope = "ORGANIZATION"
	ScopePublic       ObservationScope = "PUBLIC"
)

// ConfidenceLevel captures evidence availability for recommendations and evaluations.
type ConfidenceLevel string

const (
	ConfidenceInsufficientData ConfidenceLevel = "INSUFFICIENT_DATA" // < 5 observations
	ConfidenceLowConfidence    ConfidenceLevel = "LOW_CONFIDENCE"    // 5-20 observations
	ConfidenceModerateConfidence ConfidenceLevel = "MODERATE_CONFIDENCE" // 20-100 observations
	ConfidenceHigherConfidence   ConfidenceLevel = "HIGHER_CONFIDENCE"   // 100+ observations

	// Compatibility aliases
	ConfidenceHigh    ConfidenceLevel = "HIGH"
	ConfidenceMedium  ConfidenceLevel = "MEDIUM"
	ConfidenceLow     ConfidenceLevel = "LOW"
	ConfidenceUnknown ConfidenceLevel = "UNKNOWN"
)

// FailureClass categorizes the root cause of an economic or execution failure.
type FailureClass string

const (
	FailureTransient      FailureClass = "TRANSIENT"
	FailurePermanent      FailureClass = "PERMANENT"
	FailureTimeout        FailureClass = "TIMEOUT"
	FailureQualityFailure FailureClass = "QUALITY_FAILURE"
	FailurePolicyFailure  FailureClass = "POLICY_FAILURE"
	FailurePaymentFailure FailureClass = "PAYMENT_FAILURE"
	FailureUnknown        FailureClass = "UNKNOWN"

	// Canonical Failure Taxonomy (Task 9)
	FailureProviderTimeout    FailureClass = "PROVIDER_TIMEOUT"
	FailureInvalidResult      FailureClass = "INVALID_RESULT"
	FailureSchemaMismatch     FailureClass = "SCHEMA_MISMATCH"
	FailureVerificationFailed FailureClass = "VERIFICATION_FAILED"
	FailureQuoteExpired       FailureClass = "QUOTE_EXPIRED"
	FailurePolicyDenied       FailureClass = "POLICY_DENIED"
	FailureRiskDenied         FailureClass = "RISK_DENIED"
	FailureInsufficientBudget FailureClass = "INSUFFICIENT_BUDGET"
	FailureTreasuryUnavailable FailureClass = "TREASURY_UNAVAILABLE"
	FailureNetworkError       FailureClass = "NETWORK_ERROR"
	FailureAgentUnavailable   FailureClass = "AGENT_UNAVAILABLE"
	FailureDelegationFailure  FailureClass = "DELEGATION_FAILURE"
)

// RecoveryStrategy defines deterministic recovery paths upon service or execution failure.
type RecoveryStrategy string

const (
	StrategyRetrySameService      RecoveryStrategy = "RETRY_SAME_SERVICE"
	StrategyTryAlternativeService RecoveryStrategy = "TRY_ALTERNATIVE_SERVICE"
	StrategyReduceScope           RecoveryStrategy = "REDUCE_SCOPE"
	StrategyIncreaseVerification  RecoveryStrategy = "INCREASE_VERIFICATION"
	StrategyRequestHumanApproval  RecoveryStrategy = "REQUEST_HUMAN_APPROVAL"
	StrategyAbortMission          RecoveryStrategy = "ABORT_MISSION"
)

// PerformanceWindow defines explicit aggregation timeframes.
type PerformanceWindow string

const (
	WindowLast10Jobs  PerformanceWindow = "last_10_jobs"
	WindowLast24Hours PerformanceWindow = "last_24_hours"
	WindowLast7Days   PerformanceWindow = "last_7_days"
	WindowLast30Days  PerformanceWindow = "last_30_days"
	WindowLast90Days  PerformanceWindow = "last_90_days"
	WindowAllTime     PerformanceWindow = "all_time"
)

// EconomicObservation represents an immutable, append-only record of an economic interaction.
type EconomicObservation struct {
	ID                 string                 `json:"observation_id"`
	OrganizationID     string                 `json:"organization_id"`
	AgentID            string                 `json:"agent_id"`
	MissionID          string                 `json:"mission_id,omitempty"`
	SwarmID            string                 `json:"swarm_id,omitempty"`
	ContractID         string                 `json:"contract_id,omitempty"`
	Capability         string                 `json:"capability,omitempty"`
	Provider           string                 `json:"provider,omitempty"`
	ServiceID          string                 `json:"service_id,omitempty"` // Provider alias
	HireID             string                 `json:"hire_id,omitempty"`
	PaymentID          string                 `json:"payment_id,omitempty"`
	EventType          ObservationType        `json:"event_type"`
	Outcome            OutcomeStatus          `json:"outcome"`
	Timestamp          time.Time              `json:"timestamp"`
	QuotedCost         string                 `json:"quoted_cost,omitempty"`     // micro-USDC
	AuthorizedCost     string                 `json:"authorized_cost,omitempty"` // micro-USDC
	SettledCost        string                 `json:"settled_cost,omitempty"`    // micro-USDC
	Price              string                 `json:"price,omitempty"`           // micro-USDC alias
	ExecutionDuration  int64                  `json:"execution_duration"`        // ms
	LatencyMs          int64                  `json:"latency_ms,omitempty"`      // alias
	VerificationResult string                 `json:"verification_result,omitempty"`
	PolicyResult       string                 `json:"policy_result,omitempty"`
	RiskResult         string                 `json:"risk_result,omitempty"`
	RetryCount         int                    `json:"retry_count"`
	FailureReason      string                 `json:"failure_reason,omitempty"`
	SimulationFlag     SimulationMode         `json:"simulation_flag"` // REAL or SIMULATION
	Scope              ObservationScope       `json:"scope"`           // PRIVATE, ORGANIZATION, PUBLIC
	Metadata           map[string]interface{} `json:"metadata,omitempty"`
	SourceEventID      string                 `json:"source_event_id,omitempty"`
	CorrelationID      string                 `json:"correlation_id,omitempty"`
	Success            bool                   `json:"success"`
	QualityScore       int64                  `json:"quality_score,omitempty"`
	RiskScore          int64                  `json:"risk_score,omitempty"`
	InputContext       map[string]interface{} `json:"input_context,omitempty"`
}

// GetProvider returns canonical provider identifier.
func (o *EconomicObservation) GetProvider() string {
	if o.Provider != "" {
		return o.Provider
	}
	return o.ServiceID
}

// GetSettledCost returns canonical settled cost micro-USDC.
func (o *EconomicObservation) GetSettledCost() string {
	if o.SettledCost != "" {
		return o.SettledCost
	}
	return o.Price
}

// GetDurationMs returns canonical duration in milliseconds.
func (o *EconomicObservation) GetDurationMs() int64 {
	if o.ExecutionDuration > 0 {
		return o.ExecutionDuration
	}
	return o.LatencyMs
}

// QuoteAccuracyMetrics details systematic quote deviations.
type QuoteAccuracyMetrics struct {
	TotalQuotedCost        *big.Int `json:"total_quoted_cost"`
	TotalSettledCost       *big.Int `json:"total_settled_cost"`
	AbsoluteCostDiff       *big.Int `json:"absolute_cost_diff"`
	CostErrorBps           int64    `json:"cost_error_bps"`
	UnderquoteCostCount    uint64   `json:"underquote_cost_count"`
	OverquoteCostCount     uint64   `json:"overquote_cost_count"`
	TotalQuotedDurationMs  int64    `json:"total_quoted_duration_ms"`
	TotalActualDurationMs  int64    `json:"total_actual_duration_ms"`
	DurationErrorBps       int64    `json:"duration_error_bps"`
	UnderquoteDurationCount uint64  `json:"underquote_duration_count"`
	OverquoteDurationCount  uint64  `json:"overquote_duration_count"`
	SampleCount            uint64   `json:"sample_count"`
}

// LatencyPercentiles records deterministic percentile distribution.
type LatencyPercentiles struct {
	P50Ms       int64  `json:"p50_ms"`
	P75Ms       int64  `json:"p75_ms"`
	P90Ms       int64  `json:"p90_ms"`
	P95Ms       int64  `json:"p95_ms"`
	P99Ms       int64  `json:"p99_ms"`
	SampleCount uint64 `json:"sample_count"`
}

// EconomicCostModel details expected cost ranges and variances.
type EconomicCostModel struct {
	ExpectedCost    *big.Int `json:"expected_cost"` // micro-USDC
	CostRangeMin    *big.Int `json:"cost_range_min"`
	CostRangeMax    *big.Int `json:"cost_range_max"`
	CostVariance    *big.Int `json:"cost_variance"`
	FailureRetryCost *big.Int `json:"failure_retry_cost"`
	VerificationCost *big.Int `json:"verification_cost"`
	DelegationCost  *big.Int `json:"delegation_cost"`
	SampleCount     uint64   `json:"sample_count"`
}

// RecoveryPattern records historical recovery behavior.
type RecoveryPattern struct {
	FailureType          string   `json:"failure_type"`
	OriginalProvider     string   `json:"original_provider"`
	ReplacementProvider  string   `json:"replacement_provider"`
	Capability           string   `json:"capability"`
	SuccessAfterRecovery bool     `json:"success_after_recovery"`
	AdditionalCost       *big.Int `json:"additional_cost"` // micro-USDC
	AdditionalLatencyMs  int64    `json:"additional_latency_ms"`
	SampleCount          uint64   `json:"sample_count"`
}

// StrategyPerformance measures empirical performance by mission strategy.
type StrategyPerformance struct {
	Strategy             string   `json:"strategy"`
	SuccessRateBps       int64    `json:"success_rate_bps"`
	AverageCost          *big.Int `json:"average_cost"`
	AverageLatencyMs     int64    `json:"average_latency_ms"`
	ReliabilityBps       int64    `json:"reliability_bps"`
	RecoverySuccessRateBps int64  `json:"recovery_success_rate_bps"`
	SampleCount          uint64   `json:"sample_count"`
}

// EconomicPerformanceProfile represents deterministic multi-signal economic intelligence.
type EconomicPerformanceProfile struct {
	EntityID                 string                           `json:"entity_id"`
	EntityType               string                           `json:"entity_type"` // "agent", "service", "capability"
	OrganizationID           string                           `json:"organization_id"`
	Window                   PerformanceWindow                `json:"window"`
	SimulationMode           SimulationMode                   `json:"simulation_mode"`
	SuccessRateBps           int64                            `json:"success_rate_bps"`
	CompletionRateBps        int64                            `json:"completion_rate_bps"`
	TimeoutRateBps           int64                            `json:"timeout_rate_bps"`
	VerificationSuccessRateBps int64                          `json:"verification_success_rate_bps"`
	DisputeRateBps           int64                            `json:"dispute_rate_bps"`
	RefundRateBps            int64                            `json:"refund_rate_bps"`
	AverageCost              *big.Int                         `json:"average_cost"`
	CostVariance             *big.Int                         `json:"cost_variance"`
	AverageLatencyMs         int64                            `json:"average_latency_ms"`
	LatencyVariance          int64                            `json:"latency_variance"`
	Percentiles              LatencyPercentiles               `json:"percentiles"`
	QuoteAccuracy            QuoteAccuracyMetrics             `json:"quote_accuracy"`
	CostModel                EconomicCostModel                `json:"cost_model"`
	RetryFrequencyBps        int64                            `json:"retry_frequency_bps"`
	RecoverySuccessRateBps   int64                            `json:"recovery_success_rate_bps"`
	TotalJobs                uint64                           `json:"total_jobs"`
	RealJobs                 uint64                           `json:"real_jobs"`
	SimulatedJobs            uint64                           `json:"simulated_jobs"`
	ContextualBreakdown      map[string]ContextualPerformance `json:"contextual_breakdown,omitempty"`
	Confidence               ConfidenceLevel                  `json:"confidence"`
	AggregationVersion       string                           `json:"aggregation_version"`
	UpdatedAt                time.Time                        `json:"updated_at"`
}

// RealPerformance and SimulationPerformance wrapper.
type DualPerformanceContainer struct {
	Real       *EconomicPerformanceProfile `json:"real"`
	Simulation *EconomicPerformanceProfile `json:"simulation"`
}

// PlanVsActual compares planned assumptions against reality.
type PlanVsActual struct {
	PlannedCost                   string  `json:"planned_cost"` // micro-USDC
	ActualCost                    string  `json:"actual_cost"`  // micro-USDC
	CostErrorPercent              float64 `json:"cost_error_percent"`
	PlannedDurationMs             int64   `json:"planned_duration_ms"`
	ActualDurationMs              int64   `json:"actual_duration_ms"`
	DurationErrorPercent          float64 `json:"duration_error_percent"`
	PlannedAgents                 []string `json:"planned_agents"`
	ActualAgents                  []string `json:"actual_agents"`
	AgentDifferences              []string `json:"agent_differences,omitempty"`
	FailureDifferences            []string `json:"failure_differences,omitempty"`
	SimulationPredictionErrorBps  int64    `json:"simulation_prediction_error_bps"`
}

// MissionOutcomeSummary encapsulates immutable evidence from a completed mission.
type MissionOutcomeSummary struct {
	MissionID            string                 `json:"mission_id"`
	OrganizationID       string                 `json:"organization_id"`
	Objective            string                 `json:"objective"`
	Strategy             string                 `json:"strategy"`
	AgentsUsed           []string               `json:"agents_used"`
	CapabilitiesUsed     []string               `json:"capabilities_used"`
	TotalCost            string                 `json:"total_cost"`
	ExpectedCost         string                 `json:"expected_cost"`
	DurationMs           int64                  `json:"duration_ms"`
	RetriesCount         int                    `json:"retries_count"`
	FailuresCount        int                    `json:"failures_count"`
	RecoveryOccurred     bool                   `json:"recovery_occurred"`
	VerificationPassed   bool                   `json:"verification_passed"`
	FinalOutcome         OutcomeStatus          `json:"final_outcome"`
	PolicyDecisionsCount int                    `json:"policy_decisions_count"`
	PlanVsActual         PlanVsActual           `json:"plan_vs_actual"`
	CompletedAt          time.Time              `json:"completed_at"`
}

// SwarmOutcomeSummary captures multi-agent swarm outcomes.
type SwarmOutcomeSummary struct {
	SwarmID              string                 `json:"swarm_id"`
	OrganizationID       string                 `json:"organization_id"`
	TaskCount            int                    `json:"task_count"`
	AgentsUsed           []string               `json:"agents_used"`
	ParallelismPlanned   int                    `json:"parallelism_planned"`
	ParallelismActual    int                    `json:"parallelism_actual"`
	TotalCost            string                 `json:"total_cost"`
	DurationMs           int64                  `json:"duration_ms"`
	TaskFailures         int                    `json:"task_failures"`
	RecoveriesCount      int                    `json:"recoveries_count"`
	ConsensusReached     bool                   `json:"consensus_reached"`
	FinalQualityBps      int64                  `json:"final_quality_bps"`
	PlanVsActual         PlanVsActual           `json:"plan_vs_actual"`
	CompletedAt          time.Time              `json:"completed_at"`
}

// SimulatorCalibrationMetrics tracks prediction accuracy over time.
type SimulatorCalibrationMetrics struct {
	TotalRunsCompared              uint64  `json:"total_runs_compared"`
	CostPredictionAccuracyBps      int64   `json:"cost_prediction_accuracy_bps"`
	DurationPredictionAccuracyBps  int64   `json:"duration_prediction_accuracy_bps"`
	FailurePredictionAccuracyBps   int64   `json:"failure_prediction_accuracy_bps"`
	UnderestimationBiasBps         int64   `json:"underestimation_bias_bps"`
	OverestimationBiasBps          int64   `json:"overestimation_bias_bps"`
	LatencyBiasMs                  int64   `json:"latency_bias_ms"`
	Confidence                     ConfidenceLevel `json:"confidence"`
	UpdatedAt                      time.Time `json:"updated_at"`
}

// EconomicRecommendation encapsulates advisory guidance generated from historical learning.
// INVARIANT: Recommendations are advisory only and possess ZERO financial authority.
type EconomicRecommendation struct {
	ID                     string                 `json:"recommendation_id"`
	OrganizationID         string                 `json:"organization_id"`
	RecommendationType     string                 `json:"recommendation_type"` // "PREFER_PROVIDER", "USE_FALLBACK", "INCREASE_VERIFICATION", "ADJUST_STRATEGY"
	TargetEntityID         string                 `json:"target_entity_id"`
	TargetEntityType       string                 `json:"target_entity_type"`
	Reason                 string                 `json:"reason"`
	Why                    string                 `json:"why"`
	Evidence               []string               `json:"evidence"`
	SupportingObservations []string               `json:"supporting_observations"`
	Confidence             ConfidenceLevel        `json:"confidence"`
	SampleCount            uint64                 `json:"sample_count"`
	ExpectedImpact         string                 `json:"expected_impact"`
	DownsideRisk           string                 `json:"downside_risk"`
	AffectedAgents         []string               `json:"affected_agents,omitempty"`
	AffectedMissions       []string               `json:"affected_missions,omitempty"`
	Status                 string                 `json:"status"` // "NEW", "ACCEPTED", "REJECTED", "EXPIRED", "OUTCOME_AVAILABLE"
	CreatedAt              time.Time              `json:"created_at"`
}

// RecommendationOutcome closes the feedback loop on whether recommendations helped.
type RecommendationOutcome struct {
	RecommendationID string    `json:"recommendation_id"`
	Accepted         bool      `json:"accepted"`
	Executed         bool      `json:"executed"`
	Outcome          string    `json:"outcome"` // "SUCCESS", "FAILURE", "NEUTRAL"
	CostDelta        string    `json:"cost_delta"` // micro-USDC
	LatencyDeltaMs   int64     `json:"latency_delta_ms"`
	QualityDeltaBps  int64     `json:"quality_delta_bps"`
	FailureDelta     int       `json:"failure_delta"`
	RecordedAt       time.Time `json:"recorded_at"`
}

// DriftSeverity defines the severity of behavioral or performance drift.
type DriftSeverity string

const (
	DriftNormal       DriftSeverity = "NORMAL"
	DriftWatch        DriftSeverity = "WATCH"
	DriftDetected     DriftSeverity = "DRIFT"
	DriftSevere       DriftSeverity = "SEVERE_DRIFT"
)

// EconomicDrift records detected statistical divergence.
type EconomicDrift struct {
	ID             string        `json:"id"`
	OrganizationID string        `json:"organization_id"`
	EntityID       string        `json:"entity_id"`
	EntityType     string        `json:"entity_type"` // "provider", "agent", "capability"
	Signal         string        `json:"signal"`      // "success_rate", "latency", "quote_accuracy", "cost_variance"
	BaselineValue  string        `json:"baseline_value"`
	RecentValue    string        `json:"recent_value"`
	BaselineSample uint64        `json:"baseline_sample"`
	RecentSample   uint64        `json:"recent_sample"`
	DifferenceBps  int64         `json:"difference_bps"`
	Confidence     ConfidenceLevel `json:"confidence"`
	Severity       DriftSeverity `json:"severity"`
	Details        string        `json:"details"`
	DetectedAt     time.Time     `json:"detected_at"`
}

// PerformanceFeature represents a deterministic feature in the lightweight feature store.
type PerformanceFeature struct {
	FeatureKey         string    `json:"feature_key"`
	EntityID           string    `json:"entity_id"`
	OrganizationID     string    `json:"organization_id"`
	Value              string    `json:"value"`
	NumericValue       float64   `json:"numeric_value"`
	Source             string    `json:"source"`
	TimeWindow         string    `json:"time_window"`
	SampleCount        uint64    `json:"sample_count"`
	ComputationVersion string    `json:"computation_version"`
	GeneratedAt        time.Time `json:"generated_at"`
}

// EconomicForecast provides deterministic range-based expectations.
type EconomicForecast struct {
	OrganizationID       string          `json:"organization_id"`
	ObjectiveOrCapability string         `json:"objective_or_capability"`
	ExpectedCostMin      string          `json:"expected_cost_min"` // micro-USDC
	ExpectedCostMax      string          `json:"expected_cost_max"`
	ExpectedDurationMinMs int64          `json:"expected_duration_min_ms"`
	ExpectedDurationMaxMs int64          `json:"expected_duration_max_ms"`
	FailureProbabilityBps int64          `json:"failure_probability_bps"`
	Confidence           ConfidenceLevel `json:"confidence"`
	SampleSize           uint64          `json:"sample_size"`
	GeneratedAt          time.Time       `json:"generated_at"`
}

// ContextualPerformance records capability-specific performance metrics for a service.
type ContextualPerformance struct {
	Capability        string `json:"capability"`
	TotalJobs         uint64 `json:"total_jobs"`
	SuccessRateBps    int64  `json:"success_rate_bps"`
	AverageLatencyMs  int64  `json:"average_latency_ms"`
	AverageQualityBps int64  `json:"average_quality_bps"`
}

// ServicePerformance summarizes aggregated deterministic performance within an explicit window.
type ServicePerformance struct {
	ServiceID            string                           `json:"service_id"`
	OrganizationID       string                           `json:"organization_id"`
	Window               PerformanceWindow                `json:"window"`
	SuccessRateBps       int64                            `json:"success_rate_bps"`        // Basis points (0-10000)
	FailureRateBps       int64                            `json:"failure_rate_bps"`        // Basis points (0-10000)
	AveragePrice         *big.Int                         `json:"average_price"`           // micro-USDC
	PriceVariance        *big.Int                         `json:"price_variance"`          // Variance in micro-USDC^2
	AverageLatencyMs     int64                            `json:"average_latency_ms"`
	LatencyVariance      int64                            `json:"latency_variance"`
	ResultQualityBps     int64                            `json:"result_quality_bps"`      // Basis points (0-10000)
	RecentSuccessRateBps int64                            `json:"recent_success_rate_bps"` // Last 10 jobs
	RecentFailureRateBps int64                            `json:"recent_failure_rate_bps"`
	TotalJobs            uint64                           `json:"total_jobs"`
	TotalVolume          *big.Int                         `json:"total_volume"`            // micro-USDC
	LastSuccess          *time.Time                       `json:"last_success,omitempty"`
	LastFailure          *time.Time                       `json:"last_failure,omitempty"`
	ContextualBreakdown  map[string]ContextualPerformance `json:"contextual_breakdown,omitempty"`
	Confidence           ConfidenceLevel                  `json:"confidence"`
	UpdatedAt            time.Time                        `json:"updated_at"`
}

// AnomalyType defines categories of behavioral or pricing divergence.
type AnomalyType string

const (
	AnomalyPriceAnomaly   AnomalyType = "PRICE_ANOMALY"
	AnomalyLatencyAnomaly AnomalyType = "LATENCY_ANOMALY"
	AnomalyFailureSpike   AnomalyType = "FAILURE_SPIKE"
	AnomalyQualityDrop    AnomalyType = "QUALITY_DROP"
)

// CircuitBreakerStatus defines the operational health state of an external service candidate.
type CircuitBreakerStatus string

const (
	CircuitBreakerHealthy                CircuitBreakerStatus = "HEALTHY"
	CircuitBreakerDegraded               CircuitBreakerStatus = "DEGRADED"
	CircuitBreakerTemporarilyUnavailable CircuitBreakerStatus = "TEMPORARILY_UNAVAILABLE"
)

// AnomalySignal captures detected statistical deviations from normal service baseline.
type AnomalySignal struct {
	ID             string      `json:"id"`
	ServiceID      string      `json:"service_id"`
	OrganizationID string      `json:"organization_id"`
	AnomalyType    AnomalyType `json:"anomaly_type"`
	Severity       string      `json:"severity"` // "LOW", "MEDIUM", "HIGH", "CRITICAL"
	BaselineValue  string      `json:"baseline_value"`
	ObservedValue  string      `json:"observed_value"`
	Details        string      `json:"details"`
	DetectedAt     time.Time   `json:"detected_at"`
}

// ProposedStep represents a step in a proposed replanning recovery.
type ProposedStep struct {
	StepID               string           `json:"step_id"`
	RequiredCapability   string           `json:"required_capability"`
	RecommendedServiceID string           `json:"recommended_service_id"`
	EstimatedCost        string           `json:"estimated_cost"` // micro-USDC
	EstimatedLatencyMs   int64            `json:"estimated_latency_ms"`
	Strategy             RecoveryStrategy `json:"strategy"`
	Reason               string           `json:"reason"`
}

// ReplanProposal represents a structured recommendation for adapting a mission plan.
// INVARIANT: This is a proposal ONLY and has zero financial authority.
type ReplanProposal struct {
	MissionID           string           `json:"mission_id"`
	Reason              string           `json:"reason"`
	Strategy            RecoveryStrategy `json:"strategy"`
	ProposedSteps       []ProposedStep   `json:"proposed_steps"`
	EstimatedCost       string           `json:"estimated_cost"` // micro-USDC base units
	EstimatedDurationMs int64            `json:"estimated_duration_ms"`
	Confidence          ConfidenceLevel  `json:"confidence"`
	RequiresHuman       bool             `json:"requires_human"`
	Explanation         string           `json:"explanation"`
	AlternativeServices []string         `json:"alternative_services,omitempty"`
	CreatedAt           time.Time        `json:"created_at"`
}

// LearningTraceEntry represents an event in the mission learning and adaptation history.
type LearningTraceEntry struct {
	Timestamp   time.Time        `json:"timestamp"`
	Event       string           `json:"event"`
	Details     string           `json:"details"`
	Strategy    RecoveryStrategy `json:"strategy,omitempty"`
	ServiceID   string           `json:"service_id,omitempty"`
	Confidence  ConfidenceLevel  `json:"confidence,omitempty"`
	CostDelta   string           `json:"cost_delta,omitempty"`
	Explanation string           `json:"explanation,omitempty"`
}

// MissionIntelligence provides a unified diagnostic and adaptation view of a mission.
type MissionIntelligence struct {
	MissionID             string               `json:"mission_id"`
	CurrentRecommendation *ReplanProposal      `json:"current_recommendation,omitempty"`
	RecoveryAttempts      int                  `json:"recovery_attempts"`
	MaxRecoveryAttempts   int                  `json:"max_recovery_attempts"`
	LearningTrace         []LearningTraceEntry `json:"learning_trace"`
	ObservationsCount     int                  `json:"observations_count"`
	AnomaliesDetected     []AnomalySignal      `json:"anomalies_detected,omitempty"`
	Confidence            ConfidenceLevel      `json:"confidence"`
	Status                string               `json:"status"`
}

