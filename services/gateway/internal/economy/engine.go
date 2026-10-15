package economy

import (
	"errors"
	"fmt"
	"math/big"
	"sort"
	"strings"
	"time"
)

var (
	ErrNoQuotesProvided     = errors.New("no candidate quotes provided for economic selection")
	ErrZeroStepBudget       = errors.New("step budget must be greater than zero for price normalization")
	ErrQuoteExceedsBudget   = errors.New("candidate quote price exceeds step budget")
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
	return e.RankCandidatesAdaptive(step, quotes, reputations, nil)
}

// RankCandidatesAdaptive evaluates candidate quotes using historical reputation, contextual capability metrics, and recent performance trends.
func (e *EconomyEngine) RankCandidatesAdaptive(
	step *MissionStep,
	quotes []*Quote,
	reputations map[string]*ServiceReputation,
	perfs map[string]*ServicePerformance,
) ([]ScoredCandidate, error) {
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

		// 4. Contextual & Recent Performance Components
		contextSuccess := int64(8000)
		recentSuccess := int64(8500)
		conf := ConfidenceUnknown

		if perfs != nil {
			if p, okP := perfs[q.ServiceID]; okP && p != nil {
				conf = p.Confidence
				if p.RecentSuccessRateBps > 0 {
					recentSuccess = p.RecentSuccessRateBps
				}
				if p.ContextualBreakdown != nil {
					if cp, okC := p.ContextualBreakdown[step.RequiredCapability]; okC {
						contextSuccess = cp.SuccessRateBps
					}
				}
			}
		}

		contextContrib := (contextSuccess * e.weights.ContextualWeight) / 10000
		recentContrib := (recentSuccess * e.weights.RecentPerfWeight) / 10000

		// 5. Price Penalty: Price relative to step budget
		// Ratio = (price * 10000) / stepBudget
		priceRatio := new(big.Int).Mul(priceInt, big.NewInt(10000))
		priceRatio.Div(priceRatio, stepBudgetInt)
		priceBasisPoints := priceRatio.Int64()
		if priceBasisPoints > 10000 {
			priceBasisPoints = 10000
		}
		pricePenalty := (priceBasisPoints * e.weights.PriceWeight) / 10000

		// 6. Risk Penalty: Risk in basis points
		risk := q.RiskScore
		if risk < 0 {
			risk = 0
		} else if risk > 10000 {
			risk = 10000
		}
		riskPenalty := (risk * e.weights.RiskWeight) / 10000

		// Deterministic Total Utility Formula:
		// UTILITY = Quality + Reliability + Reputation + Latency + Context + Recent - Price - Risk
		utilityScore := qualityContrib + relContrib + repContrib + latencyContrib + contextContrib + recentContrib - pricePenalty - riskPenalty

		explanation := fmt.Sprintf(
			"utility=%d (quality=+%d, rel=+%d, rep=+%d, lat=+%d, ctx=+%d, recent=+%d, price=-%d, risk=-%d, conf=%s)",
			utilityScore, qualityContrib, relContrib, repContrib, latencyContrib, contextContrib, recentContrib, pricePenalty, riskPenalty, conf,
		)

		candidates = append(candidates, ScoredCandidate{
			Quote:               q,
			UtilityScore:        utilityScore,
			QualityContribution: qualityContrib,
			ReliabilityContrib:  relContrib,
			ReputationContrib:   repContrib,
			LatencyContrib:      latencyContrib,
			ContextualContrib:   contextContrib,
			RecentPerfContrib:   recentContrib,
			PricePenalty:        pricePenalty,
			RiskPenalty:         riskPenalty,
			Confidence:          conf,
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
	record, err := e.EvaluateAndSelectCandidate(step, quotes, reputations, nil)
	if err != nil {
		return nil, err
	}
	if record.SelectedCandidate == nil {
		return nil, ErrNoQuotesProvided
	}
	return record.SelectedCandidate, nil
}

// SelectBestCandidateAdaptive selects the highest ranked candidate under adaptive contextual scoring.
func (e *EconomyEngine) SelectBestCandidateAdaptive(
	step *MissionStep,
	quotes []*Quote,
	reputations map[string]*ServiceReputation,
	perfs map[string]*ServicePerformance,
) (*ScoredCandidate, error) {
	record, err := e.EvaluateAndSelectCandidate(step, quotes, reputations, perfs)
	if err != nil {
		return nil, err
	}
	if record.SelectedCandidate == nil {
		return nil, ErrNoQuotesProvided
	}
	return record.SelectedCandidate, nil
}

// EvaluateAndSelectCandidate filters invalid/expired/over-budget/incompatible quotes,
// deterministically ranks eligible candidates, and produces an explainable SelectionRecord.
func (e *EconomyEngine) EvaluateAndSelectCandidate(
	step *MissionStep,
	quotes []*Quote,
	reputations map[string]*ServiceReputation,
	perfs map[string]*ServicePerformance,
) (*SelectionRecord, error) {
	record := &SelectionRecord{
		StepID:             step.StepID,
		RequiredCapability: step.RequiredCapability,
		MaxBudget:          step.MaxBudget,
		Currency:           "USDC",
		EligibleCandidates: make([]ScoredCandidate, 0),
		RejectedCandidates: make([]RejectedCandidate, 0),
		EvaluatedAt:        time.Now().UTC(),
	}

	if len(quotes) == 0 {
		record.SelectionRationale = "No candidate quotes provided for economic evaluation."
		return record, ErrNoQuotesProvided
	}

	stepBudgetInt, ok := new(big.Int).SetString(step.MaxBudget, 10)
	if !ok || stepBudgetInt.Sign() <= 0 {
		record.SelectionRationale = "Invalid or zero step budget."
		return record, ErrZeroStepBudget
	}

	now := time.Now().UTC()
	var eligibleQuotes []*Quote

	for _, q := range quotes {
		if q == nil {
			continue
		}

		// 1. Completeness validation
		if strings.TrimSpace(q.QuoteID) == "" || strings.TrimSpace(q.ServiceID) == "" {
			record.RejectedCandidates = append(record.RejectedCandidates, RejectedCandidate{
				ServiceID:      q.ServiceID,
				QuoteID:        q.QuoteID,
				Reason:         "INCOMPLETE_QUOTE",
				Details:        "Quote missing mandatory quote_id or service_id",
				QuotedPrice:    q.Price,
				IsMockProvider: q.IsMockProvider,
				Source:         q.Source,
			})
			continue
		}

		// 2. Expiration validation
		if !q.ExpiresAt.IsZero() && now.After(q.ExpiresAt) {
			record.RejectedCandidates = append(record.RejectedCandidates, RejectedCandidate{
				ServiceID:      q.ServiceID,
				QuoteID:        q.QuoteID,
				Reason:         "EXPIRED",
				Details:        fmt.Sprintf("Quote expired at %s (evaluated at %s)", q.ExpiresAt.Format(time.RFC3339), now.Format(time.RFC3339)),
				QuotedPrice:    q.Price,
				IsMockProvider: q.IsMockProvider,
				Source:         q.Source,
			})
			continue
		}

		// 3. Currency / Asset validation
		if q.Asset != "" && !strings.EqualFold(q.Asset, "USDC") {
			record.RejectedCandidates = append(record.RejectedCandidates, RejectedCandidate{
				ServiceID:      q.ServiceID,
				QuoteID:        q.QuoteID,
				Reason:         "CURRENCY_MISMATCH",
				Details:        fmt.Sprintf("Quote asset '%s' does not match required currency 'USDC'", q.Asset),
				QuotedPrice:    q.Price,
				IsMockProvider: q.IsMockProvider,
				Source:         q.Source,
			})
			continue
		}

		// 4. Price validity
		priceInt, ok := new(big.Int).SetString(strings.TrimSpace(q.Price), 10)
		if !ok || priceInt.Sign() <= 0 {
			record.RejectedCandidates = append(record.RejectedCandidates, RejectedCandidate{
				ServiceID:      q.ServiceID,
				QuoteID:        q.QuoteID,
				Reason:         "MALFORMED_PRICE",
				Details:        fmt.Sprintf("Price '%s' is not a positive base-unit integer", q.Price),
				QuotedPrice:    q.Price,
				IsMockProvider: q.IsMockProvider,
				Source:         q.Source,
			})
			continue
		}

		// 5. Budget ceiling check
		if priceInt.Cmp(stepBudgetInt) > 0 {
			record.RejectedCandidates = append(record.RejectedCandidates, RejectedCandidate{
				ServiceID:      q.ServiceID,
				QuoteID:        q.QuoteID,
				Reason:         "OVER_BUDGET",
				Details:        fmt.Sprintf("Price %s micro-USDC exceeds authorized step budget %s micro-USDC", q.Price, step.MaxBudget),
				QuotedPrice:    q.Price,
				IsMockProvider: q.IsMockProvider,
				Source:         q.Source,
			})
			continue
		}

		// 6. Capability compatibility check
		if q.CapabilityEvidence != "" && strings.Contains(strings.ToLower(q.CapabilityEvidence), "incompatible") {
			record.RejectedCandidates = append(record.RejectedCandidates, RejectedCandidate{
				ServiceID:      q.ServiceID,
				QuoteID:        q.QuoteID,
				Reason:         "INCOMPATIBLE_CAPABILITY",
				Details:        fmt.Sprintf("Capability evidence indicates incompatibility: %s", q.CapabilityEvidence),
				QuotedPrice:    q.Price,
				IsMockProvider: q.IsMockProvider,
				Source:         q.Source,
			})
			continue
		}

		eligibleQuotes = append(eligibleQuotes, q)
	}

	if len(eligibleQuotes) == 0 {
		record.SelectionRationale = fmt.Sprintf("No eligible candidates found. All %d quotes were rejected by deterministic gates.", len(quotes))
		return record, fmt.Errorf("%w: all quotes rejected by deterministic gates", ErrQuoteExceedsBudget)
	}

	// Rank eligible quotes deterministically
	rankedCandidates, err := e.RankCandidatesAdaptive(step, eligibleQuotes, reputations, perfs)
	if err != nil {
		return record, err
	}

	record.EligibleCandidates = rankedCandidates
	if len(rankedCandidates) > 0 {
		record.SelectedCandidate = &rankedCandidates[0]
		record.SelectionRationale = fmt.Sprintf(
			"Selected provider '%s' (rank #1, utility score: %d bps) from %d eligible candidates. %d quotes rejected by deterministic policy gates.",
			rankedCandidates[0].Quote.ServiceID,
			rankedCandidates[0].UtilityScore,
			len(rankedCandidates),
			len(record.RejectedCandidates),
		)
	}

	return record, nil
}
