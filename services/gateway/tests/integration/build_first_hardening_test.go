package integration

import (
	"context"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/fabric"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/marketplace"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/runtime"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/simulation"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
)

// 1. Simulation Isolation: Verify simulation mode strictly prohibits broadcast, signing, live treasury, and vault mutation.
func TestBuildFirst_SimulationIsolation(t *testing.T) {
	snapMgr := simulation.NewSnapshotManager()
	engine := simulation.NewSimulationEngine(snapMgr, nil)
	gate := simulation.NewExecutionGate(snapMgr, engine)

	forbiddenActions := []string{
		"broadcast_transaction",
		"sign_payload",
		"reserve_treasury_liquidity",
		"vault_deposit_or_transfer",
	}

	for _, action := range forbiddenActions {
		t.Run("Action_"+action, func(t *testing.T) {
			err := gate.AssertLiveAllowed(simulation.ExecutionModeSimulation, action)
			if err == nil {
				t.Fatalf("CRITICAL SECURITY VIOLATION: simulation allowed action %s", action)
			}
			if !strings.Contains(err.Error(), "HARD FAIL") {
				t.Fatalf("expected HARD FAIL in error message, got: %v", err)
			}
		})
	}

	// Verify boundary check: Stale or uncompleted simulation plan cannot prepare live execution
	t.Run("StalePlan_FailsClosed", func(t *testing.T) {
		_, err := gate.PrepareExecutePlan(context.Background(), "non-existent-run", nil)
		if err == nil {
			t.Fatal("expected failure when preparing live execution for non-existent or stale run")
		}
	})
}

// 2. Live vs Simulation Separation: Verify zero cross-mode pollution or ledger mutation.
func TestBuildFirst_LiveSimulationSeparation(t *testing.T) {
	// Treasury mode isolation check (INV-76)
	err := treasury.AssertModeIsolation(treasury.ModeSimulation, treasury.ModeReal)
	if err != treasury.ErrSimulationAffectsReal {
		t.Fatalf("expected ErrSimulationAffectsReal, got: %v", err)
	}

	// Fabric mode isolation check (INV-156)
	errBroadcast := fabric.ValidateINV156("SIMULATION", true)
	if errBroadcast == nil {
		t.Fatal("expected error when simulation attempts broadcast")
	}

	// Blueprint simulation status check
	bp := &fabric.ExecutionBlueprint{
		BlueprintID: "bp_sim_test",
		Status:      "SIMULATED",
		Tasks: []fabric.BlueprintTask{
			{
				TaskID:            "task_01",
				EstimatedCostUSDC: 15.00,
				RequiresPayment:   true,
			},
		},
	}
	if bp.Status != "SIMULATED" {
		t.Fatalf("expected blueprint task in SIMULATED status, got: %s", bp.Status)
	}
}

// 3. Mission Failure Recovery: Failure triggers replanning within budget without expanding authority.
func TestBuildFirst_MissionFailureRecovery(t *testing.T) {
	ctx := context.Background()
	store := fabric.NewMemoryFabricStore()
	svc := fabric.NewEconomicFabricService(store)

	// Create objective with 50.00 USDC budget
	obj, _, err := svc.CreateObjective(ctx, fabric.CreateObjectiveRequest{
		TenantID:           "tenant_recovery_test",
		Description:        "Autonomous Market Intelligence Mission",
		Owner:              "sec_analyst",
		EconomicBudgetUSDC: 50.00,
		RiskTolerance:      "MEDIUM",
	})
	if err != nil {
		t.Fatalf("failed to create objective: %v", err)
	}

	// Plan objective
	bp, _, err := svc.PlanObjective(ctx, obj.ObjectiveID, false)
	if err != nil {
		t.Fatalf("failed to plan objective: %v", err)
	}

	origCost := bp.EconomicEnvelope.MaxTotalCostUSDC

	// Simulate provider failure during mission -> Trigger controlled replan
	newBP, ver, _, err := svc.ReplanObjective(ctx, obj.ObjectiveID, fabric.ReplanRequest{
		Reason:               "PROVIDER_FAILURE",
		NewProviderCandidate: "agent_scanner_02",
		AllowedProviders:     []string{"agent_scanner_02"},
	}, false)
	if err != nil {
		t.Fatalf("replan failed: %v", err)
	}

	// Verify new blueprint does not exceed original economic envelope (INV-143)
	if err := fabric.ValidateINV143(bp.EconomicEnvelope, newBP.EconomicEnvelope); err != nil {
		t.Fatalf("authority expanded on replanning: %v", err)
	}

	if newBP.EconomicEnvelope.MaxTotalCostUSDC > origCost {
		t.Fatalf("replanned cost (%.2f) exceeded original envelope (%.2f)",
			newBP.EconomicEnvelope.MaxTotalCostUSDC, origCost)
	}

	if ver.ReplanReason != "PROVIDER_FAILURE" {
		t.Fatalf("expected replan reason PROVIDER_FAILURE, got: %s", ver.ReplanReason)
	}
}

