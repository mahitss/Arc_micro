package clearinghouse

import (
	"time"
)

// CounterpartyStatus defines the verification tier of an external or peer agent counterparty.
type CounterpartyStatus string

const (
	CounterpartyUnverified CounterpartyStatus = "UNVERIFIED"
	CounterpartyIdentified CounterpartyStatus = "IDENTIFIED"
	CounterpartyVerified   CounterpartyStatus = "VERIFIED"
	CounterpartySuspended  CounterpartyStatus = "SUSPENDED"
)

// EconomicCounterparty tracks an agent counterparty, its exposure limit, and identity status.
type EconomicCounterparty struct {
	CounterpartyID        string             `json:"counterparty_id"`
	TenantID              string             `json:"tenant_id"`
	AgentID               string             `json:"agent_id"`
	OrganizationID        string             `json:"organization_id"`
	IdentityStatus        CounterpartyStatus `json:"identity_status"` // UNVERIFIED, IDENTIFIED, VERIFIED, SUSPENDED
	CapabilityReference   string             `json:"capability_reference,omitempty"`
	ProtocolVersion       string             `json:"protocol_version"`
	ExposureLimit         string             `json:"exposure_limit"`  // micro-USDC
	CurrentExposure       string             `json:"current_exposure"` // micro-USDC
	HistoricalObligations int                `json:"historical_obligations"`
	ActiveContracts       int                `json:"active_contracts"`
	RiskReference         string             `json:"risk_reference,omitempty"`
	CreatedAt             time.Time          `json:"created_at"`
	UpdatedAt             time.Time          `json:"updated_at"`
}

// SettlementWindow defines the aggregation interval for scheduled settlements.
type SettlementWindow string

const (
	WindowImmediate SettlementWindow = "IMMEDIATE"
	WindowHourly    SettlementWindow = "HOURLY"
	WindowDaily     SettlementWindow = "DAILY"
	WindowMilestone SettlementWindow = "MILESTONE"
	WindowManual    SettlementWindow = "MANUAL"
)

// BatchItemStatus tracks individual obligations within an aggregate batch.
type BatchItemStatus string

const (
	BatchItemPending    BatchItemStatus = "PENDING"
	BatchItemSubmitted  BatchItemStatus = "SUBMITTED"
	BatchItemSettled    BatchItemStatus = "SETTLED"
	BatchItemFailed     BatchItemStatus = "FAILED"
	BatchItemReconciling BatchItemStatus = "RECONCILING"
)

