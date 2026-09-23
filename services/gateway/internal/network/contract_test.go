package network

import (
	"context"
	"testing"
	"time"
)

type MockContractRepo struct {
	*MockNetworkRepo
	contracts map[string]*AgentServiceContract
}

func NewMockContractRepo() *MockContractRepo {
	return &MockContractRepo{
		MockNetworkRepo: NewMockNetworkRepo(),
		contracts:       make(map[string]*AgentServiceContract),
	}
}

func (m *MockContractRepo) SaveServiceContract(ctx context.Context, c *AgentServiceContract) error {
	m.contracts[c.ContractID] = c
	return nil
}

func (m *MockContractRepo) GetServiceContract(ctx context.Context, id string) (*AgentServiceContract, error) {
	c, ok := m.contracts[id]
	if !ok {
		return nil, errorsNew("contract not found")
	}
	return c, nil
}

func (m *MockContractRepo) ListServiceContracts(ctx context.Context, orgID string) ([]*AgentServiceContract, error) {
	list := make([]*AgentServiceContract, 0, len(m.contracts))
	for _, c := range m.contracts {
		if orgID == "" || c.OrganizationID == orgID {
			list = append(list, c)
		}
	}
	return list, nil
}

func (m *MockContractRepo) UpdateServiceContractState(ctx context.Context, id string, state ContractState, updatedAt time.Time) error {
	c, ok := m.contracts[id]
	if !ok {
		return errorsNew("contract not found")
	}
	c.State = state
	c.UpdatedAt = updatedAt
	return nil
}

func TestContractManager_Lifecycle(t *testing.T) {
	repo := NewMockContractRepo()
	mgr := NewContractManager(repo)
	ctx := context.Background()

	// 1. Create Contract
	c := &AgentServiceContract{
		ContractID:       "contract_lifecycle_01",
		OrganizationID:   "org_test",
		RequesterAgentID: "agent_req_01",
		ProviderAgentID:  "agent_prov_01",
		Capability:       "research@1.0",
		Price:            "250000",
		Currency:         "USDC",
		BudgetCeiling:    "500000",
		DelegationDepth:  0,
		Expiration:       time.Now().Add(1 * time.Hour),
		Deadline:         time.Now().Add(2 * time.Hour),
	}

	created, err := mgr.CreateContract(ctx, c)
	if err != nil {
		t.Fatalf("failed to create contract: %v", err)
	}
	if created.State != ContractProposed {
		t.Errorf("expected ContractProposed, got: %s", created.State)
	}

	// 2. Self hiring rejected
	cSelf := &AgentServiceContract{
		RequesterAgentID: "agent_same",
		ProviderAgentID:  "agent_same",
	}
	if _, err := mgr.CreateContract(ctx, cSelf); err != ErrSelfHiringProhibited {
		t.Errorf("expected ErrSelfHiringProhibited, got: %v", err)
	}

	// 3. Max delegation depth exceeded
	cDeep := &AgentServiceContract{
		RequesterAgentID: "agent_a",
		ProviderAgentID:  "agent_b",
		DelegationDepth:  4,
	}
	if _, err := mgr.CreateContract(ctx, cDeep); err == nil {
		t.Errorf("expected error for delegation depth 4 > 3")
	}

	// 4. Accept Contract
	accepted, err := mgr.AcceptContract(ctx, "contract_lifecycle_01", "agent_prov_01")
	if err != nil {
		t.Fatalf("failed to accept contract: %v", err)
	}
	if accepted.State != ContractAccepted {
		t.Errorf("expected ContractAccepted, got: %s", accepted.State)
	}
}

func TestNegotiationEngine_RoundsAndCeiling(t *testing.T) {
	repo := NewMockNetworkRepo()
	engine := NewNegotiationEngine(repo)
	ctx := context.Background()

	// Round 1: Service Request
	msg1, err := engine.StartNegotiation(ctx, "contract_neg_01", "agent_a", "agent_b", "100000", 10*time.Minute)
	if err != nil {
		t.Fatalf("failed to start negotiation: %v", err)
	}
	if msg1.Round != 1 || msg1.MessageType != MsgServiceRequest {
		t.Errorf("expected round 1 MsgServiceRequest, got: %d %s", msg1.Round, msg1.MessageType)
	}

	// Round 2: Counter Quote
	msg2, err := engine.SubmitCounterQuote(ctx, msg1, "agent_b", "150000", "200000", 10*time.Minute)
	if err != nil {
		t.Fatalf("failed to counter quote: %v", err)
	}
	if msg2.Round != 2 || msg2.ProposedPrice != "150000" {
		t.Errorf("expected round 2 price 150000, got: %d %s", msg2.Round, msg2.ProposedPrice)
	}

	// Counter Quote exceeding budget ceiling rejected
	_, err = engine.SubmitCounterQuote(ctx, msg2, "agent_b", "300000", "200000", 10*time.Minute)
	if err == nil {
		t.Errorf("expected counter quote exceeding ceiling to fail")
	}

	// Round 3: Accept
	finalMsg, err := engine.FinalizeNegotiation(ctx, msg2, "agent_a", true)
	if err != nil {
		t.Fatalf("failed to finalize negotiation: %v", err)
	}
	if finalMsg.MessageType != MsgAccept {
		t.Errorf("expected MsgAccept, got: %s", finalMsg.MessageType)
	}
}

func TestPaymentBridge_FundContract(t *testing.T) {
	repo := NewMockContractRepo()
	bridge := NewPaymentBridge(repo, nil, nil, nil)
	ctx := context.Background()

	contract := &AgentServiceContract{
		ContractID:       "contract_bridge_01",
		OrganizationID:   "org_test",
		RequesterAgentID: "agent_a",
		ProviderAgentID:  "agent_b",
		Capability:       "research@1.0",
		Price:            "200000",
		Currency:         "USDC",
		State:            ContractAccepted,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	_ = repo.SaveServiceContract(ctx, contract)

	pi, err := bridge.FundContract(ctx, "contract_bridge_01")
	if err != nil {
		t.Fatalf("failed to fund contract: %v", err)
	}

	if pi.Amount != "200000" || pi.Asset != "USDC" {
		t.Errorf("payment intent parameters mismatch: %+v", pi)
	}

	funded, _ := repo.GetServiceContract(ctx, "contract_bridge_01")
	if funded.State != ContractFunded {
		t.Errorf("expected ContractFunded state, got: %s", funded.State)
	}
	if funded.PaymentIntentID == "" {
		t.Errorf("expected payment intent ID on funded contract")
	}
}
