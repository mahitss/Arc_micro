package demo

import (
	"strings"
	"testing"
)

// TestFlagshipE2E_01_ObjectiveCreation verifies canonical objective creation and budget envelope.
func TestFlagshipE2E_01_ObjectiveCreation(t *testing.T) {
	engine := NewMissionReplayEngine()
	evt := engine.allEvents[0]

	if evt.EventID != "evt_01_created" {
		t.Fatalf("expected evt_01_created, got %s", evt.EventID)
	}
	if evt.State != StateCreated {
		t.Fatalf("expected StateCreated, got %s", evt.State)
	}
	if evt.Amount != 25.00 || evt.Currency != "USDC" {
		t.Fatalf("expected $25.00 USDC, got %f %s", evt.Amount, evt.Currency)
	}
	title, _ := evt.Metadata["title"].(string)
	if title != "Autonomous Market Intelligence" {
		t.Fatalf("expected Autonomous Market Intelligence, got %s", title)
	}
	if engine.summary.BudgetCapUSDC != 25.00 {
		t.Fatalf("expected budget cap 25.00, got %f", engine.summary.BudgetCapUSDC)
	}
}

// TestFlagshipE2E_02_BlueprintCompilation verifies task graph DAG generation with AI advisory bounds.
func TestFlagshipE2E_02_BlueprintCompilation(t *testing.T) {
	engine := NewMissionReplayEngine()
	evt := engine.allEvents[1]

	if evt.EventID != "evt_02_plan" || evt.State != StatePlanning {
		t.Fatalf("expected evt_02_plan in StatePlanning, got %s in %s", evt.EventID, evt.State)
	}
	if evt.Amount != 0.00 {
		t.Fatalf("blueprint compilation should not move funds, got %f", evt.Amount)
	}
	dag, _ := evt.Metadata["dag_dependencies"].(string)
	if !strings.Contains(dag, "Research -> Analysis") || !strings.Contains(dag, "Analysis + Critic -> Synthesis") {
		t.Fatalf("unexpected DAG dependencies: %s", dag)
	}
	if evt.Metadata["authority_impact"] != "UNCHANGED" {
		t.Fatalf("expected authority impact UNCHANGED, got %v", evt.Metadata["authority_impact"])
	}
}

// TestFlagshipE2E_03_AgentDiscovery verifies discovery of candidate providers in marketplace.
func TestFlagshipE2E_03_AgentDiscovery(t *testing.T) {
	engine := NewMissionReplayEngine()
	evt := engine.allEvents[2]

	if evt.EventID != "evt_03_discovery" || evt.State != StateDiscovering {
		t.Fatalf("expected evt_03_discovery in StateDiscovering, got %s in %s", evt.EventID, evt.State)
	}
	candidates, _ := evt.Metadata["candidates_found"].(int)
	if candidates != 4 {
		t.Fatalf("expected 4 candidates, got %d", candidates)
	}
	if engine.summary.AgentsCount != 5 { // 4 candidates + 1 critic agent
		t.Fatalf("expected 5 agents total, got %d", engine.summary.AgentsCount)
	}
}

// TestFlagshipE2E_04_QuoteGeneration verifies structured quote collection with supported fields.
func TestFlagshipE2E_04_QuoteGeneration(t *testing.T) {
	engine := NewMissionReplayEngine()
	evt := engine.allEvents[3]

	if evt.EventID != "evt_04_quotes" || evt.State != StateQuoting {
		t.Fatalf("expected evt_04_quotes in StateQuoting, got %s in %s", evt.EventID, evt.State)
	}
	quotes, ok := evt.Metadata["quotes"].([]map[string]interface{})
	if !ok || len(quotes) != 3 {
		t.Fatalf("expected 3 valid quotes in quotes array, got %v", evt.Metadata["quotes"])
	}
	for _, q := range quotes {
		if _, hasP := q["provider"]; !hasP {
			t.Fatalf("quote missing provider field: %v", q)
		}
		if _, hasQ := q["quote_usdc"]; !hasQ {
			t.Fatalf("quote missing quote_usdc field: %v", q)
		}
		if _, hasL := q["latency_s"]; !hasL {
			t.Fatalf("quote missing latency_s field: %v", q)
		}
	}
}