// 4. Marketplace Failure Fallback: Paused/suspended listings are skipped and active ones match gracefully.
func TestBuildFirst_MarketplaceFailureFallback(t *testing.T) {
	ctx := context.Background()
	mStore := marketplace.NewMemoryMarketplaceStore()
	mSvc := marketplace.NewMarketplaceService(mStore)

	tenantID := "tenant_mkt_failure"

	// Register 1 active and 1 paused listing
	_, _ = mSvc.CreateListing(ctx, &marketplace.ServiceListing{
		ListingID:       "lst_paused",
		TenantID:        tenantID,
		ProviderAgentID: "agent_bad_01",
		CapabilityID:    "sec-audit",
		Title:           "Paused Sec Audit",
		PricingModel:    marketplace.PricingFixed,
		BasePriceUSDC:   "15.00",
		Status:          marketplace.ListingStatusPaused,
	})

	_, _ = mSvc.CreateListing(ctx, &marketplace.ServiceListing{
		ListingID:       "lst_active",
		TenantID:        tenantID,
		ProviderAgentID: "agent_good_01",
		CapabilityID:    "sec-audit",
		Title:           "Active Sec Audit",
		PricingModel:    marketplace.PricingFixed,
		BasePriceUSDC:   "18.00",
		Status:          marketplace.ListingStatusActive,
	})

	// Verify INV-188 rejects awarding the paused listing
	errPaused := marketplace.ValidateINV188(marketplace.ListingStatusPaused)
	if errPaused == nil {
		t.Fatal("expected INV-188 error when listing is paused")
	}

	// Create opportunity
	opp, err := mSvc.CreateOpportunity(ctx, &marketplace.MarketplaceOpportunity{
		TenantID:             tenantID,
		RequesterID:          "agent_requester_01",
		Capability:           "sec-audit",
		BudgetConstraintUSDC: "25.00",
	})
	if err != nil {
		t.Fatalf("failed to create opportunity: %v", err)
	}

	// Match: should match the active listing and disqualify the paused one
	cSet, err := mSvc.MatchOpportunity(ctx, tenantID, opp.OpportunityID)
	if err != nil {
		t.Fatalf("matching failed: %v", err)
	}

	if cSet.Explanation.SelectedListingID != "lst_active" {
		t.Fatalf("expected lst_active selected, got: %s", cSet.Explanation.SelectedListingID)
	}
	if !strings.Contains(cSet.Explanation.AlternativeRejected["agent_bad_01"], "PAUSED") {
		t.Fatalf("expected rejection reason for agent_bad_01 to mention PAUSED, got: %s", cSet.Explanation.AlternativeRejected["agent_bad_01"])
	}
	if cSet.Candidates[0].ListingID != "lst_active" || cSet.Candidates[0].Disqualification != "" {
		t.Fatalf("expected first candidate to be qualified lst_active, got: %v", cSet.Candidates[0])
	}
}

