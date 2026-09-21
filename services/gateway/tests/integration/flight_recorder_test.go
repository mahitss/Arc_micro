package integration

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/service"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/trace"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/webhook"
)

// 1. Cross-Organization Isolation
func TestFlightRecorder_CrossOrgAccessDenied(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_org_alpha",
		OrganizationID: "org_alpha",
		AgentID:        "agent_alpha",
		Recipient:      "0x1111111111111111111111111111111111111111",
		Amount:         "100000",
		Asset:          "USDC",
		Purpose:        "compute",
		Status:         intent.StatusAuthorized,
		CreatedAt:      time.Now().UTC(),
		ExpiresAt:      time.Now().UTC().Add(time.Hour),
		UpdatedAt:      time.Now().UTC(),
	}
	_ = repo.SaveIntent(ctx, pi)

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")

	// Org Beta queries Org Alpha's trace -> MUST be denied with ErrTraceNotFound
	_, err := traceSvc.GetPaymentTrace(ctx, "org_beta", "intent_org_alpha")
	if !errors.Is(err, trace.ErrTraceNotFound) {
		t.Fatalf("expected ErrTraceNotFound for cross-org access, got %v", err)
	}
}

// 2. Append-Only Immutability
func TestFlightRecorder_AppendOnlyImmutability(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_immutable_01",
		OrganizationID: "org_default",
		AgentID:        "audit_agent",
		Recipient:      "0x1111111111111111111111111111111111111111",
		Amount:         "50000",
		Asset:          "USDC",
		Purpose:        "audit_test",
		Status:         intent.StatusAuthorized,
		CreatedAt:      now,
		ExpiresAt:      now.Add(time.Hour),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, pi)

	// Step 1: Save created event
	evt1 := &storage.AuditEvent{
		ID:              "evt_001",
		OrganizationID:  pi.OrganizationID,
		EventType:       string(domain.EventPaymentIntentCreated),
		ActorType:       "AGENT",
		ActorID:         pi.AgentID,
		PaymentIntentID: pi.IntentID,
		Timestamp:       now,
		Metadata:        `{"step":"initial_request"}`,
	}
	if err := repo.SaveAuditEvent(ctx, evt1); err != nil {
		t.Fatalf("failed to save audit event: %v", err)
	}

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")
	trc1, err := traceSvc.GetPaymentTrace(ctx, pi.OrganizationID, pi.IntentID)
	if err != nil {
		t.Fatalf("failed to get trace: %v", err)
	}
	initialStepCount := len(trc1.Steps)

	// Step 2: Append subsequent event
	evt2 := &storage.AuditEvent{
		ID:              "evt_002",
		OrganizationID:  pi.OrganizationID,
		EventType:       string(domain.EventPaymentIntentAuthorized),
		ActorType:       "SYSTEM",
		ActorID:         "policy-engine",
		PaymentIntentID: pi.IntentID,
		Timestamp:       now.Add(time.Second),
		Metadata:        `{"step":"policy_authorized"}`,
	}
	if err := repo.SaveAuditEvent(ctx, evt2); err != nil {
		t.Fatalf("failed to save second audit event: %v", err)
	}

	trc2, err := traceSvc.GetPaymentTrace(ctx, pi.OrganizationID, pi.IntentID)
	if err != nil {
		t.Fatalf("failed to get updated trace: %v", err)
	}

	// Historical event preserved; step count incremented
	if len(trc2.Steps) != initialStepCount+1 {
		t.Errorf("expected step count to increase by 1, was %d, now %d", initialStepCount, len(trc2.Steps))
	}
	if trc2.Steps[0].StepID != trc1.Steps[0].StepID {
		t.Errorf("initial step was mutated: expected %s, got %s", trc1.Steps[0].StepID, trc2.Steps[0].StepID)
	}
}

