package protocol_test

import (
	"context"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/protocol"
)

func TestProtocolControlTowerSnapshot_Seeded(t *testing.T) {
	ctx := context.Background()
	store := protocol.NewMemoryProtocolStore()
	svc := protocol.NewProtocolService(store, nil, nil, nil, nil)

	snap, err := svc.GetControlTowerSnapshot(ctx, "tenant_default")
	if err != nil {
		t.Fatalf("failed to get control tower snapshot: %v", err)
	}

	// Mode and funds truthfulness
	if snap.Mode != "simulation" {
		t.Errorf("expected mode 'simulation', got %q", snap.Mode)
	}
	if snap.FundsMoved {
		t.Errorf("expected funds_moved false, got true")
	}

	// Arc truthfulness
	if !snap.Arc.Connected {
		t.Errorf("expected arc connected true")
	}
	if snap.Arc.ChainID != 5042 {
		t.Errorf("expected chain ID 5042, got %d", snap.Arc.ChainID)
	}
	if snap.Arc.LiveExecution {
		t.Errorf("expected live execution false")
	}
	if snap.Arc.AgentVaultDeployed {
		t.Errorf("expected agent vault deployed false")
	}
	if snap.Arc.RealSettlements != 0 {
		t.Errorf("expected real settlements 0, got %d", snap.Arc.RealSettlements)
	}

	// Agent metrics from canonical store
	if snap.Agents.Discovered != 3 {
		t.Errorf("expected 3 discovered agents, got %d", snap.Agents.Discovered)
	}
	if snap.Agents.ManifestValid != 3 {
		t.Errorf("expected 3 valid manifests, got %d", snap.Agents.ManifestValid)
	}
	if len(snap.Agents.Items) != 3 {
		t.Errorf("expected 3 agent items, got %d", len(snap.Agents.Items))
	}
	for _, agent := range snap.Agents.Items {
		if agent.ReputationScore != 95 {
			t.Errorf("expected agent %s to have reputation 95, got %d", agent.AgentID, agent.ReputationScore)
		}
	}

	// Contract metrics
	if snap.Contracts.Active != 1 {
		t.Errorf("expected 1 active contract, got %d", snap.Contracts.Active)
	}
	if snap.Contracts.ProjectedValueUSDC != "110.00" {
		t.Errorf("expected 110.00 projected value, got %s", snap.Contracts.ProjectedValueUSDC)
	}
	if len(snap.Contracts.Items) != 1 {
		t.Errorf("expected 1 contract item, got %d", len(snap.Contracts.Items))
	}
	if len(snap.Contracts.Items[0].Milestones) != 2 {
		t.Errorf("expected 2 milestones on active contract, got %d", len(snap.Contracts.Items[0].Milestones))
	}

	// Security metrics
	if snap.Security.AttacksBlocked != 324 {
		t.Errorf("expected 324 attacks blocked, got %d", snap.Security.AttacksBlocked)
	}
	if snap.Security.AuthorityLeaks != 0 {
		t.Errorf("expected 0 authority leaks, got %d", snap.Security.AuthorityLeaks)
	}
	if snap.Security.AdversarialSummary == nil {
		t.Fatalf("expected non-nil adversarial summary")
	}
	if snap.Security.AdversarialSummary.ReplaysPrevented != 142 {
		t.Errorf("expected 142 replays prevented, got %d", snap.Security.AdversarialSummary.ReplaysPrevented)
	}

	// Telemetry
	if len(snap.Telemetry) != 7 {
		t.Errorf("expected 7 telemetry items, got %d", len(snap.Telemetry))
	}
}

func TestProtocolControlTowerSnapshot_EmptyStoreHonestZeros(t *testing.T) {
	ctx := context.Background()
	// Construct store without seedDefaultFixtures to verify honest empty state
	emptyStore := &testEmptyProtocolStore{}
	svc := protocol.NewProtocolService(emptyStore, nil, nil, nil, nil)

	snap, err := svc.GetControlTowerSnapshot(ctx, "tenant_empty")
	if err != nil {
		t.Fatalf("failed to get snapshot for empty store: %v", err)
	}

	if snap.Agents.Discovered != 0 {
		t.Errorf("expected 0 discovered agents for empty store, got %d", snap.Agents.Discovered)
	}
	if snap.Agents.ManifestValid != 0 {
		t.Errorf("expected 0 valid manifests, got %d", snap.Agents.ManifestValid)
	}
	if len(snap.Agents.Items) != 0 {
		t.Errorf("expected 0 items, got %d", len(snap.Agents.Items))
	}
	if snap.Contracts.Active != 0 {
		t.Errorf("expected 0 active contracts, got %d", snap.Contracts.Active)
	}
	if snap.Contracts.ProjectedValueUSDC != "0.00" {
		t.Errorf("expected '0.00' projected value, got %s", snap.Contracts.ProjectedValueUSDC)
	}
	if len(snap.Contracts.Items) != 0 {
		t.Errorf("expected 0 contract items, got %d", len(snap.Contracts.Items))
	}
	if len(snap.Telemetry) != 0 {
		t.Errorf("expected 0 telemetry entries, got %d", len(snap.Telemetry))
	}
}

// testEmptyProtocolStore implements ProtocolStore returning empty slices.
type testEmptyProtocolStore struct{}

func (s *testEmptyProtocolStore) SaveMessage(ctx context.Context, msg *protocol.ProtocolMessage) error {
	return nil
}
func (s *testEmptyProtocolStore) GetMessageByIdempotency(ctx context.Context, tenantID, key string) (*protocol.ProtocolMessage, error) {
	return nil, nil
}
func (s *testEmptyProtocolStore) SaveManifest(ctx context.Context, manifest *protocol.AgentManifest) error {
	return nil
}
func (s *testEmptyProtocolStore) GetManifest(ctx context.Context, agentID string) (*protocol.AgentManifest, error) {
	return nil, protocol.ErrAgentNotFound
}
func (s *testEmptyProtocolStore) ListManifests(ctx context.Context, capability string) ([]*protocol.AgentManifest, error) {
	return []*protocol.AgentManifest{}, nil
}
func (s *testEmptyProtocolStore) SaveQuote(ctx context.Context, quote *protocol.ProtocolQuote) error {
	return nil
}
func (s *testEmptyProtocolStore) GetQuote(ctx context.Context, quoteID string) (*protocol.ProtocolQuote, error) {
	return nil, protocol.ErrQuoteNotFound
}
func (s *testEmptyProtocolStore) SaveContract(ctx context.Context, contract *protocol.ProtocolContract) error {
	return nil
}
func (s *testEmptyProtocolStore) GetContract(ctx context.Context, contractID string) (*protocol.ProtocolContract, error) {
	return nil, protocol.ErrContractNotFound
}
func (s *testEmptyProtocolStore) ListContracts(ctx context.Context, tenantID string) ([]*protocol.ProtocolContract, error) {
	return []*protocol.ProtocolContract{}, nil
}
func (s *testEmptyProtocolStore) SaveOperation(ctx context.Context, opID, opType, status string, result, errData interface{}) error {
	return nil
}
func (s *testEmptyProtocolStore) GetOperation(ctx context.Context, opID string) (map[string]interface{}, error) {
	return nil, protocol.ErrOperationNotFound
}
func (s *testEmptyProtocolStore) RecordTraffic(ctx context.Context, entry *protocol.ProtocolTrafficEntry) error {
	return nil
}
func (s *testEmptyProtocolStore) GetTraffic(ctx context.Context, tenantID string, limit int) ([]*protocol.ProtocolTrafficEntry, error) {
	return []*protocol.ProtocolTrafficEntry{}, nil
}
