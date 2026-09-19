package policy

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

func TestPolicyClient_Authorize_Success_Allow(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/authorize" {
			t.Errorf("expected path /v1/authorize, got %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected application/json, got %s", r.Header.Get("Content-Type"))
		}

		resp := domain.AuthorizationDecision{
			RequestID:  "req_test_123",
			Decision:   domain.DecisionAllow,
			ReasonCode: domain.ReasonApproved,
			Reason:     "Payment satisfies the configured policy.",
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer ts.Close()

	client := NewClient(ts.URL, 2*time.Second)
	req := domain.PaymentRequest{
		RequestID: "req_test_123",
		AgentID:   "research-agent",
		Recipient: "0x1111111111111111111111111111111111111111",
		Amount:    "100000",
		Asset:     "USDC",
		Purpose:   "compute",
	}

	decision, err := client.Authorize(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if decision.Decision != domain.DecisionAllow {
		t.Errorf("expected ALLOW, got %s", decision.Decision)
	}
	if decision.ReasonCode != domain.ReasonApproved {
		t.Errorf("expected APPROVED, got %s", decision.ReasonCode)
	}
	if decision.RequestID != "req_test_123" {
		t.Errorf("expected req_test_123, got %s", decision.RequestID)
	}
}

func TestPolicyClient_Authorize_Success_Deny(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := domain.AuthorizationDecision{
			RequestID:  "req_test_deny",
			Decision:   domain.DecisionDeny,
			ReasonCode: domain.ReasonDailyLimitExceeded,
			Reason:     "Payment would exceed the agent daily spending limit.",
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer ts.Close()

	client := NewClient(ts.URL, 2*time.Second)
	req := domain.PaymentRequest{
		RequestID: "req_test_deny",
		AgentID:   "research-agent",
		Recipient: "0x1111111111111111111111111111111111111111",
		Amount:    "999999999",
		Asset:     "USDC",
		Purpose:   "compute",
	}

	decision, err := client.Authorize(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if decision.Decision != domain.DecisionDeny {
		t.Errorf("expected DENY, got %s", decision.Decision)
	}
	if decision.ReasonCode != domain.ReasonDailyLimitExceeded {
		t.Errorf("expected DAILY_LIMIT_EXCEEDED, got %s", decision.ReasonCode)
	}
}

func TestPolicyClient_Authorize_Timeout(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	// Set short timeout of 20ms
	client := NewClient(ts.URL, 20*time.Millisecond)
	req := domain.PaymentRequest{
		RequestID: "req_timeout",
		AgentID:   "research-agent",
	}

	_, err := client.Authorize(context.Background(), req)
	if !errors.Is(err, ErrTimeout) {
		t.Fatalf("expected ErrTimeout, got %v", err)
	}
}

func TestPolicyClient_Authorize_RustUnavailable(t *testing.T) {
	// Point to non-existent server
	client := NewClient("http://127.0.0.1:54321", 500*time.Millisecond)
	req := domain.PaymentRequest{
		RequestID: "req_unavail",
		AgentID:   "research-agent",
	}

	_, err := client.Authorize(context.Background(), req)
	if !errors.Is(err, ErrUnavailable) {
		t.Fatalf("expected ErrUnavailable, got %v", err)
	}
}

func TestPolicyClient_Authorize_Rust500(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "internal rust error", http.StatusInternalServerError)
	}))
	defer ts.Close()

	client := NewClient(ts.URL, 1*time.Second)
	req := domain.PaymentRequest{
		RequestID: "req_500",
		AgentID:   "research-agent",
	}

	_, err := client.Authorize(context.Background(), req)
	if !errors.Is(err, ErrUnavailable) {
		t.Fatalf("expected ErrUnavailable for 500 status, got %v", err)
	}
}

func TestPolicyClient_Authorize_MalformedJSON(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{not valid json`))
	}))
	defer ts.Close()

	client := NewClient(ts.URL, 1*time.Second)
	req := domain.PaymentRequest{
		RequestID: "req_malformed",
		AgentID:   "research-agent",
	}

	_, err := client.Authorize(context.Background(), req)
	if !errors.Is(err, ErrInvalidResponse) {
		t.Fatalf("expected ErrInvalidResponse for bad JSON, got %v", err)
	}
}

func TestPolicyClient_CheckHealth(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"ok"}`))
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	client := NewClient(ts.URL, 1*time.Second)
	if err := client.CheckHealth(context.Background()); err != nil {
		t.Fatalf("expected healthy, got error: %v", err)
	}

	unavailClient := NewClient("http://127.0.0.1:54321", 200*time.Millisecond)
	if err := unavailClient.CheckHealth(context.Background()); err == nil {
		t.Fatalf("expected error for unavailable client, got nil")
	}
}
