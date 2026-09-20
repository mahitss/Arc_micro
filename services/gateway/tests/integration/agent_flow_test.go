package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/agent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

type mockIntegrationPolicyClient struct{}

func (m *mockIntegrationPolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionAllow,
		ReasonCode: domain.ReasonApproved,
		Reason:     "Integration test policy approved",
	}, nil
}

func (m *mockIntegrationPolicyClient) Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	dec, err := m.Authorize(ctx, req)
	dec.Simulation = true
	return dec, err
}

func (m *mockIntegrationPolicyClient) CheckHealth(ctx context.Context) error {
	return nil
}

type mockIntegrationExecutionService struct {
	ExecutionCount int
}

func (m *mockIntegrationExecutionService) ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
	m.ExecutionCount++
	return &blockchain.PaymentExecutionResult{
		RequestID:       req.RequestID,
		Status:          blockchain.StateConfirmed,
		TransactionHash: "0x7777777777777777777777777777777777777777777777777777777777777777",
		Vault:           req.VaultAddress,
		Recipient:       req.Recipient,
		Amount:          req.Amount,
	}, nil
}

func (m *mockIntegrationExecutionService) ReconcileTransaction(ctx context.Context, requestID string) (*blockchain.PaymentExecutionResult, error) {
	return &blockchain.PaymentExecutionResult{
		RequestID:       requestID,
		Status:          blockchain.StateConfirmed,
		TransactionHash: "0x7777777777777777777777777777777777777777777777777777777777777777",
	}, nil
}

// TestIntegration_AgentTaskToExecutionBoundary tests the complete pipeline (Test Case 30).
// Pipeline: Agent task -> Payment Intent -> Rust Authorization -> Execution Boundary.
func TestIntegration_AgentTaskToExecutionBoundary(t *testing.T) {
	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      false,
		MaxRequestBodyBytes:     1048576,
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := &mockIntegrationPolicyClient{}
	execSvc := &mockIntegrationExecutionService{}

	intentSvc := intent.NewService(repo, pClient, execSvc, reg, nil, 5*time.Minute, false)
	mockModel := &agent.MockAgentModel{
		CustomResponse: &agent.AIIntentResponse{
			RequiresPayment: true,
			Service:         "web-research",
			Recipient:       "0x1111111111111111111111111111111111111111",
			Amount:          "180000",
			Asset:           "USDC",
			Purpose:         "api_usage",
			Justification:   "Researching Arc micro architecture",
		},
	}
	agentSvc := agent.NewService(mockModel, intentSvc, reg, false)

	router := gwHttp.NewRouter(cfg, pClient, nil, agentSvc, intentSvc, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// 1. Submit Agent Task: POST /v1/agents/tasks
	taskReqBody := map[string]string{
		"agent_id": "research-agent",
		"task":     "Research latest Arc protocol documentation",
	}
	taskReqJSON, _ := json.Marshal(taskReqBody)
	resp, err := http.Post(server.URL+"/v1/agents/tasks", "application/json", bytes.NewReader(taskReqJSON))
	if err != nil {
		t.Fatalf("failed to post agent task: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK from agent tasks, got: %d", resp.StatusCode)
	}

	var taskResp agent.TaskResponse
	if err := json.NewDecoder(resp.Body).Decode(&taskResp); err != nil {
		t.Fatalf("failed to decode task response: %v", err)
	}

	if taskResp.Status != "PAYMENT_REQUIRED" {
		t.Fatalf("expected PAYMENT_REQUIRED, got: %s", taskResp.Status)
	}
	if taskResp.PaymentIntent == nil {
		t.Fatal("expected payment intent in response")
	}
	intentID := taskResp.PaymentIntent.IntentID
	if intentID == "" {
		t.Fatal("expected non-empty intent_id")
	}

	// 2. Query Payment Intent: GET /v1/payment-intents/{id}
	getResp, err := http.Get(server.URL + "/v1/payment-intents/" + intentID)
	if err != nil {
		t.Fatalf("failed to get intent: %v", err)
	}
	defer getResp.Body.Close()

	if getResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK from get intent, got: %d", getResp.StatusCode)
	}

	// 3. Authorize Payment Intent: POST /v1/payment-intents/{id}/authorize
	authResp, err := http.Post(server.URL+"/v1/payment-intents/"+intentID+"/authorize", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to authorize intent: %v", err)
	}
	defer authResp.Body.Close()

	if authResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK from authorize intent, got: %d", authResp.StatusCode)
	}

	// 4. Confirm Payment Intent: POST /v1/payment-intents/{id}/confirm
	confResp, err := http.Post(server.URL+"/v1/payment-intents/"+intentID+"/confirm", "application/json", nil)
	if err != nil {
		t.Fatalf("failed to confirm intent: %v", err)
	}
	defer confResp.Body.Close()

	if confResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK from confirm intent, got: %d", confResp.StatusCode)
	}

	if execSvc.ExecutionCount != 1 {
		t.Fatalf("expected 1 execution call, got: %d", execSvc.ExecutionCount)
	}

	// 5. Verify GET reflects CONFIRMED status and transaction hash
	getAfterConf, err := http.Get(server.URL + "/v1/payment-intents/" + intentID)
	if err != nil {
		t.Fatalf("failed to get confirmed intent: %v", err)
	}
	defer getAfterConf.Body.Close()

	var detailResp map[string]interface{}
	if err := json.NewDecoder(getAfterConf.Body).Decode(&detailResp); err != nil {
		t.Fatalf("failed to decode detail response: %v", err)
	}

	intentObj, ok := detailResp["intent"].(map[string]interface{})
	if !ok || intentObj["status"] != string(intent.StatusConfirmed) {
		t.Fatalf("expected intent status CONFIRMED, got: %+v", detailResp)
	}
	if detailResp["transaction_hash"] == "" {
		t.Fatalf("expected non-empty transaction_hash, got: %+v", detailResp)
	}
}

// TestIntegration_AutoExecutionEnabled tests automatic authorization and confirmation when configured (Test Case 18).
func TestIntegration_AutoExecutionEnabled(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := &mockIntegrationPolicyClient{}
	execSvc := &mockIntegrationExecutionService{}

	intentSvc := intent.NewService(repo, pClient, execSvc, reg, nil, 5*time.Minute, true)
	mockModel := &agent.MockAgentModel{
		CustomResponse: &agent.AIIntentResponse{
			RequiresPayment: true,
			Service:         "web-research",
			Recipient:       "0x1111111111111111111111111111111111111111",
			Amount:          "180000",
			Asset:           "USDC",
			Purpose:         "api_usage",
			Justification:   "Auto-execution research test",
		},
	}
	agentSvc := agent.NewService(mockModel, intentSvc, reg, true)

	taskResp, err := agentSvc.ProcessTask(context.Background(), agent.AgentTask{
		AgentID: "research-agent",
		Task:    "Research Arc protocol automatic",
	})
	if err != nil {
		t.Fatalf("auto-execution task processing failed: %v", err)
	}

	if taskResp.PaymentIntent.Status != intent.StatusConfirmed {
		t.Fatalf("expected intent to be automatically CONFIRMED, got: %s", taskResp.PaymentIntent.Status)
	}
	if execSvc.ExecutionCount != 1 {
		t.Fatalf("expected 1 execution call during auto-execution, got: %d", execSvc.ExecutionCount)
	}
}
