package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/trace"
)

func TestPaymentIntentsHandler_HandleGetTrace(t *testing.T) {
	repo := storage.NewMemoryRepository()
	ctx := context.Background()

	pi := &intent.PaymentIntent{
		IntentID:       "pi_trace_http_01",
		OrganizationID: "org_default",
		AgentID:        "agent_007",
		Recipient:      "0x1111111111111111111111111111111111111111",
		Amount:         "500000",
		Asset:          "USDC",
		Purpose:        "market_research",
		Status:         intent.StatusAuthorized,
		CreatedAt:      time.Now().UTC(),
		ExpiresAt:      time.Now().UTC().Add(time.Hour),
		UpdatedAt:      time.Now().UTC(),
	}
	_ = repo.SaveIntent(ctx, pi)

	traceSvc := trace.NewService(repo, "5042", "https://explorer.arc.market")
	intentSvc := intent.NewService(repo, nil, nil, nil, nil, time.Hour, false)

	handler := NewPaymentIntentsHandler(intentSvc)
	handler.SetTraceService(traceSvc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/payment-intents/{id}/trace", handler.HandleGetTrace)

	// 1. Success case
	req := httptest.NewRequest("GET", "/v1/payment-intents/pi_trace_http_01/trace", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rr.Code, rr.Body.String())
	}

	var trc domain.PaymentTrace
	if err := json.Unmarshal(rr.Body.Bytes(), &trc); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if trc.PaymentIntentID != "pi_trace_http_01" {
		t.Errorf("expected intent ID pi_trace_http_01, got %s", trc.PaymentIntentID)
	}
	if len(trc.Steps) == 0 {
		t.Errorf("expected trace steps, got none")
	}

	// 2. Not found case
	req404 := httptest.NewRequest("GET", "/v1/payment-intents/non_existent/trace", nil)
	rr404 := httptest.NewRecorder()
	mux.ServeHTTP(rr404, req404)

	if rr404.Code != http.StatusNotFound {
		t.Fatalf("expected 404 Not Found, got %d", rr404.Code)
	}
}
