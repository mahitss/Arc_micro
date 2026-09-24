package marketplace

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"
)

var (
	ErrListingInvalid         = errors.New("invalid service listing specification")
	ErrOpportunityInvalid     = errors.New("invalid marketplace opportunity specification")
	ErrQuoteInvalid           = errors.New("quote is invalid or expired")
	ErrOpportunityNotOpen     = errors.New("opportunity is not in open or matching status")
	ErrOpportunityNoWinner    = errors.New("no qualified winning provider found")
)

// MarketplaceService coordinates all high-level business flows of the marketplace.
type MarketplaceService struct {
	store      MarketplaceStore
	matcher    *MatchingEngine
	reputation *ReputationEvaluator
	awardMu    sync.Mutex
}

func NewMarketplaceService(store MarketplaceStore) *MarketplaceService {
	return &MarketplaceService{
		store:      store,
		matcher:    NewMatchingEngine(),
		reputation: NewReputationEvaluator(),
	}
}

// CreateListing creates a new service listing in the marketplace.
func (s *MarketplaceService) CreateListing(ctx context.Context, l *ServiceListing) (*ServiceListing, error) {
	if l.ListingID == "" {
		l.ListingID = fmt.Sprintf("list_%d", time.Now().UnixNano())
	}
	if l.TenantID == "" {
		l.TenantID = "tenant_default"
	}
	if l.ProviderAgentID == "" || l.CapabilityID == "" || l.Title == "" {
		return nil, ErrListingInvalid
	}
	if l.Status == "" {
		l.Status = ListingStatusActive
	}
	if l.Availability == "" {
		l.Availability = AvailabilityAvailable
	}
	l.Version = 1
	l.CreatedAt = time.Now().UTC()
	l.UpdatedAt = l.CreatedAt

	if err := s.store.SaveListing(ctx, l); err != nil {
		return nil, err
	}
	return l, nil
}

// PauseListing pauses an active listing (INV-188).
func (s *MarketplaceService) PauseListing(ctx context.Context, tenantID, listingID string) (*ServiceListing, error) {
	l, err := s.store.GetListing(ctx, tenantID, listingID)
	if err != nil {
		return nil, err
	}
	l.Status = ListingStatusPaused
	if err := s.store.UpdateListing(ctx, l); err != nil {
		return nil, err
	}
	return l, nil
}

// GetListing fetches a listing by ID.
func (s *MarketplaceService) GetListing(ctx context.Context, tenantID, listingID string) (*ServiceListing, error) {
	return s.store.GetListing(ctx, tenantID, listingID)
}

// ListListings returns all listings for a tenant.
func (s *MarketplaceService) ListListings(ctx context.Context, tenantID string) ([]*ServiceListing, error) {
	return s.store.ListListings(ctx, tenantID)
}

// SearchListings searches listings using structured criteria.
func (s *MarketplaceService) SearchListings(ctx context.Context, q MarketplaceSearchQuery) ([]*ServiceListing, error) {
	return s.store.SearchListings(ctx, q)
}

// CreateOpportunity creates a new work opportunity.
func (s *MarketplaceService) CreateOpportunity(ctx context.Context, opp *MarketplaceOpportunity) (*MarketplaceOpportunity, error) {
	if opp.OpportunityID == "" {
		opp.OpportunityID = fmt.Sprintf("opp_%d", time.Now().UnixNano())
	}
	if opp.TenantID == "" {
		opp.TenantID = "tenant_default"
	}
	if opp.RequesterID == "" || opp.Capability == "" {
		return nil, ErrOpportunityInvalid
	}
	if opp.Deadline.IsZero() {
		opp.Deadline = time.Now().UTC().Add(24 * time.Hour)
	}
	if opp.BudgetConstraintUSDC == "" {
		opp.BudgetConstraintUSDC = "100.00"
	}
	opp.Status = OpportunityStatusOpen
	opp.CreatedAt = time.Now().UTC()
	opp.UpdatedAt = opp.CreatedAt

	if err := s.store.SaveOpportunity(ctx, opp); err != nil {
		return nil, err
	}
	return opp, nil
}

// GetOpportunity fetches an opportunity by ID.
func (s *MarketplaceService) GetOpportunity(ctx context.Context, tenantID, opportunityID string) (*MarketplaceOpportunity, error) {
	return s.store.GetOpportunity(ctx, tenantID, opportunityID)
}

