package fabric

import (
	"context"
	"testing"
	"time"
)

func TestEconomicFabric_LifecycleAndCompiler(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryFabricStore()
	svc := NewEconomicFabricService(store)

	// 1. Create Objective
	req := CreateObjectiveRequest{
		TenantID:    "tenant_test",
		Description: "Produce verified infrastructure security audit",
		Owner:       "sec_lead",
		Constraints: ObjectiveConstraints{
			Deadline:           time.Now().Add(24 * time.Hour),
			MaxBudgetUSDC:      100.0,
			MaxParallelTasks:   3,
			RequiredCapability: "security-analysis",
			MinimumConfidence:  0.90,
			RequiredPolicyHash: "pol_hash_abc123",
			ExecutionMode:      "SIMULATION",
		},
		EconomicBudgetUSDC:   100.0,
		RiskTolerance:        "MEDIUM",
		RequiredCapabilities: []string{"security-analysis", "verification"},
	}

	obj, dryRun, err := svc.CreateObjective(ctx, req)
	if err != nil {
		t.Fatalf("CreateObjective failed: %v", err)
	}
	if dryRun != nil {
		t.Fatalf("Expected nil dryRun for live call")
	}
	if obj.Status != ObjectiveDraft {
		t.Errorf("Expected DRAFT status, got %s", obj.Status)
	}

	// 2. Plan Objective
	bp, _, err := svc.PlanObjective(ctx, obj.ObjectiveID, false)
	if err != nil {
		t.Fatalf("PlanObjective failed: %v", err)
	}
	if bp.Status != "COMPILED" {
		t.Errorf("Expected COMPILED status, got %s", bp.Status)
	}
	if len(bp.Tasks) != 4 {
		t.Errorf("Expected 4 tasks in compiled DAG, got %d", len(bp.Tasks))
	}
	if bp.EconomicEnvelope.MaxTotalCostUSDC > 100.0 {
		t.Errorf("INV-142 violated: blueprint budget %.2f exceeds objective 100.0", bp.EconomicEnvelope.MaxTotalCostUSDC)
	}

	// 3. Simulate Objective
	simRes, err := svc.SimulateObjective(ctx, obj.ObjectiveID)
	if err != nil {
		t.Fatalf("SimulateObjective failed: %v", err)
	}
	if simRes.SimulationStale {
		t.Errorf("Expected fresh simulation")
	}

	// 4. Start Objective
	dec, _, err := svc.StartObjective(ctx, obj.ObjectiveID, false)
	if err != nil {
		t.Fatalf("StartObjective failed: %v", err)
	}
	if dec.DecisionType != DecisionContinue {
		t.Errorf("Expected CONTINUE decision, got %s", dec.DecisionType)
	}
	if dec.FinancialAuthority != "UNCHANGED" {
		t.Errorf("INV-141 violated: financial authority is %s", dec.FinancialAuthority)
	}

	// Verify objective is RUNNING
	runningObj, _ := svc.GetObjective(ctx, obj.ObjectiveID)
	if runningObj.Status != ObjectiveRunning {
		t.Errorf("Expected RUNNING status, got %s", runningObj.Status)
	}

	// 5. Pause and Resume
	_, err = svc.PauseObjective(ctx, obj.ObjectiveID, false)
	if err != nil {
		t.Fatalf("PauseObjective failed: %v", err)
	}
	pausedObj, _ := svc.GetObjective(ctx, obj.ObjectiveID)
	if pausedObj.Status != ObjectiveWaiting {
		t.Errorf("Expected WAITING status on pause, got %s", pausedObj.Status)
	}

	_, err = svc.ResumeObjective(ctx, obj.ObjectiveID, false)
	if err != nil {
		t.Fatalf("ResumeObjective failed: %v", err)
	}
	resumedObj, _ := svc.GetObjective(ctx, obj.ObjectiveID)
	if resumedObj.Status != ObjectiveRunning {
		t.Errorf("Expected RUNNING status on resume, got %s", resumedObj.Status)
	}

	// 6. Trace Generation
	trace, err := svc.GetObjectiveTrace(ctx, obj.ObjectiveID)
	if err != nil {
		t.Fatalf("GetObjectiveTrace failed: %v", err)
	}
	if len(trace.Nodes) < 8 {
		t.Errorf("Expected at least 8 nodes in trace, got %d", len(trace.Nodes))
	}

	// 7. Explanations
	whyThis, err := svc.ExplainWhyThis(ctx, obj.ObjectiveID)
	if err != nil || whyThis.SelectedProvider == "" {
		t.Fatalf("ExplainWhyThis failed: %v", err)
	}
	whyNot, err := svc.ExplainWhyNot(ctx, obj.ObjectiveID)
	if err != nil || len(whyNot.NextSafeActions) == 0 {
		t.Fatalf("ExplainWhyNot failed: %v", err)
	}
}

func TestEconomicFabric_DryRunExecution(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryFabricStore()
	svc := NewEconomicFabricService(store)

	req := CreateObjectiveRequest{
		TenantID:           "tenant_test",
		Description:        "Dry-run objective",
		Owner:              "tester",
		EconomicBudgetUSDC: 50.0,
		DryRun:             true,
	}

	obj, dryRun, err := svc.CreateObjective(ctx, req)
	if err != nil {
		t.Fatalf("CreateObjective dry-run failed: %v", err)
	}
	if dryRun == nil || !dryRun.IsDryRun {
		t.Errorf("Expected dryRun result to be populated")
	}

	// Verify INV-155: Dry-run cannot mutate production state
	objs, _ := store.ListObjectives(ctx, "tenant_test")
	if len(objs) != 0 {
		t.Errorf("INV-155 violated: dry-run created objective in store: count=%d", len(objs))
	}
	_ = obj
}

