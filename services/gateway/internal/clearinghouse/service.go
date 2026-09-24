package clearinghouse

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
)

var (
	ErrObligationNotFound = errors.New("economic obligation not found")
	ErrEscrowNotFound     = errors.New("economic escrow not found")
	ErrMilestoneNotFound  = errors.New("payment milestone not found")
	ErrInvoiceNotFound    = errors.New("economic invoice not found")
	ErrProposalNotFound   = errors.New("netting proposal not found")
	ErrBatchNotFound      = errors.New("settlement batch not found")
	ErrRefundNotFound     = errors.New("refund request not found")
	ErrCreditNotFound     = errors.New("economic credit not found")
	ErrScheduleNotFound   = errors.New("payment schedule not found")
	ErrRefundExceedsPaid  = errors.New("refund amount exceeds original settled payment amount (INV-66)")
)

// EventPublisher defines event publishing interface for the clearinghouse.
type EventPublisher interface {
	DispatchEvent(ctx context.Context, event *domain.DomainEvent) error
}

// Service defines complete operations for the autonomous economic clearinghouse.
type Service interface {
	// Obligations
	CreateObligation(ctx context.Context, ob *EconomicObligation) (*EconomicObligation, error)
	GetObligation(ctx context.Context, id string) (*EconomicObligation, error)
	ListObligations(ctx context.Context, orgID string) ([]*EconomicObligation, error)
	CancelObligation(ctx context.Context, id, reason string) error

	// Invoices
	CreateInvoice(ctx context.Context, inv *EconomicInvoice) (*EconomicInvoice, error)
	GetInvoice(ctx context.Context, id string) (*EconomicInvoice, error)
	ListInvoices(ctx context.Context, orgID string) ([]*EconomicInvoice, error)
	AcceptInvoice(ctx context.Context, id string) error
	DisputeInvoice(ctx context.Context, id, reason string) error

	// Escrows
	CreateEscrow(ctx context.Context, esc *EconomicEscrow) (*EconomicEscrow, error)
	GetEscrow(ctx context.Context, id string) (*EconomicEscrow, error)
	ListEscrows(ctx context.Context, orgID string) ([]*EconomicEscrow, error)
	ReleaseEscrow(ctx context.Context, id, amount string) error
	RefundEscrow(ctx context.Context, id, reason string) error

	// Milestones
	CreateMilestone(ctx context.Context, ms *PaymentMilestone) (*PaymentMilestone, error)
	GetMilestone(ctx context.Context, id string) (*PaymentMilestone, error)
	ListMilestones(ctx context.Context, contractID string) ([]*PaymentMilestone, error)
	SubmitMilestone(ctx context.Context, id, actualOutput, resultHash, evidenceURI string) error
	VerifyMilestone(ctx context.Context, id string) (*MilestoneVerificationResult, error)
	DisputeMilestone(ctx context.Context, id, reason string) error
	SettleMilestone(ctx context.Context, id, idempotencyKey string) (*intent.PaymentIntent, error)

	// Schedules
	CreateSchedule(ctx context.Context, sched *PaymentSchedule) (*PaymentSchedule, error)
	GetSchedule(ctx context.Context, id string) (*PaymentSchedule, error)
	TriggerScheduleOccurrence(ctx context.Context, id, idempotencyKey string) (*EconomicObligation, *intent.PaymentIntent, error)

	// Netting
	ProposeNetting(ctx context.Context, orgID, agentA, agentB, currency string, ttl time.Duration) (*NettingProposal, error)
	ApproveNetting(ctx context.Context, proposalID, agentID string) (*NettingProposal, error)
	ExecuteNetting(ctx context.Context, proposalID, idempotencyKey string) (*intent.PaymentIntent, error)
	ListNettingProposals(ctx context.Context, orgID string) ([]*NettingProposal, error)

	// Batches
	CreateBatch(ctx context.Context, orgID, currency string, obligationIDs []string, mode ExecutionMode) (*SettlementBatch, error)
	GetBatch(ctx context.Context, id string) (*SettlementBatch, error)
	ExecuteBatch(ctx context.Context, id string) ([]*intent.PaymentIntent, error)
	ListBatches(ctx context.Context, orgID string) ([]*SettlementBatch, error)

	// Refunds
	RequestRefund(ctx context.Context, req *RefundRequest) (*RefundRequest, error)
	ApproveRefund(ctx context.Context, id string) error
	ExecuteRefund(ctx context.Context, id, idempotencyKey string) (*intent.PaymentIntent, error)
	ListRefunds(ctx context.Context, orgID string) ([]*RefundRequest, error)

	// Credits
	GrantCredit(ctx context.Context, credit *EconomicCredit) (*EconomicCredit, error)
	GetCredit(ctx context.Context, id string) (*EconomicCredit, error)

	// Reconciliation
	ReconcileObligation(ctx context.Context, obligationID string) (*ReconciliationRecord, error)
	ListReconciliationRecords(ctx context.Context, orgID string) ([]*ReconciliationRecord, error)

	// Exposure & Health
	GetExposure(ctx context.Context, orgID string, mode ExecutionMode) (*EconomicExposureSnapshot, error)
	GetHealth(ctx context.Context, orgID string, onChainBalance string, mode ExecutionMode) (*EconomicHealthSnapshot, error)

	// Ledger
	GetLedgerEntries(ctx context.Context, orgID string) ([]*ClearingLedgerEntry, error)

	// Counterparties (Task 18)
	RegisterCounterparty(ctx context.Context, cp *EconomicCounterparty) (*EconomicCounterparty, error)
	GetCounterparty(ctx context.Context, tenantID, counterpartyID string) (*EconomicCounterparty, error)
	GetCounterpartyByAgent(ctx context.Context, tenantID, agentID string) (*EconomicCounterparty, error)
	ListCounterparties(ctx context.Context, tenantID, orgID string) ([]*EconomicCounterparty, error)
	UpdateCounterpartyStatus(ctx context.Context, tenantID, counterpartyID string, status CounterpartyStatus) error
	UpdateCounterpartyExposure(ctx context.Context, tenantID, counterpartyID string, exposure string) error

	// Multi-Party Netting (Task 18)
	ProposeMultiPartyNetting(ctx context.Context, tenantID, orgID, currency string, obligationIDs []string, ttl time.Duration) (*MultiPartyNettingProposal, error)
	ApproveMultiPartyNetting(ctx context.Context, proposalID string) (*MultiPartyNettingProposal, error)
	ExecuteMultiPartyNetting(ctx context.Context, proposalID, idempotencyKey string) ([]*intent.PaymentIntent, error)
	ListMultiPartyNettingProposals(ctx context.Context, tenantID, orgID string) ([]*MultiPartyNettingProposal, error)
	GetMultiPartyNettingProposal(ctx context.Context, proposalID string) (*MultiPartyNettingProposal, error)

	// Batches with Windows & Items (Task 18)
	CreateBatchWithWindow(ctx context.Context, tenantID, orgID, currency string, window SettlementWindow, obligationIDs []string, mode ExecutionMode) (*SettlementBatch, error)
	ApproveBatch(ctx context.Context, batchID string) (*SettlementBatch, error)
	GetBatchItems(ctx context.Context, batchID string) ([]*SettlementBatchItem, error)

	// Disputes (Task 18)
	CreateDispute(ctx context.Context, dispute *ClearingDispute) (*ClearingDispute, error)
	GetDispute(ctx context.Context, id string) (*ClearingDispute, error)
	ListDisputes(ctx context.Context, tenantID, orgID string) ([]*ClearingDispute, error)
	ResolveDispute(ctx context.Context, id, resolution string, refundObligation bool) error

	// Derived Views & Trace (Task 18)
	GetObligationGraph(ctx context.Context, tenantID, orgID string) (*ObligationGraph, error)
	ExplainUnsettledObligation(ctx context.Context, id string) (*UnsettledExplanation, error)
	GetFinancialTrace(ctx context.Context, traceIDOrObligationID string) (*FinancialTrace, error)
	GetClearingHealth(ctx context.Context, tenantID, orgID string) (*ClearingHealth, error)

	// Simulation & Counterfactuals (Task 18)
	SimulateClearing(ctx context.Context, req *ClearingSimulationRequest) (*ClearingSimulationResult, error)
	GetNettingCounterfactual(ctx context.Context, proposalID string) (*ClearingCounterfactual, error)

	// Reconciliation Items (Task 18)
	ListReconciliationItems(ctx context.Context, tenantID, orgID string) ([]*ReconciliationItem, error)
	GetReconciliationItem(ctx context.Context, id string) (*ReconciliationItem, error)
	RecordReconciliationItem(ctx context.Context, item *ReconciliationItem) (*ReconciliationItem, error)
}

