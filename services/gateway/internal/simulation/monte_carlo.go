package simulation

import (
	"context"
	"fmt"
	"math"
	"math/big"
	"sort"
	"sync"
)

// MonteCarloEngine orchestrates deterministic multi-run economic simulations
// to generate statistical distributions of projected outcomes.
type MonteCarloEngine struct {
	engine *SimulationEngine
}

// NewMonteCarloEngine instantiates a Monte Carlo simulation engine.
func NewMonteCarloEngine(engine *SimulationEngine) *MonteCarloEngine {
	return &MonteCarloEngine{
		engine: engine,
	}
}

// MonteCarloRequest specifies parameters for an N-run stochastic simulation.
type MonteCarloRequest struct {
	Scenario   SimulationScenario `json:"scenario"`
	SnapshotID string             `json:"snapshot_id,omitempty"`
	BaseSeed   int64              `json:"base_seed"`
	Iterations int                `json:"iterations"` // e.g. 50 or 100
}

// RunMonteCarlo executes N deterministic simulations using seeded iterations.
// Each iteration uses `baseSeed + int64(i)*1009` to guarantee 100% reproducibility.
func (mce *MonteCarloEngine) RunMonteCarlo(ctx context.Context, req MonteCarloRequest) (*MonteCarloSummary, error) {
	if req.Iterations <= 0 {
		req.Iterations = 50 // default to 50 iterations
	}
	if req.Iterations > 500 {
		req.Iterations = 500 // cap to prevent excessive resource consumption
	}
	if req.BaseSeed == 0 {
		req.BaseSeed = 1337
	}

	type runResult struct {
		success    bool
		spendUSD   float64
		durationMs int64
		err        error
	}

	results := make([]runResult, req.Iterations)
	var wg sync.WaitGroup
	// Concurrency limiter for local execution
	semaphore := make(chan struct{}, 10)

	for i := 0; i < req.Iterations; i++ {
		wg.Add(1)
		seed := req.BaseSeed + int64(i)*1009 // prime stride for seed divergence
		go func(idx int, runSeed int64) {
			defer wg.Done()
			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-ctx.Done():
				results[idx] = runResult{err: ctx.Err()}
				return
			}

			// Clone scenario for this run
			runScenario := req.Scenario
			runScenario.ID = fmt.Sprintf("%s-mc-%d", req.Scenario.ID, idx)

			run, err := mce.engine.CreateRun(ctx, runScenario, nil)
			if err != nil {
				results[idx] = runResult{err: err}
				return
			}
			run.Seed = runSeed

			executedRun, err := mce.engine.Run(ctx, run.ID)
			if err != nil {
				results[idx] = runResult{err: err}
				return
			}

			spendBig, _ := new(big.Int).SetString(executedRun.Economics.ProjectedSpend, 10)
			spendFloat := 0.0
			if spendBig != nil {
				spendFloat = float64(spendBig.Int64()) / 1_000_000.0
			}

			results[idx] = runResult{
				success:    executedRun.Status == StatusCompleted,
				spendUSD:   spendFloat,
				durationMs: executedRun.DurationMs,
			}
		}(i, seed)
	}

	wg.Wait()

	var successfulRuns int
	var totalSpend float64
	var totalDuration int64
	spends := make([]float64, 0, req.Iterations)

	for _, res := range results {
		if res.err != nil {
			continue
		}
		if res.success {
			successfulRuns++
		}
		spends = append(spends, res.spendUSD)
		totalSpend += res.spendUSD
		totalDuration += res.durationMs
	}

	if len(spends) == 0 {
		return nil, fmt.Errorf("all monte carlo iterations failed to complete")
	}

	sort.Float64s(spends)
	n := len(spends)

	minSpend := spends[0]
	maxSpend := spends[n-1]
	avgSpend := totalSpend / float64(n)
	avgDuration := totalDuration / int64(n)

	p50 := percentile(spends, 0.50)
	p90 := percentile(spends, 0.90)
	p95 := percentile(spends, 0.95)

	completionRate := float64(successfulRuns) / float64(n)

	return &MonteCarloSummary{
		RunCount:          n,
		CompletionRate:    math.Round(completionRate*1000) / 1000,
		AverageSpend:      fmt.Sprintf("%.2f", avgSpend),
		MinimumSpend:      fmt.Sprintf("%.2f", minSpend),
		MaximumSpend:      fmt.Sprintf("%.2f", maxSpend),
		P50Spend:          fmt.Sprintf("%.2f", p50),
		P90Spend:          fmt.Sprintf("%.2f", p90),
		P95Spend:          fmt.Sprintf("%.2f", p95),
		AvgDurationMs:     avgDuration,
		SpendDistribution: spends,
		Currency:          "USDC",
		ModelNotice:       "MODELLED ESTIMATE: Deterministic simulation projection only, not actual financial history.",
	}, nil
}

func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	index := p * float64(len(sorted)-1)
	lower := int(math.Floor(index))
	upper := int(math.Ceil(index))
	weight := index - float64(lower)
	if lower == upper {
		return sorted[lower]
	}
	return sorted[lower]*(1-weight) + sorted[upper]*weight
}
