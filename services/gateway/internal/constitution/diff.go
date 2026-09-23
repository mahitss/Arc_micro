package constitution

import (
	"fmt"
	"math/big"
	"strings"
)

// PolicyDiffEngine analyzes differences between two EconomicConstitutions.
type PolicyDiffEngine struct{}

// NewPolicyDiffEngine creates a new PolicyDiffEngine.
func NewPolicyDiffEngine() *PolicyDiffEngine {
	return &PolicyDiffEngine{}
}

// Diff compares an existing constitution (old) against a candidate constitution (new).
func (e *PolicyDiffEngine) Diff(oldConst, newConst *EconomicConstitution) PolicyDiff {
	diff := PolicyDiff{
		OldVersion:     oldConst.Version,
		NewVersion:     newConst.Version,
		AddedRules:     make([]ConstitutionRule, 0),
		RemovedRules:   make([]ConstitutionRule, 0),
		ModifiedRules:  make([]RuleModification, 0),
		UnchangedRules: make([]ConstitutionRule, 0),
	}

	oldMap := make(map[string]ConstitutionRule)
	for _, r := range oldConst.Rules {
		oldMap[r.RuleID] = r
	}

	newMap := make(map[string]ConstitutionRule)
	for _, r := range newConst.Rules {
		newMap[r.RuleID] = r
	}

	// 1. Identify Added or Modified Rules
	for id, newR := range newMap {
		oldR, exists := oldMap[id]
		if !exists {
			diff.AddedRules = append(diff.AddedRules, newR)
			continue
		}

		mod, isModified := e.compareRule(oldR, newR)
		if isModified {
			diff.ModifiedRules = append(diff.ModifiedRules, mod)
		} else {
			diff.UnchangedRules = append(diff.UnchangedRules, newR)
		}
	}

	// 2. Identify Removed Rules
	for id, oldR := range oldMap {
		if _, exists := newMap[id]; !exists {
			diff.RemovedRules = append(diff.RemovedRules, oldR)
		}
	}

	// 3. Compute Quantitative Authority Delta
	diff.AuthorityDelta = e.CalculateAuthorityDelta(oldConst, newConst, diff)

	return diff
}

func (e *PolicyDiffEngine) compareRule(oldR, newR ConstitutionRule) (RuleModification, bool) {
	mod := RuleModification{
		RuleID:      oldR.RuleID,
		Type:        oldR.Type,
		Description: newR.Description,
		ChangeType:  "NEUTRAL",
	}

	// Spending Limit changes
	if oldR.Type == RuleTypeSpendingLimit && oldR.SpendingLimit != nil && newR.SpendingLimit != nil {
		oldL := oldR.SpendingLimit
		newL := newR.SpendingLimit
		if oldL.MaxSinglePayment != newL.MaxSinglePayment || oldL.DailyBudgetLimit != newL.DailyBudgetLimit || oldL.MaxMissionSpend != newL.MaxMissionSpend {
			mod.OldDetails = fmt.Sprintf("Single: %s, Daily: %s, Mission: %s", oldL.MaxSinglePayment, oldL.DailyBudgetLimit, oldL.MaxMissionSpend)
			mod.NewDetails = fmt.Sprintf("Single: %s, Daily: %s, Mission: %s", newL.MaxSinglePayment, newL.DailyBudgetLimit, newL.MaxMissionSpend)

			oldSingle, _ := new(big.Int).SetString(oldL.MaxSinglePayment, 10)
			newSingle, _ := new(big.Int).SetString(newL.MaxSinglePayment, 10)
			if oldSingle != nil && newSingle != nil {
				if newSingle.Cmp(oldSingle) > 0 {
					mod.ChangeType = "AUTHORITY_INCREASE"
				} else if newSingle.Cmp(oldSingle) < 0 {
					mod.ChangeType = "AUTHORITY_DECREASE"
				}
			}
			return mod, true
		}
	}

	// Delegation changes
	if oldR.Type == RuleTypeDelegationRule && oldR.DelegationRule != nil && newR.DelegationRule != nil {
		if oldR.DelegationRule.MaxDelegationDepth != newR.DelegationRule.MaxDelegationDepth {
			mod.OldDetails = fmt.Sprintf("Max Depth: %d", oldR.DelegationRule.MaxDelegationDepth)
			mod.NewDetails = fmt.Sprintf("Max Depth: %d", newR.DelegationRule.MaxDelegationDepth)
			if newR.DelegationRule.MaxDelegationDepth > oldR.DelegationRule.MaxDelegationDepth {
				mod.ChangeType = "AUTHORITY_INCREASE"
			} else {
				mod.ChangeType = "AUTHORITY_DECREASE"
			}
			return mod, true
		}
	}

	// Approval Rule changes
	if oldR.Type == RuleTypeApprovalRule && oldR.ApprovalRule != nil && newR.ApprovalRule != nil {
		oldA := oldR.ApprovalRule
		newA := newR.ApprovalRule
		if oldA.AmountThreshold != newA.AmountThreshold {
			mod.OldDetails = fmt.Sprintf("Approval Threshold: %s", oldA.AmountThreshold)
			mod.NewDetails = fmt.Sprintf("Approval Threshold: %s", newA.AmountThreshold)
			oldT, _ := new(big.Int).SetString(oldA.AmountThreshold, 10)
			newT, _ := new(big.Int).SetString(newA.AmountThreshold, 10)
			if oldT != nil && newT != nil {
				// Increasing approval threshold means FEWER things require approval (AUTHORITY_INCREASE / more permissive)
				if newT.Cmp(oldT) > 0 {
					mod.ChangeType = "AUTHORITY_INCREASE"
				} else {
					mod.ChangeType = "AUTHORITY_DECREASE"
				}
			}
			return mod, true
		}
	}

	// Risk Rule changes
	if oldR.Type == RuleTypeRiskRule && oldR.RiskRule != nil && newR.RiskRule != nil {
		if oldR.RiskRule.MaxRiskScore != newR.RiskRule.MaxRiskScore {
			mod.OldDetails = fmt.Sprintf("Max Risk Score: %d", oldR.RiskRule.MaxRiskScore)
			mod.NewDetails = fmt.Sprintf("Max Risk Score: %d", newR.RiskRule.MaxRiskScore)
			if newR.RiskRule.MaxRiskScore > oldR.RiskRule.MaxRiskScore {
				mod.ChangeType = "AUTHORITY_INCREASE"
			} else {
				mod.ChangeType = "AUTHORITY_DECREASE"
			}
			return mod, true
		}
	}

	return mod, false
}

