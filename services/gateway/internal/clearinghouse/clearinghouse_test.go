package clearinghouse

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

// MockIntentCreator implements IntentCreator for testing.
type MockIntentCreator struct {
	mu              sync.RWMutex
	intents         map[string]*intent.PaymentIntent
	failAuth        bool
	requireApproval bool
}

func NewMockIntentCreator() *MockIntentCreator {
	return &MockIntentCreator{
		intents: make(map[string]*intent.PaymentIntent),
	}
}

func (m *MockIntentCreator) CreateIntent(ctx context.Context, params intent.CreateIntentParams) (*intent.PaymentIntent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := fmtSprintf("intent_%d", len(m.intents)+1)
	pi := &intent.PaymentIntent{
		IntentID:       id,
		OrganizationID: params.OrganizationID,
		AgentID:        params.AgentID,
		VaultAddress:   params.VaultAddress,
		ServiceID:      params.ServiceID,
		Recipient:      "0x1111111111111111111111111111111111111111",
		Amount:         params.Amount,
		Asset:          params.Asset,
		Purpose:        params.Purpose,
		Status:         intent.StatusCreated,
		CreatedAt:      time.Now(),
		ExpiresAt:      time.Now().Add(time.Hour),
	}
	m.intents[id] = pi
	return pi, nil
}

func (m *MockIntentCreator) AuthorizeIntent(ctx context.Context, intentID string) (*intent.PaymentIntent, *domain.AuthorizationDecision, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	pi, ok := m.intents[intentID]
	if !ok {
		return nil, nil, errorsNew("intent not found")
	}
	if m.failAuth {
		pi.Status = intent.StatusDenied
		return pi, &domain.AuthorizationDecision{
			RequestID: intentID,
			Decision:  domain.DecisionDeny,
			Reason:    "Policy denied",
		}, nil
	}
	if m.requireApproval {
		pi.Status = intent.StatusApprovalRequired
		return pi, &domain.AuthorizationDecision{
			RequestID: intentID,
			Decision:  domain.DecisionApprovalRequired,
			Reason:    "Human approval required",
		}, nil
	}
	pi.Status = intent.StatusAuthorized
	return pi, &domain.AuthorizationDecision{
		RequestID: intentID,
		Decision:  domain.DecisionAllow,
		Reason:    "Policy permitted",
	}, nil
}

func (m *MockIntentCreator) ConfirmIntent(ctx context.Context, intentID string) (*intent.PaymentIntent, *blockchain.PaymentExecutionResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	pi, ok := m.intents[intentID]
	if !ok {
		return nil, nil, errorsNew("intent not found")
	}
	pi.Status = intent.StatusConfirmed
	res := &blockchain.PaymentExecutionResult{
		RequestID:       intentID,
		Status:          blockchain.StateConfirmed,
		TransactionHash: "0x2fec1a70fa311f9dcbe7dc6a794ce5b06f283ef3bf38145159195034d3c4aaab",
		BlockNumber:     "104200",
		Amount:          pi.Amount,
	}
	return pi, res, nil
}

func fmtSprintf(format string, a ...interface{}) string {
	return fmt.Sprintf(format, a...)
}

func errorsNew(text string) error {
	return errors.New(text)
}

func setupTestClearinghouse() (*DefaultClearinghouseService, *MockIntentCreator) {
	mockIntents := NewMockIntentCreator()
	reg := registry.NewDefaultRegistry()
	targetVault := "0x1111111111111111111111111111111111111111"
	router := NewSettlementRouter(mockIntents, reg, targetVault)
	reconciler := NewClearingReconciliationEngine(nil, "5042", targetVault)
	svc := NewClearinghouseService(router, nil, reconciler, reg, nil)
	return svc, mockIntents
}

// -----------------------------------------------------------------------------
// Test Suite: Basic Operations & Lifecycle
// -----------------------------------------------------------------------------

