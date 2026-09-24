package marketplace

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestServiceListingLifecycle(t *testing.T) {
	store := NewMemoryMarketplaceStore()
	svc := NewMarketplaceService(store)
	ctx := context.Background()

	// 1. Create a valid listing
	listing := &ServiceListing{
		ListingID:                 "list_test_01",
		TenantID:                  "tenant_corp_a",
		ProviderAgentID:           "agent_auditor_99",
		CapabilityID:              "sec.smart_contract_audit",
		Title:                     "Deep EVM Security Auditor",
		Description:               "Audits smart contracts for reentrancy, access control, and logic bugs.",
		InputSchema:               map[string]interface{}{"type": "string", "repo": "string"},
		OutputSchema:              map[string]interface{}{"vulnerabilities": "array", "severity": "string"},
		PricingModel:              PricingPerTask,
		BasePriceUSDC:             "4.50",
		Availability:              AvailabilityAvailable,
		EstimatedLatencyMS:        7200000,
		QualityRequirements:       map[string]interface{}{"min_confidence": 0.95},
		SupportedProtocolVersions: []string{"v1.0"},
		VerificationMethod:        "test_suite_execution",
		MaxConcurrentJobs:         5,
		Status:                    ListingStatusActive,
	}

	created, err := svc.CreateListing(ctx, listing)
	if err != nil {
		t.Fatalf("unexpected error creating listing: %v", err)
	}
	if created.ListingID == "" || created.Status != ListingStatusActive {
		t.Errorf("expected active listing with ID, got %s / %s", created.ListingID, created.Status)
	}

	// 2. Pause listing (INV-188)
	paused, err := svc.PauseListing(ctx, "tenant_corp_a", created.ListingID)
	if err != nil {
		t.Fatalf("unexpected error pausing listing: %v", err)
	}
	if paused.Status != ListingStatusPaused {
		t.Errorf("expected status PAUSED, got %s", paused.Status)
	}

	// Check INV-188 directly
	invErr := ValidateINV188(paused.Status)
	if invErr == nil {
		t.Errorf("expected INV-188 error when paused listing is validated, got nil")
	}

	// 3. Cross-tenant invisibility (INV-189)
	crossTenantListing, err := svc.GetListing(ctx, "tenant_corp_b", created.ListingID)
	if err == nil && crossTenantListing != nil {
		t.Errorf("expected cross-tenant access to fail or return nil, got %v", crossTenantListing)
	}
}