// DefaultClearinghouseService implements Service with concurrency safety and audit guarantees.
type DefaultClearinghouseService struct {
	mu              sync.RWMutex
	obligations     map[string]*EconomicObligation
	escrows         map[string]*EconomicEscrow
	milestones      map[string]*PaymentMilestone
	invoices        map[string]*EconomicInvoice
	schedules       map[string]*PaymentSchedule
	nettingProps    map[string]*NettingProposal
	batches         map[string]*SettlementBatch
	refunds         map[string]*RefundRequest
	credits         map[string]*EconomicCredit
	reconciliations map[string]*ReconciliationRecord
	ledgerEntries   []*ClearingLedgerEntry

	// Task 18 additions
	counterparties  map[string]*EconomicCounterparty
	mpNettingProps  map[string]*MultiPartyNettingProposal
	batchItems      map[string][]*SettlementBatchItem
	disputes        map[string]*ClearingDispute
	reconItems      map[string]*ReconciliationItem
	causalLinks     map[string]*EconomicCausalLink

	stateMachine   *StateMachine
	verifier       *MilestoneVerifier
	validator      *InvoiceValidator
	nettingEngine  *NettingEngine
	reconciler     *ClearingReconciliationEngine
	exposureCalc   *ExposureCalculator
	router         *SettlementRouter
	treasury       treasury.Service
	registry       *registry.Registry
	publisher      EventPublisher
}

func NewClearinghouseService(
	router *SettlementRouter,
	treasurySvc treasury.Service,
	reconciler *ClearingReconciliationEngine,
	reg *registry.Registry,
	publisher EventPublisher,
) *DefaultClearinghouseService {
	return &DefaultClearinghouseService{
		obligations:     make(map[string]*EconomicObligation),
		escrows:         make(map[string]*EconomicEscrow),
		milestones:      make(map[string]*PaymentMilestone),
		invoices:        make(map[string]*EconomicInvoice),
		schedules:       make(map[string]*PaymentSchedule),
		nettingProps:    make(map[string]*NettingProposal),
		batches:         make(map[string]*SettlementBatch),
		refunds:         make(map[string]*RefundRequest),
		credits:         make(map[string]*EconomicCredit),
		reconciliations: make(map[string]*ReconciliationRecord),
		ledgerEntries:   make([]*ClearingLedgerEntry, 0),

		counterparties: make(map[string]*EconomicCounterparty),
		mpNettingProps: make(map[string]*MultiPartyNettingProposal),
		batchItems:     make(map[string][]*SettlementBatchItem),
		disputes:       make(map[string]*ClearingDispute),
		reconItems:     make(map[string]*ReconciliationItem),
		causalLinks:    make(map[string]*EconomicCausalLink),

		stateMachine:  NewStateMachine(),
		verifier:      NewMilestoneVerifier(),
		validator:     NewInvoiceValidator(),
		nettingEngine: NewNettingEngine(),
		reconciler:    reconciler,
		exposureCalc:  NewExposureCalculator(),
		router:        router,
		treasury:      treasurySvc,
		registry:      reg,
		publisher:     publisher,
	}
}

// Helper to generate unique IDs
func newID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(b))
}

// -----------------------------------------------------------------------------
// OBLIGATIONS
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) CreateObligation(ctx context.Context, ob *EconomicObligation) (*EconomicObligation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if ob.ObligationID == "" {
		ob.ObligationID = newID("ob")
	}
	if ob.Status == "" {
		ob.Status = ObligationProposed
	}
	if ob.Currency == "" {
		ob.Currency = "USDC"
	}
	if ob.ExecutionMode == "" {
		ob.ExecutionMode = ModeReal
	}
	if ob.CreatedAt.IsZero() {
		ob.CreatedAt = time.Now().UTC()
	}
	if ob.SettledAmount == "" {
		ob.SettledAmount = "0"
	}

	// Validate amount
	amt, ok := new(big.Int).SetString(strings.TrimSpace(ob.Amount), 10)
	if !ok || amt.Sign() <= 0 {
		return nil, errors.New("obligation amount must be positive base units")
	}

	s.obligations[ob.ObligationID] = ob

	// Record internal double-entry
	s.recordLedgerEntryLocked(
		ob.OrganizationID,
		ob.ObligationID,
		ob.ContractID,
		"",
		"",
		"",
		"",
		LedgerObligationCreated,
		fmt.Sprintf("payer_obligation:%s", ob.PayerAgentID),
		fmt.Sprintf("payee_receivable:%s", ob.PayeeAgentID),
		ob.Amount,
		ob.Currency,
		ob.ExecutionMode,
	)

	return ob, nil
}

