package simulation_test

import (
	"context"
	"math/big"
	"strings"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/simulation"
)

// mockPolicyClient implements deterministic policy responses for simulation tests.
type mockPolicyClient struct {
	customDecision domain.Decision
	customReason   domain.ReasonCode
}

func (m *mockPolicyClient) Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	decision := domain.DecisionAllow
	reason := domain.ReasonApproved

	if m.customDecision != "" {
		decision = m.customDecision
		reason = m.customReason
	} else {
		// Default rule: amount > $5.00 (5,000,000 micro-units) requires approval
		amtBig, _ := new(big.Int).SetString(req.Amount, 10)
		if amtBig != nil && amtBig.Cmp(big.NewInt(5_000_000)) > 0 {
			decision = domain.DecisionApprovalRequired
			reason = domain.ReasonApprovalRequired
		}
	}

	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   decision,
		ReasonCode: reason,
		Reason:     string(reason),
		Simulation: true,
	}, nil
}

func (m *mockPolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return m.Simulate(ctx, req)
}

func (m *mockPolicyClient) CheckHealth(ctx context.Context) error {
	return nil
}

func setupTestRig() (*simulation.SimulationEngine, *simulation.SnapshotManager, *simulation.CounterfactualEngine, *simulation.MonteCarloEngine, *simulation.ExecutionGate, *registry.Registry) {
	snapMgr := simulation.NewSnapshotManager()
	mockPolicy := &mockPolicyClient{}
	reg := registry.NewDefaultRegistry()
	engine := simulation.NewSimulationEngine(snapMgr, mockPolicy)
	cfEngine := simulation.NewCounterfactualEngine(engine)
	mcEngine := simulation.NewMonteCarloEngine(engine)
	execGate := simulation.NewExecutionGate(snapMgr, engine)
	return engine, snapMgr, cfEngine, mcEngine, execGate, reg
}

// TestPhase1_6_SimulationEngineLifecycle verifies full lifecycle for single-agent and swarm missions.
func TestPhase1_6_SimulationEngineLifecycle(t *testing.T) {
	engine, _, _, _, _, reg := setupTestRig()
	ctx := context.Background()

	scenario := simulation.SimulationScenario{
		ID:              "scen-test-01",
		OrganizationID:  "org-acme",
		Name:            "AI Market Research Mission",
		Objective:       "Scrape and synthesize AI sector filings",
		Budget:          "5000000", // $5.00
		AgentID:         "research-agent",
		DeadlineSeconds: 600,
	}

	run, err := engine.CreateRun(ctx, scenario, reg)
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	if run.Status != simulation.StatusCreated {
		t.Errorf("expected status %s, got %s", simulation.StatusCreated, run.Status)
	}
	if run.ExecutionMode != simulation.ExecutionModeSimulation {
		t.Errorf("expected execution mode SIMULATION, got %s", run.ExecutionMode)
	}
	if run.Snapshot == nil {
		t.Fatal("expected non-nil digital twin snapshot")
	}

	// Execute simulation run
	executed, err := engine.Run(ctx, run.ID)
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	if executed.Status != simulation.StatusCompleted {
		t.Errorf("expected status COMPLETED, got %s", executed.Status)
	}
	if len(executed.Plan.Steps) == 0 {
		t.Error("expected planned execution steps")
	}
	if len(executed.Trace) == 0 {
		t.Error("expected trace audit events")
	}
	if !executed.Economics.IsProjected {
		t.Error("expected economics to be explicitly marked as PROJECTED")
	}
}

// TestPhase5_FailureInjectionAndRecovery tests deterministic failure injection and replanning.
func TestPhase5_FailureInjectionAndRecovery(t *testing.T) {
	engine, _, _, _, _, reg := setupTestRig()
	ctx := context.Background()

	scenario := simulation.SimulationScenario{
		ID:             "scen-fail-01",
		OrganizationID: "org-acme",
		Name:           "Service Timeout Recovery Mission",
		Objective:      "Query web research with timeout",
		Budget:         "6000000",
		AgentID:        "research-agent",
		FailureProfile: simulation.FailureServiceTimeout,
		InjectedFailures: []simulation.FailureInjection{
			{
				StepID:      "step_research",
				FailureType: simulation.FailureServiceTimeout,
				Reason:      "Simulated downstream gateway 504 gateway timeout",
			},
		},
	}

	run, err := engine.CreateRun(ctx, scenario, reg)
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	executed, err := engine.Run(ctx, run.ID)
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	// Verify that a failure event and a recovery event exist in trace
	hasFailure := false
	hasRecovery := false
	for _, event := range executed.Trace {
		if event.EventType == "simulation.failure_injected" {
			hasFailure = true
		}
		if event.EventType == "simulation.recovery_projected" {
			hasRecovery = true
		}
	}

	if !hasFailure {
		t.Errorf("expected 'simulation.failure_injected' in trace")
	}
	if !hasRecovery {
		t.Errorf("expected 'simulation.recovery_projected' in trace")
	}
}

