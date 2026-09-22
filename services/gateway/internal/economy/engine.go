package economy

import (
	"errors"
	"fmt"
	"math/big"
	"sort"
	"strings"
)

var (
	ErrNoQuotesProvided    = errors.New("no candidate quotes provided for economic selection")
	ErrZeroStepBudget      = errors.New("step budget must be greater than zero for price normalization")
	ErrQuoteExceedsBudget  = errors.New("candidate quote price exceeds step budget")
	ErrQuoteCurrencyInvalid = errors.New("candidate quote currency does not match requested asset")
)

// EconomyEngine provides deterministic, integer-based ranking and selection of service candidates.
// INVARIANT: Floating-point math is strictly prohibited. All arithmetic uses scaled integer basis points (0-10,000).
type EconomyEngine struct {
	weights SelectionWeights
}

// NewEconomyEngine constructs an EconomyEngine with custom or default weights.
func NewEconomyEngine(weights *SelectionWeights) *EconomyEngine {
	w := DefaultSelectionWeights()
	if weights != nil {
		w = *weights
	}
	return &EconomyEngine{weights: w}
}

// RankCandidates evaluates and deterministically orders a list of candidate quotes for a planned mission step.
func (e *EconomyEngine) RankCandidates(step *MissionStep, quotes []*Quote, reputations map[string]*ServiceReputation) ([]ScoredCandidate, error) {
	if len(quotes) == 0 {
		return nil, ErrNoQuotesProvided
	}

	stepBudgetInt, ok := new(big.Int).SetString(step.MaxBudget, 10)
	if !ok || stepBudgetInt.Sign() <= 0 {
		return nil, ErrZeroStepBudget
	}

	candidates := make([]ScoredCandidate, 0, len(quotes))

	for _, q := range quotes {
		if q == nil {
			continue
		}

		priceInt, ok := new(big.Int).SetString(q.Price, 10)
		if !ok || priceInt.Sign() <= 0 {
			continue // Discard invalid price quote
		}

		// Filter out quotes that exceed the step budget
		if priceInt.Cmp(stepBudgetInt) > 0 {
			continue
		}

		// Calculate scaled components (all in range 0 - 10000 basis points)

		// 1. Quality Component
		quality := q.QualityScore
		if quality <= 0 {
			quality = 7000 // Baseline
		} else if quality > 10000 {
			quality = 10000
		}
		qualityContrib := (quality * e.weights.QualityWeight) / 10000

		// 2. Reliability & Reputation Components
		reliability := int64(9500)
		reputationScore := q.ReputationScore
		if rep, exists := reputations[q.ServiceID]; exists && rep != nil {
			if rep.TotalRequests > 0 {
				reliability = int64(10000) - rep.FailureRateBps
				if reliability < 0 {
					reliability = 0
				}
				reputationScore = rep.ReputationScore
			}
		} else if reputationScore <= 0 {
			reputationScore = 9000
		}
		relContrib := (reliability * e.weights.ReliabilityWeight) / 10000
		repContrib := (reputationScore * e.weights.ReputationWeight) / 10000

		// 3. Latency Component: Latency score decreases with higher latency
		// Normalization: 0ms -> 10000, 2000ms or higher -> 0
		latencyScore := int64(10000) - (q.EstimatedLatencyMs * 5)
		if latencyScore < 0 {
			latencyScore = 0
		}
		latencyContrib := (latencyScore * e.weights.LatencyWeight) / 10000

		// 4. Price Penalty: Price relative to step budget
		// Ratio = (price * 10000) / stepBudget
		priceRatio := new(big.Int).Mul(priceInt, big.NewInt(10000))
		priceRatio.Div(priceRatio, stepBudgetInt)
		priceBasisPoints := priceRatio.Int64()
		if priceBasisPoints > 10000 {
			priceBasisPoints = 10000
		}
		pricePenalty := (priceBasisPoints * e.weights.PriceWeight) / 10000

		// 5. Risk Penalty: Risk in basis points
		risk := q.RiskScore
		if risk < 0 {
			risk = 0
		} else if risk > 10000 {
			risk = 10000
		}
		riskPenalty := (risk * e.weights.RiskWeight) / 10000

		// Deterministic Total Utility Formula:
		// UTILITY = Quality + Reliability + Reputation + Latency - Price - Risk
		utilityScore := qualityContrib + relContrib + repContrib + latencyContrib - pricePenalty - riskPenalty

		explanation := fmt.Sprintf(
			"utility=%d (quality=+%d, rel=+%d, rep=+%d, lat=+%d, price=-%d, risk=-%d)",
			utilityScore, qualityContrib, relContrib, repContrib, latencyContrib, pricePenalty, riskPenalty,
		)

		candidates = append(candidates, ScoredCandidate{
			Quote:               q,
			UtilityScore:        utilityScore,
			QualityContribution: qualityContrib,
			ReliabilityContrib:  relContrib,
			ReputationContrib:   repContrib,
			LatencyContrib:      latencyContrib,
			PricePenalty:        pricePenalty,
			RiskPenalty:         riskPenalty,
			Explanation:         explanation,
		})
	}

	if len(candidates) == 0 {
		return nil, ErrQuoteExceedsBudget
	}

	// Strict 5-Stage Deterministic Tie-Breaking:
	// 1. Highest Utility Score
	// 2. Lowest Price (Base Units)
	// 3. Highest Reliability
	// 4. Lowest Latency
	// 5. Lexicographical Service ID (Ascending)
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].UtilityScore != candidates[j].UtilityScore {
			return candidates[i].UtilityScore > candidates[j].UtilityScore
		}

		p1, _ := new(big.Int).SetString(candidates[i].Quote.Price, 10)
		p2, _ := new(big.Int).SetString(candidates[j].Quote.Price, 10)
		if p1.Cmp(p2) != 0 {
			return p1.Cmp(p2) < 0 // Lower price preferred
		}

		if candidates[i].ReliabilityContrib != candidates[j].ReliabilityContrib {
			return candidates[i].ReliabilityContrib > candidates[j].ReliabilityContrib
		}

		if candidates[i].Quote.EstimatedLatencyMs != candidates[j].Quote.EstimatedLatencyMs {
			return candidates[i].Quote.EstimatedLatencyMs < candidates[j].Quote.EstimatedLatencyMs
		}

		return strings.Compare(candidates[i].Quote.ServiceID, candidates[j].Quote.ServiceID) < 0
	})

	return candidates, nil
}

// SelectBestCandidate selects the highest ranked candidate under deterministic scoring.
func (e *EconomyEngine) SelectBestCandidate(step *MissionStep, quotes []*Quote, reputations map[string]*ServiceReputation) (*ScoredCandidate, error) {
	ranked, err := e.RankCandidates(step, quotes, reputations)
	if err != nil {
		return nil, err
	}
	if len(ranked) == 0 {
		return nil, ErrNoQuotesProvided
	}
	return &ranked[0], nil
}
