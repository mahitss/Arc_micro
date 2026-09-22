package economy

import (
	"time"
)

// SwarmStatus represents the explicit lifecycle states of an autonomous agent swarm.
type SwarmStatus string

const (
	SwarmStatusCreated         SwarmStatus = "CREATED"
	SwarmStatusPlanning        SwarmStatus = "PLANNING"
	SwarmStatusSpawning        SwarmStatus = "SPAWNING"
	SwarmStatusExecuting       SwarmStatus = "EXECUTING"
	SwarmStatusWaiting         SwarmStatus = "WAITING"
	SwarmStatusReplanning      SwarmStatus = "REPLANNING"
	SwarmStatusCompleting      SwarmStatus = "COMPLETING"
	SwarmStatusCompleted       SwarmStatus = "COMPLETED"
	SwarmStatusFailed          SwarmStatus = "FAILED"
	SwarmStatusCancelled       SwarmStatus = "CANCELLED"
	SwarmStatusBudgetExhausted SwarmStatus = "BUDGET_EXHAUSTED"
)

// AgentRole defines descriptive specializations for agents within a swarm.
// Invariant INV-S1: Roles are descriptive and NEVER grant financial authority.
type AgentRole string

const (
	RoleOrchestrator  AgentRole = "ORCHESTRATOR"
	RoleResearcher    AgentRole = "RESEARCHER"
	RoleDataProvider  AgentRole = "DATA_PROVIDER"
	RoleAnalyst       AgentRole = "ANALYST"
	RoleCoder         AgentRole = "CODER"
	RoleVerifier      AgentRole = "VERIFIER"
	RoleCritic        AgentRole = "CRITIC"
	RoleSynthesizer   AgentRole = "SYNTHESIZER"
	RoleSpecialist    AgentRole = "SPECIALIST"
)

// TaskStatus represents the lifecycle state of a specific node in the swarm task graph.
type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "PENDING"
	TaskStatusReady     TaskStatus = "READY"
	TaskStatusRunning   TaskStatus = "RUNNING"
	TaskStatusWaiting   TaskStatus = "WAITING"
	TaskStatusSucceeded TaskStatus = "SUCCEEDED"
	TaskStatusFailed    TaskStatus = "FAILED"
	TaskStatusBlocked   TaskStatus = "BLOCKED"
	TaskStatusCancelled TaskStatus = "CANCELLED"
)

// CriticDecision captures the evaluation output of an optional Critic agent.
type CriticDecision string

const (
	CriticPass          CriticDecision = "PASS"
	CriticFail          CriticDecision = "FAIL"
	CriticNeedsRevision CriticDecision = "NEEDS_REVISION"
)

// CriticFeedback holds structured critique for a task output without financial authority.
type CriticFeedback struct {
	CriticAgentID string         `json:"critic_agent_id"`
	Decision      CriticDecision `json:"decision"`
	Reason        string         `json:"reason"`
	Confidence    int            `json:"confidence"` // basis points (0-10000)
}

// ConsensusValidation represents multi-agent comparative analysis for high-value tasks.
type ConsensusValidation struct {
	TaskID             string            `json:"task_id"`
	SourceResults      map[string]string `json:"source_results"` // agent_id -> result payload
	Agreed             bool              `json:"agreed"`
	DisagreementReason string            `json:"disagreement_reason,omitempty"`
	ConsensusScore     int               `json:"consensus_score"` // basis points (0-10000)
}

// TaskNode represents an individual unit of work in the Swarm Directed Acyclic Graph (DAG).
type TaskNode struct {
	TaskID             string          `json:"task_id"`
	SwarmID            string          `json:"swarm_id"`
	ParentTaskID       string          `json:"parent_task_id,omitempty"`
	Name               string          `json:"name"`
	Description        string          `json:"description"`
	AssignedAgentID    string          `json:"assigned_agent_id,omitempty"`
	AssignedRole       AgentRole       `json:"assigned_role"`
	RequiredCapability string          `json:"required_capability"`
	Status             TaskStatus      `json:"status"`
	Budget             string          `json:"budget"` // allocated micro-USDC integer string
	Spent              string          `json:"spent"`  // settled micro-USDC integer string
	Dependencies       []string        `json:"dependencies"` // task_ids that must complete before this can run
	InputRefs          []string        `json:"input_refs"`   // explicit references e.g. result://swarm/s1/task/t1
	OutputRefs         []string        `json:"output_refs,omitempty"`
	ResultData         string          `json:"result_data,omitempty"`
	ResultChecksum     string          `json:"result_checksum,omitempty"`
	ValidationStatus   string          `json:"validation_status,omitempty"` // PENDING, VALIDATED, REJECTED, DISAGREEMENT
	CriticFeedback     *CriticFeedback `json:"critic_feedback,omitempty"`
	RetryCount         int             `json:"retry_count"`
	MaxRetries         int             `json:"max_retries"`
	CreatedAt          time.Time       `json:"created_at"`
	StartedAt          *time.Time      `json:"started_at,omitempty"`
	CompletedAt        *time.Time      `json:"completed_at,omitempty"`
	Deadline           *time.Time      `json:"deadline,omitempty"`
	Error              string          `json:"error,omitempty"`
}

