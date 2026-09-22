package economy

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"sync"
	"time"
)

// EconomicMemoryStore manages immutable, append-only economic interaction observations
// with strict multi-tenant isolation and deterministic metrics aggregation.
//
// SECURITY INVARIANT (Data Poisoning Defense):
// Observations are strictly append-only and can ONLY be recorded by AgentPay's internal
// execution gates (settled payments, verified results, validated timeouts).
// External agents or provider self-claims are never permitted to insert or mutate observations.
type EconomicMemoryStore struct {
	mu           sync.RWMutex
	observations []*EconomicObservation
	byService    map[string][]*EconomicObservation // key: orgID:serviceID
	byMission    map[string][]*EconomicObservation // key: orgID:missionID
	byAgent      map[string][]*EconomicObservation // key: orgID:agentID
}

// NewEconomicMemoryStore initializes the in-memory append-only observation store.
func NewEconomicMemoryStore() *EconomicMemoryStore {
	return &EconomicMemoryStore{
		observations: make([]*EconomicObservation, 0),
		byService:    make(map[string][]*EconomicObservation),
		byMission:    make(map[string][]*EconomicObservation),
		byAgent:      make(map[string][]*EconomicObservation),
	}
}

func memKey(orgID, entityID string) string {
	if orgID == "" {
		orgID = "global"
	}
	return fmt.Sprintf("%s:%s", orgID, entityID)
}

func generateObservationID() string {
	b := make([]byte, 10)
	_, _ = rand.Read(b)
	return fmt.Sprintf("obs_%s", hex.EncodeToString(b))
}

