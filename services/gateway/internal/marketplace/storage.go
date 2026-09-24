package marketplace

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	ErrListingNotFound     = errors.New("service listing not found")
	ErrOpportunityNotFound = errors.New("marketplace opportunity not found")
	ErrMatchNotFound       = errors.New("marketplace match not found")
)

// MarketplaceStore defines the data layer interface for marketplace state.
type MarketplaceStore interface {
	SaveListing(ctx context.Context, l *ServiceListing) error
	GetListing(ctx context.Context, tenantID, listingID string) (*ServiceListing, error)
	UpdateListing(ctx context.Context, l *ServiceListing) error
	ListListings(ctx context.Context, tenantID string) ([]*ServiceListing, error)
	SearchListings(ctx context.Context, q MarketplaceSearchQuery) ([]*ServiceListing, error)

	SaveOpportunity(ctx context.Context, opp *MarketplaceOpportunity) error
	GetOpportunity(ctx context.Context, tenantID, opportunityID string) (*MarketplaceOpportunity, error)
	UpdateOpportunity(ctx context.Context, opp *MarketplaceOpportunity) error
	ListOpportunities(ctx context.Context, tenantID string) ([]*MarketplaceOpportunity, error)

	SaveMatch(ctx context.Context, match *CandidateSet) error
	GetMatchByOpportunity(ctx context.Context, tenantID, opportunityID string) (*CandidateSet, error)

	SaveMetrics(ctx context.Context, m *MarketplaceMetrics) error
	GetMetrics(ctx context.Context, tenantID, providerID, capabilityID string) (*MarketplaceMetrics, error)
	ListMetricsByProvider(ctx context.Context, tenantID, providerID string) ([]*MarketplaceMetrics, error)

	SaveAnomaly(ctx context.Context, a *MarketplaceAnomaly) error
	ListAnomaliesByProvider(ctx context.Context, tenantID, providerID string) ([]*MarketplaceAnomaly, error)
}

// MemoryMarketplaceStore provides thread-safe in-memory storage with pre-seeded fixtures.
type MemoryMarketplaceStore struct {
	mu            sync.RWMutex
	listings      map[string]*ServiceListing        // key: "tenant:listing_id"
	opportunities map[string]*MarketplaceOpportunity // key: "tenant:opp_id"
	matches       map[string]*CandidateSet          // key: "tenant:opp_id"
	metrics       map[string]*MarketplaceMetrics    // key: "tenant:provider:capability"
	anomalies     map[string][]*MarketplaceAnomaly  // key: "tenant:provider"
}

func NewMemoryMarketplaceStore() *MemoryMarketplaceStore {
	store := &MemoryMarketplaceStore{
		listings:      make(map[string]*ServiceListing),
		opportunities: make(map[string]*MarketplaceOpportunity),
		matches:       make(map[string]*CandidateSet),
		metrics:       make(map[string]*MarketplaceMetrics),
		anomalies:     make(map[string][]*MarketplaceAnomaly),
	}
	store.seedFixtures()
	return store
}

