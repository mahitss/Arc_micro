package runtime

import (
	"encoding/json"
	"time"
)

// WorkflowState represents the deterministic lifecycle state of a durable workflow.
type WorkflowState string

const (
	WorkflowCreated   WorkflowState = "CREATED"
	WorkflowReady     WorkflowState = "READY"
	WorkflowRunning   WorkflowState = "RUNNING"
	WorkflowWaiting   WorkflowState = "WAITING"
	WorkflowPaused    WorkflowState = "PAUSED"
	WorkflowRetrying  WorkflowState = "RETRYING"
	WorkflowCompleted WorkflowState = "COMPLETED"
	WorkflowFailed    WorkflowState = "FAILED"
	WorkflowCancelled WorkflowState = "CANCELLED"
	WorkflowExpired   WorkflowState = "EXPIRED"
	WorkflowAborted   WorkflowState = "ABORTED"
)

// IsTerminal returns true if the workflow state is terminal.
func (s WorkflowState) IsTerminal() bool {
	return s == WorkflowCompleted || s == WorkflowFailed || s == WorkflowCancelled || s == WorkflowExpired || s == WorkflowAborted
}

// StepState represents the execution lifecycle of a discrete execution step.
type StepState string

const (
	StepPending          StepState = "PENDING"
	StepClaimed          StepState = "CLAIMED"
	StepRunning          StepState = "RUNNING"
	StepWaiting          StepState = "WAITING"
	StepSucceeded        StepState = "SUCCEEDED"
	StepRetryableFailure StepState = "RETRYABLE_FAILURE"
	StepPermanentFailure StepState = "PERMANENT_FAILURE"
	StepCancelled        StepState = "CANCELLED"
	StepExpired          StepState = "EXPIRED"
)

// IsTerminal returns true if the step state is terminal.
func (s StepState) IsTerminal() bool {
	return s == StepSucceeded || s == StepPermanentFailure || s == StepCancelled || s == StepExpired
}

// WorkerStatus represents the availability and health of a runtime worker.
type WorkerStatus string

const (
	WorkerStarting WorkerStatus = "STARTING"
	WorkerHealthy  WorkerStatus = "HEALTHY"
	WorkerDraining WorkerStatus = "DRAINING"
	WorkerStopped  WorkerStatus = "STOPPED"
	WorkerStale    WorkerStatus = "STALE"
)

// DecisionType represents an auditable runtime decision.
type DecisionType string

const (
	DecisionRetry     DecisionType = "RETRY"
	DecisionReplan    DecisionType = "REPLAN"
	DecisionWait      DecisionType = "WAIT"
	DecisionEscalate  DecisionType = "ESCALATE"
	DecisionResume    DecisionType = "RESUME"
	DecisionPause     DecisionType = "PAUSE"
	DecisionCancel    DecisionType = "CANCEL"
	DecisionReconcile DecisionType = "RECONCILE"
	DecisionFail      DecisionType = "FAIL"
	DecisionComplete  DecisionType = "COMPLETE"
)

// RetryCategory classifies errors deterministically for automated recovery.
type RetryCategory string

const (
	RetryImmediately         RetryCategory = "RETRY_IMMEDIATELY"
	RetryWithBackoff         RetryCategory = "RETRY_WITH_BACKOFF"
	RetryWaitForExternalEvent RetryCategory = "WAIT_FOR_EXTERNAL_EVENT"
	RetryReconcile           RetryCategory = "RECONCILE"
	RetryEscalate            RetryCategory = "ESCALATE"
	RetryPermanentFailure    RetryCategory = "PERMANENT_FAILURE"
	RetryDeny                RetryCategory = "DENY"
)

// IncidentSeverity defines severity of operational runtime incidents.
type IncidentSeverity string

const (
	SeverityLow      IncidentSeverity = "LOW"
	SeverityMedium   IncidentSeverity = "MEDIUM"
	SeverityHigh     IncidentSeverity = "HIGH"
	SeverityCritical IncidentSeverity = "CRITICAL"
)

