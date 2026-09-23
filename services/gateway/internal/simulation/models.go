package simulation

import (
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

// ExecutionMode represents the runtime execution context.
// INVARIANT: SIMULATION mode MUST strictly prohibit real on-chain actions.
type ExecutionMode string

const (
	ExecutionModeSimulation ExecutionMode = "SIMULATION"
	ExecutionModeLive       ExecutionMode = "LIVE"
)

// SimulationStatus represents the finite lifecycle states of a simulation run.
type SimulationStatus string

const (
	StatusCreated   SimulationStatus = "CREATED"
	StatusPlanning  SimulationStatus = "PLANNING"
	StatusRunning   SimulationStatus = "RUNNING"
	StatusCompleted SimulationStatus = "COMPLETED"
	StatusFailed    SimulationStatus = "FAILED"
	StatusCancelled SimulationStatus = "CANCELLED"
)

// FailureType represents deterministic failure injection modes.
type FailureType string

const (
	FailureNone              FailureType = "NO_FAILURE"
	FailureServiceTimeout    FailureType = "SERVICE_TIMEOUT"
	FailureServiceFailure    FailureType = "SERVICE_FAILURE"
	FailureLowQualityResult  FailureType = "LOW_QUALITY_RESULT"
	FailureQuoteExpiry       FailureType = "QUOTE_EXPIRY"
	FailurePaymentFailure    FailureType = "PAYMENT_FAILURE"
	FailureHighRisk          FailureType = "HIGH_RISK"
	FailureBudgetExhaustion  FailureType = "BUDGET_EXHAUSTION"
	FailureAgentUnavailable  FailureType = "AGENT_UNAVAILABLE"
	FailureMultipleFailures  FailureType = "MULTIPLE_FAILURES"
)

// SimulationScenario defines the parameterized inputs and constraints for a simulation.
type SimulationScenario struct {
	ID                 string            `json:"id"`
	Name               string            `json:"name"`
	Objective          string            `json:"objective"`
	Budget             string            `json:"budget"` // base units (micro-USDC)
	Currency           string            `json:"currency"`
	DeadlineSeconds    int64             `json:"deadline_seconds"`
	AgentID            string            `json:"agent_id"`
	OrganizationID     string            `json:"organization_id"`
	IsSwarm            bool              `json:"is_swarm"`
	FailureProfile     FailureType       `json:"failure_profile"`
	InjectedFailures   []FailureInjection `json:"injected_failures,omitempty"`
	ServiceConstraints []string          `json:"service_constraints,omitempty"`
	PriceMultiplier    float64           `json:"price_multiplier,omitempty"` // default 1.0
	LatencyMultiplier  float64           `json:"latency_multiplier,omitempty"`
	PolicyThreshold    string            `json:"policy_threshold,omitempty"` // custom approval threshold
}

// FailureInjection describes a targeted failure for a specific step or service.
type FailureInjection struct {
	StepID      string      `json:"step_id,omitempty"`
	ServiceID   string      `json:"service_id,omitempty"`
	FailureType FailureType `json:"failure_type"`
	Reason      string      `json:"reason"`
}

// SimulationSnapshot holds a deep-copied, immutable snapshot of the economic environment.
// INVARIANT: Once captured, mutations in simulation NEVER mutate live production state.
type SimulationSnapshot struct {
	SnapshotID         string                   `json:"snapshot_id"`
	Version            string                   `json:"version"`
	ConfigurationVersion string                 `json:"configuration_version"`
	CreatedAt          time.Time                `json:"created_at"`
	OrganizationID     string                   `json:"organization_id"`
	Agents             map[string]*domain.Agent `json:"agents"`
	Services           []*domain.Service        `json:"services"`
	Policies           map[string]*domain.Policy `json:"policies"`
	Reputations        map[string]int64         `json:"reputations"` // bps (e.g. 9800 = 98%)
	LatencyAssumptions map[string]int64         `json:"latency_assumptions"`
	IsFrozen           bool                     `json:"is_frozen"`
}

// ProjectedEconomics models the forecasted financial telemetry.
// INVARIANT: All numbers are marked as PROJECTED.
type ProjectedEconomics struct {
	ProjectedSpend   string  `json:"projected_spend"`   // micro-USDC
	MinimumSpend     string  `json:"minimum_spend"`     // best-case spend
	MaximumSpend     string  `json:"maximum_spend"`     // worst-case spend
	ExpectedSpend    string  `json:"expected_spend"`    // weighted expected spend
	RemainingBudget  string  `json:"remaining_budget"`  // Budget - ProjectedSpend
	NumberOfPayments int     `json:"number_of_payments"`
	NumberOfAgents   int     `json:"number_of_agents"`
	NumberOfServices int     `json:"number_of_services"`
	ApprovalCount    int     `json:"approval_count"`
	RiskScore        int     `json:"risk_score"` // 0-100
	Currency         string  `json:"currency"`
	IsProjected      bool    `json:"is_projected"` // Always true
}

// WorstCaseExposure calculates maximum possible financial liability derived from limits.
type WorstCaseExposure struct {
	MaximumExposure      string `json:"maximum_exposure"` // micro-USDC
	BudgetCeiling        string `json:"budget_ceiling"`
	PerTransactionLimit  string `json:"per_transaction_limit"`
	TotalStepsPlanned    int    `json:"total_steps_planned"`
	ExposureFormula      string `json:"exposure_formula"`
	Explanation          string `json:"explanation"`
}

// SimulationPlanStep captures individual forecasted steps in the execution plan.
type SimulationPlanStep struct {
	StepNumber          int      `json:"step_number"`
	StepID              string   `json:"step_id"`
	AgentID             string   `json:"agent_id"`
	ServiceID           string   `json:"service_id"`
	ServiceName         string   `json:"service_name"`
	Capability          string   `json:"capability"`
	EstimatedCost       string   `json:"estimated_cost"` // micro-USDC
	EstimatedDurationMs int64    `json:"estimated_duration_ms"`
	PolicyDecision      string   `json:"policy_decision"` // ALLOW, DENY, APPROVAL_REQUIRED
	PolicyReasonCode    string   `json:"policy_reason_code"`
	PolicyReason        string   `json:"policy_reason"`
	RiskLevel           string   `json:"risk_level"` // LOW, MEDIUM, HIGH
	RiskFactors         []string `json:"risk_factors"`
	ApprovalRequired    bool     `json:"approval_required"`
	Dependencies        []string `json:"dependencies,omitempty"`
	Explanation         string   `json:"explanation"`
}

// SimulationExecutionPlan represents the sequenced forecast.
type SimulationExecutionPlan struct {
	TotalSteps          int                  `json:"total_steps"`
	EstimatedCost       string               `json:"estimated_cost"`
	EstimatedDurationMs int64                `json:"estimated_duration_ms"`
	MaxDepth            int                  `json:"max_depth"`
	Steps               []SimulationPlanStep `json:"steps"`
}

// SimulationTraceEvent records a single audit step in the simulation timeline.
type SimulationTraceEvent struct {
	EventNumber    int       `json:"event_number"`
	Timestamp      time.Time `json:"timestamp"`
	EventType      string    `json:"event_type"`
	Actor          string    `json:"actor"`
	StepID         string    `json:"step_id,omitempty"`
	Details        string    `json:"details"`
	PolicyDecision string    `json:"policy_decision,omitempty"`
	Amount         string    `json:"amount,omitempty"`
	IsProjected    bool      `json:"is_projected"` // Always true
}

// SimulationRun represents an immutable, reproducible economic simulation run.
type SimulationRun struct {
	ID                   string                   `json:"id"`
	OrganizationID       string                   `json:"organization_id"`
	CreatedBy            string                   `json:"created_by"`
	SourceType           string                   `json:"source_type"` // MISSION or SWARM
	SourceID             string                   `json:"source_id,omitempty"`
	ScenarioID           string                   `json:"scenario_id"`
	Status               SimulationStatus         `json:"status"`
	Seed                 int64                    `json:"seed"`
	ExecutionMode        ExecutionMode            `json:"execution_mode"` // Strictly SIMULATION
	CreatedAt            time.Time                `json:"created_at"`
	StartedAt            *time.Time               `json:"started_at,omitempty"`
	CompletedAt          *time.Time               `json:"completed_at,omitempty"`
	DurationMs           int64                    `json:"duration_ms"`
	Summary              string                   `json:"summary"`
	ConfigurationVersion string                   `json:"configuration_version"`
	SnapshotID           string                   `json:"snapshot_id,omitempty"`
	SnapshotVersion      string                   `json:"snapshot_version,omitempty"`
	Scenario             SimulationScenario       `json:"scenario"`
	Snapshot             *SimulationSnapshot      `json:"snapshot,omitempty"`
	Economics            ProjectedEconomics       `json:"economics"`
	Exposure             WorstCaseExposure        `json:"exposure"`
	Plan                 SimulationExecutionPlan  `json:"plan"`
	Trace                []SimulationTraceEvent   `json:"trace"`
	IsStale              bool                     `json:"is_stale"`
	StaleReason          string                   `json:"stale_reason,omitempty"`
}

// CounterfactualComparison represents side-by-side analysis between baseline and perturbation.
type CounterfactualComparison struct {
	BaselineRunID            string             `json:"baseline_run_id"`
	CounterfactualRunID      string             `json:"counterfactual_run_id"`
	PerturbationDescription string             `json:"perturbation_description"`
	BaselineSpend            string             `json:"baseline_spend"`
	CounterfactualSpend      string             `json:"counterfactual_spend"`
	DeltaSpend               string             `json:"delta_spend"`
	BaselineApprovals        int                `json:"baseline_approvals"`
	CounterfactualApprovals  int                `json:"counterfactual_approvals"`
	DeltaApprovals           int                `json:"delta_approvals"`
	BaselineDurationMs       int64              `json:"baseline_duration_ms"`
	CounterfactualDurationMs int64              `json:"counterfactual_duration_ms"`
	BaselineCompletion       SimulationStatus   `json:"baseline_completion"`
	CounterfactualCompletion SimulationStatus   `json:"counterfactual_completion"`
	RiskChange               string             `json:"risk_change"`
	Explanation              string             `json:"explanation"`
}

// MonteCarloSummary summarizes statistical distributions over N deterministic seeded runs.
type MonteCarloSummary struct {
	RunCount       int     `json:"run_count"`
	CompletionRate float64 `json:"completion_rate"` // e.g. 0.98 = 98%
	AverageSpend   string  `json:"average_spend"`
	MinimumSpend   string  `json:"minimum_spend"`
	MaximumSpend   string  `json:"maximum_spend"`
	P50Spend       string  `json:"p50_spend"`
	P90Spend       string  `json:"p90_spend"`
	P95Spend          string    `json:"p95_spend"`
	AvgDurationMs     int64     `json:"avg_duration_ms"`
	SpendDistribution []float64 `json:"spend_distribution,omitempty"`
	Currency          string    `json:"currency"`
	ModelNotice       string    `json:"model_notice"` // "MODELLED ESTIMATE"
}
