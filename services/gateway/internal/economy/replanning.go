package economy

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrBudgetExhausted    = errors.New("insufficient remaining mission budget for recovery")
	ErrDeadlineExceeded   = errors.New("mission deadline has expired")
	ErrMaxRecoveryReached = errors.New("maximum recovery attempts reached for mission")
	ErrNoAlternativeFound = errors.New("no viable alternative service discovered")
)

// ReplanningEngine provides deterministic, budget-aware, and deadline-aware recovery replanning.
// INVARIANT: All outputs are proposals only and possess zero financial execution authority.
type ReplanningEngine struct {
	reg           *registry.Registry
	economyEngine *EconomyEngine
	memStore      *EconomicMemoryStore
	detector      *AnomalyDetector
}

// NewReplanningEngine constructs an instance of ReplanningEngine.
func NewReplanningEngine(
	reg *registry.Registry,
	engine *EconomyEngine,
	memStore *EconomicMemoryStore,
	detector *AnomalyDetector,
) *ReplanningEngine {
	if engine == nil {
		engine = NewEconomyEngine(nil)
	}
	if detector == nil {
		detector = NewAnomalyDetector(memStore)
	}
	return &ReplanningEngine{
		reg:           reg,
		economyEngine: engine,
		memStore:      memStore,
		detector:      detector,
	}
}

// ReplanContext contains all environmental and budgetary context for generating a replan proposal.
type ReplanContext struct {
	Mission          *Mission
	FailedStep       *MissionStep
	FailureClass     FailureClass
	FailureReason    string
	StepRetryCount   int
	RecoveryAttempts int
	RemainingBudget  string // micro-USDC
	RemainingTimeMs  int64
	PolicyHardDeny   bool
}

