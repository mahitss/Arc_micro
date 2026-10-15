package trust

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/adversarial"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/webhook"
)

// 1. Valid Chain Append & Cryptographic Verification Test
func TestAuditChain_1_ValidChainAppendAndVerification(t *testing.T) {
	chain := NewAuditChain()

	node0, err := chain.AppendEvent(
		"evt_001",
		"corr_001",
		"MISSION_CREATED",
		"ALLOWED",
		"research-agent",
		"msn_test_101",
		map[string]interface{}{"budget": "5000000", "currency": "USDC"},
	)
	if err != nil {
		t.Fatalf("Failed to append node0: %v", err)
	}

	if node0.PrevHash != GenesisPrevHash {
		t.Errorf("Expected GenesisPrevHash for node0, got %s", node0.PrevHash)
	}

	node1, err := chain.AppendEvent(
		"evt_002",
		"corr_001",
		"POLICY_EVALUATION",
		"ALLOWED",
		"research-agent",
		"step_001",
		map[string]interface{}{"service_id": "web-research", "quoted_price": "500000"},
	)
	if err != nil {
		t.Fatalf("Failed to append node1: %v", err)
	}

	if node1.PrevHash != node0.BlockHash {
		t.Errorf("Linkage failed: node1.PrevHash (%s) != node0.BlockHash (%s)", node1.PrevHash, node0.BlockHash)
	}

	verif := chain.VerifyChain()
	if !verif.IsValid {
		t.Fatalf("Expected valid chain, got failure: %s", verif.FailureReason)
	}
	if verif.TotalNodes != 2 {
		t.Errorf("Expected 2 nodes, got %d", verif.TotalNodes)
	}
	if verif.HeadHash != node1.BlockHash {
		t.Errorf("Expected head hash %s, got %s", node1.BlockHash, verif.HeadHash)
	}
}

// 2. Tampered Payload Detection Test
func TestAuditChain_2_TamperedPayload_DetectedImmediately(t *testing.T) {
	chain := NewAuditChain()

	_, _ = chain.AppendEvent("evt_01", "corr_1", "TYPE_A", "ALLOWED", "agent-1", "res-1", map[string]interface{}{"amount": 100})
	nodeTamper, _ := chain.AppendEvent("evt_02", "corr_1", "TYPE_B", "ALLOWED", "agent-1", "res-2", map[string]interface{}{"amount": 200})
	_, _ = chain.AppendEvent("evt_03", "corr_1", "TYPE_C", "ALLOWED", "agent-1", "res-3", map[string]interface{}{"amount": 300})

	// Attacker tampers with payload of evt_02 in database
	nodeTamper.Payload["amount"] = 999999

	verif := chain.VerifyChain()
	if verif.IsValid {
		t.Fatalf("Expected tamper detection, but chain reported valid!")
	}
	if verif.BrokenNodeIndex != 1 {
		t.Errorf("Expected broken index 1, got %d", verif.BrokenNodeIndex)
	}
	if verif.BrokenNodeID != "evt_02" {
		t.Errorf("Expected broken node ID 'evt_02', got %s", verif.BrokenNodeID)
	}
	if !strings.Contains(verif.FailureReason, "Payload tampering detected") {
		t.Errorf("Expected 'Payload tampering detected', got: %s", verif.FailureReason)
	}
}

// 3. Tampered PrevHash Detection Test
func TestAuditChain_3_TamperedPrevHash_DetectedImmediately(t *testing.T) {
	chain := NewAuditChain()

	_, _ = chain.AppendEvent("evt_10", "corr_2", "A", "ALLOWED", "agent-1", "res-1", map[string]interface{}{"v": 1})
	_, _ = chain.AppendEvent("evt_11", "corr_2", "B", "ALLOWED", "agent-1", "res-2", map[string]interface{}{"v": 2})
	nodeTamper, _ := chain.AppendEvent("evt_12", "corr_2", "C", "ALLOWED", "agent-1", "res-3", map[string]interface{}{"v": 3})

	// Attacker modifies previous hash pointer
	nodeTamper.PrevHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

	verif := chain.VerifyChain()
	if verif.IsValid {
		t.Fatalf("Expected broken link detection, but chain reported valid!")
	}
	if verif.BrokenNodeIndex != 2 {
		t.Errorf("Expected broken index 2, got %d", verif.BrokenNodeIndex)
	}
	if !strings.Contains(verif.FailureReason, "Previous hash mismatch") {
		t.Errorf("Expected 'Previous hash mismatch', got: %s", verif.FailureReason)
	}
}

