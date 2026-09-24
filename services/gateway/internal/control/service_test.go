package control

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/economy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func TestControlService_GetStateStrip(t *testing.T) {
	ctx := context.Background()
	cfg := &config.Config{
		ArcChainID:          "5042",
		AgentVaultAddress:   "0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852",
		EnableLiveExecution: false,
	}

	repo := storage.NewMemoryRepository()
	svc := NewService(repo, nil, nil, nil, nil, cfg)

	strip, err := svc.GetStateStrip(ctx, "org_test", "SIMULATION")
	if err != nil {
		t.Fatalf("unexpected error getting state strip: %v", err)
	}

	if strip.TreasuryStatus != "HEALTHY" {
		t.Errorf("expected HEALTHY treasury status, got %s", strip.TreasuryStatus)
	}
	if strip.ExecutionMode != "SIMULATION" {
		t.Errorf("expected SIMULATION execution mode, got %s", strip.ExecutionMode)
	}
	if strip.ArcStatus != "VERIFIED" {
		t.Errorf("expected VERIFIED arc status from vault config, got %s", strip.ArcStatus)
	}
}

func TestControlService_GetOverview(t *testing.T) {
	ctx := context.Background()
	cfg := &config.Config{
		ArcChainID:        "5042",
		AgentVaultAddress: "0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852",
	}

	repo := storage.NewMemoryRepository()

	// Seed a mission in repo
	m := &economy.Mission{
		ID:              "msn_test_1",
		OrganizationID:  "org_test",
		AgentID:         "agent_1",
		Objective:       "Test macroeconomic scan",
		Status:          economy.StatusExecuting,
		Budget:          "50000000",
		Spent:           "10000000",
		RemainingBudget: "40000000",
		Currency:        "USDC",
		CreatedAt:       time.Now().UTC(),
	}
	_ = repo.SaveMission(ctx, m)

	svc := NewService(repo, nil, nil, nil, nil, cfg)

	ov, err := svc.GetOverview(ctx, "org_test", "REAL")
	if err != nil {
		t.Fatalf("unexpected error getting overview: %v", err)
	}

	if ov.ActiveMissionsCount != 1 {
		t.Errorf("expected 1 active mission, got %d", ov.ActiveMissionsCount)
	}
	if ov.DataFreshness != "LIVE" {
		t.Errorf("expected LIVE data freshness, got %s", ov.DataFreshness)
	}
}

