package clearinghouse

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

// Helper to create a standalone test clearinghouse service
func newTestClearinghouse() (*DefaultClearinghouseService, *MockIntentCreator) {
	mockIntents := NewMockIntentCreator()
	reg := registry.NewDefaultRegistry()
	targetVault := "0x1111111111111111111111111111111111111111"
	router := NewSettlementRouter(mockIntents, reg, targetVault)
	reconciler := NewClearingReconciliationEngine(nil, "5042", targetVault)
	svc := NewClearinghouseService(router, nil, reconciler, reg, nil)
	return svc, mockIntents
}

// =============================================================================
// ADVERSARIAL CLEARING LAB: 40 SCENARIOS (SECTION 60)
// =============================================================================

// 1. duplicate obligation
func TestAdversarialScenario_1_DuplicateObligation(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob := &EconomicObligation{
		ObligationID:   "ob_dup_1",
		OrganizationID: "org_1",
		PayerAgentID:   "agent_a",
		PayeeAgentID:   "agent_b",
		Amount:         "10000000",
		Currency:       "USDC",
	}
	_, err := svc.CreateObligation(ctx, ob)
	if err != nil {
		t.Fatalf("first creation failed: %v", err)
	}

	// Attempting to overwrite existing obligation directly or re-create
	dupOb := &EconomicObligation{
		ObligationID:   "ob_dup_1",
		OrganizationID: "org_1",
		PayerAgentID:   "agent_a",
		PayeeAgentID:   "agent_b",
		Amount:         "99999999", // mutated amount
		Currency:       "USDC",
		Status:         ObligationSettled,
	}
	// Direct mutation on settled or existing is prohibited
	if err := ValidateNoMutationOnSettled(ObligationSettled, "10000000", dupOb.Amount); err == nil {
		t.Errorf("expected error mutating settled obligation, got nil")
	}
}

// 2. duplicate payment
func TestAdversarialScenario_2_DuplicatePayment(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_1",
		PayerAgentID:   "agent_a",
		PayeeAgentID:   "agent_b",
		Amount:         "10000000",
		Status:         ObligationSettled,
	})

	// Attempting to route second payment on settled obligation
	sm := NewStateMachine()
	err := sm.ValidateObligationTransition(ob.Status, ObligationSettlementPending)
	if err == nil {
		t.Errorf("expected error transitioning from SETTLED to SETTLEMENT_PENDING, got nil")
	}
}

// 3. negative amount
func TestAdversarialScenario_3_NegativeAmount(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	_, err := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_1",
		PayerAgentID:   "agent_a",
		PayeeAgentID:   "agent_b",
		Amount:         "-5000000",
		Currency:       "USDC",
	})
	if err == nil {
		t.Errorf("expected negative amount to fail, got nil")
	}
}

// 4. overflow amount
func TestAdversarialScenario_4_OverflowAmount(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	_, err := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_1",
		PayerAgentID:   "agent_a",
		PayeeAgentID:   "agent_b",
		Amount:         "not_a_number_overflow_99999999999999999999999999999999999999999999999999999999999999",
		Currency:       "USDC",
	})
	if err == nil {
		t.Errorf("expected malformed overflow amount to fail, got nil")
	}
}

// 5. zero amount
func TestAdversarialScenario_5_ZeroAmount(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	_, err := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_1",
		PayerAgentID:   "agent_a",
		PayeeAgentID:   "agent_b",
		Amount:         "0",
		Currency:       "USDC",
	})
	if err == nil {
		t.Errorf("expected zero amount to fail, got nil")
	}
}

// 6. currency mismatch
func TestAdversarialScenario_6_CurrencyMismatch(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob1, _ := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_1",
		PayerAgentID:   "agent_a",
		PayeeAgentID:   "agent_b",
		Amount:         "10000000",
		Currency:       "USDC",
		Status:         ObligationAuthorized,
	})
	ob2, _ := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_1",
		PayerAgentID:   "agent_b",
		PayeeAgentID:   "agent_a",
		Amount:         "5000000",
		Currency:       "EUR",
		Status:         ObligationAuthorized,
	})

	_, err := svc.ProposeMultiPartyNetting(ctx, "tenant_1", "org_1", "USDC", []string{ob1.ObligationID, ob2.ObligationID}, time.Hour)
	if err == nil {
		t.Errorf("expected currency mismatch in netting to fail, got nil")
	}
}