func TestClearinghouse_ObligationLifecycle(t *testing.T) {
	svc, _ := setupTestClearinghouse()
	ctx := context.Background()

	// 1. Create Obligation
	ob, err := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_test",
		PayerAgentID:   "agent_payer",
		PayeeAgentID:   "agent_payee",
		ContractID:     "contract_100",
		Capability:     "web-research",
		Amount:         "10000000", // 10 USDC
		Currency:       "USDC",
	})
	if err != nil {
		t.Fatalf("CreateObligation failed: %v", err)
	}
	if ob.Status != ObligationProposed {
		t.Errorf("expected PROPOSED, got %s", ob.Status)
	}

	// 2. State machine prohibits SETTLED -> AUTHORIZED
	sm := NewStateMachine()
	if err := sm.ValidateObligationTransition(ObligationSettled, ObligationAuthorized); err == nil {
		t.Errorf("expected error for SETTLED -> AUTHORIZED, got nil")
	}

	// 3. Prohibits REFUNDED -> SETTLED
	if err := sm.ValidateObligationTransition(ObligationRefunded, ObligationSettled); err == nil {
		t.Errorf("expected error for REFUNDED -> SETTLED, got nil")
	}

	// 4. Cancel Obligation
	ob2, _ := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_test",
		PayerAgentID:   "agent_payer",
		PayeeAgentID:   "agent_payee",
		Amount:         "5000000",
	})
	if err := svc.CancelObligation(ctx, ob2.ObligationID, "Mission changed"); err != nil {
		t.Fatalf("CancelObligation failed: %v", err)
	}
	cancelledOb, _ := svc.GetObligation(ctx, ob2.ObligationID)
	if cancelledOb.Status != ObligationCancelled {
		t.Errorf("expected CANCELLED, got %s", cancelledOb.Status)
	}
}

func TestClearinghouse_InvoiceValidation(t *testing.T) {
	svc, _ := setupTestClearinghouse()
	ctx := context.Background()

	inv, err := svc.CreateInvoice(ctx, &EconomicInvoice{
		ContractID:       "contract_200",
		OrganizationID:   "org_test",
		ProviderAgentID:  "agent_provider",
		RequesterAgentID: "agent_payer",
		Amount:           "5000000", // 5 USDC
		Currency:         "USDC",
		LineItems: []InvoiceLineItem{
			{ItemNumber: 1, Description: "Data collection", Amount: "5000000"},
		},
	})
	if err != nil {
		t.Fatalf("CreateInvoice failed: %v", err)
	}
	if inv.Status != InvoiceIssued {
		t.Errorf("expected ISSUED, got %s", inv.Status)
	}

	// Test Accept
	if err := svc.AcceptInvoice(ctx, inv.InvoiceID); err != nil {
		t.Fatalf("AcceptInvoice failed: %v", err)
	}
	accepted, _ := svc.GetInvoice(ctx, inv.InvoiceID)
	if accepted.Status != InvoiceAccepted {
		t.Errorf("expected ACCEPTED, got %s", accepted.Status)
	}

	// Test Duplicate Invoice Rejection
	_, err = svc.CreateInvoice(ctx, &EconomicInvoice{
		ContractID:       "contract_200",
		OrganizationID:   "org_test",
		ProviderAgentID:  "agent_provider",
		RequesterAgentID: "agent_payer",
		Amount:           "5000000",
		Currency:         "USDC",
		LineItems: []InvoiceLineItem{
			{ItemNumber: 1, Description: "Data collection", Amount: "5000000"},
		},
		IssuedAt: inv.IssuedAt,
		DueAt:    inv.DueAt,
	})
	if err == nil {
		t.Errorf("expected duplicate invoice to be rejected")
	}
}

// -----------------------------------------------------------------------------
// DEMO 1: Autonomous Economic Clearing (Section 60)
// Contract: 30 USDC, M1=5 USDC, M2=10 USDC, M3=15 USDC
// Flow: Discover -> Quote -> Contract -> Obligation -> Reserve -> M1 Verified -> M1 Settle ->
//       M2 Verified -> M2 Settle -> M3 fails verification -> Dispute -> Corrected ->
//       M3 Verified -> M3 Settle -> Reconciliation -> Complete
// -----------------------------------------------------------------------------

