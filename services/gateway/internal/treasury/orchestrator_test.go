package treasury_test

import (
	"context"
	"math/big"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
)

type mockBalanceProvider struct {
	balance *big.Int
	err     error
}

func (m *mockBalanceProvider) GetVaultBalance(ctx context.Context, vaultAddress string) (*big.Int, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.balance, nil
}

func setupTestTreasury(t *testing.T) treasury.Service {
	repo := storage.NewMemoryRepository()
	bp := &mockBalanceProvider{
		balance: big.NewInt(1000000000), // $1000 USDC
	}
	return treasury.NewTreasuryService(repo, bp)
}

func TestTreasuryState_Reconciliation(t *testing.T) {
	ts := setupTestTreasury(t)
	ctx := context.Background()

	state, err := ts.GetTreasuryState(ctx, "org_test", treasury.ModeReal)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if state.Currency != "USDC" {
		t.Errorf("expected currency USDC, got %s", state.Currency)
	}
	if state.OperationalMode != treasury.OperationalModeNormal {
		t.Errorf("expected NORMAL operational mode, got %s", state.OperationalMode)
	}
}

func TestLiquidityEnvelope_SafeCapacityCalculation(t *testing.T) {
	ts := setupTestTreasury(t)
	ctx := context.Background()

	envelope, err := ts.GetLiquidityEnvelope(ctx, "org_test", treasury.ScopeOrganization, "org_test", treasury.ModeReal)
	if err != nil {
		t.Fatalf("failed to get envelope: %v", err)
	}

	avail, _ := treasury.ParseBigInt(envelope.CurrentAvailable)
	buffer, _ := treasury.ParseBigInt(envelope.MinimumBuffer)
	safeCap, _ := treasury.ParseBigInt(envelope.SafeCommitmentCapacity)

	// Safe commitment capacity must equal Available - Committed - Buffer
	expectedSafe := new(big.Int).Sub(avail, buffer)
	if expectedSafe.Sign() < 0 {
		expectedSafe = big.NewInt(0)
	}

	if safeCap.Cmp(expectedSafe) != 0 {
		t.Errorf("expected safe capacity %s, got %s", expectedSafe.String(), safeCap.String())
	}
}

func TestLiquidityGate_Available_Constrained_Unavailable(t *testing.T) {
	ts := setupTestTreasury(t)
	ctx := context.Background()

	// 1. Available: Small amount below safe capacity ($10 USDC = 10,000,000)
	gate1, reason1, err := ts.EvaluateLiquidityGate(ctx, "org_test", "10000000", treasury.ModeReal)
	if err != nil || gate1 != treasury.GateLiquidityAvailable {
		t.Errorf("expected GateLiquidityAvailable, got %s (%s)", gate1, reason1)
	}

	// 2. Constrained: Amount exceeding safe capacity (400M) but within total available (500M) ($450 USDC = 450,000,000)
	gate2, reason2, err := ts.EvaluateLiquidityGate(ctx, "org_test", "450000000", treasury.ModeReal)
	if err != nil || gate2 != treasury.GateLiquidityConstrained {
		t.Errorf("expected GateLiquidityConstrained, got %s (%s)", gate2, reason2)
	}

	// 3. Unavailable: Amount exceeding entire available liquidity ($10,000 USDC)
	gate3, reason3, _ := ts.EvaluateLiquidityGate(ctx, "org_test", "10000000000", treasury.ModeReal)
	if gate3 != treasury.GateLiquidityUnavailable {
		t.Errorf("expected GateLiquidityUnavailable, got %s (%s)", gate3, reason3)
	}
}

func TestReservation_Lifecycle_Atomic(t *testing.T) {
	ts := setupTestTreasury(t)
	ctx := context.Background()

	req := &treasury.LiquidityReservationRequest{
		OrganizationID: "org_test",
		Source:         "MISSION",
		MissionID:      "msn_100",
		AmountBase:     "25000000", // $25.00 USDC
		Currency:       "USDC",
		Mode:           treasury.ModeReal,
		TimeoutSeconds: 3600,
	}

	res, err := ts.ReserveLiquidityAtomic(ctx, req)
	if err != nil {
		t.Fatalf("atomic reservation failed: %v", err)
	}

	if res.Status != treasury.ReservationReserved {
		t.Errorf("expected status RESERVED, got %s", res.Status)
	}

	// Releasing reservation
	err = ts.ReleaseLiquidityReservation(ctx, res.ReservationID, "Task completed under budget")
	if err != nil {
		t.Fatalf("failed to release reservation: %v", err)
	}

	reservations, err := ts.ListReservations(ctx, "org_test", treasury.ModeReal, treasury.ReservationReleased)
	if err != nil || len(reservations) != 1 {
		t.Errorf("expected 1 released reservation, got %d", len(reservations))
	}
}

func TestReservation_Expiration(t *testing.T) {
	ts := setupTestTreasury(t)
	ctx := context.Background()

	req := &treasury.LiquidityReservationRequest{
		OrganizationID: "org_test",
		Source:         "SWARM",
		AmountBase:     "5000000", // $5.00 USDC
		Currency:       "USDC",
		Mode:           treasury.ModeReal,
		TimeoutSeconds: -1, // Force expired
	}

	_, err := ts.ReserveLiquidityAtomic(ctx, req)
	if err != nil {
		t.Fatalf("reservation failed: %v", err)
	}

	// Wait 1ms so time.Now() is strictly past creation
	time.Sleep(2 * time.Millisecond)

	expired, err := ts.ExpireStaleReservations(ctx, "org_test")
	if err != nil || expired < 1 {
		t.Errorf("expected at least 1 expired reservation, got %d (err: %v)", expired, err)
	}
}