func (s *DefaultClearinghouseService) GetObligation(ctx context.Context, id string) (*EconomicObligation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ob, ok := s.obligations[id]
	if !ok {
		return nil, ErrObligationNotFound
	}
	return ob, nil
}

func (s *DefaultClearinghouseService) ListObligations(ctx context.Context, orgID string) ([]*EconomicObligation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*EconomicObligation, 0)
	for _, ob := range s.obligations {
		if orgID == "" || ob.OrganizationID == orgID {
			list = append(list, ob)
		}
	}
	return list, nil
}

func (s *DefaultClearinghouseService) CancelObligation(ctx context.Context, id, reason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	ob, ok := s.obligations[id]
	if !ok {
		return ErrObligationNotFound
	}
	if err := s.stateMachine.ValidateObligationTransition(ob.Status, ObligationCancelled); err != nil {
		return err
	}
	ob.Status = ObligationCancelled
	return nil
}

// -----------------------------------------------------------------------------
// INVOICES
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) CreateInvoice(ctx context.Context, inv *EconomicInvoice) (*EconomicInvoice, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if inv.InvoiceID != "" {
		if _, exists := s.invoices[inv.InvoiceID]; exists {
			return nil, ErrDuplicateInvoice
		}
	}
	if inv.InvoiceID == "" {
		inv.InvoiceID = newID("inv")
	}
	if inv.Status == "" {
		inv.Status = InvoiceIssued
	}
	if inv.Currency == "" {
		inv.Currency = "USDC"
	}
	if inv.ExecutionMode == "" {
		inv.ExecutionMode = ModeReal
	}
	if inv.IssuedAt.IsZero() {
		inv.IssuedAt = time.Now().UTC()
	}
	if inv.CreatedAt.IsZero() {
		inv.CreatedAt = time.Now().UTC()
	}
	inv.InvoiceHash = inv.CalculateInvoiceHash()

	// Check duplicates
	for _, prev := range s.invoices {
		if prev.InvoiceID != inv.InvoiceID && prev.InvoiceHash == inv.InvoiceHash {
			return nil, ErrDuplicateInvoice
		}
	}

	// Validate against obligation if linked
	if inv.ObligationID != "" {
		ob, ok := s.obligations[inv.ObligationID]
		if ok {
			obAmt, _ := new(big.Int).SetString(ob.Amount, 10)
			invAmt, _ := new(big.Int).SetString(inv.Amount, 10)
			if obAmt != nil && invAmt != nil && invAmt.Cmp(obAmt) > 0 {
				return nil, errors.New("invoice amount exceeds obligation amount (INV-56)")
			}
		}
	}

	// Validate line items sum matches invoice total
	if len(inv.LineItems) > 0 {
		sum := big.NewInt(0)
		for _, item := range inv.LineItems {
			itemAmt, ok := new(big.Int).SetString(item.Amount, 10)
			if !ok || itemAmt.Sign() < 0 {
				return nil, errors.New("invalid line item amount")
			}
			sum.Add(sum, itemAmt)
		}
		invAmt, ok := new(big.Int).SetString(inv.Amount, 10)
		if !ok || sum.Cmp(invAmt) != 0 {
			return nil, errors.New("invoice line item sum does not match total amount (INV-57)")
		}
	}

	s.invoices[inv.InvoiceID] = inv
	return inv, nil
}

func (s *DefaultClearinghouseService) GetInvoice(ctx context.Context, id string) (*EconomicInvoice, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	inv, ok := s.invoices[id]
	if !ok {
		return nil, ErrInvoiceNotFound
	}
	return inv, nil
}

func (s *DefaultClearinghouseService) ListInvoices(ctx context.Context, orgID string) ([]*EconomicInvoice, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*EconomicInvoice, 0)
	for _, inv := range s.invoices {
		if orgID == "" || inv.OrganizationID == orgID {
			list = append(list, inv)
		}
	}
	return list, nil
}

func (s *DefaultClearinghouseService) AcceptInvoice(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	inv, ok := s.invoices[id]
	if !ok {
		return ErrInvoiceNotFound
	}
	if err := s.stateMachine.ValidateInvoiceTransition(inv.Status, InvoiceAccepted); err != nil {
		return err
	}
	inv.Status = InvoiceAccepted
	return nil
}

func (s *DefaultClearinghouseService) DisputeInvoice(ctx context.Context, id, reason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	inv, ok := s.invoices[id]
	if !ok {
		return ErrInvoiceNotFound
	}
	if err := s.stateMachine.ValidateInvoiceTransition(inv.Status, InvoiceDisputed); err != nil {
		return err
	}
	inv.Status = InvoiceDisputed
	return nil
}