// 3. Idempotent Replay
func TestFlightRecorder_IdempotentReplay(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()

	intentSvc := intent.NewService(repo, nil, nil, nil, nil, time.Hour, false)
	params := intent.CreateIntentParams{
		OrganizationID: "org_default",
		AgentID:        "agent_replay",
		VaultAddress:   "0x1111111111111111111111111111111111111111",
		ServiceID:      "web-research",
		Amount:         "10000",
		Asset:          "USDC",
		Purpose:        "scrape",
		RequestID:      "idempotency_key_xyz_001",
	}

	// First call
	pi1, err := intentSvc.CreateIntent(ctx, params)
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	// Replay with identical idempotency key
	pi2, err := intentSvc.CreateIntent(ctx, params)
	if err != nil {
		t.Fatalf("failed to handle idempotent intent: %v", err)
	}

	// Must return exact same intent
	if pi1.IntentID != pi2.IntentID {
		t.Errorf("expected same intent ID, got %s vs %s", pi1.IntentID, pi2.IntentID)
	}

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")
	trc, err := traceSvc.GetPaymentTrace(ctx, "org_default", pi1.IntentID)
	if err != nil {
		t.Fatalf("failed to get trace: %v", err)
	}
	if trc.PaymentSummary.RequestID != "idempotency_key_xyz_001" {
		t.Errorf("expected idempotency key in trace summary, got %s", trc.PaymentSummary.RequestID)
	}
}

// 4. Hard DENY Inviolability
func TestFlightRecorder_HardDeny_Inviolable(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_denied_01",
		OrganizationID: "org_default",
		AgentID:        "agent_denied",
		Recipient:      "0xdead000000000000000000000000000000000000",
		Amount:         "9999999999",
		Asset:          "USDC",
		Purpose:        "unauthorized_transfer",
		Status:         intent.StatusDenied,
		PolicyDecision: "DENY",
		PolicyReason:   "AMOUNT_EXCEEDS_TRANSACTION_LIMIT",
		CreatedAt:      now,
		ExpiresAt:      now.Add(time.Hour),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, pi)

	ds := service.NewDomainService(repo)

	// Attempting to approve a hard DENY must return ErrCannotApproveDenied
	_, _, err := ds.RecordApproval(ctx, pi.OrganizationID, pi.IntentID, "usr_admin", true, "Attempting override")
	if !errors.Is(err, service.ErrCannotApproveDenied) {
		t.Fatalf("expected ErrCannotApproveDenied, got %v", err)
	}

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")
	trc, err := traceSvc.GetPaymentTrace(ctx, pi.OrganizationID, pi.IntentID)
	if err != nil {
		t.Fatalf("failed to retrieve trace: %v", err)
	}

	if trc.Status != "DENIED" {
		t.Errorf("expected trace status DENIED, got %s", trc.Status)
	}
	if trc.PolicyEvidence.Decision != domain.DecisionDeny {
		t.Errorf("expected policy evidence decision DENY, got %s", trc.PolicyEvidence.Decision)
	}
}

// 5. Agent Self-Approval Defense
func TestFlightRecorder_AgentSelfApprovalProhibited(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	pi := &intent.PaymentIntent{
		IntentID:         "intent_appr_self",
		OrganizationID:   "org_default",
		AgentID:          "ai_agent_rogue",
		Recipient:        "0x1111111111111111111111111111111111111111",
		Amount:           "500000",
		Asset:            "USDC",
		Purpose:          "self_upgrade",
		Status:           intent.StatusApprovalRequired,
		PolicyDecision:   "APPROVAL_REQUIRED",
		PolicyReason:     "ABOVE_APPROVAL_THRESHOLD",
		RequiresApproval: true,
		CreatedAt:        now,
		ExpiresAt:        now.Add(time.Hour),
		UpdatedAt:        now,
	}
	_ = repo.SaveIntent(ctx, pi)

	ds := service.NewDomainService(repo)

	// The agent attempts to approve its own payment
	_, _, err := ds.RecordApproval(ctx, pi.OrganizationID, pi.IntentID, "ai_agent_rogue", true, "I approve my own transfer")
	if !errors.Is(err, service.ErrAgentSelfApprovalProhibited) {
		t.Fatalf("expected ErrAgentSelfApprovalProhibited, got %v", err)
	}
}

