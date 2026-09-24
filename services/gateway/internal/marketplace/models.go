package marketplace

import (
	"time"
)

// ListingStatus represents the lifecycle state of a ServiceListing.
type ListingStatus string

const (
	ListingStatusDraft     ListingStatus = "DRAFT"
	ListingStatusActive    ListingStatus = "ACTIVE"
	ListingStatusPaused    ListingStatus = "PAUSED"
	ListingStatusSuspended ListingStatus = "SUSPENDED"
	ListingStatusRetired   ListingStatus = "RETIRED"
)

// PricingModel represents the machine-readable pricing model for a service.
type PricingModel string

const (
	PricingFixed       PricingModel = "FIXED"
	PricingPerTask     PricingModel = "PER_TASK"
	PricingPerUnit     PricingModel = "PER_UNIT"
	PricingMilestone   PricingModel = "MILESTONE"
	PricingTimeBased   PricingModel = "TIME_BASED"
	PricingUsageBased  PricingModel = "USAGE_BASED"
	PricingNegotiated  PricingModel = "NEGOTIATED"
)

// OpportunityStatus represents the lifecycle state of a MarketplaceOpportunity.
type OpportunityStatus string

const (
	OpportunityStatusOpen        OpportunityStatus = "OPEN"
	OpportunityStatusMatching    OpportunityStatus = "MATCHING"
	OpportunityStatusQuoting     OpportunityStatus = "QUOTING"
	OpportunityStatusNegotiating OpportunityStatus = "NEGOTIATING"
	OpportunityStatusAwarded     OpportunityStatus = "AWARDED"
	OpportunityStatusExecuting   OpportunityStatus = "EXECUTING"
	OpportunityStatusVerifying   OpportunityStatus = "VERIFYING"
	OpportunityStatusSettling    OpportunityStatus = "SETTLING"
	OpportunityStatusCompleted   OpportunityStatus = "COMPLETED"
	OpportunityStatusCancelled   OpportunityStatus = "CANCELLED"
	OpportunityStatusDisputed    OpportunityStatus = "DISPUTED"
	OpportunityStatusExpired      OpportunityStatus = "EXPIRED"
	OpportunityStatusFailed       OpportunityStatus = "FAILED"
)

// AvailabilityStatus represents the real-time operational availability of a provider.
type AvailabilityStatus string

const (
	AvailabilityAvailable   AvailabilityStatus = "AVAILABLE"
	AvailabilityLimited     AvailabilityStatus = "LIMITED"
	AvailabilityBusy        AvailabilityStatus = "BUSY"
	AvailabilityOffline     AvailabilityStatus = "OFFLINE"
	AvailabilityMaintenance AvailabilityStatus = "MAINTENANCE"
)

// ServiceListing represents a capability offered by a provider agent in the marketplace.
type ServiceListing struct {
	ListingID                 string                 `json:"listing_id"`
	TenantID                  string                 `json:"tenant_id"`
	ProviderAgentID           string                 `json:"provider_agent_id"`
	CapabilityID              string                 `json:"capability_id"`
	Title                     string                 `json:"title"`
	Description               string                 `json:"description"`
	InputSchema               map[string]interface{} `json:"input_schema,omitempty"`
	OutputSchema              map[string]interface{} `json:"output_schema,omitempty"`
	PricingModel              PricingModel           `json:"pricing_model"`
	BasePriceUSDC             string                 `json:"base_price_usdc"`
	Availability              AvailabilityStatus     `json:"availability"`
	EstimatedLatencyMS        int                    `json:"estimated_latency_ms"`
	QualityRequirements       map[string]interface{} `json:"quality_requirements,omitempty"`
	SupportedProtocolVersions []string               `json:"supported_protocol_versions"`
	VerificationMethod        string                 `json:"verification_method"`
	Status                    ListingStatus          `json:"status"`
	MaxConcurrentJobs         int                    `json:"max_concurrent_jobs,omitempty"`
	RateLimitPerMinute        int                    `json:"rate_limit_per_minute,omitempty"`
	CreatedAt                 time.Time              `json:"created_at"`
	UpdatedAt                 time.Time              `json:"updated_at"`
	Version                   int                    `json:"version"`
}