func (s *MemoryMarketplaceStore) seedFixtures() {
	now := time.Now().UTC()

	// Seed Listings
	l1 := &ServiceListing{
		ListingID:                 "listing_code_audit_01",
		TenantID:                  "tenant_default",
		ProviderAgentID:           "agent_security_02",
		CapabilityID:              "code_audit",
		Title:                     "Smart Contract & Protocol Security Audit",
		Description:               "Formal verification, fuzzing, and invariant vulnerability detection",
		PricingModel:              PricingFixed,
		BasePriceUSDC:             "75.00",
		Availability:              AvailabilityAvailable,
		EstimatedLatencyMS:        300,
		VerificationMethod:        "INDEPENDENT_VERIFIER_CONSENSUS",
		SupportedProtocolVersions: []string{"1.0"},
		Status:                    ListingStatusActive,
		MaxConcurrentJobs:         5,
		CreatedAt:                 now.Add(-48 * time.Hour),
		UpdatedAt:                 now,
		Version:                   1,
	}
	s.listings["tenant_default:listing_code_audit_01"] = l1

	l2 := &ServiceListing{
		ListingID:                 "listing_market_intel_02",
		TenantID:                  "tenant_default",
		ProviderAgentID:           "agent_research_01",
		CapabilityID:              "market_research",
		Title:                     "Market Intelligence Synthesis",
		Description:               "Cross-protocol decentralized data aggregation and liquidity modeling",
		PricingModel:              PricingFixed,
		BasePriceUSDC:             "45.00",
		Availability:              AvailabilityAvailable,
		EstimatedLatencyMS:        120,
		VerificationMethod:        "CRYPTO_HASH_AND_SCHEMA",
		SupportedProtocolVersions: []string{"1.0"},
		Status:                    ListingStatusActive,
		MaxConcurrentJobs:         10,
		CreatedAt:                 now.Add(-72 * time.Hour),
		UpdatedAt:                 now,
		Version:                   1,
	}
	s.listings["tenant_default:listing_market_intel_02"] = l2

	l3 := &ServiceListing{
		ListingID:                 "listing_verification_03",
		TenantID:                  "tenant_default",
		ProviderAgentID:           "agent_verifier_03",
		CapabilityID:              "result_verification",
		Title:                     "Quality Gate Independent Deliverable Verification",
		Description:               "Oracle seal verification, schema validation, and consensus attestation",
		PricingModel:              PricingFixed,
		BasePriceUSDC:             "10.00",
		Availability:              AvailabilityAvailable,
		EstimatedLatencyMS:        30,
		VerificationMethod:        "MULTI_PARTY_SIGNATURE",
		SupportedProtocolVersions: []string{"1.0"},
		Status:                    ListingStatusActive,
		MaxConcurrentJobs:         50,
		CreatedAt:                 now.Add(-96 * time.Hour),
		UpdatedAt:                 now,
		Version:                   1,
	}
	s.listings["tenant_default:listing_verification_03"] = l3

	// Seed Metrics
	m1 := &MarketplaceMetrics{
		MetricID:             "met_sec_01",
		TenantID:             "tenant_default",
		ProviderAgentID:      "agent_security_02",
		CapabilityID:         "code_audit",
		SampleSize:           48,
		CompletionRate:       0.98,
		FailureRate:          0.02,
		TimeoutRate:          0.00,
		AvgDurationMS:        280,
		P50DurationMS:        250,
		P95DurationMS:        340,
		QuoteAccuracy:        0.99,
		ResultAcceptanceRate: 0.96,
		DisputeRate:          0.00,
		CancellationRate:     0.00,
		UpdatedAt:            now,
	}
	s.metrics["tenant_default:agent_security_02:code_audit"] = m1

	// Seed Opportunity
	opp1 := &MarketplaceOpportunity{
		OpportunityID:        "opp_live_01",
		TenantID:             "tenant_default",
		RequesterID:          "agent_research_01",
		Capability:           "code_audit",
		Title:                "Audit Protocol Gateway Handlers",
		Requirements:         map[string]interface{}{"depth": "comprehensive", "fuzz_rounds": 1000},
		Deadline:             now.Add(24 * time.Hour),
		BudgetConstraintUSDC: "100.00",
		Status:               OpportunityStatusOpen,
		CreatedAt:            now.Add(-2 * time.Hour),
		UpdatedAt:            now,
	}
	s.opportunities["tenant_default:opp_live_01"] = opp1
}

// Listing operations
func (s *MemoryMarketplaceStore) SaveListing(_ context.Context, l *ServiceListing) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := fmt.Sprintf("%s:%s", l.TenantID, l.ListingID)
	s.listings[key] = l
	return nil
}

func (s *MemoryMarketplaceStore) GetListing(_ context.Context, tenantID, listingID string) (*ServiceListing, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := fmt.Sprintf("%s:%s", tenantID, listingID)
	l, ok := s.listings[key]
	if !ok {
		return nil, ErrListingNotFound
	}
	return l, nil
}

func (s *MemoryMarketplaceStore) UpdateListing(_ context.Context, l *ServiceListing) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := fmt.Sprintf("%s:%s", l.TenantID, l.ListingID)
	if _, ok := s.listings[key]; !ok {
		return ErrListingNotFound
	}
	l.Version++
	l.UpdatedAt = time.Now().UTC()
	s.listings[key] = l
	return nil
}

func (s *MemoryMarketplaceStore) ListListings(_ context.Context, tenantID string) ([]*ServiceListing, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*ServiceListing
	for _, l := range s.listings {
		if l.TenantID == tenantID {
			res = append(res, l)
		}
	}
	return res, nil
}

