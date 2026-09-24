package clearinghouse

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
	"time"
)

// Security Invariants INV-55 to INV-70
const (
	INV55_ObligationsDoNotAuthorizePayments               = "INV-55: Obligations do not authorize payments"
	INV56_InvoicesCannotCreateArbitraryRecipients          = "INV-56: Invoices cannot create arbitrary payment recipients"
	INV57_VerifiedMilestoneRequiredBeforeSettlement       = "INV-57: Verified milestone is required before milestone settlement"
	INV58_RecurringSchedulesDoNotGrantPermanentAuth       = "INV-58: Recurring schedules do not grant permanent authorization"
	INV59_EveryRecurringPaymentRevalidatesCurrentPolicy   = "INV-59: Every recurring payment revalidates current policy"
	INV60_NettingCannotIncreaseFinancialAuthority         = "INV-60: Netting cannot increase financial authority"
	INV61_NettingPreservesOriginalObligationHistory       = "INV-61: Netting preserves original obligation history"
	INV62_SettlementBatchesCannotBypassIndividualPolicy   = "INV-62: Settlement batches cannot bypass individual policy"
	INV63_InternalClearingLedgerCannotCreateRealFunds     = "INV-63: Internal clearing ledger cannot create real funds"
	INV64_SimulatedSettlementCannotBecomeRealSettlement   = "INV-64: Simulated settlement cannot become real settlement"
	INV65_OnlyVerifiedBlockchainEvidenceMarksRealSettled  = "INV-65: Only verified blockchain evidence can mark real settlement complete"
	INV66_RefundCannotExceedOriginalSettledAmount         = "INV-66: Refund cannot exceed original settled amount"
	INV67_CreditCannotBeMintedByExternalAgents            = "INV-67: Credit cannot be minted by external agents"
	INV68_ReconciliationNeverSilentlyRepairsMismatches    = "INV-68: Reconciliation never silently repairs mismatches"
	INV69_AmbiguousBlockchainStateCannotBeMarkedSettled   = "INV-69: Ambiguous blockchain state cannot be marked settled"
	INV70_ChildObligationsCannotExceedParentAuth          = "INV-70: Child obligations cannot exceed parent financial authority"
)

// ObligationStatus represents the discrete lifecycle states of an economic obligation.
type ObligationStatus string

const (
	ObligationProposed          ObligationStatus = "PROPOSED"
	ObligationAuthorized        ObligationStatus = "AUTHORIZED"
	ObligationReserved          ObligationStatus = "RESERVED"
	ObligationDue               ObligationStatus = "DUE"
	ObligationSubmitted         ObligationStatus = "SUBMITTED"
	ObligationVerified          ObligationStatus = "VERIFIED"
	ObligationSettlementPending ObligationStatus = "SETTLEMENT_PENDING"
	ObligationSettled           ObligationStatus = "SETTLED"
	ObligationPartiallySettled  ObligationStatus = "PARTIALLY_SETTLED"
	ObligationDisputed          ObligationStatus = "DISPUTED"
	ObligationCancelled         ObligationStatus = "CANCELLED"
	ObligationExpired           ObligationStatus = "EXPIRED"
	ObligationRefunded          ObligationStatus = "REFUNDED"
)

// EscrowStatus represents the state of reserved funds locked for a contract/milestone.
type EscrowStatus string

const (
	EscrowCreated           EscrowStatus = "CREATED"
	EscrowReserved          EscrowStatus = "RESERVED"
	EscrowPartiallyReleased EscrowStatus = "PARTIALLY_RELEASED"
	EscrowReleased          EscrowStatus = "RELEASED"
	EscrowDisputed          EscrowStatus = "DISPUTED"
	EscrowRefunded          EscrowStatus = "REFUNDED"
	EscrowCancelled         EscrowStatus = "CANCELLED"
)

// MilestoneStatus represents the verification and settlement state of a contract milestone.
type MilestoneStatus string

const (
	MilestonePending   MilestoneStatus = "PENDING"
	MilestoneSubmitted MilestoneStatus = "SUBMITTED"
	MilestoneVerified  MilestoneStatus = "VERIFIED"
	MilestoneRejected  MilestoneStatus = "REJECTED"
	MilestoneSettled   MilestoneStatus = "SETTLED"
	MilestoneDisputed  MilestoneStatus = "DISPUTED"
)

// InvoiceStatus represents the lifecycle of a provider's claim for payment.
type InvoiceStatus string