// SettlementBatchItem enables partial settlement and atomicity tracking.
type SettlementBatchItem struct {
	ItemID          string          `json:"item_id"`
	BatchID         string          `json:"batch_id"`
	ObligationID    string          `json:"obligation_id"`
	Amount          string          `json:"amount"` // micro-USDC
	Currency        string          `json:"currency"`
	Status          BatchItemStatus `json:"status"` // PENDING, SUBMITTED, SETTLED, FAILED, RECONCILING
	PaymentIntentID string          `json:"payment_intent_id,omitempty"`
	TransactionHash string          `json:"transaction_hash,omitempty"`
	ErrorMessage    string          `json:"error_message,omitempty"`
	ReconciledAt    *time.Time      `json:"reconciled_at,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
}

// NettingApprovalStatus specifies policy evaluation for netting execution.
type NettingApprovalStatus string

const (
	NettingAutoEligible     NettingApprovalStatus = "AUTOMATICALLY_ELIGIBLE"
	NettingRequiresApproval NettingApprovalStatus = "REQUIRES_APPROVAL"
	NettingBlocked          NettingApprovalStatus = "BLOCKED"
)

// ProposedNetObligation represents a compressed net transfer between counterparties.
type ProposedNetObligation struct {
	PayerAgentID           string   `json:"payer_agent_id"`
	PayeeAgentID           string   `json:"payee_agent_id"`
	Amount                 string   `json:"amount"` // micro-USDC
	OriginalObligationRefs []string `json:"original_obligation_refs"`
}

// MultiPartyNettingProposal captures multi-party or cycle graph netting offsets.
type MultiPartyNettingProposal struct {
	ProposalID              string                   `json:"proposal_id"`
	TenantID                string                   `json:"tenant_id"`
	OrganizationID          string                   `json:"organization_id"`
	Currency                string                   `json:"currency"`
	OriginalObligations     []string                 `json:"original_obligations"`
	ProposedNetObligations  []*ProposedNetObligation `json:"proposed_net_obligations"`
	GrossValue              string                   `json:"gross_value"`
	NetValue                string                   `json:"net_value"`
	SavingsValue            string                   `json:"savings_value"`
	Counterparties          []string                 `json:"counterparties"`
	ApprovalStatus          NettingApprovalStatus    `json:"approval_status"` // AUTOMATICALLY_ELIGIBLE, REQUIRES_APPROVAL, BLOCKED
	Status                  NettingStatus            `json:"status"`          // PROPOSED, ELIGIBLE, APPROVED, EXECUTED, REJECTED, EXPIRED
	EconomicImpact          string                   `json:"economic_impact"`
	CreatedAt               time.Time                `json:"created_at"`
	ExpiresAt               time.Time                `json:"expires_at"`
	ExecutedAt              *time.Time               `json:"executed_at,omitempty"`
}

// DisputeStatus represents lifecycle states of an obligation dispute.
type DisputeStatus string

const (
	DisputeOpen        DisputeStatus = "OPEN"
	DisputeUnderReview DisputeStatus = "UNDER_REVIEW"
	DisputeResolved    DisputeStatus = "RESOLVED"
	DisputeEscalated   DisputeStatus = "ESCALATED"
	DisputeClosed      DisputeStatus = "CLOSED"
)

// ClearingDispute tracks formal dispute records on clearinghouse obligations.
type ClearingDispute struct {
	DisputeID         string                 `json:"dispute_id"`
	TenantID          string                 `json:"tenant_id"`
	OrganizationID    string                 `json:"organization_id"`
	ObligationID      string                 `json:"obligation_id"`
	ContractID        string                 `json:"contract_id,omitempty"`
	ClaimantAgentID   string                 `json:"claimant_agent_id"`
	RespondentAgentID string                 `json:"respondent_agent_id"`
	Amount            string                 `json:"amount"` // micro-USDC
	Currency          string                 `json:"currency"`
	Reason            string                 `json:"reason"`
	Status            DisputeStatus          `json:"status"` // OPEN, UNDER_REVIEW, RESOLVED, ESCALATED, CLOSED
	Evidence          map[string]interface{} `json:"evidence,omitempty"`
	CreatedAt         time.Time              `json:"created_at"`
	ResolvedAt        *time.Time             `json:"resolved_at,omitempty"`
}

// ReconItemStatus categorizes discrepancy types in reconciliation.
type ReconItemStatus string

const (
	ReconItemMatched          ReconItemStatus = "MATCHED"
	ReconItemMissingReceipt   ReconItemStatus = "MISSING_RECEIPT"
	ReconItemUnmatchedReceipt ReconItemStatus = "UNMATCHED_RECEIPT"
	ReconItemAmountMismatch   ReconItemStatus = "AMOUNT_MISMATCH"
	ReconItemRecipientMismatch ReconItemStatus = "RECIPIENT_MISMATCH"
	ReconItemChainMismatch    ReconItemStatus = "CHAIN_MISMATCH"
	ReconItemDuplicateEvidence ReconItemStatus = "DUPLICATE_EVIDENCE"
	ReconItemAmbiguous        ReconItemStatus = "AMBIGUOUS"
)

// ReconSeverity indicates operational impact of a reconciliation item.
type ReconSeverity string

const (
	SeverityInfo             ReconSeverity = "INFO"
	SeverityWarning          ReconSeverity = "WARNING"
	SeveritySecurityIncident ReconSeverity = "SECURITY_INCIDENT"
)

// ReconciliationItem holds structured audit findings with safe remediation steps.
type ReconciliationItem struct {
	ItemID            string          `json:"item_id"`
	TenantID          string          `json:"tenant_id"`
	ObligationID      string          `json:"obligation_id"`
	PaymentIntentID   string          `json:"payment_intent_id"`
	ExpectedAmount    string          `json:"expected_amount"`
	ObservedAmount    string          `json:"observed_amount,omitempty"`
	ExpectedRecipient string          `json:"expected_recipient"`
	ObservedRecipient string          `json:"observed_recipient,omitempty"`
	ChainID           string          `json:"chain_id"`
	TransactionHash   string          `json:"transaction_hash,omitempty"`
	Difference        string          `json:"difference"`
	Status            ReconItemStatus `json:"status"`
	Severity          ReconSeverity   `json:"severity"`
	SafeNextAction    string          `json:"safe_next_action"`
	CreatedAt         time.Time       `json:"created_at"`
}

// EconomicCausalLink stores the full deterministic provenance trace of a financial settlement.
type EconomicCausalLink struct {
	LinkID               string    `json:"link_id"`
	TenantID             string    `json:"tenant_id"`
	TraceID              string    `json:"trace_id"`
	ObjectiveID          string    `json:"objective_id,omitempty"`
	MissionID            string    `json:"mission_id,omitempty"`
	TaskID               string    `json:"task_id,omitempty"`
	AgentID              string    `json:"agent_id"`
	ContractID           string    `json:"contract_id,omitempty"`
	ObligationID         string    `json:"obligation_id"`
	PolicyDecision       string    `json:"policy_decision,omitempty"`
	RiskScore            int       `json:"risk_score,omitempty"`
	ApprovalID           string    `json:"approval_id,omitempty"`
	ReservationID        string    `json:"reservation_id,omitempty"`
	PaymentIntentID      string    `json:"payment_intent_id,omitempty"`
	VaultAddress         string    `json:"vault_address,omitempty"`
	ArcChainID           string    `json:"arc_chain_id,omitempty"`
	TransactionHash      string    `json:"transaction_hash,omitempty"`
	BlockNumber          int64     `json:"block_number,omitempty"`
	ReceiptStatus        int       `json:"receipt_status,omitempty"`
	ReconciliationStatus string    `json:"reconciliation_status,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
}

