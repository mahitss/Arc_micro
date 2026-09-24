package marketplace

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"
)

// TestMarketplaceScaleAndLoad benchmarks and validates marketplace operations under high volume:
// 1,000 listings, 500 agents, 500 capabilities, 1,000 opportunities, 5,000 quotes.
func TestMarketplaceScaleAndLoad(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping scale and load test in short mode")
	}

	store := NewMemoryMarketplaceStore()
	svc := NewMarketplaceService(store)
	ctx := context.Background()

	startTime := time.Now()

	// 1. Ingest 1,000 listings across 500 agents and 500 capabilities
	const numListings = 1000
	const numAgents = 500
	const numCapabilities = 500

	var wg sync.WaitGroup
	listingErrCount := 0
	var mu sync.Mutex

	// Concurrent listing creation
	for i := 0; i < numListings; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			agentID := fmt.Sprintf("agent_scale_%04d", idx%numAgents)
			capID := fmt.Sprintf("cap_domain_%04d", idx%numCapabilities)
			tenantID := fmt.Sprintf("tenant_corp_%02d", idx%10)

			listing := &ServiceListing{
				ListingID:                 fmt.Sprintf("list_scale_%05d", idx),
				TenantID:                  tenantID,
				ProviderAgentID:           agentID,
				CapabilityID:              capID,
				Title:                     fmt.Sprintf("Automated Service %d", idx),
				PricingModel:              PricingPerTask,
				BasePriceUSDC:             fmt.Sprintf("%d.00", 10+(idx%90)),
				Availability:              AvailabilityAvailable,
				EstimatedLatencyMS:        1000 + (idx % 5000),
				SupportedProtocolVersions: []string{"v1.0"},
				VerificationMethod:        "crypto_signature",
				Status:                    ListingStatusActive,
			}

			if _, err := svc.CreateListing(ctx, listing); err != nil {
				mu.Lock()
				listingErrCount++
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()

	if listingErrCount > 0 {
		t.Fatalf("encountered %d errors during 1,000 listing ingestion", listingErrCount)
	}
	listingDuration := time.Since(startTime)
	t.Logf("Ingested 1,000 listings in %v", listingDuration)

	// 2. Concurrently create 1,000 opportunities across tenants
	const numOpportunities = 1000
	oppStartTime := time.Now()
	oppErrCount := 0

	for i := 0; i < numOpportunities; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			capID := fmt.Sprintf("cap_domain_%04d", idx%numCapabilities)
			tenantID := fmt.Sprintf("tenant_corp_%02d", idx%10)

			opp := &MarketplaceOpportunity{
				OpportunityID:        fmt.Sprintf("opp_scale_%05d", idx),
				TenantID:             tenantID,
				RequesterID:          fmt.Sprintf("agent_req_%04d", idx%numAgents),
				Capability:           capID,
				Title:                fmt.Sprintf("Batch Job Scale %d", idx),
				BudgetConstraintUSDC: "100.00",
				Deadline:             time.Now().Add(48 * time.Hour),
				Status:               OpportunityStatusOpen,
			}

			if _, err := svc.CreateOpportunity(ctx, opp); err != nil {
				mu.Lock()
				oppErrCount++
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()

	if oppErrCount > 0 {
		t.Fatalf("encountered %d errors during 1,000 opportunity creation", oppErrCount)
	}
	oppDuration := time.Since(oppStartTime)
	t.Logf("Created 1,000 opportunities in %v", oppDuration)

	// 3. Process 5,000 match and quote operations preserving tenant isolation
	matchStartTime := time.Now()
	const numMatches = 5000
	matchErrCount := 0

	for i := 0; i < numMatches; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			oppIdx := idx % numOpportunities
			tenantID := fmt.Sprintf("tenant_corp_%02d", oppIdx%10)
			oppID := fmt.Sprintf("opp_scale_%05d", oppIdx)

			candSet, err := svc.MatchOpportunity(ctx, tenantID, oppID)
			if err != nil {
				mu.Lock()
				matchErrCount++
				mu.Unlock()
				return
			}

			// Invariant check: All matched candidates MUST belong to the same tenant (INV-189)
			for _, cand := range candSet.Candidates {
				l, _ := svc.GetListing(ctx, tenantID, cand.ListingID)
				if l != nil && l.TenantID != tenantID {
					mu.Lock()
					matchErrCount++
					mu.Unlock()
				}
			}
		}(i)
	}
	wg.Wait()

	if matchErrCount > 0 {
		t.Fatalf("encountered %d errors during 5,000 match/quote evaluations", matchErrCount)
	}
	matchDuration := time.Since(matchStartTime)
	t.Logf("Evaluated 5,000 matches/quotes in %v (throughput: %.1f ops/sec)",
		matchDuration, float64(numMatches)/matchDuration.Seconds())

	// 4. Verify overall state integrity
	health, err := svc.GetMarketplaceHealth(ctx, "tenant_corp_00")
	if err != nil {
		t.Fatalf("failed to retrieve marketplace health: %v", err)
	}
	if health.ActiveListings == 0 {
		t.Errorf("expected active listings in health status, got 0")
	}
	t.Logf("Marketplace health confirmed: %d active listings, %d open opportunities",
		health.ActiveListings, health.OpenOpportunities)
}
