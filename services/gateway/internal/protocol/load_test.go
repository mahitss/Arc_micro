package protocol

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// Section 69 & 70: PERFORMANCE AND LOAD TEST
// 100 agents, 1,000 capability queries, 500 service requests, 200 quote requests, 100 contracts
func TestProtocol_LoadAndStressSimulation(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryProtocolStore()
	svc := NewProtocolService(store, nil, nil, nil, nil)

	startTime := time.Now()

	// 1. Register 100 external agents
	numAgents := 100
	for i := 0; i < numAgents; i++ {
		tenantID := fmt.Sprintf("tenant_%02d", i%5) // 5 distinct tenants
		manifest := &AgentManifest{
			ProtocolVersion: ProtocolVersion,
			AgentID:         fmt.Sprintf("agent_%03d", i),
			OrganizationID:  tenantID,
			DisplayName:     fmt.Sprintf("Autonomous Agent #%d", i),
			Capabilities: []CapabilityDescriptor{
				{
					CapabilityID: "compute-analysis",
					Name:         "Compute Analysis Engine",
					Version:      "1.0.0",
					PricingModel: "FIXED",
					SupportedAssets: []string{"USDC"},
				},
			},
			SupportedProtocols: []string{"agentpay.protocol.v1"},
			Availability:       "AVAILABLE",
		}
		if _, err := svc.RegisterAgent(ctx, manifest); err != nil {
			t.Fatalf("failed registering agent %d: %v", i, err)
		}
	}

	// 2. Concurrently execute 1,000 capability queries
	numQueries := 1000
	var querySuccessCount int64
	var wgQuery sync.WaitGroup
	wgQuery.Add(numQueries)

	queryStart := time.Now()
	for i := 0; i < numQueries; i++ {
		go func(idx int) {
			defer wgQuery.Done()
			results, err := svc.DiscoverCapabilities(ctx, "compute-analysis")
			if err == nil && len(results) > 0 {
				atomic.AddInt64(&querySuccessCount, 1)
			}
		}(i)
	}
	wgQuery.Wait()
	queryLatency := time.Since(queryStart)

	if querySuccessCount != int64(numQueries) {
		t.Fatalf("expected %d successful queries, got %d", numQueries, querySuccessCount)
	}

	// 3. Concurrently execute 500 service requests
	numRequests := 500
	var requestSuccessCount int64
	var wgReq sync.WaitGroup
	wgReq.Add(numRequests)

	for i := 0; i < numRequests; i++ {
		go func(idx int) {
			defer wgReq.Done()
			req := &ServiceRequest{
				RequestID:    fmt.Sprintf("req_load_%04d", idx),
				RequesterID:  fmt.Sprintf("agent_%03d", idx%numAgents),
				Capability:   "compute-analysis",
				BudgetCap:    "10.00",
				Deadline:     time.Now().UTC().Add(24 * time.Hour),
			}
			if err := svc.validator.ValidateServiceRequest(req); err == nil {
				atomic.AddInt64(&requestSuccessCount, 1)
			}
		}(i)
	}
	wgReq.Wait()

	if requestSuccessCount != int64(numRequests) {
		t.Fatalf("expected %d valid requests, got %d", numRequests, requestSuccessCount)
	}

	// 4. Concurrently create 200 quotes
	numQuotes := 200
	var quoteSuccessCount int64
	var wgQuote sync.WaitGroup
	wgQuote.Add(numQuotes)

	for i := 0; i < numQuotes; i++ {
		go func(idx int) {
			defer wgQuote.Done()
			q := &ProtocolQuote{
				QuoteID:                 fmt.Sprintf("quote_load_%04d", idx),
				ProviderID:              fmt.Sprintf("agent_%03d", (idx+1)%numAgents),
				RequestID:               fmt.Sprintf("req_load_%04d", idx),
				Amount:                  "5.00",
				Currency:                "USDC",
				Expiration:              time.Now().UTC().Add(time.Hour),
				ExpectedDurationSeconds: 30,
			}
			if err := svc.SaveQuote(ctx, q); err == nil {
				atomic.AddInt64(&quoteSuccessCount, 1)
			}
		}(i)
	}
	wgQuote.Wait()

	if quoteSuccessCount != int64(numQuotes) {
		t.Fatalf("expected %d successful quotes, got %d", numQuotes, quoteSuccessCount)
	}

	// 5. Concurrently form and transition 100 contracts
	numContracts := 100
	var contractSuccessCount int64
	var wgContract sync.WaitGroup
	wgContract.Add(numContracts)

	for i := 0; i < numContracts; i++ {
		go func(idx int) {
			defer wgContract.Done()
			tenantID := fmt.Sprintf("tenant_%02d", idx%5)
			contractID := fmt.Sprintf("contract_load_%04d", idx)
			c := &ProtocolContract{
				ContractID:         contractID,
				TenantID:           tenantID,
				RequesterID:        fmt.Sprintf("agent_%03d", idx),
				ProviderID:         fmt.Sprintf("agent_%03d", (idx+1)%numAgents),
				Capability:         "compute-analysis",
				TotalAmount:        "5.00",
				Currency:           "USDC",
				PolicySnapshotHash: "policy_load_hash_sha256",
				State:              ContractProposed,
				CreatedAt:          time.Now().UTC(),
				ExpiresAt:          time.Now().UTC().Add(48 * time.Hour),
			}
			if _, err := svc.ProposeContract(ctx, c); err != nil {
				return
			}
			if _, err := svc.AcceptContract(ctx, contractID); err == nil {
				atomic.AddInt64(&contractSuccessCount, 1)
			}
		}(i)
	}
	wgContract.Wait()

	if contractSuccessCount != int64(numContracts) {
		t.Fatalf("expected %d successful contracts accepted, got %d", numContracts, contractSuccessCount)
	}

	totalDuration := time.Since(startTime)
	t.Logf("LOAD TEST METRICS: 100 Agents, 1000 Queries (%v, avg %v/query), 500 Requests, 200 Quotes, 100 Contracts accepted in total %v",
		queryLatency, queryLatency/time.Duration(numQueries), totalDuration)
}