// TestFlagshipE2E_05_DeterministicSelection verifies selection of Provider B with reasoning.
func TestFlagshipE2E_05_DeterministicSelection(t *testing.T) {
	engine := NewMissionReplayEngine()
	evtCompare := engine.allEvents[4]
	evtSelect := engine.allEvents[5]

	if evtCompare.Metadata["recommended_provider"] != "Provider B" {
		t.Fatalf("expected Provider B recommendation, got %v", evtCompare.Metadata["recommended_provider"])
	}
	if evtSelect.Metadata["selected_provider"] != "Provider B" {
		t.Fatalf("expected Provider B selected, got %v", evtSelect.Metadata["selected_provider"])
	}
	why, ok := engine.summary.WhyExplanation["ai_recommendation"].(string)
	if !ok || !strings.Contains(why, "Provider B") {
		t.Fatalf("expected Provider B in why explanation, got %v", engine.summary.WhyExplanation)
	}
}

// TestFlagshipE2E_06_PolicyEvaluation verifies Rust Policy Engine decision and performance.
func TestFlagshipE2E_06_PolicyEvaluation(t *testing.T) {
	engine := NewMissionReplayEngine()
	evt := engine.allEvents[7] // evt_08_policy

	if evt.Actor != "Rust Policy Engine" {
		t.Fatalf("expected Rust Policy Engine, got %s", evt.Actor)
	}
	if evt.Status != "ALLOW" {
		t.Fatalf("expected policy status ALLOW, got %s", evt.Status)
	}
	evalDur, _ := evt.Metadata["eval_duration"].(string)
	if !strings.Contains(evalDur, "us") {
		t.Fatalf("expected microsecond policy evaluation duration, got %s", evalDur)
	}
}

// TestFlagshipE2E_07_RiskEvaluation verifies quantitative risk engine scoring.
func TestFlagshipE2E_07_RiskEvaluation(t *testing.T) {
	engine := NewMissionReplayEngine()
	evt := engine.allEvents[8] // evt_09_risk

	if evt.State != StateRiskCheck || evt.Status != "PASS" {
		t.Fatalf("expected StateRiskCheck PASS, got %s %s", evt.State, evt.Status)
	}
	score, _ := evt.Metadata["risk_score"].(int)
	if score != 18 {
		t.Fatalf("expected risk score 18, got %d", score)
	}
	tier, _ := evt.Metadata["risk_tier"].(string)
	if tier != "LOW" {
		t.Fatalf("expected LOW risk tier, got %s", tier)
	}
}

// TestFlagshipE2E_08_Approval verifies autonomous approval boundary under policy thresholds.
func TestFlagshipE2E_08_Approval(t *testing.T) {
	engine := NewMissionReplayEngine()
	// Check authority trace for approval stage
	var approvalFound bool
	for _, stage := range engine.summary.AuthorityTrace {
		if stage.Gate == "APPROVAL_GATE" {
			approvalFound = true
			if stage.Decision != "NOT_REQUIRED" {
				t.Fatalf("expected APPROVAL_GATE NOT_REQUIRED for spend under threshold, got %s", stage.Decision)
			}
			if !strings.Contains(stage.EnforcedRule, "$50.00 threshold") && !strings.Contains(stage.EnforcedRule, "threshold") {
				t.Fatalf("expected approval threshold rule, got %s", stage.EnforcedRule)
			}
		}
	}
	if !approvalFound {
		t.Fatalf("approval gate stage missing from authority trace")
	}
}