// -----------------------------------------------------------------------------
// ESCROWS
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) CreateEscrow(ctx context.Context, esc *EconomicEscrow) (*EconomicEscrow, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if esc.EscrowID == "" {
		esc.EscrowID = newID("esc")
	}
	if esc.Status == "" {
		esc.Status = EscrowReserved
	}
	if esc.ReservedAmount == "" {
		esc.ReservedAmount = esc.Amount
	}
	if esc.ReleasedAmount == "" {
		esc.ReleasedAmount = "0"
	}
	if esc.RefundedAmount == "" {
		esc.RefundedAmount = "0"
	}
	if esc.ExecutionMode == "" {
		esc.ExecutionMode = ModeReal
	}
	if esc.CreatedAt.IsZero() {
		esc.CreatedAt = time.Now().UTC()
	}

	// Invariant INV-56: Check for duplicate active escrow on same obligation
	if esc.ObligationID != "" {
		for _, prev := range s.escrows {
			if prev.ObligationID == esc.ObligationID && prev.Status == EscrowReserved {
				return nil, errors.New("active escrow reservation already exists for this obligation (INV-56)")
			}
		}
	}

	// Link with existing treasury if available
	if s.treasury != nil && esc.VaultAddress != "" && esc.ExecutionMode == ModeReal {
		res, err := s.treasury.ReserveFunds(ctx, esc.OrganizationID, esc.VaultAddress, esc.EscrowID, esc.Amount)
		if err == nil && res != nil {
			esc.ReservationID = res.ID
		}
	}

	s.escrows[esc.EscrowID] = esc

	// Update corresponding obligation if exists
	if esc.ObligationID != "" {
		if ob, ok := s.obligations[esc.ObligationID]; ok {
			ob.Status = ObligationReserved
		}
	}

	s.recordLedgerEntryLocked(
		esc.OrganizationID,
		esc.ObligationID,
		esc.ContractID,
		"",
		"",
		"",
		"",
		LedgerFundsReserved,
		fmt.Sprintf("vault_available:%s", esc.VaultAddress),
		fmt.Sprintf("escrow_reserved:%s", esc.EscrowID),
		esc.Amount,
		"USDC",
		esc.ExecutionMode,
	)

	return esc, nil
}

func (s *DefaultClearinghouseService) GetEscrow(ctx context.Context, id string) (*EconomicEscrow, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	esc, ok := s.escrows[id]
	if !ok {
		return nil, ErrEscrowNotFound
	}
	return esc, nil
}

func (s *DefaultClearinghouseService) ListEscrows(ctx context.Context, orgID string) ([]*EconomicEscrow, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*EconomicEscrow, 0)
	for _, esc := range s.escrows {
		if orgID == "" || esc.OrganizationID == orgID {
			list = append(list, esc)
		}
	}
	return list, nil
}

func (s *DefaultClearinghouseService) ReleaseEscrow(ctx context.Context, id, amount string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	esc, ok := s.escrows[id]
	if !ok {
		return ErrEscrowNotFound
	}

	relAmt, ok1 := new(big.Int).SetString(strings.TrimSpace(amount), 10)
	resAmt, ok2 := new(big.Int).SetString(strings.TrimSpace(esc.ReservedAmount), 10)
	if !ok1 || !ok2 || relAmt.Sign() <= 0 || relAmt.Cmp(resAmt) > 0 {
		return errors.New("release amount exceeds active escrow reservation")
	}

	newReserved := new(big.Int).Sub(resAmt, relAmt)
	esc.ReservedAmount = newReserved.String()

	prevRel, _ := new(big.Int).SetString(esc.ReleasedAmount, 10)
	if prevRel == nil {
		prevRel = big.NewInt(0)
	}
	esc.ReleasedAmount = new(big.Int).Add(prevRel, relAmt).String()

	if newReserved.Sign() == 0 {
		esc.Status = EscrowReleased
	} else {
		esc.Status = EscrowPartiallyReleased
	}

	// Release treasury reservation if active
	if s.treasury != nil && esc.ExecutionMode == ModeReal {
		_ = s.treasury.ReleaseFunds(ctx, esc.EscrowID)
	}

	return nil
}

func (s *DefaultClearinghouseService) RefundEscrow(ctx context.Context, id, reason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	esc, ok := s.escrows[id]
	if !ok {
		return ErrEscrowNotFound
	}
	if err := s.stateMachine.ValidateEscrowTransition(esc.Status, EscrowRefunded); err != nil {
		return err
	}

	esc.RefundedAmount = esc.ReservedAmount
	esc.ReservedAmount = "0"
	esc.Status = EscrowRefunded

	if s.treasury != nil && esc.ExecutionMode == ModeReal {
		_ = s.treasury.ReleaseFunds(ctx, esc.EscrowID)
	}

	return nil
}

// -----------------------------------------------------------------------------
// MILESTONES
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) CreateMilestone(ctx context.Context, ms *PaymentMilestone) (*PaymentMilestone, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if ms.MilestoneID == "" {
		ms.MilestoneID = newID("ms")
	}
	if ms.Status == "" {
		ms.Status = MilestonePending
	}
	if ms.CreatedAt.IsZero() {
		ms.CreatedAt = time.Now().UTC()
	}

	// Invariant INV-55: Milestone must reference a valid obligation if specified
	if ms.ObligationID != "" {
		if _, ok := s.obligations[ms.ObligationID]; !ok {
			return nil, ErrObligationNotFound
		}
	}

	amt, ok := new(big.Int).SetString(strings.TrimSpace(ms.Amount), 10)
	if !ok || amt.Sign() <= 0 {
		return nil, errors.New("milestone amount must be positive base units")
	}

	s.milestones[ms.MilestoneID] = ms
	return ms, nil
}

func (s *DefaultClearinghouseService) GetMilestone(ctx context.Context, id string) (*PaymentMilestone, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ms, ok := s.milestones[id]
	if !ok {
		return nil, ErrMilestoneNotFound
	}
	return ms, nil
}

func (s *DefaultClearinghouseService) ListMilestones(ctx context.Context, contractID string) ([]*PaymentMilestone, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*PaymentMilestone, 0)
	for _, ms := range s.milestones {
		if contractID == "" || ms.ContractID == contractID {
			list = append(list, ms)
		}
	}
	return list, nil
}

func (s *DefaultClearinghouseService) SubmitMilestone(ctx context.Context, id, actualOutput, resultHash, evidenceURI string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	ms, ok := s.milestones[id]
	if !ok {
		return ErrMilestoneNotFound
	}
	if err := s.stateMachine.ValidateMilestoneTransition(ms.Status, MilestoneSubmitted); err != nil {
		return err
	}

	ms.Status = MilestoneSubmitted
	ms.ActualOutput = actualOutput
	ms.ResultHash = resultHash
	ms.EvidenceURI = evidenceURI
	ms.UpdatedAt = time.Now().UTC()

	// Update linked obligation if any
	if ms.ObligationID != "" {
		if ob, ok := s.obligations[ms.ObligationID]; ok {
			ob.Status = ObligationSubmitted
		}
	}

	return nil
}