// IncidentCategory categorizes operational runtime incidents.
type IncidentCategory string

const (
	IncidentWorkerFailure           IncidentCategory = "WORKER_FAILURE"
	IncidentLeaseFailure            IncidentCategory = "LEASE_FAILURE"
	IncidentDatabaseFailure         IncidentCategory = "DATABASE_FAILURE"
	IncidentExternalProviderFailure IncidentCategory = "EXTERNAL_PROVIDER_FAILURE"
	IncidentPaymentAmbiguity        IncidentCategory = "PAYMENT_AMBIGUITY"
	IncidentPolicyBlock             IncidentCategory = "POLICY_BLOCK"
	IncidentLiquidityBlock          IncidentCategory = "LIQUIDITY_BLOCK"
	IncidentSecurityBlock           IncidentCategory = "SECURITY_BLOCK"
	IncidentDeadlineFailure         IncidentCategory = "DEADLINE_FAILURE"
	IncidentSystemFailure           IncidentCategory = "SYSTEM_FAILURE"
)

// Workflow represents a durable, long-running workflow entity.
type Workflow struct {
	WorkflowID       string                 `json:"workflow_id"`
	TenantID         string                 `json:"tenant_id"`
	WorkflowType     string                 `json:"workflow_type"`
	AggregateType    string                 `json:"aggregate_type"`
	AggregateID      string                 `json:"aggregate_id"`
	State            WorkflowState          `json:"state"`
	Version          int                    `json:"version"`
	Priority         int                    `json:"priority"`
	IdempotencyKey   string                 `json:"idempotency_key"`
	ParentWorkflowID string                 `json:"parent_workflow_id,omitempty"`
	CorrelationID    string                 `json:"correlation_id,omitempty"`
	CurrentStep      string                 `json:"current_step,omitempty"`
	FailureReason    string                 `json:"failure_reason,omitempty"`
	RetryCount       int                    `json:"retry_count"`
	Deadline         *time.Time             `json:"deadline,omitempty"`
	StartedAt        *time.Time             `json:"started_at,omitempty"`
	CompletedAt      *time.Time             `json:"completed_at,omitempty"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}

// ExecutionStep represents an atomic step within a durable workflow.
type ExecutionStep struct {
	StepID         string                 `json:"step_id"`
	WorkflowID     string                 `json:"workflow_id"`
	TenantID       string                 `json:"tenant_id"`
	StepType       string                 `json:"step_type"`
	Sequence       int                    `json:"sequence"`
	State          StepState              `json:"state"`
	Attempt        int                    `json:"attempt"`
	IdempotencyKey string                 `json:"idempotency_key"`
	InputHash      string                 `json:"input_hash,omitempty"`
	OutputHash     string                 `json:"output_hash,omitempty"`
	LeaseOwner     string                 `json:"lease_owner,omitempty"`
	LeaseExpiresAt *time.Time             `json:"lease_expires_at,omitempty"`
	TimeoutSeconds int                    `json:"timeout_seconds"`
	NextRetryAt    *time.Time             `json:"next_retry_at,omitempty"`
	ErrorCode      string                 `json:"error_code,omitempty"`
	ErrorMessage   string                 `json:"error_message,omitempty"`
	StartedAt      *time.Time             `json:"started_at,omitempty"`
	CompletedAt    *time.Time             `json:"completed_at,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
	Inputs         map[string]interface{} `json:"inputs,omitempty"`
	Outputs        map[string]interface{} `json:"outputs,omitempty"`
}

// Lease provides mutual exclusion across distributed workers with monotonic fencing tokens.
type Lease struct {
	LeaseID      string    `json:"lease_id"`
	ResourceType string    `json:"resource_type"`
	ResourceID   string    `json:"resource_id"`
	WorkerID     string    `json:"worker_id"`
	TenantID     string    `json:"tenant_id"`
	AcquiredAt   time.Time `json:"acquired_at"`
	ExpiresAt    time.Time `json:"expires_at"`
	HeartbeatAt  time.Time `json:"heartbeat_at"`
	FencingToken int64     `json:"fencing_token"`
}

