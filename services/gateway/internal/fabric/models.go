package fabric

import (
	"time"
)

// ObjectiveStatus represents the formal lifecycle of an EconomicObjective
type ObjectiveStatus string

const (
	ObjectiveDraft      ObjectiveStatus = "DRAFT"
	ObjectivePlanned    ObjectiveStatus = "PLANNED"
	ObjectiveSimulated  ObjectiveStatus = "SIMULATED"
	ObjectiveApproved   ObjectiveStatus = "APPROVED"
	ObjectiveRunning    ObjectiveStatus = "RUNNING"
	ObjectiveWaiting    ObjectiveStatus = "WAITING"
	ObjectiveDegraded   ObjectiveStatus = "DEGRADED"
	ObjectiveRecovering ObjectiveStatus = "RECOVERING"
	ObjectiveCompleted  ObjectiveStatus = "COMPLETED"
	ObjectiveFailed     ObjectiveStatus = "FAILED"
	ObjectiveCancelled  ObjectiveStatus = "CANCELLED"
	ObjectiveExpired    ObjectiveStatus = "EXPIRED"
)

// ActionAuthorityLevel categorizes the financial risk of an autonomous action
type ActionAuthorityLevel string

const (
	AuthorityNonFinancial       ActionAuthorityLevel = "NON_FINANCIAL"
	AuthorityFinancialRead      ActionAuthorityLevel = "FINANCIAL_READ"
	AuthorityFinancialProposal  ActionAuthorityLevel = "FINANCIAL_PROPOSAL"
	AuthorityFinancialAuthorized ActionAuthorityLevel = "FINANCIAL_AUTHORIZED"
	AuthorityFinancialExecution ActionAuthorityLevel = "FINANCIAL_EXECUTION"
)

// ObjectiveConstraints defines explicit machine-readable boundaries
type ObjectiveConstraints struct {
	Deadline             time.Time `json:"deadline"`
	MaxBudgetUSDC        float64   `json:"max_budget_usdc"`
	MaxSinglePaymentUSDC float64   `json:"max_single_payment_usdc"`
	MaxParallelTasks     int       `json:"max_parallel_tasks"`
	RequiredCapability   string    `json:"required_capability"`
	MinimumConfidence    float64   `json:"minimum_confidence"`
	RequiredPolicyHash   string    `json:"required_policy_hash"`
	ExecutionMode        string    `json:"execution_mode"` // "SIMULATION" or "LIVE"
}

// EconomicObjective is the top-level intent given by a human operator or orchestrator
type EconomicObjective struct {
	ObjectiveID          string               `json:"objective_id"`
	TenantID             string               `json:"tenant_id"`
	Description          string               `json:"description"`
	Owner                string               `json:"owner"`
	Status               ObjectiveStatus      `json:"status"`
	Constraints          ObjectiveConstraints `json:"constraints"`
	EconomicBudgetUSDC   float64              `json:"economic_budget_usdc"`
	RiskTolerance        string               `json:"risk_tolerance"` // "LOW", "MEDIUM", "HIGH"
	RequiredCapabilities []string             `json:"required_capabilities"`
	ActiveBlueprintID    string               `json:"active_blueprint_id,omitempty"`
	ActiveMissionID      string               `json:"active_mission_id,omitempty"`
	ActiveWorkflowID     string               `json:"active_workflow_id,omitempty"`
	CreatedAt            time.Time            `json:"created_at"`
	UpdatedAt            time.Time            `json:"updated_at"`
}

// EconomicEnvelope defines hard financial boundaries for execution (INV-148)
type EconomicEnvelope struct {
	EnvelopeID              string    `json:"envelope_id"`
	ObjectiveID             string    `json:"objective_id"`
	TenantID                string    `json:"tenant_id"`
	MaxTotalCostUSDC        float64   `json:"max_total_cost_usdc"`
	MaxSingleCostUSDC       float64   `json:"max_single_cost_usdc"`
	MaxExposureUSDC         float64   `json:"max_exposure_usdc"`
	MaxParallelExposureUSDC float64   `json:"max_parallel_exposure_usdc"`
	ReservedAmountUSDC      float64   `json:"reserved_amount_usdc"`
	SpentAmountUSDC         float64   `json:"spent_amount_usdc"`
	Expiry                  time.Time `json:"expiry"`
	PolicyHash              string    `json:"policy_hash"`
	CreatedAt               time.Time `json:"created_at"`
}

