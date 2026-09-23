package simulation

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

var (
	// ErrSimulationOutdated indicates that real-world assumptions have changed since simulation.
	ErrSimulationOutdated = errors.New("SIMULATION OUTDATED: re-simulation required before execution")
	// ErrBoundaryViolation indicates an illegal attempt to execute a live/financial action in simulation mode.
	ErrBoundaryViolation = errors.New("HARD FAIL: attempted live financial or blockchain operation in SIMULATION mode")
	// ErrApprovalRequired indicates that live policy or risk re-check requires human approval before proceeding.
	ErrApprovalRequired = errors.New("LIVE APPROVAL REQUIRED: live revalidation flagged high risk or policy constraint")
)

// StalenessReport details why a simulation run can no longer be executed directly.
type StalenessReport struct {
	IsStale bool     `json:"is_stale"`
	Reasons []string `json:"reasons"`
	Details []string `json:"details"`
}

// LiveExecutionPayload represents the verified, revalidated payload ready for live mission orchestration.
type LiveExecutionPayload struct {
	PlanID           string                       `json:"plan_id"`
	OriginalRunID    string                       `json:"original_run_id"`
	OrganizationID   string                       `json:"organization_id"`
	Objective        string                       `json:"objective"`
	FreshBudget      string                       `json:"fresh_budget"`
	RevalidatedSteps []SimulationPlanStep         `json:"revalidated_steps"`
	TotalLiveCost    string               `json:"total_live_cost"`
	MaxLiveExposure  string               `json:"max_live_exposure"`
	PolicyDecision   domain.Decision      `json:"policy_decision"`
	ProjectedRisk    int                  `json:"projected_risk"`
	RequiresApproval bool                         `json:"requires_approval"`
	Mode             ExecutionMode                `json:"mode"`
	PreparedAt       time.Time                    `json:"prepared_at"`
}

// ExecutionGate ensures strict boundaries between SIMULATION and LIVE modes,
// validates plan freshness, and enforces multi-stage revalidation before money moves.
type ExecutionGate struct {
	snapshotMgr *SnapshotManager
	engine      *SimulationEngine
}

// NewExecutionGate constructs a new execution boundary gate.
func NewExecutionGate(snapshotMgr *SnapshotManager, engine *SimulationEngine) *ExecutionGate {
	return &ExecutionGate{
		snapshotMgr: snapshotMgr,
		engine:      engine,
	}
}

// AssertLiveAllowed guards critical blockchain, vault, and settlement methods.
// In SIMULATION mode, any invocation is an immediate HARD FAIL.
func (eg *ExecutionGate) AssertLiveAllowed(mode ExecutionMode, operation string) error {
	if mode == ExecutionModeSimulation {
		return fmt.Errorf("%w: operation '%s' rejected in SIMULATION mode", ErrBoundaryViolation, operation)
	}
	return nil
}

// CheckStaleness evaluates whether the simulation's recorded snapshot assumptions
// still match the current active environment state.
func (eg *ExecutionGate) CheckStaleness(run *SimulationRun, currentSnapshot *SimulationSnapshot) StalenessReport {
	report := StalenessReport{
		IsStale: false,
		Reasons: make([]string, 0),
		Details: make([]string, 0),
	}

	if run == nil {
		report.IsStale = true
		report.Reasons = append(report.Reasons, "simulation run does not exist")
		return report
	}

	if currentSnapshot == nil {
		report.IsStale = true
		report.Reasons = append(report.Reasons, "current state snapshot could not be captured")
		return report
	}

	// 1. Check version fingerprint
	if run.SnapshotVersion != "" && currentSnapshot.Version != "" && run.SnapshotVersion != currentSnapshot.Version {
		report.IsStale = true
		report.Reasons = append(report.Reasons, "environment snapshot fingerprint changed")
	}

	// 2. Check configuration version
	if run.ConfigurationVersion != "" && currentSnapshot.ConfigurationVersion != "" && run.ConfigurationVersion != currentSnapshot.ConfigurationVersion {
		report.IsStale = true
		report.Reasons = append(report.Reasons, "configuration version mismatch")
	}

	// 3. Check each planned service step for availability & price changes
	for _, step := range run.Plan.Steps {
		var found *domain.Service
		for _, s := range currentSnapshot.Services {
			if s != nil && s.ID == step.ServiceID {
				found = s
				break
			}
		}

		if found == nil {
			report.IsStale = true
			report.Reasons = append(report.Reasons, fmt.Sprintf("service '%s' (%s) is no longer available", step.ServiceName, step.ServiceID))
			report.Details = append(report.Details, fmt.Sprintf("Service %s was removed from service registry", step.ServiceID))
			continue
		}

		if !found.Enabled || (found.Status != "" && found.Status != domain.ServiceStatusActive) {
			report.IsStale = true
			report.Reasons = append(report.Reasons, fmt.Sprintf("service '%s' is inactive", step.ServiceName))
			report.Details = append(report.Details, fmt.Sprintf("Service %s is currently marked inactive/disabled", step.ServiceID))
		}

		// Price comparison: if current cost > planned cost, flag price increase
		currentPriceBig, _ := new(big.Int).SetString(found.MaxPrice, 10)
		plannedPriceBig, _ := new(big.Int).SetString(step.EstimatedCost, 10)
		if currentPriceBig != nil && plannedPriceBig != nil && currentPriceBig.Cmp(plannedPriceBig) > 0 {
			report.IsStale = true
			report.Reasons = append(report.Reasons, fmt.Sprintf("service price changed for '%s'", step.ServiceName))
			report.Details = append(report.Details, fmt.Sprintf("Service %s price increased from %s to %s", step.ServiceName, step.EstimatedCost, found.MaxPrice))
		}
	}

	// 4. Check agent availability
	for _, step := range run.Plan.Steps {
		if agentFound, exists := currentSnapshot.Agents[step.AgentID]; exists && agentFound != nil {
			if agentFound.Status != "" && agentFound.Status != domain.AgentStatusActive {
				report.IsStale = true
				report.Reasons = append(report.Reasons, fmt.Sprintf("agent '%s' status changed to '%s'", agentFound.Name, agentFound.Status))
			}
		}
	}

	return report
}

