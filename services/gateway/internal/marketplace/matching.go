package marketplace

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strconv"
	"time"
)

// MatchingEngine coordinates deterministic multi-factor evaluation of providers for an opportunity.
type MatchingEngine struct{}

func NewMatchingEngine() *MatchingEngine {
	return &MatchingEngine{}
}

// MatchParams encapsulates all contextual inputs required for matching.
type MatchParams struct {
	Opportunity     MarketplaceOpportunity
	Listings        []ServiceListing
	MetricsMap      map[string]*MarketplaceMetrics // key: "provider_id:capability_id"
	PolicyAllowList map[string]bool                // key: provider_id -> allowed
	RiskScores      map[string]int                 // key: provider_id -> risk score
	MaxAllowedRisk  int
	CurrentTime     time.Time
}

// Match evaluates candidate listings and returns a deterministic CandidateSet with full explanation.
func (e *MatchingEngine) Match(params MatchParams) (*CandidateSet, error) {
	if params.CurrentTime.IsZero() {
		params.CurrentTime = time.Now().UTC()
	}

	opp := params.Opportunity
	budgetCap, _ := strconv.ParseFloat(opp.BudgetConstraintUSDC, 64)
	if budgetCap <= 0 {
		budgetCap = 100.0
	}

	var candidates []CandidateMatch
	alternativesRejected := make(map[string]string)

	for _, listing := range params.Listings {
		// Enforce tenant boundary
		if listing.TenantID != opp.TenantID {
			continue
		}

		c := CandidateMatch{
			ProviderID: listing.ProviderAgentID,
			ListingID:  listing.ListingID,
		}

		// 1. Capability Compatibility
		if listing.CapabilityID != opp.Capability {
			c.CapabilityMatch = false
			c.Disqualification = fmt.Sprintf("Capability mismatch: listing offers %s, required %s", listing.CapabilityID, opp.Capability)
			alternativesRejected[listing.ProviderAgentID] = c.Disqualification
			candidates = append(candidates, c)
			continue
		}
		c.CapabilityMatch = true

		// 2. Listing Status & Availability
		if listing.Status != ListingStatusActive {
			c.Disqualification = fmt.Sprintf("Listing is %s (must be ACTIVE)", listing.Status)
			alternativesRejected[listing.ProviderAgentID] = c.Disqualification
			candidates = append(candidates, c)
			continue
		}
		c.Availability = listing.Availability
		if listing.Availability == AvailabilityOffline || listing.Availability == AvailabilityMaintenance {
			c.Disqualification = fmt.Sprintf("Provider availability is %s", listing.Availability)
			alternativesRejected[listing.ProviderAgentID] = c.Disqualification
			candidates = append(candidates, c)
			continue
		}

		// 3. Price & Budget Cap (INV-185)
		price, _ := strconv.ParseFloat(listing.BasePriceUSDC, 64)
		c.EstimatedCostUSDC = listing.BasePriceUSDC
		if price > budgetCap {
			c.Disqualification = fmt.Sprintf("Price %.2f USDC exceeds opportunity budget cap %.2f USDC", price, budgetCap)
			alternativesRejected[listing.ProviderAgentID] = c.Disqualification
			candidates = append(candidates, c)
			continue
		}

		// 4. Deadline Feasibility
		c.EstimatedLatencyMS = listing.EstimatedLatencyMS
		if c.EstimatedLatencyMS <= 0 {
			c.EstimatedLatencyMS = 1000
		}
		expectedCompletion := params.CurrentTime.Add(time.Duration(c.EstimatedLatencyMS) * time.Millisecond)
		if expectedCompletion.After(opp.Deadline) {
			c.Disqualification = fmt.Sprintf("Estimated completion %s exceeds deadline %s", expectedCompletion.Format(time.RFC3339), opp.Deadline.Format(time.RFC3339))
			alternativesRejected[listing.ProviderAgentID] = c.Disqualification
			candidates = append(candidates, c)
			continue
		}

		// 5. Policy Compatibility (INV-182)
		allowed := true
		if len(params.PolicyAllowList) > 0 {
			if isAllowed, exists := params.PolicyAllowList[listing.ProviderAgentID]; exists && !isAllowed {
				allowed = false
			}
		}
		c.PolicyCompatible = allowed
		if !allowed {
			c.Disqualification = "Policy engine DENY for provider"
			alternativesRejected[listing.ProviderAgentID] = c.Disqualification
			candidates = append(candidates, c)
			continue
		}

		// 6. Risk Compatibility (INV-183, INV-198)
		risk := 15 // default low risk
		if r, ok := params.RiskScores[listing.ProviderAgentID]; ok {
			risk = r
		}
		c.RiskScore = risk
		maxRisk := params.MaxAllowedRisk
		if maxRisk <= 0 {
			maxRisk = 50
		}
		if risk > maxRisk {
			c.Disqualification = fmt.Sprintf("Risk score %d exceeds threshold %d", risk, maxRisk)
			alternativesRejected[listing.ProviderAgentID] = c.Disqualification
			candidates = append(candidates, c)
			continue
		}

		// 7. Contextual Empirical Performance from EconomicMemory
		metricKey := fmt.Sprintf("%s:%s", listing.ProviderAgentID, listing.CapabilityID)
		if m, ok := params.MetricsMap[metricKey]; ok && m.SampleSize > 0 {
			c.SampleSize = m.SampleSize
			c.HistoricalSuccessRate = m.CompletionRate
			c.Confidence = calculateConfidence(m.SampleSize)
			c.ContextualScore = m.CompletionRate * 0.7 + m.ResultAcceptanceRate * 0.3
		} else {
			// Unobserved new candidate: baseline prior
			c.SampleSize = 0
			c.HistoricalSuccessRate = 0.90
			c.Confidence = 0.50
			c.ContextualScore = 0.90
		}

		// Composite Score calculation (0.0 to 100.0)
		// Factors: Success Rate (40%), Price Efficiency (30%), Latency (15%), Risk (15%)
		priceScore := 1.0 - (price / (budgetCap + 0.001))
		if priceScore < 0 {
			priceScore = 0
		}
		riskScoreFactor := 1.0 - (float64(risk) / 100.0)
		c.Score = (c.ContextualScore * 40.0) + (priceScore * 30.0) + (riskScoreFactor * 15.0) + 15.0

		c.MatchReasons = []string{
			"Capability verified: " + listing.CapabilityID,
			fmt.Sprintf("Price %.2f USDC under budget cap %.2f USDC", price, budgetCap),
			fmt.Sprintf("Policy cleared (Risk score: %d/100)", risk),
			fmt.Sprintf("Contextual success rate: %.1f%% (sample size: %d)", c.HistoricalSuccessRate*100, c.SampleSize),
		}

		candidates = append(candidates, c)
	}

	// Deterministic Canonical Sorting & Tie-Breaking (Section 9)
	// 1. Qualified vs Disqualified
	// 2. Score descending
	// 3. Lowest Price ascending
	// 4. Lowest Latency ascending
	// 5. Provider ID alphabetical tie-break
	sort.Slice(candidates, func(i, j int) bool {
		qI := candidates[i].Disqualification == ""
		qJ := candidates[j].Disqualification == ""
		if qI != qJ {
			return qI // qualified first
		}
		if candidates[i].Score != candidates[j].Score {
			return candidates[i].Score > candidates[j].Score
		}
		pI, _ := strconv.ParseFloat(candidates[i].EstimatedCostUSDC, 64)
		pJ, _ := strconv.ParseFloat(candidates[j].EstimatedCostUSDC, 64)
		if pI != pJ {
			return pI < pJ
		}
		if candidates[i].EstimatedLatencyMS != candidates[j].EstimatedLatencyMS {
			return candidates[i].EstimatedLatencyMS < candidates[j].EstimatedLatencyMS
		}
		return candidates[i].ProviderID < candidates[j].ProviderID
	})

	// Assign ranks
	var selected *CandidateMatch
	for i := range candidates {
		candidates[i].Rank = i + 1
		if candidates[i].Disqualification == "" && selected == nil {
			selected = &candidates[i]
		}
	}

	// Build MatchExplanation (Section 10)
	explanation := MatchExplanation{
		OpportunityID:       opp.OpportunityID,
		AlternativeRejected: alternativesRejected,
	}

	if selected != nil {
		explanation.SelectedProviderID = selected.ProviderID
		explanation.SelectedListingID = selected.ListingID
		explanation.CapabilityMatch = "MATCH"
		explanation.DeadlineFeasibility = "FEASIBLE"
		explanation.PolicyStatus = "ALLOWED"
		explanation.RiskStatus = fmt.Sprintf("WITHIN_LIMIT (Score: %d)", selected.RiskScore)
		explanation.AvailabilityStatus = string(selected.Availability)
		explanation.QuoteAmountUSDC = selected.EstimatedCostUSDC
		explanation.HistoricalSuccess = fmt.Sprintf("%.1f%% completion", selected.HistoricalSuccessRate*100)
		explanation.SampleSize = selected.SampleSize
		explanation.TieBreakReason = "Deterministic rank #1 by composite score and provider ID"
	} else {
		explanation.CapabilityMatch = "NO_QUALIFIED_PROVIDER"
		explanation.PolicyStatus = "N/A"
	}

	// Deterministic execution ID
	rawHash := fmt.Sprintf("%s:%d:%s", opp.OpportunityID, len(candidates), explanation.SelectedProviderID)
	h := sha256.Sum256([]byte(rawHash))
	deterministicID := "match_" + hex.EncodeToString(h[:8])

	return &CandidateSet{
		OpportunityID:   opp.OpportunityID,
		Candidates:      candidates,
		SelectedMatch:   selected,
		Explanation:     explanation,
		EvaluatedAt:     params.CurrentTime,
		DeterministicID: deterministicID,
	}, nil
}

func calculateConfidence(sampleSize int) float64 {
	if sampleSize <= 0 {
		return 0.50
	}
	if sampleSize < 10 {
		return 0.70
	}
	if sampleSize < 50 {
		return 0.85
	}
	if sampleSize < 200 {
		return 0.95
	}
	return 0.99
}