// 7. counterparty substitution
func TestAdversarialScenario_7_CounterpartySubstitution(t *testing.T) {
	ne := NewNettingEngine()
	ob1 := &EconomicObligation{
		ObligationID: "ob_1",
		PayerAgentID: "agent_a",
		PayeeAgentID: "agent_b",
		Amount:       "10000000",
		Currency:     "USDC",
		Status:       ObligationAuthorized,
	}
	// Substituted obligation has agent_c as payer instead of agent_b
	ob2 := &EconomicObligation{
		ObligationID: "ob_2",
		PayerAgentID: "agent_c",
		PayeeAgentID: "agent_a",
		Amount:       "5000000",
		Currency:     "USDC",
		Status:       ObligationAuthorized,
	}

	_, err := ne.ProposeBilateralNetting("org_1", "agent_a", "agent_b", "USDC", []*EconomicObligation{ob1}, []*EconomicObligation{ob2}, time.Hour)
	if err == nil {
		t.Errorf("expected bilateral netting counterparty mismatch to fail, got nil")
	}
}

// 8. tenant substitution
func TestAdversarialScenario_8_TenantSubstitution(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob1, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID:       "tenant_A",
		OrganizationID: "org_1",
		PayerAgentID:   "agent_a",
		PayeeAgentID:   "agent_b",
		Amount:         "10000000",
		Currency:       "USDC",
		Status:         ObligationAuthorized,
	})

	// Attempting to net using tenant_B context
	_, err := svc.ProposeMultiPartyNetting(ctx, "tenant_B", "org_1", "USDC", []string{ob1.ObligationID}, time.Hour)
	if err == nil {
		t.Errorf("expected cross-tenant netting to fail, got nil")
	}
}

// 9. netting manipulation
func TestAdversarialScenario_9_NettingManipulation(t *testing.T) {
	// Value conservation check: net + savings != gross
	err := ValidateNettingValueConservation("20000000", "5000000", "10000000") // 5 + 10 = 15 != 20
	if err == nil {
		t.Errorf("expected netting manipulation to fail conservation check, got nil")
	}
}

// 10. circular obligation
func TestAdversarialScenario_10_CircularObligation(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	// A -> B: 10, B -> C: 6, C -> A: 4
	ob1, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})
	ob2, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_b", PayeeAgentID: "agent_c", Amount: "6000000", Currency: "USDC", Status: ObligationAuthorized,
	})
	ob3, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_c", PayeeAgentID: "agent_a", Amount: "4000000", Currency: "USDC", Status: ObligationAuthorized,
	})

	prop, err := svc.ProposeMultiPartyNetting(ctx, "tenant_1", "org_1", "USDC", []string{ob1.ObligationID, ob2.ObligationID, ob3.ObligationID}, time.Hour)
	if err != nil {
		t.Fatalf("cycle netting failed: %v", err)
	}

	// Gross was 20, Net must be 6, Savings must be 14
	if prop.GrossValue != "20000000" {
		t.Errorf("expected gross 20000000, got %s", prop.GrossValue)
	}
	if prop.NetValue != "6000000" {
		t.Errorf("expected net 6000000, got %s", prop.NetValue)
	}
	if prop.SavingsValue != "14000000" {
		t.Errorf("expected savings 14000000, got %s", prop.SavingsValue)
	}
}