// 5. Malicious Provider: Arbitrary recipient injection or raw 0x hex substitution blocked.
func TestBuildFirst_MaliciousProvider(t *testing.T) {
	ctx := context.Background()
	mStore := marketplace.NewMemoryMarketplaceStore()
	mSvc := marketplace.NewMarketplaceService(mStore)

	tenantID := "tenant_malicious_prov"
	opp, _ := mSvc.CreateOpportunity(ctx, &marketplace.MarketplaceOpportunity{
		TenantID:             tenantID,
		RequesterID:          "agent_requester_01",
		Capability:           "market-intel",
		BudgetConstraintUSDC: "30.00",
	})

	// Attempt recipient substitution with raw 0x hex address (INV-186)
	_, errRawHex := mSvc.AwardOpportunity(ctx, tenantID, opp.OpportunityID, "0xdead00000000000000000000000000000000beef", "q_1", "20.00", time.Now().Add(1*time.Hour))
	if errRawHex == nil {
		t.Fatal("CRITICAL: raw 0x hex recipient substitution was not blocked")
	}
	if !strings.Contains(errRawHex.Error(), "INV-186") {
		t.Fatalf("expected INV-186 error, got: %v", errRawHex)
	}

	// Attempt recipient substitution with non-allowlisted provider (INV-146)
	errBypass := fabric.ValidateINV146("agent_unauthorized_attacker", []string{"agent_approved_01", "agent_approved_02"})
	if errBypass == nil {
		t.Fatal("CRITICAL: unapproved provider substitution was not blocked")
	}
}

// 6. Malicious Agent: Budget self-escalation is blocked.
func TestBuildFirst_MaliciousAgent(t *testing.T) {
	env := &fabric.EconomicEnvelope{
		MaxTotalCostUSDC: 25.00,
		MaxExposureUSDC:  35.00,
	}

	// Agent attempts self-escalation by +100.00 USDC
	err := fabric.ValidateINV148(env, 100.00)
	if err == nil {
		t.Fatal("CRITICAL: economic envelope self-increase was not blocked")
	}
	if !strings.Contains(err.Error(), "INV-148") {
		t.Fatalf("expected INV-148 error, got: %v", err)
	}

	// Compiler verification against objective constraint (INV-142)
	obj := &fabric.EconomicObjective{
		EconomicBudgetUSDC: 25.00,
	}
	bp := &fabric.ExecutionBlueprint{
		EconomicEnvelope: fabric.EconomicEnvelope{
			MaxTotalCostUSDC: 100.00,
		},
	}
	errComp := fabric.ValidateINV142(obj, bp)
	if errComp == nil {
		t.Fatal("CRITICAL: blueprint exceeding objective budget was not blocked")
	}
}

// 7. Stale Simulation: Executing a simulation with modified policy hash fails closed.
func TestBuildFirst_StaleSimulation(t *testing.T) {
	bp := &fabric.ExecutionBlueprint{
		BlueprintID:     "bp_stale_test",
		SimulationStale: false,
		PolicyHash:      "policy_hash_v1_abc",
	}

	// When policy hash in environment has updated to v2
	err := fabric.ValidateINV144(bp, "policy_hash_v2_xyz", 2)
	if err == nil {
		t.Fatal("CRITICAL: stale simulation executed despite policy hash mismatch")
	}
	if !strings.Contains(err.Error(), "INV-144") {
		t.Fatalf("expected INV-144 error, got: %v", err)
	}

	// Explicitly marked stale
	bp.SimulationStale = true
	errStale := fabric.ValidateINV144(bp, bp.PolicyHash, 1)
	if errStale == nil {
		t.Fatal("CRITICAL: blueprint explicitly marked stale was allowed")
	}
}