// TestFlagshipE2E_09_Liquidity verifies Treasury encumbrance and worst-case solvency.
func TestFlagshipE2E_09_Liquidity(t *testing.T) {
	engine := NewMissionReplayEngine()
	evt := engine.allEvents[9] // evt_10_treasury

	if evt.State != StateTreasuryReservation || evt.Status != "RESERVED" {
		t.Fatalf("expected StateTreasuryReservation RESERVED, got %s %s", evt.State, evt.Status)
	}
	if evt.Amount != 3.60 {
		t.Fatalf("expected $3.60 encumbered, got %f", evt.Amount)
	}
	buf, _ := evt.Metadata["buffer_solvency"].(string)
	if !strings.Contains(buf, "HEALTHY") {
		t.Fatalf("expected healthy buffer solvency, got %s", buf)
	}
}

// TestFlagshipE2E_10_Obligation verifies clearinghouse obligation registration.
func TestFlagshipE2E_10_Obligation(t *testing.T) {
	engine := NewMissionReplayEngine()
	obs := engine.summary.ClearingSummary.Obligations
	if len(obs) != 3 {
		t.Fatalf("expected 3 clearing obligations, got %d", len(obs))
	}
	var betaFound bool
	for _, ob := range obs {
		if ob.ProviderID == "provider_b" {
			betaFound = true
			if ob.AmountUSDC != 3.60 {
				t.Fatalf("expected $3.60 for provider_b, got %f", ob.AmountUSDC)
			}
		}
	}
	if !betaFound {
		t.Fatalf("obligation for provider_b not found")
	}
}

// TestFlagshipE2E_11_Clearing verifies netting and double-entry balance (debits == credits).
func TestFlagshipE2E_11_Clearing(t *testing.T) {
	engine := NewMissionReplayEngine()
	cs := engine.summary.ClearingSummary

	// Double entry check: Total Authorized ($8.50) + Unencumbered Return ($16.50) == Total Budget Cap ($25.00)
	if cs.TotalAuthorized+engine.summary.RemainingUSDC != engine.summary.BudgetCapUSDC {
		t.Fatalf("double entry mismatch: authorized (%f) + remaining (%f) != budget cap (%f)",
			cs.TotalAuthorized, engine.summary.RemainingUSDC, engine.summary.BudgetCapUSDC)
	}
	if cs.TotalAuthorized != 8.50 {
		t.Fatalf("expected total authorized 8.50, got %f", cs.TotalAuthorized)
	}
	if cs.TotalBlocked != 3.60 {
		t.Fatalf("expected total blocked 3.60, got %f", cs.TotalBlocked)
	}
}

// TestFlagshipE2E_12_ExecutionGate verifies pre-flight authorization check prior to execution.
func TestFlagshipE2E_12_ExecutionGate(t *testing.T) {
	engine := NewMissionReplayEngine()
	var execGateFound bool
	for _, stage := range engine.summary.AuthorityTrace {
		if stage.Gate == "EXECUTION_GATE" {
			execGateFound = true
			if stage.Decision != "SIMULATED" {
				t.Fatalf("execution gate in simulation mode must be SIMULATED, got %s", stage.Decision)
			}
			if !strings.Contains(stage.EnforcedRule, "INV-156") && !strings.Contains(stage.EnforcedRule, "simulation") {
				t.Fatalf("expected rule INV-156 or simulation rule, got %s", stage.EnforcedRule)
			}
		}
	}
	if !execGateFound {
		t.Fatalf("EXECUTION_GATE stage missing from authority trace")
	}
}

// TestFlagshipE2E_13_SimulationSettlement verifies simulation mode with 0 real funds moved.
func TestFlagshipE2E_13_SimulationSettlement(t *testing.T) {
	engine := NewMissionReplayEngine()
	evt := engine.allEvents[20] // evt_21_settlement

	if evt.Status != "SIMULATED" {
		t.Fatalf("expected status SIMULATED, got %s", evt.Status)
	}
	if evt.Metadata["broadcast"] != "NONE" {
		t.Fatalf("expected broadcast NONE, got %v", evt.Metadata["broadcast"])
	}
	if evt.Metadata["settlement_state"] != "SIMULATED — NO FUNDS MOVED" {
		t.Fatalf("expected SIMULATED — NO FUNDS MOVED, got %v", evt.Metadata["settlement_state"])
	}
	disbursed, _ := evt.Metadata["funds_disbursed_usdc"].(float64)
	if disbursed != 0.00 {
		t.Fatalf("expected 0.00 funds disbursed, got %f", disbursed)
	}
}