// 6. Simulation vs Live Separation
func TestFlightRecorder_SimulationVsLive_Separation(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	piLive := &intent.PaymentIntent{
		IntentID:       "intent_live",
		OrganizationID: "org_default",
		AgentID:        "live_agent",
		VaultAddress:   "0x71c678d311516474809e39842c12f44b20a32508",
		Recipient:      "0x2546bcd3279c0b1060285661688744d9f7518777",
		Amount:         "100000",
		Asset:          "USDC",
		Purpose:        "live_settlement",
		Status:         intent.StatusConfirmed,
		CreatedAt:      now,
		ExpiresAt:      now.Add(time.Hour),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, piLive)
	_ = repo.SaveExecution(ctx, &intent.PaymentExecutionRecord{
		IntentID:        piLive.IntentID,
		TransactionHash: "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc",
		Status:          string(intent.StatusConfirmed),
	})

	piSim := &intent.PaymentIntent{
		IntentID:       "intent_sim",
		OrganizationID: "org_default",
		AgentID:        "sim_agent",
		VaultAddress:   "0x0000000000000000000000000000000000000000",
		Recipient:      "0x2546bcd3279c0b1060285661688744d9f7518777",
		Amount:         "100000",
		Asset:          "USDC",
		Purpose:        "simulation_dry_run",
		Status:         intent.StatusAuthorized,
		CreatedAt:      now,
		ExpiresAt:      now.Add(time.Hour),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, piSim)

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")

	trcLive, _ := traceSvc.GetPaymentTrace(ctx, "org_default", piLive.IntentID)
	if trcLive.ExecutionMode != domain.ExecutionModeLive {
		t.Errorf("expected LIVE mode, got %s", trcLive.ExecutionMode)
	}
	if trcLive.BlockchainEvidence == nil || trcLive.BlockchainEvidence.TransactionHash == "" {
		t.Errorf("live trace must have transaction hash")
	}

	trcSim, _ := traceSvc.GetPaymentTrace(ctx, "org_default", piSim.IntentID)
	if trcSim.ExecutionMode != domain.ExecutionModeSimulation {
		t.Errorf("expected SIMULATION mode, got %s", trcSim.ExecutionMode)
	}
	if trcSim.BlockchainEvidence != nil && trcSim.BlockchainEvidence.TransactionHash != "" {
		t.Errorf("simulated trace must NOT have transaction hash")
	}
}

// 7. Ambiguous Transaction State
func TestFlightRecorder_AmbiguousTransaction_ReceiptTimeout(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_timeout_ambiguous",
		OrganizationID: "org_default",
		AgentID:        "agent_tx",
		Recipient:      "0x2546bcd3279c0b1060285661688744d9f7518777",
		Amount:         "250000",
		Asset:          "USDC",
		Purpose:        "api_compute",
		Status:         intent.StatusSubmitted,
		CreatedAt:      now,
		ExpiresAt:      now.Add(time.Hour),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, pi)

	_ = repo.SaveExecution(ctx, &intent.PaymentExecutionRecord{
		IntentID:        pi.IntentID,
		TransactionHash: "0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000",
		Status:          string(blockchain.StateAmbiguous),
		ErrorCode:       "receipt timeout: awaiting reconciliation",
	})

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")
	trc, err := traceSvc.GetPaymentTrace(ctx, "org_default", pi.IntentID)
	if err != nil {
		t.Fatalf("failed to get trace: %v", err)
	}

	// Must preserve AMBIGUOUS; must not turn into FAILED
	if trc.BlockchainEvidence.Status != string(blockchain.StateAmbiguous) {
		t.Errorf("expected AMBIGUOUS blockchain status, got %s", trc.BlockchainEvidence.Status)
	}
	if trc.Status == string(intent.StatusFailed) {
		t.Errorf("ambiguous transaction must not be marked as FAILED")
	}
}

