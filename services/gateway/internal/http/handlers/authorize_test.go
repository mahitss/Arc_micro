package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/handlers"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
)

// mockPolicyClient allows mocking Rust policy engine responses for handler tests.
type mockPolicyClient struct {
	authorizeFn   func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error)
	checkHealthFn func(ctx context.Context) error
}

func (m *mockPolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	if m.authorizeFn != nil {
		return m.authorizeFn(ctx, req)
	}
	return domain.AuthorizationDecision{}, nil
}

func (m *mockPolicyClient) CheckHealth(ctx context.Context) error {
	if m.checkHealthFn != nil {
		return m.checkHealthFn(ctx)
	}
	return nil
}

func setupTestRouter(mock *mockPolicyClient, maxBodyBytes int64) http.Handler {
	cfg := &config.Config{
		Port:                "8080",
		PolicyEngineURL:     "http://localhost:8081",
		PolicyEngineTimeout: 2 * time.Second,
		CORSAllowedOrigins:  []string{"http://localhost:3000"},
		MaxRequestBodyBytes: maxBodyBytes,
	}
	return gwHttp.NewRouter(cfg, mock)
}

func validPayload(reqID string) domain.PaymentRequest {
	return domain.PaymentRequest{
		RequestID: reqID,
		AgentID:   "research-agent",
		Recipient: "0x1111111111111111111111111111111111111111",
		Amount:    "180000",
		Asset:     "USDC",
		Purpose:   "api_usage",
	}
}

// 1. Valid request -> forwards to Rust
// 2. Rust returns ALLOW -> gateway returns 200 ALLOW
func TestAuthorize_Allow(t *testing.T) {
	forwarded := false
	mock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			forwarded = true
			if req.AgentID != "research-agent" {
				t.Errorf("expected agent_id 'research-agent', got '%s'", req.AgentID)
			}
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionAllow,
				ReasonCode: domain.ReasonApproved,
				Reason:     "Payment satisfies the configured policy.",
			}, nil
		},
	}

	router := setupTestRouter(mock, 1048576)
	reqBody, _ := json.Marshal(validPayload("req_allow_1"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if !forwarded {
		t.Fatal("request was not forwarded to policy client")
	}
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var resp domain.AuthorizationDecision
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Decision != domain.DecisionAllow {
		t.Errorf("expected decision ALLOW, got %s", resp.Decision)
	}
	if resp.ReasonCode != domain.ReasonApproved {
		t.Errorf("expected reason_code APPROVED, got %s", resp.ReasonCode)
	}
	if resp.RequestID != "req_allow_1" {
		t.Errorf("expected request_id req_allow_1, got %s", resp.RequestID)
	}
}

// 3. Rust returns DENY -> gateway returns 200 DENY
func TestAuthorize_Deny(t *testing.T) {
	mock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionDeny,
				ReasonCode: domain.ReasonDailyLimitExceeded,
				Reason:     "Payment would exceed the agent daily spending limit.",
			}, nil
		},
	}

	router := setupTestRouter(mock, 1048576)
	reqBody, _ := json.Marshal(validPayload("req_deny_1"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for DENY decision, got %d: %s", w.Code, w.Body.String())
	}

	var resp domain.AuthorizationDecision
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Decision != domain.DecisionDeny {
		t.Errorf("expected decision DENY, got %s", resp.Decision)
	}
	if resp.ReasonCode != domain.ReasonDailyLimitExceeded {
		t.Errorf("expected reason_code DAILY_LIMIT_EXCEEDED, got %s", resp.ReasonCode)
	}
}

// 4. Malformed JSON -> 400
func TestAuthorize_MalformedJSON(t *testing.T) {
	mock := &mockPolicyClient{}
	router := setupTestRouter(mock, 1048576)

	req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", strings.NewReader(`{invalid json`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request, got %d", w.Code)
	}

	var errResp domain.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if errResp.Error.Code != "MALFORMED_JSON" {
		t.Errorf("expected error code MALFORMED_JSON, got %s", errResp.Error.Code)
	}
}

