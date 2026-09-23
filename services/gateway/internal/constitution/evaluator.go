package constitution

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"sort"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

// Evaluator defines the interface for deterministic, pure constitutional evaluation.
type Evaluator interface {
	Evaluate(constitution *EconomicConstitution, evalCtx PolicyEvaluationContext) ConstitutionDecision
}

// DefaultEvaluator implements Evaluator with zero side-effects and fail-closed security.
type DefaultEvaluator struct{}

// NewEvaluator creates a new DefaultEvaluator instance.
func NewEvaluator() *DefaultEvaluator {
	return &DefaultEvaluator{}
}

// Evaluate performs deterministic evaluation of an action against an EconomicConstitution.
// INVARIANT INV-43: Identical constitution + identical context = identical decision.
// INVARIANT INV-53: Zero financial side-effects, zero state mutations, zero network I/O.
func (e *DefaultEvaluator) Evaluate(c *EconomicConstitution, ctx PolicyEvaluationContext) ConstitutionDecision {
	evalTime := ctx.Timestamp
	if evalTime.IsZero() {
		evalTime = time.Now().UTC()
	}

	decision := ConstitutionDecision{
		ConstitutionID: c.ConstitutionID,
		Version:        c.Version,
		Decision:       domain.DecisionAllow,
		ReasonCode:     domain.ReasonApproved,
		Reason:         "Action conforms with all constitutional policy invariants.",
		MatchedRules:   make([]string, 0),
		DeniedRules:    make([]string, 0),
		ApprovalRules:  make([]string, 0),
		EvaluatedAt:    evalTime,
	}

	// -------------------------------------------------------------------------
	// 1. EMERGENCY KILL SWITCHES (Fail-Closed)
	// -------------------------------------------------------------------------
	if ctx.IsGlobalPaused {
		decision.Decision = domain.DecisionDeny
		decision.ReasonCode = domain.ReasonGlobalPaused
		decision.Reason = "Emergency global execution halt is active across all organizations."
		decision.DeniedRules = append(decision.DeniedRules, "GLOBAL_PAUSED")
		decision.Explanation = "Blocked: System is currently in emergency global pause."
		decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
		return decision
	}

	if ctx.IsOrganizationPaused {
		decision.Decision = domain.DecisionDeny
		decision.ReasonCode = domain.ReasonOrganizationPaused
		decision.Reason = fmt.Sprintf("Organization '%s' execution is paused by emergency controller.", ctx.OrganizationID)
		decision.DeniedRules = append(decision.DeniedRules, "ORGANIZATION_PAUSED")
		decision.Explanation = fmt.Sprintf("Blocked: Organization '%s' is paused.", ctx.OrganizationID)
		decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
		return decision
	}

	if ctx.IsAgentPaused {
		decision.Decision = domain.DecisionDeny
		decision.ReasonCode = domain.ReasonAgentPaused
		decision.Reason = fmt.Sprintf("Agent '%s' execution is paused by administrative kill switch.", ctx.AgentID)
		decision.DeniedRules = append(decision.DeniedRules, "AGENT_PAUSED")
		decision.Explanation = fmt.Sprintf("Blocked: Agent '%s' is paused.", ctx.AgentID)
		decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
		return decision
	}

	// -------------------------------------------------------------------------
	// 2. HARD DENY INVARIANTS (INV-45: Hard DENY cannot be overridden)
	// -------------------------------------------------------------------------
	// Check Currency Asset
	if ctx.Currency != "" && strings.ToUpper(ctx.Currency) != "USDC" {
		decision.Decision = domain.DecisionDeny
		decision.ReasonCode = domain.ReasonAssetBlocked
		decision.Reason = fmt.Sprintf("Asset '%s' is prohibited. Only Arc USDC is authorized for settlement.", ctx.Currency)
		decision.DeniedRules = append(decision.DeniedRules, "HARD_DENY_UNAUTHORIZED_TOKEN")
		decision.Explanation = "Blocked: Only USDC settlement on Arc is permitted by the constitution."
		decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
		return decision
	}

	// Check Delegation Depth Limit (INV-NET-2 / Hard Deny)
	if ctx.DelegationDepth > 3 {
		decision.Decision = domain.DecisionDeny
		decision.ReasonCode = "DELEGATION_DEPTH_EXCEEDED"
		decision.Reason = fmt.Sprintf("Delegation depth %d exceeds maximum allowable constitutional limit of 3.", ctx.DelegationDepth)
		decision.DeniedRules = append(decision.DeniedRules, "HARD_DENY_DELEGATION_OVERFLOW")
		decision.Explanation = fmt.Sprintf("Blocked: Subcontract depth %d exceeds constitutional ceiling of 3.", ctx.DelegationDepth)
		decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
		return decision
	}

	// Check explicit Hard Deny rules
	for _, hdr := range c.HardDenyRules {
		if hdr.MatchCondition == "BLOCKED_SERVICE" && ctx.ServiceID != "" {
			// Checked in recipient rules below
		}
	}

	// -------------------------------------------------------------------------
	// 3. PARSE FINANCIAL AMOUNTS (Checked big.Int Arithmetic)
	// -------------------------------------------------------------------------
	amount := new(big.Int)
	if ctx.Amount != "" {
		var ok bool
		amount, ok = amount.SetString(ctx.Amount, 10)
		if !ok || amount.Sign() < 0 {
			decision.Decision = domain.DecisionDeny
			decision.ReasonCode = domain.ReasonInvalidAmount
			decision.Reason = "Transaction amount must be a non-negative integer string."
			decision.DeniedRules = append(decision.DeniedRules, "INVALID_AMOUNT")
			decision.Explanation = "Blocked: Malformed or negative transaction amount."
			decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
			return decision
		}
	}

	// -------------------------------------------------------------------------
	// 4. SORT RULES BY PRIORITY (Deterministic Processing Order)
	// -------------------------------------------------------------------------
	rules := make([]ConstitutionRule, len(c.Rules))
	copy(rules, c.Rules)
	sort.Slice(rules, func(i, j int) bool {
		if rules[i].Priority != rules[j].Priority {
			return rules[i].Priority > rules[j].Priority // Higher priority first
		}
		return rules[i].RuleID < rules[j].RuleID
	})

	var pendingApprovalReasons []string

	// -------------------------------------------------------------------------
	// 5. EVALUATE RULES IN SEQUENCE
	// -------------------------------------------------------------------------
	for _, r := range rules {
		// A. SPENDING_LIMIT
		if r.Type == RuleTypeSpendingLimit && r.SpendingLimit != nil {
			sl := r.SpendingLimit

			// Max Single Payment
			if sl.MaxSinglePayment != "" {
				maxSingle, ok := new(big.Int).SetString(sl.MaxSinglePayment, 10)
				if ok && amount.Cmp(maxSingle) > 0 {
					decision.Decision = domain.DecisionDeny
					decision.ReasonCode = domain.ReasonAmountExceedsLimit
					decision.Reason = fmt.Sprintf("Amount %s exceeds constitutional single transaction ceiling of %s %s.", ctx.Amount, sl.MaxSinglePayment, sl.Currency)
					decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
					decision.Explanation = fmt.Sprintf("Blocked: Payment of %s %s exceeds per-transaction limit of %s.", formatUnits(ctx.Amount), sl.Currency, formatUnits(sl.MaxSinglePayment))
					decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
					return decision
				}
			}

			// Daily Spend Limit
			if sl.DailyBudgetLimit != "" && ctx.HistoricalDailySpend != "" {
				dailyMax, _ := new(big.Int).SetString(sl.DailyBudgetLimit, 10)
				dailyHist, _ := new(big.Int).SetString(ctx.HistoricalDailySpend, 10)
				projDaily := new(big.Int).Add(dailyHist, amount)
				if dailyMax != nil && projDaily.Cmp(dailyMax) > 0 {
					decision.Decision = domain.DecisionDeny
					decision.ReasonCode = domain.ReasonDailyLimitExceeded
					decision.Reason = fmt.Sprintf("Projected daily spend %s exceeds constitutional daily ceiling of %s %s.", projDaily.String(), sl.DailyBudgetLimit, sl.Currency)
					decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
					decision.Explanation = fmt.Sprintf("Blocked: Projected daily total of %s %s exceeds daily allowance.", formatUnits(projDaily.String()), sl.Currency)
					decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
					return decision
				}
			}

			// Hourly Velocity Limit
			if sl.HourlyVelocityLimit != "" && ctx.HistoricalHourlySpend != "" {
				hourlyMax, _ := new(big.Int).SetString(sl.HourlyVelocityLimit, 10)
				hourlyHist, _ := new(big.Int).SetString(ctx.HistoricalHourlySpend, 10)
				projHourly := new(big.Int).Add(hourlyHist, amount)
				if hourlyMax != nil && projHourly.Cmp(hourlyMax) > 0 {
					decision.Decision = domain.DecisionDeny
					decision.ReasonCode = domain.ReasonHourlyVelocityExceeded
					decision.Reason = fmt.Sprintf("Projected hourly velocity %s exceeds constitutional hourly velocity ceiling of %s %s.", projHourly.String(), sl.HourlyVelocityLimit, sl.Currency)
					decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
					decision.Explanation = "Blocked: Transaction exceeds hourly spending velocity ceiling."
					decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
					return decision
				}
			}

			// Mission Spend Limit
			if sl.MaxMissionSpend != "" && ctx.CurrentMissionSpend != "" {
				mMax, _ := new(big.Int).SetString(sl.MaxMissionSpend, 10)
				mHist, _ := new(big.Int).SetString(ctx.CurrentMissionSpend, 10)
				projMission := new(big.Int).Add(mHist, amount)
				if mMax != nil && projMission.Cmp(mMax) > 0 {
					decision.Decision = domain.DecisionDeny
					decision.ReasonCode = domain.ReasonAmountExceedsLimit
					decision.Reason = fmt.Sprintf("Projected mission spend %s exceeds constitutional mission ceiling of %s.", projMission.String(), sl.MaxMissionSpend)
					decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
					decision.Explanation = "Blocked: Mission budget limit exceeded."
					decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
					return decision
				}
			}

			decision.MatchedRules = append(decision.MatchedRules, r.RuleID)
		}

		// B. RECIPIENT_RULE
		if r.Type == RuleTypeRecipientRule && r.RecipientRule != nil {
			rr := r.RecipientRule

			// Blocked Services
			if ctx.ServiceID != "" && containsStr(rr.BlockedServices, ctx.ServiceID) {
				decision.Decision = domain.DecisionDeny
				decision.ReasonCode = domain.ReasonServiceBlocked
				decision.Reason = fmt.Sprintf("Service '%s' is explicitly blocklisted by constitutional policy.", ctx.ServiceID)
				decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
				decision.Explanation = fmt.Sprintf("Blocked: Service '%s' is prohibited.", ctx.ServiceID)
				decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
				return decision
			}

			// Blocked Capabilities
			if ctx.Capability != "" && containsStr(rr.BlockedCapabilities, ctx.Capability) {
				decision.Decision = domain.DecisionDeny
				decision.ReasonCode = "CAPABILITY_BLOCKED"
				decision.Reason = fmt.Sprintf("Capability '%s' is explicitly blocklisted by constitutional policy.", ctx.Capability)
				decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
				decision.Explanation = fmt.Sprintf("Blocked: Capability '%s' is prohibited.", ctx.Capability)
				decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
				return decision
			}

			// Blocked Agents
			if ctx.ExternalAgentID != "" && containsStr(rr.BlockedAgents, ctx.ExternalAgentID) {
				decision.Decision = domain.DecisionDeny
				decision.ReasonCode = domain.ReasonRecipientBlocked
				decision.Reason = fmt.Sprintf("External agent '%s' is explicitly blocklisted.", ctx.ExternalAgentID)
				decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
				decision.Explanation = fmt.Sprintf("Blocked: Agent '%s' is blocklisted.", ctx.ExternalAgentID)
				decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
				return decision
			}

			decision.MatchedRules = append(decision.MatchedRules, r.RuleID)
		}

		// C. RISK_RULE
		if r.Type == RuleTypeRiskRule && r.RiskRule != nil {
			rk := r.RiskRule

			// Max Risk Score
			if rk.MaxRiskScore > 0 && ctx.RiskScore > rk.MaxRiskScore {
				decision.Decision = domain.DecisionDeny
				decision.ReasonCode = domain.ReasonRiskHigh
				decision.Reason = fmt.Sprintf("Risk score %d exceeds constitutional risk ceiling of %d.", ctx.RiskScore, rk.MaxRiskScore)
				decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
				decision.Explanation = fmt.Sprintf("Blocked: Risk score (%d) exceeds allowable threshold (%d).", ctx.RiskScore, rk.MaxRiskScore)
				decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
				return decision
			}

			// Max Anomaly Score
			if rk.MaxAnomalyScore > 0 && ctx.AnomalyScore > rk.MaxAnomalyScore {
				decision.Decision = domain.DecisionDeny
				decision.ReasonCode = "ANOMALY_THRESHOLD_EXCEEDED"
				decision.Reason = fmt.Sprintf("Anomaly score %.2f exceeds constitutional tolerance of %.2f.", ctx.AnomalyScore, rk.MaxAnomalyScore)
				decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
				decision.Explanation = "Blocked: High anomaly pattern detected by flight telemetry."
				decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
				return decision
			}

			// Min Counterparty Trust Score
			if rk.MinTrustScoreBps > 0 && ctx.TrustScoreBps > 0 && ctx.TrustScoreBps < rk.MinTrustScoreBps {
				decision.Decision = domain.DecisionDeny
				decision.ReasonCode = "COUNTERPARTY_TRUST_INSUFFICIENT"
				decision.Reason = fmt.Sprintf("Counterparty trust score (%d bps) is below constitutional requirement of %d bps.", ctx.TrustScoreBps, rk.MinTrustScoreBps)
				decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
				decision.Explanation = fmt.Sprintf("Blocked: Counterparty trust score (%0.1f%%) does not meet minimum %0.1f%% threshold.", float64(ctx.TrustScoreBps)/100.0, float64(rk.MinTrustScoreBps)/100.0)
				decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
				return decision
			}

			decision.MatchedRules = append(decision.MatchedRules, r.RuleID)
		}

		// D. DELEGATION_RULE
		if r.Type == RuleTypeDelegationRule && r.DelegationRule != nil {
			dr := r.DelegationRule
			if dr.MaxDelegationDepth > 0 && ctx.DelegationDepth > dr.MaxDelegationDepth {
				decision.Decision = domain.DecisionDeny
				decision.ReasonCode = "DELEGATION_DEPTH_EXCEEDED"
				decision.Reason = fmt.Sprintf("Delegation depth %d exceeds rule ceiling of %d.", ctx.DelegationDepth, dr.MaxDelegationDepth)
				decision.DeniedRules = append(decision.DeniedRules, r.RuleID)
				decision.Explanation = "Blocked: Exceeded maximum allowed subcontracting depth."
				decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
				return decision
			}
			decision.MatchedRules = append(decision.MatchedRules, r.RuleID)
		}

		// E. APPROVAL_RULE
		if r.Type == RuleTypeApprovalRule && r.ApprovalRule != nil {
			ar := r.ApprovalRule

			// Threshold trigger
			if ar.AmountThreshold != "" {
				thresh, ok := new(big.Int).SetString(ar.AmountThreshold, 10)
				if ok && amount.Cmp(thresh) > 0 {
					decision.ApprovalRules = append(decision.ApprovalRules, r.RuleID)
					pendingApprovalReasons = append(pendingApprovalReasons, fmt.Sprintf("Amount of %s %s exceeds autonomous authorization threshold of %s", formatUnits(ctx.Amount), ctx.Currency, formatUnits(ar.AmountThreshold)))
				}
			}

			// External agent trigger
			if ar.RequireOnExternalAgent && ctx.ExternalAgentID != "" {
				decision.ApprovalRules = append(decision.ApprovalRules, r.RuleID)
				pendingApprovalReasons = append(pendingApprovalReasons, fmt.Sprintf("Counterparty is an external agent ('%s')", ctx.ExternalAgentID))
			}

			// High risk capability trigger
			if ar.RequireOnHighRiskCapability && (ctx.RiskLevel == "HIGH" || strings.Contains(strings.ToLower(ctx.Capability), "arbitrage") || strings.Contains(strings.ToLower(ctx.Capability), "liquidation")) {
				decision.ApprovalRules = append(decision.ApprovalRules, r.RuleID)
				pendingApprovalReasons = append(pendingApprovalReasons, fmt.Sprintf("Capability '%s' is classified as high-risk execution", ctx.Capability))
			}

			decision.MatchedRules = append(decision.MatchedRules, r.RuleID)
		}
	}

	// -------------------------------------------------------------------------
	// 6. FINALIZE DECISION (APPROVAL vs ALLOW)
	// -------------------------------------------------------------------------
	if len(decision.ApprovalRules) > 0 {
		decision.Decision = domain.DecisionApprovalRequired
		decision.ReasonCode = domain.ReasonApprovalRequired
		decision.Reason = "Action requires explicit human approval under constitutional governance rules."
		decision.Explanation = fmt.Sprintf("Human Approval Required: %s.", strings.Join(pendingApprovalReasons, "; "))
	} else {
		decision.Explanation = fmt.Sprintf("Authorized: Payment of %s %s conforms to all active constitutional limits.", formatUnits(ctx.Amount), ctx.Currency)
	}

	decision.EvaluationHash = e.computeEvaluationHash(decision, ctx)
	return decision
}

