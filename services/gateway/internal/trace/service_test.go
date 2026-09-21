package trace

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func TestTraceService_GetPaymentTrace_NotFound(t *testing.T) {
	repo := storage.NewMemoryRepository()
	svc := NewService(repo, "5042", "https://explorer.arc.market")

	_, err := svc.GetPaymentTrace(context.Background(), "org_test", "non_existent_intent")
	if !errors.Is(err, ErrTraceNotFound) {
		t.Fatalf("expected ErrTraceNotFound, got %v", err)
	}
}

func TestTraceService_GetPaymentTrace_TenantIsolation(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_org_a",
		OrganizationID: "org_a",
		AgentID:        "agent_01",
		Recipient:      "0x1111111111111111111111111111111111111111",
		Amount:         "1000000",
		Asset:          "USDC",
		Purpose:        "compute",
		Status:         intent.StatusAuthorized,
		CreatedAt:      time.Now().UTC(),
		ExpiresAt:      time.Now().UTC().Add(time.Hour),
		UpdatedAt:      time.Now().UTC(),
	}
	_ = repo.SaveIntent(ctx, pi)

	svc := NewService(repo, "5042", "https://explorer.arc.market")

	// Query with matching org_a: SUCCESS
	trcA, err := svc.GetPaymentTrace(ctx, "org_a", "intent_org_a")
	if err != nil {
		t.Fatalf("expected success for org_a, got %v", err)
	}
	if trcA.PaymentIntentID != "intent_org_a" {
		t.Errorf("expected intent_org_a, got %s", trcA.PaymentIntentID)
	}

	// Query with mismatched org_b: MUST FAIL with ErrTraceNotFound (no cross-tenant leakage)
	_, err = svc.GetPaymentTrace(ctx, "org_b", "intent_org_a")
	if !errors.Is(err, ErrTraceNotFound) {
		t.Fatalf("expected ErrTraceNotFound for org_b querying org_a, got %v", err)
	}
}

