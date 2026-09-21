package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/adversarial"
)

func TestSecurityLabHandler_GetAndRun(t *testing.T) {
	runner := adversarial.NewLabRunner()
	handler := NewSecurityLabHandler(runner)

	// 1. GET /v1/security-lab/report
	req := httptest.NewRequest("GET", "/v1/security-lab/report", nil)
	w := httptest.NewRecorder()
	handler.HandleGetReport(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	var rep adversarial.SecurityLabReport
	if err := json.NewDecoder(w.Body).Decode(&rep); err != nil {
		t.Fatalf("failed decoding report: %v", err)
	}

	if rep.TotalScenarios != 20 {
		t.Fatalf("expected 20 scenarios, got %d", rep.TotalScenarios)
	}
	if rep.PassedScenarios != 20 {
		t.Fatalf("expected 20 passed scenarios, got %d", rep.PassedScenarios)
	}
	if rep.InvariantsVerified != 12 {
		t.Fatalf("expected 12 verified invariants, got %d", rep.InvariantsVerified)
	}

	// 2. POST /v1/security-lab/run
	reqRun := httptest.NewRequest("POST", "/v1/security-lab/run", nil)
	wRun := httptest.NewRecorder()
	handler.HandleRunSuite(wRun, reqRun)

	if wRun.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on run, got %d", wRun.Code)
	}

	var repRun adversarial.SecurityLabReport
	if err := json.NewDecoder(wRun.Body).Decode(&repRun); err != nil {
		t.Fatalf("failed decoding run report: %v", err)
	}

	if repRun.PassedScenarios != 20 {
		t.Fatalf("expected 20 passed scenarios on run, got %d", repRun.PassedScenarios)
	}
}