// 8. Zero Secret Leakage in Traces
func TestFlightRecorder_ZeroSecretLeakage(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_leak_check",
		OrganizationID: "org_default",
		AgentID:        "agent_leak",
		Recipient:      "0x2546bcd3279c0b1060285661688744d9f7518777",
		Amount:         "1000",
		Asset:          "USDC",
		Purpose:        "check",
		Status:         intent.StatusAuthorized,
		CreatedAt:      now,
		ExpiresAt:      now.Add(time.Hour),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, pi)

	// Inject metadata with sensitive keys into audit event
	_ = repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:              "evt_leak_check",
		OrganizationID:  pi.OrganizationID,
		EventType:       string(domain.EventPaymentIntentAuthorized),
		PaymentIntentID: pi.IntentID,
		Timestamp:       now,
		Metadata:        `{"private_key":"0xsecretkey123","authorization":"Bearer secret","safe_field":"ok"}`,
	})

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")
	trc, err := traceSvc.GetPaymentTrace(ctx, "org_default", pi.IntentID)
	if err != nil {
		t.Fatalf("failed to get trace: %v", err)
	}

	for _, step := range trc.Steps {
		for k := range step.Metadata {
			lowerK := strings.ToLower(k)
			if strings.Contains(lowerK, "private_key") || strings.Contains(lowerK, "authorization") {
				t.Fatalf("sensitive key %s leaked in trace step!", k)
			}
		}
	}
}

// 9. Webhook Failure Does Not Corrupt Financial Trace
func TestFlightRecorder_WebhookFailure_Independent(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	pi := &intent.PaymentIntent{
		IntentID:       "intent_webhook_fail",
		OrganizationID: "org_default",
		AgentID:        "webhook_agent",
		Recipient:      "0x2546bcd3279c0b1060285661688744d9f7518777",
		Amount:         "100000",
		Asset:          "USDC",
		Purpose:        "webhook_test",
		Status:         intent.StatusConfirmed,
		CreatedAt:      now,
		ExpiresAt:      now.Add(time.Hour),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, pi)

	// Record failed webhook delivery in storage
	errMsg := "connection refused"
	_ = repo.SaveWebhookDelivery(ctx, &webhook.WebhookDelivery{
		ID:             "del_failed_01",
		OrganizationID: pi.OrganizationID,
		EndpointID:     "ep_broken",
		EventID:        "evt_confirmed",
		EventType:      string(domain.EventPaymentIntentConfirmed),
		Status:         webhook.DeliveryStatusFailed,
		ErrorMessage:   &errMsg,
		AttemptCount:   5,
		MaxAttempts:    5,
		CreatedAt:      now,
	})

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")
	trc, err := traceSvc.GetPaymentTrace(ctx, "org_default", pi.IntentID)
	if err != nil {
		t.Fatalf("failed to get trace: %v", err)
	}

	// Financial state remains CONFIRMED regardless of webhook delivery failure
	if trc.Status != "CONFIRMED" {
		t.Errorf("webhook failure corrupted payment status: expected CONFIRMED, got %s", trc.Status)
	}
}

// 10. Treasury Failure Injection
func TestFlightRecorder_FailureInjection_TreasuryFailure(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()
	now := time.Now().UTC()

	// Intent where treasury funds could not be reserved (e.g. vault cap reached)
	pi := &intent.PaymentIntent{
		IntentID:       "intent_treasury_fail",
		OrganizationID: "org_default",
		AgentID:        "treasury_fail_agent",
		Recipient:      "0x2546bcd3279c0b1060285661688744d9f7518777",
		Amount:         "100000000",
		Asset:          "USDC",
		Purpose:        "exorbitant_spend",
		Status:         intent.StatusFailed,
		CreatedAt:      now,
		ExpiresAt:      now.Add(time.Hour),
		UpdatedAt:      now,
	}
	_ = repo.SaveIntent(ctx, pi)

	// Record treasury released / failed event
	_ = repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:              "evt_treasury_release",
		OrganizationID:  pi.OrganizationID,
		EventType:       string(domain.EventTreasuryReleased),
		PaymentIntentID: pi.IntentID,
		Timestamp:       now,
		Metadata:        `{"reason":"insufficient_funds"}`,
	})

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")
	trc, err := traceSvc.GetPaymentTrace(ctx, "org_default", pi.IntentID)
	if err != nil {
		t.Fatalf("failed to get trace: %v", err)
	}

	if trc.Status != "FAILED" {
		t.Errorf("expected FAILED status, got %s", trc.Status)
	}
}
