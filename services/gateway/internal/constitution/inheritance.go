package constitution

import (
	"errors"
	"fmt"
	"math/big"
	"strings"
)

var (
	// ErrAuthorityEscalation is returned whenever a child scope attempts to declare greater authority than its parent.
	ErrAuthorityEscalation = errors.New("authority escalation violation: child policy cannot exceed parent authority (INV-33..INV-40)")
)

// HierarchyLevel defines the tier of policy in the scope tree.
type HierarchyLevel int

const (
	LevelGlobal HierarchyLevel = iota
	LevelOrganization
	LevelAgent
	LevelMission
	LevelSwarm
	LevelTask
)

// EffectiveScope represents the composed, monotonically reduced financial boundaries for an operational context.
type EffectiveScope struct {
	MaxSinglePayment    string   `json:"max_single_payment"`
	DailyBudgetLimit    string   `json:"daily_budget_limit"`
	HourlyVelocityLimit string   `json:"hourly_velocity_limit"`
	MaxMissionSpend     string   `json:"max_mission_spend"`
	MaxSwarmSpend       string   `json:"max_swarm_spend"`
	Currency            string   `json:"currency"`
	AllowedServices     []string `json:"allowed_services"`
	BlockedServices     []string `json:"blocked_services"`
	ApprovalThreshold   string   `json:"approval_threshold"`
	MaxDelegationDepth  int      `json:"max_delegation_depth"`
}

// InheritanceResolver enforces monotonic authority reduction down the hierarchical policy tree.
type InheritanceResolver struct{}

// NewInheritanceResolver creates a new InheritanceResolver.
func NewInheritanceResolver() *InheritanceResolver {
	return &InheritanceResolver{}
}

// ComposeEffectiveScope takes an organization-level EconomicConstitution and progressively narrows it
// with Agent, Mission, and Swarm scopes. If any child scope attempts to expand limits beyond its parent,
// it fails closed with an ErrAuthorityEscalation error.
func (r *InheritanceResolver) ComposeEffectiveScope(
	orgConstitution *EconomicConstitution,
	agentLimits *SpendingLimitRule,
	missionRule *MissionRule,
	swarmRule *SwarmRule,
) (*EffectiveScope, error) {
	effective := &EffectiveScope{
		Currency:           "USDC",
		MaxDelegationDepth: 3, // Absolute hard cap
		AllowedServices:    make([]string, 0),
		BlockedServices:    make([]string, 0),
	}

	// 1. Extract Organization Baseline
	var orgLimits *SpendingLimitRule
	var orgApproval *ApprovalRule
	for _, rule := range orgConstitution.Rules {
		if rule.Type == RuleTypeSpendingLimit && rule.SpendingLimit != nil {
			orgLimits = rule.SpendingLimit
		}
		if rule.Type == RuleTypeApprovalRule && rule.ApprovalRule != nil {
			orgApproval = rule.ApprovalRule
		}
		if rule.Type == RuleTypeRecipientRule && rule.RecipientRule != nil {
			effective.BlockedServices = append(effective.BlockedServices, rule.RecipientRule.BlockedServices...)
			effective.AllowedServices = append(effective.AllowedServices, rule.RecipientRule.AllowedServices...)
		}
		if rule.Type == RuleTypeDelegationRule && rule.DelegationRule != nil {
			if rule.DelegationRule.MaxDelegationDepth < effective.MaxDelegationDepth {
				effective.MaxDelegationDepth = rule.DelegationRule.MaxDelegationDepth
			}
		}
	}

	if orgLimits != nil {
		effective.MaxSinglePayment = orgLimits.MaxSinglePayment
		effective.DailyBudgetLimit = orgLimits.DailyBudgetLimit
		effective.HourlyVelocityLimit = orgLimits.HourlyVelocityLimit
		effective.MaxMissionSpend = orgLimits.MaxMissionSpend
		effective.MaxSwarmSpend = orgLimits.MaxSwarmSpend
		if orgLimits.Currency != "" {
			effective.Currency = orgLimits.Currency
		}
	}

	if orgApproval != nil {
		effective.ApprovalThreshold = orgApproval.AmountThreshold
	}

	// 2. Compose Agent Scope (Child of Organization)
	if agentLimits != nil {
		// INVARIANT INV-33: Agent cannot increase Organization authority
		if err := validateNonEscalation(effective.MaxSinglePayment, agentLimits.MaxSinglePayment, "agent max single payment"); err != nil {
			return nil, err
		}
		if err := validateNonEscalation(effective.DailyBudgetLimit, agentLimits.DailyBudgetLimit, "agent daily budget"); err != nil {
			return nil, err
		}

		effective.MaxSinglePayment = minAmount(effective.MaxSinglePayment, agentLimits.MaxSinglePayment)
		effective.DailyBudgetLimit = minAmount(effective.DailyBudgetLimit, agentLimits.DailyBudgetLimit)
		effective.HourlyVelocityLimit = minAmount(effective.HourlyVelocityLimit, agentLimits.HourlyVelocityLimit)
	}

	// 3. Compose Mission Scope (Child of Agent)
	if missionRule != nil {
		// INVARIANT INV-34: Mission cannot increase Agent/Org authority
		if missionRule.MaxBudget != "" {
			if err := validateNonEscalation(effective.MaxMissionSpend, missionRule.MaxBudget, "mission budget"); err != nil {
				return nil, err
			}
			effective.MaxMissionSpend = minAmount(effective.MaxMissionSpend, missionRule.MaxBudget)
		}
	}

	// 4. Compose Swarm Scope (Child of Mission)
	if swarmRule != nil {
		// INVARIANT INV-35: Swarm cannot increase Mission authority
		if swarmRule.MaxSwarmBudget != "" {
			parentCap := effective.MaxMissionSpend
			if parentCap == "" {
				parentCap = effective.MaxSwarmSpend
			}
			if err := validateNonEscalation(parentCap, swarmRule.MaxSwarmBudget, "swarm budget"); err != nil {
				return nil, err
			}
			effective.MaxSwarmSpend = minAmount(parentCap, swarmRule.MaxSwarmBudget)
		}
	}

	return effective, nil
}