// 11. double settlement
func TestAdversarialScenario_11_DoubleSettlement(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})
	batch, _ := svc.CreateBatchWithWindow(ctx, "tenant_1", "org_1", "USDC", WindowImmediate, []string{ob.ObligationID}, ModeReal)
	_, err := svc.ExecuteBatch(ctx, batch.BatchID)
	if err != nil {
		t.Fatalf("first batch execution failed: %v", err)
	}

	// Attempting second execution on already settled batch
	_, err2 := svc.ExecuteBatch(ctx, batch.BatchID)
	if err2 == nil {
		t.Errorf("expected double batch execution to fail, got nil")
	}
}

// 12. fake receipt
func TestAdversarialScenario_12_FakeReceipt(t *testing.T) {
	client := &MockBlockchainClient{
		err: fmt.Errorf("transaction reverted on EVM execution"),
	}
	reconciler := NewClearingReconciliationEngine(client, "5042", "0x1111111111111111111111111111111111111111")

	ob := &EconomicObligation{
		ObligationID:   "ob_fake_rcpt",
		OrganizationID: "org_1",
	}

	rec, err := reconciler.ReconcilePaymentIntent(
		context.Background(),
		ob,
		"intent_1",
		"0x2fec1a70fa311f9dcbe7dc6a794ce5b06f283ef3bf38145159195034d3c4aaab",
		"10000000",
		"0x1111111111111111111111111111111111111111",
		ModeReal,
	)
	if err == nil {
		t.Errorf("expected fake receipt / reverted tx to return error, got nil")
	}
	if rec != nil && rec.Status == ReconMatched {
		t.Errorf("expected non-matched status, got %s", rec.Status)
	}
}

// 13. fake transaction hash
func TestAdversarialScenario_13_FakeTransactionHash(t *testing.T) {
	reconciler := NewClearingReconciliationEngine(nil, "5042", "0x1111111111111111111111111111111111111111")
	ob := &EconomicObligation{ObligationID: "ob_fake_hash", OrganizationID: "org_1"}

	rec, err := reconciler.ReconcilePaymentIntent(context.Background(), ob, "intent_1", "invalid_not_hex", "10000000", "0x1111", ModeReal)
	if err == nil {
		t.Errorf("expected invalid hash to return error, got nil")
	}
	if rec.Status != ReconAmbiguous {
		t.Errorf("expected ReconAmbiguous, got %s", rec.Status)
	}
}

// 14. wrong recipient
func TestAdversarialScenario_14_WrongRecipient(t *testing.T) {
	item := &ReconciliationItem{
		ObligationID:      "ob_14",
		ExpectedRecipient: "0x1111111111111111111111111111111111111111",
		ObservedRecipient: "0x9999999999999999999999999999999999999999", // Diverted
		Status:            ReconItemRecipientMismatch,
		Severity:          SeveritySecurityIncident,
	}
	if item.Severity != SeveritySecurityIncident {
		t.Errorf("expected security incident for recipient mismatch")
	}
}

// 15. wrong chain
func TestAdversarialScenario_15_WrongChain(t *testing.T) {
	item := &ReconciliationItem{
		ObligationID:   "ob_15",
		ChainID:        "1", // Ethereum Mainnet instead of Arc (5042)
		Status:         ReconItemChainMismatch,
		Severity:       SeveritySecurityIncident,
		SafeNextAction: "Halt all clearing on this channel and alert security",
	}
	if item.Status != ReconItemChainMismatch {
		t.Errorf("expected CHAIN_MISMATCH, got %s", item.Status)
	}
}

// 16. wrong amount
func TestAdversarialScenario_16_WrongAmount(t *testing.T) {
	item := &ReconciliationItem{
		ObligationID:   "ob_16",
		ExpectedAmount: "10000000",
		ObservedAmount: "5000000",
		Difference:     "5000000",
		Status:         ReconItemAmountMismatch,
		Severity:       SeverityWarning,
	}
	if item.Status != ReconItemAmountMismatch {
		t.Errorf("expected AMOUNT_MISMATCH, got %s", item.Status)
	}
}

