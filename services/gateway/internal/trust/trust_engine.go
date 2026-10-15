package trust

import (
	"fmt"
	"strings"
	"time"
)

// TrustConfidence represents empirical statistical confidence based strictly on recorded event volume.
type TrustConfidence string

const (
	ConfidenceUnknown TrustConfidence = "UNKNOWN"
	ConfidenceLow     TrustConfidence = "LOW"
	ConfidenceMedium  TrustConfidence = "MEDIUM"
	ConfidenceHigh    TrustConfidence = "HIGH"

	ScoringFormulaDoc = "Score(bps) = clamp(Base(5000) + min(Successes * 100, 3500) - PolicyViolations * 1500 - OverBudgetAttempts * 1000 - ReplayAttempts * 2000 - TamperDetections * 4000, 0, 10000)"
)

// AgentTrustScore provides an explainable, deterministic trust assessment for an agent.
// INVARIANT: Trust is computed ONLY from verified historical events in the audit chain.
// Fabricating synthetic reputation data is strictly prohibited.
type AgentTrustScore struct {
	AgentID              string          `json:"agent_id"`
	ScoreBps             int64           `json:"score_bps"`             // 0 to 10,000 basis points
	TrustTier            string          `json:"trust_tier"`            // "TRUSTED", "PROBATIONARY", "UNVERIFIED", "FLAGGED"
	Confidence           TrustConfidence `json:"confidence"`            // UNKNOWN, LOW, MEDIUM, HIGH
	TotalRecordedEvents  int             `json:"total_recorded_events"`
	SuccessfulActions    int             `json:"successful_actions"`
	PolicyViolations     int             `json:"policy_violations"`
	OverBudgetAttempts   int             `json:"over_budget_attempts"`
	TamperDetections     int             `json:"tamper_detections"`
	ReplayAttempts       int             `json:"replay_attempts"`
	ScoringFormula       string          `json:"scoring_formula"`
	Explanation          string          `json:"explanation"`
	EvaluatedAt          time.Time       `json:"evaluated_at"`
}

// TrustEngine calculates transparent, reproducible trust scores from an AuditChain.
type TrustEngine struct {
	chain *AuditChain
}

// NewTrustEngine creates a new TrustEngine bound to an audit chain.
func NewTrustEngine(chain *AuditChain) *TrustEngine {
	if chain == nil {
		chain = NewAuditChain()
	}
	return &TrustEngine{chain: chain}
}

// CalculateTrustScore evaluates the trust score for a given agent strictly from verified chain events.
func (e *TrustEngine) CalculateTrustScore(agentID string) *AgentTrustScore {
	now := time.Now().UTC()
	nodes := e.chain.GetNodes()

	cleanID := strings.TrimSpace(agentID)
	if cleanID == "" {
		return &AgentTrustScore{
			AgentID:        "",
			ScoreBps:       0,
			TrustTier:      "FLAGGED",
			Confidence:     ConfidenceUnknown,
			ScoringFormula: "Score = 0 (empty agent ID)",
			Explanation:    "Agent identifier cannot be empty.",
			EvaluatedAt:    now,
		}
	}

	successes := 0
	violations := 0
	overBudget := 0
	tampering := 0
	replays := 0
	totalAgentEvents := 0

	for _, node := range nodes {
		if node == nil || node.ActorID != cleanID {
			continue
		}
		totalAgentEvents++

		switch node.Outcome {
		case "ALLOWED", "SETTLED", "COMPLETED", "VERIFIED":
			successes++
		case "DENIED":
			violations++
			if strings.Contains(strings.ToLower(node.EventType), "budget") ||
				strings.Contains(strings.ToLower(fmt.Sprintf("%v", node.Payload)), "budget") {
				overBudget++
			}
		case "REPLAY_BLOCKED":
			replays++
			violations++
		case "TAMPERING_DETECTED":
			tampering++
		}
	}

	// 1. New Agent Guarantee: If zero recorded events exist, agent is UNKNOWN (no invented reputation)
	if totalAgentEvents == 0 {
		return &AgentTrustScore{
			AgentID:             cleanID,
			ScoreBps:            5000, // Neutral 50.0% baseline
			TrustTier:           "UNVERIFIED",
			Confidence:          ConfidenceUnknown,
			TotalRecordedEvents: 0,
			SuccessfulActions:   0,
			PolicyViolations:    0,
			OverBudgetAttempts:  0,
			TamperDetections:    0,
			ReplayAttempts:      0,
			ScoringFormula:      "Base(5000) = 5000 bps (uncalibrated neutral baseline)",
			Explanation:         "New agent with zero verifiable audit records. Treated as UNKNOWN until evidence is observed.",
			EvaluatedAt:         now,
		}
	}

	// 2. Empirical Statistical Confidence based on sample size
	var confidence TrustConfidence
	if totalAgentEvents < 5 {
		confidence = ConfidenceLow
	} else if totalAgentEvents < 15 {
		confidence = ConfidenceMedium
	} else {
		confidence = ConfidenceHigh
	}

	// 3. Documented Deterministic Scoring Formula:
	// Base: 5,000 basis points
	// Success bonus: +100 bps per success, capped at +3,500 bps (max positive 8,500 bps)
	// Policy violation penalty: -1,500 bps per violation
	// Over-budget attempt penalty: -1,000 bps per occurrence
	// Replay attempt penalty: -2,000 bps per occurrence
	// Tampering detection penalty: -4,000 bps per occurrence
	base := int64(5000)

	successBonus := int64(successes * 100)
	if successBonus > 3500 {
		successBonus = 3500
	}

	violationPenalty := int64(violations * 1500)
	overBudgetPenalty := int64(overBudget * 1000)
	replayPenalty := int64(replays * 2000)
	tamperPenalty := int64(tampering * 4000)

	rawScore := base + successBonus - violationPenalty - overBudgetPenalty - replayPenalty - tamperPenalty

	// Strict bounding [0, 10000]
	scoreBps := rawScore
	if scoreBps < 0 {
		scoreBps = 0
	} else if scoreBps > 10000 {
		scoreBps = 10000
	}

	// Tier classification
	var tier string
	if tamperPenalty > 0 || replayPenalty > 0 || scoreBps < 2000 {
		tier = "FLAGGED"
	} else if scoreBps < 6000 {
		tier = "PROBATIONARY"
	} else if scoreBps >= 8000 && confidence == ConfidenceHigh {
		tier = "TRUSTED"
	} else {
		tier = "VERIFIED"
	}

	formula := fmt.Sprintf(
		"Base(5000) + SuccessBonus(%d) - Violations(%d) - OverBudget(%d) - Replays(%d) - Tampering(%d) = %d bps",
		successBonus,
		violationPenalty,
		overBudgetPenalty,
		replayPenalty,
		tamperPenalty,
		scoreBps,
	)

	explanation := fmt.Sprintf(
		"Agent %s has %d verifiable events (%d successes, %d violations). Confidence: %s. Tier: %s.",
		cleanID,
		totalAgentEvents,
		successes,
		violations,
		confidence,
		tier,
	)

	return &AgentTrustScore{
		AgentID:             cleanID,
		ScoreBps:            scoreBps,
		TrustTier:           tier,
		Confidence:          confidence,
		TotalRecordedEvents: totalAgentEvents,
		SuccessfulActions:   successes,
		PolicyViolations:    violations,
		OverBudgetAttempts:  overBudget,
		TamperDetections:    tampering,
		ReplayAttempts:      replays,
		ScoringFormula:      formula,
		Explanation:         explanation,
		EvaluatedAt:         now,
	}
}