// RiskEnvelope defines boundaries preventing constitutional degradation (INV-149)
type RiskEnvelope struct {
	EnvelopeID           string   `json:"envelope_id"`
	ObjectiveID          string   `json:"objective_id"`
	TenantID             string   `json:"tenant_id"`
	MaxRiskScore         int      `json:"max_risk_score"`
	AllowedRiskClasses   []string `json:"allowed_risk_classes"`
	EscalationThreshold  int      `json:"escalation_threshold"`
	ConfidenceThreshold  float64  `json:"confidence_threshold"`
	SecurityRequirements []string `json:"security_requirements"`
	CreatedAt            time.Time `json:"created_at"`
}

// ResourceEnvelope defines bounds on operational compute and concurrency (INV-150)
type ResourceEnvelope struct {
	EnvelopeID         string    `json:"envelope_id"`
	ObjectiveID        string    `json:"objective_id"`
	TenantID           string    `json:"tenant_id"`
	MaxWorkers         int       `json:"max_workers"`
	MaxParallelTasks   int       `json:"max_parallel_tasks"`
	MaxProviderCalls   int       `json:"max_provider_calls"`
	MaxAgentDepth      int       `json:"max_agent_depth"`
	MaxRuntimeSeconds  int       `json:"max_runtime_seconds"`
	MaxRetries         int       `json:"max_retries"`
	CreatedAt          time.Time `json:"created_at"`
}

// BlueprintTask represents an operational unit in the blueprint DAG
type BlueprintTask struct {
	TaskID             string   `json:"task_id"`
	TaskName           string   `json:"task_name"`
	RequiredCapability string   `json:"required_capability"`
	Dependencies       []string `json:"dependencies"`
	EstimatedCostUSDC  float64  `json:"estimated_cost_usdc"`
	AssignedAgentID    string   `json:"assigned_agent_id,omitempty"`
	SelectedProvider   string   `json:"selected_provider,omitempty"`
	RequiresPayment    bool     `json:"requires_payment"`
	MilestoneHash      string   `json:"milestone_hash,omitempty"`
}

// ExecutionBlueprint is the immutable compiled plan for an objective
type ExecutionBlueprint struct {
	BlueprintID              string                 `json:"blueprint_id"`
	ObjectiveID              string                 `json:"objective_id"`
	TenantID                 string                 `json:"tenant_id"`
	Version                  int                    `json:"version"`
	Tasks                    []BlueprintTask        `json:"tasks"`
	AgentAssignments         map[string]string      `json:"agent_assignments"`
	ServiceCandidates        []string               `json:"service_candidates"`
	EconomicEnvelope         EconomicEnvelope       `json:"economic_envelope"`
	RiskEnvelope             RiskEnvelope           `json:"risk_envelope"`
	ResourceEnvelope         ResourceEnvelope       `json:"resource_envelope"`
	PolicyReferences         []string               `json:"policy_references"`
	SimulationID             string                 `json:"simulation_id,omitempty"`
	SimulationTimestamp      time.Time              `json:"simulation_timestamp,omitempty"`
	SimulationStale          bool                   `json:"simulation_stale"`
	PolicyHash               string                 `json:"policy_hash"`
	Status                   string                 `json:"status"` // "COMPILED", "SIMULATED", "ACTIVE", "SUPERSEDED"
	CreatedAt                time.Time              `json:"created_at"`
}

// BlueprintVersion tracks historical versions during controlled replanning
type BlueprintVersion struct {
	VersionID                  string                 `json:"version_id"`
	BlueprintID                string                 `json:"blueprint_id"`
	ObjectiveID                string                 `json:"objective_id"`
	Version                    int                    `json:"version"`
	DiffSummary                map[string]interface{} `json:"diff_summary"`
	ReplanReason               string                 `json:"replan_reason"`
	PolicyRevalidationRequired bool                   `json:"policy_revalidation_required"`
	CreatedAt                  time.Time              `json:"created_at"`
}

// DecisionType represents deterministic next-action decisions in the fabric
type DecisionType string

const (
	DecisionContinue  DecisionType = "CONTINUE"
	DecisionWait      DecisionType = "WAIT"
	DecisionRetry     DecisionType = "RETRY"
	DecisionReplan    DecisionType = "REPLAN"
	DecisionFallback  DecisionType = "FALLBACK"
	DecisionEscalate  DecisionType = "ESCALATE"
	DecisionPause     DecisionType = "PAUSE"
	DecisionCancel    DecisionType = "CANCEL"
	DecisionReconcile DecisionType = "RECONCILE"
)

// FabricDecision is the auditable decision record produced by the adaptive loop
type FabricDecision struct {
	DecisionID         string       `json:"decision_id"`
	ObjectiveID        string       `json:"objective_id"`
	TenantID           string       `json:"tenant_id"`
	DecisionType       DecisionType `json:"decision_type"`
	ReasonCode         string       `json:"reason_code"`
	Explanation        string       `json:"explanation"`
	InputsHash         string       `json:"inputs_hash"`
	FinancialAuthority string       `json:"financial_authority"` // Fixed strictly to "UNCHANGED" (INV-141)
	CreatedAt          time.Time    `json:"created_at"`
}