// CalculateAuthorityDelta evaluates whether Constitution B expands, narrows, or maintains financial authority.
func (e *PolicyDiffEngine) CalculateAuthorityDelta(oldC, newC *EconomicConstitution, diff PolicyDiff) AuthorityDelta {
	delta := AuthorityDelta{
		Classification: "UNCHANGED",
		SpendingDelta:  "No net spend ceiling change",
		RecipientDelta: "Recipient allowlist unchanged",
		DelegationDelta: "Delegation limits unchanged",
		RiskToleranceDelta: "Risk thresholds unchanged",
		ApprovalDelta:  "Approval thresholds unchanged",
	}

	var hasIncrease, hasDecrease bool
	var explanations []string

	for _, m := range diff.ModifiedRules {
		if m.ChangeType == "AUTHORITY_INCREASE" {
			hasIncrease = true
			explanations = append(explanations, fmt.Sprintf("Rule %s expanded authority: %s -> %s", m.RuleID, m.OldDetails, m.NewDetails))
		} else if m.ChangeType == "AUTHORITY_DECREASE" {
			hasDecrease = true
			explanations = append(explanations, fmt.Sprintf("Rule %s reduced authority: %s -> %s", m.RuleID, m.OldDetails, m.NewDetails))
		}
	}

	if len(diff.AddedRules) > 0 {
		explanations = append(explanations, fmt.Sprintf("%d new rules added", len(diff.AddedRules)))
	}
	if len(diff.RemovedRules) > 0 {
		hasIncrease = true
		explanations = append(explanations, fmt.Sprintf("%d rules removed (potential authority expansion)", len(diff.RemovedRules)))
	}

	if hasIncrease && !hasDecrease {
		delta.Classification = "MORE_PERMISSIVE"
	} else if hasDecrease && !hasIncrease {
		delta.Classification = "MORE_RESTRICTIVE"
	} else if hasIncrease && hasDecrease {
		delta.Classification = "MORE_PERMISSIVE" // Mixed expansion treats as more permissive for safety
	}

	if len(explanations) > 0 {
		delta.Explanation = strings.Join(explanations, "; ")
	} else {
		delta.Explanation = "No functional changes in financial authority or security boundaries."
	}

	return delta
}
