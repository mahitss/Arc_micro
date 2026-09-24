package operations

import (
	"time"
)

// Freshness indicates the data freshness of read model projections.
type Freshness string

const (
	FreshnessFresh    Freshness = "FRESH"
	FreshnessStale    Freshness = "STALE"
	FreshnessDegraded Freshness = "DEGRADED"
	FreshnessUnknown  Freshness = "UNKNOWN"
)

// OperationsSnapshot is the top-level aggregated read-model projection.
// It is explicitly NOT the source of financial truth.
type OperationsSnapshot struct {
	SnapshotID           string                 `json:"snapshot_id"`
	TenantID             string                 `json:"tenant_id"`
	SnapshotVersion      int                    `json:"snapshot_version"`
	Freshness            Freshness              `json:"freshness"`
	ActiveWorkflows      int                    `json:"active_workflows"`
	QueuedWorkflows      int                    `json:"queued_workflows"`
	BlockedWorkflows     int                    `json:"blocked_workflows"`
	FailedWorkflows      int                    `json:"failed_workflows"`
	RecoveringWorkflows  int                    `json:"recovering_workflows"`
	ActiveAgents         int                    `json:"active_agents"`
	AvailableWorkers     int                    `json:"available_workers"`
	TreasuryState        string                 `json:"treasury_state"`
	LiquidityState       string                 `json:"liquidity_state"`
	ClearingState        string                 `json:"clearing_state"`
	SecurityState        string                 `json:"security_state"`
	PolicyState          string                 `json:"policy_state"`
	ArcState             string                 `json:"arc_state"`
	IncidentCount        int                    `json:"incident_count"`
	GeneratedAt          time.Time              `json:"generated_at"`
	Metadata             map[string]interface{} `json:"metadata,omitempty"`
}

// DecisionType represents deterministic supervisory decisions.
type DecisionType string

const (
	DecisionRun       DecisionType = "RUN"
	DecisionWait      DecisionType = "WAIT"
	DecisionRetry     DecisionType = "RETRY"
	DecisionRecover   DecisionType = "RECOVER"
	DecisionReplan    DecisionType = "REPLAN"
	DecisionEscalate  DecisionType = "ESCALATE"
	DecisionPause     DecisionType = "PAUSE"
	DecisionCancel    DecisionType = "CANCEL"
	DecisionReconcile DecisionType = "RECONCILE"
)

// OperationsDecision models an auditable supervisory decision.
type OperationsDecision struct {
	DecisionID         string                 `json:"decision_id"`
	TenantID           string                 `json:"tenant_id"`
	WorkflowID         string                 `json:"workflow_id"`
	StepID             string                 `json:"step_id,omitempty"`
	DecisionType       DecisionType           `json:"decision_type"`
	ReasonCode         string                 `json:"reason_code"`
	InputsHash         string                 `json:"inputs_hash"`
	StateVersion       int                    `json:"state_version"`
	Actor              string                 `json:"actor"`
	Evidence           string                 `json:"evidence,omitempty"`
	Constraints        map[string]interface{} `json:"constraints,omitempty"`
	Action             string                 `json:"action,omitempty"`
	FinancialAuthority string                 `json:"financial_authority"` // ALWAYS "UNCHANGED"
	Timestamp          time.Time              `json:"timestamp"`
}

// PriorityFactors defines inputs into the deterministic priority calculation.
type PriorityFactors struct {
	DeadlineProximitySeconds int64
	DependencyCriticality    int
	WorkflowAgeSeconds       int64
	IsRecovery               bool
	TenantPriorityTier       int
	ResourceAvailability     float64
}

// OperationalBudget bounds the operational resource consumption of workflows.
// It is explicitly separate from financial spending budgets.
type OperationalBudget struct {
	MaxActiveWorkflows int           `json:"max_active_workflows"`
	MaxConcurrentTasks int           `json:"max_concurrent_tasks"`
	MaxRetries         int           `json:"max_retries"`
	MaxRuntime         time.Duration `json:"max_runtime"`
	MaxProviderCalls   int           `json:"max_provider_calls"`
	MaxCallbacks       int           `json:"max_callbacks"`
	MaxRecoveryTries   int           `json:"max_recovery_tries"`
}

// DefaultOperationalBudget provides sensible, bounded operational limits.
func DefaultOperationalBudget() OperationalBudget {
	return OperationalBudget{
		MaxActiveWorkflows: 50,
		MaxConcurrentTasks: 10,
		MaxRetries:         5,
		MaxRuntime:         24 * time.Hour,
		MaxProviderCalls:   100,
		MaxCallbacks:       50,
		MaxRecoveryTries:   3,
	}
}

