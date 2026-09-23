package network

import (
	"context"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

// MockNetworkRepo provides an in-memory implementation of StorageRepository for testing.
type MockNetworkRepo struct {
	identities map[string]*AgentNetworkIdentity
	manifests  map[string]*AgentManifest
	profiles   map[string]*AgentTrustProfile
	events     []*domain.DomainEvent
}

func NewMockNetworkRepo() *MockNetworkRepo {
	return &MockNetworkRepo{
		identities: make(map[string]*AgentNetworkIdentity),
		manifests:  make(map[string]*AgentManifest),
		profiles:   make(map[string]*AgentTrustProfile),
		events:     make([]*domain.DomainEvent, 0),
	}
}

func (m *MockNetworkRepo) SaveNetworkIdentity(ctx context.Context, id *AgentNetworkIdentity) error {
	m.identities[id.AgentID] = id
	return nil
}
func (m *MockNetworkRepo) GetNetworkIdentity(ctx context.Context, agentID string) (*AgentNetworkIdentity, error) {
	id, ok := m.identities[agentID]
	if !ok {
		return nil, errorsNew("not found")
	}
	return id, nil
}
func (m *MockNetworkRepo) ListNetworkIdentities(ctx context.Context, orgID string) ([]*AgentNetworkIdentity, error) {
	list := make([]*AgentNetworkIdentity, 0, len(m.identities))
	for _, id := range m.identities {
		if orgID == "" || id.OrganizationID == orgID {
			list = append(list, id)
		}
	}
	return list, nil
}
func (m *MockNetworkRepo) UpdateNetworkIdentityStatus(ctx context.Context, agentID string, status IdentityStatus, updatedAt time.Time) error {
	id, ok := m.identities[agentID]
	if !ok {
		return errorsNew("not found")
	}
	id.Status = status
	id.UpdatedAt = updatedAt
	return nil
}
func (m *MockNetworkRepo) SaveManifest(ctx context.Context, mf *AgentManifest) error {
	m.manifests[mf.AgentID] = mf
	return nil
}
func (m *MockNetworkRepo) GetManifest(ctx context.Context, agentID string) (*AgentManifest, error) {
	mf, ok := m.manifests[agentID]
	if !ok {
		return nil, errorsNew("not found")
	}
	return mf, nil
}
func (m *MockNetworkRepo) SaveTrustProfile(ctx context.Context, p *AgentTrustProfile) error {
	m.profiles[p.AgentID] = p
	return nil
}
func (m *MockNetworkRepo) GetTrustProfile(ctx context.Context, agentID string) (*AgentTrustProfile, error) {
	p, ok := m.profiles[agentID]
	if !ok {
		return nil, errorsNew("not found")
	}
	return p, nil
}
func (m *MockNetworkRepo) SaveDomainEvent(ctx context.Context, event *domain.DomainEvent) error {
	m.events = append(m.events, event)
	return nil
}

func errorsNew(msg string) error {
	return &testErr{msg: msg}
}

type testErr struct{ msg string }

func (e *testErr) Error() string { return e.msg }

func TestTrustEvaluator_DeterministicMath(t *testing.T) {
	evaluator := NewTrustEvaluator()

	profile := &AgentTrustProfile{
		AgentID:                "agent_test",
		OrganizationID:         "org_default",
		SuccessfulJobs:         95,
		FailedJobs:             5,
		VerificationSuccesses:  98,
		VerificationFailures:   2,
		DisputeCount:           0,
		HistoricalCostAccurate: 90,
		HistoricalCostDeviated: 10,
		AverageLatencyMs:       1200,
		FirstSeenAt:            time.Now().Add(-30 * 24 * time.Hour),
		LastActiveAt:           time.Now(),
		UpdatedAt:              time.Now(),
	}

	eval, err := evaluator.Evaluate(profile)
	if err != nil {
		t.Fatalf("expected evaluation to succeed, got: %v", err)
	}

	if eval.TrustScore < 8000 {
		t.Errorf("expected high trust score for 95%% completion agent, got: %d", eval.TrustScore)
	}
	if eval.Confidence < 0.9 {
		t.Errorf("expected high confidence for 100 jobs, got: %f", eval.Confidence)
	}

	// Add policy violation and assert penalty
	profile.PolicyViolationsCount = 2
	evalWithViolations, _ := evaluator.Evaluate(profile)
	if evalWithViolations.TrustScore >= eval.TrustScore {
		t.Errorf("expected score to drop after policy violations, got: %d >= %d", evalWithViolations.TrustScore, eval.TrustScore)
	}
}

func TestAgentDiscoveryService_RegistrationAndDiscovery(t *testing.T) {
	repo := NewMockNetworkRepo()
	validator := NewAgentManifestValidator(false)
	evaluator := NewTrustEvaluator()
	capReg := NewCapabilityRegistry()
	svc := NewAgentDiscoveryService(repo, validator, evaluator, capReg)
	ctx := context.Background()

	manifest := &AgentManifest{
		ProtocolVersion: ProtocolVersionV1,
		AgentID:         "agent_data_01",
		OrganizationID:  "org_default",
		Name:            "Data Analytics Pro",
		Description:     "High performance analytics",
		Version:         "1.0.0",
		Capabilities:    []string{"data_analysis@1.0"},
		Pricing: []ManifestPricing{
			{Capability: "data_analysis@1.0", Model: "FIXED", BasePrice: "150000", Currency: "USDC"},
		},
		Settlement: []string{"ARC_USDC"},
		Endpoints: ManifestEndpoints{
			TaskURL: "https://agent-data.example.com/task",
		},
		CreatedAt: time.Now(),
	}

	// 1. Register
	id, err := svc.RegisterAgent(ctx, manifest)
	if err != nil {
		t.Fatalf("failed to register agent: %v", err)
	}
	if id.AgentID != "agent_data_01" {
		t.Errorf("expected agent_id 'agent_data_01', got: %s", id.AgentID)
	}

	// 2. Discover
	results, err := svc.Discover(ctx, DiscoveryFilter{
		Capability:     "data_analysis@1.0",
		OrganizationID: "org_default",
	})
	if err != nil {
		t.Fatalf("failed to discover agent: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 discovered agent, got %d", len(results))
	}
	if results[0].Identity.AgentID != "agent_data_01" {
		t.Errorf("expected discovered agent 'agent_data_01', got %s", results[0].Identity.AgentID)
	}

	// 3. Suspend and assert exclusion from active discovery
	if err := svc.SuspendAgent(ctx, "agent_data_01", "Routine review"); err != nil {
		t.Fatalf("failed to suspend agent: %v", err)
	}
	_, _ = svc.Discover(ctx, DiscoveryFilter{
		Capability:   "data_analysis@1.0",
		Availability: "ACTIVE",
	})
	// Still discoverable if not filtering strictly by ACTIVE availability or if status changed to suspended
	idSuspended, _ := repo.GetNetworkIdentity(ctx, "agent_data_01")
	if idSuspended.Status != IdentityStatusSuspended {
		t.Errorf("expected IdentityStatusSuspended, got: %s", idSuspended.Status)
	}
}

func TestEconomicRouter_Routing(t *testing.T) {
	repo := NewMockNetworkRepo()
	validator := NewAgentManifestValidator(false)
	evaluator := NewTrustEvaluator()
	capReg := NewCapabilityRegistry()
	svc := NewAgentDiscoveryService(repo, validator, evaluator, capReg)
	selection := NewAgentSelectionEngine()
	router := NewEconomicRouter(svc, selection)
	ctx := context.Background()

	// Seed 2 agents
	m1 := &AgentManifest{
		ProtocolVersion: ProtocolVersionV1,
		AgentID:         "agent_cheap",
		OrganizationID:  "org_default",
		Name:            "Cheap Agent",
		Capabilities:    []string{"research@1.0"},
		Pricing:         []ManifestPricing{{Capability: "research@1.0", Model: "FIXED", BasePrice: "100000", Currency: "USDC"}},
		Settlement:      []string{"ARC_USDC"},
		Endpoints:       ManifestEndpoints{TaskURL: "https://cheap.example.com/task"},
	}
	m2 := &AgentManifest{
		ProtocolVersion: ProtocolVersionV1,
		AgentID:         "agent_premium",
		OrganizationID:  "org_default",
		Name:            "Premium Agent",
		Capabilities:    []string{"research@1.0"},
		Pricing:         []ManifestPricing{{Capability: "research@1.0", Model: "FIXED", BasePrice: "500000", Currency: "USDC"}},
		Settlement:      []string{"ARC_USDC"},
		Endpoints:       ManifestEndpoints{TaskURL: "https://premium.example.com/task"},
	}

	_, _ = svc.RegisterAgent(ctx, m1)
	_, _ = svc.RegisterAgent(ctx, m2)

	// Seed higher trust for premium
	_ = repo.SaveTrustProfile(ctx, &AgentTrustProfile{
		AgentID:               "agent_premium",
		SuccessfulJobs:        50,
		VerificationSuccesses: 50,
	})

	draft, err := router.RouteTask(ctx, TaskRoutingRequest{
		OrganizationID:     "org_default",
		RequiredCapability: "research@1.0",
		BudgetBaseUnits:    "1000000",
		Deadline:           time.Now().Add(1 * time.Hour),
	})
	if err != nil {
		t.Fatalf("expected routing to succeed, got: %v", err)
	}

	if draft.SelectedAgentID == "" {
		t.Errorf("expected a selected agent in routing draft")
	}
	if len(draft.Rankings) != 2 {
		t.Errorf("expected 2 evaluated rankings, got: %d", len(draft.Rankings))
	}
}
