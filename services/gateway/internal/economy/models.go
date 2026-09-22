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

// AgentService represents a registered economic service provided by a peer AI agent.
type AgentService struct {
	AgentID       string            `json:"agent_id"`
	ServiceID     string            `json:"service_id"`
	Capabilities  []string          `json:"capabilities"`
	PricingModel  string            `json:"pricing_model"` // FIXED, VARIABLE, QUOTE_REQUIRED
	BasePrice     string            `json:"base_price"`    // micro-USDC
	MaxPrice      string            `json:"max_price"`     // micro-USDC
	Reputation    int64             `json:"reputation"`    // Basis points (0-10000)
	Availability  string            `json:"availability"`  // ONLINE, BUSY, OFFLINE
	TrustMetadata map[string]string `json:"trust_metadata,omitempty"`
}