func TestExpectedInflow_NotTreatedAsAvailable(t *testing.T) {
	ts := setupTestTreasury(t)
	ctx := context.Background()

	stateBefore, _ := ts.GetTreasuryState(ctx, "org_test", treasury.ModeReal)

	// Record $500 USDC unverified expected inflow
	err := ts.RecordExpectedInflow(ctx, &treasury.ExpectedInflow{
		OrganizationID: "org_test",
		Source:         "CUSTOMER_DEPOSIT",
		ExpectedAmount: "500000000",
		Currency:       "USDC",
		ExpectedAt:     time.Now().Add(24 * time.Hour),
		Confidence:     0.90,
	})
	if err != nil {
		t.Fatalf("failed to record inflow: %v", err)
	}

	stateAfter, _ := ts.GetTreasuryState(ctx, "org_test", treasury.ModeReal)

	// Invariant INV-71 & INV-82: Available balance must remain identical
	if stateBefore.AvailableBalance != stateAfter.AvailableBalance {
		t.Errorf("INV-71 VIOLATION: Available balance changed from %s to %s before inflow verification",
			stateBefore.AvailableBalance, stateAfter.AvailableBalance)
	}
}

func TestForecaster_HorizonsAndScenarios(t *testing.T) {
	ts := setupTestTreasury(t)
	ctx := context.Background()

	horizons := []treasury.ForecastHorizon{
		treasury.Horizon1Hour,
		treasury.Horizon6Hours,
		treasury.Horizon24Hours,
		treasury.Horizon7Days,
		treasury.Horizon30Days,
	}

	for _, h := range horizons {
		fc, err := ts.GenerateForecast(ctx, "org_test", h, treasury.ScenarioSettlementCluster, treasury.ModeReal)
		if err != nil {
			t.Fatalf("failed to generate forecast for %s: %v", h, err)
		}
		if len(fc.Points) < 2 {
			t.Errorf("expected multiple forecast points, got %d", len(fc.Points))
		}
		if fc.Confidence <= 0 || fc.Confidence > 1.0 {
			t.Errorf("invalid forecast confidence: %f", fc.Confidence)
		}
	}
}

func TestStressTester_SurvivalStates(t *testing.T) {
	ts := setupTestTreasury(t)
	ctx := context.Background()

	// 1. Moderate stress: should be SAFE or CONSTRAINED
	resModerate, err := ts.RunStressSimulation(ctx, "org_test", &treasury.LiquidityStressScenario{
		ScenarioName:            treasury.ScenarioBaseline,
		SimultaneousSettlements: 2,
		ProviderFallbackRate:    0.10,
		RetrySurgePercentage:    0.05,
		MilestoneReleaseRatio:   0.5,
	}, treasury.ModeReal)
	if err != nil {
		t.Fatalf("stress test failed: %v", err)
	}
	if resModerate.SurvivalState != treasury.SurvivalSafe && resModerate.SurvivalState != treasury.SurvivalConstrained {
		t.Errorf("unexpected survival state for moderate stress: %s", resModerate.SurvivalState)
	}

	// 2. Severe stress: should breach buffer
	resSevere, err := ts.RunStressSimulation(ctx, "org_test", &treasury.LiquidityStressScenario{
		ScenarioName:            treasury.ScenarioSettlementCluster,
		SimultaneousSettlements: 20,
		ProviderFallbackRate:    1.50, // 150% surcharge
		RetrySurgePercentage:    1.00,
		MilestoneReleaseRatio:   1.0,
	}, treasury.ModeReal)
	if err != nil {
		t.Fatalf("stress test failed: %v", err)
	}
	if !resSevere.BufferBreached {
		t.Errorf("expected buffer breach under extreme stress scenario")
	}
}

func TestAllocator_StarvationPrevention(t *testing.T) {
	ts := setupTestTreasury(t)
	ctx := context.Background()

	// Create 3 candidates, one of which has been deferred 3 times
	candidates := []*treasury.AllocationCandidate{
		{
			CandidateID:   "c_normal",
			Amount:        "10000000",
			DeferralCount: 0,
			WaitDuration:  5 * time.Minute,
		},
		{
			CandidateID:   "c_starved",
			Amount:        "10000000",
			DeferralCount: 3, // Anti-starvation boost
			WaitDuration:  3 * time.Hour,
		},
	}

	prop, err := ts.ProposeAllocation(ctx, "org_test", candidates, treasury.ModeReal)
	if err != nil {
		t.Fatalf("allocation failed: %v", err)
	}

	if len(prop.ApprovedCandidates) == 0 {
		t.Fatalf("expected approved candidates")
	}

	// Starved candidate should be prioritized first due to anti-starvation boost
	if prop.ApprovedCandidates[0].CandidateID != "c_starved" {
		t.Errorf("expected starved candidate prioritized first, got %s", prop.ApprovedCandidates[0].CandidateID)
	}
}

func TestReconciliation_DiscrepancyDetection(t *testing.T) {
	repo := storage.NewMemoryRepository()
	// Mock provider returning different balance than internal ledger
	bp := &mockBalanceProvider{
		balance: big.NewInt(100000000), // $100 USDC on-chain vs $500 in internal state
	}
	ts := treasury.NewTreasuryService(repo, bp)
	ctx := context.Background()

	report, err := ts.ReconcileTreasury(ctx, "org_test", "0x3600000000000000000000000000000000000001", treasury.ModeReal)
	if err != nil {
		t.Fatalf("reconciliation failed: %v", err)
	}

	if report.Status != treasury.ReconMismatch {
		t.Errorf("INV-81 VIOLATION: expected MISMATCH status, got %s", report.Status)
	}
	disc, _ := treasury.ParseBigInt(report.DiscrepancyAmount)
	if disc.Sign() == 0 {
		t.Errorf("expected non-zero discrepancy amount")
	}
}
