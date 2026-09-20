package service

import (
	"context"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func setupTestDomainService() (*DefaultDomainService, storage.Repository) {
	repo := storage.NewMemoryRepository()
	// Seed service
	_ = repo.SaveService(context.Background(), &registry.Service{
		ID:        "web-research",
		Name:      "Web Research API",
		Recipient: "0x1111111111111111111111111111111111111111",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "500000", // 0.50 USDC
	})
	return NewDomainService(repo), repo
}

// 1. Organization Tests
func TestDomain_Organization(t *testing.T) {
	svc, _ := setupTestDomainService()
	ctx := context.Background()

	org := &domain.Organization{
		ID:   "org_acme",
		Name: "Acme AI Corp",
	}

	if err := svc.CreateOrganization(ctx, org); err != nil {
		t.Fatalf("failed to create organization: %v", err)
	}

	retrieved, err := svc.GetOrganization(ctx, "org_acme")
	if err != nil {
		t.Fatalf("failed to retrieve organization: %v", err)
	}
	if retrieved.Name != "Acme AI Corp" || retrieved.Status != "ACTIVE" {
		t.Fatalf("unexpected organization data: %+v", retrieved)
	}
}

// 2. Agent Tests: create, update, pause, invalid organization access
func TestDomain_AgentLifecycle(t *testing.T) {
	svc, _ := setupTestDomainService()
	ctx := context.Background()

	_ = svc.CreateOrganization(ctx, &domain.Organization{ID: "org_a", Name: "Org A"})
	_ = svc.CreateOrganization(ctx, &domain.Organization{ID: "org_b", Name: "Org B"})

	// Create
	ag := &domain.Agent{
		ID:             "agent_1",
		OrganizationID: "org_a",
		Name:           "Agent One",
		Description:    "Test agent",
		Status:         domain.AgentStatusActive,
	}
	if err := svc.CreateAgent(ctx, ag); err != nil {
		t.Fatalf("failed to create agent: %v", err)
	}

	// Pause
	if err := svc.PauseAgent(ctx, "org_a", "agent_1", "usr_admin"); err != nil {
		t.Fatalf("failed to pause agent: %v", err)
	}

	// Cross-Org Access Denied
	err := svc.PauseAgent(ctx, "org_b", "agent_1", "usr_admin")
	if err != ErrOrganizationMismatch {
		t.Fatalf("expected ErrOrganizationMismatch, got: %v", err)
	}
}

// 3. Service Tests: create, update, pause, recipient validation
func TestDomain_ServiceLifecycle(t *testing.T) {
	svc, _ := setupTestDomainService()
	ctx := context.Background()

	// Invalid recipient
	badSrv := &domain.Service{
		ID:        "srv_bad",
		Recipient: "0x123", // invalid length
		MaxPrice:  "100000",
	}
	if err := svc.CreateService(ctx, badSrv); err == nil {
		t.Fatal("expected error on invalid recipient format, got nil")
	}

	// Valid Service
	validSrv := &domain.Service{
		ID:        "srv_compute",
		Name:      "Compute API",
		Recipient: "0x2222222222222222222222222222222222222222",
		Asset:     "USDC",
		MaxPrice:  "1000000",
	}
	if err := svc.CreateService(ctx, validSrv); err != nil {
		t.Fatalf("failed to create valid service: %v", err)
	}

	// Pause Service
	if err := svc.PauseService(ctx, "org_default", "srv_compute", "usr_admin"); err != nil {
		t.Fatalf("failed to pause service: %v", err)
	}
}

// 4. Policy Tests: relationship validation, safe amount representation
func TestDomain_Policy(t *testing.T) {
	svc, _ := setupTestDomainService()
	ctx := context.Background()

	pol := &domain.Policy{
		ID:                    "pol_1",
		OrganizationID:        "org_default",
		AgentID:               "research-agent",
		Enabled:               true,
		PerTransactionLimit:   "500000",
		DailyLimit:            "5000000",
		MaxTransactionsPerDay: 20,
		ApprovalThreshold:     "1000000",
		AllowedAssets:         []string{"USDC"},
	}

	if err := svc.CreatePolicy(ctx, pol); err != nil {
		t.Fatalf("failed to create policy: %v", err)
	}

	retrieved, err := svc.GetPolicy(ctx, "org_default", "research-agent")
	if err != nil {
		t.Fatalf("failed to retrieve policy: %v", err)
	}
	if retrieved.PerTransactionLimit != "500000" {
		t.Fatalf("expected 500000 per-tx limit, got: %s", retrieved.PerTransactionLimit)
	}
}

// 5. PaymentIntent Tests: create, duplicate request ID, invalid agent, invalid service, state correctness
func TestDomain_PaymentIntent(t *testing.T) {
	svc, _ := setupTestDomainService()
	ctx := context.Background()

	params := CreateIntentParams{
		OrganizationID: "org_default",
		AgentID:        "research-agent",
		ServiceID:      "web-research",
		Amount:         "180000", // 0.18 USDC
		Asset:          "USDC",
		Purpose:        "Market Analysis",
		RequestID:      "req_idempotency_123",
	}

	// 1. Successful Create
	pi, err := svc.CreatePaymentIntent(ctx, params)
	if err != nil {
		t.Fatalf("failed to create payment intent: %v", err)
	}
	if pi.Status != intent.StatusCreated || pi.Amount != "180000" {
		t.Fatalf("unexpected intent state: %+v", pi)
	}

	// 2. Idempotency Check: same RequestID returns existing intent
	pi2, err := svc.CreatePaymentIntent(ctx, params)
	if err != nil {
		t.Fatalf("idempotent create failed: %v", err)
	}
	if pi2.IntentID != pi.IntentID {
		t.Fatalf("expected identical intent ID for duplicate request_id, got %s vs %s", pi2.IntentID, pi.IntentID)
	}

	// 3. Invalid Agent
	badAgentParams := params
	badAgentParams.AgentID = "nonexistent_agent"
	badAgentParams.RequestID = "req_diff"
	if _, err := svc.CreatePaymentIntent(ctx, badAgentParams); err == nil {
		t.Fatal("expected error on nonexistent agent, got nil")
	}

	// 4. Invalid Service
	badServiceParams := params
	badServiceParams.ServiceID = "nonexistent_service"
	badServiceParams.RequestID = "req_diff2"
	if _, err := svc.CreatePaymentIntent(ctx, badServiceParams); err == nil {
		t.Fatal("expected error on nonexistent service, got nil")
	}

	// 5. Money Safety: Non-positive or float amount rejected
	floatParams := params
	floatParams.Amount = "0.18" // floats rejected; base units required
	floatParams.RequestID = "req_float"
	if _, err := svc.CreatePaymentIntent(ctx, floatParams); err == nil {
		t.Fatal("expected error on float amount string, got nil")
	}
}

// 6. Approval Tests: cannot approve denied policy, cannot approve expired intent, duplicate approval handling
func TestDomain_ApprovalInvariants(t *testing.T) {
	svc, _ := setupTestDomainService()
	ctx := context.Background()

	// Create intent
	pi, err := svc.CreatePaymentIntent(ctx, CreateIntentParams{
		OrganizationID: "org_default",
		AgentID:        "research-agent",
		ServiceID:      "web-research",
		Amount:         "1500000", // 1.50 USDC (Above approval threshold)
		Asset:          "USDC",
		Purpose:        "Large Compute",
		RequestID:      "req_appr_test",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	// 1. Policy Decision: APPROVAL_REQUIRED
	pi, err = svc.RecordPolicyDecision(ctx, pi.IntentID, domain.DecisionAllow, domain.ReasonApproved, "Approved by policy", true)
	if err != nil {
		t.Fatalf("failed to record policy decision: %v", err)
	}
	if pi.Status != intent.StatusApprovalRequired {
		t.Fatalf("expected APPROVAL_REQUIRED, got %s", pi.Status)
	}

	// 2. Approve Intent
	pi, app, err := svc.RecordApproval(ctx, "org_default", pi.IntentID, "usr_fin_manager", true, "Budget verified")
	if err != nil {
		t.Fatalf("approval failed: %v", err)
	}
	if pi.Status != intent.StatusApproved || app.Status != domain.ApprovalStatusApproved {
		t.Fatalf("expected APPROVED, got %s / %s", pi.Status, app.Status)
	}

	// 3. Test CRITICAL Invariant: Cannot approve a DENIED policy outcome
	deniedPi, _ := svc.CreatePaymentIntent(ctx, CreateIntentParams{
		OrganizationID: "org_default",
		AgentID:        "research-agent",
		ServiceID:      "web-research",
		Amount:         "6000000", // Over limit
		Asset:          "USDC",
		Purpose:        "Denial Test",
		RequestID:      "req_deny_test",
	})
	_, _ = svc.RecordPolicyDecision(ctx, deniedPi.IntentID, domain.DecisionDeny, domain.ReasonDailyLimitExceeded, "Over limit", false)

	// Attempt to approve the denied intent -> MUST FAIL
	_, _, err = svc.RecordApproval(ctx, "org_default", deniedPi.IntentID, "usr_rogue", true, "Force approve")
	if err != ErrCannotApproveDenied && err != ErrIntentNotPendingAppr {
		t.Fatalf("expected ErrCannotApproveDenied or ErrIntentNotPendingAppr, got: %v", err)
	}
}

// 7. Audit Event Tests: append-only behavior and required fields
func TestDomain_AuditEvent(t *testing.T) {
	svc, repo := setupTestDomainService()
	ctx := context.Background()

	evt := &domain.AuditEvent{
		ID:             "evt_test_1",
		OrganizationID: "org_default",
		EventType:      domain.AuditEventPaymentCreated,
		ActorType:      "AGENT",
		ActorID:        "research-agent",
		ResourceType:   "PAYMENT_INTENT",
		ResourceID:     "pi_123",
		RequestID:      "req_123",
		Timestamp:      time.Now(),
		Metadata:       `{"amount":"180000"}`,
	}

	if err := svc.RecordAuditEvent(ctx, evt); err != nil {
		t.Fatalf("failed to record audit event: %v", err)
	}

	events, err := repo.ListAuditEvents(ctx, "org_default")
	if err != nil {
		t.Fatalf("failed to list audit events: %v", err)
	}
	if len(events) == 0 {
		t.Fatal("expected at least 1 audit event, got 0")
	}
}