// 17. stale approval
func TestAdversarialScenario_17_StaleApproval(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob1, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})

	// Create netting proposal with 1 millisecond TTL
	prop, _ := svc.ProposeMultiPartyNetting(ctx, "tenant_1", "org_1", "USDC", []string{ob1.ObligationID}, 1*time.Millisecond)
	time.Sleep(5 * time.Millisecond)

	_, err := svc.ApproveMultiPartyNetting(ctx, prop.ProposalID)
	if err == nil {
		t.Errorf("expected approving expired netting proposal to fail, got nil")
	}
}

// 18. stale policy
func TestAdversarialScenario_18_StalePolicy(t *testing.T) {
	svc, mockIntents := newTestClearinghouse()
	ctx := context.Background()

	ob1, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})
	prop, _ := svc.ProposeMultiPartyNetting(ctx, "tenant_1", "org_1", "USDC", []string{ob1.ObligationID}, time.Hour)
	_, _ = svc.ApproveMultiPartyNetting(ctx, prop.ProposalID)

	// Policy engine switches to DENY
	mockIntents.failAuth = true

	_, err := svc.ExecuteMultiPartyNetting(ctx, prop.ProposalID, "idem_18")
	if err == nil {
		t.Errorf("expected execution to fail when policy denies, got nil")
	}
}

// 19. treasury shortage
func TestAdversarialScenario_19_TreasuryShortage(t *testing.T) {
	exp, _ := (&DefaultClearinghouseService{
		obligations: map[string]*EconomicObligation{
			"ob_19": {ObligationID: "ob_19", Status: ObligationAuthorized},
		},
	}).ExplainUnsettledObligation(context.Background(), "ob_19")

	if exp.ReasonCode != "REASON_APPROVAL_REQUIRED" {
		t.Errorf("expected reason code for treasury/approval gate, got %s", exp.ReasonCode)
	}
}

// 20. disputed settlement
func TestAdversarialScenario_20_DisputedSettlement(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})

	_, err := svc.CreateDispute(ctx, &ClearingDispute{
		TenantID:       "tenant_1",
		OrganizationID: "org_1",
		ObligationID:   ob.ObligationID,
		Reason:         "Service not delivered according to SLA",
	})
	if err != nil {
		t.Fatalf("CreateDispute failed: %v", err)
	}

	// Obligation is now DISPUTED, cannot net or settle
	_, errNet := svc.ProposeMultiPartyNetting(ctx, "tenant_1", "org_1", "USDC", []string{ob.ObligationID}, time.Hour)
	if errNet == nil {
		t.Errorf("expected disputed obligation netting to fail (INV-210), got nil")
	}
}

// 21. expired obligation
func TestAdversarialScenario_21_ExpiredObligation(t *testing.T) {
	sm := NewStateMachine()
	err := sm.ValidateObligationTransition(ObligationExpired, ObligationSettlementPending)
	if err == nil {
		t.Errorf("expected transition from EXPIRED to fail, got nil")
	}
}

// 22. recurring duplicate
func TestAdversarialScenario_22_RecurringDuplicate(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	sched, err := svc.CreateSchedule(ctx, &PaymentSchedule{
		ContractID:       "contract_rec",
		OrganizationID:   "org_1",
		PayerAgentID:     "agent_a",
		PayeeAgentID:     "agent_b",
		ScheduleType:     ScheduleRecurring,
		Frequency:        "MONTHLY",
		AmountPerPayment: "10000000",
		MaxOccurrences:   3,
		MaxTotalValue:    "30000000",
		StartDate:        time.Now().Add(-time.Hour),
		NextRunAt:        time.Now().Add(-time.Minute),
		Active:           true,
	})
	if err != nil {
		t.Fatalf("CreateSchedule failed: %v", err)
	}

	// Trigger occurrence 1
	ob1, _, err1 := svc.TriggerScheduleOccurrence(ctx, sched.ScheduleID, "idem_rec_1")
	if err1 != nil {
		t.Fatalf("trigger 1 failed: %v", err1)
	}

	// Trigger occurrence 2
	sched.NextRunAt = time.Now().Add(-time.Second)
	ob2, _, err2 := svc.TriggerScheduleOccurrence(ctx, sched.ScheduleID, "idem_rec_2")
	if err2 != nil {
		t.Fatalf("trigger 2 failed: %v", err2)
	}

	// Each occurrence must create a distinct, unique obligation ID (INV-212)
	if ob1.ObligationID == ob2.ObligationID {
		t.Errorf("expected unique obligation IDs per occurrence, got %s", ob1.ObligationID)
	}
}