func (s *DefaultClearinghouseService) VerifyMilestone(ctx context.Context, id string) (*MilestoneVerificationResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	ms, ok := s.milestones[id]
	if !ok {
		return nil, ErrMilestoneNotFound
	}

	actualOut := ms.ActualOutput
	if actualOut == "" {
		actualOut = ms.Description
	}

	req := MilestoneVerificationRequest{
		MilestoneID:         ms.MilestoneID,
		ContractID:          ms.ContractID,
		ActualOutput:        actualOut,
		ResultHash:          ms.ResultHash,
		EvidenceURI:         ms.EvidenceURI,
		SubmissionTimestamp: ms.UpdatedAt,
		Deadline:            ms.DueAt,
		VerificationRules:   []string{ms.VerificationRule},
	}

	res := s.verifier.Verify(req)
	if res.Outcome == OutcomeVerified {
		ms.Status = MilestoneVerified
		now := time.Now().UTC()
		ms.VerifiedAt = &now
		if ms.ObligationID != "" {
			if ob, ok := s.obligations[ms.ObligationID]; ok {
				ob.Status = ObligationVerified
			}
		}
	} else {
		ms.Status = MilestoneRejected
	}

	return &res, nil
}

func (s *DefaultClearinghouseService) DisputeMilestone(ctx context.Context, id, reason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	ms, ok := s.milestones[id]
	if !ok {
		return ErrMilestoneNotFound
	}
	ms.Status = MilestoneDisputed
	if ms.ObligationID != "" {
		if ob, ok := s.obligations[ms.ObligationID]; ok {
			ob.Status = ObligationDisputed
		}
	}
	return nil
}

func (s *DefaultClearinghouseService) SettleMilestone(ctx context.Context, id, idempotencyKey string) (*intent.PaymentIntent, error) {
	s.mu.Lock()
	ms, ok := s.milestones[id]
	if !ok {
		s.mu.Unlock()
		return nil, ErrMilestoneNotFound
	}

	// Invariant INV-57: Milestone must be VERIFIED before settlement
	if ms.Status != MilestoneVerified {
		s.mu.Unlock()
		return nil, fmt.Errorf("%w: milestone %s must be verified before settlement", ErrObligationNotExecutable, id)
	}

	// Immediately transition state under lock to prevent concurrent double-settlement race conditions
	ms.Status = MilestoneSettled
	now := time.Now().UTC()
	ms.SettledAt = &now

	ob, ok := s.obligations[ms.ObligationID]
	if !ok {
		// Create an on-demand obligation if missing
		ob = &EconomicObligation{
			ObligationID:   newID("ob"),
			OrganizationID: ms.OrganizationID,
			PayerAgentID:   "agent_payer",
			PayeeAgentID:   "agent_payee",
			ContractID:     ms.ContractID,
			Capability:     "web-research",
			Amount:         ms.Amount,
			Currency:       "USDC",
			Status:         ObligationVerified,
			CreatedAt:      time.Now().UTC(),
		}
		s.obligations[ob.ObligationID] = ob
		ms.ObligationID = ob.ObligationID
	}
	milestoneForRouter := *ms
	milestoneForRouter.Status = MilestoneVerified // router requires VERIFIED
	s.mu.Unlock()

	// Route through canonical payment pipeline
	pi, err := s.router.RouteMilestoneSettlement(ctx, ob, &milestoneForRouter, idempotencyKey)
	if err != nil {
		s.mu.Lock()
		ms.Status = MilestoneVerified // rollback state on failure
		ms.SettledAt = nil
		s.mu.Unlock()
		return pi, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if pi != nil && (pi.Status == intent.StatusConfirmed || pi.Status == intent.StatusAuthorized) {
		ms.Status = MilestoneSettled
		now := time.Now().UTC()
		ms.SettledAt = &now
		ms.PaymentIntentID = pi.IntentID

		ob.Status = ObligationSettled
		ob.SettledAmount = ms.Amount
		ob.PaymentIntentID = pi.IntentID

		s.recordLedgerEntryLocked(
			ms.OrganizationID,
			ms.ObligationID,
			ms.ContractID,
			"",
			ms.MilestoneID,
			pi.IntentID,
			"",
			LedgerPaymentSettled,
			"payer_settled",
			"payee_settled",
			ms.Amount,
			"USDC",
			ModeReal,
		)
	}

	return pi, nil
}

// -----------------------------------------------------------------------------
// SCHEDULES (RECURRING OBLIGATION SAFETY)
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) CreateSchedule(ctx context.Context, sched *PaymentSchedule) (*PaymentSchedule, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if sched.ScheduleID == "" {
		sched.ScheduleID = newID("sched")
	}
	if sched.TotalSettledValue == "" {
		sched.TotalSettledValue = "0"
	}
	if sched.Currency == "" {
		sched.Currency = "USDC"
	}
	sched.Active = true
	sched.CreatedAt = time.Now().UTC()

	s.schedules[sched.ScheduleID] = sched
	return sched, nil
}

func (s *DefaultClearinghouseService) GetSchedule(ctx context.Context, id string) (*PaymentSchedule, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sched, ok := s.schedules[id]
	if !ok {
		return nil, ErrScheduleNotFound
	}
	return sched, nil
}