func TestTraceService_GetPaymentTrace_Success_AllowConfirmed(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_full_flow",
		OrganizationID: "org_prod",
		AgentID:        "research_agent",
		VaultAddress:   "0x71c678d311516474809e39842c12f44b20a32508",
		Recipient:      "0x2546bcd3279c0b1060285661688744d9f7518777",
		Amount:         "250000", // 0.25 USDC
		Asset:          "USDC",
		ServiceID:      "web-scraper-v1",
		Purpose:        "financial_data_extraction",
		Status:         intent.StatusConfirmed,
		PolicyDecision: "ALLOW",
		PolicyReason:   "APPROVED",
		CreatedAt:      now.Add(-2 * time.Minute),
		ExpiresAt:      now.Add(58 * time.Minute),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, pi)

	// Save Execution Record
	confTime := now.Add(-30 * time.Second)
	_ = repo.SaveExecution(ctx, &intent.PaymentExecutionRecord{
		IntentID:        pi.IntentID,
		TransactionHash: "0x3f5c9e2b8a1d7f4c6e9a0b2d5e8f1a4c7e0b3d6f9a2c5e8b1d4f7a0c3e6b9d2f",
		Status:          string(intent.StatusConfirmed),
		ConfirmedAt:     &confTime,
	})

	// Save Treasury Reservation
	_ = repo.CreateReservation(ctx, &storage.TreasuryReservation{
		ID:             "res_123",
		OrganizationID: pi.OrganizationID,
		VaultAddress:   pi.VaultAddress,
		IntentID:       pi.IntentID,
		Amount:         pi.Amount,
		Status:         string(domain.TreasuryReservationStatusSettled),
		CreatedAt:      now.Add(-90 * time.Second),
		UpdatedAt:      now,
	})

	// Save Correlated Audit Events
	policyMeta := map[string]interface{}{
		"decision":              "ALLOW",
		"reason_code":           "APPROVED",
		"reason":                "Payment satisfies configured policy.",
		"policy_version":        "v1.0.0",
		"risk_level":            "LOW",
		"risk_score":            15,
		"remaining_daily_limit": 4750000,
	}
	policyMetaBytes, _ := json.Marshal(policyMeta)

	_ = repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:              "evt_01_created",
		OrganizationID:  pi.OrganizationID,
		EventType:       string(domain.EventPaymentIntentCreated),
		ActorType:       "AGENT",
		ActorID:         pi.AgentID,
		PaymentIntentID: pi.IntentID,
		Timestamp:       now.Add(-2 * time.Minute),
	})

	_ = repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:              "evt_02_auth",
		OrganizationID:  pi.OrganizationID,
		EventType:       string(domain.EventPaymentIntentAuthorized),
		ActorType:       "SYSTEM",
		ActorID:         "policy-engine",
		PaymentIntentID: pi.IntentID,
		Timestamp:       now.Add(-115 * time.Second),
		Metadata:        string(policyMetaBytes),
	})

	_ = repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:              "evt_03_confirmed",
		OrganizationID:  pi.OrganizationID,
		EventType:       string(domain.EventPaymentIntentConfirmed),
		ActorType:       "SYSTEM",
		ActorID:         "arc-executor",
		PaymentIntentID: pi.IntentID,
		Timestamp:       confTime,
	})

	svc := NewService(repo, "5042", "https://explorer.arc.market")
	trc, err := svc.GetPaymentTrace(ctx, pi.OrganizationID, pi.IntentID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify top-level trace attributes
	if trc.ExecutionMode != domain.ExecutionModeLive {
		t.Errorf("expected LIVE execution mode, got %s", trc.ExecutionMode)
	}
	if trc.Status != "CONFIRMED" {
		t.Errorf("expected CONFIRMED status, got %s", trc.Status)
	}

	// Verify Policy Evidence
	if trc.PolicyEvidence == nil {
		t.Fatal("expected non-nil PolicyEvidence")
	}
	if trc.PolicyEvidence.Decision != domain.DecisionAllow {
		t.Errorf("expected ALLOW, got %s", trc.PolicyEvidence.Decision)
	}
	if trc.PolicyEvidence.PolicyVersion != "v1.0.0" {
		t.Errorf("expected policy version v1.0.0, got %s", trc.PolicyEvidence.PolicyVersion)
	}
	if trc.PolicyEvidence.RiskScore == nil || *trc.PolicyEvidence.RiskScore != 15 {
		t.Errorf("expected risk score 15, got %v", trc.PolicyEvidence.RiskScore)
	}

	// Verify Blockchain Evidence
	if trc.BlockchainEvidence == nil {
		t.Fatal("expected non-nil BlockchainEvidence")
	}
	if trc.BlockchainEvidence.ChainID != "5042" {
		t.Errorf("expected chain ID 5042, got %s", trc.BlockchainEvidence.ChainID)
	}
	if trc.BlockchainEvidence.TransactionHash != "0x3f5c9e2b8a1d7f4c6e9a0b2d5e8f1a4c7e0b3d6f9a2c5e8b1d4f7a0c3e6b9d2f" {
		t.Errorf("unexpected tx hash: %s", trc.BlockchainEvidence.TransactionHash)
	}
	if trc.BlockchainEvidence.ExplorerURL != "https://explorer.arc.market/tx/0x3f5c9e2b8a1d7f4c6e9a0b2d5e8f1a4c7e0b3d6f9a2c5e8b1d4f7a0c3e6b9d2f" {
		t.Errorf("unexpected explorer URL: %s", trc.BlockchainEvidence.ExplorerURL)
	}

	// Verify Monotonic Sequence Numbers
	if len(trc.Steps) == 0 {
		t.Fatal("expected steps in trace, got empty slice")
	}
	for i, step := range trc.Steps {
		expectedStepNum := i + 1
		if step.StepNumber != expectedStepNum {
			t.Errorf("expected step number %d, got %d for step type %s", expectedStepNum, step.StepNumber, step.Type)
		}
	}
}

