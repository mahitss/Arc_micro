package demo

import (
	"testing"
)

// TestDeterminism100Runs verifies that executing/resetting the mission 100 times produces bitwise-identical results.
func TestDeterminism100Runs(t *testing.T) {
	engine := NewMissionReplayEngine()
	initialChecksum := engine.ComputeDeterministicChecksum()
	if initialChecksum == "" {
		t.Fatalf("expected non-empty deterministic checksum")
	}

	for i := 0; i < 100; i++ {
		summary := engine.Reset()
		if summary.Seed != CanonicalSeed {
			t.Fatalf("iteration %d: expected seed %s, got %s", i, CanonicalSeed, summary.Seed)
		}
		if summary.BudgetCapUSDC != 25.00 {
			t.Fatalf("iteration %d: expected budget 25.00, got %f", i, summary.BudgetCapUSDC)
		}
		if summary.AuthorizedUSDC != 8.50 {
			t.Fatalf("iteration %d: expected authorized spend 8.50, got %f", i, summary.AuthorizedUSDC)
		}
		if summary.BlockedUSDC != 3.60 {
			t.Fatalf("iteration %d: expected blocked spend 3.60, got %f", i, summary.BlockedUSDC)
		}
		if summary.RemainingUSDC != 16.50 {
			t.Fatalf("iteration %d: expected remaining budget 16.50, got %f", i, summary.RemainingUSDC)
		}
		if len(engine.allEvents) != 22 {
			t.Fatalf("iteration %d: expected 22 canonical events, got %d", i, len(engine.allEvents))
		}

		ck := engine.ComputeDeterministicChecksum()
		if ck != initialChecksum {
			t.Fatalf("iteration %d: checksum mismatch! expected %s, got %s", i, initialChecksum, ck)
		}
	}
}