// FinancialTrace provides complete, clickable end-to-end auditability.
type FinancialTrace struct {
	TraceID              string                `json:"trace_id"`
	ObjectiveID          string                `json:"objective_id,omitempty"`
	MissionID            string                `json:"mission_id,omitempty"`
	TaskID               string                `json:"task_id,omitempty"`
	AgentID              string                `json:"agent_id"`
	ContractID           string                `json:"contract_id,omitempty"`
	Obligation           *EconomicObligation   `json:"obligation"`
	PolicyDecision       string                `json:"policy_decision"`
	RiskScore            int                   `json:"risk_score"`
	ApprovalStatus       string                `json:"approval_status"`
	ReservationID        string                `json:"reservation_id,omitempty"`
	PaymentIntentID      string                `json:"payment_intent_id,omitempty"`
	VaultAddress         string                `json:"vault_address,omitempty"`
	ArcChainID           string                `json:"arc_chain_id,omitempty"`
	TransactionHash      string                `json:"transaction_hash,omitempty"`
	BlockNumber          int64                 `json:"block_number,omitempty"`
	ReceiptStatus        int                   `json:"receipt_status,omitempty"`
	ReconciliationRecord *ReconciliationRecord `json:"reconciliation_record,omitempty"`
	LedgerEntries        []*ClearingLedgerEntry `json:"ledger_entries,omitempty"`
	VerifiedOnChain      bool                  `json:"verified_on_chain"`
	Timestamp            time.Time             `json:"timestamp"`
}

// UnsettledExplanation provides transparent rationale for why an obligation has not settled.
type UnsettledExplanation struct {
	ObligationID    string           `json:"obligation_id"`
	Status          ObligationStatus `json:"status"`
	ReasonCode      string           `json:"reason_code"`
	Explanation     string           `json:"explanation"`
	RequiredActions []string         `json:"required_actions"`
	Timestamp       time.Time        `json:"timestamp"`
}

// LiquidityPriority classifies settlement urgency when treasury liquidity is constrained.
type LiquidityPriority string

const (
	PriorityCritical      LiquidityPriority = "CRITICAL"
	PriorityTimeSensitive LiquidityPriority = "TIME_SENSITIVE"
	PriorityStandard      LiquidityPriority = "STANDARD"
	PriorityDeferred      LiquidityPriority = "DEFERRED"
)