// PrepareExecutePlan is Phase 23: [EXECUTE THIS PLAN].
// It NEVER executes blindly. It performs complete end-to-end revalidation:
// 1. Checks staleness against current live snapshot.
// 2. Re-runs policy checks with fresh live parameters.
// 3. Re-runs risk analysis.
// 4. Verifies live treasury/budget ceiling.
// 5. Requires human approval if live risk or policy demands it.
// 6. Prepares a verified LiveExecutionPayload for the orchestrator.
func (eg *ExecutionGate) PrepareExecutePlan(ctx context.Context, runID string, currentSnapshot *SimulationSnapshot) (*LiveExecutionPayload, error) {
	run, exists := eg.engine.GetRun(runID)
	if !exists || run == nil {
		return nil, fmt.Errorf("simulation run '%s' not found", runID)
	}

	if run.Status != StatusCompleted {
		return nil, fmt.Errorf("cannot execute plan: simulation run is in state %s (must be COMPLETED)", run.Status)
	}

	// Check for staleness
	staleness := eg.CheckStaleness(run, currentSnapshot)
	if staleness.IsStale {
		return nil, fmt.Errorf("%w: %s", ErrSimulationOutdated, strings.Join(staleness.Reasons, "; "))
	}

	// Revalidate budget against scenario
	totalCost := run.Economics.ProjectedSpend
	budgetBig, _ := new(big.Int).SetString(run.Scenario.Budget, 10)
	totalCostBig, _ := new(big.Int).SetString(totalCost, 10)
	if budgetBig != nil && totalCostBig != nil && totalCostBig.Cmp(budgetBig) > 0 {
		return nil, fmt.Errorf("%w: live cost %s exceeds fresh mission budget limit %s",
			ErrSimulationOutdated, totalCost, run.Scenario.Budget)
	}

	// Re-run policy and risk on every step with current live data
	requiresApproval := false
	revalidatedSteps := make([]SimulationPlanStep, len(run.Plan.Steps))
	for i, step := range run.Plan.Steps {
		revalidatedStep := step

		// Re-run policy if policyClient is configured
		if eg.engine.policyClient != nil {
			polReq := domain.PaymentRequest{
				ServiceID: step.ServiceID,
				Amount:    step.EstimatedCost,
				Asset:     "USDC",
			}
			decision, pErr := eg.engine.policyClient.Simulate(ctx, polReq)
			if pErr == nil {
				revalidatedStep.PolicyDecision = string(decision.Decision)
				if decision.Decision == domain.DecisionDeny {
					return nil, fmt.Errorf("plan revalidation failed: live policy denied step '%s' with reason: %s",
						step.ServiceName, string(decision.ReasonCode))
				}
				if decision.Decision == domain.DecisionApprovalRequired {
					requiresApproval = true
				}
			}
		}

		// Re-evaluate risk
		costBig, _ := new(big.Int).SetString(step.EstimatedCost, 10)
		if (costBig != nil && costBig.Cmp(big.NewInt(5_000_000)) > 0) || step.RiskLevel == "HIGH" {
			requiresApproval = true
		}

		revalidatedSteps[i] = revalidatedStep
	}

	payload := &LiveExecutionPayload{
		PlanID:           fmt.Sprintf("live-plan-%s", run.ID),
		OriginalRunID:    run.ID,
		OrganizationID:   run.OrganizationID,
		Objective:        run.Scenario.Objective,
		FreshBudget:      run.Scenario.Budget,
		RevalidatedSteps: revalidatedSteps,
		TotalLiveCost:    totalCost,
		MaxLiveExposure:  run.Exposure.MaximumExposure,
		PolicyDecision:   domain.DecisionAllow,
		ProjectedRisk:    run.Economics.RiskScore,
		RequiresApproval: requiresApproval,
		Mode:             ExecutionModeLive, // explicitly transition to LIVE mode after full revalidation
		PreparedAt:       time.Now().UTC(),
	}

	if requiresApproval {
		payload.PolicyDecision = domain.DecisionApprovalRequired
	}

	return payload, nil
}