func TestControlService_GetActivityTimeline_Filtering(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryRepository()
	svc := NewService(repo, nil, nil, nil, nil, nil)

	// Test category filtering on baseline events
	eventsTreasury, err := svc.GetActivityTimeline(ctx, "org_test", "REAL", "TREASURY", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, e := range eventsTreasury {
		if e.Category != CategoryTreasury {
			t.Errorf("expected category TREASURY, got %s", e.Category)
		}
	}

	eventsAll, err := svc.GetActivityTimeline(ctx, "org_test", "REAL", "ALL", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(eventsAll) == 0 {
		t.Errorf("expected baseline events for ALL filter, got 0")
	}
}

func TestControlService_GetFinancialTrace(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryRepository()
	svc := NewService(repo, nil, nil, nil, nil, nil)

	trace, err := svc.GetFinancialTrace(ctx, "org_test", "pi_live_9941")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if trace.PaymentIntentID != "pi_live_9941" {
		t.Errorf("expected pi_live_9941, got %s", trace.PaymentIntentID)
	}
	if len(trace.Steps) < 10 {
		t.Errorf("expected full trace chain of at least 10 steps, got %d", len(trace.Steps))
	}
	if trace.Steps[0].Stage != "MISSION" {
		t.Errorf("expected first step stage MISSION, got %s", trace.Steps[0].Stage)
	}
	if trace.Steps[len(trace.Steps)-1].Stage != "LEARNING" {
		t.Errorf("expected final step stage LEARNING, got %s", trace.Steps[len(trace.Steps)-1].Stage)
	}
}

func TestControlService_GetMissionCommandCenter(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryRepository()
	svc := NewService(repo, nil, nil, nil, nil, nil)

	mView, err := svc.GetMissionCommandCenter(ctx, "org_test", "msn_global_macro")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mView.MissionID != "msn_global_macro" {
		t.Errorf("expected msn_global_macro, got %s", mView.MissionID)
	}
	if mView.CurrentAction.Action == "" {
		t.Errorf("expected populated current action")
	}
	if mView.NextExpectedAction == "" {
		t.Errorf("expected populated next expected action")
	}
	if len(mView.TaskGraph.Nodes) == 0 {
		t.Errorf("expected task graph nodes in mission view")
	}
	if len(mView.SelectedAgents) == 0 {
		t.Errorf("expected selected agents with explainability")
	}
	if len(mView.SelectedAgents[0].RejectedAlternatives) == 0 {
		t.Errorf("expected rejected alternatives explaining why alternative agents were declined")
	}
}

func TestControlService_Search(t *testing.T) {
	ctx := context.Background()
	svc := NewService(nil, nil, nil, nil, nil, nil)

	res, err := svc.Search(ctx, "org_test", "mission")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res) == 0 {
		t.Errorf("expected search matches for 'mission', got 0")
	}
	if res[0].Type != "MISSION" {
		t.Errorf("expected result type MISSION, got %s", res[0].Type)
	}
}

func TestControlTower_SecurityInvariants(t *testing.T) {
	// Test INV-86: Read Model Is Not Source of Truth
	if err := CheckNonAuthoritative(true, false); err != nil {
		t.Errorf("unexpected error on read-only query: %v", err)
	}
	if err := CheckNonAuthoritative(true, true); !errors.Is(err, ErrInv86) {
		t.Errorf("expected ErrInv86 on mutating read-model, got: %v", err)
	}

	// Test INV-87: Frontend Cannot Authorize Payment
	if err := CheckZeroUIFinancialAuthority("frontend_direct_transfer"); !errors.Is(err, ErrInv87) {
		t.Errorf("expected ErrInv87 on direct frontend payment authorization, got: %v", err)
	}
	if err := CheckZeroUIFinancialAuthority("gateway_engine"); err != nil {
		t.Errorf("unexpected error on gateway authorization: %v", err)
	}

	// Test INV-88: Frontend Cannot Arbitrary Recipient
	if err := CheckZeroRecipientOverride("0x1111", false); !errors.Is(err, ErrInv88) {
		t.Errorf("expected ErrInv88 on unverified arbitrary recipient, got: %v", err)
	}
	if err := CheckZeroRecipientOverride("0x1111", true); err != nil {
		t.Errorf("unexpected error on policy validated recipient: %v", err)
	}

	// Test INV-92: Simulated Events Cannot Appear As Real Settlements
	if err := CheckStrictSimulationSeparation("SIMULATION", "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"); !errors.Is(err, ErrInv92) {
		t.Errorf("expected ErrInv92 when simulation claims real settlement tx hash, got: %v", err)
	}
	if err := CheckStrictSimulationSeparation("REAL", "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"); err != nil {
		t.Errorf("unexpected error on valid real settlement: %v", err)
	}

	// Test INV-94: Tenant Isolation
	if err := CheckTenantIsolation("org_alice", "org_bob"); !errors.Is(err, ErrInv94) {
		t.Errorf("expected ErrInv94 on cross-tenant access attempt, got: %v", err)
	}
	if err := CheckTenantIsolation("org_alice", "org_alice"); err != nil {
		t.Errorf("unexpected error on matching tenant: %v", err)
	}

	// Test INV-97: Hard DENY Cannot Expose Approval
	if err := CheckHardDenyInviolability("DENY", true); !errors.Is(err, ErrInv97) {
		t.Errorf("expected ErrInv97 when DENY decision offers approve action, got: %v", err)
	}
	if err := CheckHardDenyInviolability("REQUIRE_APPROVAL", true); err != nil {
		t.Errorf("unexpected error on REQUIRE_APPROVAL decision: %v", err)
	}

	// Test INV-98: Displayed Tx Hash Must Be Verified
	if err := CheckCryptographicSettlementTruth("REAL", "0x1234", false); !errors.Is(err, ErrInv98) {
		t.Errorf("expected ErrInv98 on unverified tx hash display, got: %v", err)
	}
	validHash := "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
	if err := CheckCryptographicSettlementTruth("REAL", validHash, true); err != nil {
		t.Errorf("unexpected error on verified tx hash: %v", err)
	}
}