// TestPhase7_8_ProjectedEconomicsAndWorstCaseExposure verifies budget limits and exposure math.
func TestPhase7_8_ProjectedEconomicsAndWorstCaseExposure(t *testing.T) {
	engine, _, _, _, _, reg := setupTestRig()
	ctx := context.Background()

	scenario := simulation.SimulationScenario{
		ID:             "scen-econ-01",
		OrganizationID: "org-acme",
		Name:           "Budget Exposure Analysis",
		Budget:         "10000000", // $10.00
		AgentID:        "research-agent",
	}

	run, err := engine.CreateRun(ctx, scenario, reg)
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	executed, err := engine.Run(ctx, run.ID)
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	if executed.Economics.ProjectedSpend == "" {
		t.Error("expected non-empty projected spend")
	}
	if executed.Exposure.MaximumExposure == "" {
		t.Error("expected non-empty maximum exposure")
	}
	if executed.Exposure.BudgetCeiling != scenario.Budget {
		t.Errorf("expected budget ceiling %s, got %s", scenario.Budget, executed.Exposure.BudgetCeiling)
	}
}

// TestPhase13_15_CounterfactualEngine verifies perturbation comparison.
func TestPhase13_15_CounterfactualEngine(t *testing.T) {
	engine, _, cfEngine, _, _, reg := setupTestRig()
	ctx := context.Background()

	baselineScenario := simulation.SimulationScenario{
		ID:             "scen-baseline",
		OrganizationID: "org-acme",
		Name:           "Baseline Mission",
		Budget:         "10000000", // $10.00
		AgentID:        "research-agent",
	}

	baseRun, err := engine.CreateRun(ctx, baselineScenario, reg)
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}
	_, err = engine.Run(ctx, baseRun.ID)
	if err != nil {
		t.Fatalf("Run baseline failed: %v", err)
	}

	// Run counterfactual: What happens if service price increases 2x?
	comparison, cfRun, err := cfEngine.RunCounterfactual(ctx, baseRun.ID, simulation.SimulationScenario{
		PriceMultiplier: 2.0,
	}, "What happens if service prices double?")
	if err != nil {
		t.Fatalf("RunCounterfactual failed: %v", err)
	}

	if comparison.BaselineRunID != baseRun.ID {
		t.Errorf("expected baseline ID %s, got %s", baseRun.ID, comparison.BaselineRunID)
	}
	if cfRun.ID == baseRun.ID {
		t.Error("counterfactual run MUST have a distinct ID from baseline")
	}
	if comparison.DeltaSpend == "" {
		t.Error("expected computed delta spend in counterfactual comparison")
	}
}

// TestPhase16_MonteCarloDistribution verifies deterministic seeded N-run statistics.
func TestPhase16_MonteCarloDistribution(t *testing.T) {
	_, _, _, mcEngine, _, _ := setupTestRig()
	ctx := context.Background()

	scenario := simulation.SimulationScenario{
		ID:             "scen-mc",
		OrganizationID: "org-acme",
		Name:           "Monte Carlo Stochastic Test",
		Budget:         "5000000",
		AgentID:        "research-agent",
	}

	summary1, err := mcEngine.RunMonteCarlo(ctx, simulation.MonteCarloRequest{
		Scenario:   scenario,
		BaseSeed:   4242,
		Iterations: 20,
	})
	if err != nil {
		t.Fatalf("RunMonteCarlo 1 failed: %v", err)
	}

	summary2, err := mcEngine.RunMonteCarlo(ctx, simulation.MonteCarloRequest{
		Scenario:   scenario,
		BaseSeed:   4242,
		Iterations: 20,
	})
	if err != nil {
		t.Fatalf("RunMonteCarlo 2 failed: %v", err)
	}

	// Invariant: Deterministic seeding MUST produce exact same statistical output
	if summary1.AverageSpend != summary2.AverageSpend {
		t.Errorf("expected identical average spend for same seed, got %s vs %s", summary1.AverageSpend, summary2.AverageSpend)
	}
	if summary1.CompletionRate != summary2.CompletionRate {
		t.Errorf("expected identical completion rate, got %f vs %f", summary1.CompletionRate, summary2.CompletionRate)
	}
	if !strings.Contains(summary1.ModelNotice, "MODELLED ESTIMATE") {
		t.Errorf("expected 'MODELLED ESTIMATE' notice, got: %s", summary1.ModelNotice)
	}
}