// 4. Duplicate Event ID Rejection Test
func TestAuditChain_4_DuplicateEventIDs_Rejected(t *testing.T) {
	chain := NewAuditChain()

	_, err := chain.AppendEvent("evt_dup", "corr_3", "A", "ALLOWED", "agent-1", "res-1", nil)
	if err != nil {
		t.Fatalf("Failed to append initial event: %v", err)
	}

	_, err = chain.AppendEvent("evt_dup", "corr_3", "B", "ALLOWED", "agent-1", "res-2", nil)
	if err == nil {
		t.Fatalf("Expected duplicate event ID to be rejected, got nil error")
	}
	if !strings.Contains(err.Error(), "already exists") {
		t.Errorf("Expected 'already exists' error, got: %v", err)
	}
}

// 5. Malformed Input & Canonicalization Test
func TestAuditChain_5_MalformedInputAndCanonicalization(t *testing.T) {
	// CanonicalizePayload must produce identical hash regardless of map insertion order
	payload1 := map[string]interface{}{
		"zebra":  100,
		"apple":  200,
		"monkey": "banana",
	}
	payload2 := map[string]interface{}{
		"apple":  200,
		"monkey": "banana",
		"zebra":  100,
	}

	hash1 := ComputePayloadHash(payload1)
	hash2 := ComputePayloadHash(payload2)

	if hash1 != hash2 {
		t.Errorf("Canonicalization failed: map key permutations produced different hashes: %s vs %s", hash1, hash2)
	}

	// Empty ID rejection
	chain := NewAuditChain()
	_, err := chain.AppendEvent("", "corr", "TYPE", "ALLOWED", "agent", "res", nil)
	if err != ErrEmptyEventID {
		t.Errorf("Expected ErrEmptyEventID, got: %v", err)
	}
}

// 6. Transparent Trust Engine: New Agent Treated as UNKNOWN
func TestTrustEngine_6_NewAgentTreatedAsUnknown(t *testing.T) {
	chain := NewAuditChain()
	engine := NewTrustEngine(chain)

	score := engine.CalculateTrustScore("brand-new-agent")
	if score.Confidence != ConfidenceUnknown {
		t.Errorf("Expected ConfidenceUnknown for new agent, got %s", score.Confidence)
	}
	if score.TotalRecordedEvents != 0 {
		t.Errorf("Expected 0 total events, got %d", score.TotalRecordedEvents)
	}
	if score.ScoreBps != 5000 {
		t.Errorf("Expected neutral baseline score 5000 bps, got %d", score.ScoreBps)
	}
	if score.TrustTier != "UNVERIFIED" {
		t.Errorf("Expected tier UNVERIFIED, got %s", score.TrustTier)
	}
	if !strings.Contains(score.Explanation, "Treated as UNKNOWN until evidence is observed") {
		t.Errorf("Expected clear explanation of unknown state, got: %s", score.Explanation)
	}
}

// 7. Transparent Trust Engine: Deterministic Scoring Formula
func TestTrustEngine_7_DeterministicScoreCalculation(t *testing.T) {
	chain := NewAuditChain()
	engine := NewTrustEngine(chain)

	agentID := "verified-worker-agent"

	// Add 10 successful settlements
	for i := 0; i < 10; i++ {
		_, _ = chain.AppendEvent(
			"succ_"+time.Now().Format("150405.000000000")+string(rune(i)),
			"corr_test",
			"SETTLEMENT",
			"SETTLED",
			agentID,
			"res_test",
			map[string]interface{}{"step": i},
		)
		time.Sleep(1 * time.Millisecond)
	}

	// Add 1 policy violation
	_, _ = chain.AppendEvent(
		"violation_01",
		"corr_test",
		"BUDGET_OVERRUN",
		"DENIED",
		agentID,
		"res_test",
		map[string]interface{}{"attempted": "1000000"},
	)

	score := engine.CalculateTrustScore(agentID)

	// Formula: Base(5000) + SuccessBonus(min(10*100, 3500) = 1000) - Violations(1*1500 = 1500) - OverBudget(1*1000 = 1000)
	// Raw: 5000 + 1000 - 1500 - 1000 = 3500 bps
	expectedScore := int64(3500)
	if score.ScoreBps != expectedScore {
		t.Errorf("Deterministic calculation mismatch: expected %d, got %d (formula: %s)", expectedScore, score.ScoreBps, score.ScoringFormula)
	}
	if score.SuccessfulActions != 10 {
		t.Errorf("Expected 10 successes, got %d", score.SuccessfulActions)
	}
	if score.PolicyViolations != 1 {
		t.Errorf("Expected 1 violation, got %d", score.PolicyViolations)
	}
	if score.Confidence != ConfidenceMedium {
		t.Errorf("Expected ConfidenceMedium for 11 events, got %s", score.Confidence)
	}
}

