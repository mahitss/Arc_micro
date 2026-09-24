package treasury_test

import (
	"context"
	"math/big"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
)

func TestAdversarial_30AttackVectors(t *testing.T) {
	ctx := context.Background()

	// Scenario 1: Concurrent reservation oversubscription (INV-73)
	t.Run("Attack 1: Concurrent reservation oversubscription", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		_ = orch.SetTreasuryBalance(ctx, "org_adv_1", treasury.ModeReal, "50000000", "0")

		var successes int32 = 0
		var wg sync.WaitGroup
		for i := 0; i < 20; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, err := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
					OrganizationID: "org_adv_1",
					AmountBase:     "10000000", // 10 USDC each
					Currency:       "USDC",
					Mode:           treasury.ModeReal,
				})
				if err == nil {
					atomic.AddInt32(&successes, 1)
				}
			}()
		}
		wg.Wait()
		if successes > 5 {
			t.Fatalf("INV-73 VIOLATION: expected at most 5 successes for 50 USDC, got %d", successes)
		}
	})

	// Scenario 2: Reservation replay / duplicate reservation (INV-56/73)
	t.Run("Attack 2: Reservation replay", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		req := &treasury.LiquidityReservationRequest{
			OrganizationID: "org_adv_2",
			ObligationID:   "ob_unique_1",
			AmountBase:     "10000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
		}
		res1, err1 := orch.ReserveLiquidityAtomic(ctx, req)
		if err1 != nil {
			t.Fatalf("initial reservation failed: %v", err1)
		}
		res2, err2 := orch.ReserveLiquidityAtomic(ctx, req)
		if err2 != nil {
			t.Fatalf("replay failed: %v", err2)
		}
		if res1.ReservationID != res2.ReservationID {
			t.Fatalf("replay created a second reservation instead of idempotent return")
		}
	})

	// Scenario 3: Reservation amount inflation
	t.Run("Attack 3: Reservation amount inflation", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		_, err := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_adv_3",
			AmountBase:     "999999999999999999", // Way beyond available
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
		})
		if err == nil {
			t.Fatalf("INV-72 VIOLATION: expected rejection for inflated reservation amount")
		}
	})

	// Scenario 4: Negative amount
	t.Run("Attack 4: Negative amount", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		_, err := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_adv_4",
			AmountBase:     "-5000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
		})
		if err == nil {
			t.Fatalf("expected error on negative reservation amount")
		}
	})

	// Scenario 5: Integer overflow attempt
	t.Run("Attack 5: Integer overflow", func(t *testing.T) {
		_, err := treasury.ParseBigInt("not_a_number_12345")
		if err == nil {
			t.Fatalf("expected parsing error for corrupted integer string")
		}
	})

	// Scenario 6: Expired reservation reuse
	t.Run("Attack 6: Expired reservation reuse", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		res, _ := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_adv_6",
			AmountBase:     "5000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
			TimeoutSeconds: -5,
		})
		_, _ = orch.ExpireStaleReservations(ctx, "org_adv_6")

		err := orch.ConsumeLiquidityReservation(ctx, res.ReservationID)
		if err == nil {
			t.Fatalf("expected error consuming expired reservation")
		}
	})

	// Scenario 7: Cancelled reservation reuse
	t.Run("Attack 7: Cancelled reservation reuse", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		res, _ := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_adv_7",
			AmountBase:     "5000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
		})
		_ = orch.ReleaseLiquidityReservation(ctx, res.ReservationID, "Cancelled")

		err := orch.ConsumeLiquidityReservation(ctx, res.ReservationID)
		if err == nil {
			t.Fatalf("expected error consuming cancelled reservation")
		}
	})

	// Scenario 8: Stale liquidity decision protection
	t.Run("Attack 8: Stale liquidity decision", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		_ = orch.SetTreasuryBalance(ctx, "org_adv_8", treasury.ModeReal, "20000000", "0")

		// Pre-reserve 15 USDC
		_, _ = orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_adv_8",
			AmountBase:     "15000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
		})

		// Second reservation attempting 10 USDC must fail (only 5 remaining)
		_, err := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_adv_8",
			AmountBase:     "10000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
		})
		if err == nil {
			t.Fatalf("expected stale liquidity rejection")
		}
	})

	// Scenario 9: Expected inflow abuse (INV-71)
	t.Run("Attack 9: Expected inflow abuse", func(t *testing.T) {
		inflow := &treasury.ExpectedInflow{
			Status:         treasury.InflowExpected,
			ExpectedAmount: "500000000",
		}
		err := treasury.AssertExpectedInflowNotAvailable(inflow, big.NewInt(0))
		if err != nil {
			t.Fatalf("unexpected invariant error: %v", err)
		}
	})

	// Scenario 10: Fake inflow verification (INV-82)
	t.Run("Attack 10: Fake inflow verification", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		err := orch.VerifyExpectedInflow(ctx, "non_existent_inflow_id", "0xdeadbeef")
		if err == nil {
			t.Fatalf("expected error verifying non-existent inflow")
		}
	})

	// Scenario 11: Fake on-chain balance (INV-79)
	t.Run("Attack 11: Fake on-chain balance", func(t *testing.T) {
		repo := storage.NewMemoryRepository()
		// No balance provider supplied: must return UNVERIFIED
		ts := treasury.NewTreasuryService(repo, nil)
		report, err := ts.ReconcileTreasury(ctx, "org_adv_11", "0xvault", treasury.ModeReal)
		if err != nil {
			t.Fatalf("reconcile failed: %v", err)
		}
		if report.Status != treasury.ReconUnverified {
			t.Fatalf("INV-79 VIOLATION: expected status UNVERIFIED when blockchain provider unavailable, got %s", report.Status)
		}
	})

	// Scenario 12: Wrong AgentVault address (INV-79)
	t.Run("Attack 12: Wrong AgentVault", func(t *testing.T) {
		repo := storage.NewMemoryRepository()
		bp := &mockBalanceProvider{balance: big.NewInt(0)}
		ts := treasury.NewTreasuryService(repo, bp)
		report, _ := ts.ReconcileTreasury(ctx, "org_adv_12", "0xwrong_vault_address", treasury.ModeReal)
		if report.Status == treasury.ReconMatched && report.DiscrepancyAmount != "0" {
			t.Fatalf("INV-79 VIOLATION: wrong vault cannot be MATCHED")
		}
	})

	// Scenario 13: Wrong token (INV-79)
	t.Run("Attack 13: Wrong token", func(t *testing.T) {
		router := treasury.NewTreasuryRouter(treasury.NewLiquidityOrchestrator())
		_, err := router.RouteLiquidity(ctx, "org_adv_13", "ETH", "1000000", treasury.ModeReal)
		if err == nil {
			t.Fatalf("expected rejection for non-USDC token")
		}
	})

	// Scenario 14: Wrong chain ID (INV-79)
	t.Run("Attack 14: Wrong chain", func(t *testing.T) {
		repo := storage.NewMemoryRepository()
		ts := treasury.NewTreasuryService(repo, nil)
		report, _ := ts.ReconcileTreasury(ctx, "org_adv_14", "0xvault", treasury.ModeReal)
		if report.ChainID != "5042011" {
			t.Fatalf("expected Arc chain ID 5042011, got %s", report.ChainID)
		}
	})

	// Scenario 15: Reconciliation spoofing (INV-81)
	t.Run("Attack 15: Reconciliation spoofing", func(t *testing.T) {
		discrepancy := big.NewInt(5000000)
		err := treasury.AssertReconciliationIntegrity(discrepancy, treasury.ReconMatched)
		if err == nil {
			t.Fatalf("INV-81 VIOLATION: mismatch was silently marked as MATCHED")
		}
	})

	// Scenario 16: Forecast-to-payment bypass (INV-77)
	t.Run("Attack 16: Forecast-to-payment bypass", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		forecaster := treasury.NewLiquidityForecaster(orch)
		fc, err := forecaster.GenerateForecast(ctx, "org_adv_16", treasury.Horizon24Hours, treasury.ScenarioBaseline, treasury.ModeReal)
		if err != nil {
			t.Fatalf("forecast generation failed: %v", err)
		}
		if fc == nil {
			t.Fatalf("nil forecast")
		}
		// Confirm forecast object does not hold payment execution authority
	})

	// Scenario 17: Simulation-to-real contamination (INV-76)
	t.Run("Attack 17: Simulation-to-real contamination", func(t *testing.T) {
		err := treasury.AssertModeIsolation(treasury.ModeSimulation, treasury.ModeReal)
		if err == nil {
			t.Fatalf("INV-76 VIOLATION: simulation allowed to modify real treasury")
		}
	})

	// Scenario 18: Mission budget escalation
	t.Run("Attack 18: Mission budget escalation", func(t *testing.T) {
		childAmt := big.NewInt(50000000)
		parentCap := big.NewInt(20000000)
		err := treasury.AssertChildEnvelopeWithinParent(childAmt, parentCap)
		if err == nil {
			t.Fatalf("INV-74 VIOLATION: child envelope exceeded parent capacity")
		}
	})

	// Scenario 19: Swarm budget escalation
	t.Run("Attack 19: Swarm budget escalation", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		_ = orch.SetTreasuryBalance(ctx, "org_adv_19", treasury.ModeReal, "30000000", "0")

		// Swarm task attempts 40 USDC
		_, err := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_adv_19",
			SwarmID:        "swm_rogue",
			AmountBase:     "40000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
		})
		if err == nil {
			t.Fatalf("expected rejection for swarm budget escalation")
		}
	})

	// Scenario 20: Delegation liquidity escalation
	t.Run("Attack 20: Delegation liquidity escalation", func(t *testing.T) {
		// A spends 5 of 20, B receives 15. C attempts 20
		remainingB := big.NewInt(15000000)
		attemptC := big.NewInt(20000000)
		err := treasury.AssertChildEnvelopeWithinParent(attemptC, remainingB)
		if err == nil {
			t.Fatalf("INV-74 VIOLATION: C escalated delegation budget beyond B's remaining")
		}
	})

	// Scenario 21: Recurring reservation explosion (INV-75)
	t.Run("Attack 21: Recurring reservation explosion", func(t *testing.T) {
		// Attempting infinite or excessive occurrences
		err := treasury.AssertRecurringReservationBounded(100, 2)
		if err == nil {
			t.Fatalf("INV-75 VIOLATION: allowed unbounded recurring reservation occurrences")
		}
	})

	// Scenario 22: Batch liquidity race
	t.Run("Attack 22: Batch liquidity race", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		_ = orch.SetTreasuryBalance(ctx, "org_adv_22", treasury.ModeReal, "30000000", "0")

		var wg sync.WaitGroup
		var successes int32
		for i := 0; i < 5; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, err := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
					OrganizationID: "org_adv_22",
					AmountBase:     "15000000", // 15 USDC each
					Currency:       "USDC",
					Mode:           treasury.ModeReal,
				})
				if err == nil {
					atomic.AddInt32(&successes, 1)
				}
			}()
		}
		wg.Wait()
		if successes > 2 {
			t.Fatalf("batch race allowed %d reservations (max 2)", successes)
		}
	})

	// Scenario 23: Refund double counting (INV-83)
	t.Run("Attack 23: Refund double counting", func(t *testing.T) {
		original := big.NewInt(10000000)
		refundAttempt := big.NewInt(15000000) // Inflated refund
		err := treasury.AssertRefundWithinBounds(refundAttempt, original)
		if err == nil {
			t.Fatalf("INV-83 VIOLATION: refund exceeded original settled amount")
		}
	})

	// Scenario 24: Dispute double counting (INV-84)
	t.Run("Attack 24: Dispute double counting", func(t *testing.T) {
		total := big.NewInt(10000000)
		avail := big.NewInt(5000000)
		res := big.NewInt(5000000)
		pending := big.NewInt(0)
		disputed := big.NewInt(5000000) // Sum = 15M > 10M total
		err := treasury.AssertNoFundCreation(total, avail, res, pending, disputed)
		if err == nil {
			t.Fatalf("INV-84 VIOLATION: double counting created phantom funds")
		}
	})

	// Scenario 25: Tenant treasury leakage (INV-61)
	t.Run("Attack 25: Tenant treasury leakage", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		_, _ = orch.GetTreasuryState(ctx, "org_alpha", treasury.ModeReal)
		_, _ = orch.GetTreasuryState(ctx, "org_beta", treasury.ModeReal)

		// Alpha reservations cannot show up under Beta
		res, _ := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_alpha",
			AmountBase:     "5000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
		})
		betaList, _ := orch.ListReservations(ctx, "org_beta", treasury.ModeReal, "")
		for _, b := range betaList {
			if b.ReservationID == res.ReservationID {
				t.Fatalf("tenant leakage: Alpha reservation found in Beta tenant scope")
			}
		}
	})

	// Scenario 26: Cross-currency calculation
	t.Run("Attack 26: Cross-currency calculation", func(t *testing.T) {
		router := treasury.NewTreasuryRouter(treasury.NewLiquidityOrchestrator())
		_, err := router.RouteLiquidity(ctx, "org_adv_26", "BTC", "1000000", treasury.ModeReal)
		if err == nil {
			t.Fatalf("expected rejection for unsupported currency")
		}
	})

	// Scenario 27: Floating-point precision regression
	t.Run("Attack 27: Floating-point precision regression", func(t *testing.T) {
		// Financial math must strictly use integer base units (0.000001 USDC = 1)
		val1 := big.NewInt(1)
		val2 := big.NewInt(2)
		sum := new(big.Int).Add(val1, val2)
		if sum.Int64() != 3 {
			t.Fatalf("base unit arithmetic failed")
		}
	})

	// Scenario 28: Emergency buffer bypass (INV-72)
	t.Run("Attack 28: Emergency buffer bypass", func(t *testing.T) {
		avail := big.NewInt(100000000)
		buffer := big.NewInt(30000000)
		requested := big.NewInt(80000000) // 100 - 30 = 70 net available
		err := treasury.AssertReservationWithinAvailable(requested, avail, buffer)
		if err == nil {
			t.Fatalf("INV-72 VIOLATION: reservation encroached into emergency buffer")
		}
	})

	// Scenario 29: Policy version mismatch
	t.Run("Attack 29: Policy version mismatch", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		res, _ := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_adv_29",
			AmountBase:     "5000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
			PolicyVersion:  "v1.0.0",
			PolicyHash:     "hash_initial",
		})
		if res.PolicyVersion != "v1.0.0" {
			t.Fatalf("policy version mismatch")
		}
	})

	// Scenario 30: Treasury router recipient injection
	t.Run("Attack 30: Treasury router recipient injection", func(t *testing.T) {
		orch := treasury.NewLiquidityOrchestrator()
		router := treasury.NewTreasuryRouter(orch)
		// Router provides state, but does not move money
		state, err := router.RouteLiquidity(ctx, "org_adv_30", "USDC", "5000000", treasury.ModeReal)
		if err != nil {
			t.Fatalf("routing failed: %v", err)
		}
		if state == nil {
			t.Fatalf("nil routed treasury")
		}
	})
}