// ProposeRecovery deterministically selects a recovery strategy and builds a ReplanProposal.
func (r *ReplanningEngine) ProposeRecovery(ctx context.Context, rc ReplanContext) (*ReplanProposal, error) {
	now := time.Now().UTC()

	// 1. Invariant Check: Hard Policy Deny
	if rc.PolicyHardDeny {
		return &ReplanProposal{
			MissionID:     rc.Mission.ID,
			Reason:        "POLICY_HARD_DENY",
			Strategy:      StrategyAbortMission,
			Confidence:    ConfidenceHigh,
			RequiresHuman: false,
			Explanation:   "Policy engine emitted hard DENY; automated recovery cannot bypass security policy",
			CreatedAt:     now,
		}, nil
	}

	// 2. Bound Check: Max Recovery Attempts
	if rc.RecoveryAttempts >= MAX_RECOVERY_ATTEMPTS {
		return &ReplanProposal{
			MissionID:     rc.Mission.ID,
			Reason:        fmt.Sprintf("MAX_RECOVERY_ATTEMPTS_EXCEEDED (%d/%d)", rc.RecoveryAttempts, MAX_RECOVERY_ATTEMPTS),
			Strategy:      StrategyAbortMission,
			Confidence:    ConfidenceHigh,
			RequiresHuman: false,
			Explanation:   "Mission exceeded maximum allowable recovery attempts; failing closed to protect budget",
			CreatedAt:     now,
		}, ErrMaxRecoveryReached
	}

	// 3. Bound Check: Remaining Budget
	remBudget, ok := new(big.Int).SetString(rc.RemainingBudget, 10)
	if !ok || remBudget.Sign() <= 0 {
		return &ReplanProposal{
			MissionID:     rc.Mission.ID,
			Reason:        "BUDGET_EXHAUSTED",
			Strategy:      StrategyAbortMission,
			Confidence:    ConfidenceHigh,
			RequiresHuman: false,
			Explanation:   "Remaining mission budget is zero; cannot fund additional execution steps",
			CreatedAt:     now,
		}, ErrBudgetExhausted
	}

	// 4. Bound Check: Deadline Remaining
	if rc.RemainingTimeMs > 0 && rc.RemainingTimeMs < 1000 { // less than 1 second
		return &ReplanProposal{
			MissionID:     rc.Mission.ID,
			Reason:        "DEADLINE_EXPIRED",
			Strategy:      StrategyAbortMission,
			Confidence:    ConfidenceHigh,
			RequiresHuman: false,
			Explanation:   "Remaining mission time is insufficient for network execution",
			CreatedAt:     now,
		}, ErrDeadlineExceeded
	}

	failedServiceID := rc.FailedStep.SelectedServiceID
	requiredCap := rc.FailedStep.RequiredCapability

	// Check Circuit Breaker Status for the failed service
	_, cbStatus := r.detector.DetectAnomalies(ctx, rc.Mission.OrganizationID, failedServiceID)

	// Strategy 1: RETRY_SAME_SERVICE (if transient, retry limit not reached, and service not degraded)
	if rc.FailureClass == FailureTransient &&
		rc.StepRetryCount < MAX_RETRIES_PER_HIRE &&
		cbStatus == CircuitBreakerHealthy {

		// Verify cost fits in remaining budget
		stepCost, _ := new(big.Int).SetString(rc.FailedStep.MaxBudget, 10)
		if stepCost != nil && stepCost.Cmp(remBudget) <= 0 {
			return &ReplanProposal{
				MissionID: rc.Mission.ID,
				Reason:    fmt.Sprintf("TRANSIENT_FAILURE: %s", rc.FailureReason),
				Strategy:  StrategyRetrySameService,
				ProposedSteps: []ProposedStep{
					{
						StepID:               rc.FailedStep.StepID,
						RequiredCapability:   requiredCap,
						RecommendedServiceID: failedServiceID,
						EstimatedCost:        rc.FailedStep.MaxBudget,
						EstimatedLatencyMs:   1000,
						Strategy:             StrategyRetrySameService,
						Reason:               fmt.Sprintf("Retry %d/%d for transient failure; service circuit breaker is HEALTHY", rc.StepRetryCount+1, MAX_RETRIES_PER_HIRE),
					},
				},
				EstimatedCost:       rc.FailedStep.MaxBudget,
				EstimatedDurationMs: 1200,
				Confidence:          ConfidenceHigh,
				RequiresHuman:       false,
				Explanation:         fmt.Sprintf("Service %s encountered transient failure; retrying within budget and under circuit breaker limit", failedServiceID),
				CreatedAt:           now,
			}, nil
		}
	}

	// Strategy 2: Discover Alternatives
	allCandidates := r.reg.ListByCapability(requiredCap)
	alternativeCandidates := make([]*registry.Service, 0)
	for _, cand := range allCandidates {
		if cand.ID != failedServiceID && cand.Enabled {
			alternativeCandidates = append(alternativeCandidates, cand)
		}
	}

	if len(alternativeCandidates) == 0 {
		return &ReplanProposal{
			MissionID:     rc.Mission.ID,
			Reason:        fmt.Sprintf("NO_ALTERNATIVE_SERVICES for capability '%s'", requiredCap),
			Strategy:      StrategyAbortMission,
			Confidence:    ConfidenceHigh,
			RequiresHuman: true,
			Explanation:   fmt.Sprintf("Service %s failed and no alternative providers exist for capability '%s'", failedServiceID, requiredCap),
			CreatedAt:     now,
		}, ErrNoAlternativeFound
	}

	// Solicit quotes and evaluate alternatives
	quotes := make([]*Quote, 0, len(alternativeCandidates))
	reps := make(map[string]*ServiceReputation)
	perfs := make(map[string]*ServicePerformance)
	altServiceIDs := make([]string, 0, len(alternativeCandidates))

	for _, alt := range alternativeCandidates {
		altServiceIDs = append(altServiceIDs, alt.ID)

		quotePrice := alt.FixedPrice
		if quotePrice == "" {
			quotePrice = alt.MaxPrice
		}
		if quotePrice == "" {
			quotePrice = "100000" // 0.10 USDC default
		}

		pInt, ok := new(big.Int).SetString(quotePrice, 10)
		if !ok || pInt.Cmp(remBudget) > 0 {
			continue // Discard if exceeds remaining budget
		}

		// Deadline awareness: check latency
		estLat := int64(800)
		if rc.RemainingTimeMs > 0 && estLat*12/10 > rc.RemainingTimeMs {
			continue // Exceeds deadline with 20% safety margin
		}

		quotes = append(quotes, &Quote{
			QuoteID:            fmt.Sprintf("q_alt_%s_%d", alt.ID, time.Now().UnixNano()),
			ServiceID:          alt.ID,
			MissionID:          rc.Mission.ID,
			Price:              quotePrice,
			Asset:              rc.Mission.Currency,
			EstimatedLatencyMs: estLat,
			QualityScore:       9000,
			RiskScore:          1000,
			ReputationScore:    9000,
			RecipientBinding:   alt.Recipient,
			CreatedAt:          now,
		})

		reps[alt.ID] = &ServiceReputation{
			ServiceID:       alt.ID,
			ReputationScore: 9000,
			FailureRateBps:  200,
		}
		perfs[alt.ID] = r.memStore.CalculatePerformance(ctx, rc.Mission.OrganizationID, alt.ID, WindowAllTime)
	}

	if len(quotes) == 0 {
		return &ReplanProposal{
			MissionID:           rc.Mission.ID,
			Reason:              "ALTERNATIVES_EXCEED_BUDGET_OR_DEADLINE",
			Strategy:            StrategyAbortMission,
			Confidence:          ConfidenceHigh,
			AlternativeServices: altServiceIDs,
			Explanation:         "Alternative services exist but their pricing exceeds the remaining mission budget or latency violates remaining deadline",
			CreatedAt:           now,
		}, ErrBudgetExhausted
	}

	// Rank alternatives adaptively
	ranked, err := r.economyEngine.RankCandidatesAdaptive(rc.FailedStep, quotes, reps, perfs)
	if err != nil || len(ranked) == 0 {
		return &ReplanProposal{
			MissionID:     rc.Mission.ID,
			Reason:        "RANKING_FAILED",
			Strategy:      StrategyAbortMission,
			Confidence:    ConfidenceLow,
			Explanation:   "Failed to rank candidate alternative quotes",
			CreatedAt:     now,
		}, err
	}

	best := ranked[0]
	selectedQuote := best.Quote

	// Check if human approval should be requested
	requiresHuman := false
	strategy := StrategyTryAlternativeService
	explanation := fmt.Sprintf(
		"Selected alternative %s based on %s confidence contextual score (utility=%d, price=%s micro-USDC)",
		selectedQuote.ServiceID, best.Confidence, best.UtilityScore, selectedQuote.Price,
	)

	if best.Confidence == ConfidenceLow || best.Confidence == ConfidenceUnknown {
		requiresHuman = true
		explanation += ". Low historical evidence; human verification recommended"
	}

	// If price is significantly lower than original step budget, note REDUCE_SCOPE / CHEAPER_ALTERNATIVE
	origCost, _ := new(big.Int).SetString(rc.FailedStep.MaxBudget, 10)
	newCost, _ := new(big.Int).SetString(selectedQuote.Price, 10)
	if origCost != nil && newCost != nil && newCost.Cmp(origCost) < 0 {
		strategy = StrategyTryAlternativeService
	}

	return &ReplanProposal{
		MissionID: rc.Mission.ID,
		Reason:    fmt.Sprintf("SERVICE_FAILURE: %s", rc.FailureReason),
		Strategy:  strategy,
		ProposedSteps: []ProposedStep{
			{
				StepID:               fmt.Sprintf("%s_alt", rc.FailedStep.StepID),
				RequiredCapability:   requiredCap,
				RecommendedServiceID: selectedQuote.ServiceID,
				EstimatedCost:        selectedQuote.Price,
				EstimatedLatencyMs:   selectedQuote.EstimatedLatencyMs,
				Strategy:             strategy,
				Reason:               fmt.Sprintf("Best alternative: %s", best.Explanation),
			},
		},
		EstimatedCost:       selectedQuote.Price,
		EstimatedDurationMs: selectedQuote.EstimatedLatencyMs,
		Confidence:          best.Confidence,
		RequiresHuman:       requiresHuman,
		Explanation:         explanation,
		AlternativeServices: altServiceIDs,
		CreatedAt:           now,
	}, nil
}