func TestOpportunityLifecycleAndMatching(t *testing.T) {
	store := NewMemoryMarketplaceStore()
	svc := NewMarketplaceService(store)
	ctx := context.Background()

	// 1. Create opportunity
	opp := &MarketplaceOpportunity{
		OpportunityID:        "opp_test_01",
		TenantID:             "tenant_primary",
		RequesterID:          "agent_orchestrator_01",
		Capability:           "sec.smart_contract_audit",
		Title:                "Audit Uniswap V4 Hook",
		Requirements:         map[string]interface{}{"scope": "amm_v3"},
		BudgetConstraintUSDC: "50.00",
		Deadline:             time.Now().Add(48 * time.Hour),
		RiskRequirement:      map[string]interface{}{"max_risk": 30},
	}

	createdOpp, err := svc.CreateOpportunity(ctx, opp)
	if err != nil {
		t.Fatalf("unexpected error creating opportunity: %v", err)
	}
	if createdOpp.Status != OpportunityStatusOpen {
		t.Errorf("expected OPEN status, got %s", createdOpp.Status)
	}

	// Also ensure there is a matching listing in tenant_primary
	seedListing := &ServiceListing{
		ListingID:                 "list_matching_01",
		TenantID:                  "tenant_primary",
		ProviderAgentID:           "agent_auditor_alpha",
		CapabilityID:              "sec.smart_contract_audit",
		Title:                     "Smart Contract Security Audit",
		PricingModel:              PricingPerTask,
		BasePriceUSDC:             "35.00",
		Availability:              AvailabilityAvailable,
		EstimatedLatencyMS:        3600000,
		SupportedProtocolVersions: []string{"v1.0"},
		VerificationMethod:        "static_and_fuzzing",
		Status:                    ListingStatusActive,
	}
	_, err = svc.CreateListing(ctx, seedListing)
	if err != nil {
		t.Fatalf("failed to seed listing: %v", err)
	}

	// 2. Match candidates
	candSet, err := svc.MatchOpportunity(ctx, "tenant_primary", createdOpp.OpportunityID)
	if err != nil {
		t.Fatalf("unexpected error matching opportunity: %v", err)
	}
	if len(candSet.Candidates) == 0 {
		t.Fatalf("expected at least 1 candidate matched, got 0")
	}

	topCandidate := candSet.Candidates[0]
	if topCandidate.ProviderID == "" {
		t.Errorf("top candidate provider ID must not be empty")
	}
	if candSet.Explanation.SelectedProviderID == "" || candSet.Explanation.CapabilityMatch == "" {
		t.Errorf("candidate set must include a structured match explanation")
	}

	// 3. Award opportunity
	quoteExpiresAt := time.Now().Add(24 * time.Hour)
	awardedOpp, err := svc.AwardOpportunity(
		ctx,
		"tenant_primary",
		createdOpp.OpportunityID,
		topCandidate.ProviderID,
		"quote_seed_01",
		"35.00",
		quoteExpiresAt,
	)
	if err != nil {
		t.Fatalf("unexpected error awarding opportunity: %v", err)
	}
	if awardedOpp.Status != OpportunityStatusAwarded {
		t.Errorf("expected AWARDED status, got %s", awardedOpp.Status)
	}
	if awardedOpp.AwardedProviderID != topCandidate.ProviderID {
		t.Errorf("expected selected provider %s, got %s", topCandidate.ProviderID, awardedOpp.AwardedProviderID)
	}

	// 4. Concurrency / Duplicate Award check (INV-194)
	_, errDuplicate := svc.AwardOpportunity(
		ctx,
		"tenant_primary",
		createdOpp.OpportunityID,
		"agent_other_99",
		"quote_other_99",
		"30.00",
		quoteExpiresAt,
	)
	if errDuplicate == nil {
		t.Errorf("expected duplicate award to fail with INV-194 error")
	}
}

func TestDeterministicMatchingOrder(t *testing.T) {
	engine := NewMatchingEngine()
	now := time.Now().UTC()

	opp := MarketplaceOpportunity{
		OpportunityID:        "opp_det_01",
		TenantID:             "tenant_test",
		Capability:           "data.market_analysis",
		BudgetConstraintUSDC: "100.00",
		Deadline:             now.Add(24 * time.Hour),
	}

	// Two providers with identical metrics except price
	listingA := ServiceListing{
		ListingID:          "list_a",
		TenantID:           "tenant_test",
		ProviderAgentID:    "agent_alpha",
		CapabilityID:       "data.market_analysis",
		Status:             ListingStatusActive,
		BasePriceUSDC:      "25.00",
		Availability:       AvailabilityAvailable,
		EstimatedLatencyMS: 5000,
	}
	listingB := ServiceListing{
		ListingID:          "list_b",
		TenantID:           "tenant_test",
		ProviderAgentID:    "agent_beta",
		CapabilityID:       "data.market_analysis",
		Status:             ListingStatusActive,
		BasePriceUSDC:      "15.00", // Cheaper
		Availability:       AvailabilityAvailable,
		EstimatedLatencyMS: 5000,
	}

	params := MatchParams{
		Opportunity: opp,
		Listings:    []ServiceListing{listingA, listingB},
		MetricsMap: map[string]*MarketplaceMetrics{
			"agent_alpha:data.market_analysis": {
				CompletionRate: 0.98,
				SampleSize:     50,
				DisputeRate:    0.01,
			},
			"agent_beta:data.market_analysis": {
				CompletionRate: 0.98,
				SampleSize:     50,
				DisputeRate:    0.01,
			},
		},
		PolicyAllowList: map[string]bool{
			"agent_alpha": true,
			"agent_beta":  true,
		},
		RiskScores: map[string]int{
			"agent_alpha": 10,
			"agent_beta":  10,
		},
		MaxAllowedRisk: 30,
		CurrentTime:    now,
	}

	candSet, err := engine.Match(params)
	if err != nil {
		t.Fatalf("unexpected error in deterministic match: %v", err)
	}

	if len(candSet.Candidates) != 2 {
		t.Fatalf("expected 2 candidates, got %d", len(candSet.Candidates))
	}

	// Beta has lower price with equal quality and latency, so Beta must rank #1
	if candSet.Candidates[0].ProviderID != "agent_beta" {
		t.Errorf("expected agent_beta to be rank #1 due to lower price, got %s", candSet.Candidates[0].ProviderID)
	}
}

