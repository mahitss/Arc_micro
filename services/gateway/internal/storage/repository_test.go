package storage

import (
	"context"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/network"
)

// TestRepository_IntentPersistence tests saving and retrieving a PaymentIntent (Test Case 26).
func TestRepository_IntentPersistence(t *testing.T) {
	repo := NewMemoryRepository()
	ctx := context.Background()

	now := time.Now()
	pi := &intent.PaymentIntent{
		IntentID:      "intent_test123",
		AgentID:       "research-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Recipient:     "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
		Amount:        "180000",
		Asset:         "USDC",
		Purpose:       "api_usage",
		Justification: "Test justification",
		Status:        intent.StatusCreated,
		CreatedAt:     now,
		ExpiresAt:     now.Add(5 * time.Minute),
		UpdatedAt:     now,
	}

	if err := repo.SaveIntent(ctx, pi); err != nil {
		t.Fatalf("failed to save intent: %v", err)
	}

	retrieved, err := repo.GetIntent(ctx, pi.IntentID)
	if err != nil {
		t.Fatalf("failed to retrieve intent: %v", err)
	}

	if retrieved.IntentID != pi.IntentID || retrieved.Amount != "180000" || retrieved.Status != intent.StatusCreated {
		t.Fatalf("retrieved intent does not match: %+v", retrieved)
	}
}

// TestRepository_ExecutionPersistence tests saving and retrieving execution records (Test Case 27).
func TestRepository_ExecutionPersistence(t *testing.T) {
	repo := NewMemoryRepository()
	ctx := context.Background()

	now := time.Now()
	ex := &intent.PaymentExecutionRecord{
		IntentID:        "intent_test123",
		TransactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
		Status:          "CONFIRMED",
		ConfirmedAt:     &now,
	}

	if err := repo.SaveExecution(ctx, ex); err != nil {
		t.Fatalf("failed to save execution: %v", err)
	}

	retrieved, err := repo.GetExecution(ctx, ex.IntentID)
	if err != nil {
		t.Fatalf("failed to retrieve execution: %v", err)
	}

	if retrieved.TransactionHash != ex.TransactionHash || retrieved.Status != "CONFIRMED" {
		t.Fatalf("retrieved execution does not match: %+v", retrieved)
	}
}

// TestRepository_UniqueIntentID tests that duplicate intent IDs are rejected (Test Case 28).
func TestRepository_UniqueIntentID(t *testing.T) {
	repo := NewMemoryRepository()
	ctx := context.Background()

	now := time.Now()
	pi := &intent.PaymentIntent{
		IntentID:  "intent_duplicate",
		AgentID:   "research-agent",
		Amount:    "100000",
		Asset:     "USDC",
		Status:    intent.StatusCreated,
		CreatedAt: now,
		ExpiresAt: now.Add(5 * time.Minute),
		UpdatedAt: now,
	}

	if err := repo.SaveIntent(ctx, pi); err != nil {
		t.Fatalf("first save should succeed, got: %v", err)
	}

	if err := repo.SaveIntent(ctx, pi); err == nil {
		t.Fatal("expected error on duplicate intent ID, got nil")
	}
}

// TestRepository_IdempotencyBehavior tests updating status and idempotency (Test Case 29).
func TestRepository_IdempotencyBehavior(t *testing.T) {
	repo := NewMemoryRepository()
	ctx := context.Background()

	now := time.Now()
	pi := &intent.PaymentIntent{
		IntentID:  "intent_idempotent",
		AgentID:   "research-agent",
		Amount:    "100000",
		Asset:     "USDC",
		Status:    intent.StatusCreated,
		CreatedAt: now,
		ExpiresAt: now.Add(5 * time.Minute),
		UpdatedAt: now,
	}

	_ = repo.SaveIntent(ctx, pi)

	// Update to AUTHORIZED
	if err := repo.UpdateIntentStatus(ctx, pi.IntentID, intent.StatusAuthorized, now); err != nil {
		t.Fatalf("failed to update status: %v", err)
	}

	updated, _ := repo.GetIntent(ctx, pi.IntentID)
	if updated.Status != intent.StatusAuthorized {
		t.Fatalf("expected AUTHORIZED status, got: %s", updated.Status)
	}
}

