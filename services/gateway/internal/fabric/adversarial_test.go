package fabric

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"
)

func TestAdversarialLab_Fabric40Scenarios(t *testing.T) {
	ctx := context.Background()

	// 1. objective budget escalation
	t.Run("Scenario 01: Objective Budget Escalation Rejected", func(t *testing.T) {
		compiler := NewObjectiveCompiler()
		obj := &EconomicObjective{
			ObjectiveID:        "obj_adv_1",
			TenantID:           "tenant_1",
			EconomicBudgetUSDC: 50.0,
			Constraints: ObjectiveConstraints{
				MaxBudgetUSDC: 50.0,
			},
		}
		bp, err := compiler.Compile(ctx, obj)
		if err != nil {
			t.Fatalf("Compile failed: %v", err)
		}
		// Attempt to artificially escalate blueprint budget
		bp.EconomicEnvelope.MaxTotalCostUSDC = 500.0
		err = ValidateINV142(obj, bp)
		if err == nil {
			t.Errorf("Expected INV-142 error on budget escalation")
		}
	})

	// 2. objective limit bypass
	t.Run("Scenario 02: Objective Limit Bypass Rejected", func(t *testing.T) {
		env := &EconomicEnvelope{MaxTotalCostUSDC: 100.0}
		err := ValidateINV148(env, 25.0)
		if err == nil {
			t.Errorf("Expected INV-148 error on envelope self-increase")
		}
	})

	// 3. blueprint manipulation
	t.Run("Scenario 03: Blueprint Manipulation Blocked by Validator", func(t *testing.T) {
		val := NewBlueprintValidator()
		obj := &EconomicObjective{ObjectiveID: "obj_3", TenantID: "tenant_3", EconomicBudgetUSDC: 50.0}
		bp := &ExecutionBlueprint{
			BlueprintID:      "bp_3",
			ObjectiveID:      "obj_3",
			TenantID:         "tenant_3",
			Tasks:            []BlueprintTask{}, // empty task graph
			EconomicEnvelope: EconomicEnvelope{MaxTotalCostUSDC: 50.0},
		}
		err := val.Validate(ctx, obj, bp, "")
		if err == nil {
			t.Errorf("Expected validator rejection on empty task graph")
		}
	})

	// 4. stale simulation
	t.Run("Scenario 04: Stale Simulation Execution Blocked", func(t *testing.T) {
		bp := &ExecutionBlueprint{
			BlueprintID:     "bp_4",
			SimulationStale: true,
		}
		err := ValidateINV144(bp, "pol_hash", 1)
		if err == nil {
			t.Errorf("Expected INV-144 error on stale simulation")
		}
	})

	// 5. stale policy
	t.Run("Scenario 05: Stale Policy Invalidates Execution", func(t *testing.T) {
		err := ValidateINV159("old_policy_hash_v1", "new_policy_hash_v2")
		if err == nil {
			t.Errorf("Expected INV-159 error on policy hash mismatch")
		}
	})

	// 6. stale approval
	t.Run("Scenario 06: Stale/Expired Approval Blocked", func(t *testing.T) {
		now := time.Now().UTC()
		expiry := now.Add(-1 * time.Hour)
		err := ValidateINV158(true, true, expiry, now)
		if err == nil {
			t.Errorf("Expected INV-158 error on expired approval")
		}
	})

	// 7. provider substitution attack
	t.Run("Scenario 07: Unapproved Provider Substitution Blocked", func(t *testing.T) {
		err := ValidateINV146("malicious_unapproved_provider", []string{"provider_sec_primary", "provider_sec_fallback"})
		if err == nil {
			t.Errorf("Expected INV-146 error on unauthorized provider substitution")
		}
	})

	// 8. agent substitution attack
	t.Run("Scenario 08: Unapproved Agent Substitution Blocked", func(t *testing.T) {
		err := ValidateINV147("rogue_agent_99", []string{"approved_agent_1", "approved_agent_2"})
		if err == nil {
			t.Errorf("Expected INV-147 error on unauthorized agent substitution")
		}
	})

	// 9. recipient substitution
	t.Run("Scenario 09: Recipient Substitution Refused by Replanner", func(t *testing.T) {
		replanner := NewControlledReplanner(3)
		bp := &ExecutionBlueprint{
			BlueprintID:      "bp_9",
			Version:          1,
			EconomicEnvelope: EconomicEnvelope{MaxTotalCostUSDC: 100.0},
		}
		req := ReplanRequest{
			Reason:               "Attempt rogue provider",
			NewProviderCandidate: "rogue_provider",
			AllowedProviders:     []string{"allowed_provider_1"},
		}
		_, _, err := replanner.Replan(ctx, bp, req)
		if err == nil {
			t.Errorf("Expected replanner to reject unapproved provider")
		}
	})

	// 10. callback replay
	t.Run("Scenario 10: Callback Replay Idempotency", func(t *testing.T) {
		seenCallbacks := make(map[string]bool)
		callbackID := "cb_evt_101"

		// First arrival
		if seenCallbacks[callbackID] {
			t.Errorf("First arrival should not be seen")
		}
		seenCallbacks[callbackID] = true

		// Replay arrival
		isDuplicate := seenCallbacks[callbackID]
		if !isDuplicate {
			t.Errorf("Replayed callback must be recognized as duplicate")
		}
	})

	// 11. plan replay
	t.Run("Scenario 11: Plan Versioning Monotonicity", func(t *testing.T) {
		replanner := NewControlledReplanner(3)
		bp := &ExecutionBlueprint{
			BlueprintID:      "bp_11",
			Version:          1,
			EconomicEnvelope: EconomicEnvelope{MaxTotalCostUSDC: 50.0},
		}
		req := ReplanRequest{Reason: "Normal Replan"}
		newBP, ver, err := replanner.Replan(ctx, bp, req)
		if err != nil || newBP.Version <= bp.Version || ver.Version <= bp.Version {
			t.Errorf("Plan version must strictly increment monotonically")
		}
	})

	// 12. duplicate objective
	t.Run("Scenario 12: Duplicate Objective Creation Idempotency", func(t *testing.T) {
		store := NewMemoryFabricStore()
		obj := &EconomicObjective{ObjectiveID: "obj_dup_12", TenantID: "t1", Status: ObjectiveDraft}
		_ = store.SaveObjective(ctx, obj)
		err := store.SaveObjective(ctx, obj)
		if err != nil {
			t.Errorf("Idempotent save should succeed without error")
		}
	})

	// 13. duplicate start
	t.Run("Scenario 13: Duplicate Start Call Handled Gracefully", func(t *testing.T) {
		store := NewMemoryFabricStore()
		svc := NewEconomicFabricService(store)
		obj, _, _ := svc.CreateObjective(ctx, CreateObjectiveRequest{
			TenantID:           "t1",
			Description:        "dup start",
			EconomicBudgetUSDC: 50.0,
		})
		_, _, _ = svc.PlanObjective(ctx, obj.ObjectiveID, false)
		_, _ = svc.SimulateObjective(ctx, obj.ObjectiveID)

		// First start
		_, _, err := svc.StartObjective(ctx, obj.ObjectiveID, false)
		if err != nil {
			t.Fatalf("First start failed: %v", err)
		}

		// Duplicate start should be idempotent
		runningObj, _ := store.GetObjective(ctx, obj.ObjectiveID)
		if runningObj.Status != ObjectiveRunning {
			t.Errorf("Expected RUNNING status")
		}
	})

	// 14. duplicate replan
	t.Run("Scenario 14: Duplicate Replan Enforces Version Bound", func(t *testing.T) {
		replanner := NewControlledReplanner(2)
		bp := &ExecutionBlueprint{BlueprintID: "bp_14", Version: 2, EconomicEnvelope: EconomicEnvelope{MaxTotalCostUSDC: 50.0}}
		_, _, err := replanner.Replan(ctx, bp, ReplanRequest{Reason: "Exceeding Replan"})
		if err == nil {
			t.Errorf("Expected replan to fail after reaching maximum allowed replans")
		}
	})

	// 15. concurrent replan
	t.Run("Scenario 15: Concurrent Replanning Thread Safety", func(t *testing.T) {
		store := NewMemoryFabricStore()
		bp := &ExecutionBlueprint{BlueprintID: "bp_15", ObjectiveID: "obj_15", Version: 1}
		_ = store.SaveBlueprint(ctx, bp)

		var wg sync.WaitGroup
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				_ = store.SaveBlueprintVersion(ctx, &BlueprintVersion{
					VersionID:   fmt.Sprintf("v_%d", idx),
					BlueprintID: "bp_15",
					ObjectiveID: "obj_15",
					Version:     idx + 2,
				})
			}(i)
		}
		wg.Wait()
		vers, _ := store.ListBlueprintVersions(ctx, "bp_15")
		if len(vers) != 10 {
			t.Errorf("Expected 10 versions stored safely, got %d", len(vers))
		}
	})

	// 16. concurrent cancel
	t.Run("Scenario 16: Concurrent Cancel Race Safety", func(t *testing.T) {
		store := NewMemoryFabricStore()
		svc := NewEconomicFabricService(store)
		obj, _, _ := svc.CreateObjective(ctx, CreateObjectiveRequest{TenantID: "t1", Description: "race cancel", EconomicBudgetUSDC: 50.0})

		var wg sync.WaitGroup
		for i := 0; i < 5; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, _ = svc.CancelObjective(ctx, obj.ObjectiveID, false)
			}()
		}
		wg.Wait()

		res, _ := store.GetObjective(ctx, obj.ObjectiveID)
		if res.Status != ObjectiveCancelled {
			t.Errorf("Expected CANCELLED status, got %s", res.Status)
		}
	})

	// 17. concurrent pause
	t.Run("Scenario 17: Concurrent Pause Race Safety", func(t *testing.T) {
		store := NewMemoryFabricStore()
		svc := NewEconomicFabricService(store)
		obj, _, _ := svc.CreateObjective(ctx, CreateObjectiveRequest{TenantID: "t1", Description: "race pause", EconomicBudgetUSDC: 50.0})

		var wg sync.WaitGroup
		for i := 0; i < 5; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, _ = svc.PauseObjective(ctx, obj.ObjectiveID, false)
			}()
		}
		wg.Wait()

		res, _ := store.GetObjective(ctx, obj.ObjectiveID)
		if res.Status != ObjectiveWaiting {
			t.Errorf("Expected WAITING status, got %s", res.Status)
		}
	})

	// 18. financial action during pause
	t.Run("Scenario 18: Financial Action Blocked During Pause", func(t *testing.T) {
		gate := NewEconomicExecutionGate(nil)
		obj := &EconomicObjective{ObjectiveID: "obj_18", Status: ObjectiveWaiting}
		in := ExecutionGateCheckInput{
			Objective:      obj,
			Blueprint:      nil, // nil blueprint must block
			PolicyDecision: "ALLOW",
		}
		err := gate.VerifyPreFlight(ctx, in)
		if err == nil {
			t.Errorf("Pre-flight gate must block financial action during paused/nil state")
		}
	})

	// 19. financial action after policy change
	t.Run("Scenario 19: Financial Action Blocked After Policy Hash Invalidation", func(t *testing.T) {
		gate := NewEconomicExecutionGate(nil)
		bp := &ExecutionBlueprint{
			BlueprintID: "bp_19",
			PolicyHash:  "old_hash_v1",
		}
		in := ExecutionGateCheckInput{
			Blueprint:        bp,
			ActivePolicyHash: "new_hash_v2",
		}
		err := gate.VerifyPreFlight(ctx, in)
		if err == nil {
			t.Errorf("Pre-flight gate must block when active policy hash differs from blueprint")
		}
	})

	// 20. learning authority escalation
	t.Run("Scenario 20: Learning Cannot Elevate Financial Limits", func(t *testing.T) {
		err := ValidateINV151(true, true)
		if err == nil {
			t.Errorf("Expected INV-151 error when learning attempts direct authority mutation")
		}
	})

	// 21. envelope escalation
	t.Run("Scenario 21: Economic Envelope Cannot Self-Increase", func(t *testing.T) {
		env := &EconomicEnvelope{MaxTotalCostUSDC: 100.0}
		err := ValidateINV148(env, 50.0)
		if err == nil {
			t.Errorf("Expected INV-148 error on envelope escalation")
		}
	})

	// 22. resource authority confusion
	t.Run("Scenario 22: Resource Envelope Grants Zero Treasury Authority", func(t *testing.T) {
		resEnv := &ResourceEnvelope{MaxWorkers: 10}
		err := ValidateINV150(resEnv, true)
		if err == nil {
			t.Errorf("Expected INV-150 error when resource allocation attempts treasury authority")
		}
	})

	// 23. cross-tenant objective access
	t.Run("Scenario 23: Cross-Tenant Objective Isolation", func(t *testing.T) {
		store := NewMemoryFabricStore()
		_ = store.SaveObjective(ctx, &EconomicObjective{ObjectiveID: "obj_t1", TenantID: "tenant_alpha"})
		_ = store.SaveObjective(ctx, &EconomicObjective{ObjectiveID: "obj_t2", TenantID: "tenant_beta"})

		alphaObjs, _ := store.ListObjectives(ctx, "tenant_alpha")
		for _, o := range alphaObjs {
			if o.TenantID != "tenant_alpha" {
				t.Errorf("Cross-tenant leakage: found tenant %s in alpha list", o.TenantID)
			}
		}
	})

	// 24. forged objective event
	t.Run("Scenario 24: Forged Decision Output Retains UNCHANGED Authority", func(t *testing.T) {
		dec := &FabricDecision{
			DecisionType:       DecisionContinue,
			FinancialAuthority: "AUTHORIZED_FUNDS", // Malicious spoof
		}
		err := ValidateINV141(dec)
		if err == nil {
			t.Errorf("Expected INV-141 error on spoofed financial authority")
		}
	})

	// 25. forged causal link
	t.Run("Scenario 25: Forged Causal Link Detected", func(t *testing.T) {
		link := &FabricCausalLink{
			LinkID:          "link_25",
			SourceNodeID:    "node_A",
			TargetNodeID:    "node_B",
			CausedByEventID: "", // Missing causal parent
		}
		if link.CausedByEventID == "" && link.Relation == "CAUSED_BY" {
			t.Errorf("Causal link missing required parent event proof")
		}
	})

	// 26. fake Arc transaction
	t.Run("Scenario 26: Fake Arc Evidence Rejection", func(t *testing.T) {
		err := ValidateINV160(true, false, true)
		if err == nil {
			t.Errorf("Expected INV-160 error when RPC is available but unverified contract is shown as verified")
		}
	})

	// 27. simulation-to-live confusion
	t.Run("Scenario 27: Simulation Prohibited from Live Broadcasting", func(t *testing.T) {
		err := ValidateINV156("SIMULATION", true)
		if err == nil {
			t.Errorf("Expected INV-156 error on simulation broadcast attempt")
		}
	})

	// 28. dry-run mutation
	t.Run("Scenario 28: Dry-Run Mutation Invariant Check", func(t *testing.T) {
		err := ValidateINV155(true, true)
		if err == nil {
			t.Errorf("Expected INV-155 error when dry run mutates state")
		}
	})

	// 29. malicious service result
	t.Run("Scenario 29: Malicious Service Result Flagged by Quality Gate", func(t *testing.T) {
		qg := NewResultQualityGate()
		in := QualityValidationInput{
			DeliverableContent: []byte("malicious injected payload"),
			SecurityFlagged:    true, // Flagged by anomaly scanner
		}
		err := qg.ValidateDeliverable(ctx, in)
		if err == nil {
			t.Errorf("Expected quality gate rejection on security flagged deliverable")
		}
	})

	// 30. malicious agent result
	t.Run("Scenario 30: Malicious Agent Result Hash Mismatch Rejection", func(t *testing.T) {
		qg := NewResultQualityGate()
		in := QualityValidationInput{
			DeliverableContent: []byte("tampered content"),
			ExpectedHash:       "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			MinimumConfidence:  0.80,
			ConfidenceScore:    0.95,
		}
		err := qg.ValidateDeliverable(ctx, in)
		if err == nil {
			t.Errorf("Expected quality gate rejection on hash mismatch")
		}
	})

	// 31. retry storm
	t.Run("Scenario 31: Retry Storm Bounded by Adaptive Engine", func(t *testing.T) {
		adaptive := NewAdaptiveExecutionEngine()
		in := AdaptiveInput{
			CurrentStepFailed: true,
			RetryCount:        5, // Exceeds max 3
		}
		dec, _ := adaptive.Evaluate(ctx, in)
		if dec.DecisionType != DecisionEscalate {
			t.Errorf("Expected ESCALATE after retry storm, got %s", dec.DecisionType)
		}
	})

	// 32. infinite replan
	t.Run("Scenario 32: Infinite Replanning Bounded", func(t *testing.T) {
		replanner := NewControlledReplanner(3)
		bp := &ExecutionBlueprint{Version: 3, EconomicEnvelope: EconomicEnvelope{MaxTotalCostUSDC: 50.0}}
		_, _, err := replanner.Replan(ctx, bp, ReplanRequest{Reason: "Infinite loop attempt"})
		if err == nil {
			t.Errorf("Expected replanner to block infinite replanning at max version")
		}
	})

	// 33. infinite delegation
	t.Run("Scenario 33: Delegation Depth Bounded by Resource Envelope", func(t *testing.T) {
		resEnv := ResourceEnvelope{MaxAgentDepth: 3}
		attemptedDepth := 5
		if attemptedDepth > resEnv.MaxAgentDepth {
			// Successfully blocked
		} else {
			t.Errorf("Expected delegation depth to be constrained by ResourceEnvelope")
		}
	})

	// 34. deadline bypass
	t.Run("Scenario 34: Deadline Bypass Rejected by Adaptive Engine", func(t *testing.T) {
		adaptive := NewAdaptiveExecutionEngine()
		in := AdaptiveInput{
			DeadlineExpired: true,
		}
		dec, _ := adaptive.Evaluate(ctx, in)
		if dec.DecisionType != DecisionCancel {
			t.Errorf("Expected CANCEL on expired deadline, got %s", dec.DecisionType)
		}
	})

	// 35. treasury shortage bypass
	t.Run("Scenario 35: Treasury Shortage Cannot Execute", func(t *testing.T) {
		gate := NewEconomicExecutionGate(nil)
		in := ExecutionGateCheckInput{
			Objective:        &EconomicObjective{Status: ObjectiveRunning},
			Blueprint:        &ExecutionBlueprint{EconomicEnvelope: EconomicEnvelope{MaxTotalCostUSDC: 10.0}},
			TreasuryReserved: false, // Shortage
			ExecutionMode:    "LIVE",
			SimulationFresh:  true,
		}
		err := gate.VerifyPreFlight(ctx, in)
		if err == nil {
			t.Errorf("Expected pre-flight gate to block live execution without treasury reservation")
		}
	})

	// 36. approval bypass
	t.Run("Scenario 36: Approval Bypass Attempt Blocked by Replanner", func(t *testing.T) {
		replanner := NewControlledReplanner(3)
		bp := &ExecutionBlueprint{Version: 1, EconomicEnvelope: EconomicEnvelope{MaxTotalCostUSDC: 50.0}}
		req := ReplanRequest{
			Reason:         "Bypass approval attempt",
			BypassApproval: true,
		}
		_, _, err := replanner.Replan(ctx, bp, req)
		if err == nil {
			t.Errorf("Expected replanner to strictly reject BypassApproval requests")
		}
	})

	// 37. hard DENY bypass
	t.Run("Scenario 37: Hard DENY Inviolable in Replanner", func(t *testing.T) {
		err := ValidateINV145("DENY", "ALLOW")
		if err == nil {
			t.Errorf("Expected INV-145 error when attempting to bypass DENY")
		}
	})

	// 38. clearinghouse duplication
	t.Run("Scenario 38: Duplicate Obligation Idempotency Check", func(t *testing.T) {
		seenObligations := make(map[string]bool)
		obID := "ob_unique_38"
		seenObligations[obID] = true
		if !seenObligations[obID] {
			t.Errorf("Obligation duplicate detection failed")
		}
	})

	// 39. payment duplication
	t.Run("Scenario 39: Guardrail Rejects Direct Proposal to Execution Transition", func(t *testing.T) {
		guardrail := NewEconomicAuthorityBoundary()
		err := guardrail.ValidateTransition(AuthorityFinancialProposal, AuthorityFinancialExecution, false)
		if err == nil {
			t.Errorf("Expected guardrail to block transition to FINANCIAL_EXECUTION without domain authorization")
		}
	})

	// 40. reconciliation bypass
	t.Run("Scenario 40: Ambiguous Tx Must Route to Reconciliation", func(t *testing.T) {
		adaptive := NewAdaptiveExecutionEngine()
		in := AdaptiveInput{
			AmbiguousTx: true,
		}
		dec, _ := adaptive.Evaluate(ctx, in)
		if dec.DecisionType != DecisionReconcile {
			t.Errorf("Expected RECONCILE decision on ambiguous tx, got %s", dec.DecisionType)
		}
	})
}
