package network

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"testing"
	"time"
)

type FullMockRepo struct {
	*MockContractRepo
	disputes map[string]*DisputeRecord
}

func NewFullMockRepo() *FullMockRepo {
	return &FullMockRepo{
		MockContractRepo: NewMockContractRepo(),
		disputes:         make(map[string]*DisputeRecord),
	}
}

func (m *FullMockRepo) SaveDispute(ctx context.Context, d *DisputeRecord) error {
	m.disputes[d.DisputeID] = d
	return nil
}

func (m *FullMockRepo) GetDispute(ctx context.Context, id string) (*DisputeRecord, error) {
	d, ok := m.disputes[id]
	if !ok {
		return nil, errorsNew("dispute not found")
	}
	return d, nil
}

func (m *FullMockRepo) ListDisputes(ctx context.Context, orgID string) ([]*DisputeRecord, error) {
	list := make([]*DisputeRecord, 0, len(m.disputes))
	for _, d := range m.disputes {
		if orgID == "" || d.OrganizationID == orgID {
			list = append(list, d)
		}
	}
	return list, nil
}

func (m *FullMockRepo) UpdateDisputeState(ctx context.Context, id string, state DisputeState, notes string, refund string, resolvedAt *time.Time) error {
	d, ok := m.disputes[id]
	if !ok {
		return errorsNew("dispute not found")
	}
	d.State = state
	d.ResolutionNotes = notes
	d.RefundAmount = refund
	d.ResolvedAt = resolvedAt
	return nil
}