// TestFlagshipE2E_14_ResultFailure verifies deterministic provider timeout & security interception.
func TestFlagshipE2E_14_ResultFailure(t *testing.T) {
	engine := NewMissionReplayEngine()
	failEvt := engine.allEvents[13] // evt_14_prov_fail

	if failEvt.State != StateProviderFailure {
		t.Fatalf("expected StateProviderFailure, got %s", failEvt.State)
	}
	if failEvt.Status != "TIMEOUT_DETECTED" {
		t.Fatalf("expected TIMEOUT_DETECTED status, got %s", failEvt.Status)
	}
	if failEvt.Metadata["failed_provider"] != "Provider B" {
		t.Fatalf("expected Provider B failed, got %v", failEvt.Metadata["failed_provider"])
	}
}

// TestFlagshipE2E_15_EconomicMemory verifies isolated recording of provider failure and status fencing.
func TestFlagshipE2E_15_EconomicMemory(t *testing.T) {
	engine := NewMissionReplayEngine()
	var providerBStatus string
	for _, p := range engine.summary.Providers {
		if p.ID == "provider_b" {
			providerBStatus = p.Status
		}
	}
	// In the simulation registry, provider B is fenced as BLOCKED/FAILED
	if providerBStatus != "BLOCKED" && providerBStatus != "FAILED" {
		t.Fatalf("expected Provider B status BLOCKED or FAILED in economic memory, got %s", providerBStatus)
	}

	// Verify fail event in memory
	failEvt := engine.allEvents[13]
	if failEvt.Metadata["failed_provider"] != "Provider B" {
		t.Fatalf("expected failed_provider Provider B recorded in event memory")
	}
}

// TestFlagshipE2E_16_Replanning verifies autonomous AI replan proposal without authority expansion.
func TestFlagshipE2E_16_Replanning(t *testing.T) {
	engine := NewMissionReplayEngine()
	replanEvt := engine.allEvents[14] // evt_15_replan_req

	if replanEvt.State != StateReplanning {
		t.Fatalf("expected StateReplanning, got %s", replanEvt.State)
	}
	if replanEvt.Metadata["authority_expansion"] != "NONE" {
		t.Fatalf("expected authority expansion NONE, got %v", replanEvt.Metadata["authority_expansion"])
	}
	if replanEvt.Metadata["replacement_provider"] != "Provider C ($4.50)" {
		t.Fatalf("expected Provider C replacement, got %v", replanEvt.Metadata["replacement_provider"])
	}
}

// TestFlagshipE2E_17_ProviderSubstitution verifies selection of replacement Provider C.
func TestFlagshipE2E_17_ProviderSubstitution(t *testing.T) {
	engine := NewMissionReplayEngine()
	altEvt := engine.allEvents[15] // evt_16_alt_select

	if altEvt.State != StateRecovery {
		t.Fatalf("expected StateRecovery, got %s", altEvt.State)
	}
	if altEvt.Metadata["provider"] != "Provider C" {
		t.Fatalf("expected Provider C, got %v", altEvt.Metadata["provider"])
	}
}

// TestFlagshipE2E_18_PolicyRevalidation verifies fresh policy validation for replacement provider.
func TestFlagshipE2E_18_PolicyRevalidation(t *testing.T) {
	engine := NewMissionReplayEngine()
	altEvt := engine.allEvents[15] // evt_16_alt_select

	if altEvt.Metadata["policy_validation"] != "PASS" {
		t.Fatalf("expected policy_validation PASS for replacement, got %v", altEvt.Metadata["policy_validation"])
	}
}

// TestFlagshipE2E_19_RiskRevalidation verifies fresh risk assessment for replacement provider.
func TestFlagshipE2E_19_RiskRevalidation(t *testing.T) {
	engine := NewMissionReplayEngine()
	altEvt := engine.allEvents[15] // evt_16_alt_select

	if altEvt.Metadata["risk_validation"] != "PASS" {
		t.Fatalf("expected risk_validation PASS for replacement, got %v", altEvt.Metadata["risk_validation"])
	}
}