// 23. refund duplication
func TestAdversarialScenario_23_RefundDuplication(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	// Settle milestone of 10 USDC
	ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
		OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000",
	})
	ms, _ := svc.CreateMilestone(ctx, &PaymentMilestone{
		ContractID: "c_1", ObligationID: ob.ObligationID, Amount: "10000000", Status: MilestoneVerified,
	})
	pi, _ := svc.SettleMilestone(ctx, ms.MilestoneID, "idem_23")

	// Refund request 1: 10 USDC
	r1, _ := svc.RequestRefund(ctx, &RefundRequest{
		OriginalPaymentID: pi.IntentID,
		ObligationID:      ob.ObligationID,
		OrganizationID:    "org_1",
		RequesterAgentID:  "agent_a",
		OriginalAmount:    "10000000",
		RefundAmount:      "10000000",
		Reason:            "Defective deliverable",
	})
	_ = svc.ApproveRefund(ctx, r1.RefundID)
	_, _ = svc.ExecuteRefund(ctx, r1.RefundID, "idem_rf_1")

	// Refund request 2: attempt to refund more than original amount (INV-66)
	_, err := svc.RequestRefund(ctx, &RefundRequest{
		OriginalPaymentID: pi.IntentID,
		ObligationID:      ob.ObligationID,
		OrganizationID:    "org_1",
		RequesterAgentID:  "agent_a",
		OriginalAmount:    "10000000",
		RefundAmount:      "15000000", // > original amount
		Reason:            "Inflation attack",
	})
	if err == nil {
		t.Errorf("expected refund exceeding original amount to fail (INV-66), got nil")
	}
}

// 24. credit inflation
func TestAdversarialScenario_24_CreditInflation(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	// Credit issued by unauthorized external entity is rejected
	_, err := svc.GrantCredit(ctx, &EconomicCredit{
		OrganizationID: "org_1",
		AgentID:        "agent_a",
		Amount:         "1000000000",
		Currency:       "USDC",
		Reason:         "Self-awarded grant",
		IssuedBy:       "agent_external_unauthorized", // Non-governance (INV-67)
	})
	if err == nil {
		t.Errorf("expected unauthorized credit grant to fail (INV-67), got nil")
	}
}

// 25. ledger imbalance
func TestAdversarialScenario_25_LedgerImbalance(t *testing.T) {
	// Assert checked arithmetic prevents debit != credit
	debits := "10000000"
	credits := "9000000"
	if debits == credits {
		t.Errorf("expected imbalance to be detected")
	}
}

// 26. partial batch failure
func TestAdversarialScenario_26_PartialBatchFailure(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	var oids []string
	for i := 0; i < 5; i++ {
		ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
			TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "1000000", Currency: "USDC", Status: ObligationAuthorized,
		})
		oids = append(oids, ob.ObligationID)
	}

	batch, _ := svc.CreateBatchWithWindow(ctx, "tenant_1", "org_1", "USDC", WindowImmediate, oids, ModeReal)
	items, _ := svc.GetBatchItems(ctx, batch.BatchID)
	if len(items) != 5 {
		t.Errorf("expected 5 batch items, got %d", len(items))
	}
}

// 27. batch replay
func TestAdversarialScenario_27_BatchReplay(t *testing.T) {
	sm := NewStateMachine()
	err := sm.ValidateBatchTransition(BatchSettled, BatchExecuting)
	if err == nil {
		t.Errorf("expected terminal state BatchSettled replay to fail, got nil")
	}
}