// MarketplaceOpportunity represents an authorized unit of requested work.
type MarketplaceOpportunity struct {
	OpportunityID        string                 `json:"opportunity_id"`
	TenantID             string                 `json:"tenant_id"`
	RequesterID          string                 `json:"requester_id"`
	Capability           string                 `json:"capability"`
	Title                string                 `json:"title"`
	Requirements         map[string]interface{} `json:"requirements,omitempty"`
	Deadline             time.Time              `json:"deadline"`
	BudgetConstraintUSDC string                 `json:"budget_constraint_usdc"`
	QualityRequirement   map[string]interface{} `json:"quality_requirement,omitempty"`
	RiskRequirement      map[string]interface{} `json:"risk_requirement,omitempty"`
	Constraints          map[string]interface{} `json:"constraints,omitempty"`
	Status               OpportunityStatus      `json:"status"`
	AwardedProviderID    string                 `json:"awarded_provider_id,omitempty"`
	AwardedQuoteID       string                 `json:"awarded_quote_id,omitempty"`
	ContractID           string                 `json:"contract_id,omitempty"`
	CreatedAt            time.Time              `json:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at"`
}

// CandidateMatch represents an individual provider evaluated by the Matching Engine.
type CandidateMatch struct {
	ProviderID            string                 `json:"provider_id"`
	ListingID             string                 `json:"listing_id"`
	CapabilityMatch       bool                   `json:"capability_match"`
	Availability          AvailabilityStatus     `json:"availability"`
	EstimatedCostUSDC     string                 `json:"estimated_cost_usdc"`
	EstimatedLatencyMS    int                    `json:"estimated_latency_ms"`
	HistoricalSuccessRate float64                `json:"historical_success_rate"`
	ContextualScore       float64                `json:"contextual_score"`
	RiskScore             int                    `json:"risk_score"`
	PolicyCompatible      bool                   `json:"policy_compatible"`
	Confidence            float64                `json:"confidence"`
	SampleSize            int                    `json:"sample_size"`
	Rank                  int                    `json:"rank"`
	Score                 float64                `json:"score"`
	MatchReasons          []string               `json:"match_reasons"`
	Disqualification      string                 `json:"disqualification,omitempty"`
}

// MatchExplanation provides structured, human- and machine-readable transparency for provider selection.
type MatchExplanation struct {
	OpportunityID       string            `json:"opportunity_id"`
	SelectedProviderID  string            `json:"selected_provider_id"`
	SelectedListingID   string            `json:"selected_listing_id"`
	CapabilityMatch     string            `json:"capability_match"`     // e.g. "MATCH"
	DeadlineFeasibility string            `json:"deadline_feasibility"` // e.g. "FEASIBLE"
	PolicyStatus        string            `json:"policy_status"`        // e.g. "ALLOWED"
	RiskStatus          string            `json:"risk_status"`          // e.g. "WITHIN_LIMIT"
	AvailabilityStatus  string            `json:"availability_status"`  // e.g. "AVAILABLE"
	QuoteAmountUSDC     string            `json:"quote_amount_usdc"`
	HistoricalSuccess   string            `json:"historical_success"`
	SampleSize          int               `json:"sample_size"`
	TieBreakReason      string            `json:"tie_break_reason"`
	AlternativeRejected map[string]string `json:"alternatives_rejected,omitempty"`
}

// CandidateSet contains the complete ranked outcome of a matching execution.
type CandidateSet struct {
	OpportunityID   string           `json:"opportunity_id"`
	Candidates      []CandidateMatch `json:"candidates"`
	SelectedMatch   *CandidateMatch  `json:"selected_match,omitempty"`
	Explanation     MatchExplanation `json:"explanation"`
	EvaluatedAt     time.Time        `json:"evaluated_at"`
	DeterministicID string           `json:"deterministic_id"`
}

// MarketplaceMetrics tracks multi-dimensional, contextual performance for an agent.
type MarketplaceMetrics struct {
	MetricID             string    `json:"metric_id"`
	TenantID             string    `json:"tenant_id"`
	ProviderAgentID      string    `json:"provider_agent_id"`
	CapabilityID         string    `json:"capability_id"`
	SampleSize           int       `json:"sample_size"`
	CompletionRate       float64   `json:"completion_rate"`
	FailureRate          float64   `json:"failure_rate"`
	TimeoutRate          float64   `json:"timeout_rate"`
	AvgDurationMS        int       `json:"avg_duration_ms"`
	P50DurationMS        int       `json:"p50_duration_ms"`
	P95DurationMS        int       `json:"p95_duration_ms"`
	QuoteAccuracy        float64   `json:"quote_accuracy"`
	ResultAcceptanceRate float64   `json:"result_acceptance_rate"`
	DisputeRate          float64   `json:"dispute_rate"`
	CancellationRate     float64   `json:"cancellation_rate"`
	UpdatedAt            time.Time `json:"updated_at"`
}

