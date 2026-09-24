package fabric

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ReplanRequest contains the delta parameters for a proposed plan change
type ReplanRequest struct {
	Reason               string   `json:"reason"`
	NewProviderCandidate string   `json:"new_provider_candidate,omitempty"`
	NewAgentCandidate    string   `json:"new_agent_candidate,omitempty"`
	RequestedBudgetUSDC  float64  `json:"requested_budget_usdc,omitempty"`
	BypassApproval       bool     `json:"bypass_approval,omitempty"`
	AllowedProviders     []string `json:"allowed_providers,omitempty"`
	AllowedAgents        []string `json:"allowed_agents,omitempty"`
}

// ControlledReplanner manages versioned, safe execution blueprint adjustments
type ControlledReplanner struct {
	maxReplans int
}

// NewControlledReplanner creates a new replanner instance
func NewControlledReplanner(maxReplans int) *ControlledReplanner {
	if maxReplans <= 0 {
		maxReplans = 3
	}
	return &ControlledReplanner{maxReplans: maxReplans}
}

// Replan calculates a new version of the ExecutionBlueprint while strictly preserving financial barriers
func (r *ControlledReplanner) Replan(ctx context.Context, currentBP *ExecutionBlueprint, req ReplanRequest) (*ExecutionBlueprint, *BlueprintVersion, error) {
	if currentBP == nil {
		return nil, nil, fmt.Errorf("current blueprint cannot be nil")
	}

	// 1. Bound check: max replans
	if currentBP.Version >= r.maxReplans {
		return nil, nil, fmt.Errorf("maximum replan limit reached (%d); human escalation required", r.maxReplans)
	}

	// 2. Reject attempts to self-increase budget (INV-143, INV-148)
	if req.RequestedBudgetUSDC > currentBP.EconomicEnvelope.MaxTotalCostUSDC {
		return nil, nil, fmt.Errorf("%w: requested budget %.2f exceeds current limit %.2f", ErrBlueprintCannotIncreaseLimits, req.RequestedBudgetUSDC, currentBP.EconomicEnvelope.MaxTotalCostUSDC)
	}

	// 3. Reject attempts to bypass approval via replanning (INV-145)
	if req.BypassApproval {
		return nil, nil, fmt.Errorf("%w: replanning cannot bypass or disable human approval", ErrReplanningCannotWeakenPolicy)
	}

	// 4. Validate Provider Substitution against Policy (INV-146)
	if req.NewProviderCandidate != "" && len(req.AllowedProviders) > 0 {
		if err := ValidateINV146(req.NewProviderCandidate, req.AllowedProviders); err != nil {
			return nil, nil, err
		}
	}

	// 5. Validate Agent Substitution against Policy (INV-147)
	if req.NewAgentCandidate != "" && len(req.AllowedAgents) > 0 {
		if err := ValidateINV147(req.NewAgentCandidate, req.AllowedAgents); err != nil {
			return nil, nil, err
		}
	}

	// Create cloned updated blueprint with incremented version
	newVersion := currentBP.Version + 1
	newBP := *currentBP
	newBP.Version = newVersion
	newBP.Status = "ACTIVE"
	newBP.SimulationStale = true // Forces re-simulation check (INV-144)

	diffSummary := make(map[string]interface{})
	diffSummary["previous_version"] = currentBP.Version
	diffSummary["new_version"] = newVersion
	diffSummary["reason"] = req.Reason

	// Apply operational substitutions
	if req.NewProviderCandidate != "" {
		newBP.ServiceCandidates = append([]string{req.NewProviderCandidate}, newBP.ServiceCandidates...)
		diffSummary["substituted_provider"] = req.NewProviderCandidate
	}
	if req.NewAgentCandidate != "" {
		newBP.AgentAssignments["primary"] = req.NewAgentCandidate
		diffSummary["substituted_agent"] = req.NewAgentCandidate
	}

	versionRecord := &BlueprintVersion{
		VersionID:                  fmt.Sprintf("bp_ver_%s", uuid.New().String()[:8]),
		BlueprintID:                currentBP.BlueprintID,
		ObjectiveID:                currentBP.ObjectiveID,
		Version:                    newVersion,
		DiffSummary:                diffSummary,
		ReplanReason:               req.Reason,
		PolicyRevalidationRequired: true,
		CreatedAt:                  time.Now().UTC(),
	}

	return &newBP, versionRecord, nil
}