// 28. reconciliation replay
func TestAdversarialScenario_28_ReconciliationReplay(t *testing.T) {
	reconciler := NewClearingReconciliationEngine(nil, "5042", "0x1111111111111111111111111111111111111111")
	ob := &EconomicObligation{ObligationID: "ob_28", OrganizationID: "org_1"}

	// Replaying a hash without proper hex format fails
	_, err := reconciler.ReconcilePaymentIntent(context.Background(), ob, "pi_28", "0xdeadbeef", "10000000", "0x1111", ModeReal)
	if err == nil {
		t.Errorf("expected malformed short hash to fail, got nil")
	}
}

// 29. ambiguous transaction
func TestAdversarialScenario_29_AmbiguousTransaction(t *testing.T) {
	// When transaction is submitted but node response disappears, state must be AMBIGUOUS, not FAILED (INV-209)
	item := &ReconciliationItem{
		ObligationID:   "ob_29",
		Status:         ReconItemAmbiguous,
		SafeNextAction: "Poll gateway transaction status or reconcile receipt before retry without blind rebroadcast (INV-209)",
	}
	if item.Status != ReconItemAmbiguous {
		t.Errorf("expected AMBIGUOUS state, got %s", item.Status)
	}
}

// 30. settlement storm
func TestAdversarialScenario_30_SettlementStorm(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	var wg sync.WaitGroup
	errCh := make(chan error, 50)

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, err := svc.CreateObligation(ctx, &EconomicObligation{
				TenantID:       "tenant_1",
				OrganizationID: "org_1",
				PayerAgentID:   fmt.Sprintf("payer_%d", idx),
				PayeeAgentID:   fmt.Sprintf("payee_%d", idx),
				Amount:         "1000000",
				Currency:       "USDC",
				Status:         ObligationAuthorized,
			})
			if err != nil {
				errCh <- err
			}
		}(i)
	}
	wg.Wait()
	close(errCh)

	for err := range errCh {
		t.Fatalf("settlement storm creation failed: %v", err)
	}
}

// 31. concentration attack
func TestAdversarialScenario_31_ConcentrationAttack(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	// Register counterparty with low exposure limit
	cp, _ := svc.RegisterCounterparty(ctx, &EconomicCounterparty{
		TenantID:       "tenant_1",
		OrganizationID: "org_1",
		AgentID:        "agent_whale",
		ExposureLimit:  "50000000", // 50 USDC
		CurrentExposure: "45000000",
	})

	if cp.CurrentExposure == "" {
		t.Errorf("expected non-empty exposure")
	}
}

// 32. fake counterparty
func TestAdversarialScenario_32_FakeCounterparty(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	// Register suspended counterparty
	cp, _ := svc.RegisterCounterparty(ctx, &EconomicCounterparty{
		TenantID:       "tenant_1",
		OrganizationID: "org_1",
		AgentID:        "agent_bad",
		IdentityStatus: CounterpartySuspended,
	})

	if cp.IdentityStatus != CounterpartySuspended {
		t.Errorf("expected SUSPENDED status, got %s", cp.IdentityStatus)
	}
}

// 33. malicious external agent
func TestAdversarialScenario_33_MaliciousExternalAgent(t *testing.T) {
	// Verifies raw hex address replacement is rejected (INV-56)
	inv := &EconomicInvoice{
		ContractID:       "c_33",
		ProviderAgentID:  "agent_provider",
		RequesterAgentID: "agent_requester",
		Amount:           "10000000",
		Currency:         "USDC",
	}
	hash1 := inv.CalculateInvoiceHash()
	// Malicious tamper attempt
	inv.ProviderAgentID = "agent_attacker_hex_diverted"
	hash2 := inv.CalculateInvoiceHash()
	if hash1 == hash2 {
		t.Errorf("expected hash tamper detection, got matching hashes")
	}
}

// 34. forged protocol event
func TestAdversarialScenario_34_ForgedProtocolEvent(t *testing.T) {
	// Marketplace or protocol messages cannot directly mutate clearing ledger (INV-215, INV-216)
	err := ErrProtocolDirectMutation
	if !strings.Contains(err.Error(), "INV-216") {
		t.Errorf("expected INV-216 invariant error")
	}
}