// TriggerScheduleOccurrence creates and routes the next scheduled payment.
// Enforces INV-58 (does not grant permanent auth) & INV-59 (revalidates current policy).
func (s *DefaultClearinghouseService) TriggerScheduleOccurrence(ctx context.Context, id, idempotencyKey string) (*EconomicObligation, *intent.PaymentIntent, error) {
	s.mu.Lock()
	sched, ok := s.schedules[id]
	if !ok {
		s.mu.Unlock()
		return nil, nil, ErrScheduleNotFound
	}

	if !sched.Active {
		s.mu.Unlock()
		return nil, nil, errors.New("schedule is cancelled or inactive")
	}

	// Check max occurrences
	if sched.MaxOccurrences > 0 && sched.OccurredCount >= sched.MaxOccurrences {
		sched.Active = false
		s.mu.Unlock()
		return nil, nil, errors.New("schedule has reached maximum occurrences ceiling")
	}

	// Check ceiling value
	settledInt, _ := new(big.Int).SetString(sched.TotalSettledValue, 10)
	amtInt, _ := new(big.Int).SetString(sched.AmountPerPayment, 10)
	maxInt, _ := new(big.Int).SetString(sched.MaxTotalValue, 10)
	if settledInt == nil {
		settledInt = big.NewInt(0)
	}
	if amtInt == nil {
		amtInt = big.NewInt(0)
	}
	if maxInt != nil && maxInt.Sign() > 0 {
		projected := new(big.Int).Add(settledInt, amtInt)
		if projected.Cmp(maxInt) > 0 {
			sched.Active = false
			s.mu.Unlock()
			return nil, nil, errors.New("next payment would exceed schedule maximum total value ceiling")
		}
	}

	// Create dynamic obligation for this recurrence
	ob := &EconomicObligation{
		ObligationID:   newID("ob_sched"),
		OrganizationID: sched.OrganizationID,
		PayerAgentID:   sched.PayerAgentID,
		PayeeAgentID:   sched.PayeeAgentID,
		ContractID:     sched.ContractID,
		Capability:     "web-research",
		Amount:         sched.AmountPerPayment,
		Currency:       sched.Currency,
		Status:         ObligationVerified,
		CreatedAt:      time.Now().UTC(),
		DueAt:          time.Now().UTC(),
	}
	s.obligations[ob.ObligationID] = ob

	// Create virtual milestone to represent this scheduled occurrence
	ms := &PaymentMilestone{
		MilestoneID:    newID("ms_sched"),
		ContractID:     sched.ContractID,
		ObligationID:   ob.ObligationID,
		OrganizationID: sched.OrganizationID,
		Sequence:       sched.OccurredCount + 1,
		Description:    fmt.Sprintf("Scheduled recurring payment #%d", sched.OccurredCount+1),
		Amount:         sched.AmountPerPayment,
		Status:         MilestoneVerified,
	}
	s.milestones[ms.MilestoneID] = ms
	s.mu.Unlock()

	// Route through canonical payment intent pipeline (re-evaluating current policy & approvals)
	pi, err := s.router.RouteMilestoneSettlement(ctx, ob, ms, idempotencyKey)
	if err != nil {
		return ob, pi, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if pi != nil && pi.Status == intent.StatusConfirmed {
		ob.Status = ObligationSettled
		ob.SettledAmount = ms.Amount
		ms.Status = MilestoneSettled
	}

	sched.OccurredCount++
	newSettled := new(big.Int).Add(settledInt, amtInt)
	sched.TotalSettledValue = newSettled.String()

	return ob, pi, nil
}

// -----------------------------------------------------------------------------
// NETTING
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) ProposeNetting(ctx context.Context, orgID, agentA, agentB, currency string, ttl time.Duration) (*NettingProposal, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Gather obligations where A owes B and B owes A
	aToB := make([]*EconomicObligation, 0)
	bToA := make([]*EconomicObligation, 0)

	for _, ob := range s.obligations {
		if ob.OrganizationID != orgID || ob.Currency != currency {
			continue
		}
		if ob.PayerAgentID == agentA && ob.PayeeAgentID == agentB {
			if ob.Status == ObligationVerified || ob.Status == ObligationAuthorized || ob.Status == ObligationDue {
				aToB = append(aToB, ob)
			}
		} else if ob.PayerAgentID == agentB && ob.PayeeAgentID == agentA {
			if ob.Status == ObligationVerified || ob.Status == ObligationAuthorized || ob.Status == ObligationDue {
				bToA = append(bToA, ob)
			}
		}
	}

	prop, err := s.nettingEngine.ProposeBilateralNetting(orgID, agentA, agentB, currency, aToB, bToA, ttl)
	if err != nil {
		return nil, err
	}

	s.nettingProps[prop.ProposalID] = prop
	return prop, nil
}

func (s *DefaultClearinghouseService) ApproveNetting(ctx context.Context, proposalID, agentID string) (*NettingProposal, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	prop, ok := s.nettingProps[proposalID]
	if !ok {
		return nil, ErrProposalNotFound
	}
	if time.Now().UTC().After(prop.ExpiresAt) {
		prop.Status = NettingExpired
		return prop, ErrNettingExpired
	}

	if prop.AgentA == agentID {
		prop.ApprovedByA = true
	} else if prop.AgentB == agentID {
		prop.ApprovedByB = true
	} else {
		return nil, errors.New("agent is not a counterparty to this netting proposal")
	}

	if prop.ApprovedByA && prop.ApprovedByB {
		prop.Status = NettingApproved
	}

	return prop, nil
}

func (s *DefaultClearinghouseService) ExecuteNetting(ctx context.Context, proposalID, idempotencyKey string) (*intent.PaymentIntent, error) {
	s.mu.Lock()
	prop, ok := s.nettingProps[proposalID]
	if !ok {
		s.mu.Unlock()
		return nil, ErrProposalNotFound
	}
	if prop.Status != NettingApproved {
		s.mu.Unlock()
		return nil, ErrNettingNotApproved
	}
	s.mu.Unlock()

	// If perfect offset (residual 0), no financial payment intent is needed!
	netAmt, _ := new(big.Int).SetString(prop.NetAmount, 10)
	var pi *intent.PaymentIntent
	var err error

	if netAmt != nil && netAmt.Sign() > 0 {
		pi, err = s.router.RouteNettedSettlement(ctx, prop, idempotencyKey)
		if err != nil {
			return pi, err
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	prop.Status = NettingExecuted
	now := time.Now().UTC()
	prop.ExecutedAt = &now
	if pi != nil {
		prop.PaymentIntentID = pi.IntentID
	}

	// Mark all original obligations as SETTLED (preserving references and history)
	for _, id := range append(prop.ObligationsAtoB, prop.ObligationsBtoA...) {
		if ob, ok := s.obligations[id]; ok {
			ob.Status = ObligationSettled
			ob.SettledAmount = ob.Amount
		}
	}

	s.recordLedgerEntryLocked(
		prop.OrganizationID,
		prop.ProposalID,
		"",
		"",
		"",
		"",
		"",
		LedgerNettingOffset,
		fmt.Sprintf("netting:%s", prop.AgentA),
		fmt.Sprintf("netting:%s", prop.AgentB),
		prop.GrossTotal,
		prop.Currency,
		ModeReal,
	)

	return pi, nil
}

func (s *DefaultClearinghouseService) ListNettingProposals(ctx context.Context, orgID string) ([]*NettingProposal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*NettingProposal, 0)
	for _, p := range s.nettingProps {
		if orgID == "" || p.OrganizationID == orgID {
			list = append(list, p)
		}
	}
	return list, nil
}

// -----------------------------------------------------------------------------
// SETTLEMENT BATCHES
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) CreateBatch(ctx context.Context, orgID, currency string, obligationIDs []string, mode ExecutionMode) (*SettlementBatch, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	gross := big.NewInt(0)
	for _, id := range obligationIDs {
		ob, ok := s.obligations[id]
		if !ok {
			return nil, fmt.Errorf("obligation %s not found for batch", id)
		}
		amt, ok2 := new(big.Int).SetString(ob.Amount, 10)
		if !ok2 {
			return nil, fmt.Errorf("invalid amount for obligation %s", id)
		}
		gross.Add(gross, amt)
	}

	batch := &SettlementBatch{
		BatchID:        newID("batch"),
		OrganizationID: orgID,
		Currency:       currency,
		ObligationIDs:  obligationIDs,
		GrossAmount:    gross.String(),
		NetAmount:      gross.String(),
		Savings:        "0",
		Status:         BatchReady,
		ExecutionMode:  mode,
		CreatedAt:      time.Now().UTC(),
	}

	s.batches[batch.BatchID] = batch
	return batch, nil
}