const (
	InvoiceDraft            InvoiceStatus = "DRAFT"
	InvoiceIssued           InvoiceStatus = "ISSUED"
	InvoiceAccepted         InvoiceStatus = "ACCEPTED"
	InvoiceRejected         InvoiceStatus = "REJECTED"
	InvoiceDisputed         InvoiceStatus = "DISPUTED"
	InvoiceDue              InvoiceStatus = "DUE"
	InvoiceSettled          InvoiceStatus = "SETTLED"
	InvoicePartiallySettled InvoiceStatus = "PARTIALLY_SETTLED"
	InvoiceVoid             InvoiceStatus = "VOID"
)

// ScheduleType defines the temporal rhythm of obligations.
type ScheduleType string

const (
	ScheduleOneTime     ScheduleType = "ONE_TIME"
	ScheduleMilestone   ScheduleType = "MILESTONE"
	ScheduleRecurring   ScheduleType = "RECURRING"
	SchedulePeriodic    ScheduleType = "PERIODIC"
	ScheduleConditional ScheduleType = "CONDITIONAL"
)

// NettingStatus tracks bilateral or multilateral obligation offset proposals.
type NettingStatus string

const (
	NettingProposed NettingStatus = "PROPOSED"
	NettingEligible NettingStatus = "ELIGIBLE"
	NettingApproved NettingStatus = "APPROVED"
	NettingExecuted NettingStatus = "EXECUTED"
	NettingRejected NettingStatus = "REJECTED"
	NettingExpired  NettingStatus = "EXPIRED"
)

// BatchStatus represents the execution state of an aggregated settlement batch.
type BatchStatus string

const (
	BatchOpen             BatchStatus = "OPEN"
	BatchReady            BatchStatus = "READY"
	BatchAuthorized       BatchStatus = "AUTHORIZED"
	BatchExecuting        BatchStatus = "EXECUTING"
	BatchPartiallySettled BatchStatus = "PARTIALLY_SETTLED"
	BatchSettled          BatchStatus = "SETTLED"
	BatchFailed           BatchStatus = "FAILED"
	BatchReconciling      BatchStatus = "RECONCILING"
)

// RefundStatus represents the lifecycle of a refund operation.
type RefundStatus string

const (
	RefundRequested  RefundStatus = "REQUESTED"
	RefundValidating RefundStatus = "VALIDATING"
	RefundApproved   RefundStatus = "APPROVED"
	RefundRejected   RefundStatus = "REJECTED"
	RefundExecuting  RefundStatus = "EXECUTING"
	RefundSettled    RefundStatus = "SETTLED"
)

// ReconciliationStatus represents the outcome of an audit comparison.
type ReconciliationStatus string

const (
	ReconMatched        ReconciliationStatus = "MATCHED"
	ReconMismatch       ReconciliationStatus = "MISMATCH"
	ReconPending        ReconciliationStatus = "PENDING"
	ReconAmbiguous      ReconciliationStatus = "AMBIGUOUS"
	ReconRequiresReview ReconciliationStatus = "REQUIRES_REVIEW"
)

// ExecutionMode distinguishes real financial movements from simulations.
type ExecutionMode string

const (
	ModeReal       ExecutionMode = "REAL"
	ModeSimulation ExecutionMode = "SIMULATION"
)

// EconomicObligation represents a commitment that a payment may become due if conditions are met.
// CRITICAL: An obligation is NOT a payment authorization. It records expected future liabilities.
type EconomicObligation struct {
	ObligationID            string                 `json:"obligation_id"`
	OrganizationID          string                 `json:"organization_id"`
	PayerAgentID            string                 `json:"payer_agent_id"`
	PayeeAgentID            string                 `json:"payee_agent_id"`
	ContractID              string                 `json:"contract_id"`
	MissionID               string                 `json:"mission_id,omitempty"`
	Capability              string                 `json:"capability"`
	Amount                  string                 `json:"amount"` // micro-USDC integer base units
	SettledAmount           string                 `json:"settled_amount"`
	Currency                string                 `json:"currency"` // "USDC"
	Status                  ObligationStatus       `json:"status"`
	DueAt                   time.Time              `json:"due_at"`
	CreatedAt               time.Time              `json:"created_at"`
	ExpiresAt               time.Time              `json:"expires_at"`
	Conditions              map[string]interface{} `json:"conditions,omitempty"`
	PolicyVersion           string                 `json:"policy_version"`
	PolicyHash              string                 `json:"policy_hash"`
	RiskSnapshot            map[string]interface{} `json:"risk_snapshot,omitempty"`
	VerificationRequirement string                 `json:"verification_requirement"`
	PaymentIntentID         string                 `json:"payment_intent_id,omitempty"`
	ExecutionMode           ExecutionMode          `json:"execution_mode"` // REAL or SIMULATION
	Metadata                map[string]string      `json:"metadata,omitempty"`
}