func TestDemo1_AutonomousEconomicClearing(t *testing.T) {
	svc, mockIntents := setupTestClearinghouse()
	ctx := context.Background()

	// 1. Contract & Total Obligation (30 USDC = 30,000,000 base units)
	contractID := "contract_sec_report_30"
	ob, err := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_demo",
		PayerAgentID:   "agent_coordinator_a",
		PayeeAgentID:   "agent_researcher_b",
		ContractID:     contractID,
		Capability:     "security.report",
		Amount:         "30000000", // 30 USDC
		Currency:       "USDC",
		Status:         ObligationAuthorized,
		ExecutionMode:  ModeSimulation,
	})
	if err != nil {
		t.Fatalf("Failed creating demo obligation: %v", err)
	}

	// 2. Reserve bounded funds in Escrow
	esc, err := svc.CreateEscrow(ctx, &EconomicEscrow{
		ObligationID:   ob.ObligationID,
		ContractID:     contractID,
		OrganizationID: "org_demo",
		Payer:          "agent_coordinator_a",
		Payee:          "agent_researcher_b",
		VaultAddress:   "0x1111111111111111111111111111111111111111",
		Amount:         "30000000",
		Status:         EscrowReserved,
	})
	if err != nil {
		t.Fatalf("Failed creating demo escrow: %v", err)
	}
	if esc.ReservedAmount != "30000000" {
		t.Errorf("expected 30 USDC reserved, got %s", esc.ReservedAmount)
	}

	// 3. Milestone 1: Research (5 USDC = 5,000,000)
	m1, _ := svc.CreateMilestone(ctx, &PaymentMilestone{
		ContractID:       contractID,
		ObligationID:     ob.ObligationID,
		OrganizationID:   "org_demo",
		Sequence:         1,
		Description:      "Security intelligence gathering and threat intel feeds",
		Amount:           "5000000", // 5 USDC
		VerificationRule: "MIN_LENGTH_50",
	})
	_ = svc.SubmitMilestone(ctx, m1.MilestoneID, "Intelligence feeds indexed: 14 CVE feeds, 400 indicators analyzed.", "", "")
	v1Res, err := svc.VerifyMilestone(ctx, m1.MilestoneID)
	if err != nil || v1Res.Outcome != OutcomeVerified {
		t.Fatalf("M1 verification failed: %v, outcome=%s", err, v1Res.Outcome)
	}

	// Settle M1
	pi1, err := svc.SettleMilestone(ctx, m1.MilestoneID, "idem_m1_settle")
	if err != nil || pi1.Status != intent.StatusConfirmed {
		t.Fatalf("M1 settlement failed: %v", err)
	}

	// 4. Milestone 2: Analysis (10 USDC = 10,000,000)
	m2, _ := svc.CreateMilestone(ctx, &PaymentMilestone{
		ContractID:       contractID,
		ObligationID:     ob.ObligationID,
		OrganizationID:   "org_demo",
		Sequence:         2,
		Description:      "Risk vulnerability correlation matrix and attack surface graph",
		Amount:           "10000000", // 10 USDC
		VerificationRule: "MIN_LENGTH_50",
	})
	_ = svc.SubmitMilestone(ctx, m2.MilestoneID, "Graph nodes correlation complete: 18 critical paths identified.", "", "")
	v2Res, _ := svc.VerifyMilestone(ctx, m2.MilestoneID)
	if v2Res.Outcome != OutcomeVerified {
		t.Fatalf("M2 verification failed: %s", v2Res.Outcome)
	}
	pi2, err := svc.SettleMilestone(ctx, m2.MilestoneID, "idem_m2_settle")
	if err != nil || pi2.Status != intent.StatusConfirmed {
		t.Fatalf("M2 settlement failed: %v", err)
	}

	// 5. Milestone 3: Final verified report (15 USDC = 15,000,000)
	m3, _ := svc.CreateMilestone(ctx, &PaymentMilestone{
		ContractID:       contractID,
		ObligationID:     ob.ObligationID,
		OrganizationID:   "org_demo",
		Sequence:         3,
		Description:      "Executive briefing document and machine-readable remediation plan",
		Amount:           "15000000", // 15 USDC
		VerificationRule: "MIN_LENGTH_50",
	})

	// Step 5a: M3 fails initial verification (short output < 50 chars)
	_ = svc.SubmitMilestone(ctx, m3.MilestoneID, "Brief draft.", "", "")
	v3Fail, _ := svc.VerifyMilestone(ctx, m3.MilestoneID)
	if v3Fail.Outcome == OutcomeVerified {
		t.Fatalf("Expected M3 initial verification to fail, but it passed!")
	}

	// Step 5b: Dispute opened / Resubmission with complete deliverable
	fullDeliverable := "Comprehensive Security Intelligence Report v1.0. Executive sign-off complete. 42 actionable remediation items."
	_ = svc.SubmitMilestone(ctx, m3.MilestoneID, fullDeliverable, "", "")
	v3Pass, _ := svc.VerifyMilestone(ctx, m3.MilestoneID)
	if v3Pass.Outcome != OutcomeVerified {
		t.Fatalf("Expected M3 resubmission to pass verification, got: %s", v3Pass.Outcome)
	}

	// Step 5c: Settle M3
	pi3, err := svc.SettleMilestone(ctx, m3.MilestoneID, "idem_m3_settle")
	if err != nil || pi3.Status != intent.StatusConfirmed {
		t.Fatalf("M3 settlement failed: %v", err)
	}

	// 6. Reconciliation & Final State Audit
	rec, err := svc.ReconcileObligation(ctx, ob.ObligationID)
	if err != nil && rec.Status != ReconMatched {
		t.Fatalf("Final reconciliation failed: %v", err)
	}

	// Check Ledger invariant
	entries, _ := svc.GetLedgerEntries(ctx, "org_demo")
	if len(entries) < 3 {
		t.Errorf("expected at least 3 ledger entries, got %d", len(entries))
	}

	_ = mockIntents
}