// FabricCausalLink links related events across domains (INV-136)
type FabricCausalLink struct {
	LinkID          string    `json:"link_id"`
	ObjectiveID     string    `json:"objective_id"`
	SourceNodeType  string    `json:"source_node_type"`
	SourceNodeID    string    `json:"source_node_id"`
	TargetNodeType  string    `json:"target_node_type"`
	TargetNodeID    string    `json:"target_node_id"`
	Relation        string    `json:"relation"`
	CausedByEventID string    `json:"caused_by_event_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

// UnifiedTraceNode represents one stage in the 18-node complete economic trace
type UnifiedTraceNode struct {
	ID            string    `json:"id"`
	Stage         string    `json:"stage"` // "OBJECTIVE", "BLUEPRINT", "SIMULATION", "MISSION", "WORKFLOW", "TASK", "AGENT", "SERVICE", "CONTRACT", "POLICY", "RISK", "APPROVAL", "RESERVATION", "PAYMENT", "EXECUTION", "AGENTVAULT", "ARC", "RECONCILIATION", "OBSERVATION", "LEARNING"
	Label         string    `json:"label"`
	State         string    `json:"state"`
	SourceOfTruth string    `json:"source_of_truth"`
	Hash          string    `json:"hash,omitempty"`
	Timestamp     time.Time `json:"timestamp"`
}

// UnifiedEconomicTrace is the end-to-end audit trace from human intent to on-chain settlement
type UnifiedEconomicTrace struct {
	ObjectiveID string             `json:"objective_id"`
	TenantID    string             `json:"tenant_id"`
	Nodes       []UnifiedTraceNode `json:"nodes"`
	GeneratedAt time.Time          `json:"generated_at"`
}

// WhyThisExplanation explains deterministic provider selection
type WhyThisExplanation struct {
	ObjectiveID        string   `json:"objective_id"`
	SelectedProvider   string   `json:"selected_provider"`
	SelectionFactors   []string `json:"selection_factors"`
	QuotePriceUSDC     float64  `json:"quote_price_usdc"`
	PolicyDecision     string   `json:"policy_decision"`
	ApprovalStatus     string   `json:"approval_status"`
	TreasuryStatus     string   `json:"treasury_status"`
	RejectedCandidates []struct {
		ProviderID string `json:"provider_id"`
		Reason     string `json:"reason"`
	} `json:"rejected_candidates"`
}

// WhyNotExplanation explains why an action was blocked
type WhyNotExplanation struct {
	ObjectiveID     string   `json:"objective_id"`
	RequestedAction string   `json:"requested_action"`
	BlockReason     string   `json:"block_reason"`
	PolicyViolated  string   `json:"policy_violated,omitempty"`
	NextSafeActions []string `json:"next_safe_actions"`
}

// AutonomyMetrics measures real dimensions of autonomy without vague scores
type AutonomyMetrics struct {
	TenantID              string  `json:"tenant_id"`
	AutomationPercentage  float64 `json:"automation_percentage"`  // % steps executed without human intervention
	RecoveryPercentage    float64 `json:"recovery_percentage"`    // % failures automatically recovered
	HumanEscalationCount  int     `json:"human_escalation_count"`
	PolicyBlockCount      int     `json:"policy_block_count"`
	FinancialActionCount  int     `json:"financial_action_count"`
	SimulatedActionCount  int     `json:"simulated_action_count"`
	TotalObjectives       int     `json:"total_objectives"`
	ActiveObjectives      int     `json:"active_objectives"`
}

// SimulationCompareResult compares simulation projections with live execution readiness
type SimulationCompareResult struct {
	SimulationID        string    `json:"simulation_id"`
	SimulationTimestamp time.Time `json:"simulation_timestamp"`
	ExpectedDuration    int       `json:"expected_duration_seconds"`
	ExpectedCostUSDC    float64   `json:"expected_cost_usdc"`
	MaxExposureUSDC     float64   `json:"max_exposure_usdc"`
	PolicyDecision      string    `json:"policy_decision"`
	RiskScore           int       `json:"risk_score"`
	SimulationStale     bool      `json:"simulation_stale"`
	StaleReasons        []string  `json:"stale_reasons,omitempty"`
}

// DryRunResult returns projected changes without mutating state
type DryRunResult struct {
	IsDryRun       bool                   `json:"is_dry_run"`
	Action         string                 `json:"action"`
	WouldChange    map[string]interface{} `json:"would_change"`
	WouldNotChange []string               `json:"would_not_change"`
	FinancialDelta float64                `json:"financial_delta_usdc"`
	PolicyImpact   string                 `json:"policy_impact"`
}
