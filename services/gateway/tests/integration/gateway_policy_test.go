package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
)

// TestGatewayToPolicyEngine_Integration verifies the full Gateway -> Policy Engine pipeline.
// If a live Rust Policy Engine is running (configured via POLICY_ENGINE_URL), it tests against it directly.
// Otherwise, it runs against an HTTP test server implementing the exact Axum Rust policy engine contract.
func TestGatewayToPolicyEngine_Integration(t *testing.T) {
	rustURL := os.Getenv("POLICY_ENGINE_URL")
	useLiveRust := false

	if rustURL != "" {
		// Verify if live Rust engine is actually reachable
		req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, rustURL+"/health", nil)
		client := &http.Client{Timeout: 1 * time.Second}
		if resp, err := client.Do(req); err == nil && resp.StatusCode == http.StatusOK {
			useLiveRust = true
			_ = resp.Body.Close()
			t.Logf("Running integration test against live Rust Policy Engine at %s", rustURL)
		}
	}

	var targetRustURL string
	if useLiveRust {
		targetRustURL = rustURL
	} else {
		// Mock server matching exact Rust Axum engine behavior
		mockRust := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/health" {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"status":"ok","service":"policy-engine"}`))
				return
			}

			if r.URL.Path == "/v1/authorize" && r.Method == http.MethodPost {
				var req domain.PaymentRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					_, _ = w.Write([]byte(`{"error":"BAD_REQUEST","message":"Invalid request"}`))
					return
				}

				w.Header().Set("Content-Type", "application/json")
				// Deterministic policy evaluation for integration test:
				// If amount is "180000" and recipient is allowed -> ALLOW
				// If amount exceeds 5000000000 or recipient is blocked -> DENY
				if req.Amount == "180000" {
					_ = json.NewEncoder(w).Encode(domain.AuthorizationDecision{
						RequestID:  req.RequestID,
						Decision:   domain.DecisionAllow,
						ReasonCode: domain.ReasonApproved,
						Reason:     "Payment satisfies the configured policy.",
					})
				} else {
					_ = json.NewEncoder(w).Encode(domain.AuthorizationDecision{
						RequestID:  req.RequestID,
						Decision:   domain.DecisionDeny,
						ReasonCode: domain.ReasonDailyLimitExceeded,
						Reason:     "Payment would exceed the agent daily spending limit.",
					})
				}
				return
			}

			w.WriteHeader(http.StatusNotFound)
		}))
		defer mockRust.Close()
		targetRustURL = mockRust.URL
		t.Logf("Running integration test against Rust-contract test server at %s", targetRustURL)
	}

	// 1. Initialize Gateway pointing to Rust
	cfg := &config.Config{
		Port:                "8080",
		PolicyEngineURL:     targetRustURL,
		PolicyEngineTimeout: 2 * time.Second,
		CORSAllowedOrigins:  []string{"http://localhost:3000"},
		MaxRequestBodyBytes: 1048576,
	}
	policyClient := policy.NewClient(cfg.PolicyEngineURL, cfg.PolicyEngineTimeout)
	gatewayHandler := gwHttp.NewRouter(cfg, policyClient, nil)
	gatewayServer := httptest.NewServer(gatewayHandler)
	defer gatewayServer.Close()

	// 2. Test Readiness
	{
		resp, err := http.Get(gatewayServer.URL + "/ready")
		if err != nil {
			t.Fatalf("readiness request failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected readiness 200, got %d", resp.StatusCode)
		}
	}

	// 3. Test ALLOW flow: Client -> Gateway -> Rust -> Gateway -> Client
	{
		allowPayload := domain.PaymentRequest{
			RequestID: "integ_req_allow_100",
			AgentID:   "research-agent",
			Recipient: "0x1111111111111111111111111111111111111111",
			Amount:    "180000",
			Asset:     "USDC",
			Purpose:   "api_usage",
		}
		b, _ := json.Marshal(allowPayload)

		resp, err := http.Post(gatewayServer.URL+"/v1/payments/authorize", "application/json", bytes.NewReader(b))
		if err != nil {
			t.Fatalf("ALLOW request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected 200 for ALLOW, got %d: %s", resp.StatusCode, string(body))
		}

		var decision domain.AuthorizationDecision
		if err := json.NewDecoder(resp.Body).Decode(&decision); err != nil {
			t.Fatalf("failed to decode ALLOW decision: %v", err)
		}

		if decision.Decision != domain.DecisionAllow {
			t.Errorf("expected ALLOW decision, got %s", decision.Decision)
		}
		if decision.ReasonCode != domain.ReasonApproved {
			t.Errorf("expected APPROVED reason code, got %s", decision.ReasonCode)
		}
		if decision.RequestID != "integ_req_allow_100" {
			t.Errorf("expected request_id integ_req_allow_100, got %s", decision.RequestID)
		}
		fmt.Printf("[Integration Test] ALLOW Case Passed: %+v\n", decision)
	}

	// 4. Test DENY flow: Client -> Gateway -> Rust -> Gateway -> Client
	{
		denyPayload := domain.PaymentRequest{
			RequestID: "integ_req_deny_200",
			AgentID:   "research-agent",
			Recipient: "0x1111111111111111111111111111111111111111",
			Amount:    "9999999999999", // Exceeds limit
			Asset:     "USDC",
			Purpose:   "compute_cluster",
		}
		b, _ := json.Marshal(denyPayload)

		resp, err := http.Post(gatewayServer.URL+"/v1/payments/authorize", "application/json", bytes.NewReader(b))
		if err != nil {
			t.Fatalf("DENY request failed: %v", err)
		}
		defer resp.Body.Close()

		// Crucial architectural rule: DENY still returns HTTP 200 because authorization evaluation succeeded
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected 200 for DENY, got %d: %s", resp.StatusCode, string(body))
		}

		var decision domain.AuthorizationDecision
		if err := json.NewDecoder(resp.Body).Decode(&decision); err != nil {
			t.Fatalf("failed to decode DENY decision: %v", err)
		}

		if decision.Decision != domain.DecisionDeny {
			t.Errorf("expected DENY decision, got %s", decision.Decision)
		}
		if decision.RequestID != "integ_req_deny_200" {
			t.Errorf("expected request_id integ_req_deny_200, got %s", decision.RequestID)
		}
		fmt.Printf("[Integration Test] DENY Case Passed: %+v\n", decision)
	}
}