// Checkpoint captures an immutable state snapshot for safe crash recovery.
type Checkpoint struct {
	CheckpointID  string                 `json:"checkpoint_id"`
	WorkflowID    string                 `json:"workflow_id"`
	StepID        string                 `json:"step_id,omitempty"`
	TenantID      string                 `json:"tenant_id"`
	StateHash     string                 `json:"state_hash"`
	EventPosition int64                  `json:"event_position"`
	SchemaVersion int                    `json:"schema_version"`
	SnapshotData  map[string]interface{} `json:"snapshot_data"`
	CreatedAt     time.Time              `json:"created_at"`
}

// Worker represents an active runtime process executing workflow steps.
type Worker struct {
	WorkerID     string                 `json:"worker_id"`
	WorkerType   string                 `json:"worker_type"`
	Hostname     string                 `json:"hostname"`
	Status       WorkerStatus           `json:"status"`
	Capabilities map[string]interface{} `json:"capabilities,omitempty"`
	Version      string                 `json:"version"`
	HeartbeatAt  time.Time              `json:"heartbeat_at"`
	LastSeen     time.Time              `json:"last_seen"`
	CreatedAt    time.Time              `json:"created_at"`
}

// RuntimeDecision records auditable recovery, retry, and transition reasons.
type RuntimeDecision struct {
	DecisionID       string                 `json:"decision_id"`
	WorkflowID       string                 `json:"workflow_id"`
	StepID           string                 `json:"step_id,omitempty"`
	TenantID         string                 `json:"tenant_id"`
	DecisionType     DecisionType           `json:"decision_type"`
	ReasonCode       string                 `json:"reason_code"`
	InputsHash       string                 `json:"inputs_hash,omitempty"`
	StateVersion     int                    `json:"state_version"`
	PolicySnapshotID string                 `json:"policy_snapshot_id,omitempty"`
	Actor            string                 `json:"actor"`
	Result           map[string]interface{} `json:"result,omitempty"`
	CreatedAt        time.Time              `json:"created_at"`
}