func TestAgentResultVerifier_VerificationSuccessAndTampering(t *testing.T) {
	repo := NewFullMockRepo()
	verifier := NewAgentResultVerifier(repo)
	ctx := context.Background()

	now := time.Now()
	contract := &AgentServiceContract{
		ContractID:       "contract_ver_01",
		OrganizationID:   "org_test",
		RequesterAgentID: "agent_req",
		ProviderAgentID:  "agent_prov",
		Capability:       "research@1.0",
		Price:            "300000",
		Currency:         "USDC",
		Deadline:         now.Add(1 * time.Hour),
		OutputSpec:       map[string]interface{}{"summary": "string"},
		State:            ContractExecuting,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	_ = repo.SaveServiceContract(ctx, contract)

	output := map[string]interface{}{
		"summary": "Market analysis complete with 4 competitors identified",
		"items":   4,
	}
	outBytes, _ := json.Marshal(output)
	hash := sha256.Sum256(outBytes)
	checksumHex := hex.EncodeToString(hash[:])

	// 1. Valid deliverable submission
	validPayload := &AgentResultPayload{
		ContractID:      "contract_ver_01",
		ProviderAgentID: "agent_prov",
		Output:          output,
		ChecksumSHA256:  checksumHex,
		ClaimedCost:     "300000",
		Timestamp:       now,
	}

	report, err := verifier.VerifyResult(ctx, validPayload)
	if err != nil {
		t.Fatalf("expected verification to pass, got: %v", err)
	}
	if !report.Passed || !report.ChecksumValid || !report.DeadlineMet {
		t.Errorf("verification report incomplete: %+v", report)
	}

	// 2. Tampered deliverable checksum rejection
	tamperedPayload := &AgentResultPayload{
		ContractID:      "contract_ver_01",
		ProviderAgentID: "agent_prov",
		Output:          output,
		ChecksumSHA256:  "deadbeef0123456789abcdef",
		ClaimedCost:     "300000",
		Timestamp:       now,
	}
	_, err = verifier.VerifyResult(ctx, tamperedPayload)
	if err != ErrResultChecksumMismatch {
		t.Errorf("expected ErrResultChecksumMismatch, got: %v", err)
	}
}

func TestDelegationManager_AntiCycleAndDepthBound(t *testing.T) {
	repo := NewFullMockRepo()
	delMgr := NewDelegationManager(repo)
	ctx := context.Background()

	now := time.Now()
	// Parent contract at depth 1
	rootContract := &AgentServiceContract{
		ContractID:       "contract_root",
		OrganizationID:   "org_test",
		RequesterAgentID: "agent_client",
		ProviderAgentID:  "agent_lead",
		Price:            "1000000",
		Currency:         "USDC",
		DelegationDepth:  1,
		State:            ContractExecuting,
		Deadline:         now.Add(2 * time.Hour),
	}
	_ = repo.SaveServiceContract(ctx, rootContract)

	// Valid child delegation: depth 2
	child, err := delMgr.DelegateSubcontract(
		ctx,
		"contract_root",
		"agent_sub_1",
		"data_analysis@1.0",
		"400000",
		now.Add(1*time.Hour),
		map[string]interface{}{"query": "select *"},
	)
	if err != nil {
		t.Fatalf("failed valid delegation: %v", err)
	}
	if child.DelegationDepth != 2 {
		t.Errorf("expected child depth 2, got: %d", child.DelegationDepth)
	}

	// Cyclic delegation attempt: agent_sub_1 delegating back to agent_lead
	_ = repo.SaveServiceContract(ctx, child)
	_, err = delMgr.DelegateSubcontract(
		ctx,
		child.ContractID,
		"agent_lead",
		"coding@1.0",
		"200000",
		now.Add(30*time.Minute),
		nil,
	)
	if err == nil {
		t.Errorf("expected cyclic delegation to be rejected, got nil")
	}
}

func TestDisputeManager_DisputeFlow(t *testing.T) {
	repo := NewFullMockRepo()
	dispMgr := NewDisputeManager(repo)
	ctx := context.Background()

	contract := &AgentServiceContract{
		ContractID:       "contract_dispute_01",
		OrganizationID:   "org_test",
		RequesterAgentID: "agent_buyer",
		ProviderAgentID:  "agent_seller",
		Price:            "500000",
		State:            ContractExecuting,
	}
	_ = repo.SaveServiceContract(ctx, contract)

	// 1. Open Dispute
	disp, err := dispMgr.OpenDispute(ctx, "contract_dispute_01", "agent_buyer", "Deliverable was empty", "hash:000")
	if err != nil {
		t.Fatalf("failed to open dispute: %v", err)
	}
	if disp.State != DisputeStateOpen {
		t.Errorf("expected DisputeStateOpen, got: %s", disp.State)
	}

	// 2. Unauthorized Disputant
	_, err = dispMgr.OpenDispute(ctx, "contract_dispute_01", "agent_intruder", "Fraud", "")
	if err != ErrUnauthorizedDisputant {
		t.Errorf("expected ErrUnauthorizedDisputant, got: %v", err)
	}

	// 3. Resolve Dispute
	resolved, err := dispMgr.ResolveDispute(ctx, disp.DisputeID, DisputeStateRefundRequired, "Refund agreed", "500000")
	if err != nil {
		t.Fatalf("failed to resolve dispute: %v", err)
	}
	if resolved.State != DisputeStateRefundRequired {
		t.Errorf("expected DisputeStateRefundRequired, got: %s", resolved.State)
	}
}

func TestNetworkGraphService_BuildGraph(t *testing.T) {
	repo := NewFullMockRepo()
	graphSvc := NewNetworkGraphService(repo)
	ctx := context.Background()

	id := &AgentNetworkIdentity{
		AgentID:        "agent_g1",
		OrganizationID: "org_default",
		DisplayName:    "Graph Agent",
		Capabilities:   []string{"research@1.0"},
		Status:         IdentityStatusActive,
	}
	_ = repo.SaveNetworkIdentity(ctx, id)

	contract := &AgentServiceContract{
		ContractID:       "c_g1",
		OrganizationID:   "org_default",
		RequesterAgentID: "agent_client",
		ProviderAgentID:  "agent_g1",
		Capability:       "research@1.0",
		Price:            "100000",
		Currency:         "USDC",
		State:            ContractCompleted,
	}
	_ = repo.SaveServiceContract(ctx, contract)

	graph, err := graphSvc.BuildGraph(ctx, "org_default")
	if err != nil {
		t.Fatalf("failed to build graph: %v", err)
	}

	if len(graph.Nodes) < 2 {
		t.Errorf("expected at least 2 nodes, got: %d", len(graph.Nodes))
	}
	if len(graph.Edges) < 2 {
		t.Errorf("expected at least 2 edges, got: %d", len(graph.Edges))
	}
}
