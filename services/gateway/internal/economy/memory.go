package economy

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"sort"
	"sync"
	"time"
)

// EconomicMemoryStore manages immutable, append-only economic interaction observations
// with strict multi-tenant isolation, real vs simulation segregation, and deterministic metrics aggregation.
//
// SECURITY INVARIANT (Data Poisoning Defense):
// Observations are strictly append-only and can ONLY be recorded by AgentPay's internal
// execution gates (settled payments, verified results, validated timeouts).
// External agents or provider self-claims are never permitted to insert or mutate observations.
//
// SECURITY INVARIANT (Simulation Boundary):
// Simulation observations are strictly segregated from real economic performance.
// Real performance aggregates (RealPerformance) NEVER ingest simulation runs.
type EconomicMemoryStore struct {
	mu                   sync.RWMutex
	observations         []*EconomicObservation
	obsByID              map[string]*EconomicObservation
	byServiceReal        map[string][]*EconomicObservation // key: orgID:serviceID
	byServiceSim         map[string][]*EconomicObservation // key: orgID:serviceID
	byMission            map[string][]*EconomicObservation // key: orgID:missionID
	byAgent              map[string][]*EconomicObservation // key: orgID:agentID
	byCapabilityReal     map[string][]*EconomicObservation // key: orgID:capability
	byCapabilitySim      map[string][]*EconomicObservation // key: orgID:capability
	bySwarm              map[string][]*EconomicObservation // key: orgID:swarmID
	recoveryPatterns     []*RecoveryPattern
	strategyPerformances map[string]*StrategyPerformance   // key: strategy
	missionSummaries     map[string]*MissionOutcomeSummary // key: orgID:missionID
	swarmSummaries       map[string]*SwarmOutcomeSummary   // key: orgID:swarmID
	features             map[string][]*PerformanceFeature  // key: orgID:entityID
	recommendations      map[string][]*EconomicRecommendation // key: orgID
	recByID              map[string]*EconomicRecommendation
	recOutcomes          map[string][]*RecommendationOutcome  // key: recID
	drifts               map[string][]*EconomicDrift          // key: orgID
}