// RecordObservation appends an immutable observation to the economic memory.
func (s *EconomicMemoryStore) RecordObservation(ctx context.Context, obs *EconomicObservation) (*EconomicObservation, error) {
	if obs == nil {
		return nil, fmt.Errorf("cannot record nil economic observation")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	copied := *obs
	if copied.ID == "" {
		copied.ID = generateObservationID()
	}
	if copied.Timestamp.IsZero() {
		copied.Timestamp = time.Now().UTC()
	}
	if copied.OrganizationID == "" {
		copied.OrganizationID = "global"
	}

	s.observations = append(s.observations, &copied)

	// Index by service
	if copied.ServiceID != "" {
		sKey := memKey(copied.OrganizationID, copied.ServiceID)
		s.byService[sKey] = append(s.byService[sKey], &copied)
	}

	// Index by mission
	if copied.MissionID != "" {
		mKey := memKey(copied.OrganizationID, copied.MissionID)
		s.byMission[mKey] = append(s.byMission[mKey], &copied)
	}

	// Index by agent
	if copied.AgentID != "" {
		aKey := memKey(copied.OrganizationID, copied.AgentID)
		s.byAgent[aKey] = append(s.byAgent[aKey], &copied)
	}

	return &copied, nil
}

// GetObservationsByMission retrieves observations for a specific mission within an organization.
func (s *EconomicMemoryStore) GetObservationsByMission(ctx context.Context, orgID, missionID string) []*EconomicObservation {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := memKey(orgID, missionID)
	items := s.byMission[key]
	result := make([]*EconomicObservation, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}

// GetObservationsByService retrieves observations for a specific service within an organization.
func (s *EconomicMemoryStore) GetObservationsByService(ctx context.Context, orgID, serviceID string) []*EconomicObservation {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := memKey(orgID, serviceID)
	items := s.byService[key]
	if len(items) == 0 && orgID != "global" {
		// Fallback to global baseline if tenant has no observations yet
		items = s.byService[memKey("global", serviceID)]
	}

	result := make([]*EconomicObservation, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}

// CalculatePerformance computes deterministic aggregated service performance for a given time window.
// INVARIANT: All calculations use integer and basis-point arithmetic (0-10,000). Floating-point money arithmetic is prohibited.
func (s *EconomicMemoryStore) CalculatePerformance(ctx context.Context, orgID, serviceID string, window PerformanceWindow) *ServicePerformance {
	rawObs := s.GetObservationsByService(ctx, orgID, serviceID)
	now := time.Now().UTC()

	var filtered []*EconomicObservation
	switch window {
	case WindowLast10Jobs:
		if len(rawObs) > 10 {
			filtered = rawObs[len(rawObs)-10:]
		} else {
			filtered = rawObs
		}
	case WindowLast24Hours:
		cutoff := now.Add(-24 * time.Hour)
		for _, o := range rawObs {
			if o.Timestamp.After(cutoff) {
				filtered = append(filtered, o)
			}
		}
	case WindowLast7Days:
		cutoff := now.Add(-7 * 24 * time.Hour)
		for _, o := range rawObs {
			if o.Timestamp.After(cutoff) {
				filtered = append(filtered, o)
			}
		}
	case WindowAllTime:
		fallthrough
	default:
		window = WindowAllTime
		filtered = rawObs
	}

	perf := &ServicePerformance{
		ServiceID:           serviceID,
		OrganizationID:      orgID,
		Window:              window,
		AveragePrice:        big.NewInt(0),
		PriceVariance:       big.NewInt(0),
		TotalVolume:         big.NewInt(0),
		ContextualBreakdown: make(map[string]ContextualPerformance),
		UpdatedAt:           now,
	}

	total := uint64(len(filtered))
	perf.TotalJobs = total

	// Determine confidence based on total observations available
	obsCount := len(rawObs)
	if obsCount == 0 {
		perf.Confidence = ConfidenceUnknown
		return perf
	} else if obsCount < 3 {
		perf.Confidence = ConfidenceLow
	} else if obsCount < 10 {
		perf.Confidence = ConfidenceMedium
	} else {
		perf.Confidence = ConfidenceHigh
	}

	if total == 0 {
		return perf
	}

	var successfulJobs uint64
	var failedJobs uint64
	var totalLatency int64
	var totalQuality int64
	var validPriceCount int64
	prices := make([]*big.Int, 0, total)
	latencies := make([]int64, 0, total)

	// Contextual tracking per capability
	type ctxTracker struct {
		totalJobs    uint64
		successJobs  uint64
		totalLatency int64
		totalQuality int64
	}
	ctxMap := make(map[string]*ctxTracker)

	for _, o := range filtered {
		if o.Success {
			successfulJobs++
			if perf.LastSuccess == nil || o.Timestamp.After(*perf.LastSuccess) {
				ts := o.Timestamp
				perf.LastSuccess = &ts
			}
		} else {
			failedJobs++
			if perf.LastFailure == nil || o.Timestamp.After(*perf.LastFailure) {
				ts := o.Timestamp
				perf.LastFailure = &ts
			}
		}

		if o.LatencyMs > 0 {
			totalLatency += o.LatencyMs
			latencies = append(latencies, o.LatencyMs)
		}
		if o.QualityScore > 0 {
			totalQuality += o.QualityScore
		}

		if o.Price != "" {
			if pInt, ok := new(big.Int).SetString(o.Price, 10); ok && pInt.Sign() > 0 {
				perf.TotalVolume.Add(perf.TotalVolume, pInt)
				prices = append(prices, pInt)
				validPriceCount++
			}
		}

		// Contextual capability extraction
		capName := ""
		if o.InputContext != nil {
			if cVal, ok := o.InputContext["capability"].(string); ok {
				capName = cVal
			}
		}
		if capName != "" {
			ct, exists := ctxMap[capName]
			if !exists {
				ct = &ctxTracker{}
				ctxMap[capName] = ct
			}
			ct.totalJobs++
			if o.Success {
				ct.successJobs++
			}
			ct.totalLatency += o.LatencyMs
			ct.totalQuality += o.QualityScore
		}
	}

	// Success & Failure Rates in basis points (0-10000)
	perf.SuccessRateBps = int64((successfulJobs * 10000) / total)
	perf.FailureRateBps = int64((failedJobs * 10000) / total)

	// Average Price & Variance (using base units)
	if validPriceCount > 0 {
		perf.AveragePrice = new(big.Int).Div(perf.TotalVolume, big.NewInt(validPriceCount))

		// Price Variance = sum((p - avg)^2) / N
		var sumDiffSq big.Int
		for _, p := range prices {
			diff := new(big.Int).Sub(p, perf.AveragePrice)
			diffSq := new(big.Int).Mul(diff, diff)
			sumDiffSq.Add(&sumDiffSq, diffSq)
		}
		perf.PriceVariance = new(big.Int).Div(&sumDiffSq, big.NewInt(validPriceCount))
	}

	// Average Latency & Variance
	if len(latencies) > 0 {
		perf.AverageLatencyMs = totalLatency / int64(len(latencies))
		var sumLatDiffSq int64
		for _, l := range latencies {
			diff := l - perf.AverageLatencyMs
			sumLatDiffSq += diff * diff
		}
		perf.LatencyVariance = sumLatDiffSq / int64(len(latencies))
	}

	// Average Result Quality
	if total > 0 && totalQuality > 0 {
		perf.ResultQualityBps = totalQuality / int64(total)
	} else {
		perf.ResultQualityBps = 8000 // default 80% baseline
	}

	// Recent Success Rate (last 10 jobs from rawObs)
	recentWindow := rawObs
	if len(recentWindow) > 10 {
		recentWindow = recentWindow[len(recentWindow)-10:]
	}
	if len(recentWindow) > 0 {
		var rSucc uint64
		for _, ro := range recentWindow {
			if ro.Success {
				rSucc++
			}
		}
		perf.RecentSuccessRateBps = int64((rSucc * 10000) / uint64(len(recentWindow)))
		perf.RecentFailureRateBps = 10000 - perf.RecentSuccessRateBps
	}

	// Populate Contextual Breakdown
	for capName, ct := range ctxMap {
		if ct.totalJobs > 0 {
			perf.ContextualBreakdown[capName] = ContextualPerformance{
				Capability:        capName,
				TotalJobs:         ct.totalJobs,
				SuccessRateBps:    int64((ct.successJobs * 10000) / ct.totalJobs),
				AverageLatencyMs:  ct.totalLatency / int64(ct.totalJobs),
				AverageQualityBps: ct.totalQuality / int64(ct.totalJobs),
			}
		}
	}

	return perf
}

// GetAgentServiceAffinity returns historical interaction statistics between an agent and a service.
func (s *EconomicMemoryStore) GetAgentServiceAffinity(ctx context.Context, orgID, agentID, serviceID string) *ContextualPerformance {
	s.mu.RLock()
	defer s.mu.RUnlock()

	aKey := memKey(orgID, agentID)
	agentObs := s.byAgent[aKey]

	var totalJobs, successJobs uint64
	var totalLatency, totalQuality int64

	for _, o := range agentObs {
		if o.ServiceID == serviceID {
			totalJobs++
			if o.Success {
				successJobs++
			}
			totalLatency += o.LatencyMs
			totalQuality += o.QualityScore
		}
	}

	if totalJobs == 0 {
		return nil
	}

	return &ContextualPerformance{
		Capability:        "agent_affinity",
		TotalJobs:         totalJobs,
		SuccessRateBps:    int64((successJobs * 10000) / totalJobs),
		AverageLatencyMs:  totalLatency / int64(totalJobs),
		AverageQualityBps: totalQuality / int64(totalJobs),
	}
}
