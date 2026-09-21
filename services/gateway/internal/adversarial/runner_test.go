package adversarial

import (
	"context"
	"testing"
)

func TestAdversarialLabRunner_AllScenariosPass(t *testing.T) {
	runner := NewLabRunner()
	ctx := context.Background()

	report := runner.RunAll(ctx)

	if report.TotalScenarios != 20 {
		t.Fatalf("expected 20 scenarios, got %d", report.TotalScenarios)
	}

	for _, sc := range report.Scenarios {
		if sc.Status != StatusPass {
			t.Errorf("Scenario %s (%s) failed: %s (actual: %s)", sc.ID, sc.Name, sc.ExpectedBehavior, sc.ActualBehavior)
		}
	}

	if report.PassedScenarios != 20 {
		t.Errorf("expected 20 passed scenarios, got %d", report.PassedScenarios)
	}

	if report.InvariantsTotal != 12 {
		t.Errorf("expected 12 invariants, got %d", report.InvariantsTotal)
	}

	if report.InvariantsVerified != 12 {
		t.Errorf("expected 12 verified invariants, got %d", report.InvariantsVerified)
	}

	for _, inv := range report.Invariants {
		if inv.Status != StatusPass {
			t.Errorf("Invariant %d failed: %s (details: %s)", inv.ID, inv.Description, inv.Details)
		}
	}
}