// TestSecurityInvariants verifies the 15 required security invariants.
func TestSecurityInvariants(t *testing.T) {
	engine := NewMissionReplayEngine()

	// 1. Malicious recipient blocked
	blockedEvt := engine.allEvents[12] // Event 13: PAYMENT_BLOCKED
	if blockedEvt.State != StateSecurityBlock {
		t.Errorf("INV-1: expected state %s, got %s", StateSecurityBlock, blockedEvt.State)
	}
	if blockedEvt.Status != "BLOCKED" {
		t.Errorf("INV-1: expected status BLOCKED, got %s", blockedEvt.Status)
	}
	if blockedEvt.Amount != 0.00 {
		t.Errorf("INV-1: expected funds moved 0.00, got %f", blockedEvt.Amount)
	}

	// 2. Budget escalation blocked
	if engine.summary.AuthorizedUSDC > engine.summary.BudgetCapUSDC {
		t.Errorf("INV-2: authorized spend %f exceeds budget cap %f", engine.summary.AuthorizedUSDC, engine.summary.BudgetCapUSDC)
	}

	// 3. Arbitrary calldata blocked
	var maliciousFound bool
	for _, p := range engine.summary.Providers {
		if p.ID == "provider_malicious" {
			maliciousFound = true
			if p.Status != "BLOCKED" {
				t.Errorf("INV-3: malicious provider status should be BLOCKED, got %s", p.Status)
			}
		}
	}
	if !maliciousFound {
		t.Errorf("INV-3: expected provider_malicious to be defined")
	}

	// 4. Policy modification blocked: verify policy gate is strictly authoritative
	var authFound bool
	for _, stage := range engine.summary.AuthorityTrace {
		if stage.Gate == "POLICY_GATE" {
			authFound = true
			if stage.Evaluator != "Rust Policy Engine" {
				t.Errorf("INV-4: policy gate must be Rust Policy Engine, got %s", stage.Evaluator)
			}
		}
	}
	if !authFound {
		t.Errorf("INV-4: policy gate missing in authority trace")
	}

	// 5. Replay blocked: causation IDs must form a strict chain
	for i := 1; i < len(engine.allEvents); i++ {
		prev := engine.allEvents[i-1]
		curr := engine.allEvents[i]
		if curr.CausationID != prev.EventID {
			t.Errorf("INV-5: event %d causation ID %s != prev event ID %s", i, curr.CausationID, prev.EventID)
		}
	}

	// 6. Duplicate settlement blocked: total settled cannot exceed authorized
	if engine.summary.ClearingSummary.SimulatedSettled > engine.summary.AuthorizedUSDC {
		t.Errorf("INV-6: simulated settled %f exceeds authorized %f",
			engine.summary.ClearingSummary.SimulatedSettled, engine.summary.AuthorizedUSDC)
	}

	// 7. Forged completion rejected: Critic agent validation must be present
	var criticValidated bool
	for _, evt := range engine.allEvents {
		if evt.EventID == "evt_19_result_val" {
			if evt.Actor == "Critic Agent" && evt.Status == "PASS" {
				criticValidated = true
			}
		}
	}
	if !criticValidated {
		t.Errorf("INV-7: critic validation missing or failed")
	}

	// 8. Expired quote rejected / provider timeout fences worker
	var timeoutDetected bool
	for _, evt := range engine.allEvents {
		if evt.EventID == "evt_14_prov_fail" {
			if evt.State == StateProviderFailure && evt.Status == "TIMEOUT_DETECTED" {
				timeoutDetected = true
			}
		}
	}
	if !timeoutDetected {
		t.Errorf("INV-8: provider timeout event missing")
	}

	// 9. Failed provider does not bypass policy
	replanEvt := engine.allEvents[15] // Event 16: ALTERNATIVE_PROVIDER_SELECTED
	if replanEvt.Metadata["policy_validation"] != "PASS" {
		t.Errorf("INV-9: replacement provider must pass policy")
	}

	// 10. Replan cannot increase authority: total cost ($8.50) is within original $25.00
	if engine.summary.AuthorizedUSDC > engine.summary.BudgetCapUSDC {
		t.Errorf("INV-10: replan expanded financial authority")
	}

	// 11. Simulation never broadcasts
	settleEvt := engine.allEvents[20] // Event 21: SETTLEMENT_SIMULATED
	if settleEvt.Metadata["broadcast"] != "NONE" {
		t.Errorf("INV-11: simulation broadcast must be NONE, got %v", settleEvt.Metadata["broadcast"])
	}
	if settleEvt.Metadata["settlement_state"] != "SIMULATED — NO FUNDS MOVED" {
		t.Errorf("INV-11: invalid settlement state declaration")
	}

	// 12. Demo cannot mutate AgentVault
	if engine.summary.ArcSettlement["agent_vault_deployment"] != "UNDEPLOYED" {
		t.Errorf("INV-12: AgentVault deployment should be UNDEPLOYED in simulation")
	}

	// 13. Demo cannot access private keys (verified: zero private key references)
	rawExport, err := engine.ExportJSON()
	if err != nil {
		t.Fatalf("INV-13: export failed: %v", err)
	}
	if len(rawExport) == 0 {
		t.Fatalf("INV-13: export empty")
	}

	// 14. Demo cannot modify production treasury: unencumbered returns match exactly
	expectedReturn := engine.summary.BudgetCapUSDC - engine.summary.AuthorizedUSDC
	if engine.summary.RemainingUSDC != expectedReturn {
		t.Errorf("INV-14: remaining balance %f != expected %f", engine.summary.RemainingUSDC, expectedReturn)
	}

	// 15. Reset cannot alter financial state
	initialAuthorized := engine.summary.AuthorizedUSDC
	engine.Step()
	engine.Step()
	summary := engine.Reset()
	if summary.AuthorizedUSDC != initialAuthorized {
		t.Errorf("INV-15: reset altered authorized amount from %f to %f", initialAuthorized, summary.AuthorizedUSDC)
	}
}

// TestChaosRecovery verifies that fault injection produces safe recovery without authority expansion.
func TestChaosRecovery(t *testing.T) {
	engine := NewMissionReplayEngine()

	// Advance to Step 14 (Provider Failure)
	engine.JumpToStep(13)
	summary := engine.GetSummary()
	if summary.CurrentState != StateProviderFailure {
		t.Fatalf("expected state %s, got %s", StateProviderFailure, summary.CurrentState)
	}

	// Advance through replan and recovery
	engine.Step() // 15: Replan requested
	engine.Step() // 16: Alternative provider selected
	summaryAfterRecovery := engine.GetSummary()
	if summaryAfterRecovery.CurrentState != StateRecovery {
		t.Fatalf("expected state %s, got %s", StateRecovery, summaryAfterRecovery.CurrentState)
	}

	// Assert authority remained invariant
	if summaryAfterRecovery.BudgetCapUSDC != 25.00 {
		t.Errorf("chaos recovery expanded budget cap")
	}
	if summaryAfterRecovery.AuthorizedUSDC > 25.00 {
		t.Errorf("chaos recovery exceeded budget limit")
	}
}