// 5. Missing required fields -> 400
func TestAuthorize_MissingRequiredFields(t *testing.T) {
	mock := &mockPolicyClient{}
	router := setupTestRouter(mock, 1048576)

	testCases := []struct {
		name    string
		payload map[string]interface{}
	}{
		{"missing agent_id", map[string]interface{}{"recipient": "0x1111111111111111111111111111111111111111", "amount": "100", "asset": "USDC", "purpose": "test"}},
		{"missing recipient", map[string]interface{}{"agent_id": "test", "amount": "100", "asset": "USDC", "purpose": "test"}},
		{"invalid recipient format", map[string]interface{}{"agent_id": "test", "recipient": "not_an_eth_address", "amount": "100", "asset": "USDC", "purpose": "test"}},
		{"missing amount", map[string]interface{}{"agent_id": "test", "recipient": "0x1111111111111111111111111111111111111111", "asset": "USDC", "purpose": "test"}},
		{"zero amount", map[string]interface{}{"agent_id": "test", "recipient": "0x1111111111111111111111111111111111111111", "amount": "0", "asset": "USDC", "purpose": "test"}},
		{"negative amount", map[string]interface{}{"agent_id": "test", "recipient": "0x1111111111111111111111111111111111111111", "amount": "-100", "asset": "USDC", "purpose": "test"}},
		{"missing asset", map[string]interface{}{"agent_id": "test", "recipient": "0x1111111111111111111111111111111111111111", "amount": "100", "purpose": "test"}},
		{"missing purpose", map[string]interface{}{"agent_id": "test", "recipient": "0x1111111111111111111111111111111111111111", "amount": "100", "asset": "USDC"}},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			b, _ := json.Marshal(tc.payload)
			req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(b))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Fatalf("[%s] expected 400, got %d", tc.name, w.Code)
			}
			var errResp domain.ErrorResponse
			_ = json.Unmarshal(w.Body.Bytes(), &errResp)
			if errResp.Error.Code != "VALIDATION_FAILED" {
				t.Errorf("[%s] expected VALIDATION_FAILED, got %s", tc.name, errResp.Error.Code)
			}
		})
	}
}

// 6. Rust returns invalid JSON -> gateway handles error safely (503)
func TestAuthorize_RustInvalidJSON(t *testing.T) {
	mock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{}, policy.ErrInvalidResponse
		},
	}

	router := setupTestRouter(mock, 1048576)
	b, _ := json.Marshal(validPayload("req_inv_json"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(b))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 Service Unavailable, got %d", w.Code)
	}
	var errResp domain.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &errResp)
	if errResp.Error.Code != "POLICY_ENGINE_INVALID_RESPONSE" {
		t.Errorf("expected POLICY_ENGINE_INVALID_RESPONSE, got %s", errResp.Error.Code)
	}
}

// 7. Rust returns 500 -> gateway returns 503
// 8. Rust unavailable -> 503
func TestAuthorize_RustUnavailable(t *testing.T) {
	mock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{}, policy.ErrUnavailable
		},
	}

	router := setupTestRouter(mock, 1048576)
	b, _ := json.Marshal(validPayload("req_unavail"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(b))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 Service Unavailable, got %d", w.Code)
	}
	var errResp domain.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &errResp)
	if errResp.Error.Code != "POLICY_ENGINE_UNAVAILABLE" {
		t.Errorf("expected POLICY_ENGINE_UNAVAILABLE, got %s", errResp.Error.Code)
	}
}

// 9. Rust timeout -> 504
func TestAuthorize_RustTimeout(t *testing.T) {
	mock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{}, policy.ErrTimeout
		},
	}

	router := setupTestRouter(mock, 1048576)
	b, _ := json.Marshal(validPayload("req_timeout"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(b))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusGatewayTimeout {
		t.Fatalf("expected 504 Gateway Timeout, got %d", w.Code)
	}
	var errResp domain.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &errResp)
	if errResp.Error.Code != "POLICY_ENGINE_TIMEOUT" {
		t.Errorf("expected POLICY_ENGINE_TIMEOUT, got %s", errResp.Error.Code)
	}
}

// 10. Request ID is propagated when supplied
// 11. Request ID is generated when absent
// 12. Request ID appears in response
func TestAuthorize_RequestID_Handling(t *testing.T) {
	var capturedReqID string
	mock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			capturedReqID = req.RequestID
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionAllow,
				ReasonCode: domain.ReasonApproved,
				Reason:     "Approved",
			}, nil
		},
	}

	router := setupTestRouter(mock, 1048576)

	// Case A: Client supplies request_id in payload
	{
		b, _ := json.Marshal(validPayload("custom_req_123"))
		req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(b))
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if capturedReqID != "custom_req_123" {
			t.Errorf("expected propagated request_id 'custom_req_123', got '%s'", capturedReqID)
		}
		if w.Header().Get("X-Request-ID") != "custom_req_123" {
			t.Errorf("expected X-Request-ID header 'custom_req_123', got '%s'", w.Header().Get("X-Request-ID"))
		}
		var resp domain.AuthorizationDecision
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		if resp.RequestID != "custom_req_123" {
			t.Errorf("expected response request_id 'custom_req_123', got '%s'", resp.RequestID)
		}
	}

	// Case B: Client does NOT supply request_id -> Gateway generates one
	{
		payload := validPayload("")
		b, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(b))
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if capturedReqID == "" || !strings.HasPrefix(capturedReqID, "req_") {
			t.Errorf("expected generated request_id with req_ prefix, got '%s'", capturedReqID)
		}
		if w.Header().Get("X-Request-ID") != capturedReqID {
			t.Errorf("expected matching X-Request-ID header, got '%s'", w.Header().Get("X-Request-ID"))
		}
		var resp domain.AuthorizationDecision
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		if resp.RequestID != capturedReqID {
			t.Errorf("expected response request_id '%s', got '%s'", capturedReqID, resp.RequestID)
		}
	}
}