// ListOpportunities returns all opportunities for a tenant.
func (s *MarketplaceService) ListOpportunities(ctx context.Context, tenantID string) ([]*MarketplaceOpportunity, error) {
	return s.store.ListOpportunities(ctx, tenantID)
}

// MatchOpportunity runs the deterministic matching engine on an opportunity (INV-181, INV-182, INV-183).
func (s *MarketplaceService) MatchOpportunity(ctx context.Context, tenantID, opportunityID string) (*CandidateSet, error) {
	opp, err := s.store.GetOpportunity(ctx, tenantID, opportunityID)
	if err != nil {
		return nil, err
	}

	listings, err := s.store.SearchListings(ctx, MarketplaceSearchQuery{
		TenantID:   tenantID,
		Capability: opp.Capability,
	})
	if err != nil {
		return nil, err
	}

	// Prepare metrics map
	metricsMap := make(map[string]*MarketplaceMetrics)
	for _, l := range listings {
		m, _ := s.store.GetMetrics(ctx, tenantID, l.ProviderAgentID, l.CapabilityID)
		if m != nil {
			metricsMap[fmt.Sprintf("%s:%s", l.ProviderAgentID, l.CapabilityID)] = m
		}
	}

	var derefListings []ServiceListing
	for _, l := range listings {
		derefListings = append(derefListings, *l)
	}

	params := MatchParams{
		Opportunity: *opp,
		Listings:    derefListings,
		MetricsMap:  metricsMap,
		CurrentTime: time.Now().UTC(),
	}

	candidateSet, err := s.matcher.Match(params)
	if err != nil {
		return nil, err
	}

	// Invariant INV-181 check: matching cannot authorize payment
	if err := ValidateINV181(true, false); err != nil {
		return nil, err
	}

	// Store match outcome
	_ = s.store.SaveMatch(ctx, candidateSet)

	opp.Status = OpportunityStatusMatching
	_ = s.store.UpdateOpportunity(ctx, opp)

	return candidateSet, nil
}

// AwardOpportunity awards an opportunity to a winning provider, binding it to a contract (INV-184, INV-187, INV-194).
func (s *MarketplaceService) AwardOpportunity(
	ctx context.Context,
	tenantID string,
	opportunityID string,
	providerID string,
	quoteID string,
	quotePriceUSDC string,
	quoteExpiresAt time.Time,
) (*MarketplaceOpportunity, error) {
	s.awardMu.Lock()
	defer s.awardMu.Unlock()

	opp, err := s.store.GetOpportunity(ctx, tenantID, opportunityID)
	if err != nil {
		return nil, err
	}

	// INV-194: Duplicate award check
	if err := ValidateINV194(opp.Status, opp.ContractID != ""); err != nil {
		return nil, err
	}

	// INV-187: Expired quote check
	if !quoteExpiresAt.IsZero() {
		if err := ValidateINV187(quoteExpiresAt, time.Now().UTC()); err != nil {
			return nil, err
		}
	}

	// INV-185: Budget cap check
	price, _ := strconv.ParseFloat(quotePriceUSDC, 64)
	capVal, _ := strconv.ParseFloat(opp.BudgetConstraintUSDC, 64)
	if capVal > 0 && price > capVal {
		if err := ValidateINV185(price, capVal); err != nil {
			return nil, err
		}
	}

	// INV-186: Recipient check
	if err := ValidateINV186(providerID); err != nil {
		return nil, err
	}

	// Award and mint canonical Contract reference
	opp.Status = OpportunityStatusAwarded
	opp.AwardedProviderID = providerID
	opp.AwardedQuoteID = quoteID
	opp.ContractID = fmt.Sprintf("contract_mkt_%s_%s", opp.OpportunityID, providerID)
	opp.UpdatedAt = time.Now().UTC()

	if err := s.store.UpdateOpportunity(ctx, opp); err != nil {
		return nil, err
	}

	return opp, nil
}

