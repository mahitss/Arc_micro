package treasury

import (
	"context"
	"math/big"
	"time"
)

// StressTester evaluates treasury survival under adversarial economic perturbations.
type StressTester interface {
	RunStressSimulation(ctx context.Context, orgID string, scenario *LiquidityStressScenario, mode ExecutionMode) (*LiquidityStressResult, error)
}

// DefaultLiquidityStressTester implements StressTester.
type DefaultLiquidityStressTester struct {
	orchestrator Orchestrator
}

// NewLiquidityStressTester creates a new DefaultLiquidityStressTester.
func NewLiquidityStressTester(orch Orchestrator) *DefaultLiquidityStressTester {
	return &DefaultLiquidityStressTester{
		orchestrator: orch,
	}
}

// RunStressSimulation simulates severe liquidity shocks against the digital twin of the treasury.
func (s *DefaultLiquidityStressTester) RunStressSimulation(ctx context.Context, orgID string, scenario *LiquidityStressScenario, mode ExecutionMode) (*LiquidityStressResult, error) {
	state, err := s.orchestrator.GetTreasuryState(ctx, orgID, mode)
	if err != nil {
		return nil, err
	}

	total, _ := ParseBigInt(state.TotalBalance)
	avail, _ := ParseBigInt(state.AvailableBalance)
	reserved, _ := ParseBigInt(state.ReservedBalance)
	committed, _ := ParseBigInt(state.CommittedBalance)
	minBuffer, _ := ParseBigInt(state.MinimumBuffer)

	// Emergency buffer = 50% of minimum buffer floor
	emergencyBuffer := new(big.Int).Div(minBuffer, big.NewInt(2))

	if scenario == nil {
		scenario = &LiquidityStressScenario{
			ScenarioName:            ScenarioSettlementCluster,
			SimultaneousSettlements: 5,
			ProviderFallbackRate:    0.35, // 35% surcharge
			RetrySurgePercentage:    0.20, // 20% retries
			MilestoneReleaseRatio:   1.0,  // 100% released
			RefundSurgeRatio:        0.05, // 5% refunds
		}
	}

	// 1. Calculate Base Outflows: All active reservations settle concurrently + simultaneous settlement shock
	totalOutflow := new(big.Int).Set(reserved)
	if scenario.SimultaneousSettlements > 0 {
		settlementShock := new(big.Int).Mul(big.NewInt(int64(scenario.SimultaneousSettlements)), big.NewInt(25000000)) // $25.00 USDC per simulated settlement
		totalOutflow.Add(totalOutflow, settlementShock)
	}

	// 2. Add Settling Milestones & Commitments under release ratio
	commitShare := new(big.Int).Mul(committed, big.NewInt(int64(scenario.MilestoneReleaseRatio*100)))
	commitShare.Div(commitShare, big.NewInt(100))
	totalOutflow.Add(totalOutflow, commitShare)

	// 3. Add Provider Fallback Surcharge & Retry Surge
	surchargeMultiplier := int64((scenario.ProviderFallbackRate + scenario.RetrySurgePercentage) * 100)
	surchargeAmount := new(big.Int).Mul(totalOutflow, big.NewInt(surchargeMultiplier))
	surchargeAmount.Div(surchargeAmount, big.NewInt(100))
	totalOutflow.Add(totalOutflow, surchargeAmount)

	// 4. Compute Minimum Resulting Liquidity
	minResulting := new(big.Int).Sub(avail, totalOutflow)
	bufferBreached := false
	emergencyBreached := false
	survival := SurvivalSafe
	var recommendations []string

	if minResulting.Sign() < 0 {
		// Treasury depleted
		minResulting = big.NewInt(0)
		bufferBreached = true
		emergencyBreached = true
		survival = SurvivalUnavailable
		recommendations = append(recommendations, "Immediately halt all new autonomous missions")
		recommendations = append(recommendations, "Trigger human multi-sig treasury replenishment")
		recommendations = append(recommendations, "Pause unreserved peer-to-peer economic obligations")
	} else if minResulting.Cmp(emergencyBuffer) < 0 {
		bufferBreached = true
		emergencyBreached = true
		survival = SurvivalCritical
		recommendations = append(recommendations, "Activate emergency treasury circuit breaker")
		recommendations = append(recommendations, "Defer non-critical recurring contracts")
		recommendations = append(recommendations, "Require human operator approval for intents > $5.00 USDC")
	} else if minResulting.Cmp(minBuffer) < 0 {
		bufferBreached = true
		survival = SurvivalConstrained
		recommendations = append(recommendations, "Transition treasury operational mode to CONSTRAINED")
		recommendations = append(recommendations, "Enforce queue-based priority allocation for upcoming obligations")
	} else {
		survival = SurvivalSafe
		recommendations = append(recommendations, "Treasury retains adequate capital to absorb modeled stress")
	}

	// Worst-case exposure = Total Balance - Emergency Buffer
	worstCase := new(big.Int).Sub(total, emergencyBuffer)
	if worstCase.Sign() < 0 {
		worstCase = big.NewInt(0)
	}

	return &LiquidityStressResult{
		ScenarioName:              scenario.ScenarioName,
		StartingLiquidity:         avail.String(),
		TotalProjectedOutflow:     totalOutflow.String(),
		MinimumResultingLiquidity: minResulting.String(),
		BufferBreached:            bufferBreached,
		EmergencyBufferBreached:   emergencyBreached,
		WorstCaseExposure:         worstCase.String(),
		SurvivalState:             survival,
		RecommendedActions:        recommendations,
		SimulatedAt:               time.Now(),
	}, nil
}
