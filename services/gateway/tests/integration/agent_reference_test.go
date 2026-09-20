package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/agent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/service"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// TestIntegration_AutonomousResearchAgent_FullHappyPath tests the complete autonomous agent workflow:
// USER TASK -> AGENT -> SERVICE DISCOVERY -> PAYMENT INTENT -> POLICY (ALLOW) -> ARC SETTLEMENT -> DATA PROCUREMENT -> FINAL REPORT
func TestIntegration_AutonomousResearchAgent_FullHappyPath(t *testing.T) {
	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      true,
		MaxRequestBodyBytes:     1048576,
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := &mockIntegrationPolicyClient{}
	execSvc := &mockIntegrationExecutionService{}

	intentSvc := intent.NewService(repo, pClient, execSvc, reg, nil, 5*time.Minute, true)
	mockModel := &agent.MockAgentModel{
		CustomResponse: &agent.AIIntentResponse{
			RequiresPayment: true,
			Service:         "web-research",
			Amount:          "180000",
			Asset:           "USDC",
			Purpose:         "api_usage",
			Justification:   "Research compute pricing and benchmark data",
		},
	}
	agentSvc := agent.NewService(mockModel, intentSvc, reg, true)

	router := gwHttp.NewRouter(cfg, pClient, execSvc, agentSvc, intentSvc, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// 1. Submit Autonomous Agent Task: POST /v1/agents/tasks with autonomous=true
	reqPayload := map[string]interface{}{
		"agent_id":      "research-agent",
		"task":          "Research 2026 AI compute pricing and benchmark data",
		"vault_address": "0x1111111111111111111111111111111111111111",
		"autonomous":    true,
	}
	reqBytes, _ := json.Marshal(reqPayload)
	resp, err := http.Post(server.URL+"/v1/agents/tasks", "application/json", bytes.NewReader(reqBytes))
	if err != nil {
		t.Fatalf("failed to post agent task: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got: %d", resp.StatusCode)
	}

	var res agent.AgentTaskExecutionResult
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res.State != agent.StateCompleted {
		t.Fatalf("expected state COMPLETED, got: %s (error: %s)", res.State, res.Error)
	}
	if res.PaymentIntentID == "" {
		t.Fatal("expected non-empty payment_intent_id")
	}
	if res.ExternalData == "" {
		t.Fatal("expected external data to be populated")
	}
	if !strings.Contains(res.FinalReport, "Autonomous Research Report") {
		t.Fatalf("expected final report title, got: %s", res.FinalReport)
	}
	if execSvc.ExecutionCount != 1 {
		t.Fatalf("expected 1 execution call on Arc, got: %d", execSvc.ExecutionCount)
	}

	// 2. Query Task State: GET /v1/agents/tasks/{id}
	getResp, err := http.Get(server.URL + "/v1/agents/tasks/" + res.TaskID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}
	defer getResp.Body.Close()
	if getResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK from get task, got: %d", getResp.StatusCode)
	}
	var fetchedRes agent.AgentTaskExecutionResult
	_ = json.NewDecoder(getResp.Body).Decode(&fetchedRes)
	if fetchedRes.TaskID != res.TaskID || fetchedRes.State != agent.StateCompleted {
		t.Fatalf("mismatched fetched task: %+v", fetchedRes)
	}
}