// OperationPlan defines the operational execution steps and dependencies of a workflow.
type OperationPlan struct {
	PlanID               string                 `json:"plan_id"`
	TenantID             string                 `json:"tenant_id"`
	WorkflowID           string                 `json:"workflow_id"`
	PlanVersion          int                    `json:"plan_version"`
	State                string                 `json:"state"`
	Steps                []PlanStep             `json:"steps"`
	Dependencies         map[string][]string    `json:"dependencies"`
	ResourceRequirements map[string]interface{} `json:"resource_requirements,omitempty"`
	Deadlines            map[string]time.Time   `json:"deadlines,omitempty"`
	RetryPolicies        map[string]interface{} `json:"retry_policies,omitempty"`
	CheckpointReferences []string               `json:"checkpoint_references,omitempty"`
	CreatedAt            time.Time              `json:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at"`
}

// PlanStep represents a single planned step within an OperationPlan.
type PlanStep struct {
	StepID      string                 `json:"step_id"`
	Sequence    int                    `json:"sequence"`
	StepType    string                 `json:"step_type"`
	ProviderID  string                 `json:"provider_id,omitempty"`
	IsFinancial bool                   `json:"is_financial"`
	Timeout     time.Duration          `json:"timeout"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// OperationPlanDiff records differences when an OperationPlan is modified.
type OperationPlanDiff struct {
	DiffID                      string    `json:"diff_id"`
	TenantID                    string    `json:"tenant_id"`
	PlanID                      string    `json:"plan_id"`
	FromVersion                 int       `json:"from_version"`
	ToVersion                   int       `json:"to_version"`
	AddedSteps                  []string  `json:"added_steps,omitempty"`
	RemovedSteps                []string  `json:"removed_steps,omitempty"`
	ChangedDependencies         []string  `json:"changed_dependencies,omitempty"`
	ChangedDeadlines            []string  `json:"changed_deadlines,omitempty"`
	ChangedProviders            []string  `json:"changed_providers,omitempty"`
	PolicyRevalidationRequired  bool      `json:"policy_revalidation_required"`
	CreatedAt                   time.Time `json:"created_at"`
}

// QueueName represents durable queue categories.
type QueueName string

const (
	QueueMission        QueueName = "mission"
	QueueSwarm          QueueName = "swarm"
	QueueTask           QueueName = "task"
	QueueRecovery       QueueName = "recovery"
	QueueReconciliation QueueName = "reconciliation"
	QueueCallback       QueueName = "callback"
	QueueScheduled      QueueName = "scheduled"
	QueueIncident       QueueName = "incident"
)

// QueueItemState models lifecycle states of durable queue items.
type QueueItemState string

const (
	QueueItemQueued       QueueItemState = "QUEUED"
	QueueItemInFlight     QueueItemState = "IN_FLIGHT"
	QueueItemCompleted    QueueItemState = "COMPLETED"
	QueueItemFailed       QueueItemState = "FAILED"
	QueueItemDeadLettered QueueItemState = "DEAD_LETTERED"
)

// QueueItem models an item in a durable operations queue.
type QueueItem struct {
	ItemID              string                 `json:"item_id"`
	TenantID            string                 `json:"tenant_id"`
	QueueName           QueueName              `json:"queue_name"`
	Priority            int                    `json:"priority"`
	IdempotencyKey      string                 `json:"idempotency_key"`
	WorkflowID          string                 `json:"workflow_id,omitempty"`
	StepID              string                 `json:"step_id,omitempty"`
	Payload             map[string]interface{} `json:"payload"`
	State               QueueItemState         `json:"state"`
	Attempts            int                    `json:"attempts"`
	MaxAttempts         int                    `json:"max_attempts"`
	VisibilityExpiresAt *time.Time             `json:"visibility_expires_at,omitempty"`
	LeaseOwner          string                 `json:"lease_owner,omitempty"`
	CreatedAt           time.Time              `json:"created_at"`
	UpdatedAt           time.Time              `json:"updated_at"`
}

// DeadLetterItem stores items that exhausted retry or experienced unrecoverable errors.
type DeadLetterItem struct {
	DeadLetterID    string                 `json:"dead_letter_id"`
	TenantID        string                 `json:"tenant_id"`
	ItemID          string                 `json:"item_id"`
	QueueName       QueueName              `json:"queue_name"`
	WorkflowID      string                 `json:"workflow_id,omitempty"`
	Reason          string                 `json:"reason"`
	Evidence        string                 `json:"evidence,omitempty"`
	OriginalPayload map[string]interface{} `json:"original_payload"`
	AttemptHistory  []AttemptRecord        `json:"attempt_history,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
}

