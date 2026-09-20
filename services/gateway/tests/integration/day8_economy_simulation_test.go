package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/handlers"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// mockSimulationPolicyClient simulates policy responses for Day 8 economy & simulation testing.
type mockSimulationPolicyClient struct{}

func (m *mockSimulationPolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return m.Simulate(ctx, req)
}

func (m *mockSimulationPolicyClient) Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	// If amount is 25 USDC (25000000 base units), simulate APPROVAL_REQUIRED
	if req.Amount == "25000000" {
		return domain.AuthorizationDecision{
			RequestID:   req.RequestID,
			Decision:    domain.DecisionApprovalRequired,
			ReasonCode:  domain.ReasonAboveApprovalThreshold,
			Reason:      "Amount exceeds single transaction instant execution threshold",
			Simulation:  true,
		}, nil
	}

	// Normal amounts within limits
	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionAllow,
		ReasonCode: domain.ReasonApproved,
		Reason:     "Policy simulation approved",
		Simulation: true,
	}, nil
}

func (m *mockSimulationPolicyClient) CheckHealth(ctx context.Context) error {
	return nil
}

func setupDay8TestServer(t *testing.T) (*httptest.Server, *registry.Registry, storage.Repository) {
	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      true,
		AllowLocalhostWebhooks:  true,
		MaxRequestBodyBytes:     1048576,
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := &mockSimulationPolicyClient{}

	router := gwHttp.NewRouter(cfg, pClient, nil, nil, nil, repo, reg)
	server := httptest.NewServer(router)

	// Seed test agent
	_ = repo.SaveAgent(context.Background(), &storage.Agent{
		ID:             "agent_research_01",
		OrganizationID: "org_default",
		Name:           "Autonomous Research Agent",
		Status:         "ACTIVE",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	return server, reg, repo
}

// TestDay8_ServiceMarketplaceAndFiltering tests service discovery with filters.
func TestDay8_ServiceMarketplaceAndFiltering(t *testing.T) {
	server, _, _ := setupDay8TestServer(t)
	defer server.Close()

	// 1. List all enabled services
	resp, err := http.Get(server.URL + "/v1/services")
	if err != nil {
		t.Fatalf("failed to list services: %v", err)
	}
	defer resp.Body.Close()

	var result struct {
		Services []*registry.Service `json:"services"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode services: %v", err)
	}

	if len(result.Services) == 0 {
		t.Fatal("expected non-empty services list")
	}

	// Verify disabled service is excluded by default
	for _, s := range result.Services {
		if s.ID == "archived-service" {
			t.Fatal("disabled service 'archived-service' should not be in default list")
		}
	}

	// 2. Filter by category=RESEARCH
	respCat, err := http.Get(server.URL + "/v1/services?category=RESEARCH")
	if err != nil {
		t.Fatalf("failed to query category: %v", err)
	}
	defer respCat.Body.Close()

	var catResult struct {
		Services []*registry.Service `json:"services"`
	}
	_ = json.NewDecoder(respCat.Body).Decode(&catResult)

	for _, s := range catResult.Services {
		if s.Category != "RESEARCH" {
			t.Fatalf("expected category RESEARCH, got: %s", s.Category)
		}
	}
}

// TestDay8_ServiceQuotes tests quote creation and expiration.
func TestDay8_ServiceQuotes(t *testing.T) {
	server, reg, _ := setupDay8TestServer(t)
	defer server.Close()

	// 1. Create a quote for web-research
	payload := `{"amount":"500000","asset":"USDC"}`
	resp, err := http.Post(server.URL+"/v1/services/web-research/quote", "application/json", bytes.NewBufferString(payload))
	if err != nil {
		t.Fatalf("failed to request quote: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created, got: %d", resp.StatusCode)
	}

	var quote registry.Quote
	if err := json.NewDecoder(resp.Body).Decode(&quote); err != nil {
		t.Fatalf("failed to decode quote: %v", err)
	}

	if quote.ID == "" || quote.ServiceID != "web-research" || quote.Amount != "500000" {
		t.Fatalf("invalid quote returned: %+v", quote)
	}

	// 2. Validate quote via registry
	validQuote, err := reg.ValidateQuote(quote.ID, "web-research", "500000", "USDC")
	if err != nil {
		t.Fatalf("expected quote to be valid: %v", err)
	}
	if validQuote.ID != quote.ID {
		t.Fatalf("expected quote ID %s, got: %s", quote.ID, validQuote.ID)
	}

	// 3. Request quote for non-existent service
	resp404, _ := http.Post(server.URL+"/v1/services/nonexistent/quote", "application/json", bytes.NewBufferString(payload))
	if resp404.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown service quote, got: %d", resp404.StatusCode)
	}
}

// TestDay8_AgentBudgetEndpoint tests the safe read-only budget context.
func TestDay8_AgentBudgetEndpoint(t *testing.T) {
	server, _, _ := setupDay8TestServer(t)
	defer server.Close()

	resp, err := http.Get(server.URL + "/v1/agent-budgets/agent_research_01")
	if err != nil {
		t.Fatalf("failed to get agent budget: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got: %d", resp.StatusCode)
	}

	var budget map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&budget); err != nil {
		t.Fatalf("failed to decode budget: %v", err)
	}

	if budget["agent_id"] != "agent_research_01" {
		t.Fatalf("expected agent_research_01, got: %v", budget["agent_id"])
	}
	if budget["daily_spending_limit"] == nil || budget["remaining_daily_limit"] == nil {
		t.Fatal("missing spending limit fields in budget response")
	}
}

// TestDay8_SimulationMode tests the POST /v1/simulations endpoint.
func TestDay8_SimulationMode(t *testing.T) {
	server, _, repo := setupDay8TestServer(t)
	defer server.Close()

	// 1. Simulate standard payment: 500000 (0.50 USDC) -> WOULD_EXECUTE
	simReq1 := `{"agent_id":"agent_research_01","service_id":"web-research","amount":"500000","asset":"USDC","purpose":"Simulation test"}`
	resp1, err := http.Post(server.URL+"/v1/simulations", "application/json", bytes.NewBufferString(simReq1))
	if err != nil {
		t.Fatalf("simulation 1 failed: %v", err)
	}
	defer resp1.Body.Close()

	var res1 handlers.SimulationResponse
	if err := json.NewDecoder(resp1.Body).Decode(&res1); err != nil {
		t.Fatalf("failed to decode sim 1: %v", err)
	}

	if !res1.Simulation {
		t.Fatal("expected simulation=true")
	}
	if res1.PolicyDecision != "ALLOW" || res1.PredictedOutcome != "WOULD_EXECUTE" {
		t.Fatalf("expected ALLOW / WOULD_EXECUTE, got: %s / %s", res1.PolicyDecision, res1.PredictedOutcome)
	}

	// 2. Simulate high-cost payment: 25000000 (25.00 USDC) -> APPROVAL_REQUIRED
	simReq2 := `{"agent_id":"agent_research_01","service_id":"research-api","amount":"25000000","asset":"USDC","purpose":"Expensive intelligence"}`
	resp2, err := http.Post(server.URL+"/v1/simulations", "application/json", bytes.NewBufferString(simReq2))
	if err != nil {
		t.Fatalf("simulation 2 failed: %v", err)
	}
	defer resp2.Body.Close()

	var res2 handlers.SimulationResponse
	if err := json.NewDecoder(resp2.Body).Decode(&res2); err != nil {
		t.Fatalf("failed to decode sim 2: %v", err)
	}

	if res2.PolicyDecision != "APPROVAL_REQUIRED" || res2.PredictedOutcome != "APPROVAL_REQUIRED" {
		t.Fatalf("expected APPROVAL_REQUIRED, got: %s / %s", res2.PolicyDecision, res2.PredictedOutcome)
	}

	// 3. Simulate unapproved / price-exceeding payment -> WOULD_DENY
	simReq3 := `{"agent_id":"agent_research_01","service_id":"web-research","amount":"99999999","asset":"USDC","purpose":"Price exceeded"}`
	resp3, err := http.Post(server.URL+"/v1/simulations", "application/json", bytes.NewBufferString(simReq3))
	if err != nil {
		t.Fatalf("simulation 3 failed: %v", err)
	}
	defer resp3.Body.Close()

	var res3 handlers.SimulationResponse
	if err := json.NewDecoder(resp3.Body).Decode(&res3); err != nil {
		t.Fatalf("failed to decode sim 3: %v", err)
	}

	if res3.PolicyDecision != "DENY" || res3.PredictedOutcome != "WOULD_DENY" {
		t.Fatalf("expected DENY / WOULD_DENY, got: %s / %s", res3.PolicyDecision, res3.PredictedOutcome)
	}

	// CRITICAL INVARIANT: Verify ZERO real payment intents were created in repo during simulations
	intents, _ := repo.ListIntents(context.Background())
	if len(intents) != 0 {
		t.Fatalf("CRITICAL SECURITY VIOLATION: Simulation mode created %d real payment intent(s)!", len(intents))
	}
}