// TestIntegration_AutonomousResearchAgent_ApprovalFlow tests the approval workflow:
// Task -> APPROVAL_REQUIRED -> WAITING_FOR_APPROVAL -> Human Controller Approves -> CONFIRMED -> COMPLETED
func TestIntegration_AutonomousResearchAgent_ApprovalFlow(t *testing.T) {
	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      true,
		MaxRequestBodyBytes:     1048576,
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := &mockIntegrationPolicyApprovalClient{}
	execSvc := &mockIntegrationExecutionService{}

	intentSvc := intent.NewService(repo, pClient, execSvc, reg, nil, 5*time.Minute, true)
	mockModel := &agent.MockAgentModel{
		CustomResponse: &agent.AIIntentResponse{
			RequiresPayment: true,
			Service:         "compute-cluster",
			Amount:          "1500000",
			Asset:           "USDC",
			Purpose:         "compute",
			Justification:   "High-performance GPU cluster compute",
		},
	}
	agentSvc := agent.NewService(mockModel, intentSvc, reg, true)

	router := gwHttp.NewRouter(cfg, pClient, execSvc, agentSvc, intentSvc, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// 1. Submit task with wait_for_approval=true
	// In background, approve the intent after 150ms via POST /v1/approvals/{id}/approve
	go func() {
		time.Sleep(150 * time.Millisecond)
		ctx := context.Background()
		for i := 0; i < 30; i++ {
			intents, _ := repo.ListIntents(ctx)
			if len(intents) > 0 {
				app, _ := repo.GetApprovalByIntent(ctx, intents[0].IntentID)
				if app != nil {
					appReqBody := bytes.NewReader([]byte(`{"approver_id":"human_controller","reason":"Approved research budget"}`))
					resp, err := http.Post(server.URL+"/v1/approvals/"+app.ID+"/approve", "application/json", appReqBody)
					if err == nil {
						resp.Body.Close()
						return
					}
				}
			}
			time.Sleep(20 * time.Millisecond)
		}
	}()

	reqPayload := map[string]interface{}{
		"agent_id":            "research-agent",
		"task":                "Procure GPU compute cluster for deep benchmark",
		"vault_address":       "0x1111111111111111111111111111111111111111",
		"autonomous":          true,
		"wait_for_approval":   true,
		"approval_timeout_ms": 3000,
	}
	reqBytes, _ := json.Marshal(reqPayload)
	resp, err := http.Post(server.URL+"/v1/agents/tasks", "application/json", bytes.NewReader(reqBytes))
	if err != nil {
		t.Fatalf("failed to post agent task: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got: %d", resp.StatusCode)
	}

	var res agent.AgentTaskExecutionResult
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res.State != agent.StateCompleted {
		t.Fatalf("expected state COMPLETED after human approval, got: %s (error: %s)", res.State, res.Error)
	}
	if execSvc.ExecutionCount != 1 {
		t.Fatalf("expected 1 execution call after approval, got: %d", execSvc.ExecutionCount)
	}
}

// TestIntegration_AutonomousResearchAgent_ApprovalRejectionFlow tests rejection behavior:
// Task -> APPROVAL_REQUIRED -> WAITING_FOR_APPROVAL -> Human Controller Rejects -> FAILED (Zero funds moved)
func TestIntegration_AutonomousResearchAgent_ApprovalRejectionFlow(t *testing.T) {
	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      true,
		MaxRequestBodyBytes:     1048576,
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := &mockIntegrationPolicyApprovalClient{}
	execSvc := &mockIntegrationExecutionService{}

	intentSvc := intent.NewService(repo, pClient, execSvc, reg, nil, 5*time.Minute, true)
	mockModel := &agent.MockAgentModel{
		CustomResponse: &agent.AIIntentResponse{
			RequiresPayment: true,
			Service:         "compute-cluster",
			Amount:          "1500000",
			Asset:           "USDC",
			Purpose:         "compute",
			Justification:   "Rejection test query",
		},
	}
	agentSvc := agent.NewService(mockModel, intentSvc, reg, true)

	router := gwHttp.NewRouter(cfg, pClient, execSvc, agentSvc, intentSvc, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// In background, reject the intent after 150ms via POST /v1/approvals/{id}/reject
	go func() {
		time.Sleep(150 * time.Millisecond)
		ctx := context.Background()
		for i := 0; i < 30; i++ {
			intents, _ := repo.ListIntents(ctx)
			if len(intents) > 0 {
				app, _ := repo.GetApprovalByIntent(ctx, intents[0].IntentID)
				if app != nil {
					rejReqBody := bytes.NewReader([]byte(`{"approver_id":"human_controller","reason":"Budget denied"}`))
					resp, err := http.Post(server.URL+"/v1/approvals/"+app.ID+"/reject", "application/json", rejReqBody)
					if err == nil {
						resp.Body.Close()
						return
					}
				}
			}
			time.Sleep(20 * time.Millisecond)
		}
	}()

	reqPayload := map[string]interface{}{
		"agent_id":            "research-agent",
		"task":                "Procure expensive cluster",
		"vault_address":       "0x1111111111111111111111111111111111111111",
		"autonomous":          true,
		"wait_for_approval":   true,
		"approval_timeout_ms": 3000,
	}
	reqBytes, _ := json.Marshal(reqPayload)
	resp, err := http.Post(server.URL+"/v1/agents/tasks", "application/json", bytes.NewReader(reqBytes))
	if err != nil {
		t.Fatalf("failed to post agent task: %v", err)
	}
	defer resp.Body.Close()

	var res agent.AgentTaskExecutionResult
	_ = json.NewDecoder(resp.Body).Decode(&res)

	if res.State != agent.StateFailed {
		t.Fatalf("expected state FAILED after human rejection, got: %s", res.State)
	}
	if execSvc.ExecutionCount != 0 {
		t.Fatalf("expected ZERO execution calls on rejection, got: %d", execSvc.ExecutionCount)
	}
}

// TestIntegration_AutonomousResearchAgent_PolicyDenyInviolability tests that hard policy DENY
// can NEVER become executable even if an approval is attempted.
func TestIntegration_AutonomousResearchAgent_PolicyDenyInviolability(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := &mockIntegrationPolicyDenyClient{}
	execSvc := &mockIntegrationExecutionService{}

	intentSvc := intent.NewService(repo, pClient, execSvc, reg, nil, 5*time.Minute, false)
	mockModel := &agent.MockAgentModel{
		CustomResponse: &agent.AIIntentResponse{
			RequiresPayment: true,
			Service:         "web-research",
			Amount:          "180000",
			Asset:           "USDC",
			Purpose:         "api_usage",
		},
	}
	agentSvc := agent.NewService(mockModel, intentSvc, reg, false)

	res, err := agentSvc.RunAutonomousTask(context.Background(), agent.AgentTask{
		AgentID: "research-agent",
		Task:    "Denied task query",
	}, agent.RunOptions{AutoConfirm: true})

	if err == nil {
		t.Fatal("expected error on policy deny, got nil")
	}
	if res.State != agent.StateFailed {
		t.Fatalf("expected state FAILED, got: %s", res.State)
	}

	// Verify that the intent in repo is permanently DENIED
	pi, _ := repo.GetIntent(context.Background(), res.PaymentIntentID)
	if pi != nil && pi.Status != intent.StatusDenied {
		t.Fatalf("expected intent status DENIED, got: %s", pi.Status)
	}

	// Attempting to approve a DENIED intent must be strictly rejected
	ds := service.NewDomainService(repo)
	_, _, err = ds.RecordApproval(context.Background(), "org_default", res.PaymentIntentID, "human_controller", true, "Attempt override")
	if err == nil {
		t.Fatal("CRITICAL SECURITY VULNERABILITY: Human approval overrode hard policy DENY!")
	}
	if execSvc.ExecutionCount != 0 {
		t.Fatalf("expected ZERO executions, got: %d", execSvc.ExecutionCount)
	}
}

type mockIntegrationPolicyApprovalClient struct{}

func (m *mockIntegrationPolicyApprovalClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionApprovalRequired,
		ReasonCode: domain.ReasonApprovalRequired,
		Reason:     "Integration test requires approval",
	}, nil
}

func (m *mockIntegrationPolicyApprovalClient) CheckHealth(ctx context.Context) error {
	return nil
}

type mockIntegrationPolicyDenyClient struct{}

func (m *mockIntegrationPolicyDenyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionDeny,
		ReasonCode: domain.ReasonDailyLimitExceeded,
		Reason:     "Hard policy daily limit exceeded",
	}, nil
}

func (m *mockIntegrationPolicyDenyClient) CheckHealth(ctx context.Context) error {
	return nil
}