// TestFlagshipE2E_20_LiquidityRevalidation verifies treasury re-encumbrance within cap.
func TestFlagshipE2E_20_LiquidityRevalidation(t *testing.T) {
	engine := NewMissionReplayEngine()
	reauthEvt := engine.allEvents[16] // evt_17_pay_reauth

	if reauthEvt.State != StateExecuting || reauthEvt.Status != "AUTHORIZED" {
		t.Fatalf("expected StateExecuting AUTHORIZED, got %s %s", reauthEvt.State, reauthEvt.Status)
	}
	totalReserved, _ := reauthEvt.Metadata["total_reserved"].(float64)
	if totalReserved != 8.50 {
		t.Fatalf("expected total reserved 8.50, got %f", totalReserved)
	}
	if totalReserved > engine.summary.BudgetCapUSDC {
		t.Fatalf("total reserved exceeds budget cap")
	}
}

// TestFlagshipE2E_21_SuccessfulSecondProvider verifies Provider C deliverable reception and validation.
func TestFlagshipE2E_21_SuccessfulSecondProvider(t *testing.T) {
	engine := NewMissionReplayEngine()
	resEvt := engine.allEvents[17] // evt_18_result_rec
	valEvt := engine.allEvents[18] // evt_19_result_val

	if resEvt.Status != "DELIVERED" {
		t.Fatalf("expected DELIVERED status, got %s", resEvt.Status)
	}
	if valEvt.Status != "PASS" {
		t.Fatalf("expected validation PASS, got %s", valEvt.Status)
	}
	score, _ := valEvt.Metadata["critic_score"].(int)
	if score != 94 {
		t.Fatalf("expected critic score 94, got %d", score)
	}
}

// TestFlagshipE2E_22_FinalObjectiveCompletion verifies mission completion and unencumbered budget return.
func TestFlagshipE2E_22_FinalObjectiveCompletion(t *testing.T) {
	engine := NewMissionReplayEngine()
	completeEvt := engine.allEvents[21] // evt_22_complete

	if completeEvt.State != StateCompleted || completeEvt.Status != "SUCCESS" {
		t.Fatalf("expected StateCompleted SUCCESS, got %s %s", completeEvt.State, completeEvt.Status)
	}
	if completeEvt.Amount != 16.50 {
		t.Fatalf("expected $16.50 unencumbered return, got %f", completeEvt.Amount)
	}
	if engine.summary.RemainingUSDC != 16.50 {
		t.Fatalf("expected remaining USDC 16.50, got %f", engine.summary.RemainingUSDC)
	}
}

// TestFlagshipE2E_23_SimulationIsolation verifies simulation isolation labels across data models.
func TestFlagshipE2E_23_SimulationIsolation(t *testing.T) {
	engine := NewMissionReplayEngine()
	if engine.summary.Mode != "SIMULATION" {
		t.Fatalf("expected mode SIMULATION, got %s", engine.summary.Mode)
	}
	if !strings.Contains(engine.summary.ModeNotice, "SIMULATION — NO FUNDS MOVED") {
		t.Fatalf("expected ModeNotice to contain SIMULATION — NO FUNDS MOVED, got %s", engine.summary.ModeNotice)
	}
	for i, evt := range engine.allEvents {
		if evt.SimulationLive != "SIMULATION" {
			t.Fatalf("event %d simulation_live is %s, expected SIMULATION", i, evt.SimulationLive)
		}
	}
}

// TestFlagshipE2E_24_NoSigning verifies zero private keys loaded and zero signatures generated.
func TestFlagshipE2E_24_NoSigning(t *testing.T) {
	engine := NewMissionReplayEngine()
	export, err := engine.ExportJSON()
	if err != nil {
		t.Fatalf("failed to export: %v", err)
	}
	exportStr := string(export)
	if strings.Contains(exportStr, "private_key") || strings.Contains(exportStr, "sign_digest") {
		t.Fatalf("found private key or signing artifact in simulation export")
	}
}