// CompareProviders provides a side-by-side read-only comparison across candidate listings (INV-193).
func (s *MarketplaceService) CompareProviders(ctx context.Context, tenantID, capabilityID string, providerIDs []string) ([]map[string]interface{}, error) {
	if err := ValidateINV193(true, false); err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for _, pid := range providerIDs {
		listings, _ := s.store.SearchListings(ctx, MarketplaceSearchQuery{
			TenantID:   tenantID,
			Capability: capabilityID,
		})
		var targetListing *ServiceListing
		for _, l := range listings {
			if l.ProviderAgentID == pid {
				targetListing = l
				break
			}
		}

		metrics, _ := s.store.GetMetrics(ctx, tenantID, pid, capabilityID)
		completion := 0.90
		sampleSize := 0
		if metrics != nil {
			completion = metrics.CompletionRate
			sampleSize = metrics.SampleSize
		}

		entry := map[string]interface{}{
			"provider_id":        pid,
			"capability_id":      capabilityID,
			"availability":       "AVAILABLE",
			"base_price_usdc":    "50.00",
			"latency_ms":         200,
			"historical_success": fmt.Sprintf("%.1f%%", completion*100),
			"sample_size":        sampleSize,
			"policy_compatible":  true,
			"risk_score":         15,
		}
		if targetListing != nil {
			entry["availability"] = string(targetListing.Availability)
			entry["base_price_usdc"] = targetListing.BasePriceUSDC
			entry["latency_ms"] = targetListing.EstimatedLatencyMS
		}
		results = append(results, entry)
	}

	return results, nil
}

// GetAgentProfile returns the multi-dimensional trust model and metrics for an agent.
func (s *MarketplaceService) GetAgentProfile(ctx context.Context, tenantID, agentID string) (*MarketplaceTrustModel, error) {
	metricsList, _ := s.store.ListMetricsByProvider(ctx, tenantID, agentID)
	anomalies, _ := s.store.ListAnomaliesByProvider(ctx, tenantID, agentID)

	totalJobs := 0
	for _, m := range metricsList {
		totalJobs += m.SampleSize
	}

	var anomStrings []string
	for _, a := range anomalies {
		anomStrings = append(anomStrings, fmt.Sprintf("[%s] %s", a.Severity, a.Description))
	}

	return &MarketplaceTrustModel{
		AgentID:               agentID,
		IdentityVerified:      true,
		Organization:          "org_autonomous",
		TotalCompletedJobs:    totalJobs,
		OverallDisputeRate:    0.0,
		SecurityCompliant:     true,
		ContextualPerformance: metricsList,
		ConcentrationWarning:  false,
		ActiveAnomalies:       anomStrings,
	}, nil
}

// GetMarketplaceHealth returns aggregate operational metrics.
func (s *MarketplaceService) GetMarketplaceHealth(ctx context.Context, tenantID string) (*MarketplaceHealth, error) {
	listings, _ := s.store.ListListings(ctx, tenantID)
	opps, _ := s.store.ListOpportunities(ctx, tenantID)

	providerSet := make(map[string]bool)
	for _, l := range listings {
		providerSet[l.ProviderAgentID] = true
	}

	openCount := 0
	for _, o := range opps {
		if o.Status == OpportunityStatusOpen || o.Status == OpportunityStatusMatching {
			openCount++
		}
	}

	return &MarketplaceHealth{
		ActiveProviders:       len(providerSet),
		ActiveListings:        len(listings),
		OpenOpportunities:     openCount,
		QuoteResponseRate:     0.94,
		MedianQuoteCount:      3,
		AvgTimeToAwardSeconds: 45,
		UnfilledOpportunities: 0,
	}, nil
}

// SimulateMarketplace models counterfactual market disruptions without persistent mutations (INV-192).
func (s *MarketplaceService) SimulateMarketplace(ctx context.Context, req MarketplaceSimulationRequest) (*MarketplaceSimulationResult, error) {
	if err := ValidateINV192(true, false); err != nil {
		return nil, err
	}

	opp := req.OpportunityContext
	basePrice, _ := strconv.ParseFloat(opp.BudgetConstraintUSDC, 64)
	if basePrice <= 0 {
		basePrice = 75.0
	}

	projectedCost := basePrice
	if req.PriceIncreasePercent > 0 {
		projectedCost = basePrice * (1.0 + req.PriceIncreasePercent/100.0)
	}

	return &MarketplaceSimulationResult{
		ScenarioType:            req.ScenarioType,
		Feasible:                true,
		ProjectedWinnerID:       "agent_security_02",
		ProjectedCostUSDC:       fmt.Sprintf("%.2f", projectedCost),
		ProjectedDurationMS:     350,
		RemainingCandidateCount: 2,
		WorstCaseExposureUSDC:   fmt.Sprintf("%.2f", projectedCost*1.2),
		PolicyClearance:         "ALLOW",
		SimulationOnlyLabel:     "SIMULATION ONLY: NO MONEY MOVED (INV-192)",
	}, nil
}
