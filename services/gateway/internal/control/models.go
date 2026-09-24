package control

import (
	"errors"
	"time"
)

// Invariant error constants (INV-86 through INV-100)
var (
	ErrInv86  = errors.New("INV-86: Control Tower cannot act as an authoritative financial source of truth")
	ErrInv87  = errors.New("INV-87: Frontend cannot directly authorize payments or fund movements")
	ErrInv88  = errors.New("INV-88: Frontend cannot alter payment recipients or bypass allowlist")
	ErrInv89  = errors.New("INV-89: Frontend cannot bypass or disable deterministic policy rules")
	ErrInv90  = errors.New("INV-90: Frontend cannot bypass required human approval gates")
	ErrInv91  = errors.New("INV-91: Execution cannot proceed without confirmed liquidity reservation")
	ErrInv92  = errors.New("INV-92: Simulated events or balances cannot be represented as real Arc settlements")
	ErrInv93  = errors.New("INV-93: Financial data with latency > 30s must be visibly marked STALE")
	ErrInv94  = errors.New("INV-94: Tenant data isolation violated - cross-organization access forbidden")
	ErrInv95  = errors.New("INV-95: Operator commands must be authenticated and authorized server-side")
	ErrInv96  = errors.New("INV-96: Destructive or financial commands must be idempotent")
	ErrInv97  = errors.New("INV-97: Hard DENY policy decisions cannot expose an approval action")
	ErrInv98  = errors.New("INV-98: Displayed transaction hash must link to cryptographically verified settlement evidence")
	ErrInv99  = errors.New("INV-99: Read-model generation endpoints cannot mutate transactional database state")
	ErrInv100 = errors.New("INV-100: Synthesizing multiple subsystem views cannot grant financial authorization")
)

// ControlEventCategory classifies events across the 9 economic dimensions.
type ControlEventCategory string

const (
	CategoryMission      ControlEventCategory = "MISSION"
	CategoryAgent        ControlEventCategory = "AGENT"
	CategoryEconomy      ControlEventCategory = "ECONOMY"
	CategorySecurity     ControlEventCategory = "SECURITY"
	CategoryPolicy       ControlEventCategory = "POLICY"
	CategoryTreasury     ControlEventCategory = "TREASURY"
	CategoryExecution    ControlEventCategory = "EXECUTION"
	CategoryArc          ControlEventCategory = "ARC"
	CategoryIntelligence ControlEventCategory = "INTELLIGENCE"
)

// EconomicStateStrip represents the persistent live operational status bar.
type EconomicStateStrip struct {
	TreasuryStatus string    `json:"treasury_status"` // "HEALTHY", "CONSTRAINED", "EMERGENCY_HALT", "UNAVAILABLE"
	PolicyVersion  string    `json:"policy_version"`  // "v8 ACTIVE"
	RiskLevel      string    `json:"risk_level"`      // "LOW", "NORMAL", "ELEVATED", "CRITICAL"
	ExecutionMode  string    `json:"execution_mode"`  // "LIVE", "SIMULATION", "PAUSED", "UNAVAILABLE"
	ArcStatus      string    `json:"arc_status"`      // "VERIFIED", "UNVERIFIED", "NOT_DEPLOYED"
	LastUpdated    time.Time `json:"last_updated"`
}

// ExecutiveOverview represents the executive high-level summary.
type ExecutiveOverview struct {
	OrganizationID         string             `json:"organization_id"`
	ExecutionMode          string             `json:"execution_mode"` // "REAL" | "SIMULATION"
	ActiveMissionsCount    int                `json:"active_missions_count"`
	ActiveAgentsCount      int                `json:"active_agents_count"`
	ActiveContractsCount   int                `json:"active_contracts_count"`
	AvailableLiquidity     string             `json:"available_liquidity"` // micro-USDC
	ReservedLiquidity      string             `json:"reserved_liquidity"`
	OutstandingObligations string             `json:"outstanding_obligations"`
	PendingSettlements     string             `json:"pending_settlements"`
	ActiveApprovalsCount   int                `json:"active_approvals_count"`
	CurrentPolicyVersion   string             `json:"current_policy_version"`
	CurrentTreasuryMode    string             `json:"current_treasury_mode"`
	SecurityStatus         string             `json:"security_status"` // "NORMAL", "WARNING", "CRITICAL", "PAUSED"
	ArcVerifiedBalance     string             `json:"arc_verified_balance"`
	DataFreshness          string             `json:"data_freshness"` // "LIVE", "RECENT", "STALE", "UNAVAILABLE"
	StateStrip             EconomicStateStrip `json:"state_strip"`
	Timestamp              time.Time          `json:"timestamp"`
}

