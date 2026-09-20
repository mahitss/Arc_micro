package emergency

import (
	"context"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func TestEmergency_MultiTierPauseAndResume(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctrl := NewController(repo)
	ctx := context.Background()

	// 1. Agent Pause & Resume
	err := ctrl.PauseAgent(ctx, "org_default", "research-agent", "usr_admin")
	if err != nil {
		t.Fatalf("failed to pause agent: %v", err)
	}

	ag, _ := repo.GetAgent(ctx, "research-agent")
	if ag.Status != "PAUSED" {
		t.Fatalf("expected agent status PAUSED, got %s", ag.Status)
	}

	err = ctrl.ResumeAgent(ctx, "org_default", "research-agent", "usr_admin")
	if err != nil {
		t.Fatalf("failed to resume agent: %v", err)
	}

	ag, _ = repo.GetAgent(ctx, "research-agent")
	if ag.Status != "ACTIVE" {
		t.Fatalf("expected agent status ACTIVE, got %s", ag.Status)
	}

	// 2. Organization Pause & Resume
	err = ctrl.PauseOrganization(ctx, "org_default", "usr_admin")
	if err != nil {
		t.Fatalf("failed to pause organization: %v", err)
	}

	org, _ := repo.GetOrganization(ctx, "org_default")
	if org.Status != "PAUSED" {
		t.Fatalf("expected org status PAUSED, got %s", org.Status)
	}

	err = ctrl.ResumeOrganization(ctx, "org_default", "usr_admin")
	if err != nil {
		t.Fatalf("failed to resume organization: %v", err)
	}

	org, _ = repo.GetOrganization(ctx, "org_default")
	if org.Status != "ACTIVE" {
		t.Fatalf("expected org status ACTIVE, got %s", org.Status)
	}

	// 3. Global Execution Kill Switch
	paused, err := ctrl.IsGlobalExecutionPaused(ctx)
	if err != nil {
		t.Fatalf("failed to check global execution status: %v", err)
	}
	if paused {
		t.Fatal("expected initial global execution to be unpaused (ACTIVE)")
	}

	err = ctrl.PauseGlobalExecution(ctx, "usr_superadmin")
	if err != nil {
		t.Fatalf("failed to pause global execution: %v", err)
	}

	paused, err = ctrl.IsGlobalExecutionPaused(ctx)
	if err != nil {
		t.Fatalf("failed to check global execution status: %v", err)
	}
	if !paused {
		t.Fatal("expected global execution to be paused")
	}

	err = ctrl.ResumeGlobalExecution(ctx, "usr_superadmin")
	if err != nil {
		t.Fatalf("failed to resume global execution: %v", err)
	}

	paused, err = ctrl.IsGlobalExecutionPaused(ctx)
	if err != nil {
		t.Fatalf("failed to check global execution status: %v", err)
	}
	if paused {
		t.Fatal("expected global execution to be resumed (ACTIVE)")
	}
}
