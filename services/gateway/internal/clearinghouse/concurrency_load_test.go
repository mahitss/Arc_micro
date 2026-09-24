package clearinghouse

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"
)

// =============================================================================
// SECTION 61: CONCURRENCY TEST SUITE
// =============================================================================

func TestClearinghouse_ConcurrencySuite(t *testing.T) {
	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	// 100 concurrent obligations across multiple tenants and workers
	const numWorkers = 10
	const numObligations = 100
	var wg sync.WaitGroup

	errCh := make(chan error, numObligations)
	obIDs := make([]string, numObligations)
	var mu sync.Mutex

	for i := 0; i < numObligations; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			tenant := fmt.Sprintf("tenant_%d", idx%3)
			ob, err := svc.CreateObligation(ctx, &EconomicObligation{
				TenantID:       tenant,
				OrganizationID: "org_concurrency",
				PayerAgentID:   fmt.Sprintf("payer_%d", idx%10),
				PayeeAgentID:   fmt.Sprintf("payee_%d", (idx+1)%10),
				Amount:         "1000000", // 1 USDC
				Currency:       "USDC",
				Status:         ObligationAuthorized,
			})
			if err != nil {
				errCh <- err
				return
			}
			mu.Lock()
			obIDs[idx] = ob.ObligationID
			mu.Unlock()
		}(i)
	}
	wg.Wait()
	close(errCh)

	for err := range errCh {
		t.Fatalf("concurrent obligation creation error: %v", err)
	}

	// Verify all 100 obligations are stored
	obs, err := svc.ListObligations(ctx, "org_concurrency")
	if err != nil || len(obs) != numObligations {
		t.Fatalf("expected %d obligations, got %d (err: %v)", numObligations, len(obs), err)
	}

	// 100 concurrent settlement requests (milestones)
	var wgSettle sync.WaitGroup
	var settleSuccessCount int
	var settleMu sync.Mutex

	for i := 0; i < numObligations; i++ {
		wgSettle.Add(1)
		go func(idx int) {
			defer wgSettle.Done()
			ms, err := svc.CreateMilestone(ctx, &PaymentMilestone{
				ContractID:   fmt.Sprintf("c_%d", idx),
				ObligationID: obIDs[idx],
				Amount:       "1000000",
				Status:       MilestoneVerified,
			})
			if err != nil {
				return
			}
			_, err = svc.SettleMilestone(ctx, ms.MilestoneID, fmt.Sprintf("idem_con_%d", idx))
			if err == nil {
				settleMu.Lock()
				settleSuccessCount++
				settleMu.Unlock()
			}
		}(i)
	}
	wgSettle.Wait()

	if settleSuccessCount != numObligations {
		t.Errorf("expected %d settlements, got %d", numObligations, settleSuccessCount)
	}

	// Verify double entry ledger consistency
	entries, err := svc.GetLedgerEntries(ctx, "org_concurrency")
	if err != nil {
		t.Fatalf("failed to query ledger entries: %v", err)
	}
	if len(entries) < numObligations {
		t.Errorf("expected at least %d ledger entries, got %d", numObligations, len(entries))
	}
}

// =============================================================================
// SECTION 62: LOAD TEST
// =============================================================================

