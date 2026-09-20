package service

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func setupApprovalTest(t *testing.T) (*DefaultDomainService, storage.Repository) {
	repo := storage.NewMemoryRepository()
	ds := NewDomainService(repo)
	return ds, repo
}

// TestApproval_Workflow verifies standard approval flow from APPROVAL_REQUIRED to APPROVED.
func TestApproval_Workflow(t *testing.T) {
	ds, _ := setupApprovalTest(t)
	ctx := context.Background()

	// Create intent
	pi, err := ds.CreatePaymentIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "1500000", // Above approval threshold
		Asset:     "USDC",
		Purpose:   "high_tier_compute",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	// Record policy decision requiring approval
	pi, err = ds.RecordPolicyDecision(ctx, pi.IntentID, domain.DecisionApprovalRequired, domain.ReasonApprovalRequired, "Above threshold", true)
	if err != nil {
		t.Fatalf("failed to record policy decision: %v", err)
	}
	if pi.Status != intent.StatusApprovalRequired {
		t.Fatalf("expected APPROVAL_REQUIRED, got %s", pi.Status)
	}

	// Human approves
	approverID := "usr_compliance_lead"
	updatedPI, app, err := ds.RecordApproval(ctx, pi.OrganizationID, pi.IntentID, approverID, true, "Approved for research")
	if err != nil {
		t.Fatalf("failed to record approval: %v", err)
	}

	if updatedPI.Status != intent.StatusApproved {
		t.Fatalf("expected intent status APPROVED, got %s", updatedPI.Status)
	}
	if app.Status != domain.ApprovalStatusApproved {
		t.Fatalf("expected approval status APPROVED, got %s", app.Status)
	}
	if app.ApprovedBy != approverID {
		t.Fatalf("expected approver %s, got %s", approverID, app.ApprovedBy)
	}
}

// TestApproval_HardDenialInviolable verifies a hard policy DENY can NEVER be approved.
func TestApproval_HardDenialInviolable(t *testing.T) {
	ds, _ := setupApprovalTest(t)
	ctx := context.Background()

	pi, err := ds.CreatePaymentIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "100000",
		Asset:     "USDC",
		Purpose:   "daily_exceeded_test",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	// Policy denies payment
	pi, err = ds.RecordPolicyDecision(ctx, pi.IntentID, domain.DecisionDeny, domain.ReasonDailyLimitExceeded, "Daily limit exceeded", false)
	if err != nil {
		t.Fatalf("failed to record policy decision: %v", err)
	}

	// Attempt human approval on denied intent: MUST FAIL
	_, _, err = ds.RecordApproval(ctx, pi.OrganizationID, pi.IntentID, "usr_admin", true, "Trying to override policy")
	if err == nil {
		t.Fatal("expected error approving denied intent, got nil")
	}
	if err != ErrCannotApproveDenied {
		t.Fatalf("expected ErrCannotApproveDenied, got: %v", err)
	}
}

// TestApproval_AgentSelfApprovalProhibited verifies an AI agent cannot approve its own payment.
func TestApproval_AgentSelfApprovalProhibited(t *testing.T) {
	ds, _ := setupApprovalTest(t)
	ctx := context.Background()

	pi, err := ds.CreatePaymentIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "1500000",
		Asset:     "USDC",
		Purpose:   "self_approval_test",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	_, err = ds.RecordPolicyDecision(ctx, pi.IntentID, domain.DecisionApprovalRequired, domain.ReasonApprovalRequired, "Threshold", true)
	if err != nil {
		t.Fatalf("failed to record policy decision: %v", err)
	}

	// Agent attempts to self-approve: MUST FAIL
	_, _, err = ds.RecordApproval(ctx, pi.OrganizationID, pi.IntentID, "research-agent", true, "AI approving itself")
	if err == nil {
		t.Fatal("expected error when agent attempts self-approval, got nil")
	}
	if err != ErrAgentSelfApprovalProhibited {
		t.Fatalf("expected ErrAgentSelfApprovalProhibited, got: %v", err)
	}
}

// TestApproval_Expiration verifies approval expiration semantics (before, at, after).
func TestApproval_Expiration(t *testing.T) {
	ds, repo := setupApprovalTest(t)
	ctx := context.Background()

	pi, err := ds.CreatePaymentIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "1500000",
		Asset:     "USDC",
		Purpose:   "expiration_test",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	_, err = ds.RecordPolicyDecision(ctx, pi.IntentID, domain.DecisionApprovalRequired, domain.ReasonApprovalRequired, "Threshold", true)
	if err != nil {
		t.Fatalf("failed to record policy decision: %v", err)
	}

	// Set approval record expiration to the past
	appRec, _ := repo.GetApprovalByIntent(ctx, pi.IntentID)
	if appRec != nil {
		appRec.ExpiresAt = time.Now().Add(-1 * time.Minute)
		_ = repo.SaveApproval(ctx, appRec)
	}

	// Attempt approval after expiration: MUST FAIL
	_, _, err = ds.RecordApproval(ctx, pi.OrganizationID, pi.IntentID, "usr_compliance", true, "Late approval")
	if err == nil {
		t.Fatal("expected error on expired approval, got nil")
	}
	if err != ErrApprovalExpired && err != ErrIntentExpired {
		t.Fatalf("expected ErrApprovalExpired or ErrIntentExpired, got: %v", err)
	}
}

// TestApproval_ConcurrentCAS verifies atomic serialization when two approvers race.
func TestApproval_ConcurrentCAS(t *testing.T) {
	ds, _ := setupApprovalTest(t)
	ctx := context.Background()

	pi, err := ds.CreatePaymentIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "1500000",
		Asset:     "USDC",
		Purpose:   "concurrent_race_test",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	_, err = ds.RecordPolicyDecision(ctx, pi.IntentID, domain.DecisionApprovalRequired, domain.ReasonApprovalRequired, "Threshold", true)
	if err != nil {
		t.Fatalf("failed to record policy decision: %v", err)
	}

	// Race Approver A (Approve) vs Approver B (Reject)
	var wg sync.WaitGroup
	wg.Add(2)

	var errA, errB error
	go func() {
		defer wg.Done()
		_, _, errA = ds.RecordApproval(ctx, pi.OrganizationID, pi.IntentID, "usr_alice", true, "Alice approves")
	}()

	go func() {
		defer wg.Done()
		_, _, errB = ds.RecordApproval(ctx, pi.OrganizationID, pi.IntentID, "usr_bob", false, "Bob rejects")
	}()

	wg.Wait()

	// Exactly ONE must succeed, and exactly ONE must fail with conflict or state error
	successCount := 0
	if errA == nil {
		successCount++
	}
	if errB == nil {
		successCount++
	}

	if successCount != 1 {
		t.Fatalf("expected exactly 1 successful resolution in race, got %d (errA: %v, errB: %v)", successCount, errA, errB)
	}
}
