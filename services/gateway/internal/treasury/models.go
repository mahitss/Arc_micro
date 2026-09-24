package treasury

import (
	"errors"
	"time"
)

// Security Invariant Identifiers (INV-71 to INV-85)
const (
	INV71_ExpectedInflowsNotAvailableFunds      = "INV-71: Expected inflows cannot be treated as available funds."
	INV72_ReservationsCannotExceedAvailable     = "INV-72: Reservations cannot exceed available liquidity."
	INV73_NoConcurrentOversubscription          = "INV-73: Concurrent reservations cannot oversubscribe treasury."
	INV74_ChildEnvelopeCannotExceedParent       = "INV-74: Child liquidity envelopes cannot exceed parent authority."
	INV75_RecurringCannotReserveInfinite        = "INV-75: Recurring obligations cannot reserve infinite funds."
	INV76_SimulationCannotAffectRealTreasury    = "INV-76: Simulation liquidity cannot affect real treasury."
	INV77_ForecastsCannotAuthorizePayments      = "INV-77: Treasury forecasts cannot authorize payments."
	INV78_AnalyticsCannotModifyPolicy           = "INV-78: Treasury analytics cannot modify policy."
	INV79_OnlyVerifiedBlockchainStateAuthoritative = "INV-79: Only verified blockchain state can establish verified on-chain balance."
	INV80_InternalStateCannotFabricateSettlement  = "INV-80: Internal treasury state cannot fabricate blockchain settlement."
	INV81_MismatchCannotSilentlyMatch           = "INV-81: Reconciliation mismatch cannot silently become MATCHED."
	INV82_UnverifiedInflowsCannotIncreaseCapacity = "INV-82: Expected inflows cannot increase authorization capacity until verified."
	INV83_RefundCannotExceedActualVerified      = "INV-83: A refund cannot increase treasury beyond the actual verified refund."
	INV84_NoCalculationCanCreateFunds           = "INV-84: No liquidity calculation can create funds."
	INV85_TreasuryIntelligenceCannotBypassApproval = "INV-85: Treasury intelligence cannot bypass approval."
)

// Domain Errors
var (
	ErrExpectedInflowNotAvailable   = errors.New(INV71_ExpectedInflowsNotAvailableFunds)
	ErrReservationExceedsAvailable  = errors.New(INV72_ReservationsCannotExceedAvailable)
	ErrConcurrentOversubscription   = errors.New(INV73_NoConcurrentOversubscription)
	ErrChildEnvelopeExceedsParent   = errors.New(INV74_ChildEnvelopeCannotExceedParent)
	ErrRecurringInfiniteReservation = errors.New(INV75_RecurringCannotReserveInfinite)
	ErrSimulationAffectsReal        = errors.New(INV76_SimulationCannotAffectRealTreasury)
	ErrForecastAuthorizesPayment    = errors.New(INV77_ForecastsCannotAuthorizePayments)
	ErrAnalyticsModifiesPolicy      = errors.New(INV78_AnalyticsCannotModifyPolicy)
	ErrUnverifiedBlockchainState    = errors.New(INV79_OnlyVerifiedBlockchainStateAuthoritative)
	ErrFabricatedSettlement         = errors.New(INV80_InternalStateCannotFabricateSettlement)
	ErrSilentMismatchSuppression    = errors.New(INV81_MismatchCannotSilentlyMatch)
	ErrInflowCapacityAbuse          = errors.New(INV82_UnverifiedInflowsCannotIncreaseCapacity)
	ErrRefundExceedsActual          = errors.New(INV83_RefundCannotExceedActualVerified)
	ErrFundCreationAttempt          = errors.New(INV84_NoCalculationCanCreateFunds)
	ErrApprovalBypassAttempt        = errors.New(INV85_TreasuryIntelligenceCannotBypassApproval)
	ErrStaleLiquidityDecision       = errors.New("stale liquidity decision detected: concurrent allocation changed available balance")
	ErrBufferBreached               = errors.New("operation would breach configured minimum liquidity buffer")
	ErrTreasuryEmergencyPaused      = errors.New("treasury is in emergency paused mode: new commitments rejected")
)

// ExecutionMode defines real vs simulation isolation
type ExecutionMode string

const (
	ModeReal       ExecutionMode = "REAL"
	ModeSimulation ExecutionMode = "SIMULATION"
)

// OperationalMode represents the operational safety posture of the treasury
type OperationalMode string

