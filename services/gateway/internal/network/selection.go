package network

import (
	"errors"
	"fmt"
	"math/big"
	"sort"
	"strings"
	"time"
)

var (
	ErrNoEligibleCandidates = errors.New("no eligible candidates meet task constraints")
)

// SelectionTask specifies the economic constraints for agent selection.
type SelectionTask struct {
	Objective          string    `json:"objective"`
	RequiredCapability string    `json:"required_capability"`
	BudgetBaseUnits    string    `json:"budget_base_units"` // e.g. "1000000" for 1.00 USDC
	Deadline           time.Time `json:"deadline"`
	RiskConstraint     string    `json:"risk_constraint"` // "LOW", "MEDIUM", "HIGH"
	MinTrustScore      int64     `json:"min_trust_score"` // 0-10000 basis points
}

// CandidateRanking provides an explainable utility score for a candidate agent.
type CandidateRanking struct {
	AgentID        string  `json:"agent_id"`
	DisplayName    string  `json:"display_name"`
	PriceBaseUnits string  `json:"price_base_units"`
	UtilityScore   int64   `json:"utility_score"` // 0 - 10000 basis points
	PriceScore     int64   `json:"price_score"`
	TrustScore     int64   `json:"trust_score"`
	LatencyScore   int64   `json:"latency_score"`
	MatchScore     int64   `json:"match_score"`
	RiskScore      int64   `json:"risk_score"`
	Selected       bool    `json:"selected"`
	Explanation    string  `json:"explanation"`
	Warnings       []string `json:"warnings,omitempty"`
}

// AgentSelectionEngine deterministically ranks and selects candidates.
// INVARIANT: Selection is 100% deterministic mathematical utility — no LLM rankings.
type AgentSelectionEngine struct{}

// NewAgentSelectionEngine creates a new selection engine.
func NewAgentSelectionEngine() *AgentSelectionEngine {
	return &AgentSelectionEngine{}
}

// SelectBestAgent evaluates discovered candidates against a task and returns ranked candidates.
func (e *AgentSelectionEngine) SelectBestAgent(task SelectionTask, candidates []DiscoveredAgent) ([]CandidateRanking, error) {
	if len(candidates) == 0 {
		return nil, ErrNoEligibleCandidates
	}

	budgetInt, ok := new(big.Int).SetString(task.BudgetBaseUnits, 10)
	if !ok || budgetInt.Sign() <= 0 {
		budgetInt = big.NewInt(10000000) // Default 10.00 USDC ceiling if unspecified
	}

	rankings := make([]CandidateRanking, 0, len(candidates))

	for _, c := range candidates {
		// 1. Check suspended/revoked status
		if c.Identity.Status == IdentityStatusRevoked || c.Identity.Status == IdentityStatusSuspended {
			continue
		}

		// 2. Price Determination
		priceStr := "0"
		if c.MatchedPricing != nil && c.MatchedPricing.BasePrice != "" {
			priceStr = c.MatchedPricing.BasePrice
		}
		priceInt, ok := new(big.Int).SetString(priceStr, 10)
		if !ok || priceInt.Sign() < 0 {
			priceInt = big.NewInt(500000) // 0.50 USDC fallback
		}

		// Hard constraint: Price must not exceed budget
		if priceInt.Cmp(budgetInt) > 0 {
			continue
		}

		// Hard constraint: Trust score must satisfy minimum
		trustScore := int64(5000)
		if c.TrustEvaluation != nil {
			trustScore = c.TrustEvaluation.TrustScore
		}
		if task.MinTrustScore > 0 && trustScore < task.MinTrustScore {
			continue
		}

		// 3. Mathematical Utility Components (normalized 0 - 10,000 basis points)
		// A. Price Utility (Weight: 35%): Cheaper relative to budget ceiling = higher score
		// Ratio: 1.0 - (price / budget)
		fPrice, _ := new(big.Float).Quo(new(big.Float).SetInt(priceInt), new(big.Float).SetInt(budgetInt)).Float64()
		priceRatio := 1.0 - fPrice
		if priceRatio < 0 {
			priceRatio = 0
		}
		priceScore := int64(priceRatio * 10000)

		// B. Trust Score (Weight: 35%)
		// C. Latency Score (Weight: 15%): Fast latency = higher score
		latencyMs := int64(1500)
		if c.Identity.ReputationSummary != nil && c.Identity.ReputationSummary.AverageLatencyMs > 0 {
			latencyMs = c.Identity.ReputationSummary.AverageLatencyMs
		}
		latencyScore := int64(10000)
		if latencyMs > 1000 {
			excess := float64(latencyMs - 1000)
			latencyScore = int64(mathMax(0, 10000-(excess/5000.0)*10000))
		}

		// D. Capability Match (Weight: 15%): Exact version match = 10000, unversioned = 8000
		matchScore := int64(8000)
		for _, capStr := range c.Identity.Capabilities {
			if strings.EqualFold(capStr, task.RequiredCapability) {
				matchScore = 10000
				break
			}
		}

		// E. Risk Penalty
		riskScore := int64(0)
		var warnings []string
		if strings.ToUpper(c.Identity.Availability) == "BUSY" {
			riskScore += 1500
			warnings = append(warnings, "AGENT_BUSY: Elevated queue latency expected")
		}

		// Aggregate Utility Score (0 - 10,000)
		utility := int64(
			(float64(priceScore) * 0.35) +
				(float64(trustScore) * 0.35) +
				(float64(latencyScore) * 0.15) +
				(float64(matchScore) * 0.15) -
				float64(riskScore),
		)
		if utility < 0 {
			utility = 0
		}
		if utility > 10000 {
			utility = 10000
		}

		explanation := fmt.Sprintf("Price: %s USDC, Trust: %d bps, Latency: %dms, Match: %d bps",
			priceStr, trustScore, latencyMs, matchScore)

		rankings = append(rankings, CandidateRanking{
			AgentID:        c.Identity.AgentID,
			DisplayName:    c.Identity.DisplayName,
			PriceBaseUnits: priceStr,
			UtilityScore:   utility,
			PriceScore:     priceScore,
			TrustScore:     trustScore,
			LatencyScore:   latencyScore,
			MatchScore:     matchScore,
			RiskScore:      riskScore,
			Explanation:    explanation,
			Warnings:       warnings,
		})
	}

	if len(rankings) == 0 {
		return nil, ErrNoEligibleCandidates
	}

	// Deterministic sort: Highest UtilityScore first, then Lowest Price, then AgentID
	sort.SliceStable(rankings, func(i, j int) bool {
		if rankings[i].UtilityScore != rankings[j].UtilityScore {
			return rankings[i].UtilityScore > rankings[j].UtilityScore
		}
		pI, _ := new(big.Int).SetString(rankings[i].PriceBaseUnits, 10)
		pJ, _ := new(big.Int).SetString(rankings[j].PriceBaseUnits, 10)
		if pI != nil && pJ != nil && pI.Cmp(pJ) != 0 {
			return pI.Cmp(pJ) < 0
		}
		return rankings[i].AgentID < rankings[j].AgentID
	})

	// Mark top candidate as selected
	rankings[0].Selected = true
	rankings[0].Explanation = fmt.Sprintf("SELECTED: Optimal balance of price (%s base units), trust (%d bps), and latency (%d bps). %s",
		rankings[0].PriceBaseUnits, rankings[0].TrustScore, rankings[0].LatencyScore, rankings[0].Explanation)

	return rankings, nil
}

func mathMax(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