// 13. Context cancellation is respected
func TestAuthorize_ContextCancellation(t *testing.T) {
	mock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			select {
			case <-ctx.Done():
				return domain.AuthorizationDecision{}, ctx.Err()
			case <-time.After(100 * time.Millisecond):
				return domain.AuthorizationDecision{Decision: domain.DecisionAllow}, nil
			}
		},
	}

	router := setupTestRouter(mock, 1048576)
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	b, _ := json.Marshal(validPayload("req_cancel"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(b)).WithContext(ctx)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	// Server should handle cancellation without crashing
}

// 14. Oversized request body is rejected (413 Request Entity Too Large or 400)
func TestAuthorize_OversizedRequestBody(t *testing.T) {
	mock := &mockPolicyClient{}
	// Set very small limit of 64 bytes
	router := setupTestRouter(mock, 64)

	hugePayload := strings.Repeat("A", 200)
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", strings.NewReader(hugePayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusRequestEntityTooLarge && w.Code != http.StatusBadRequest {
		t.Fatalf("expected 413 or 400 for oversized payload, got %d", w.Code)
	}
}

// 15. No sensitive information appears in error responses
func TestAuthorize_NoSensitiveInfoInErrors(t *testing.T) {
	mock := &mockPolicyClient{
		authorizeFn: func(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{}, errors.New("connection failed: postgres://user:secret_password@db.internal:5432")
		},
	}

	router := setupTestRouter(mock, 1048576)
	b, _ := json.Marshal(validPayload("req_sec"))
	req := httptest.NewRequest(http.MethodPost, "/v1/payments/authorize", bytes.NewReader(b))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	respStr := w.Body.String()
	sensitiveTerms := []string{"secret_password", "postgres://", "db.internal", "stack trace", "goroutine"}
	for _, term := range sensitiveTerms {
		if strings.Contains(respStr, term) {
			t.Errorf("response contains sensitive information '%s': %s", term, respStr)
		}
	}
}

// 16. Health endpoint works without Rust
func TestHealth_WorksWithoutRust(t *testing.T) {
	// mock with failing check health
	mock := &mockPolicyClient{
		checkHealthFn: func(ctx context.Context) error {
			return errors.New("rust dead")
		},
	}

	router := setupTestRouter(mock, 1048576)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for /health regardless of Rust status, got %d", w.Code)
	}

	var resp map[string]string
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["status"] != "ok" || resp["service"] != "gateway" {
		t.Errorf("unexpected health response: %v", resp)
	}
}

// 17. Readiness behavior is correct (200 when ok, 503 when degraded)
func TestReadiness(t *testing.T) {
	// Case A: Rust healthy -> 200
	{
		mock := &mockPolicyClient{
			checkHealthFn: func(ctx context.Context) error {
				return nil
			},
		}
		router := setupTestRouter(mock, 1048576)
		req := httptest.NewRequest(http.MethodGet, "/ready", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 OK when ready, got %d", w.Code)
		}
		var resp handlers.ReadyResponse
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		if resp.Status != "ready" || resp.Dependencies["policy_engine"] != "ok" {
			t.Errorf("unexpected ready response: %+v", resp)
		}
	}

	// Case B: Rust unavailable -> 503
	{
		mock := &mockPolicyClient{
			checkHealthFn: func(ctx context.Context) error {
				return errors.New("connection refused")
			},
		}
		router := setupTestRouter(mock, 1048576)
		req := httptest.NewRequest(http.MethodGet, "/ready", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503 Service Unavailable when degraded, got %d", w.Code)
		}
		var resp handlers.ReadyResponse
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		if resp.Status != "degraded" || resp.Dependencies["policy_engine"] != "unavailable" {
			t.Errorf("unexpected degraded response: %+v", resp)
		}
	}
}