// ControlActivityEvent represents an individual classified event in the live timeline.
type ControlActivityEvent struct {
	EventID        string               `json:"event_id"`
	Type           string               `json:"type"`
	Category       ControlEventCategory `json:"category"`
	OrganizationID string               `json:"organization_id"`
	AggregateID    string               `json:"aggregate_id"`
	Severity       string               `json:"severity"` // "INFO", "WARNING", "CRITICAL", "SUCCESS"
	Title          string               `json:"title"`
	Summary        string               `json:"summary"`
	Payload        map[string]any       `json:"payload,omitempty"`
	Timestamp      time.Time            `json:"timestamp"`
}

// FinancialTraceStep is an individual link in the universal financial trace.
type FinancialTraceStep struct {
	StepNumber  int       `json:"step_number"`
	Stage       string    `json:"stage"` // MISSION, TASK, AGENT, CONTRACT, OBLIGATION, POLICY, RISK, APPROVAL, RESERVATION, INTENT, EXECUTION, VAULT, ARC, RECONCILE, LEARNING
	Status      string    `json:"status"`
	ReferenceID string    `json:"reference_id"`
	Description string    `json:"description"`
	Hash        string    `json:"hash,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
}

// UniversalFinancialTrace provides universal end-to-end provenance.
type UniversalFinancialTrace struct {
	TraceID              string               `json:"trace_id"`
	OrganizationID       string               `json:"organization_id"`
	PaymentIntentID      string               `json:"payment_intent_id"`
	MissionID            string               `json:"mission_id,omitempty"`
	TaskID               string               `json:"task_id,omitempty"`
	AgentID              string               `json:"agent_id,omitempty"`
	ContractID           string               `json:"contract_id,omitempty"`
	ObligationID         string               `json:"obligation_id,omitempty"`
	PolicyVersion        string               `json:"policy_version"`
	PolicyHash           string               `json:"policy_hash"`
	PolicyDecision       string               `json:"policy_decision"` // "ALLOW", "REQUIRE_APPROVAL", "DENY"
	RiskScore            int                  `json:"risk_score"`
	RiskLevel            string               `json:"risk_level"`
	ApprovalID           string               `json:"approval_id,omitempty"`
	ApprovalStatus       string               `json:"approval_status,omitempty"`
	ReservationID        string               `json:"reservation_id,omitempty"`
	ReservationStatus    string               `json:"reservation_status,omitempty"`
	PaymentStatus        string               `json:"payment_status"`
	ExecutionTxHash      string               `json:"execution_tx_hash,omitempty"`
	AgentVaultAddress    string               `json:"agent_vault_address,omitempty"`
	ArcChainID           string               `json:"arc_chain_id,omitempty"`
	ArcBlockNumber       int64                `json:"arc_block_number,omitempty"`
	ReconciliationID     string               `json:"reconciliation_id,omitempty"`
	ReconciliationStatus string               `json:"reconciliation_status,omitempty"`
	ObservationID        string               `json:"observation_id,omitempty"`
	LearningNotes        string               `json:"learning_notes,omitempty"`
	Steps                []FinancialTraceStep `json:"steps"`
	CreatedAt            time.Time            `json:"created_at"`
}

// CurrentActionDesc provides human-explainable mission action telemetry.
type CurrentActionDesc struct {
	Action             string `json:"action"`
	Why                string `json:"why"`
	Evidence           string `json:"evidence"`
	NextPossibleAction string `json:"next_possible_action"`
}

// MissionPolicySummary describes the exact constitution and rules governing a mission.
type MissionPolicySummary struct {
	ConstitutionVersion string            `json:"constitution_version"`
	PolicyHash          string            `json:"policy_hash"`
	EffectiveRules      map[string]string `json:"effective_rules"`
	ExplainabilityNotes string            `json:"explainability_notes"`
}

// RejectedAlternativeAgent details why an alternative candidate was not selected.
type RejectedAlternativeAgent struct {
	AgentID          string `json:"agent_id"`
	QuotedPrice      string `json:"quoted_price"`
	RejectionReason  string `json:"rejection_reason"`
	ScoreDifference  string `json:"score_difference"`
}

// MissionAgentInfo details an active agent in a mission.
type MissionAgentInfo struct {
	AgentID               string                     `json:"agent_id"`
	DisplayName           string                     `json:"display_name"`
	Capability            string                     `json:"capability"`
	QuotedPrice           string                     `json:"quoted_price"`
	SelectionReason       string                     `json:"selection_reason"`
	VerificationRate      float64                    `json:"verification_rate"`
	RiskLevel             string                     `json:"risk_level"`
	RejectedAlternatives []RejectedAlternativeAgent `json:"rejected_alternatives,omitempty"`
}

// TaskGraphNodeView represents a node in the mission or swarm task graph.
type TaskGraphNodeView struct {
	TaskID           string `json:"task_id"`
	Title            string `json:"title"`
	AgentID          string `json:"agent_id"`
	Status           string `json:"status"` // PENDING, RUNNING, COMPLETED, FAILED, RECOVERED, BLOCKED
	CostReserved     string `json:"cost_reserved"`
	CostSettled      string `json:"cost_settled"`
	DurationMs       int64  `json:"duration_ms"`
	VerificationRule string `json:"verification_rule"`
}

// TaskGraphEdgeView represents a dependency or data flow edge.
type TaskGraphEdgeView struct {
	FromTaskID string `json:"from_task_id"`
	ToTaskID   string `json:"to_task_id"`
	Type       string `json:"type"` // DEPENDENCY, DATA_FLOW, DELEGATION
}

// MissionTaskGraphView represents the directed task DAG.
type MissionTaskGraphView struct {
	MaxDepth int                 `json:"max_depth"`
	Nodes    []TaskGraphNodeView `json:"nodes"`
	Edges    []TaskGraphEdgeView `json:"edges"`
}

// MissionObligationView represents clearinghouse obligations under a mission.
type MissionObligationView struct {
	ObligationID  string `json:"obligation_id"`
	ContractID    string `json:"contract_id"`
	PayerAgentID  string `json:"payer_agent_id"`
	PayeeAgentID  string `json:"payee_agent_id"`
	Amount        string `json:"amount"`
	SettledAmount string `json:"settled_amount"`
	Currency      string `json:"currency"`
	Status        string `json:"status"`
}

// MissionCommandCenterView aggregates the complete operational mission state.
type MissionCommandCenterView struct {
	MissionID          string                  `json:"mission_id"`
	Title              string                  `json:"title"`
	Objective          string                  `json:"objective"`
	Status             string                  `json:"status"`
	BudgetTotal        string                  `json:"budget_total"`
	BudgetReserved     string                  `json:"budget_reserved"`
	BudgetSettled      string                  `json:"budget_settled"`
	BudgetRemaining    string                  `json:"budget_remaining"`
	PotentialExposure  string                  `json:"potential_exposure"`
	CurrentAction      CurrentActionDesc       `json:"current_action"`
	NextExpectedAction string                  `json:"next_expected_action"`
	PolicySummary      MissionPolicySummary    `json:"policy_summary"`
	SelectedAgents     []MissionAgentInfo      `json:"selected_agents"`
	TaskGraph          MissionTaskGraphView    `json:"task_graph"`
	Obligations        []MissionObligationView `json:"obligations"`
	Timeline           []*ControlActivityEvent `json:"timeline"`
	LearningTelemetry  map[string]any          `json:"learning_telemetry,omitempty"`
	UpdatedAt          time.Time               `json:"updated_at"`
}

// IncidentTimelineStep records an event in the lifecycle of an incident.
type IncidentTimelineStep struct {
	StepNumber  int       `json:"step_number"`
	Timestamp   time.Time `json:"timestamp"`
	Subsystem   string    `json:"subsystem"`
	Description string    `json:"description"`
}

// ControlIncident represents a system incident (policy denial, timeout, constraint, re-org).
type ControlIncident struct {
	IncidentID      string                 `json:"incident_id"`
	OrganizationID  string                 `json:"organization_id"`
	Title           string                 `json:"title"`
	Category        string                 `json:"category"`
	Severity        string                 `json:"severity"` // "LOW", "MEDIUM", "HIGH", "CRITICAL"
	Status          string                 `json:"status"`   // "OPEN", "INVESTIGATING", "MITIGATED", "RESOLVED"
	TriggerEvent    string                 `json:"trigger_event"`
	DetectedAt      time.Time              `json:"detected_at"`
	MitigatedAt     *time.Time             `json:"mitigated_at,omitempty"`
	ResolvedAt      *time.Time             `json:"resolved_at,omitempty"`
	Timeline        []IncidentTimelineStep `json:"timeline"`
	RootCause       string                 `json:"root_cause,omitempty"`
	ResolutionNotes string                 `json:"resolution_notes,omitempty"`
}

// ArcStatusView contains cryptographic consensus and deployment evidence from Arc.
type ArcStatusView struct {
	ChainID                 string    `json:"chain_id"`
	RPCURL                  string    `json:"rpc_url"`
	RPCReachable            bool      `json:"rpc_reachable"`
	LatestBlockNumber       int64     `json:"latest_block_number"`
	AgentVaultAddress       string    `json:"agent_vault_address"`
	AgentVaultDeployed      bool      `json:"agent_vault_deployed"`
	AgentVaultPaused        bool      `json:"agent_vault_paused"`
	USDCAddress             string    `json:"usdc_address"`
	VerifiedTreasuryBalance string    `json:"verified_treasury_balance"`
	LiveExecutionEnabled    bool      `json:"live_execution_enabled"`
	LastCheckedAt           time.Time `json:"last_checked_at"`
}

// ControlSearchResult item across tenant scope.
type ControlSearchResult struct {
	Type        string `json:"type"` // "MISSION", "AGENT", "CONTRACT", "OBLIGATION", "PAYMENT", "TRANSACTION", "INCIDENT"
	ID          string `json:"id"`
	Title       string `json:"title"`
	Subtitle    string `json:"subtitle"`
	Status      string `json:"status"`
	DeepLinkURL string `json:"deep_link_url"`
}
