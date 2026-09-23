package simulation

import (
	"context"
	"fmt"
	"math/big"
	"time"
)

// CounterfactualEngine orchestrates what-if analysis and baseline comparisons.
type CounterfactualEngine struct {
	engine *SimulationEngine
}

// NewCounterfactualEngine creates a new CounterfactualEngine.
func NewCounterfactualEngine(engine *SimulationEngine) *CounterfactualEngine {
	return &CounterfactualEngine{engine: engine}
}

// RunCounterfactual takes a baseline simulation run, applies scenario modifications, and executes an isolated comparative run.
func (ce *CounterfactualEngine) RunCounterfactual(
	ctx context.Context,
	baselineRunID string,
	perturbation SimulationScenario,
	description string,
) (*CounterfactualComparison, *SimulationRun, error) {
	baseline, ok := ce.engine.GetRun(baselineRunID)
	if !ok {
		return nil, nil, fmt.Errorf("baseline simulation run '%s' not found", baselineRunID)
	}

	// Clone scenario from baseline, overlay perturbations
	cfScenario := baseline.Scenario
	cfScenario.ID = fmt.Sprintf("cf_%d", time.Now().UnixNano())
	cfScenario.Name = fmt.Sprintf("Counterfactual: %s", description)

	if perturbation.Budget != "" {
		cfScenario.Budget = perturbation.Budget
	}
	if perturbation.DeadlineSeconds > 0 {
		cfScenario.DeadlineSeconds = perturbation.DeadlineSeconds
	}
	if perturbation.FailureProfile != "" {
		cfScenario.FailureProfile = perturbation.FailureProfile
	}
	if len(perturbation.InjectedFailures) > 0 {
		cfScenario.InjectedFailures = perturbation.InjectedFailures
	}
	if perturbation.PriceMultiplier > 0 {
		cfScenario.PriceMultiplier = perturbation.PriceMultiplier
	}
	if perturbation.PolicyThreshold != "" {
		cfScenario.PolicyThreshold = perturbation.PolicyThreshold
	}

	// Create and execute counterfactual run
	cfRun, err := ce.engine.CreateRun(ctx, cfScenario, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create counterfactual run: %w", err)
	}

	// Reuse snapshot from baseline for consistency
	if baseline.Snapshot != nil {
		cfRun.Snapshot = baseline.Snapshot
		cfRun.ConfigurationVersion = baseline.Snapshot.Version
	}

	executedCfRun, err := ce.engine.Run(ctx, cfRun.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("counterfactual execution failed: %w", err)
	}

	// Compute deltas
	baseSpendBig, _ := new(big.Int).SetString(baseline.Economics.ProjectedSpend, 10)
	cfSpendBig, _ := new(big.Int).SetString(executedCfRun.Economics.ProjectedSpend, 10)
	if baseSpendBig == nil {
		baseSpendBig = big.NewInt(0)
	}
	if cfSpendBig == nil {
		cfSpendBig = big.NewInt(0)
	}

	deltaSpendBig := new(big.Int).Sub(cfSpendBig, baseSpendBig)
	deltaSign := "+"
	if deltaSpendBig.Sign() < 0 {
		deltaSign = ""
	}

	deltaApprovals := executedCfRun.Economics.ApprovalCount - baseline.Economics.ApprovalCount
	deltaDuration := executedCfRun.DurationMs - baseline.DurationMs

	riskChange := "UNCHANGED"
	if executedCfRun.Economics.RiskScore > baseline.Economics.RiskScore {
		riskChange = fmt.Sprintf("INCREASED (+%d pts)", executedCfRun.Economics.RiskScore-baseline.Economics.RiskScore)
	} else if executedCfRun.Economics.RiskScore < baseline.Economics.RiskScore {
		riskChange = fmt.Sprintf("DECREASED (-%d pts)", baseline.Economics.RiskScore-executedCfRun.Economics.RiskScore)
	}

	comparison := &CounterfactualComparison{
		BaselineRunID:            baseline.ID,
		CounterfactualRunID:      executedCfRun.ID,
		PerturbationDescription: description,
		BaselineSpend:            baseline.Economics.ProjectedSpend,
		CounterfactualSpend:      executedCfRun.Economics.ProjectedSpend,
		DeltaSpend:               fmt.Sprintf("%s%s", deltaSign, formatUnits(deltaSpendBig.String())),
		BaselineApprovals:        baseline.Economics.ApprovalCount,
		CounterfactualApprovals:  executedCfRun.Economics.ApprovalCount,
		DeltaApprovals:           deltaApprovals,
		BaselineDurationMs:       baseline.DurationMs,
		CounterfactualDurationMs: executedCfRun.DurationMs,
		BaselineCompletion:       baseline.Status,
		CounterfactualCompletion: executedCfRun.Status,
		RiskChange:               riskChange,
		Explanation: fmt.Sprintf("Perturbation '%s' resulted in %s spend delta, %d approval delta, and %dms duration delta.",
			description, deltaSpendBig.String(), deltaApprovals, deltaDuration),
	}

	return comparison, executedCfRun, nil
}

// CompareRuns compares any two existing simulation runs.
func (ce *CounterfactualEngine) CompareRuns(runA *SimulationRun, runB *SimulationRun) *CounterfactualComparison {
	baseSpendBig, _ := new(big.Int).SetString(runA.Economics.ProjectedSpend, 10)
	cfSpendBig, _ := new(big.Int).SetString(runB.Economics.ProjectedSpend, 10)
	if baseSpendBig == nil {
		baseSpendBig = big.NewInt(0)
	}
	if cfSpendBig == nil {
		cfSpendBig = big.NewInt(0)
	}

	deltaSpendBig := new(big.Int).Sub(cfSpendBig, baseSpendBig)
	deltaSign := "+"
	if deltaSpendBig.Sign() < 0 {
		deltaSign = ""
	}

	return &CounterfactualComparison{
		BaselineRunID:            runA.ID,
		CounterfactualRunID:      runB.ID,
		PerturbationDescription: fmt.Sprintf("Comparison: %s vs %s", runA.Scenario.Name, runB.Scenario.Name),
		BaselineSpend:            runA.Economics.ProjectedSpend,
		CounterfactualSpend:      runB.Economics.ProjectedSpend,
		DeltaSpend:               fmt.Sprintf("%s%s", deltaSign, formatUnits(deltaSpendBig.String())),
		BaselineApprovals:        runA.Economics.ApprovalCount,
		CounterfactualApprovals:  runB.Economics.ApprovalCount,
		DeltaApprovals:           runB.Economics.ApprovalCount - runA.Economics.ApprovalCount,
		BaselineDurationMs:       runA.DurationMs,
		CounterfactualDurationMs: runB.DurationMs,
		BaselineCompletion:       runA.Status,
		CounterfactualCompletion: runB.Status,
		RiskChange:               fmt.Sprintf("%d -> %d pts", runA.Economics.RiskScore, runB.Economics.RiskScore),
		Explanation:              "Comparative economic variance between simulation runs.",
	}
}