func TestClearinghouse_LoadTest(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping load test in short mode")
	}

	svc, _ := newTestClearinghouse()
	ctx := context.Background()

	const numObligations = 10000
	const numCounterparties = 1000
	const numContracts = 1000

	t.Logf("Starting Task 18 Load Test: %d obligations, %d counterparties, %d contracts...", numObligations, numCounterparties, numContracts)
	start := time.Now()

	// 1. Counterparty registration
	cpStart := time.Now()
	for i := 0; i < numCounterparties; i++ {
		_, _ = svc.RegisterCounterparty(ctx, &EconomicCounterparty{
			TenantID:       "tenant_load",
			AgentID:        fmt.Sprintf("agent_%d", i),
			OrganizationID: "org_load",
			ExposureLimit:  "5000000000",
		})
	}
	cpDur := time.Since(cpStart)

	// 2. Obligation creation & ledger entries
	obStart := time.Now()
	var sampleIDs []string
	for i := 0; i < numObligations; i++ {
		ob, _ := svc.CreateObligation(ctx, &EconomicObligation{
			TenantID:       "tenant_load",
			OrganizationID: "org_load",
			PayerAgentID:   fmt.Sprintf("agent_%d", i%numCounterparties),
			PayeeAgentID:   fmt.Sprintf("agent_%d", (i+1)%numCounterparties),
			ContractID:     fmt.Sprintf("contract_%d", i%numContracts),
			Amount:         "1000000", // 1 USDC
			Currency:       "USDC",
			Status:         ObligationAuthorized,
		})
		if i < 1000 {
			sampleIDs = append(sampleIDs, ob.ObligationID)
		}
	}
	obDur := time.Since(obStart)
	obOpsSec := float64(numObligations) / obDur.Seconds()

	// 3. Multi-party netting simulation on 1,000 candidates
	netStart := time.Now()
	prop, err := svc.ProposeMultiPartyNetting(ctx, "tenant_load", "org_load", "USDC", sampleIDs, time.Hour)
	netDur := time.Since(netStart)
	if err != nil {
		t.Fatalf("load test netting failed: %v", err)
	}

	// 4. Batch construction
	batchStart := time.Now()
	batch, err := svc.CreateBatchWithWindow(ctx, "tenant_load", "org_load", "USDC", WindowDaily, sampleIDs, ModeSimulation)
	batchDur := time.Since(batchStart)
	if err != nil {
		t.Fatalf("load test batch creation failed: %v", err)
	}

	// 5. Graph derivation
	graphStart := time.Now()
	graph, err := svc.GetObligationGraph(ctx, "tenant_load", "org_load")
	graphDur := time.Since(graphStart)
	if err != nil {
		t.Fatalf("load test graph query failed: %v", err)
	}

	totalDur := time.Since(start)

	t.Logf("=== TASK 18 LOAD TEST RESULTS ===")
	t.Logf("Total Time: %v", totalDur)
	t.Logf("Counterparty Registration (1,000): %v (%.1f ops/sec)", cpDur, float64(numCounterparties)/cpDur.Seconds())
	t.Logf("Obligation Creation + Ledger (10,000): %v (%.1f ops/sec)", obDur, obOpsSec)
	t.Logf("Multi-Party Netting Evaluation (1,000): %v (Gross: %s, Net: %s, Savings: %s)", netDur, prop.GrossValue, prop.NetValue, prop.SavingsValue)
	t.Logf("Settlement Batch Construction (1,000 items): %v (BatchID: %s)", batchDur, batch.BatchID)
	t.Logf("Obligation Graph Query (10,000 nodes/edges): %v (Nodes: %d, Edges: %d)", graphDur, len(graph.Nodes), len(graph.Edges))
}

// =============================================================================
// SECTION 73: FINAL END-TO-END TEST
// TEST_AUTONOMOUS_ECONOMIC_CLEARING_NETWORK
// =============================================================================