// TestFlagshipE2E_25_NoBroadcasting verifies broadcast flag is strictly NONE.
func TestFlagshipE2E_25_NoBroadcasting(t *testing.T) {
	engine := NewMissionReplayEngine()
	broadcast, _ := engine.summary.ArcSettlement["broadcast"].(string)
	if broadcast != "NONE" {
		t.Fatalf("expected ArcSettlement broadcast NONE, got %s", broadcast)
	}
}

// TestFlagshipE2E_26_NoAgentVaultMutation verifies AgentVault deployment is UNDEPLOYED in simulation.
func TestFlagshipE2E_26_NoAgentVaultMutation(t *testing.T) {
	engine := NewMissionReplayEngine()
	vaultStatus, _ := engine.summary.ArcSettlement["agent_vault_deployment"].(string)
	if vaultStatus != "UNDEPLOYED" {
		t.Fatalf("expected AgentVault deployment UNDEPLOYED, got %s", vaultStatus)
	}
	realSettlements, _ := engine.summary.ArcSettlement["real_settlements"].(int)
	if realSettlements != 0 {
		t.Fatalf("expected 0 real settlements, got %d", realSettlements)
	}
}

// TestFlagshipE2E_27_DeterministicReplay verifies seed-based replay produces identical hashes.
func TestFlagshipE2E_27_DeterministicReplay(t *testing.T) {
	engine1 := NewMissionReplayEngine()
	engine2 := NewMissionReplayEngine()

	chk1 := engine1.ComputeDeterministicChecksum()
	chk2 := engine2.ComputeDeterministicChecksum()

	if chk1 != chk2 {
		t.Fatalf("deterministic replay checksum mismatch: %s != %s", chk1, chk2)
	}
}

// TestFlagshipE2E_28_Reset verifies clean reset back to step 0 with identical initial state.
func TestFlagshipE2E_28_Reset(t *testing.T) {
	engine := NewMissionReplayEngine()
	engine.JumpToStep(15)
	if engine.currentIndex != 15 {
		t.Fatalf("expected currentIndex 15, got %d", engine.currentIndex)
	}

	summary := engine.Reset()
	if summary.CurrentStepIndex != 0 {
		t.Fatalf("expected CurrentStepIndex 0 after reset, got %d", summary.CurrentStepIndex)
	}
	if summary.CurrentState != StateCreated {
		t.Fatalf("expected StateCreated after reset, got %s", summary.CurrentState)
	}
}

// TestFlagshipE2E_29_DuplicateExecutionProtection verifies strict causation chain prevents duplicate execution.
func TestFlagshipE2E_29_DuplicateExecutionProtection(t *testing.T) {
	engine := NewMissionReplayEngine()
	seenEvents := make(map[string]bool)

	for i, evt := range engine.allEvents {
		if seenEvents[evt.EventID] {
			t.Fatalf("duplicate event ID %s at index %d", evt.EventID, i)
		}
		seenEvents[evt.EventID] = true
	}
}

// TestFlagshipE2E_30_HardDenyCannotBeOverridden verifies HARD_DENY decision cannot be overridden.
func TestFlagshipE2E_30_HardDenyCannotBeOverridden(t *testing.T) {
	engine := NewMissionReplayEngine()
	whyNot := engine.summary.WhyNotExplanation

	decision, _ := whyNot["decision"].(string)
	if decision != "HARD DENY" {
		t.Fatalf("expected HARD DENY in WhyNot, got %s", decision)
	}
	overridePossible, _ := whyNot["override_possible"].(bool)
	if overridePossible {
		t.Fatalf("expected override_possible == false, got true")
	}
	invariant, _ := whyNot["enforced_invariant"].(string)
	if !strings.Contains(invariant, "INV-186") {
		t.Fatalf("expected invariant INV-186 in WhyNot, got %s", invariant)
	}
}