func (s *DefaultClearinghouseService) GetBatch(ctx context.Context, id string) (*SettlementBatch, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.batches[id]
	if !ok {
		return nil, ErrBatchNotFound
	}
	return b, nil
}

func (s *DefaultClearinghouseService) ExecuteBatch(ctx context.Context, id string) ([]*intent.PaymentIntent, error) {
	s.mu.Lock()
	batch, ok := s.batches[id]
	if !ok {
		s.mu.Unlock()
		return nil, ErrBatchNotFound
	}
	if batch.Status != BatchReady && batch.Status != BatchAuthorized {
		s.mu.Unlock()
		return nil, fmt.Errorf("batch %s is in state %s; cannot execute", id, batch.Status)
	}

	obs := make([]*EconomicObligation, 0, len(batch.ObligationIDs))
	for _, oid := range batch.ObligationIDs {
		if ob, ok := s.obligations[oid]; ok {
			obs = append(obs, ob)
		}
	}
	batch.Status = BatchExecuting
	s.mu.Unlock()

	// Execute through router (enforcing individual policy checks INV-62)
	intents, err := s.router.RouteBatchSettlement(ctx, batch, obs)
	if err != nil {
		s.mu.Lock()
		batch.Status = BatchFailed
		batch.FailureReason = err.Error()
		s.mu.Unlock()
		return intents, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	batch.Status = BatchSettled
	now := time.Now().UTC()
	batch.ExecutedAt = &now
	for _, pi := range intents {
		batch.PaymentIntentIDs = append(batch.PaymentIntentIDs, pi.IntentID)
	}

	return intents, nil
}

func (s *DefaultClearinghouseService) ListBatches(ctx context.Context, orgID string) ([]*SettlementBatch, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*SettlementBatch, 0)
	for _, b := range s.batches {
		if orgID == "" || b.OrganizationID == orgID {
			list = append(list, b)
		}
	}
	return list, nil
}

// -----------------------------------------------------------------------------
// REFUNDS
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) RequestRefund(ctx context.Context, req *RefundRequest) (*RefundRequest, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if req.RefundID == "" {
		req.RefundID = newID("ref")
	}
	req.Status = RefundRequested
	req.CreatedAt = time.Now().UTC()

	// Invariant INV-66: Refund cannot exceed original settled amount
	origAmt, ok1 := new(big.Int).SetString(req.OriginalAmount, 10)
	refAmt, ok2 := new(big.Int).SetString(req.RefundAmount, 10)
	if !ok1 || !ok2 || refAmt.Sign() <= 0 || refAmt.Cmp(origAmt) > 0 {
		return nil, fmt.Errorf("%w: refund %s > original %s", ErrRefundExceedsPaid, req.RefundAmount, req.OriginalAmount)
	}

	// Invariant INV-67: Only the original payer agent can initiate refund request
	if req.ObligationID != "" {
		if ob, ok := s.obligations[req.ObligationID]; ok {
			if ob.PayerAgentID != "" && req.RequesterAgentID != "" && ob.PayerAgentID != req.RequesterAgentID {
				return nil, errors.New("unauthorized: only payer agent can request refund (INV-67)")
			}
		}
	}

	s.refunds[req.RefundID] = req
	return req, nil
}

func (s *DefaultClearinghouseService) ApproveRefund(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	ref, ok := s.refunds[id]
	if !ok {
		return ErrRefundNotFound
	}
	if err := s.stateMachine.ValidateRefundTransition(ref.Status, RefundApproved); err != nil {
		return err
	}
	ref.Status = RefundApproved
	return nil
}

func (s *DefaultClearinghouseService) ExecuteRefund(ctx context.Context, id, idempotencyKey string) (*intent.PaymentIntent, error) {
	s.mu.Lock()
	ref, ok := s.refunds[id]
	if !ok {
		s.mu.Unlock()
		return nil, ErrRefundNotFound
	}
	if ref.Status != RefundApproved {
		s.mu.Unlock()
		return nil, errors.New("refund must be in APPROVED status before execution")
	}
	ref.Status = RefundExecuting
	s.mu.Unlock()

	// Create reverse payment intent
	params := intent.CreateIntentParams{
		OrganizationID: ref.OrganizationID,
		AgentID:        "agent_refund_operator",
		VaultAddress:   s.router.targetVault,
		ServiceID:      "web-research",
		Amount:         ref.RefundAmount,
		Asset:          "USDC",
		Purpose:        fmt.Sprintf("Refund for payment %s: %s", ref.OriginalPaymentID, ref.Reason),
		Justification:  fmt.Sprintf("Refund %s", ref.RefundID),
		RequestID:      idempotencyKey,
	}

	pi, err := s.router.intentService.CreateIntent(ctx, params)
	if err != nil {
		return nil, err
	}
	authPI, _, err := s.router.intentService.AuthorizeIntent(ctx, pi.IntentID)
	if err != nil {
		return pi, err
	}

	if authPI.Status == intent.StatusAuthorized {
		confirmedPI, _, err := s.router.intentService.ConfirmIntent(ctx, authPI.IntentID)
		if err != nil {
			return authPI, err
		}
		s.mu.Lock()
		ref.Status = RefundSettled
		ref.PaymentIntentID = confirmedPI.IntentID
		now := time.Now().UTC()
		ref.ResolvedAt = &now
		s.mu.Unlock()
		return confirmedPI, nil
	}

	return authPI, nil
}