// AttemptRecord logs a failed execution attempt before dead-lettering.
type AttemptRecord struct {
	Attempt   int       `json:"attempt"`
	Timestamp time.Time `json:"timestamp"`
	WorkerID  string    `json:"worker_id"`
	Error     string    `json:"error"`
}

// HealthState enumerates deterministic component health states.
type HealthState string

const (
	HealthStateHealthy  HealthState = "HEALTHY"
	HealthStateDegraded HealthState = "DEGRADED"
	HealthStateBlocked  HealthState = "BLOCKED"
	HealthStateCritical HealthState = "CRITICAL"
	HealthStateUnknown  HealthState = "UNKNOWN"
)

// ArcVerificationState explicitly captures blockchain verification truth.
type ArcVerificationState struct {
	RPCConnected             bool      `json:"rpc_connected"`
	VaultDeployed            bool      `json:"vault_deployed"`
	LiveExecutionEnabled     bool      `json:"live_execution_enabled"`
	RecentSettlementVerified bool      `json:"recent_settlement_verified"`
	StatusText               string    `json:"status_text"` // "AVAILABLE", "UNVERIFIED", "NOT_DEPLOYED", "DEGRADED"
	LastCheckedAt            time.Time `json:"last_checked_at"`
}

// ComponentHealth represents health probe status of a single system component.
type ComponentHealth struct {
	Name        string      `json:"name"`
	State       HealthState `json:"state"`
	Message     string      `json:"message"`
	LastProbeAt time.Time   `json:"last_probe_at"`
}

// OperationsHealth is the composite system health read-model.
type OperationsHealth struct {
	OverallState HealthState                `json:"overall_state"`
	Components   map[string]ComponentHealth `json:"components"`
	Arc          ArcVerificationState       `json:"arc"`
	GeneratedAt  time.Time                  `json:"generated_at"`
}

// IncidentSeverity categorizes operational incident impact.
type IncidentSeverity string

const (
	SeverityInfo     IncidentSeverity = "INFO"
	SeverityLow      IncidentSeverity = "LOW"
	SeverityMedium   IncidentSeverity = "MEDIUM"
	SeverityHigh     IncidentSeverity = "HIGH"
	SeverityCritical IncidentSeverity = "CRITICAL"
)

// IncidentState represents lifecycle progression of operational incidents.
type IncidentState string

const (
	IncidentStateDetected      IncidentState = "DETECTED"
	IncidentStateTriaged       IncidentState = "TRIAGED"
	IncidentStateInvestigating IncidentState = "INVESTIGATING"
	IncidentStateMitigating    IncidentState = "MITIGATING"
	IncidentStateMonitoring    IncidentState = "MONITORING"
	IncidentStateResolved      IncidentState = "RESOLVED"
	IncidentStateClosed        IncidentState = "CLOSED"
)

// OperationsIncident captures correlated operational failures.
type OperationsIncident struct {
	IncidentID         string                 `json:"incident_id"`
	TenantID           string                 `json:"tenant_id"`
	Severity           IncidentSeverity       `json:"severity"`
	Category           string                 `json:"category"`
	State              IncidentState          `json:"state"`
	RootCause          string                 `json:"root_cause,omitempty"`
	AffectedWorkflows  []string               `json:"affected_workflows,omitempty"`
	AffectedResources  []string               `json:"affected_resources,omitempty"`
	MitigationActions  []string               `json:"mitigation_actions,omitempty"`
	CorrelationID      string                 `json:"correlation_id,omitempty"`
	DetectedAt         time.Time              `json:"detected_at"`
	TriagedAt          *time.Time             `json:"triaged_at,omitempty"`
	ResolvedAt         *time.Time             `json:"resolved_at,omitempty"`
	ClosedAt           *time.Time             `json:"closed_at,omitempty"`
	Metadata           map[string]interface{} `json:"metadata,omitempty"`
}

// CircuitBreakerState models circuit breaker states.
type CircuitBreakerState string

const (
	CircuitClosed   CircuitBreakerState = "CLOSED"
	CircuitOpen     CircuitBreakerState = "OPEN"
	CircuitHalfOpen CircuitBreakerState = "HALF_OPEN"
)

// CircuitBreaker guards external providers or errant agents against cascading failure.
type CircuitBreaker struct {
	BreakerID       string              `json:"breaker_id"`
	TenantID        string              `json:"tenant_id"`
	TargetType      string              `json:"target_type"` // PROVIDER, AGENT, SERVICE
	TargetID        string              `json:"target_id"`
	State           CircuitBreakerState `json:"state"`
	FailureCount    int                 `json:"failure_count"`
	SuccessCount    int                 `json:"success_count"`
	Threshold       int                 `json:"threshold"`
	CooldownSeconds int                 `json:"cooldown_seconds"`
	LastFailureAt   *time.Time          `json:"last_failure_at,omitempty"`
	NextProbeAt     *time.Time          `json:"next_probe_at,omitempty"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`
}