// OutboxEvent ensures transactional outbox delivery of workflow events.
type OutboxEvent struct {
	EventID       string          `json:"event_id"`
	TenantID      string          `json:"tenant_id"`
	AggregateType string          `json:"aggregate_type"`
	AggregateID   string          `json:"aggregate_id"`
	EventType     string          `json:"event_type"`
	Payload       json.RawMessage `json:"payload"`
	Status        string          `json:"status"` // PENDING, DELIVERED, FAILED
	Attempt       int             `json:"attempt"`
	NextAttemptAt time.Time       `json:"next_attempt_at"`
	DeliveredAt   *time.Time      `json:"delivered_at,omitempty"`
	ErrorMessage  string          `json:"error_message,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
}

// InboxEvent ensures deduplicated processing of external webhooks and callbacks.
type InboxEvent struct {
	InboxID        string          `json:"inbox_id"`
	IdempotencyKey string          `json:"idempotency_key"`
	TenantID       string          `json:"tenant_id"`
	SenderID       string          `json:"sender_id"`
	EventType      string          `json:"event_type"`
	Payload        json.RawMessage `json:"payload"`
	Status         string          `json:"status"` // RECEIVED, PROCESSED, IGNORED
	ProcessedAt    *time.Time      `json:"processed_at,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

// ScheduledJob represents database-persisted timed execution tasks.
type ScheduledJob struct {
	JobID          string                 `json:"job_id"`
	TenantID       string                 `json:"tenant_id"`
	JobType        string                 `json:"job_type"`
	TargetType     string                 `json:"target_type"`
	TargetID       string                 `json:"target_id"`
	ScheduledAt    time.Time              `json:"scheduled_at"`
	State          string                 `json:"state"` // SCHEDULED, EXECUTED, CANCELLED
	IdempotencyKey string                 `json:"idempotency_key"`
	Payload        map[string]interface{} `json:"payload,omitempty"`
	ExecutedAt     *time.Time             `json:"executed_at,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
}

// RuntimeIncident represents an actionable operational incident detected by the runtime.
type RuntimeIncident struct {
	IncidentID     string                 `json:"incident_id"`
	TenantID       string                 `json:"tenant_id"`
	WorkflowID     string                 `json:"workflow_id"`
	Severity       IncidentSeverity       `json:"severity"`
	Category       IncidentCategory       `json:"category"`
	State          string                 `json:"state"` // OPEN, ACKNOWLEDGED, RESOLVED
	DetectedAt     time.Time              `json:"detected_at"`
	AcknowledgedAt *time.Time             `json:"acknowledged_at,omitempty"`
	ResolvedAt     *time.Time             `json:"resolved_at,omitempty"`
	RootCause      string                 `json:"root_cause,omitempty"`
	Evidence       map[string]interface{} `json:"evidence,omitempty"`
	Remediation    string                 `json:"remediation,omitempty"`
	CorrelationID  string                 `json:"correlation_id,omitempty"`
}

// AgentCallback represents an asynchronous callback payload from an external agent.
type AgentCallback struct {
	CallbackID     string                 `json:"callback_id"`
	WorkflowID     string                 `json:"workflow_id"`
	StepID         string                 `json:"step_id"`
	TenantID       string                 `json:"tenant_id"`
	SenderID       string                 `json:"sender_id"`
	Timestamp      time.Time              `json:"timestamp"`
	Nonce          string                 `json:"nonce"`
	PayloadHash    string                 `json:"payload_hash"`
	Signature      string                 `json:"signature,omitempty"`
	IdempotencyKey string                 `json:"idempotency_key"`
	Data           map[string]interface{} `json:"data,omitempty"`
}

// ResourceBudget defines hard limits for execution resources.
type ResourceBudget struct {
	MaxDurationSeconds  int64  `json:"max_duration_seconds"`
	MaxSteps            int    `json:"max_steps"`
	MaxRetries          int    `json:"max_retries"`
	MaxConcurrentTasks  int    `json:"max_concurrent_tasks"`
	MaxDelegationDepth  int    `json:"max_delegation_depth"`
	MaxReplans          int    `json:"max_replans"`
	MaxEconomicExposure string `json:"max_economic_exposure"` // Micro-USDC base units
}

// DefaultResourceBudget returns sensible, secure budget defaults.
func DefaultResourceBudget() ResourceBudget {
	return ResourceBudget{
		MaxDurationSeconds:  86400, // 24 hours
		MaxSteps:            50,
		MaxRetries:          5,
		MaxConcurrentTasks:  4,
		MaxDelegationDepth:  4,
		MaxReplans:          3,
		MaxEconomicExposure: "100000000", // 100 USDC default exposure limit
	}
}

// RuntimeMetrics encapsulates observability telemetry.
type RuntimeMetrics struct {
	ActiveWorkflows         int     `json:"active_workflows"`
	WaitingWorkflows        int     `json:"waiting_workflows"`
	RetryRateBps            int     `json:"retry_rate_bps"`
	FailureRateBps          int     `json:"failure_rate_bps"`
	RecoveryRateBps         int     `json:"recovery_rate_bps"`
	AverageStepDurationMs   int64   `json:"average_step_duration_ms"`
	LeaseExpirationsCount   int     `json:"lease_expirations_count"`
	StaleWorkerCount        int     `json:"stale_worker_count"`
	QueueDepth              int     `json:"queue_depth"`
	DeadlineViolationsCount int     `json:"deadline_violations_count"`
	ReconciliationQueueSize int     `json:"reconciliation_queue_size"`
	AmbiguousOperations     int     `json:"ambiguous_operations"`
	WorkerUtilizationPct    float64 `json:"worker_utilization_pct"`
}