const (
	OperationalModeNormal      OperationalMode = "NORMAL"
	OperationalModeConstrained OperationalMode = "CONSTRAINED"
	OperationalModeEmergency   OperationalMode = "EMERGENCY"
)

// LiquidityGateResult defines the outcome of pre-obligation liquidity gating
type LiquidityGateResult string

const (
	GateLiquidityAvailable   LiquidityGateResult = "LIQUIDITY_AVAILABLE"
	GateLiquidityConstrained LiquidityGateResult = "LIQUIDITY_CONSTRAINED"
	GateLiquidityUnavailable LiquidityGateResult = "LIQUIDITY_UNAVAILABLE"
)

// ReservationStatus represents the lifecycle of a liquidity reservation
type ReservationStatus string

const (
	ReservationRequested ReservationStatus = "REQUESTED"
	ReservationReserved  ReservationStatus = "RESERVED"
	ReservationConsumed  ReservationStatus = "CONSUMED"
	ReservationReleased  ReservationStatus = "RELEASED"
	ReservationExpired   ReservationStatus = "EXPIRED"
	ReservationCancelled ReservationStatus = "CANCELLED"
)

// CommitmentType distinguishes soft forecasts from hard commitments
type CommitmentType string

const (
	CommitmentSoft CommitmentType = "SOFT_COMMITMENT"
	CommitmentHard CommitmentType = "HARD_COMMITMENT"
)

// CommitmentLifecycle models the formal escalation ladder
type CommitmentLifecycle string

const (
	CommitmentExpected   CommitmentLifecycle = "EXPECTED"
	CommitmentProposed   CommitmentLifecycle = "PROPOSED"
	CommitmentAuthorized CommitmentLifecycle = "AUTHORIZED"
	CommitmentReserved   CommitmentLifecycle = "RESERVED"
	CommitmentSettled    CommitmentLifecycle = "SETTLED"
)

// InflowStatus tracks expected external funds
type InflowStatus string

const (
	InflowExpected  InflowStatus = "EXPECTED"
	InflowVerified  InflowStatus = "VERIFIED"
	InflowReceived  InflowStatus = "RECEIVED"
	InflowDelayed   InflowStatus = "DELAYED"
	InflowCancelled InflowStatus = "CANCELLED"
)

// ReconciliationStatus indicates blockchain alignment
type ReconciliationStatus string

const (
	ReconMatched        ReconciliationStatus = "MATCHED"
	ReconMismatch       ReconciliationStatus = "MISMATCH"
	ReconPending        ReconciliationStatus = "PENDING"
	ReconAmbiguous      ReconciliationStatus = "AMBIGUOUS"
	ReconRequiresReview ReconciliationStatus = "REQUIRES_REVIEW"
	ReconUnverified     ReconciliationStatus = "UNVERIFIED"
)

// ScopeLevel defines the hierarchical scope for buffers and envelopes
type ScopeLevel string

const (
	ScopeGlobal       ScopeLevel = "GLOBAL"
	ScopeOrganization ScopeLevel = "ORGANIZATION"
	ScopeAgent        ScopeLevel = "AGENT"
	ScopeMission      ScopeLevel = "MISSION"
	ScopeSwarm        ScopeLevel = "SWARM"
)

// ForecastHorizon specifies the temporal forecast window
type ForecastHorizon string

const (
	Horizon1Hour   ForecastHorizon = "1h"
	Horizon6Hours  ForecastHorizon = "6h"
	Horizon24Hours ForecastHorizon = "24h"
	Horizon7Days   ForecastHorizon = "7d"
	Horizon30Days  ForecastHorizon = "30d"
)

// StressScenarioType defines the stress scenario
type StressScenarioType string

const (
	ScenarioBaseline          StressScenarioType = "BASELINE"
	ScenarioHighOutflow       StressScenarioType = "HIGH_OUTFLOW"
	ScenarioLowLiquidity      StressScenarioType = "LOW_LIQUIDITY"
	ScenarioHighFailure       StressScenarioType = "HIGH_FAILURE"
	ScenarioHighRetry         StressScenarioType = "HIGH_RETRY"
	ScenarioHighDelegation    StressScenarioType = "HIGH_DELEGATION"
	ScenarioSettlementCluster StressScenarioType = "SETTLEMENT_CLUSTER"
	ScenarioCustom            StressScenarioType = "CUSTOM"
)

// SurvivalState defines the stress survival state
type SurvivalState string

const (
	SurvivalSafe        SurvivalState = "SAFE"
	SurvivalConstrained SurvivalState = "CONSTRAINED"
	SurvivalCritical    SurvivalState = "CRITICAL"
	SurvivalUnavailable SurvivalState = "UNAVAILABLE"
)

