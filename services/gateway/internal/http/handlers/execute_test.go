package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/handlers"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
)

// mockExecutionService simulates blockchain execution for handler tests.
type mockExecutionService struct {
	executePaymentFn func(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error)
}

func (m *mockExecutionService) ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
	if m.executePaymentFn != nil {
		return m.executePaymentFn(ctx, req)
	}
	return &blockchain.PaymentExecutionResult{
		RequestID: req.RequestID,
		Status:    blockchain.StateExecutionDisabled,
		Vault:     req.VaultAddress,
		Recipient: req.Recipient,
		Amount:    req.Amount,
	}, nil
}

func setupExecuteTestRouter(pMock *mockPolicyClient, eMock *mockExecutionService) http.Handler {
	cfg := &config.Config{
		Port:                "8080",
		PolicyEngineURL:     "http://localhost:8081",
		PolicyEngineTimeout: 2 * time.Second,
		CORSAllowedOrigins:  []string{"http://localhost:3000"},
		MaxRequestBodyBytes: 1048576,
		ArcChainID:          "5042",
		ArcExplorerURL:      "https://explorer.arc.io",
	}
	return gwHttp.NewRouter(cfg, pMock, eMock)
}

func validExecutePayload(reqID string) handlers.ExecutePaymentRequest {
	return handlers.ExecutePaymentRequest{
		RequestID:    reqID,
		AgentID:      "research-agent",
		VaultAddress: "0x2222222222222222222222222222222222222222",
		Recipient:    "0x1111111111111111111111111111111111111111",
		Amount:       "180000",
		Purpose:      "api_usage",
	}
}

// 1. Rust returns ALLOW + live execution disabled -> 200 with status EXECUTION_DISABLED
func TestExecute_PolicyAllow_ExecutionDisabled(t *testing.T) {
	pMock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionAllow,
				ReasonCode: domain.ReasonApproved,
				Reason:     "Approved",
			}, nil
		},
	}
	eMock := &mockExecutionService{}

	router := setupExecuteTestRouter(pMock, eMock)
	b, _ := json.Marshal(validExecutePayload("req_exec_allow"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/execute", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var resp handlers.ExecutePaymentResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != "EXECUTION_DISABLED" {
		t.Errorf("expected EXECUTION_DISABLED status, got %s", resp.Status)
	}
	if resp.Authorization == nil || resp.Authorization.Decision != domain.DecisionAllow {
		t.Errorf("expected ALLOW authorization decision")
	}
}

// 2. Rust returns DENY -> 200 with status DENIED, execution service NEVER called
func TestExecute_PolicyDeny_NoExecution(t *testing.T) {
	pMock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionDeny,
				ReasonCode: domain.ReasonDailyLimitExceeded,
				Reason:     "Daily limit exceeded",
			}, nil
		},
	}
	executed := false
	eMock := &mockExecutionService{
		executePaymentFn: func(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
			executed = true
			return nil, nil
		},
	}

	router := setupExecuteTestRouter(pMock, eMock)
	b, _ := json.Marshal(validExecutePayload("req_exec_deny"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/execute", bytes.NewReader(b))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if executed {
		t.Fatal("CRITICAL: execution service was called despite policy DENY!")
	}
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for policy denial, got %d", w.Code)
	}

	var resp handlers.ExecutePaymentResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Status != "DENIED" {
		t.Errorf("expected status DENIED, got %s", resp.Status)
	}
	if resp.Authorization.Decision != domain.DecisionDeny {
		t.Errorf("expected DENY decision in authorization")
	}
}

// 3. Policy engine unavailable -> fail closed with 503
func TestExecute_PolicyUnavailable_FailClosed(t *testing.T) {
	pMock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{}, policy.ErrUnavailable
		},
	}
	eMock := &mockExecutionService{}

	router := setupExecuteTestRouter(pMock, eMock)
	b, _ := json.Marshal(validExecutePayload("req_exec_unavail"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/execute", bytes.NewReader(b))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 fail closed, got %d", w.Code)
	}
}

// 4. Malformed JSON -> 400
func TestExecute_MalformedJSON(t *testing.T) {
	router := setupExecuteTestRouter(&mockPolicyClient{}, &mockExecutionService{})
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/execute", strings.NewReader(`{invalid json`))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request, got %d", w.Code)
	}
}

// 5. Missing required fields -> 400
func TestExecute_MissingFields(t *testing.T) {
	router := setupExecuteTestRouter(&mockPolicyClient{}, &mockExecutionService{})

	cases := []struct {
		name    string
		payload map[string]interface{}
	}{
		{"missing agent_id", map[string]interface{}{"vault_address": "0x2222222222222222222222222222222222222222", "recipient": "0x1111111111111111111111111111111111111111", "amount": "100", "purpose": "test"}},
		{"missing vault_address", map[string]interface{}{"agent_id": "test", "recipient": "0x1111111111111111111111111111111111111111", "amount": "100", "purpose": "test"}},
		{"missing recipient", map[string]interface{}{"agent_id": "test", "vault_address": "0x2222222222222222222222222222222222222222", "amount": "100", "purpose": "test"}},
		{"missing amount", map[string]interface{}{"agent_id": "test", "vault_address": "0x2222222222222222222222222222222222222222", "recipient": "0x1111111111111111111111111111111111111111", "purpose": "test"}},
		{"missing purpose", map[string]interface{}{"agent_id": "test", "vault_address": "0x2222222222222222222222222222222222222222", "recipient": "0x1111111111111111111111111111111111111111", "amount": "100"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			b, _ := json.Marshal(tc.payload)
			req := httptest.NewRequest(http.MethodPost, "/v1/payments/execute", bytes.NewReader(b))
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("[%s] expected 400, got %d", tc.name, w.Code)
			}
		})
	}
}