func Test_AUTONOMOUS_ECONOMIC_CLEARING_NETWORK(t *testing.T) {
	svc, mockIntents := newTestClearinghouse()
	ctx := context.Background()

	// 1. External agent registers counterparty
	cpPayer, err := svc.RegisterCounterparty(ctx, &EconomicCounterparty{
		TenantID:       "tenant_main",
		AgentID:        "agent_buyer",
		OrganizationID: "org_enterprise",
		IdentityStatus: CounterpartyVerified,
		ExposureLimit:  "100000000", // 100 USDC
	})
	if err != nil {
		t.Fatalf("Step 1 failed: %v", err)
	}

	cpPayee, _ := svc.RegisterCounterparty(ctx, &EconomicCounterparty{
		TenantID:       "tenant_main",
		AgentID:        "agent_provider",
		OrganizationID: "org_enterprise",
		IdentityStatus: CounterpartyVerified,
		ExposureLimit:  "100000000",
	})

	// 2. Marketplace contract creates obligation
	ob1, err := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID:       "tenant_main",
		OrganizationID: "org_enterprise",
		PayerAgentID:   cpPayer.AgentID,
		PayeeAgentID:   cpPayee.AgentID,
		ContractID:     "contract_mkt_1",
		Capability:     "market-intelligence",
		Amount:         "25000000", // 25 USDC
		Currency:       "USDC",
		Status:         ObligationAuthorized,
		SourceType:     "CONTRACT",
		SourceID:       "contract_mkt_1",
	})
	if err != nil {
		t.Fatalf("Step 2 failed: %v", err)
	}

	// 3. Counter-obligation for bilateral / multi-party netting
	ob2, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID:       "tenant_main",
		OrganizationID: "org_enterprise",
		PayerAgentID:   cpPayee.AgentID,
		PayeeAgentID:   cpPayer.AgentID,
		ContractID:     "contract_mkt_2",
		Capability:     "compute-relay",
		Amount:         "15000000", // 15 USDC
		Currency:       "USDC",
		Status:         ObligationAuthorized,
		SourceType:     "CONTRACT",
		SourceID:       "contract_mkt_2",
	})

	// 4. Milestone creation & verification
	ms, err := svc.CreateMilestone(ctx, &PaymentMilestone{
		ContractID:   ob1.ContractID,
		ObligationID: ob1.ObligationID,
		Sequence:     1,
		Description:  "Deliver Q3 Market Analysis Report",
		Amount:       ob1.Amount,
		Status:       MilestoneSubmitted,
	})
	if err != nil {
		t.Fatalf("Milestone creation failed: %v", err)
	}

	// Verify milestone
	_, err = svc.VerifyMilestone(ctx, ms.MilestoneID)
	if err != nil {
		t.Fatalf("VerifyMilestone failed: %v", err)
	}

	// 5. Netting proposal generated across the obligations
	netProp, err := svc.ProposeMultiPartyNetting(ctx, "tenant_main", "org_enterprise", "USDC", []string{ob1.ObligationID, ob2.ObligationID}, time.Hour)
	if err != nil {
		t.Fatalf("ProposeMultiPartyNetting failed: %v", err)
	}
	if netProp.GrossValue != "40000000" {
		t.Errorf("expected gross 40 USDC, got %s", netProp.GrossValue)
	}
	if netProp.NetValue != "10000000" {
		t.Errorf("expected net 10 USDC, got %s", netProp.NetValue)
	}

	// 6. Netting approval
	appProp, err := svc.ApproveMultiPartyNetting(ctx, netProp.ProposalID)
	if err != nil {
		t.Fatalf("ApproveMultiPartyNetting failed: %v", err)
	}
	if appProp.Status != NettingApproved {
		t.Errorf("expected NettingApproved, got %s", appProp.Status)
	}

	// 7. Settlement batch creation with HOURLY window
	batch, err := svc.CreateBatchWithWindow(ctx, "tenant_main", "org_enterprise", "USDC", WindowHourly, []string{ob1.ObligationID, ob2.ObligationID}, ModeReal)
	if err != nil {
		t.Fatalf("CreateBatchWithWindow failed: %v", err)
	}

	// 8. Execute netting settlement
	intents, err := svc.ExecuteMultiPartyNetting(ctx, netProp.ProposalID, "idem_e2e_net")
	if err != nil {
		t.Fatalf("ExecuteMultiPartyNetting failed: %v", err)
	}
	if len(intents) == 0 {
		t.Errorf("expected at least 1 PaymentIntent created for net residual")
	}

	// 9. Verify obligations transitioned to SETTLED
	obSettled1, _ := svc.GetObligation(ctx, ob1.ObligationID)
	if obSettled1.Status != ObligationSettled {
		t.Errorf("expected ob1 SETTLED, got %s", obSettled1.Status)
	}

	// 10. Financial Traceability check
	trace, err := svc.GetFinancialTrace(ctx, ob1.ObligationID)
	if err != nil {
		t.Fatalf("GetFinancialTrace failed: %v", err)
	}
	if trace.Obligation.ObligationID != ob1.ObligationID {
		t.Errorf("trace mismatch: expected %s, got %s", ob1.ObligationID, trace.Obligation.ObligationID)
	}

	// 11. Assert Invariants on Injected Failure:
	// A. Policy change mid-flight halts execution
	mockIntents.failAuth = true
	obFail, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_main", OrganizationID: "org_enterprise", PayerAgentID: "agent_buyer", PayeeAgentID: "agent_provider", Amount: "5000000", Currency: "USDC", Status: ObligationAuthorized,
	})
	msFail, _ := svc.CreateMilestone(ctx, &PaymentMilestone{
		ContractID: "c_fail", ObligationID: obFail.ObligationID, Amount: "5000000", Status: MilestoneVerified,
	})
	_, errFail := svc.SettleMilestone(ctx, msFail.MilestoneID, "idem_fail")
	if errFail == nil {
		t.Errorf("expected failure when policy denies, got nil")
	}

	// B. Dispute blocks settlement
	obDisp, _ := svc.CreateObligation(ctx, &EconomicObligation{
		TenantID: "tenant_main", OrganizationID: "org_enterprise", PayerAgentID: "agent_buyer", PayeeAgentID: "agent_provider", Amount: "5000000", Currency: "USDC", Status: ObligationAuthorized,
	})
	_, _ = svc.CreateDispute(ctx, &ClearingDispute{
		TenantID: "tenant_main", OrganizationID: "org_enterprise", ObligationID: obDisp.ObligationID, Reason: "Deliverable failed verification",
	})
	_, errDispNet := svc.ProposeMultiPartyNetting(ctx, "tenant_main", "org_enterprise", "USDC", []string{obDisp.ObligationID}, time.Hour)
	if errDispNet == nil {
		t.Errorf("expected dispute to block netting, got nil")
	}

	// 12. Clearing Health report
	health, err := svc.GetClearingHealth(ctx, "tenant_main", "org_enterprise")
	if err != nil {
		t.Fatalf("GetClearingHealth failed: %v", err)
	}
	if health.Source != "Clearinghouse" {
		t.Errorf("expected Source Clearinghouse, got %s", health.Source)
	}
	t.Logf("Clearing Health: Open=%d, Disputed=%s, BatchCount=%d", health.OpenObligations, health.DisputedValue, health.BatchCount)
	_ = batch
}