// ClearingHealth summarizes operational clearinghouse health without obscuring details.
type ClearingHealth struct {
	OpenObligations       int       `json:"open_obligations"`
	OverdueObligations     int       `json:"overdue_obligations"`
	PendingSettlements    int       `json:"pending_settlements"`
	ReconciliationBacklog int       `json:"reconciliation_backlog"`
	DisputedValue         string    `json:"disputed_value"` // micro-USDC
	NettableValue         string    `json:"nettable_value"` // micro-USDC
	BatchCount            int       `json:"batch_count"`
	FailedSettlements     int       `json:"failed_settlements"`
	Timestamp             time.Time `json:"timestamp"`
	Source                string    `json:"source"`
	Freshness             string    `json:"freshness"`
}

// ExposureLimits defines policy boundaries across agent and organization hierarchies.
type ExposureLimits struct {
	AgentLimit        string `json:"agent_limit"`
	OrganizationLimit string `json:"organization_limit"`
	ContractLimit     string `json:"contract_limit"`
	MissionLimit      string `json:"mission_limit"`
	GlobalLimit       string `json:"global_limit"`
}

// ObligationGraphNode represents an entity in the economic network graph.
type ObligationGraphNode struct {
	ID             string `json:"id"`
	Type           string `json:"type"` // "AGENT", "ORGANIZATION", "CONTRACT"
	Label          string `json:"label"`
	Exposure       string `json:"exposure"`
	ActiveCount    int    `json:"active_count"`
	SettledAmount  string `json:"settled_amount"`
	PendingAmount  string `json:"pending_amount"`
}

// ObligationGraphEdge represents an economic relationship or obligation between nodes.
type ObligationGraphEdge struct {
	ID             string `json:"id"`
	Source         string `json:"source"`
	Target         string `json:"target"`
	Relationship   string `json:"relationship"` // "OWES", "OWED_BY", "CONTRACTED_WITH", "DISPUTED_WITH"
	Amount         string `json:"amount"`
	Currency       string `json:"currency"`
	ObligationID   string `json:"obligation_id,omitempty"`
	ContractID     string `json:"contract_id,omitempty"`
	Status         string `json:"status"`
}

// ObligationGraph represents the complete derived network topology.
type ObligationGraph struct {
	Nodes []*ObligationGraphNode `json:"nodes"`
	Edges []*ObligationGraphEdge `json:"edges"`
}

// ClearingSimulationRequest sets parameters for counterfactual clearing simulation.
type ClearingSimulationRequest struct {
	ScenarioType    string   `json:"scenario_type"` // "NETTING", "PROVIDER_FAIL", "LIQUIDITY_DROP", "STORM"
	ObligationIDs   []string `json:"obligation_ids,omitempty"`
	FailedAgentID   string   `json:"failed_agent_id,omitempty"`
	LiquidityCutBps int      `json:"liquidity_cut_bps,omitempty"`
}

// ClearingSimulationResult outputs projected outcomes from simulation.
type ClearingSimulationResult struct {
	SimulationID      string    `json:"simulation_id"`
	Mode              string    `json:"mode"` // "SIMULATION"
	GrossValue        string    `json:"gross_value"`
	NetValue          string    `json:"net_value"`
	TransactionCount  int       `json:"transaction_count"`
	ProjectedExposure string    `json:"projected_exposure"`
	LiquidityRequired string    `json:"liquidity_required"`
	OperationalImpact string    `json:"operational_impact"`
	Timestamp         time.Time `json:"timestamp"`
}

// ClearingCounterfactual provides side-by-side current vs projected comparison.
type ClearingCounterfactual struct {
	CurrentGrossValue     string                    `json:"current_gross_value"`
	CurrentNetValue       string                    `json:"current_net_value"`
	CurrentTransactions   int                       `json:"current_transactions"`
	ProposedGrossValue    string                    `json:"proposed_gross_value"`
	ProposedNetValue      string                    `json:"proposed_net_value"`
	ProposedTransactions  int                       `json:"proposed_transactions"`
	SavingsValue          string                    `json:"savings_value"`
	RiskChange            string                    `json:"risk_change"`
	LiquidityImpact       string                    `json:"liquidity_impact"`
	Counterparties        []string                  `json:"counterparties"`
	NettingProposal       *MultiPartyNettingProposal `json:"netting_proposal,omitempty"`
}