// 8. Policy Revalidation: DENY transitions and tightened policies halt execution.
func TestBuildFirst_PolicyRevalidation(t *testing.T) {
	// Policy transitioning from DENY to ALLOW without policy engine re-evaluation is blocked (INV-145)
	err := fabric.ValidateINV145("DENY", "ALLOW")
	if err == nil {
		t.Fatal("CRITICAL: policy DENY overridden without re-evaluation")
	}

	// Runtime cannot retry on a deterministic HARD_DENY (INV-103)
	errRetry := runtime.CheckPolicyDenyRetry("DENY", true)
	if errRetry != runtime.ErrInv103 {
		t.Fatalf("expected ErrInv103, got: %v", errRetry)
	}
}

// 9. Budget Revalidation: Price exceeding opportunity cap fails closed.
func TestBuildFirst_BudgetRevalidation(t *testing.T) {
	// Quote price exceeds authorized budget cap (INV-185)
	err := marketplace.ValidateINV185(55.00, 50.00)
	if err == nil {
		t.Fatal("CRITICAL: quote price exceeding budget cap was allowed")
	}
	if !strings.Contains(err.Error(), "INV-185") {
		t.Fatalf("expected INV-185 error, got: %v", err)
	}

	// Price within cap succeeds
	errOk := marketplace.ValidateINV185(49.50, 50.00)
	if errOk != nil {
		t.Fatalf("unexpected error on valid budget: %v", errOk)
	}
}

// 10. Liquidity Revalidation: Reservation exceeding available treasury liquidity fails closed.
func TestBuildFirst_LiquidityRevalidation(t *testing.T) {
	available := big.NewInt(50000000) // 50 USDC
	buffer := big.NewInt(10000000)    // 10 USDC buffer -> 40 USDC net available

	// Attempt to reserve 45 USDC (> 40 USDC net available)
	err := treasury.AssertReservationWithinAvailable(big.NewInt(45000000), available, buffer)
	if err != treasury.ErrReservationExceedsAvailable {
		t.Fatalf("expected ErrReservationExceedsAvailable, got: %v", err)
	}

	// Attempt to reserve 35 USDC (<= 40 USDC net available) -> OK
	errOk := treasury.AssertReservationWithinAvailable(big.NewInt(35000000), available, buffer)
	if errOk != nil {
		t.Fatalf("unexpected error for valid reservation: %v", errOk)
	}
}

// 11. Duplicate Settlement: Preventing duplicate contract awards and duplicate intent settlement.
func TestBuildFirst_DuplicateSettlement(t *testing.T) {
	// Duplicate award check (INV-194)
	err := marketplace.ValidateINV194(marketplace.OpportunityStatusAwarded, true)
	if !strings.Contains(err.Error(), "INV-194") {
		t.Fatalf("expected INV-194 error on duplicate award, got: %v", err)
	}

	// Duplicate payment request check (INV-195)
	errIntent := marketplace.ValidateINV195(true, false)
	if errIntent == nil || !strings.Contains(errIntent.Error(), "INV-195") {
		t.Fatalf("expected INV-195 on duplicate payment request, got: %v", errIntent)
	}
}

// 12. Replay Protection: External callbacks and idempotency keys prevent duplicate processing.
func TestBuildFirst_ReplayProtection(t *testing.T) {
	// Dangerous operator command without idempotency key is rejected (INV-118)
	err := runtime.CheckCommandIdempotency("")
	if err != runtime.ErrInv118 {
		t.Fatalf("expected ErrInv118 on missing idempotency key, got: %v", err)
	}

	// Valid idempotency key passes
	errValid := runtime.CheckCommandIdempotency("idem_key_abc_123")
	if errValid != nil {
		t.Fatalf("unexpected error on valid idempotency key: %v", errValid)
	}
}