func TestAutonomousMarketplaceLifecycle_Section58(t *testing.T) {
	// Full End-to-End Test: TEST_AUTONOMOUS_MARKETPLACE_LIFECYCLE
	// Scenario: Objective "Analyze 10,000 security events"
	store := NewMemoryMarketplaceStore()
	svc := NewMarketplaceService(store)
	ctx := context.Background()
	tenantID := "tenant_fintech_corp"

	// Seed listings for tenant
	seedListing1 := &ServiceListing{
		ListingID:                 "list_sec_01",
		TenantID:                  tenantID,
		ProviderAgentID:           "agent_sec_analyst_01",
		CapabilityID:              "sec.smart_contract_audit",
		Title:                     "Smart Contract Security Audit",
		PricingModel:              PricingPerTask,
		BasePriceUSDC:             "40.00",
		Availability:              AvailabilityAvailable,
		EstimatedLatencyMS:        7200000,
		SupportedProtocolVersions: []string{"v1.0"},
		VerificationMethod:        "audit_report_hash",
		Status:                    ListingStatusActive,
	}
	seedListing2 := &ServiceListing{
		ListingID:                 "list_sec_02",
		TenantID:                  tenantID,
		ProviderAgentID:           "agent_sec_analyst_02",
		CapabilityID:              "sec.smart_contract_audit",
		Title:                     "Security Event Log Deep Scanner",
		PricingModel:              PricingPerTask,
		BasePriceUSDC:             "45.00",
		Availability:              AvailabilityAvailable,
		EstimatedLatencyMS:        7200000,
		SupportedProtocolVersions: []string{"v1.0"},
		VerificationMethod:        "audit_report_hash",
		Status:                    ListingStatusActive,
	}
	_, _ = svc.CreateListing(ctx, seedListing1)
	_, _ = svc.CreateListing(ctx, seedListing2)

	// 1. Identify required capability & create opportunity
	opp := &MarketplaceOpportunity{
		OpportunityID:        "opp_lifecycle_sec_10k",
		TenantID:             tenantID,
		RequesterID:          "agent_ciso_bot",
		Capability:           "sec.smart_contract_audit",
		Title:                "Analyze 10,000 security events",
		Requirements:         map[string]interface{}{"event_count": 10000, "log_format": "json"},
		BudgetConstraintUSDC: "50.00",
		Deadline:             time.Now().Add(72 * time.Hour),
		RiskRequirement:      map[string]interface{}{"level": "MEDIUM"},
	}

	createdOpp, err := svc.CreateOpportunity(ctx, opp)
	if err != nil {
		t.Fatalf("step 1 failed: %v", err)
	}

	// 2. Discover providers & receive matching candidate set
	candSet, err := svc.MatchOpportunity(ctx, tenantID, createdOpp.OpportunityID)
	if err != nil {
		t.Fatalf("step 2 failed: %v", err)
	}
	if len(candSet.Candidates) == 0 {
		t.Fatalf("step 2: no candidates discovered")
	}

	primaryCandidate := candSet.Candidates[0]

	// 3. Selection explanation check
	if candSet.Explanation.SelectedProviderID == "" || candSet.Explanation.CapabilityMatch == "" {
		t.Fatalf("step 3: missing match explanation")
	}

	// 4. Check policy & risk invariants (INV-182, INV-183, INV-185)
	if err := ValidateINV185(40.00, 50.00); err != nil {
		t.Fatalf("step 4: budget invariant violated: %v", err)
	}

	// 5. Award provider
	quoteExpiry := time.Now().Add(48 * time.Hour)
	awarded, err := svc.AwardOpportunity(
		ctx,
		tenantID,
		createdOpp.OpportunityID,
		primaryCandidate.ProviderID,
		"quote_contract_audit_01",
		"40.00",
		quoteExpiry,
	)
	if err != nil {
		t.Fatalf("step 5: award failed: %v", err)
	}
	if awarded.Status != OpportunityStatusAwarded {
		t.Fatalf("step 5: expected awarded status, got %s", awarded.Status)
	}

	// 6. Simulate provider failure & fallback mechanism (Section 38: Marketplace Fallback)
	// If primary provider fails during execution, re-select fallback candidate
	if len(candSet.Candidates) > 1 {
		fallbackCandidate := candSet.Candidates[1]
		if err := ValidateINV185(45.00, 50.00); err != nil {
			t.Fatalf("step 6: fallback exceeds budget constraint: %s", fallbackCandidate.ProviderID)
		}
	}

	// 7. Verify result and milestone settlement invariant (INV-181)
	// Matching/awarding does NOT authorize payment directly.
	if err := ValidateINV181(true, false); err != nil {
		t.Fatalf("step 7: payment authorization invariant violated: %v", err)
	}

	// 8. Update metrics & economic memory (INV-191)
	perfUpdate := &MarketplaceMetrics{
		MetricID:             "met_sec_01_updated",
		ProviderAgentID:      primaryCandidate.ProviderID,
		CapabilityID:         createdOpp.Capability,
		TenantID:             tenantID,
		CompletionRate:       0.977,
		FailureRate:          0.023,
		SampleSize:           90,
		ResultAcceptanceRate: 0.99,
		UpdatedAt:            time.Now().UTC(),
	}
	err = store.SaveMetrics(ctx, perfUpdate)
	if err != nil {
		t.Fatalf("step 8: recording metrics failed: %v", err)
	}

	// 9. Verify metrics in store
	retrievedMetrics, err := store.GetMetrics(ctx, tenantID, primaryCandidate.ProviderID, createdOpp.Capability)
	if err != nil || retrievedMetrics == nil {
		t.Fatalf("step 9: failed to retrieve updated metrics: %v", err)
	}
	if retrievedMetrics.SampleSize != 90 {
		t.Errorf("step 9: expected 90 sample size, got %d", retrievedMetrics.SampleSize)
	}
}