func (s *DefaultClearinghouseService) ListRefunds(ctx context.Context, orgID string) ([]*RefundRequest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*RefundRequest, 0)
	for _, r := range s.refunds {
		if orgID == "" || r.OrganizationID == orgID {
			list = append(list, r)
		}
	}
	return list, nil
}

// -----------------------------------------------------------------------------
// CREDITS
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) GrantCredit(ctx context.Context, credit *EconomicCredit) (*EconomicCredit, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Invariant INV-67: Credit cannot be minted by external agents
	if credit.IssuedBy != "GOVERNANCE" && credit.IssuedBy != "SYSTEM_TREASURY" {
		return nil, errors.New("unauthorized issuer: credits can only be granted by GOVERNANCE or SYSTEM_TREASURY (INV-67)")
	}

	if credit.CreditID == "" {
		credit.CreditID = newID("cred")
	}
	if credit.RemainingAmount == "" {
		credit.RemainingAmount = credit.Amount
	}
	credit.CreatedAt = time.Now().UTC()

	s.credits[credit.CreditID] = credit
	return credit, nil
}

func (s *DefaultClearinghouseService) GetCredit(ctx context.Context, id string) (*EconomicCredit, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.credits[id]
	if !ok {
		return nil, ErrCreditNotFound
	}
	return c, nil
}

// -----------------------------------------------------------------------------
// RECONCILIATION
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) ReconcileObligation(ctx context.Context, obligationID string) (*ReconciliationRecord, error) {
	s.mu.RLock()
	ob, ok := s.obligations[obligationID]
	s.mu.RUnlock()
	if !ok {
		return nil, ErrObligationNotFound
	}

	rec, err := s.reconciler.ReconcilePaymentIntent(
		ctx,
		ob,
		ob.PaymentIntentID,
		"0xmockhash", // Default for simulation/memory test
		ob.Amount,
		"0x1111111111111111111111111111111111111111",
		ob.ExecutionMode,
	)

	s.mu.Lock()
	defer s.mu.Unlock()
	if rec != nil {
		s.reconciliations[rec.RecordID] = rec
	}
	return rec, err
}

func (s *DefaultClearinghouseService) ListReconciliationRecords(ctx context.Context, orgID string) ([]*ReconciliationRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*ReconciliationRecord, 0)
	for _, rec := range s.reconciliations {
		if orgID == "" || rec.OrganizationID == orgID {
			list = append(list, rec)
		}
	}
	return list, nil
}

// -----------------------------------------------------------------------------
// EXPOSURE & HEALTH
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) GetExposure(ctx context.Context, orgID string, mode ExecutionMode) (*EconomicExposureSnapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	obs := make([]*EconomicObligation, 0, len(s.obligations))
	for _, o := range s.obligations {
		obs = append(obs, o)
	}
	escs := make([]*EconomicEscrow, 0, len(s.escrows))
	for _, e := range s.escrows {
		escs = append(escs, e)
	}
	invs := make([]*EconomicInvoice, 0, len(s.invoices))
	for _, i := range s.invoices {
		invs = append(invs, i)
	}
	scheds := make([]*PaymentSchedule, 0, len(s.schedules))
	for _, sc := range s.schedules {
		scheds = append(scheds, sc)
	}
	mss := make([]*PaymentMilestone, 0, len(s.milestones))
	for _, m := range s.milestones {
		mss = append(mss, m)
	}

	return s.exposureCalc.CalculateExposure(orgID, obs, escs, invs, scheds, mss, mode), nil
}

func (s *DefaultClearinghouseService) GetHealth(ctx context.Context, orgID string, onChainBalance string, mode ExecutionMode) (*EconomicHealthSnapshot, error) {
	exp, err := s.GetExposure(ctx, orgID, mode)
	if err != nil {
		return nil, err
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	settledCount := 0
	failedCount := 0
	for _, ob := range s.obligations {
		if ob.Status == ObligationSettled {
			settledCount++
		} else if ob.Status == ObligationCancelled || ob.Status == ObligationExpired {
			failedCount++
		}
	}

	mismatchCount := 0
	for _, r := range s.reconciliations {
		if r.Status == ReconMismatch {
			mismatchCount++
		}
	}

	return s.exposureCalc.CalculateHealth(
		orgID,
		onChainBalance,
		exp,
		settledCount,
		failedCount,
		mismatchCount,
		len(s.obligations),
		"0",
		exp.OutstandingObligations,
	), nil
}

// -----------------------------------------------------------------------------
// CLEARINGHOUSE LEDGER (INTERNAL DOUBLE-ENTRY)
// Invariant: EXPECTED = SETTLED + OUTSTANDING + REFUNDED + CANCELLED
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) recordLedgerEntryLocked(
	orgID, obID, contractID, invoiceID, milestoneID, intentID, txHash string,
	entryType LedgerEntryType,
	debitAccount, creditAccount, amount, currency string,
	mode ExecutionMode,
) {
	entryID := newID("clearing_led")
	now := time.Now().UTC()

	data := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%d", entryID, obID, string(entryType), debitAccount, creditAccount, amount, now.Unix())
	h := sha256.Sum256([]byte(data))

	entry := &ClearingLedgerEntry{
		EntryID:         entryID,
		OrganizationID:  orgID,
		ObligationID:    obID,
		ContractID:      contractID,
		InvoiceID:       invoiceID,
		MilestoneID:     milestoneID,
		PaymentIntentID: intentID,
		TransactionHash: txHash,
		EntryType:       entryType,
		DebitAccount:    debitAccount,
		CreditAccount:   creditAccount,
		Amount:          amount,
		Currency:        currency,
		ExecutionMode:   mode,
		Timestamp:       now,
		Hash:            hex.EncodeToString(h[:]),
	}

	s.ledgerEntries = append(s.ledgerEntries, entry)
}

func (s *DefaultClearinghouseService) GetLedgerEntries(ctx context.Context, orgID string) ([]*ClearingLedgerEntry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*ClearingLedgerEntry, 0)
	for _, e := range s.ledgerEntries {
		if orgID == "" || e.OrganizationID == orgID {
			list = append(list, e)
		}
	}
	return list, nil
}