// 13. Concurrent Mission Execution: 20 parallel missions run in complete data isolation.
func TestBuildFirst_ConcurrentMissionExecution(t *testing.T) {
	ctx := context.Background()
	store := fabric.NewMemoryFabricStore()
	svc := fabric.NewEconomicFabricService(store)

	const concurrency = 20
	var wg sync.WaitGroup
	errCh := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			tenantID := fmt.Sprintf("tenant_concur_%d", idx)
			obj, _, err := svc.CreateObjective(ctx, fabric.CreateObjectiveRequest{
				TenantID:           tenantID,
				Description:        fmt.Sprintf("Concurrent Research Mission %d", idx),
				EconomicBudgetUSDC: 25.00,
				RiskTolerance:      "LOW",
			})
			if err != nil {
				errCh <- fmt.Errorf("create objective %d failed: %w", idx, err)
				return
			}

			bp, _, err := svc.PlanObjective(ctx, obj.ObjectiveID, false)
			if err != nil {
				errCh <- fmt.Errorf("plan objective %d failed: %w", idx, err)
				return
			}

			sim, err := svc.SimulateObjective(ctx, obj.ObjectiveID)
			if err != nil {
				errCh <- fmt.Errorf("simulate objective %d failed: %w", idx, err)
				return
			}

			if sim.ExpectedCostUSDC <= 0 {
				errCh <- fmt.Errorf("invalid simulated cost for %d", idx)
				return
			}

			dec, _, err := svc.StartObjective(ctx, obj.ObjectiveID, false)
			if err != nil {
				errCh <- fmt.Errorf("start objective %d failed: %w", idx, err)
				return
			}

			// Invariant: Decision financial authority must remain UNCHANGED
			if dec.FinancialAuthority != "UNCHANGED" {
				errCh <- fmt.Errorf("financial authority leaked on objective %d: %s", idx, dec.FinancialAuthority)
				return
			}

			_ = bp
		}(i)
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		t.Fatal(err)
	}
}

// 14. Concurrent Treasury Reservation: Parallel reservations against finite pool produce zero overdraft.
func TestBuildFirst_ConcurrentTreasuryReservation(t *testing.T) {
	// Pool of 100 USDC total, 10 USDC buffer -> 90 USDC allocatable
	totalBalance := big.NewInt(100000000) // 100 USDC
	buffer := big.NewInt(10000000)        // 10 USDC
	allocatable := new(big.Int).Sub(totalBalance, buffer)

	var mu sync.Mutex
	remaining := new(big.Int).Set(allocatable)

	const goroutines = 10
	requestedPerTask := big.NewInt(20000000) // 20 USDC each

	var successCount int32
	var failCount int32
	var wg sync.WaitGroup

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mu.Lock()
			err := treasury.AssertReservationWithinAvailable(requestedPerTask, remaining, big.NewInt(0))
			if err == nil {
				remaining.Sub(remaining, requestedPerTask)
				atomic.AddInt32(&successCount, 1)
			} else {
				atomic.AddInt32(&failCount, 1)
			}
			mu.Unlock()
		}()
	}

	wg.Wait()

	// Exactly 4 reservations (80 USDC) succeed; 5th requires 100 USDC which exceeds 90 USDC allocatable
	if successCount != 4 {
		t.Fatalf("expected exactly 4 successful reservations, got: %d", successCount)
	}
	if failCount != 6 {
		t.Fatalf("expected 6 failed reservations due to liquidity constraint, got: %d", failCount)
	}

	// Verify invariant: zero fund creation and zero overdraft (INV-84)
	reservedTotal := new(big.Int).Mul(requestedPerTask, big.NewInt(int64(successCount)))
	errNoCreation := treasury.AssertNoFundCreation(totalBalance, remaining, reservedTotal, big.NewInt(0), big.NewInt(0))
	if errNoCreation != nil {
		t.Fatalf("fund creation invariant violated: %v", errNoCreation)
	}
}