// -------------------------------------------------------------
// Core Domain Entities
// -------------------------------------------------------------

// TreasuryState represents the canonical, reconciled multi-balance state of an organizational treasury
type TreasuryState struct {
	TreasuryID        string          `json:"treasury_id"`
	OrganizationID    string          `json:"organization_id"`
	VaultAddress      string          `json:"vault_address"`
	Currency          string          `json:"currency"` // strictly "USDC"
	Mode              ExecutionMode   `json:"mode"`     // REAL or SIMULATION
	TotalBalance      string          `json:"total_balance"`      // integer micro-units
	AvailableBalance  string          `json:"available_balance"`  // unencumbered & unreserved
	ReservedBalance   string          `json:"reserved_balance"`   // active reservations
	CommittedBalance  string          `json:"committed_balance"`  // accepted future commitments
	PendingSettlement string          `json:"pending_settlement"` // in execution pipeline
	DisputedBalance   string          `json:"disputed_balance"`   // frozen under dispute
	MinimumBuffer     string          `json:"minimum_buffer"`     // protected non-allocatable floor
	MaximumExposure   string          `json:"maximum_exposure"`   // ceiling on authorized commitments
	OperationalMode   OperationalMode `json:"operational_mode"`   // NORMAL, CONSTRAINED, EMERGENCY
	UpdatedAt         time.Time       `json:"updated_at"`
	SourceVersion     int64           `json:"source_version"`
}

// LiquidityReservation represents an off-chain authorized reservation of vault capacity
type LiquidityReservation struct {
	ReservationID  string            `json:"reservation_id"`
	OrganizationID string            `json:"organization_id"`
	Source         string            `json:"source"` // INTENT, OBLIGATION, ESCROW, MISSION, SWARM
	ObligationID   string            `json:"obligation_id,omitempty"`
	MissionID      string            `json:"mission_id,omitempty"`
	SwarmID        string            `json:"swarm_id,omitempty"`
	AgentID        string            `json:"agent_id,omitempty"`
	Amount         string            `json:"amount"` // micro-USDC
	Currency       string            `json:"currency"`
	Mode           ExecutionMode     `json:"mode"`
	Status         ReservationStatus `json:"status"`
	PolicyVersion  string            `json:"policy_version"`
	PolicyHash     string            `json:"policy_hash"`
	CreatedAt      time.Time         `json:"created_at"`
	ExpiresAt      time.Time         `json:"expires_at"`
	ConsumedAt     *time.Time        `json:"consumed_at,omitempty"`
	ReleasedAt     *time.Time        `json:"released_at,omitempty"`
}

// LiquidityBufferPolicy defines non-allocatable liquidity floors
type LiquidityBufferPolicy struct {
	PolicyID          string     `json:"policy_id"`
	OrganizationID    string     `json:"organization_id"`
	Scope             ScopeLevel `json:"scope"`
	ScopeID           string     `json:"scope_id"`
	MinimumAbsolute   string     `json:"minimum_absolute"`   // base units
	MinimumPercentage float64    `json:"minimum_percentage"` // e.g. 0.20 = 20%
	EmergencyBuffer   string     `json:"emergency_buffer"`   // hard red line
	Currency          string     `json:"currency"`
	EffectiveAt       time.Time  `json:"effective_at"`
}

// LiquidityEnvelope represents bounded economic capacity at a specific scope
type LiquidityEnvelope struct {
	Scope                  ScopeLevel `json:"scope"`
	ScopeID                string     `json:"scope_id"`
	Currency               string     `json:"currency"`
	TotalFunds             string     `json:"total_funds"`
	CurrentAvailable       string     `json:"current_available"`
	ReservedFunds          string     `json:"reserved_funds"`
	CommittedFunds         string     `json:"committed_funds"`
	PotentialExposure      string     `json:"potential_exposure"`
	MinimumBuffer          string     `json:"minimum_buffer"`
	CurrentCapacity        string     `json:"current_capacity"`
	SafeCommitmentCapacity string     `json:"safe_commitment_capacity"`
	CalculatedAt           time.Time  `json:"calculated_at"`
}