// NewEconomicMemoryStore initializes the in-memory append-only observation store.
func NewEconomicMemoryStore() *EconomicMemoryStore {
	return &EconomicMemoryStore{
		observations:         make([]*EconomicObservation, 0),
		obsByID:              make(map[string]*EconomicObservation),
		byServiceReal:        make(map[string][]*EconomicObservation),
		byServiceSim:         make(map[string][]*EconomicObservation),
		byMission:            make(map[string][]*EconomicObservation),
		byAgent:              make(map[string][]*EconomicObservation),
		byCapabilityReal:     make(map[string][]*EconomicObservation),
		byCapabilitySim:      make(map[string][]*EconomicObservation),
		bySwarm:              make(map[string][]*EconomicObservation),
		recoveryPatterns:     make([]*RecoveryPattern, 0),
		strategyPerformances: make(map[string]*StrategyPerformance),
		missionSummaries:     make(map[string]*MissionOutcomeSummary),
		swarmSummaries:       make(map[string]*SwarmOutcomeSummary),
		features:             make(map[string][]*PerformanceFeature),
		recommendations:      make(map[string][]*EconomicRecommendation),
		recByID:              make(map[string]*EconomicRecommendation),
		recOutcomes:          make(map[string][]*RecommendationOutcome),
		drifts:               make(map[string][]*EconomicDrift),
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
// Enforces append-only immutability and real vs simulation isolation.
func (s *EconomicMemoryStore) RecordObservation(ctx context.Context, obs *EconomicObservation) (*EconomicObservation, error) {
	if obs == nil {
		return nil, fmt.Errorf("cannot record nil economic observation")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Check deduplication / immutability
	if obs.ID != "" {
		if existing, exists := s.obsByID[obs.ID]; exists {
			// Idempotent: return existing immutable record
			return existing, nil
		}
	}

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
	if copied.SimulationFlag == "" {
		copied.SimulationFlag = ModeReal
	}
	if copied.Scope == "" {
		copied.Scope = ScopeOrganization
	}

	// Normalise provider and price
	if copied.Provider == "" && copied.ServiceID != "" {
		copied.Provider = copied.ServiceID
	}
	if copied.ServiceID == "" && copied.Provider != "" {
		copied.ServiceID = copied.Provider
	}
	if copied.SettledCost == "" && copied.Price != "" {
		copied.SettledCost = copied.Price
	}
	if copied.Price == "" && copied.SettledCost != "" {
		copied.Price = copied.SettledCost
	}
	if copied.ExecutionDuration == 0 && copied.LatencyMs > 0 {
		copied.ExecutionDuration = copied.LatencyMs
	}
	if copied.LatencyMs == 0 && copied.ExecutionDuration > 0 {
		copied.LatencyMs = copied.ExecutionDuration
	}

	s.observations = append(s.observations, &copied)
	s.obsByID[copied.ID] = &copied

	// Index by service with strict Real vs Simulation segregation
	svcID := copied.GetProvider()
	if svcID != "" {
		sKey := memKey(copied.OrganizationID, svcID)
		if copied.SimulationFlag == ModeSimulation {
			s.byServiceSim[sKey] = append(s.byServiceSim[sKey], &copied)
		} else {
			s.byServiceReal[sKey] = append(s.byServiceReal[sKey], &copied)
		}
	}

	// Index by capability
	if copied.Capability != "" {
		cKey := memKey(copied.OrganizationID, copied.Capability)
		if copied.SimulationFlag == ModeSimulation {
			s.byCapabilitySim[cKey] = append(s.byCapabilitySim[cKey], &copied)
		} else {
			s.byCapabilityReal[cKey] = append(s.byCapabilityReal[cKey], &copied)
		}
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

	// Index by swarm
	if copied.SwarmID != "" {
		swKey := memKey(copied.OrganizationID, copied.SwarmID)
		s.bySwarm[swKey] = append(s.bySwarm[swKey], &copied)
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

// GetObservationsByAgent retrieves observations for a specific agent within an organization.
func (s *EconomicMemoryStore) GetObservationsByAgent(ctx context.Context, orgID, agentID string) []*EconomicObservation {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := memKey(orgID, agentID)
	items := s.byAgent[key]
	result := make([]*EconomicObservation, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}

// GetObservationsBySwarm retrieves observations for a specific swarm within an organization.
func (s *EconomicMemoryStore) GetObservationsBySwarm(ctx context.Context, orgID, swarmID string) []*EconomicObservation {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := memKey(orgID, swarmID)
	items := s.bySwarm[key]
	result := make([]*EconomicObservation, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}

// GetObservationsByService retrieves real observations for a service (default: REAL).
// GetObservations returns recent observations for an organization up to limit.
func (s *EconomicMemoryStore) GetObservations(ctx context.Context, orgID string, limit int) []*EconomicObservation {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*EconomicObservation
	for i := len(s.observations) - 1; i >= 0; i-- {
		obs := s.observations[i]
		if orgID != "" && orgID != "global" && obs.OrganizationID != orgID {
			continue
		}
		c := *obs
		result = append(result, &c)
		if limit > 0 && len(result) >= limit {
			break
		}
	}
	return result
}

// INVARIANT: Real performance calculations NEVER ingest simulation observations.
func (s *EconomicMemoryStore) GetObservationsByService(ctx context.Context, orgID, serviceID string) []*EconomicObservation {
	return s.GetObservationsByServiceWithMode(ctx, orgID, serviceID, ModeReal)
}

// GetObservationsByServiceWithMode retrieves observations with explicit Real vs Simulation separation.
func (s *EconomicMemoryStore) GetObservationsByServiceWithMode(ctx context.Context, orgID, serviceID string, mode SimulationMode) []*EconomicObservation {
	s.mu.RLock()
	defer s.mu.RUnlock()

	targetMap := s.byServiceReal
	if mode == ModeSimulation {
		targetMap = s.byServiceSim
	}

	key := memKey(orgID, serviceID)
	items := targetMap[key]
	if len(items) == 0 && orgID != "global" {
		// Fallback to global baseline if tenant has no observations yet
		items = targetMap[memKey("global", serviceID)]
	}

	result := make([]*EconomicObservation, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}

// GetObservationsByCapability retrieves observations for a capability.
func (s *EconomicMemoryStore) GetObservationsByCapability(ctx context.Context, orgID, capability string, mode SimulationMode) []*EconomicObservation {
	s.mu.RLock()
	defer s.mu.RUnlock()

	targetMap := s.byCapabilityReal
	if mode == ModeSimulation {
		targetMap = s.byCapabilitySim
	}

	key := memKey(orgID, capability)
	items := targetMap[key]
	if len(items) == 0 && orgID != "global" {
		items = targetMap[memKey("global", capability)]
	}

	result := make([]*EconomicObservation, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}

// CalculateConfidence implements small-sample protection rules.
func CalculateConfidence(sampleCount int) ConfidenceLevel {
	if sampleCount < 5 {
		return ConfidenceInsufficientData
	} else if sampleCount < 20 {
		return ConfidenceLowConfidence
	} else if sampleCount < 100 {
		return ConfidenceModerateConfidence
	}
	return ConfidenceHigherConfidence
}

// CalculateLatencyPercentiles computes deterministic latency distribution percentiles.
func CalculateLatencyPercentiles(latencies []int64) LatencyPercentiles {
	n := len(latencies)
	if n == 0 {
		return LatencyPercentiles{}
	}

	sorted := make([]int64, n)
	copy(sorted, latencies)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })

	getPerc := func(pct float64) int64 {
		idx := int(float64(n-1) * pct)
		if idx >= n {
			idx = n - 1
		}
		return sorted[idx]
	}

	return LatencyPercentiles{
		P50Ms:       getPerc(0.50),
		P75Ms:       getPerc(0.75),
		P90Ms:       getPerc(0.90),
		P95Ms:       getPerc(0.95),
		P99Ms:       getPerc(0.99),
		SampleCount: uint64(n),
	}
}

// CalculateQuoteAccuracy calculates systematic deviations between quotes and reality.
func CalculateQuoteAccuracy(observations []*EconomicObservation) QuoteAccuracyMetrics {
	var metrics QuoteAccuracyMetrics
	metrics.TotalQuotedCost = big.NewInt(0)
	metrics.TotalSettledCost = big.NewInt(0)
	metrics.AbsoluteCostDiff = big.NewInt(0)

	for _, o := range observations {
		if o.QuotedCost == "" || o.GetSettledCost() == "" {
			continue
		}
		qCost, ok1 := new(big.Int).SetString(o.QuotedCost, 10)
		sCost, ok2 := new(big.Int).SetString(o.GetSettledCost(), 10)
		if !ok1 || !ok2 {
			continue
		}

		metrics.SampleCount++
		metrics.TotalQuotedCost.Add(metrics.TotalQuotedCost, qCost)
		metrics.TotalSettledCost.Add(metrics.TotalSettledCost, sCost)

		cmp := sCost.Cmp(qCost)
		if cmp > 0 {
			metrics.UnderquoteCostCount++
			diff := new(big.Int).Sub(sCost, qCost)
			metrics.AbsoluteCostDiff.Add(metrics.AbsoluteCostDiff, diff)
		} else if cmp < 0 {
			metrics.OverquoteCostCount++
			diff := new(big.Int).Sub(qCost, sCost)
			metrics.AbsoluteCostDiff.Add(metrics.AbsoluteCostDiff, diff)
		}

		if o.Metadata != nil {
			if qDur, ok := o.Metadata["quoted_duration_ms"].(float64); ok && qDur > 0 {
				metrics.TotalQuotedDurationMs += int64(qDur)
				metrics.TotalActualDurationMs += o.GetDurationMs()
				if o.GetDurationMs() > int64(qDur) {
					metrics.UnderquoteDurationCount++
				} else if o.GetDurationMs() < int64(qDur) {
					metrics.OverquoteDurationCount++
				}
			}
		}
	}

	if metrics.SampleCount > 0 && metrics.TotalQuotedCost.Sign() > 0 {
		var num big.Int
		num.Mul(metrics.AbsoluteCostDiff, big.NewInt(10000))
		errBps := new(big.Int).Div(&num, metrics.TotalQuotedCost)
		metrics.CostErrorBps = errBps.Int64()
	}

	if metrics.TotalQuotedDurationMs > 0 {
		diff := metrics.TotalActualDurationMs - metrics.TotalQuotedDurationMs
		if diff < 0 {
			diff = -diff
		}
		metrics.DurationErrorBps = (diff * 10000) / metrics.TotalQuotedDurationMs
	}

	return metrics
}

// CalculateCostModel generates deterministic cost expectations.
func CalculateCostModel(observations []*EconomicObservation) EconomicCostModel {
	var model EconomicCostModel
	model.ExpectedCost = big.NewInt(0)
	model.CostVariance = big.NewInt(0)
	model.FailureRetryCost = big.NewInt(0)
	model.VerificationCost = big.NewInt(0)
	model.DelegationCost = big.NewInt(0)

	prices := make([]*big.Int, 0, len(observations))
	var totalCost big.Int

	for _, o := range observations {
		costStr := o.GetSettledCost()
		if costStr == "" {
			continue
		}
		p, ok := new(big.Int).SetString(costStr, 10)
		if !ok || p.Sign() <= 0 {
			continue
		}
		prices = append(prices, p)
		totalCost.Add(&totalCost, p)

		if model.CostRangeMin == nil || p.Cmp(model.CostRangeMin) < 0 {
			model.CostRangeMin = new(big.Int).Set(p)
		}
		if model.CostRangeMax == nil || p.Cmp(model.CostRangeMax) > 0 {
			model.CostRangeMax = new(big.Int).Set(p)
		}

		if o.RetryCount > 0 {
			model.FailureRetryCost.Add(model.FailureRetryCost, p)
		}
	}

	n := int64(len(prices))
	model.SampleCount = uint64(n)
	if n == 0 {
		model.CostRangeMin = big.NewInt(0)
		model.CostRangeMax = big.NewInt(0)
		return model
	}

	model.ExpectedCost = new(big.Int).Div(&totalCost, big.NewInt(n))

	var sumDiffSq big.Int
	for _, p := range prices {
		diff := new(big.Int).Sub(p, model.ExpectedCost)
		diffSq := new(big.Int).Mul(diff, diff)
		sumDiffSq.Add(&sumDiffSq, diffSq)
	}
	model.CostVariance = new(big.Int).Div(&sumDiffSq, big.NewInt(n))

	return model
}

func filterByWindow(rawObs []*EconomicObservation, window PerformanceWindow) []*EconomicObservation {
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
	case WindowLast30Days:
		cutoff := now.Add(-30 * 24 * time.Hour)
		for _, o := range rawObs {
			if o.Timestamp.After(cutoff) {
				filtered = append(filtered, o)
			}
		}
	case WindowLast90Days:
		cutoff := now.Add(-90 * 24 * time.Hour)
		for _, o := range rawObs {
			if o.Timestamp.After(cutoff) {
				filtered = append(filtered, o)
			}
		}
	case WindowAllTime:
		fallthrough
	default:
		filtered = rawObs
	}
	return filtered
}

// CalculatePerformanceProfile computes deterministic multi-signal economic intelligence.
func (s *EconomicMemoryStore) CalculatePerformanceProfile(ctx context.Context, orgID, entityID, entityType string, window PerformanceWindow, mode SimulationMode) *EconomicPerformanceProfile {
	var rawObs []*EconomicObservation
	if entityType == "capability" {
		rawObs = s.GetObservationsByCapability(ctx, orgID, entityID, mode)
	} else if entityType == "agent" {
		rawObs = s.GetObservationsByAgent(ctx, orgID, entityID)
	} else {
		// provider or service
		rawObs = s.GetObservationsByServiceWithMode(ctx, orgID, entityID, mode)
	}

	filtered := filterByWindow(rawObs, window)
	now := time.Now().UTC()

	profile := &EconomicPerformanceProfile{
		EntityID:            entityID,
		EntityType:          entityType,
		OrganizationID:      orgID,
		Window:              window,
		SimulationMode:      mode,
		AverageCost:         big.NewInt(0),
		CostVariance:        big.NewInt(0),
		ContextualBreakdown: make(map[string]ContextualPerformance),
		AggregationVersion:  "v1",
		UpdatedAt:           now,
	}

	total := uint64(len(filtered))
	profile.TotalJobs = total
	profile.Confidence = CalculateConfidence(len(rawObs))

	if mode == ModeSimulation {
		profile.SimulatedJobs = total
	} else {
		profile.RealJobs = total
	}

	if total == 0 {
		profile.QuoteAccuracy = QuoteAccuracyMetrics{
			TotalQuotedCost:  big.NewInt(0),
			TotalSettledCost: big.NewInt(0),
			AbsoluteCostDiff: big.NewInt(0),
		}
		profile.CostModel = EconomicCostModel{
			ExpectedCost:     big.NewInt(0),
			CostRangeMin:     big.NewInt(0),
			CostRangeMax:     big.NewInt(0),
			CostVariance:     big.NewInt(0),
			FailureRetryCost: big.NewInt(0),
			VerificationCost: big.NewInt(0),
			DelegationCost:   big.NewInt(0),
		}
		return profile
	}

	var successfulJobs uint64
	var completedJobs uint64
	var timeouts uint64
	var verificationSuccesses uint64
	var disputes uint64
	var refunds uint64
	var retries uint64
	var totalLatency int64
	latencies := make([]int64, 0, total)

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
		}
		if o.Outcome == OutcomeSuccess || o.Outcome == OutcomePartialSuccess {
			completedJobs++
		}
		if o.Outcome == OutcomeTimeout || o.EventType == ObservationTimeout {
			timeouts++
		}
		if o.Outcome == OutcomeDisputed || o.EventType == ObservationDispute {
			disputes++
		}
		if o.Outcome == OutcomeRefunded || o.EventType == ObservationRefund {
			refunds++
		}
		if o.Outcome != OutcomeVerificationFailed && o.VerificationResult != "FAILED" {
			verificationSuccesses++
		}
		if o.RetryCount > 0 {
			retries++
		}

		dur := o.GetDurationMs()
		if dur > 0 {
			totalLatency += dur
			latencies = append(latencies, dur)
		}

		// Capability breakdown
		capName := o.Capability
		if capName == "" && o.InputContext != nil {
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
			ct.totalLatency += dur
			ct.totalQuality += o.QualityScore
		}
	}

	profile.SuccessRateBps = int64((successfulJobs * 10000) / total)
	profile.CompletionRateBps = int64((completedJobs * 10000) / total)
	profile.TimeoutRateBps = int64((timeouts * 10000) / total)
	profile.VerificationSuccessRateBps = int64((verificationSuccesses * 10000) / total)
	profile.DisputeRateBps = int64((disputes * 10000) / total)
	profile.RefundRateBps = int64((refunds * 10000) / total)
	profile.RetryFrequencyBps = int64((retries * 10000) / total)

	// Percentiles and Latency Variance
	profile.Percentiles = CalculateLatencyPercentiles(latencies)
	if len(latencies) > 0 {
		profile.AverageLatencyMs = totalLatency / int64(len(latencies))
		var sumLatDiffSq int64
		for _, l := range latencies {
			diff := l - profile.AverageLatencyMs
			sumLatDiffSq += diff * diff
		}
		profile.LatencyVariance = sumLatDiffSq / int64(len(latencies))
	}

	// Cost and Quote intelligence
	profile.CostModel = CalculateCostModel(filtered)
	profile.AverageCost = profile.CostModel.ExpectedCost
	profile.CostVariance = profile.CostModel.CostVariance
	profile.QuoteAccuracy = CalculateQuoteAccuracy(filtered)

	for capName, ct := range ctxMap {
		if ct.totalJobs > 0 {
			profile.ContextualBreakdown[capName] = ContextualPerformance{
				Capability:        capName,
				TotalJobs:         ct.totalJobs,
				SuccessRateBps:    int64((ct.successJobs * 10000) / ct.totalJobs),
				AverageLatencyMs:  ct.totalLatency / int64(ct.totalJobs),
				AverageQualityBps: ct.totalQuality / int64(ct.totalJobs),
			}
		}
	}

	return profile
}

// GetDualPerformance returns both Real and Simulation profiles isolated side-by-side.
func (s *EconomicMemoryStore) GetDualPerformance(ctx context.Context, orgID, entityID, entityType string, window PerformanceWindow) *DualPerformanceContainer {
	realProfile := s.CalculatePerformanceProfile(ctx, orgID, entityID, entityType, window, ModeReal)
	simProfile := s.CalculatePerformanceProfile(ctx, orgID, entityID, entityType, window, ModeSimulation)

	return &DualPerformanceContainer{
		Real:       realProfile,
		Simulation: simProfile,
	}
}

// CalculatePerformance provides backwards compatibility with legacy ServicePerformance.
func (s *EconomicMemoryStore) CalculatePerformance(ctx context.Context, orgID, serviceID string, window PerformanceWindow) *ServicePerformance {
	rawObs := s.GetObservationsByService(ctx, orgID, serviceID)
	filtered := filterByWindow(rawObs, window)
	now := time.Now().UTC()

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

		dur := o.GetDurationMs()
		if dur > 0 {
			totalLatency += dur
			latencies = append(latencies, dur)
		}
		if o.QualityScore > 0 {
			totalQuality += o.QualityScore
		}

		priceStr := o.GetSettledCost()
		if priceStr != "" {
			if pInt, ok := new(big.Int).SetString(priceStr, 10); ok && pInt.Sign() > 0 {
				perf.TotalVolume.Add(perf.TotalVolume, pInt)
				prices = append(prices, pInt)
				validPriceCount++
			}
		}

		capName := o.Capability
		if capName == "" && o.InputContext != nil {
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
			ct.totalLatency += dur
			ct.totalQuality += o.QualityScore
		}
	}

	perf.SuccessRateBps = int64((successfulJobs * 10000) / total)
	perf.FailureRateBps = int64((failedJobs * 10000) / total)

	if validPriceCount > 0 {
		perf.AveragePrice = new(big.Int).Div(perf.TotalVolume, big.NewInt(validPriceCount))
		var sumDiffSq big.Int
		for _, p := range prices {
			diff := new(big.Int).Sub(p, perf.AveragePrice)
			diffSq := new(big.Int).Mul(diff, diff)
			sumDiffSq.Add(&sumDiffSq, diffSq)
		}
		perf.PriceVariance = new(big.Int).Div(&sumDiffSq, big.NewInt(validPriceCount))
	}

	if len(latencies) > 0 {
		perf.AverageLatencyMs = totalLatency / int64(len(latencies))
		var sumLatDiffSq int64
		for _, l := range latencies {
			diff := l - perf.AverageLatencyMs
			sumLatDiffSq += diff * diff
		}
		perf.LatencyVariance = sumLatDiffSq / int64(len(latencies))
	}

	if total > 0 && totalQuality > 0 {
		perf.ResultQualityBps = totalQuality / int64(total)
	} else {
		perf.ResultQualityBps = 8000
	}

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

// GetPublicReputation returns privacy-preserving network-wide aggregated performance.
// Omits sensitive tenant IDs, mission IDs, and private details.
func (s *EconomicMemoryStore) GetPublicReputation(ctx context.Context, providerID string) *EconomicPerformanceProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var allObs []*EconomicObservation
	for _, obsList := range s.byServiceReal {
		for _, obs := range obsList {
			if obs.GetProvider() == providerID && obs.Scope != ScopePrivate {
				allObs = append(allObs, obs)
			}
		}
	}

	// Compute profile on global public slice
	n := uint64(len(allObs))
	profile := &EconomicPerformanceProfile{
		EntityID:            providerID,
		EntityType:          "provider",
		OrganizationID:      "public",
		Window:              WindowAllTime,
		SimulationMode:      ModeReal,
		AverageCost:         big.NewInt(0),
		CostVariance:        big.NewInt(0),
		TotalJobs:           n,
		RealJobs:            n,
		Confidence:          CalculateConfidence(len(allObs)),
		AggregationVersion:  "v1",
		UpdatedAt:           time.Now().UTC(),
		ContextualBreakdown: make(map[string]ContextualPerformance),
	}

	if n == 0 {
		return profile
	}

	var successfulJobs uint64
	var totalLatency int64
	latencies := make([]int64, 0, n)

	for _, o := range allObs {
		if o.Success {
			successfulJobs++
		}
		dur := o.GetDurationMs()
		if dur > 0 {
			totalLatency += dur
			latencies = append(latencies, dur)
		}
	}

	profile.SuccessRateBps = int64((successfulJobs * 10000) / n)
	profile.Percentiles = CalculateLatencyPercentiles(latencies)
	if len(latencies) > 0 {
		profile.AverageLatencyMs = totalLatency / int64(len(latencies))
	}
	profile.CostModel = CalculateCostModel(allObs)
	profile.AverageCost = profile.CostModel.ExpectedCost

	return profile
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
		if o.GetProvider() == serviceID {
			totalJobs++
			if o.Success {
				successJobs++
			}
			dur := o.GetDurationMs()
			totalLatency += dur
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

// Recovery Pattern Methods
func (s *EconomicMemoryStore) RecordRecoveryPattern(ctx context.Context, pattern *RecoveryPattern) {
	if pattern == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	copied := *pattern
	s.recoveryPatterns = append(s.recoveryPatterns, &copied)
}

func (s *EconomicMemoryStore) GetRecoveryPatterns(ctx context.Context, capability string) []*RecoveryPattern {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*RecoveryPattern
	for _, p := range s.recoveryPatterns {
		if capability == "" || p.Capability == capability {
			c := *p
			result = append(result, &c)
		}
	}
	return result
}

// Strategy Performance Methods
func (s *EconomicMemoryStore) RecordStrategyPerformance(ctx context.Context, perf *StrategyPerformance) {
	if perf == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	copied := *perf
	s.strategyPerformances[copied.Strategy] = &copied
}

func (s *EconomicMemoryStore) GetStrategyPerformance(ctx context.Context, strategy string) *StrategyPerformance {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if p, exists := s.strategyPerformances[strategy]; exists {
		c := *p
		return &c
	}
	return nil
}

// Mission & Swarm Summary Methods
func (s *EconomicMemoryStore) RecordMissionSummary(ctx context.Context, summary *MissionOutcomeSummary) {
	if summary == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	key := memKey(summary.OrganizationID, summary.MissionID)
	copied := *summary
	s.missionSummaries[key] = &copied
}

func (s *EconomicMemoryStore) GetMissionSummary(ctx context.Context, orgID, missionID string) *MissionOutcomeSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := memKey(orgID, missionID)
	if m, exists := s.missionSummaries[key]; exists {
		c := *m
		return &c
	}
	return nil
}

func (s *EconomicMemoryStore) RecordSwarmSummary(ctx context.Context, summary *SwarmOutcomeSummary) {
	if summary == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	key := memKey(summary.OrganizationID, summary.SwarmID)
	copied := *summary
	s.swarmSummaries[key] = &copied
}

func (s *EconomicMemoryStore) GetSwarmSummary(ctx context.Context, orgID, swarmID string) *SwarmOutcomeSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := memKey(orgID, swarmID)
	if sw, exists := s.swarmSummaries[key]; exists {
		c := *sw
		return &c
	}
	return nil
}

// Feature Store Methods
func (s *EconomicMemoryStore) RecordFeature(ctx context.Context, feat *PerformanceFeature) {
	if feat == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	key := memKey(feat.OrganizationID, feat.EntityID)
	copied := *feat
	s.features[key] = append(s.features[key], &copied)
}

func (s *EconomicMemoryStore) GetFeatures(ctx context.Context, orgID, entityID string) []*PerformanceFeature {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := memKey(orgID, entityID)
	items := s.features[key]
	result := make([]*PerformanceFeature, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}

// Recommendation Methods
func (s *EconomicMemoryStore) RecordRecommendation(ctx context.Context, rec *EconomicRecommendation) {
	if rec == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	copied := *rec
	s.recommendations[copied.OrganizationID] = append(s.recommendations[copied.OrganizationID], &copied)
	s.recByID[copied.ID] = &copied
}

func (s *EconomicMemoryStore) GetRecommendations(ctx context.Context, orgID string) []*EconomicRecommendation {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := s.recommendations[orgID]
	result := make([]*EconomicRecommendation, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}

func (s *EconomicMemoryStore) RecordRecommendationOutcome(ctx context.Context, outcome *RecommendationOutcome) {
	if outcome == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	copied := *outcome
	s.recOutcomes[copied.RecommendationID] = append(s.recOutcomes[copied.RecommendationID], &copied)
	if r, exists := s.recByID[copied.RecommendationID]; exists {
		r.Status = "OUTCOME_AVAILABLE"
	}
}

func (s *EconomicMemoryStore) GetRecommendationOutcomes(ctx context.Context, recID string) []*RecommendationOutcome {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := s.recOutcomes[recID]
	result := make([]*RecommendationOutcome, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}

// Economic Drift Methods
func (s *EconomicMemoryStore) RecordDrift(ctx context.Context, drift *EconomicDrift) {
	if drift == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	copied := *drift
	s.drifts[copied.OrganizationID] = append(s.drifts[copied.OrganizationID], &copied)
}

func (s *EconomicMemoryStore) GetDrifts(ctx context.Context, orgID string) []*EconomicDrift {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := s.drifts[orgID]
	result := make([]*EconomicDrift, len(items))
	for i, it := range items {
		c := *it
		result[i] = &c
	}
	return result
}