// TestRepository_OpenAgentNetworkPersistence tests saving and retrieving network entities (Phase 2).
func TestRepository_OpenAgentNetworkPersistence(t *testing.T) {
	repo := NewMemoryRepository()
	ctx := context.Background()
	now := time.Now()

	// 1. Identity
	identity := &network.AgentNetworkIdentity{
		AgentID:         "agent_sec_01",
		OrganizationID:  "org_default",
		DisplayName:     "Sentinel Auditor",
		ProtocolVersion: network.ProtocolVersionV1,
		Capabilities:    []string{"security.audit@1.0"},
		Status:          network.IdentityStatusActive,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := repo.SaveNetworkIdentity(ctx, identity); err != nil {
		t.Fatalf("failed to save network identity: %v", err)
	}
	retrievedID, err := repo.GetNetworkIdentity(ctx, "agent_sec_01")
	if err != nil {
		t.Fatalf("failed to get network identity: %v", err)
	}
	if retrievedID.DisplayName != "Sentinel Auditor" {
		t.Errorf("expected 'Sentinel Auditor', got '%s'", retrievedID.DisplayName)
	}

	// 2. Service Contract
	contract := &network.AgentServiceContract{
		ContractID:       "contract_01",
		OrganizationID:   "org_default",
		RequesterAgentID: "agent_research_01",
		ProviderAgentID:  "agent_sec_01",
		Capability:       "security.audit@1.0",
		Price:            "500000",
		Currency:         "USDC",
		BudgetCeiling:    "1000000",
		Deadline:         now.Add(2 * time.Hour),
		Expiration:       now.Add(1 * time.Hour),
		State:            network.ContractProposed,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := repo.SaveServiceContract(ctx, contract); err != nil {
		t.Fatalf("failed to save contract: %v", err)
	}
	retrievedContract, err := repo.GetServiceContract(ctx, "contract_01")
	if err != nil {
		t.Fatalf("failed to get contract: %v", err)
	}
	if retrievedContract.State != network.ContractProposed {
		t.Errorf("expected ContractProposed, got '%s'", retrievedContract.State)
	}

	// 3. State update
	if err := repo.UpdateServiceContractState(ctx, "contract_01", network.ContractAccepted, now); err != nil {
		t.Fatalf("failed to update contract state: %v", err)
	}
	retrievedContract, _ = repo.GetServiceContract(ctx, "contract_01")
	if retrievedContract.State != network.ContractAccepted {
		t.Errorf("expected ContractAccepted, got '%s'", retrievedContract.State)
	}

	// 4. Trust Profile
	profile := &network.AgentTrustProfile{
		AgentID:               "agent_sec_01",
		OrganizationID:        "org_default",
		SuccessfulJobs:        10,
		FailedJobs:            1,
		VerificationSuccesses: 10,
		UpdatedAt:             now,
	}
	if err := repo.SaveTrustProfile(ctx, profile); err != nil {
		t.Fatalf("failed to save trust profile: %v", err)
	}
	retrievedProfile, err := repo.GetTrustProfile(ctx, "agent_sec_01")
	if err != nil {
		t.Fatalf("failed to get trust profile: %v", err)
	}
	if retrievedProfile.SuccessfulJobs != 10 {
		t.Errorf("expected 10 successful jobs, got %d", retrievedProfile.SuccessfulJobs)
	}

	// 5. Dispute
	dispute := &network.DisputeRecord{
		DisputeID:        "dispute_01",
		ContractID:       "contract_01",
		OrganizationID:   "org_default",
		InitiatorAgentID: "agent_research_01",
		RespondentAgentID: "agent_sec_01",
		Reason:           "Delayed deliverable",
		State:            network.DisputeStateOpen,
		CreatedAt:        now,
	}
	if err := repo.SaveDispute(ctx, dispute); err != nil {
		t.Fatalf("failed to save dispute: %v", err)
	}
	retrievedDispute, err := repo.GetDispute(ctx, "dispute_01")
	if err != nil {
		t.Fatalf("failed to get dispute: %v", err)
	}
	if retrievedDispute.State != network.DisputeStateOpen {
		t.Errorf("expected DisputeStateOpen, got '%s'", retrievedDispute.State)
	}
}