// TestPhase23_24_ExecutePlanAndStaleSimulation verifies staleness detection and safe live preparation.
func TestPhase23_24_ExecutePlanAndStaleSimulation(t *testing.T) {
	engine, snapMgr, _, _, execGate, reg := setupTestRig()
	ctx := context.Background()

	scenario := simulation.SimulationScenario{
		ID:             "scen-exec-gate",
		OrganizationID: "org-acme",
		Name:           "Plan Execution Validation",
		Budget:         "5000000",
		AgentID:        "research-agent",
	}

	run, err := engine.CreateRun(ctx, scenario, reg)
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}
	completedRun, err := engine.Run(ctx, run.ID)
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	// 1. Fresh state: execution preparation succeeds
	freshSnapshot := snapMgr.CaptureSnapshot(ctx, "org-acme", reg, nil)
	// Match versions for baseline test
	completedRun.SnapshotVersion = freshSnapshot.Version
	completedRun.ConfigurationVersion = freshSnapshot.ConfigurationVersion

	payload, err := execGate.PrepareExecutePlan(ctx, completedRun.ID, freshSnapshot)
	if err != nil {
		t.Fatalf("PrepareExecutePlan should succeed on fresh state, got: %v", err)
	}
	if payload.Mode != simulation.ExecutionModeLive {
		t.Errorf("expected transitioned mode to be LIVE, got: %s", payload.Mode)
	}

	// 2. Stale state: Service price increased -> MUST fail with ErrSimulationOutdated
	staleSnapshot := snapMgr.CaptureSnapshot(ctx, "org-acme", reg, nil)
	// Mutate service prices in stale snapshot to higher value and recompute fingerprint
	for _, s := range staleSnapshot.Services {
		s.MaxPrice = "99999999" // price surged
	}
	staleSnapshot.Version = snapMgr.CalculateVersion(staleSnapshot)

	_, staleErr := execGate.PrepareExecutePlan(ctx, completedRun.ID, staleSnapshot)
	if staleErr == nil {
		t.Fatal("expected failure on stale snapshot with price change, but succeeded")
	}
	if !strings.Contains(staleErr.Error(), "SIMULATION OUTDATED") {
		t.Errorf("expected 'SIMULATION OUTDATED' error message, got: %v", staleErr)
	}
}