// CausalLink tracks causal relationships between events ("Why did this happen?").
type CausalLink struct {
	LinkID           string    `json:"link_id"`
	TenantID         string    `json:"tenant_id"`
	EventID          string    `json:"event_id"`
	CausedByEventID  string    `json:"caused_by_event_id,omitempty"`
	CausalType       string    `json:"causal_type"` // TIMEOUT, LEASE_EXPIRED, RETRY, REPLAN, POLICY_DENY, etc.
	Trigger          string    `json:"trigger"`
	Evidence         string    `json:"evidence,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

// Explanation provides a structured explanation for a decision or event.
type Explanation struct {
	CurrentState       string                 `json:"current_state"`
	PreviousState      string                 `json:"previous_state,omitempty"`
	Trigger            string                 `json:"trigger"`
	Evidence           string                 `json:"evidence"`
	Policy             string                 `json:"policy,omitempty"`
	Risk               string                 `json:"risk,omitempty"`
	ResourceConstraint string                 `json:"resource_constraint,omitempty"`
	EconomicConstraint string                 `json:"economic_constraint,omitempty"`
	Decision           DecisionType           `json:"decision"`
	NextAction         string                 `json:"next_action"`
	FinancialAuthority string                 `json:"financial_authority"` // "UNCHANGED"
}

// NextAction models a deterministic prediction of the next operational step.
type NextAction struct {
	Action                DecisionType `json:"action"`
	Reason                string       `json:"reason"`
	EstimatedDelaySeconds int          `json:"estimated_delay_seconds"`
	RequiresHuman         bool         `json:"requires_human"`
}

// OperationalGraphNode models a node in the operational topology graph.
type OperationalGraphNode struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"` // MISSION, WORKFLOW, TASK, AGENT, SERVICE, WORKER, POLICY, APPROVAL, TREASURY, PAYMENT, INCIDENT, EVENT
	Label      string                 `json:"label"`
	State      string                 `json:"state"`
	AgeSeconds int64                  `json:"age_seconds"`
	Owner      string                 `json:"owner,omitempty"`
	WorkerID   string                 `json:"worker_id,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

// OperationalGraphEdge models an edge in the operational topology graph.
type OperationalGraphEdge struct {
	Source   string `json:"source"`
	Target   string `json:"target"`
	Relation string `json:"relation"` // DEPENDS_ON, EXECUTED_BY, HIRED, GOVERNED_BY, APPROVED_BY, RESERVED_FROM, PAYS, RECOVERED_BY, TRIGGERED, PRODUCED
}

// OperationalGraph represents the unified operational topology. Read-only.
type OperationalGraph struct {
	Nodes       []OperationalGraphNode `json:"nodes"`
	Edges       []OperationalGraphEdge `json:"edges"`
	GeneratedAt time.Time              `json:"generated_at"`
}

// ReplayTraceEntry represents a historical step in a workflow replay.
type ReplayTraceEntry struct {
	Sequence           int                    `json:"sequence"`
	StepID             string                 `json:"step_id"`
	StepType           string                 `json:"step_type"`
	State              string                 `json:"state"`
	WorkerID           string                 `json:"worker_id,omitempty"`
	Timestamp          time.Time              `json:"timestamp"`
	Decision           DecisionType           `json:"decision,omitempty"`
	Evidence           string                 `json:"evidence,omitempty"`
	FinancialBarrierOk bool                   `json:"financial_barrier_ok"`
	Metadata           map[string]interface{} `json:"metadata,omitempty"`
}

// OperationalReplay holds the complete historical replay of a workflow. Read-only.
type OperationalReplay struct {
	WorkflowID  string             `json:"workflow_id"`
	TenantID    string             `json:"tenant_id"`
	TotalSteps  int                `json:"total_steps"`
	FinalState  string             `json:"final_state"`
	Entries     []ReplayTraceEntry `json:"entries"`
	ReplayedAt  time.Time          `json:"replayed_at"`
}

// SystemStateAtSnapshot models the reconstructed state at historical timestamp T.
type SystemStateAtSnapshot struct {
	Timestamp            time.Time                 `json:"timestamp"`
	TenantID             string                    `json:"tenant_id"`
	ReconstructedFrom    string                    `json:"reconstructed_from"` // "EVENTS_AND_CHECKPOINTS"
	ActiveWorkflows      int                       `json:"active_workflows"`
	WorkflowStates       map[string]string         `json:"workflow_states"`
	ActiveWorkers        []string                  `json:"active_workers"`
	Incidents            []string                  `json:"incidents"`
	FinancialStateFrozen bool                      `json:"financial_state_frozen"`
}