// LiquidityCommitment tracks soft and hard commitments
type LiquidityCommitment struct {
	CommitmentID   string              `json:"commitment_id"`
	OrganizationID string              `json:"organization_id"`
	Type           CommitmentType      `json:"type"`      // SOFT or HARD
	Lifecycle      CommitmentLifecycle `json:"lifecycle"` // EXPECTED -> PROPOSED -> AUTHORIZED -> RESERVED -> SETTLED
	Amount         string              `json:"amount"`
	Currency       string              `json:"currency"`
	Source         string              `json:"source"` // MISSION, OBLIGATION, RECURRING, SWARM
	SourceID       string              `json:"source_id"`
	AgentID        string              `json:"agent_id"`
	CreatedAt      time.Time           `json:"created_at"`
	MaturesAt      time.Time           `json:"matures_at"`
	UpdatedAt      time.Time           `json:"updated_at"`
}

// ExpectedInflow models expected future deposits or receivables
type ExpectedInflow struct {
	InflowID       string       `json:"inflow_id"`
	OrganizationID string       `json:"organization_id"`
	Source         string       `json:"source"` // CUSTOMER_DEPOSIT, PEER_RECEIVABLE, REFUND
	ExpectedAmount string       `json:"expected_amount"`
	Currency       string       `json:"currency"`
	ExpectedAt     time.Time    `json:"expected_at"`
	Confidence     float64      `json:"confidence"` // 0.0 to 1.0
	Status         InflowStatus `json:"status"`     // EXPECTED, VERIFIED, RECEIVED, DELAYED, CANCELLED
	VerifiedAt     *time.Time   `json:"verified_at,omitempty"`
	TxHash         string       `json:"tx_hash,omitempty"`
}

// ForecastDataPoint represents a single projected time slice
type ForecastDataPoint struct {
	Timestamp          time.Time `json:"timestamp"`
	AvailableLiquidity string    `json:"available_liquidity"`
	CommittedLiquidity string    `json:"committed_liquidity"`
	ExpectedOutflow    string    `json:"expected_outflow"`
	ExpectedInflow     string    `json:"expected_inflow"`
	Buffer             string    `json:"buffer"`
	SafeCapacity       string    `json:"safe_capacity"`
}

// LiquidityForecast provides temporal projections
type LiquidityForecast struct {
	ForecastID     string              `json:"forecast_id"`
	OrganizationID string              `json:"organization_id"`
	Horizon        ForecastHorizon     `json:"horizon"`  // 1h, 6h, 24h, 7d, 30d
	Scenario       StressScenarioType  `json:"scenario"` // BASELINE, HIGH_OUTFLOW, etc.
	CurrentBalance string              `json:"current_balance"`
	Points         []ForecastDataPoint `json:"points"`
	Confidence     float64             `json:"confidence"`
	Assumptions    []string            `json:"assumptions"`
	SampleSize     int                 `json:"sample_size"`
	GeneratedAt    time.Time           `json:"generated_at"`
}

// LiquidityStressScenario models input to Digital Twin stress testing
type LiquidityStressScenario struct {
	ScenarioName             StressScenarioType `json:"scenario_name"`
	SimultaneousSettlements  int                `json:"simultaneous_settlements"`
	ProviderFallbackRate     float64            `json:"provider_fallback_rate"` // e.g. 0.30 surcharge
	RetrySurgePercentage     float64            `json:"retry_surge_percentage"` // e.g. 0.20
	MilestoneReleaseRatio    float64            `json:"milestone_release_ratio"`
	RefundSurgeRatio         float64            `json:"refund_surge_ratio"`
	InflowDelayHours         int                `json:"inflow_delay_hours"`
	NetworkLatencyMultiplier float64            `json:"network_latency_multiplier"`
}

// LiquidityStressResult captures the stress simulation outcome
type LiquidityStressResult struct {
	ScenarioName              StressScenarioType `json:"scenario_name"`
	StartingLiquidity         string             `json:"starting_liquidity"`
	TotalProjectedOutflow     string             `json:"total_projected_outflow"`
	MinimumResultingLiquidity string             `json:"minimum_resulting_liquidity"`
	BufferBreached            bool               `json:"buffer_breached"`
	EmergencyBufferBreached   bool               `json:"emergency_buffer_breached"`
	WorstCaseExposure         string             `json:"worst_case_exposure"`
	SurvivalState             SurvivalState      `json:"survival_state"` // SAFE, CONSTRAINED, CRITICAL, UNAVAILABLE
	RecommendedActions        []string           `json:"recommended_actions"`
	SimulatedAt               time.Time          `json:"simulated_at"`
}