// TestPhase30_SevenDeterministicDemoScenarios implements all 7 canonical demo scenarios.
func TestPhase30_SevenDeterministicDemoScenarios(t *testing.T) {
	engine, snapMgr, _, _, execGate, reg := setupTestRig()
	ctx := context.Background()

	// SCENARIO 1: NORMAL MISSION ($5.00 budget -> SUCCESS)
	t.Run("Scenario1_NormalMission", func(t *testing.T) {
		run, err := engine.CreateRun(ctx, simulation.SimulationScenario{
			ID: "s1", OrganizationID: "org-demo", Budget: "5000000", AgentID: "research-agent",
		}, reg)
		if err != nil {
			t.Fatal(err)
		}
		res, err := engine.Run(ctx, run.ID)
		if err != nil || res.Status != simulation.StatusCompleted {
			t.Fatalf("expected completed normal mission, got: %s, err: %v", res.Status, err)
		}
	})

	// SCENARIO 2: SERVICE FAILURE (Timeout -> Recovery -> SUCCESS)
	t.Run("Scenario2_ServiceFailureRecovery", func(t *testing.T) {
		run, err := engine.CreateRun(ctx, simulation.SimulationScenario{
			ID: "s2", OrganizationID: "org-demo", Budget: "5000000", AgentID: "research-agent",
			FailureProfile: simulation.FailureServiceTimeout,
		}, reg)
		if err != nil {
			t.Fatal(err)
		}
		res, err := engine.Run(ctx, run.ID)
		if err != nil || res.Status != simulation.StatusCompleted {
			t.Fatalf("expected completed with recovery, got: %s, err: %v", res.Status, err)
		}
	})

	// SCENARIO 3: BUDGET CONSTRAINED ($0.50 budget)
	t.Run("Scenario3_BudgetConstrained", func(t *testing.T) {
		run, err := engine.CreateRun(ctx, simulation.SimulationScenario{
			ID: "s3", OrganizationID: "org-demo", Budget: "500000", AgentID: "research-agent",
		}, reg)
		if err != nil {
			t.Fatal(err)
		}
		res, err := engine.Run(ctx, run.ID)
		if err != nil {
			t.Fatal(err)
		}
		if res.Economics.ProjectedSpend == "" {
			t.Fatal("expected projected spend populated")
		}
	})

	// SCENARIO 4: HIGH RISK (Requires human approval)
	t.Run("Scenario4_HighRiskApproval", func(t *testing.T) {
		run, err := engine.CreateRun(ctx, simulation.SimulationScenario{
			ID: "s4", OrganizationID: "org-demo", Budget: "10000000", AgentID: "research-agent",
			FailureProfile: simulation.FailureHighRisk,
		}, reg)
		if err != nil {
			t.Fatal(err)
		}
		res, err := engine.Run(ctx, run.ID)
		if err != nil {
			t.Fatal(err)
		}
		if res.Economics.ApprovalCount == 0 {
			t.Error("expected approval count > 0 in high risk scenario")
		}
	})

	// SCENARIO 5: POLICY DENY (Simulated policy violation)
	t.Run("Scenario5_PolicyDeny", func(t *testing.T) {
		denyPolicy := &mockPolicyClient{
			customDecision: domain.DecisionDeny,
			customReason:   domain.ReasonDailyLimitExceeded,
		}
		denyEngine := simulation.NewSimulationEngine(snapMgr, denyPolicy)
		run, err := denyEngine.CreateRun(ctx, simulation.SimulationScenario{
			ID: "s5", OrganizationID: "org-demo", Budget: "5000000", AgentID: "research-agent",
		}, reg)
		if err != nil {
			t.Fatal(err)
		}
		res, err := denyEngine.Run(ctx, run.ID)
		if err != nil {
			t.Fatal(err)
		}
		hasDeny := false
		for _, step := range res.Plan.Steps {
			if step.PolicyDecision == "DENY" {
				hasDeny = true
				break
			}
		}
		if !hasDeny {
			t.Error("expected at least one DENY step in policy deny scenario")
		}
	})

	// SCENARIO 6: MULTI-AGENT SWARM (DAG validation & parallel execution)
	t.Run("Scenario6_MultiAgentSwarm", func(t *testing.T) {
		run, err := engine.CreateRun(ctx, simulation.SimulationScenario{
			ID: "s6", OrganizationID: "org-demo", Budget: "20000000", AgentID: "orchestrator",
			IsSwarm: true,
		}, reg)
		if err != nil {
			t.Fatal(err)
		}
		res, err := engine.Run(ctx, run.ID)
		if err != nil || res.Status != simulation.StatusCompleted {
			t.Fatalf("expected swarm completed, got %s, err: %v", res.Status, err)
		}
		if res.SourceType != "SWARM" {
			t.Errorf("expected source type SWARM, got %s", res.SourceType)
		}
	})

	// SCENARIO 7: STALE SIMULATION (Price change invalidates plan)
	t.Run("Scenario7_StaleSimulation", func(t *testing.T) {
		run, err := engine.CreateRun(ctx, simulation.SimulationScenario{
			ID: "s7", OrganizationID: "org-demo", Budget: "5000000", AgentID: "research-agent",
		}, reg)
		if err != nil {
			t.Fatal(err)
		}
		completed, err := engine.Run(ctx, run.ID)
		if err != nil {
			t.Fatal(err)
		}

		currentSnap := snapMgr.CaptureSnapshot(ctx, "org-demo", reg, nil)
		// Change service price after simulation
		for _, s := range currentSnap.Services {
			s.MaxPrice = "999999999"
		}

		_, execErr := execGate.PrepareExecutePlan(ctx, completed.ID, currentSnap)
		if execErr == nil {
			t.Fatal("expected plan execution to be rejected due to stale assumptions")
		}
		if !strings.Contains(execErr.Error(), "SIMULATION OUTDATED") {
			t.Errorf("expected SIMULATION OUTDATED, got: %v", execErr)
		}
	})
}