func TestTraceService_GetPaymentTrace_Simulation(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_sim_01",
		OrganizationID: "org_test",
		AgentID:        "sim_agent",
		VaultAddress:   "0x0000000000000000000000000000000000000000",
		Recipient:      "0x2546bcd3279c0b1060285661688744d9f7518777",
		Amount:         "100000",
		Asset:          "USDC",
		Purpose:        "simulation_dry_run",
		Status:         intent.StatusAuthorized,
		CreatedAt:      time.Now().UTC(),
		ExpiresAt:      time.Now().UTC().Add(time.Hour),
		UpdatedAt:      time.Now().UTC(),
	}
	_ = repo.SaveIntent(ctx, pi)

	svc := NewService(repo, "5042", "https://explorer.arc.market")
	trc, err := svc.GetPaymentTrace(ctx, pi.OrganizationID, pi.IntentID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if trc.ExecutionMode != domain.ExecutionModeSimulation {
		t.Errorf("expected SIMULATION mode, got %s", trc.ExecutionMode)
	}
	// Simulated transactions must have zero live transaction hash
	if trc.BlockchainEvidence != nil && trc.BlockchainEvidence.TransactionHash != "" {
		t.Errorf("simulated transaction should not have on-chain transaction hash")
	}
}

func TestTraceService_GetPaymentTrace_Ambiguous(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_ambiguous",
		OrganizationID: "org_test",
		AgentID:        "agent_ambiguous",
		VaultAddress:   "0x71c678d311516474809e39842c12f44b20a32508",
		Recipient:      "0x2546bcd3279c0b1060285661688744d9f7518777",
		Amount:         "500000",
		Asset:          "USDC",
		Purpose:        "compute_batch",
		Status:         intent.StatusSubmitted,
		CreatedAt:      now.Add(-5 * time.Minute),
		ExpiresAt:      now.Add(55 * time.Minute),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, pi)

	_ = repo.SaveExecution(ctx, &intent.PaymentExecutionRecord{
		IntentID:        pi.IntentID,
		TransactionHash: "0xdeadbeef00000000000000000000000000000000000000000000000000000001",
		Status:          string(blockchain.StateAmbiguous),
		ErrorCode:       "receipt timeout; flagged for reconciliation",
	})

	_ = repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:              "evt_ambiguous",
		OrganizationID:  pi.OrganizationID,
		EventType:       string(domain.EventPaymentIntentAmbiguous),
		ActorType:       "SYSTEM",
		ActorID:         "arc-executor",
		PaymentIntentID: pi.IntentID,
		Timestamp:       now,
	})

	svc := NewService(repo, "5042", "https://explorer.arc.market")
	trc, err := svc.GetPaymentTrace(ctx, pi.OrganizationID, pi.IntentID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if trc.BlockchainEvidence == nil {
		t.Fatal("expected BlockchainEvidence")
	}
	if trc.BlockchainEvidence.Status != string(blockchain.StateAmbiguous) {
		t.Errorf("expected AMBIGUOUS status, got %s", trc.BlockchainEvidence.Status)
	}

	// Must never turn AMBIGUOUS into FAILED simply due to timeout
	if trc.Status == string(intent.StatusFailed) {
		t.Errorf("ambiguous transaction must not be marked as FAILED")
	}
}

func TestTraceService_ZeroSecretLeakage(t *testing.T) {
	meta := map[string]interface{}{
		"amount":          "1000",
		"private_key":     "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
		"secret_token":    "my-super-secret-key",
		"password":        "admin123",
		"authorization":   "Bearer sensitive_token",
		"service_id":      "compute-service",
		"signer_key":      "kms_key_blob",
	}

	sanitizeMetadata(meta)

	// Assert sensitive keys were deleted
	if _, exists := meta["private_key"]; exists {
		t.Errorf("private_key was not sanitized")
	}
	if _, exists := meta["secret_token"]; exists {
		t.Errorf("secret_token was not sanitized")
	}
	if _, exists := meta["password"]; exists {
		t.Errorf("password was not sanitized")
	}
	if _, exists := meta["authorization"]; exists {
		t.Errorf("authorization was not sanitized")
	}
	if _, exists := meta["signer_key"]; exists {
		t.Errorf("signer_key was not sanitized")
	}

	// Non-sensitive keys remain intact
	if meta["amount"] != "1000" {
		t.Errorf("amount was improperly modified")
	}
	if meta["service_id"] != "compute-service" {
		t.Errorf("service_id was improperly modified")
	}
}