// AllocationCandidate represents an obligation awaiting liquidity allocation
type AllocationCandidate struct {
	CandidateID   string     `json:"candidate_id"`
	ObligationID  string     `json:"obligation_id"`
	AgentID       string     `json:"agent_id"`
	MissionID     string     `json:"mission_id"`
	Amount        string     `json:"amount"`
	Currency      string     `json:"currency"`
	Deadline      time.Time  `json:"deadline"`
	Scope         ScopeLevel `json:"scope"`
	PriorityScore float64    `json:"priority_score"`
	DeferralCount int        `json:"deferral_count"`
	WaitDuration  time.Duration `json:"wait_duration"`
	IsMilestone   bool       `json:"is_milestone"`
	CriticalPath  bool       `json:"critical_path"`
}

// LiquidityAllocationProposal represents non-executable allocation plan
type LiquidityAllocationProposal struct {
	ProposalID          string                 `json:"proposal_id"`
	OrganizationID      string                 `json:"organization_id"`
	ApprovedCandidates  []*AllocationCandidate `json:"approved_candidates"`
	DeferredCandidates  []*AllocationCandidate `json:"deferred_candidates"`
	TotalApprovedAmount string                 `json:"total_approved_amount"`
	TotalDeferredAmount string                 `json:"total_deferred_amount"`
	RemainingBuffer     string                 `json:"remaining_buffer"`
	Explanation         []string               `json:"explanation"`
	RequiresHumanReview bool                   `json:"requires_human_review"`
	CreatedAt           time.Time              `json:"created_at"`
}

// LiquidityAnomaly records detected behavioral anomalies
type LiquidityAnomaly struct {
	AnomalyID     string    `json:"anomaly_id"`
	OrganizationID string   `json:"organization_id"`
	Type          string    `json:"type"` // SPIKE, CONCENTRATION, UNUSUAL_OUTFLOW, REPEATED_CANCELLATION
	Severity      string    `json:"severity"` // LOW, MEDIUM, HIGH, CRITICAL
	AffectedScope string    `json:"affected_scope"`
	Evidence      string    `json:"evidence"`
	DetectedAt    time.Time `json:"detected_at"`
	Status        string    `json:"status"` // OPEN, ACKNOWLEDGED, RESOLVED
}

// TreasuryReconciliationReport captures 4-way balance comparison
type TreasuryReconciliationReport struct {
	ReportID                 string               `json:"report_id"`
	OrganizationID           string               `json:"organization_id"`
	Status                   ReconciliationStatus `json:"status"` // MATCHED, MISMATCH, PENDING, AMBIGUOUS, REQUIRES_REVIEW, UNVERIFIED
	InternalLedgerBalance    string               `json:"internal_ledger_balance"`
	RepositoryBalance        string               `json:"repository_balance"`
	VaultBalance             string               `json:"vault_balance"`
	BlockchainBalance        string               `json:"blockchain_balance"`
	DiscrepancyAmount        string               `json:"discrepancy_amount"`
	ChainID                  string               `json:"chain_id"`
	VaultAddress             string               `json:"vault_address"`
	TokenAddress             string               `json:"token_address"`
	VaultPaused              bool                 `json:"vault_paused"`
	VaultOwner               string               `json:"vault_owner"`
	VerifiedAt               time.Time            `json:"verified_at"`
	Evidence                 string               `json:"evidence"`
}

// TreasuryHealthSnapshot aggregates health telemetry
type TreasuryHealthSnapshot struct {
	OrganizationID              string               `json:"organization_id"`
	Mode                        ExecutionMode        `json:"mode"`
	TotalBalance                string               `json:"total_balance"`
	AvailableBalance            string               `json:"available_balance"`
	ReservedBalance             string               `json:"reserved_balance"`
	CommittedBalance            string               `json:"committed_balance"`
	PendingSettlement           string               `json:"pending_settlement"`
	DisputedBalance             string               `json:"disputed_balance"`
	MinimumBuffer               string               `json:"minimum_buffer"`
	SafeCapacity                string               `json:"safe_capacity"`
	WorstCaseExposure           string               `json:"worst_case_exposure"`
	SolvencyRatio               float64              `json:"solvency_ratio"`
	OperationalMode             OperationalMode      `json:"operational_mode"` // NORMAL, CONSTRAINED, EMERGENCY
	ReconciliationStatus        ReconciliationStatus `json:"reconciliation_status"`
	LastVerifiedOnChainBalance  string               `json:"last_verified_on_chain_balance"`
	VerificationTimestamp       time.Time            `json:"verification_timestamp"`
	ActiveReservationsCount     int                  `json:"active_reservations_count"`
	ActiveAnomaliesCount        int                  `json:"active_anomalies_count"`
}