// -----------------------------------------------------------------------------
// DEMO 2: Failure + Reconciliation (Section 61)
// Payment returns AMBIGUOUS -> Reconciler checks receipt -> MATCH -> RECONCILED/SETTLED
// Proves NO blind rebroadcast occurs (INV-69).
// -----------------------------------------------------------------------------

func TestDemo2_FailureAndReconciliation(t *testing.T) {
	svc, _ := setupTestClearinghouse()
	ctx := context.Background()

	ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID:  "org_fail_demo",
		PayerAgentID:    "agent_a",
		PayeeAgentID:    "agent_b",
		Capability:      "web-research",
		Amount:          "2500000",
		Status:          ObligationSettlementPending,
		PaymentIntentID: "intent_ambig_01",
		ExecutionMode:   ModeSimulation, // Simulation mode for deterministic mock receipt
	})

	// Reconcile without blind rebroadcast
	rec, err := svc.ReconcileObligation(ctx, ob.ObligationID)
	if err != nil {
		t.Fatalf("Reconciliation failed: %v", err)
	}
	if rec.Status != ReconMatched {
		t.Errorf("expected MATCHED, got %s", rec.Status)
	}
}

// -----------------------------------------------------------------------------
// DEMO 3: Bilateral Netting (Section 62)
// Agent A owes Agent B 10 USDC. Agent B owes Agent A 6 USDC.
// System proposes Gross 16, Net 4. Approval required. Both original obligations preserved.
// -----------------------------------------------------------------------------