// Swarm represents a coordinated multi-agent collective governed by AgentPay.
type Swarm struct {
	ID                  string            `json:"id"`
	OrganizationID      string            `json:"organization_id"`
	RootMissionID       string            `json:"root_mission_id"`
	OrchestratorAgentID string            `json:"orchestrator_agent_id"`
	Objective           string            `json:"objective"`
	Status              SwarmStatus       `json:"status"`
	Budget              string            `json:"budget"`    // Hard maximum spending ceiling in base units
	Allocated           string            `json:"allocated"` // Sum of task budgets allocated
	Reserved            string            `json:"reserved"`  // In-flight active task reservation
	Spent               string            `json:"spent"`     // Cumulative settled base units
	MaxAgents           int               `json:"max_agents"`
	MaxDepth            int               `json:"max_depth"`
	CreatedAt           time.Time         `json:"created_at"`
	StartedAt           *time.Time        `json:"started_at,omitempty"`
	CompletedAt         *time.Time        `json:"completed_at,omitempty"`
	Deadline            *time.Time        `json:"deadline,omitempty"`
	FailureReason       string            `json:"failure_reason,omitempty"`
	CorrelationID       string            `json:"correlation_id"`
	Metadata            map[string]string `json:"metadata,omitempty"`
}

// SwarmCostIntelligence provides deterministic cost telemetry across a swarm lifecycle.
type SwarmCostIntelligence struct {
	SwarmID            string `json:"swarm_id"`
	PlannedBudget      string `json:"planned_budget"`
	AllocatedBudget    string `json:"allocated_budget"`
	ReservedBudget     string `json:"reserved_budget"`
	SpentBudget        string `json:"spent_budget"`
	RemainingBudget    string `json:"remaining_budget"`
	ProjectedFinalCost string `json:"projected_final_cost"`
}

// SwarmRiskScore provides deterministic composite risk scoring for swarm operations.
type SwarmRiskScore struct {
	SwarmID          string         `json:"swarm_id"`
	RiskLevel        string         `json:"risk_level"` // LOW, MEDIUM, HIGH
	RiskScore        int            `json:"risk_score"` // 0-100
	Factors          map[string]int `json:"factors"`
	RequiresApproval bool           `json:"requires_approval"`
	Reason           string         `json:"reason,omitempty"`
}

// SwarmGraph represents the in-memory validated DAG of swarm tasks.
type SwarmGraph struct {
	SwarmID     string               `json:"swarm_id"`
	RootTaskIDs []string             `json:"root_task_ids"`
	Tasks       map[string]*TaskNode `json:"tasks"`
	Depth       int                  `json:"depth"`
}

// SwarmExecutionTraceEntry captures discrete timeline actions during swarm execution.
type SwarmExecutionTraceEntry struct {
	Timestamp time.Time         `json:"timestamp"`
	TaskID    string            `json:"task_id,omitempty"`
	AgentID   string            `json:"agent_id,omitempty"`
	Action    string            `json:"action"`
	Details   string            `json:"details"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// SwarmTrace encapsulates the complete verifiable audit flight record for a swarm.
type SwarmTrace struct {
	Swarm            *Swarm                     `json:"swarm"`
	Tasks            []*TaskNode                `json:"tasks"`
	TraceEntries     []SwarmExecutionTraceEntry `json:"trace_entries"`
	CostIntelligence SwarmCostIntelligence      `json:"cost_intelligence"`
	Risk             SwarmRiskScore             `json:"risk"`
	EconomicGraph    *EconomicGraph             `json:"economic_graph,omitempty"`
}