// validateNonEscalation checks that childAmount <= parentAmount.
func validateNonEscalation(parentAmount, childAmount, fieldName string) error {
	if parentAmount == "" || childAmount == "" {
		return nil
	}
	pVal, pOk := new(big.Int).SetString(parentAmount, 10)
	cVal, cOk := new(big.Int).SetString(childAmount, 10)
	if !pOk || !cOk {
		return fmt.Errorf("%w: invalid numeric amount in %s", ErrAuthorityEscalation, fieldName)
	}

	if cVal.Cmp(pVal) > 0 {
		return fmt.Errorf("%w: %s (%s) exceeds parent ceiling (%s)", ErrAuthorityEscalation, fieldName, childAmount, parentAmount)
	}
	return nil
}

// minAmount returns the strictly lesser of two base-unit amounts.
func minAmount(a, b string) string {
	if a == "" {
		return b
	}
	if b == "" {
		return a
	}
	aInt, aOk := new(big.Int).SetString(a, 10)
	bInt, bOk := new(big.Int).SetString(b, 10)
	if !aOk {
		return b
	}
	if !bOk {
		return a
	}
	if aInt.Cmp(bInt) <= 0 {
		return a
	}
	return b
}

// MergeAllowlists computes the strict intersection of two allowlists.
func MergeAllowlists(parent, child []string) []string {
	if len(parent) == 0 {
		return child
	}
	if len(child) == 0 {
		return parent
	}
	parentSet := make(map[string]struct{}, len(parent))
	for _, p := range parent {
		parentSet[strings.ToLower(p)] = struct{}{}
	}
	var intersection []string
	for _, c := range child {
		if _, exists := parentSet[strings.ToLower(c)]; exists {
			intersection = append(intersection, c)
		}
	}
	return intersection
}

// MergeBlocklists computes the strict union of two blocklists.
func MergeBlocklists(parent, child []string) []string {
	unionMap := make(map[string]string)
	for _, p := range parent {
		unionMap[strings.ToLower(p)] = p
	}
	for _, c := range child {
		unionMap[strings.ToLower(c)] = c
	}
	res := make([]string, 0, len(unionMap))
	for _, val := range unionMap {
		res = append(res, val)
	}
	return res
}