// MarketplaceAnomaly records suspicious behavior signals (wash transactions, self-dealing, sybils).
type MarketplaceAnomaly struct {
	AnomalyID       string                 `json:"anomaly_id"`
	TenantID        string                 `json:"tenant_id"`
	ProviderAgentID string                 `json:"provider_agent_id"`
	AnomalyType     string                 `json:"anomaly_type"`
	Severity        string                 `json:"severity"` // "LOW", "MEDIUM", "HIGH", "CRITICAL"
	Description     string                 `json:"description"`
	Evidence        map[string]interface{} `json:"evidence"`
	CreatedAt       time.Time              `json:"created_at"`
}

// MarketplaceTrustModel exposes multi-dimensional trust facts without collapsing into arbitrary stars.
type MarketplaceTrustModel struct {
	AgentID               string                `json:"agent_id"`
	IdentityVerified      bool                  `json:"identity_verified"`
	Organization          string                `json:"organization"`
	TotalCompletedJobs    int                   `json:"total_completed_jobs"`
	OverallDisputeRate    float64               `json:"overall_dispute_rate"`
	SecurityCompliant     bool                  `json:"security_compliant"`
	ContextualPerformance []*MarketplaceMetrics `json:"contextual_performance"`
	ConcentrationWarning  bool                  `json:"concentration_warning"`
	ActiveAnomalies       []string              `json:"active_anomalies"`
}

// MarketplaceSearchQuery provides structured filtering for listings and capabilities.
type MarketplaceSearchQuery struct {
	Capability      string  `json:"capability,omitempty"`
	MaxPriceUSDC    float64 `json:"max_price_usdc,omitempty"`
	MaxLatencyMS    int     `json:"max_latency_ms,omitempty"`
	Availability    string  `json:"availability,omitempty"`
	ProtocolVersion string  `json:"protocol_version,omitempty"`
	TenantID        string  `json:"tenant_id,omitempty"`
	MinReputation   float64 `json:"min_reputation,omitempty"`
}

// MarketplaceHealth aggregates operational liquidity and matching health without making financial claims.
type MarketplaceHealth struct {
	ActiveProviders       int     `json:"active_providers"`
	ActiveListings        int     `json:"active_listings"`
	OpenOpportunities     int     `json:"open_opportunities"`
	QuoteResponseRate     float64 `json:"quote_response_rate"`
	MedianQuoteCount      int     `json:"median_quote_count"`
	AvgTimeToAwardSeconds int     `json:"avg_time_to_award_seconds"`
	UnfilledOpportunities int     `json:"unfilled_opportunities"`
}

// MarketplaceSimulationRequest represents a counterfactual scenario query.
type MarketplaceSimulationRequest struct {
	ScenarioType         string                 `json:"scenario_type"` // e.g. "PROVIDER_OUTAGE", "PRICE_SURGE", "CAPACITY_DROP"
	TargetProviderID     string                 `json:"target_provider_id,omitempty"`
	PriceIncreasePercent float64                `json:"price_increase_percent,omitempty"`
	RemovedProviders     []string               `json:"removed_providers,omitempty"`
	OpportunityContext   MarketplaceOpportunity `json:"opportunity_context"`
}

// MarketplaceSimulationResult returns the projected outcome of a simulation without mutating live state.
type MarketplaceSimulationResult struct {
	ScenarioType         string   `json:"scenario_type"`
	Feasible             bool     `json:"feasible"`
	ProjectedWinnerID    string   `json:"projected_winner_id,omitempty"`
	ProjectedCostUSDC    string   `json:"projected_cost_usdc"`
	ProjectedDurationMS  int      `json:"projected_duration_ms"`
	RemainingCandidateCount int   `json:"remaining_candidate_count"`
	WorstCaseExposureUSDC string `json:"worst_case_exposure_usdc"`
	PolicyClearance      string   `json:"policy_clearance"`
	SimulationOnlyLabel  string   `json:"simulation_only_label"` // "SIMULATION ONLY: NO MONEY MOVED (INV-192)"
}