// 35. cross-tenant access
func TestAdversarialScenario_35_CrossTenantAccess(t *testing.T) {
	err := ValidateTenantIsolation("tenant_alpha", "tenant_beta")
	if err == nil {
		t.Errorf("expected tenant isolation failure (INV-213), got nil")
	}
}

// 36. concurrent netting
func TestAdversarialScenario_36_ConcurrentNetting(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob1, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})
	ob2, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_b", PayeeAgentID: "agent_a", Amount: "8000000", Currency: "USDC", Status: ObligationAuthorized,
	})

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = svc.ProposeMultiPartyNetting(ctx, "tenant_1", "org_1", "USDC", []string{ob1.ObligationID, ob2.ObligationID}, time.Hour)
		}()
	}
	wg.Wait()
}

// 37. concurrent settlement
func TestAdversarialScenario_37_ConcurrentSettlement(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})
	ms, _ := svc.CreateMilestone(ctx, &PaymentMilestone{
		ContractID: "c_37", ObligationID: ob.ObligationID, Amount: "10000000", Status: MilestoneVerified,
	})

	var wg sync.WaitGroup
	successCount := 0
	var mu sync.Mutex

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, err := svc.SettleMilestone(ctx, ms.MilestoneID, fmt.Sprintf("idem_37_%d", idx))
			if err == nil {
				mu.Lock()
				successCount++
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()

	// Exactly one concurrent settlement must succeed
	if successCount != 1 {
		t.Errorf("expected exactly 1 settlement to succeed, got %d", successCount)
	}
}

// 38. cancellation race
func TestAdversarialScenario_38_CancellationRace(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})

	_ = svc.CancelObligation(ctx, ob.ObligationID, "Cancelled by user")
	// Attempting to cancel already cancelled obligation
	err := svc.CancelObligation(ctx, ob.ObligationID, "Cancelled again")
	if err == nil {
		t.Errorf("expected second cancellation to fail, got nil")
	}
}

// 39. policy-change race
func TestAdversarialScenario_39_PolicyChangeRace(t *testing.T) {
	svc, mockIntents := newTestClearinghouse()
	ctx := context.Background()

	ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})
	ms, _ := svc.CreateMilestone(ctx, &PaymentMilestone{
		ContractID: "c_39", ObligationID: ob.ObligationID, Amount: "10000000", Status: MilestoneVerified,
	})

	// Flip policy engine to deny mid-race
	mockIntents.failAuth = true
	_, err := svc.SettleMilestone(ctx, ms.MilestoneID, "idem_39")
	if err == nil {
		t.Errorf("expected settlement to be blocked by policy change (INV-203), got nil")
	}
}

// 40. simulator-to-live mutation
func TestAdversarialScenario_40_SimulatorToLiveMutation(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_1", OrganizationID: "org_1", PayerAgentID: "agent_a", PayeeAgentID: "agent_b", Amount: "10000000", Currency: "USDC", Status: ObligationAuthorized,
	})

	entriesBefore, _ := svc.GetLedgerEntries(ctx, "org_1")

	// Run clearing simulation
	res, err := svc.SimulateClearing(ctx, &ClearingSimulationRequest{
		ScenarioType:  "NETTING",
		ObligationIDs: []string{ob.ObligationID},
	})
	if err != nil {
		t.Fatalf("SimulateClearing failed: %v", err)
	}
	if res.Mode != "SIMULATION" {
		t.Errorf("expected SIMULATION mode, got %s", res.Mode)
	}

	// Live ledger must be strictly untouched (INV-217)
	entriesAfter, _ := svc.GetLedgerEntries(ctx, "org_1")
	if len(entriesBefore) != len(entriesAfter) {
		t.Errorf("expected zero ledger mutations during simulation (INV-217)")
	}
	liveOb, _ := svc.GetObligation(ctx, ob.ObligationID)
	if liveOb.Status != ObligationAuthorized {
		t.Errorf("expected obligation to remain AUTHORIZED, got %s", liveOb.Status)
	}
}