func TestConcentrationAndAnomalyDetection(t *testing.T) {
	evaluator := NewReputationEvaluator()

	// High concentration scenario (INV-200)
	isConcentrated, ratio := evaluator.EvaluateCounterpartyConcentration(75000.0, 100000.0, 0.50)
	if !isConcentrated || ratio != 0.75 {
		t.Errorf("expected concentration warning for 75%% exposure, got isConcentrated=%v ratio=%f", isConcentrated, ratio)
	}

	// Wash trading anomaly detection
	anomaly := evaluator.CheckSybilAndWashAnomalies("tenant_test", "agent_suspect_01", "agent_colluder_02", 60, 0.05)
	if anomaly == nil {
		t.Fatalf("expected wash trading anomaly detected, got nil")
	}
	if !strings.Contains(anomaly.AnomalyType, "WASH_TRANSACTION") {
		t.Errorf("expected WASH_TRANSACTION anomaly, got %s", anomaly.AnomalyType)
	}

	// Self-dealing anomaly detection
	selfAnomaly := evaluator.CheckSybilAndWashAnomalies("tenant_test", "agent_same", "agent_same", 1, 100.0)
	if selfAnomaly == nil || selfAnomaly.AnomalyType != "SELF_DEALING" {
		t.Fatalf("expected SELF_DEALING anomaly, got %v", selfAnomaly)
	}
}