func (e *DefaultEvaluator) computeEvaluationHash(d ConstitutionDecision, ctx PolicyEvaluationContext) string {
	obj := struct {
		ConstitutionID string `json:"constitution_id"`
		Version        uint64 `json:"version"`
		Decision       string `json:"decision"`
		ReasonCode     string `json:"reason_code"`
		Amount         string `json:"amount"`
		Currency       string `json:"currency"`
		AgentID        string `json:"agent_id"`
		OrganizationID string `json:"organization_id"`
	}{
		ConstitutionID: d.ConstitutionID,
		Version:        d.Version,
		Decision:       string(d.Decision),
		ReasonCode:     string(d.ReasonCode),
		Amount:         ctx.Amount,
		Currency:       ctx.Currency,
		AgentID:        ctx.AgentID,
		OrganizationID: ctx.OrganizationID,
	}
	bytes, _ := json.Marshal(obj)
	h := sha256.Sum256(bytes)
	return hex.EncodeToString(h[:])
}

func containsStr(slice []string, val string) bool {
	for _, item := range slice {
		if strings.EqualFold(item, val) {
			return true
		}
	}
	return false
}

func formatUnits(baseUnits string) string {
	b, ok := new(big.Int).SetString(baseUnits, 10)
	if !ok || b == nil {
		return baseUnits
	}
	f := new(big.Float).Quo(new(big.Float).SetInt(b), big.NewFloat(1e6))
	return f.Text('f', 2)
}