// 8. Transparent Trust Engine: Tampering and Replays Severely Penalized
func TestTrustEngine_8_TamperingAndReplaysSeverelyPenalized(t *testing.T) {
	chain := NewAuditChain()
	engine := NewTrustEngine(chain)

	badAgent := "adversarial-agent"

	_, _ = chain.AppendEvent("evt_t1", "c1", "TAMPER_EVENT", "TAMPERING_DETECTED", badAgent, "res", nil)
	_, _ = chain.AppendEvent("evt_r1", "c2", "REPLAY_EVENT", "REPLAY_BLOCKED", badAgent, "res", nil)

	score := engine.CalculateTrustScore(badAgent)
	if score.TrustTier != "FLAGGED" {
		t.Errorf("Expected FLAGGED tier for agent with tampering and replays, got %s", score.TrustTier)
	}
	if score.ScoreBps > 1000 {
		t.Errorf("Expected severely depressed score for attacker, got %d bps", score.ScoreBps)
	}
}

// 9. Red-Team Test Suite: All 9 Scenarios Pass
func TestRedTeamSuite_9_AllNineVectorsExecuteAndPass(t *testing.T) {
	chain := NewAuditChain()
	suite := NewRedTeamSuite(chain, nil)

	report := suite.RunAll(context.Background())

	if report.TotalScenarios != 9 {
		t.Fatalf("Expected 9 total red-team scenarios, got %d", report.TotalScenarios)
	}
	if report.PassedScenarios != 9 {
		t.Fatalf("Expected all 9 scenarios to pass, passed=%d, failed=%d", report.PassedScenarios, report.FailedScenarios)
	}
	if !report.AuditVerification.IsValid {
		t.Errorf("Expected valid audit verification after red-team run, failure: %s", report.AuditVerification.FailureReason)
	}

	expectedIDs := []string{
		"RED-01", "RED-02", "RED-03", "RED-04", "RED-05", "RED-06", "RED-07", "RED-08", "RED-09",
	}

	for i, sc := range report.Scenarios {
		if sc.ID != expectedIDs[i] {
			t.Errorf("Scenario index %d ID mismatch: expected %s, got %s", i, expectedIDs[i], sc.ID)
		}
		if sc.Status != adversarial.StatusPass {
			t.Errorf("Scenario %s failed: actual=%s", sc.ID, sc.ActualBehavior)
		}
	}
}

// 10. Security Invariant: Invalid Signatures & Forged Approvals Are Strictly Rejected
func TestSecurity_10_InvalidSignaturesAndForgedApprovalRejection(t *testing.T) {
	secret := "whsec_supersecretkey1234567890"
	validPayload := []byte(`{"intent_id":"int_test_100","status":"APPROVED"}`)
	now := time.Now().UTC()

	// 1. Generate valid signature
	header := webhook.SignPayload(secret, now.Unix(), validPayload)

	// Verify valid signature passes
	if err := webhook.VerifySignature(secret, header, validPayload, 5*time.Minute); err != nil {
		t.Fatalf("Valid signature rejected unexpectedly: %v", err)
	}

	// 2. Tampered payload with valid header MUST fail with ErrSignatureMismatch
	tamperedPayload := []byte(`{"intent_id":"int_test_100","status":"APPROVED","amount":"9999999999"}`)
	err := webhook.VerifySignature(secret, header, tamperedPayload, 5*time.Minute)
	if !errors.Is(err, webhook.ErrSignatureMismatch) {
		t.Fatalf("Expected ErrSignatureMismatch for tampered payload, got: %v", err)
	}

	// 3. Forged signature header MUST fail
	forgedHeader := "t=" + header[2:12] + ",v1=0000000000000000000000000000000000000000000000000000000000000000"
	err = webhook.VerifySignature(secret, forgedHeader, validPayload, 5*time.Minute)
	if !errors.Is(err, webhook.ErrSignatureMismatch) {
		t.Fatalf("Expected ErrSignatureMismatch for forged signature, got: %v", err)
	}

	// 4. Record attempted forgery in audit chain and verify penalty applied to trust score
	chain := NewAuditChain()
	engine := NewTrustEngine(chain)
	attackerAgent := "forger-agent-x"

	_, _ = chain.AppendEvent(
		"evt_forgery_01",
		"corr_forgery_01",
		"SIGNATURE_VERIFICATION",
		"TAMPERING_DETECTED",
		attackerAgent,
		"intent_forged",
		map[string]interface{}{"violation": "INVALID_SIGNATURE_FORGERY"},
	)

	score := engine.CalculateTrustScore(attackerAgent)
	if score.TamperDetections != 1 {
		t.Errorf("Expected 1 tampering detection recorded, got %d", score.TamperDetections)
	}
	if score.TrustTier != "FLAGGED" {
		t.Errorf("Expected FLAGGED tier for signature forger, got %s", score.TrustTier)
	}
}