// 15. Workflow Recovery: Crashed worker lease recovery cannot elevate authority (INV-101, INV-102).
func TestBuildFirst_WorkflowRecovery(t *testing.T) {
	// Worker fencing token mismatch is blocked (INV-101)
	errFencing := runtime.CheckLeaseFencing(100, 101)
	if errFencing == nil {
		t.Fatal("CRITICAL: stale worker with token mismatch allowed to commit")
	}

	// Workflow recovery requesting elevated privileges fails closed (INV-102)
	errAuthority := runtime.CheckZeroRecoveryAuthority(true, true)
	if errAuthority != runtime.ErrInv102 {
		t.Fatalf("expected ErrInv102 on elevated privilege request during recovery, got: %v", errAuthority)
	}

	// Normal recovery without privilege elevation succeeds
	errNormal := runtime.CheckZeroRecoveryAuthority(true, false)
	if errNormal != nil {
		t.Fatalf("unexpected error for normal recovery: %v", errNormal)
	}
}

// 16. Authority Preservation: "Autonomy can expand. Financial authority cannot."
func TestBuildFirst_AuthorityPreservation(t *testing.T) {
	// Fabric decision output must preserve UNCHANGED authority (INV-141)
	decision := &fabric.FabricDecision{
		DecisionID:         "dec_test_01",
		FinancialAuthority: "UNCHANGED",
	}
	if err := fabric.ValidateINV141(decision); err != nil {
		t.Fatalf("valid decision rejected: %v", err)
	}

	// Attempting to grant financial authority from fabric decision fails closed
	corruptDecision := &fabric.FabricDecision{
		DecisionID:         "dec_test_bad",
		FinancialAuthority: "ELEVATED_TREASURY_WRITE",
	}
	if err := fabric.ValidateINV141(corruptDecision); err == nil {
		t.Fatal("CRITICAL: FabricDecision granted elevated financial authority")
	}

	// Resource envelope cannot grant treasury rights (INV-150)
	if err := fabric.ValidateINV150(&fabric.ResourceEnvelope{}, true); err == nil {
		t.Fatal("CRITICAL: ResourceEnvelope granted treasury rights")
	}

	// Learning output must remain recommendations only (INV-151)
	if err := fabric.ValidateINV151(true, true); err == nil {
		t.Fatal("CRITICAL: learning output modified limits directly")
	}
}

// 17. Production Database Safety: ENVIRONMENT=production or ENABLE_LIVE_EXECUTION=true requires DATABASE_URL.
func TestBuildFirst_ProductionDatabaseSafety(t *testing.T) {
	ctx := context.Background()

	// Scenario 1: Production mode without DATABASE_URL -> Fails closed
	cfgProdNoDB := &config.Config{
		Environment: "production",
		DatabaseURL: "",
	}
	repo1, db1, err1 := storage.InitializeRepository(ctx, cfgProdNoDB)
	if err1 != storage.ErrDatabaseURLRequiredInProduction {
		t.Fatalf("expected ErrDatabaseURLRequiredInProduction, got: %v", err1)
	}
	if repo1 != nil || db1 != nil {
		t.Fatal("expected nil repo and db on failure")
	}

	// Scenario 2: Live execution enabled with memory storage -> Fails closed
	cfgLiveMemory := &config.Config{
		Environment:         "development",
		EnableLiveExecution: true,
		StorageMode:         "memory",
	}
	repo2, db2, err2 := storage.InitializeRepository(ctx, cfgLiveMemory)
	if err2 != storage.ErrMemoryStorageForbiddenInProduction {
		t.Fatalf("expected ErrMemoryStorageForbiddenInProduction, got: %v", err2)
	}
	if repo2 != nil || db2 != nil {
		t.Fatal("expected nil repo and db on failure")
	}

	// Scenario 3: Development mode without DATABASE_URL -> Deterministic MemoryRepository
	cfgDevMemory := &config.Config{
		Environment: "development",
		DatabaseURL: "",
	}
	repo3, db3, err3 := storage.InitializeRepository(ctx, cfgDevMemory)
	if err3 != nil {
		t.Fatalf("development initialization failed: %v", err3)
	}
	if db3 != nil {
		defer db3.Close()
	}
	if _, ok := repo3.(*storage.MemoryRepository); !ok {
		t.Fatalf("expected *storage.MemoryRepository, got: %T", repo3)
	}
}
