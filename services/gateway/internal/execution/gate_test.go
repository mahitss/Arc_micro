package execution

import (
	"context"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/emergency"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func setupGateTest(t *testing.T) (*DefaultGate, storage.Repository, emergency.Controller) {
	repo := storage.NewMemoryRepository()
	em := emergency.NewController(repo)
	gate := NewExecutionGate(repo, em, nil)
	return gate, repo, em
}

// TestExecutionGate_SafetyMatrix tests all 10 precedence rules.
func TestExecutionGate_SafetyMatrix(t *testing.T) {
	gate, repo, em := setupGateTest(t)
	ctx := context.Background()
	now := time.Now()

	// 1. Hard Policy DENY can NEVER execute
	deniedPI := &intent.PaymentIntent{
		IntentID:       "pi_gate_denied",
		OrganizationID: "org_default",
		AgentID:        "research-agent",
		ServiceID:      "web-research",
		Amount:         "100000",
		Status:         intent.StatusDenied,
		PolicyDecision: "DENY",
		ExpiresAt:      now.Add(15 * time.Minute),
	}
	_ = repo.SaveIntent(ctx, deniedPI)

	_, err := gate.CheckEligibility(ctx, deniedPI.IntentID)
	if err == nil {
		t.Fatal("expected policy DENY to be blocked by execution gate")
	}

	// 2. Expired Intent cannot execute
	expiredPI := &intent.PaymentIntent{
		IntentID:       "pi_gate_expired",
		OrganizationID: "org_default",
		AgentID:        "research-agent",
		ServiceID:      "web-research",
		Amount:         "100000",
		Status:         intent.StatusAuthorized,
		PolicyDecision: "ALLOW",
		ExpiresAt:      now.Add(-5 * time.Minute),
	}
	_ = repo.SaveIntent(ctx, expiredPI)

	_, err = gate.CheckEligibility(ctx, expiredPI.IntentID)
	if err != ErrIntentExpired {
		t.Fatalf("expected ErrIntentExpired, got: %v", err)
	}

	// 3. Paused Agent blocks execution
	validPI := &intent.PaymentIntent{
		IntentID:       "pi_gate_valid",
		OrganizationID: "org_default",
		AgentID:        "research-agent",
		ServiceID:      "web-research",
		Amount:         "100000",
		Status:         intent.StatusAuthorized,
		PolicyDecision: "ALLOW",
		ExpiresAt:      now.Add(15 * time.Minute),
	}
	_ = repo.SaveIntent(ctx, validPI)

	// Pause agent
	_ = em.PauseAgent(ctx, "org_default", "research-agent", "usr_admin")
	_, err = gate.CheckEligibility(ctx, validPI.IntentID)
	if err == nil {
		t.Fatal("expected paused agent to block execution")
	}
	// Resume agent
	_ = em.ResumeAgent(ctx, "org_default", "research-agent", "usr_admin")

	// 4. Paused Organization blocks execution
	_ = em.PauseOrganization(ctx, "org_default", "usr_admin")
	_, err = gate.CheckEligibility(ctx, validPI.IntentID)
	if err != ErrOrganizationPaused {
		t.Fatalf("expected ErrOrganizationPaused, got: %v", err)
	}
	_ = em.ResumeOrganization(ctx, "org_default", "usr_admin")

	// 5. Global Execution Kill Switch blocks execution
	_ = em.PauseGlobalExecution(ctx, "usr_admin")
	_, err = gate.CheckEligibility(ctx, validPI.IntentID)
	if err != ErrGlobalExecutionPaused {
		t.Fatalf("expected ErrGlobalExecutionPaused, got: %v", err)
	}
	_ = em.ResumeGlobalExecution(ctx, "usr_admin")

	// 6. Approval Required + Missing Approval blocks execution
	approvalPI := &intent.PaymentIntent{
		IntentID:         "pi_gate_need_appr",
		OrganizationID:   "org_default",
		AgentID:          "research-agent",
		ServiceID:        "web-research",
		Amount:           "1500000",
		Status:           intent.StatusApprovalRequired,
		PolicyDecision:   "APPROVAL_REQUIRED",
		RequiresApproval: true,
		ExpiresAt:        now.Add(15 * time.Minute),
	}
	_ = repo.SaveIntent(ctx, approvalPI)

	_, err = gate.CheckEligibility(ctx, approvalPI.IntentID)
	if err == nil {
		t.Fatal("expected missing approval to block execution")
	}

	// 7. Approval by Agent itself is PROHIBITED
	_ = repo.SaveApproval(ctx, &storage.Approval{
		ID:              "appr_test_1",
		OrganizationID:  "org_default",
		PaymentIntentID: approvalPI.IntentID,
		Required:        true,
		Status:          "APPROVED",
		ApprovedBy:      "research-agent", // Self-approval!
		ExpiresAt:       now.Add(1 * time.Hour),
		CreatedAt:       now,
	})

	_, err = gate.CheckEligibility(ctx, approvalPI.IntentID)
	if err != ErrAgentSelfApprovalProhibited {
		t.Fatalf("expected ErrAgentSelfApprovalProhibited, got: %v", err)
	}

	// 8. Human approved payment is ELIGIBLE
	_ = repo.SaveApproval(ctx, &storage.Approval{
		ID:              "appr_test_1",
		OrganizationID:  "org_default",
		PaymentIntentID: approvalPI.IntentID,
		Required:        true,
		Status:          "APPROVED",
		ApprovedBy:      "usr_compliance",
		ExpiresAt:       now.Add(1 * time.Hour),
		CreatedAt:       now,
	})
	approvalPI.Status = intent.StatusApproved
	_ = repo.UpdateIntentStatus(ctx, approvalPI.IntentID, intent.StatusApproved, now)

	eligiblePI, err := gate.CheckEligibility(ctx, approvalPI.IntentID)
	if err != nil {
		t.Fatalf("expected approved payment to be eligible, got: %v", err)
	}
	if eligiblePI.IntentID != approvalPI.IntentID {
		t.Fatalf("expected intent %s, got %s", approvalPI.IntentID, eligiblePI.IntentID)
	}
}
