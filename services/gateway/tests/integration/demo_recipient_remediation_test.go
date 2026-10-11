package integration_test

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
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// MockPolicyEngineServer simulates the deterministic policy engine with Finding 1 demo allowlist semantics.
type MockPolicyEngineServer struct {
	server *httptest.Server
}

func newMockPolicyEngineServer() *MockPolicyEngineServer {
	allowedRecipients := map[string]bool{
		"0x71c678d311516474809e39842c12f44b20a32508": true,
		"0x2546bcd3279c0b1060285661688744d9f7518777": true,
		"0x1111111111111111111111111111111111111111": true, // Seeded web-research recipient
	}
	blockedRecipients := map[string]bool{
		"0xdead000000000000000000000000000000000000": true,
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"status":"ok","service":"policy-engine"}`))
			return
		}
		if r.URL.Path == "/v1/authorize" && r.Method == http.MethodPost {
			var req domain.PaymentRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}

			w.Header().Set("Content-Type", "application/json")

			// Recipient blacklist check
			if blockedRecipients[req.Recipient] {
				_ = json.NewEncoder(w).Encode(domain.AuthorizationDecision{
					RequestID:  req.RequestID,
					Decision:   domain.DecisionDeny,
					ReasonCode: domain.ReasonRecipientBlocked,
					Reason:     "Recipient is blocked by policy.",
				})
				return
			}

			// Recipient allowlist check
			if !allowedRecipients[req.Recipient] {
				_ = json.NewEncoder(w).Encode(domain.AuthorizationDecision{
					RequestID:  req.RequestID,
					Decision:   domain.DecisionDeny,
					ReasonCode: domain.ReasonRecipientNotAllowed,
					Reason:     "Recipient is not in the allowlist.",
				})
				return
			}

			// Approved
			_ = json.NewEncoder(w).Encode(domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionAllow,
				ReasonCode: domain.ReasonApproved,
				Reason:     "Payment satisfies the configured demo policy.",
			})
			return
		}

		http.NotFound(w, r)
	})

	return &MockPolicyEngineServer{
		server: httptest.NewServer(handler),
	}
}

// TestFinding1_DemoRecipientAlignment verifies remediation of Finding 1:
// - Intended demo recipient (0x1111...) receives DecisionAllow / ReasonApproved
// - Blacklisted recipient (0xdead...) receives DecisionDeny / ReasonRecipientBlocked
// - Non-allowlisted recipient (0x9999...) receives DecisionDeny / ReasonRecipientNotAllowed
// - Seeded web-research service completes its authorized payment intent workflow
func TestFinding1_DemoRecipientAlignment(t *testing.T) {
	mockPE := newMockPolicyEngineServer()
	defer mockPE.server.Close()

	ctx := context.Background()
	policyClient := policy.NewClient(mockPE.server.URL, 2*time.Second)

	// 1. Direct authorization check: Intended demo recipient receives ALLOW
	t.Run("Intended demo recipient 0x1111... receives ALLOW", func(t *testing.T) {
		req := domain.PaymentRequest{
			RequestID: "req_f1_demo_allow",
			AgentID:   "research-agent",
			Recipient: "0x1111111111111111111111111111111111111111",
			Amount:    "250000",
			Asset:     "USDC",
			Purpose:   "web_search",
		}
		dec, err := policyClient.Authorize(ctx, req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if dec.Decision != domain.DecisionAllow {
			t.Fatalf("expected ALLOW for demo recipient, got: %s", dec.Decision)
		}
		if dec.ReasonCode != domain.ReasonApproved {
			t.Fatalf("expected APPROVED, got: %s", dec.ReasonCode)
		}
	})

	// 2. Blacklisted recipient is still denied
	t.Run("Blacklisted recipient is strictly denied with RECIPIENT_BLOCKED", func(t *testing.T) {
		req := domain.PaymentRequest{
			RequestID: "req_f1_blacklisted",
			AgentID:   "research-agent",
			Recipient: "0xdead000000000000000000000000000000000000",
			Amount:    "250000",
			Asset:     "USDC",
			Purpose:   "web_search",
		}
		dec, err := policyClient.Authorize(ctx, req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if dec.Decision != domain.DecisionDeny {
			t.Fatalf("expected DENY for blacklisted recipient, got: %s", dec.Decision)
		}
		if dec.ReasonCode != domain.ReasonRecipientBlocked {
			t.Fatalf("expected RECIPIENT_BLOCKED, got: %s", dec.ReasonCode)
		}
	})

	// 3. Non-allowlisted recipient is still denied
	t.Run("Non-allowlisted recipient is denied with RECIPIENT_NOT_ALLOWED", func(t *testing.T) {
		req := domain.PaymentRequest{
			RequestID: "req_f1_unallowlisted",
			AgentID:   "research-agent",
			Recipient: "0x9999999999999999999999999999999999999999",
			Amount:    "250000",
			Asset:     "USDC",
			Purpose:   "web_search",
		}
		dec, err := policyClient.Authorize(ctx, req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if dec.Decision != domain.DecisionDeny {
			t.Fatalf("expected DENY for unallowlisted recipient, got: %s", dec.Decision)
		}
		if dec.ReasonCode != domain.ReasonRecipientNotAllowed {
			t.Fatalf("expected RECIPIENT_NOT_ALLOWED, got: %s", dec.ReasonCode)
		}
	})

	// 4. End-to-end Gateway flow: POST /v1/payment-intents with seeded "web-research"
	t.Run("Seeded web-research service completes authorized payment intent", func(t *testing.T) {
		repo := storage.NewMemoryRepository()
		reg := registry.NewDefaultRegistry()
		intentSvc := intent.NewService(repo, policyClient, nil, reg, intent.RealClock{}, 300*time.Second, false)

		cfg := &config.Config{
			Environment:         "development",
			StorageMode:         "memory",
			EnableLiveExecution: false,
			BootstrapAPIKey:     "test_admin_key_f1",
			MaxRequestBodyBytes: 1048576,
		}

		router := gwHttp.NewRouter(cfg, policyClient, nil, nil, intentSvc, repo, reg)
		gwServer := httptest.NewServer(router)
		defer gwServer.Close()

		createReq := map[string]interface{}{
			"agent_id": "research-agent",
			"service":  "web-research",
			"amount":   "250000",
			"asset":    "USDC",
			"purpose":  "real-time web search intelligence",
		}
		bodyBytes, _ := json.Marshal(createReq)

		httpReq, _ := http.NewRequest(http.MethodPost, gwServer.URL+"/v1/payment-intents", bytes.NewReader(bodyBytes))
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer test_admin_key_f1")
		httpReq.Header.Set("Idempotency-Key", "idemp_f1_test_001")

		resp, err := http.DefaultClient.Do(httpReq)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			var errResp map[string]interface{}
			_ = json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("expected 201 Created, got: %d (%+v)", resp.StatusCode, errResp)
		}

		var createdIntent struct {
			ID        string `json:"id"`
			Status    string `json:"status"`
			Recipient string `json:"recipient"`
			Decision  *struct {
				Result string `json:"result"`
				Reason string `json:"reason"`
			} `json:"decision"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&createdIntent); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		// Recipient must match the authoritative registry address
		if createdIntent.Recipient != "0x1111111111111111111111111111111111111111" {
			t.Fatalf("expected recipient 0x1111..., got: %s", createdIntent.Recipient)
		}
		// Intent status should be AUTHORIZED (since policy allows 0x1111...)
		if createdIntent.Status != "AUTHORIZED" {
			t.Fatalf("expected status AUTHORIZED, got: %s", createdIntent.Status)
		}
		if createdIntent.Decision == nil || createdIntent.Decision.Result != "ALLOW" {
			t.Fatalf("expected policy decision ALLOW, got: %+v", createdIntent.Decision)
		}
	})
}