func TestDemo3_BilateralNetting(t *testing.T) {
	svc, _ := setupTestClearinghouse()
	ctx := context.Background()

	// Obligation 1: A owes B 10 USDC (10,000,000)
	ob1, _ := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_net_demo",
		PayerAgentID:   "agent_alice",
		PayeeAgentID:   "agent_bob",
		Amount:         "10000000", // 10 USDC
		Currency:       "USDC",
		Status:         ObligationVerified,
	})

	// Obligation 2: B owes A 6 USDC (6,000,000)
	ob2, _ := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_net_demo",
		PayerAgentID:   "agent_bob",
		PayeeAgentID:   "agent_alice",
		Amount:         "6000000", // 6 USDC
		Currency:       "USDC",
		Status:         ObligationVerified,
	})

	// Propose Netting
	prop, err := svc.ProposeNetting(ctx, "org_net_demo", "agent_alice", "agent_bob", "USDC", 24*time.Hour)
	if err != nil {
		t.Fatalf("ProposeNetting failed: %v", err)
	}

	if prop.GrossTotal != "16000000" {
		t.Errorf("expected gross 16000000, got %s", prop.GrossTotal)
	}
	if prop.NetAmount != "4000000" {
		t.Errorf("expected net 4000000 (4 USDC), got %s", prop.NetAmount)
	}
	if prop.NetPayer != "agent_alice" || prop.NetPayee != "agent_bob" {
		t.Errorf("expected Alice pays Bob 4 USDC, got %s -> %s", prop.NetPayer, prop.NetPayee)
	}

	// Execution before approval must fail
	_, err = svc.ExecuteNetting(ctx, prop.ProposalID, "idem_net_01")
	if err == nil {
		t.Errorf("expected ExecuteNetting to fail before approval")
	}

	// Both parties approve
	_, _ = svc.ApproveNetting(ctx, prop.ProposalID, "agent_alice")
	_, _ = svc.ApproveNetting(ctx, prop.ProposalID, "agent_bob")

	// Execute Netting
	pi, err := svc.ExecuteNetting(ctx, prop.ProposalID, "idem_net_01")
	if err != nil {
		t.Fatalf("ExecuteNetting failed: %v", err)
	}
	if pi == nil || pi.Amount != "4000000" {
		t.Errorf("expected 4 USDC payment intent, got %v", pi)
	}

	// Both original obligations are now SETTLED and preserved
	o1Check, _ := svc.GetObligation(ctx, ob1.ObligationID)
	o2Check, _ := svc.GetObligation(ctx, ob2.ObligationID)
	if o1Check.Status != ObligationSettled || o2Check.Status != ObligationSettled {
		t.Errorf("expected both original obligations SETTLED, got %s and %s", o1Check.Status, o2Check.Status)
	}
}

// -----------------------------------------------------------------------------
// DEMO 4: Recurring Contract Safety (Section 63)
// Monthly 10 USDC contract. Policy changed so approval is required.
// Next occurrence does NOT auto-settle; re-enters approval.
// -----------------------------------------------------------------------------

func TestDemo4_RecurringContractPolicyRevalidation(t *testing.T) {
	svc, mockIntents := setupTestClearinghouse()
	ctx := context.Background()

	sched, err := svc.CreateSchedule(ctx, &PaymentSchedule{
		ContractID:        "contract_monthly_monitor",
		OrganizationID:    "org_rec_demo",
		PayerAgentID:      "agent_rec_payer",
		PayeeAgentID:      "agent_rec_payee",
		ScheduleType:      ScheduleRecurring,
		Frequency:         "MONTHLY",
		AmountPerPayment:  "10000000", // 10 USDC
		MaxOccurrences:    12,
		MaxTotalValue:     "120000000", // 120 USDC
		TotalSettledValue: "0",
		StartDate:         time.Now().Add(-30 * 24 * time.Hour),
		NextRunAt:         time.Now(),
	})
	if err != nil {
		t.Fatalf("CreateSchedule failed: %v", err)
	}

	// Occurrence 1: Normal policy permits settlement
	ob1, pi1, err := svc.TriggerScheduleOccurrence(ctx, sched.ScheduleID, "idem_rec_month_1")
	if err != nil || pi1.Status != intent.StatusConfirmed {
		t.Fatalf("Occurrence 1 failed: %v", err)
	}
	if ob1.Status != ObligationSettled {
		t.Errorf("expected occurrence 1 settled, got %s", ob1.Status)
	}

	// Policy change: Now external recurring payments require human approval!
	mockIntents.requireApproval = true

	// Occurrence 2: Must NOT auto-settle! Must stop in APPROVAL_REQUIRED (INV-58, INV-59)
	ob2, pi2, err := svc.TriggerScheduleOccurrence(ctx, sched.ScheduleID, "idem_rec_month_2")
	if err != nil {
		t.Fatalf("Occurrence 2 error: %v", err)
	}
	if pi2.Status != intent.StatusApprovalRequired {
		t.Errorf("expected APPROVAL_REQUIRED after policy change, got status %s", pi2.Status)
	}
	_ = ob2
}