func (s *MemoryMarketplaceStore) SearchListings(_ context.Context, q MarketplaceSearchQuery) ([]*ServiceListing, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*ServiceListing
	for _, l := range s.listings {
		if q.TenantID != "" && l.TenantID != q.TenantID {
			continue
		}
		if q.Capability != "" && l.CapabilityID != q.Capability {
			continue
		}
		if q.Availability != "" && string(l.Availability) != q.Availability {
			continue
		}
		if q.MaxPriceUSDC > 0 {
			p, _ := strconv.ParseFloat(l.BasePriceUSDC, 64)
			if p > q.MaxPriceUSDC {
				continue
			}
		}
		if q.MaxLatencyMS > 0 && l.EstimatedLatencyMS > q.MaxLatencyMS {
			continue
		}
		if q.ProtocolVersion != "" {
			hasVersion := false
			for _, v := range l.SupportedProtocolVersions {
				if v == q.ProtocolVersion {
					hasVersion = true
					break
				}
			}
			if !hasVersion {
				continue
			}
		}
		res = append(res, l)
	}
	return res, nil
}

// Opportunity operations
func (s *MemoryMarketplaceStore) SaveOpportunity(_ context.Context, opp *MarketplaceOpportunity) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := fmt.Sprintf("%s:%s", opp.TenantID, opp.OpportunityID)
	s.opportunities[key] = opp
	return nil
}

func (s *MemoryMarketplaceStore) GetOpportunity(_ context.Context, tenantID, opportunityID string) (*MarketplaceOpportunity, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := fmt.Sprintf("%s:%s", tenantID, opportunityID)
	opp, ok := s.opportunities[key]
	if !ok {
		return nil, ErrOpportunityNotFound
	}
	return opp, nil
}

func (s *MemoryMarketplaceStore) UpdateOpportunity(_ context.Context, opp *MarketplaceOpportunity) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := fmt.Sprintf("%s:%s", opp.TenantID, opp.OpportunityID)
	if _, ok := s.opportunities[key]; !ok {
		return ErrOpportunityNotFound
	}
	opp.UpdatedAt = time.Now().UTC()
	s.opportunities[key] = opp
	return nil
}

func (s *MemoryMarketplaceStore) ListOpportunities(_ context.Context, tenantID string) ([]*MarketplaceOpportunity, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*MarketplaceOpportunity
	for _, opp := range s.opportunities {
		if opp.TenantID == tenantID {
			res = append(res, opp)
		}
	}
	return res, nil
}

// Match operations
func (s *MemoryMarketplaceStore) SaveMatch(_ context.Context, match *CandidateSet) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := fmt.Sprintf("tenant_default:%s", match.OpportunityID)
	s.matches[key] = match
	return nil
}

func (s *MemoryMarketplaceStore) GetMatchByOpportunity(_ context.Context, tenantID, opportunityID string) (*CandidateSet, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := fmt.Sprintf("%s:%s", tenantID, opportunityID)
	m, ok := s.matches[key]
	if !ok {
		return nil, ErrMatchNotFound
	}
	return m, nil
}

// Metrics operations
func (s *MemoryMarketplaceStore) SaveMetrics(_ context.Context, m *MarketplaceMetrics) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := fmt.Sprintf("%s:%s:%s", m.TenantID, m.ProviderAgentID, m.CapabilityID)
	s.metrics[key] = m
	return nil
}

func (s *MemoryMarketplaceStore) GetMetrics(_ context.Context, tenantID, providerID, capabilityID string) (*MarketplaceMetrics, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := fmt.Sprintf("%s:%s:%s", tenantID, providerID, capabilityID)
	m, ok := s.metrics[key]
	if !ok {
		return nil, nil
	}
	return m, nil
}

func (s *MemoryMarketplaceStore) ListMetricsByProvider(_ context.Context, tenantID, providerID string) ([]*MarketplaceMetrics, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*MarketplaceMetrics
	prefix := fmt.Sprintf("%s:%s:", tenantID, providerID)
	for k, m := range s.metrics {
		if strings.HasPrefix(k, prefix) {
			res = append(res, m)
		}
	}
	return res, nil
}

// Anomaly operations
func (s *MemoryMarketplaceStore) SaveAnomaly(_ context.Context, a *MarketplaceAnomaly) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := fmt.Sprintf("%s:%s", a.TenantID, a.ProviderAgentID)
	s.anomalies[key] = append(s.anomalies[key], a)
	return nil
}

func (s *MemoryMarketplaceStore) ListAnomaliesByProvider(_ context.Context, tenantID, providerID string) ([]*MarketplaceAnomaly, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := fmt.Sprintf("%s:%s", tenantID, providerID)
	return s.anomalies[key], nil
}