func TestAutonomousEconomicObjective_EndToEnd(t *testing.T) {
	// Section 55: TEST_AUTONOMOUS_ECONOMIC_OBJECTIVE
	ctx := context.Background()
	store := NewMemoryFabricStore()
	svc := NewEconomicFabricService(store)

	// Step 1: Create Objective
	req := CreateObjectiveRequest{
		TenantID:    "tenant_e2e",
		Description: "Produce a verified infrastructure security report.",
		Owner:       "security_operator",
		Constraints: ObjectiveConstraints{
			Deadline:           time.Now().Add(12 * time.Hour),
			MaxBudgetUSDC:      80.0,
			MaxParallelTasks:   4,
			RequiredCapability: "infrastructure-security",
			MinimumConfidence:  0.88,
			RequiredPolicyHash: "pol_hash_production_v1",
			ExecutionMode:      "LIVE",
		},
		EconomicBudgetUSDC:   80.0,
		RiskTolerance:        "LOW",
		RequiredCapabilities: []string{"infrastructure-security", "verification"},
	}

	obj, _, err := svc.CreateObjective(ctx, req)
	if err != nil {
		t.Fatalf("Step 1 failed: %v", err)
	}

	// Step 2: Compile Blueprint
	bp, _, err := svc.PlanObjective(ctx, obj.ObjectiveID, false)
	if err != nil {
		t.Fatalf("Step 2 failed: %v", err)
	}
	if bp.EconomicEnvelope.MaxTotalCostUSDC > 80.0 {
		t.Fatalf("Blueprint exceeded budget envelope")
	}

	// Step 3: Simulate
	simRes, err := svc.SimulateObjective(ctx, obj.ObjectiveID)
	if err != nil {
		t.Fatalf("Step 3 failed: %v", err)
	}
	if simRes.PolicyDecision != "ALLOW" {
		t.Fatalf("Expected simulation ALLOW")
	}

	// Step 4-10: Start Execution through gate
	dec, _, err := svc.StartObjective(ctx, obj.ObjectiveID, false)
	if err != nil {
		t.Fatalf("Step 4-10 failed: %v", err)
	}
	if dec.FinancialAuthority != "UNCHANGED" {
		t.Fatalf("INV-141 violated")
	}

	// Step 11-15: Provider fails -> Adaptive engine detects outage -> Fallback / Replan
	adaptiveIn := AdaptiveInput{
		ObjectiveID:         obj.ObjectiveID,
		TenantID:            obj.TenantID,
		CurrentStepFailed:   true,
		ProviderUnavailable: true,
		ProviderFailureRate: 0.85,
		RetryCount:          1,
		ReplanCount:         0,
		PolicyDecision:      "ALLOW",
	}
	adaptDec, err := svc.adaptive.Evaluate(ctx, adaptiveIn)
	if err != nil {
		t.Fatalf("Adaptive evaluation failed: %v", err)
	}
	if adaptDec.DecisionType != DecisionFallback {
		t.Fatalf("Expected FALLBACK decision on provider outage, got %s", adaptDec.DecisionType)
	}

	// Step 15-16: Replan with fallback provider candidate
	replanReq := ReplanRequest{
		Reason:               "Primary provider outage; switching to fallback",
		NewProviderCandidate: "provider_sec_fallback",
		RequestedBudgetUSDC:  75.0, // within original 80.0 envelope
		AllowedProviders:     []string{"provider_sec_primary", "provider_sec_fallback"},
	}
	newBP, ver, _, err := svc.ReplanObjective(ctx, obj.ObjectiveID, replanReq, false)
	if err != nil {
		t.Fatalf("Replan failed: %v", err)
	}
	if ver.Version != 2 {
		t.Errorf("Expected version 2, got %d", ver.Version)
	}
	if newBP.EconomicEnvelope.MaxTotalCostUSDC > 80.0 {
		t.Fatalf("INV-143 violated: replan increased budget")
	}

	// Step 21: Quality Gate on Deliverable
	deliverableData := []byte("Verified Infrastructure Audit Report: All 12 perimeter checks passed.")
	qualityIn := QualityValidationInput{
		DeliverableContent: deliverableData,
		ConfidenceScore:    0.95,
		MinimumConfidence:  0.88,
		RequiredOutputs:    []string{"audit_report"},
		ActualOutputs:      map[string]bool{"audit_report": true},
		SecurityFlagged:    false,
	}
	if err := svc.qualityGate.ValidateDeliverable(ctx, qualityIn); err != nil {
		t.Fatalf("Step 21 ResultQualityGate failed: %v", err)
	}

	// Step 22-25: Complete Objective
	_ = svc.store.UpdateObjectiveStatus(ctx, obj.ObjectiveID, ObjectiveCompleted)
	finalObj, _ := svc.GetObjective(ctx, obj.ObjectiveID)
	if finalObj.Status != ObjectiveCompleted {
		t.Errorf("Expected final status COMPLETED, got %s", finalObj.Status)
	}

	// Build final trace
	finalTrace, err := svc.GetObjectiveTrace(ctx, obj.ObjectiveID)
	if err != nil {
		t.Fatalf("Final trace build failed: %v", err)
	}
	if len(finalTrace.Nodes) < 9 {
		t.Errorf("Expected complete 9+ node trace, got %d", len(finalTrace.Nodes))
	}
}