// EconomicEscrow maps locked contract value to existing treasury reservation mechanisms.
// Does NOT create a second wallet or off-chain balance ledger.
type EconomicEscrow struct {
	EscrowID          string                 `json:"escrow_id"`
	ObligationID      string                 `json:"obligation_id"`
	ContractID        string                 `json:"contract_id"`
	OrganizationID    string                 `json:"organization_id"`
	Payer             string                 `json:"payer"`
	Payee             string                 `json:"payee"`
	VaultAddress      string                 `json:"vault_address"`
	Amount            string                 `json:"amount"` // micro-USDC
	ReservedAmount    string                 `json:"reserved_amount"`
	ReleasedAmount    string                 `json:"released_amount"`
	RefundedAmount    string                 `json:"refunded_amount"`
	Status            EscrowStatus           `json:"status"`
	ReservationID     string                 `json:"reservation_id,omitempty"` // Foreign key to treasury reservation
	ReleaseConditions map[string]interface{} `json:"release_conditions,omitempty"`
	ExecutionMode     ExecutionMode          `json:"execution_mode"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
}

// PaymentMilestone defines a verifiable step within an inter-agent contract.
type PaymentMilestone struct {
	MilestoneID      string          `json:"milestone_id"`
	ContractID       string          `json:"contract_id"`
	ObligationID     string          `json:"obligation_id"`
	OrganizationID   string          `json:"organization_id"`
	Sequence         int             `json:"sequence"`
	Description      string          `json:"description"`
	Amount           string          `json:"amount"` // micro-USDC
	VerificationRule string          `json:"verification_rule"`
	DueAt            time.Time       `json:"due_at"`
	Status           MilestoneStatus `json:"status"`
	ActualOutput     string          `json:"actual_output,omitempty"`
	ResultHash       string          `json:"result_hash,omitempty"`
	EvidenceURI      string          `json:"evidence_uri,omitempty"`
	VerifiedAt       *time.Time      `json:"verified_at,omitempty"`
	SettledAt        *time.Time      `json:"settled_at,omitempty"`
	PaymentIntentID  string          `json:"payment_intent_id,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

// InvoiceLineItem defines a specific billable item on an invoice.
type InvoiceLineItem struct {
	ItemNumber  int    `json:"item_number"`
	Description string `json:"description"`
	MilestoneID string `json:"milestone_id,omitempty"`
	Quantity    int64  `json:"quantity"`
	UnitPrice   string `json:"unit_price"`
	Amount      string `json:"amount"` // micro-USDC
}

// EconomicInvoice represents a formal claim for payment under an authorized contract.
type EconomicInvoice struct {
	InvoiceID        string            `json:"invoice_id"`
	ContractID       string            `json:"contract_id"`
	ObligationID     string            `json:"obligation_id"`
	OrganizationID   string            `json:"organization_id"`
	ProviderAgentID  string            `json:"provider_agent_id"`
	RequesterAgentID string            `json:"requester_agent_id"`
	Amount           string            `json:"amount"` // micro-USDC
	Currency         string            `json:"currency"`
	LineItems        []InvoiceLineItem `json:"line_items"`
	Evidence         map[string]string `json:"evidence,omitempty"`
	MilestoneRefs    []string          `json:"milestone_refs,omitempty"`
	IssuedAt         time.Time         `json:"issued_at"`
	DueAt            time.Time         `json:"due_at"`
	Status           InvoiceStatus     `json:"status"`
	InvoiceHash      string            `json:"invoice_hash"` // SHA-256 of canonical payload
	PaymentIntentID  string            `json:"payment_intent_id,omitempty"`
	ExecutionMode    ExecutionMode     `json:"execution_mode"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
}

// CalculateInvoiceHash computes a deterministic SHA-256 fingerprint for tamper protection.
func (inv *EconomicInvoice) CalculateInvoiceHash() string {
	data := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%d|%d",
		inv.ContractID,
		inv.ObligationID,
		inv.ProviderAgentID,
		inv.RequesterAgentID,
		inv.Amount,
		inv.Currency,
		inv.IssuedAt.Unix(),
		inv.DueAt.Unix(),
	)
	for _, item := range inv.LineItems {
		data += fmt.Sprintf("|%d:%s:%s", item.ItemNumber, item.Description, item.Amount)
	}
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// PaymentSchedule defines recurring or milestone-driven payment obligations.
type PaymentSchedule struct {
	ScheduleID         string       `json:"schedule_id"`
	ContractID         string       `json:"contract_id"`
	OrganizationID     string       `json:"organization_id"`
	PayerAgentID       string       `json:"payer_agent_id"`
	PayeeAgentID       string       `json:"payee_agent_id"`
	ScheduleType       ScheduleType `json:"schedule_type"`
	Frequency          string       `json:"frequency,omitempty"` // "DAILY", "WEEKLY", "MONTHLY"
	AmountPerPayment   string       `json:"amount_per_payment"`  // micro-USDC
	MaxOccurrences     int          `json:"max_occurrences"`
	OccurredCount      int          `json:"occurred_count"`
	MaxTotalValue      string       `json:"max_total_value"` // micro-USDC ceiling
	TotalSettledValue  string       `json:"total_settled_value"`
	Currency           string       `json:"currency"`
	StartDate          time.Time    `json:"start_date"`
	EndDate            *time.Time   `json:"end_date,omitempty"`
	NextRunAt          time.Time    `json:"next_run_at"`
	Active             bool         `json:"active"`
	CancellationPolicy string       `json:"cancellation_policy"`
	CreatedAt          time.Time    `json:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at"`
}

// LedgerEntryType defines internal double-entry debit/credit categories.
type LedgerEntryType string

const (
	LedgerObligationCreated LedgerEntryType = "OBLIGATION_CREATED"
	LedgerFundsReserved     LedgerEntryType = "FUNDS_RESERVED"
	LedgerFundsReleased     LedgerEntryType = "FUNDS_RELEASED"
	LedgerPaymentSettled    LedgerEntryType = "PAYMENT_SETTLED"
	LedgerRefundProcessed   LedgerEntryType = "REFUND_PROCESSED"
	LedgerCreditApplied     LedgerEntryType = "CREDIT_APPLIED"
	LedgerNettingOffset     LedgerEntryType = "NETTING_OFFSET"
)

// ClearingLedgerEntry tracks internal balanced entries for obligation accounting.
// CRITICAL: This is an internal coordinating ledger, NOT a replacement for Arc blockchain truth.
type ClearingLedgerEntry struct {
	EntryID         string          `json:"entry_id"`
	OrganizationID  string          `json:"organization_id"`
	ObligationID    string          `json:"obligation_id"`
	ContractID      string          `json:"contract_id,omitempty"`
	InvoiceID       string          `json:"invoice_id,omitempty"`
	MilestoneID     string          `json:"milestone_id,omitempty"`
	PaymentIntentID string          `json:"payment_intent_id,omitempty"`
	TransactionHash string          `json:"transaction_hash,omitempty"`
	EntryType       LedgerEntryType `json:"entry_type"`
	DebitAccount    string          `json:"debit_account"`  // e.g. "payer_obligations"
	CreditAccount   string          `json:"credit_account"` // e.g. "payee_receivables"
	Amount          string          `json:"amount"`         // micro-USDC
	Currency        string          `json:"currency"`
	ExecutionMode   ExecutionMode   `json:"execution_mode"`
	Timestamp       time.Time       `json:"timestamp"`
	Hash            string          `json:"hash"`
}

// NettingProposal holds calculated bilateral offsets between peer agents.
type NettingProposal struct {
	ProposalID     string        `json:"proposal_id"`
	OrganizationID string        `json:"organization_id"`
	AgentA         string        `json:"agent_a"`
	AgentB         string        `json:"agent_b"`
	Currency       string        `json:"currency"`
	ObligationsAtoB []string      `json:"obligations_a_to_b"` // IDs of obligations where A owes B
	ObligationsBtoA []string      `json:"obligations_b_to_a"` // IDs of obligations where B owes A
	GrossAmountAtoB string        `json:"gross_amount_a_to_b"` // micro-USDC
	GrossAmountBtoA string        `json:"gross_amount_b_to_a"` // micro-USDC
	GrossTotal      string        `json:"gross_total"`
	NetPayer        string        `json:"net_payer"`
	NetPayee        string        `json:"net_payee"`
	NetAmount       string        `json:"net_amount"`
	SavingsAmount   string        `json:"savings_amount"`
	Status          NettingStatus `json:"status"`
	ApprovedByA     bool          `json:"approved_by_a"`
	ApprovedByB     bool          `json:"approved_by_b"`
	PaymentIntentID string        `json:"payment_intent_id,omitempty"`
	CreatedAt       time.Time     `json:"created_at"`
	ExpiresAt       time.Time     `json:"expires_at"`
	ExecutedAt      *time.Time    `json:"executed_at,omitempty"`
}

// SettlementBatch represents an aggregated package of authorized payments for scheduled settlement.
type SettlementBatch struct {
	BatchID         string        `json:"batch_id"`
	OrganizationID  string        `json:"organization_id"`
	Currency        string        `json:"currency"`
	ObligationIDs   []string      `json:"obligation_ids"`
	GrossAmount     string        `json:"gross_amount"`
	NetAmount       string        `json:"net_amount"`
	Savings         string        `json:"savings"`
	Status          BatchStatus   `json:"status"`
	FailureReason   string        `json:"failure_reason,omitempty"`
	PaymentIntentIDs []string     `json:"payment_intent_ids,omitempty"`
	ExecutionMode   ExecutionMode `json:"execution_mode"`
	CreatedAt       time.Time     `json:"created_at"`
	ExecutedAt      *time.Time    `json:"executed_at,omitempty"`
}

// RefundRequest specifies a request to return previously settled value.
type RefundRequest struct {
	RefundID          string        `json:"refund_id"`
	OriginalPaymentID string        `json:"original_payment_id"` // PaymentIntentID
	ContractID        string        `json:"contract_id"`
	ObligationID      string        `json:"obligation_id"`
	OrganizationID    string        `json:"organization_id"`
	RequesterAgentID  string        `json:"requester_agent_id"`
	Reason            string        `json:"reason"`
	OriginalAmount    string        `json:"original_amount"` // micro-USDC
	RefundAmount      string        `json:"refund_amount"`   // micro-USDC <= original
	Evidence          string        `json:"evidence,omitempty"`
	Status            RefundStatus  `json:"status"`
	PaymentIntentID   string        `json:"payment_intent_id,omitempty"` // New refund payment intent
	ExecutionMode     ExecutionMode `json:"execution_mode"`
	CreatedAt         time.Time     `json:"created_at"`
	ResolvedAt        *time.Time    `json:"resolved_at,omitempty"`
}

// EconomicCredit represents an authorized adjustment credit tied to a verified prior event.
type EconomicCredit struct {
	CreditID        string        `json:"credit_id"`
	OrganizationID  string        `json:"organization_id"`
	AgentID         string        `json:"agent_id"`
	ObligationRef   string        `json:"obligation_ref,omitempty"`
	ContractRef     string        `json:"contract_ref,omitempty"`
	Amount          string        `json:"amount"` // micro-USDC
	Currency        string        `json:"currency"`
	Reason          string        `json:"reason"`
	IssuedBy        string        `json:"issued_by"` // Governance/System authority only
	ExpiresAt       time.Time     `json:"expires_at"`
	RemainingAmount string        `json:"remaining_amount"`
	CreatedAt       time.Time     `json:"created_at"`
}

// ReconciliationRecord captures a machine-checked audit comparison between expected and actual state.
type ReconciliationRecord struct {
	RecordID             string               `json:"record_id"`
	OrganizationID       string               `json:"organization_id"`
	ObligationID         string               `json:"obligation_id"`
	PaymentIntentID      string               `json:"payment_intent_id"`
	TransactionHash      string               `json:"transaction_hash,omitempty"`
	Status               ReconciliationStatus `json:"status"`
	ExpectedAmount       string               `json:"expected_amount"`
	ActualAmount         string               `json:"actual_amount"`
	ExpectedRecipient    string               `json:"expected_recipient"`
	ActualRecipient      string               `json:"actual_recipient"`
	ChainID              string               `json:"chain_id"`
	TargetContract       string               `json:"target_contract"`
	DiscrepancyNotes     string               `json:"discrepancy_notes,omitempty"`
	RecommendedAction    string               `json:"recommended_action,omitempty"`
	ExecutionMode        ExecutionMode        `json:"execution_mode"`
	ReconciledAt         time.Time            `json:"reconciled_at"`
}

// CounterpartyExposure breaks down financial exposure per external agent or provider.
type CounterpartyExposure struct {
	AgentID               string `json:"agent_id"`
	TotalContracts        int    `json:"total_contracts"`
	ActiveObligations     int    `json:"active_obligations"`
	AmountOwed            string `json:"amount_owed"` // micro-USDC
	AmountPaid            string `json:"amount_paid"`
	AmountReserved        string `json:"amount_reserved"`
	AmountDisputed        string `json:"amount_disputed"`
	AmountRefunded        string `json:"amount_refunded"`
	MaxPossibleExposure   string `json:"max_possible_exposure"`
}

// EconomicExposureSnapshot aggregates total potential liability across an organization.
type EconomicExposureSnapshot struct {
	OrganizationID            string                            `json:"organization_id"`
	SnapshotTimestamp         time.Time                         `json:"snapshot_timestamp"`
	CurrentExposure           string                            `json:"current_exposure"` // micro-USDC
	MaxPossibleExposure       string                            `json:"max_possible_exposure"`
	OutstandingObligations    string                            `json:"outstanding_obligations"`
	ReservedFunds             string                            `json:"reserved_funds"`
	PendingInvoices           string                            `json:"pending_invoices"`
	ScheduledPayments         string                            `json:"scheduled_payments"`
	DisputedValue             string                            `json:"disputed_value"`
	PotentialMilestoneExposure string                           `json:"potential_milestone_exposure"`
	CounterpartyBreakdown     map[string]*CounterpartyExposure  `json:"counterparty_breakdown"`
	ExecutionMode             ExecutionMode                     `json:"execution_mode"`
}

// EconomicHealthSnapshot provides multi-dimensional health metrics without hiding details.
type EconomicHealthSnapshot struct {
	OrganizationID              string        `json:"organization_id"`
	Timestamp                   time.Time     `json:"timestamp"`
	AvailableFunds              string        `json:"available_funds"`   // micro-USDC
	ReservedFunds               string        `json:"reserved_funds"`
	OutstandingObligations      string        `json:"outstanding_obligations"`
	PendingSettlement           string        `json:"pending_settlement"`
	DisputedFunds               string        `json:"disputed_funds"`
	ScheduledExposure           string        `json:"scheduled_exposure"`
	NetReceivables              string        `json:"net_receivables"`
	NetPayables                 string        `json:"net_payables"`
	SettlementSuccessRateBps    int           `json:"settlement_success_rate_bps"` // 0-10000
	ReconciliationMismatchCount int           `json:"reconciliation_mismatch_count"`
	ActiveContractsCount        int           `json:"active_contracts_count"`
	ExecutionMode               ExecutionMode `json:"execution_mode"`
}

// Helper functions for checked base unit arithmetic
func AddBaseUnits(a, b string) (string, error) {
	ia, ok := new(big.Int).SetString(strings.TrimSpace(a), 10)
	if !ok || ia.Sign() < 0 {
		return "", fmt.Errorf("invalid base units: %s", a)
	}
	ib, ok := new(big.Int).SetString(strings.TrimSpace(b), 10)
	if !ok || ib.Sign() < 0 {
		return "", fmt.Errorf("invalid base units: %s", b)
	}
	return new(big.Int).Add(ia, ib).String(), nil
}

func SubBaseUnits(a, b string) (string, error) {
	ia, ok := new(big.Int).SetString(strings.TrimSpace(a), 10)
	if !ok || ia.Sign() < 0 {
		return "", fmt.Errorf("invalid base units: %s", a)
	}
	ib, ok := new(big.Int).SetString(strings.TrimSpace(b), 10)
	if !ok || ib.Sign() < 0 {
		return "", fmt.Errorf("invalid base units: %s", b)
	}
	if ia.Cmp(ib) < 0 {
		return "", fmt.Errorf("subtraction underflow: %s - %s", a, b)
	}
	return new(big.Int).Sub(ia, ib).String(), nil
}

func CmpBaseUnits(a, b string) int {
	ia, ok1 := new(big.Int).SetString(strings.TrimSpace(a), 10)
	ib, ok2 := new(big.Int).SetString(strings.TrimSpace(b), 10)
	if !ok1 || !ok2 {
		return 0
	}
	return ia.Cmp(ib)
}
