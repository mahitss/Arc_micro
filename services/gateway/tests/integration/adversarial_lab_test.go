package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/adversarial"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// TestAdversarialSecurityLab_All20Scenarios runs the complete Day 7 Adversarial Agent Lab suite.
func TestAdversarialSecurityLab_All20Scenarios(t *testing.T) {
	runner := adversarial.NewLabRunner()
	ctx := context.Background()

	report := runner.RunAll(ctx)

	t.Logf("=== Adversarial Agent Lab Report ===")
	t.Logf("Generated at: %s", report.GeneratedAt.Format(time.RFC3339))
	t.Logf("Scenarios: %d/%d PASSED", report.PassedScenarios, report.TotalScenarios)
	t.Logf("Invariants: %d/%d VERIFIED", report.InvariantsVerified, report.InvariantsTotal)

	if report.TotalScenarios != 20 {
		t.Fatalf("expected 20 scenarios, got %d", report.TotalScenarios)
	}

	for _, sc := range report.Scenarios {
		if sc.Status != adversarial.StatusPass {
			t.Errorf("[FAIL] Scenario %s: %s | Expected: %s | Actual: %s",
				sc.ID, sc.Name, sc.ExpectedBehavior, sc.ActualBehavior)
		} else {
			t.Logf("[PASS] %s: %s (%dms)", sc.ID, sc.Name, sc.ExecutionTimeMs)
		}
	}

	if report.PassedScenarios != 20 {
		t.Fatalf("expected all 20 scenarios to pass, got %d/20", report.PassedScenarios)
	}

	// Verify all 12 Core Financial Invariants
	if report.InvariantsTotal != 12 {
		t.Fatalf("expected 12 invariants, got %d", report.InvariantsTotal)
	}

	for _, inv := range report.Invariants {
		if inv.Status != adversarial.StatusPass {
			t.Errorf("[FAIL] Invariant %d: %s | Details: %s", inv.ID, inv.Description, inv.Details)
		} else {
			t.Logf("[PASS] Invariant %d: %s", inv.ID, inv.Description)
		}
	}

	if report.InvariantsVerified != 12 {
		t.Fatalf("expected all 12 invariants to be verified, got %d/12", report.InvariantsVerified)
	}
}

// TestAdversarialSecurityLab_HTTPEndpoints verifies GET /v1/security-lab/report and POST /v1/security-lab/run
func TestAdversarialSecurityLab_HTTPEndpoints(t *testing.T) {
	cfg := &config.Config{
		Port:                "8080",
		MaxRequestBodyBytes: 1048576,
		ArcChainID:          "5042",
	}
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	router := gwHttp.NewRouter(cfg, nil, nil, nil, nil, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// 1. GET report
	reqGet, _ := http.NewRequest("GET", server.URL+"/v1/security-lab/report", nil)
	respGet, err := http.DefaultClient.Do(reqGet)
	if err != nil {
		t.Fatalf("failed GET /v1/security-lab/report: %v", err)
	}
	defer respGet.Body.Close()

	if respGet.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", respGet.StatusCode)
	}

	var rep adversarial.SecurityLabReport
	if err := json.NewDecoder(respGet.Body).Decode(&rep); err != nil {
		t.Fatalf("failed decoding GET report: %v", err)
	}
	if rep.PassedScenarios != 20 {
		t.Fatalf("expected 20 passed scenarios in HTTP report, got %d", rep.PassedScenarios)
	}

	// 2. POST run
	reqRun, _ := http.NewRequest("POST", server.URL+"/v1/security-lab/run", nil)
	respRun, err := http.DefaultClient.Do(reqRun)
	if err != nil {
		t.Fatalf("failed POST /v1/security-lab/run: %v", err)
	}
	defer respRun.Body.Close()

	if respRun.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK on POST run, got %d", respRun.StatusCode)
	}

	var repRun adversarial.SecurityLabReport
	if err := json.NewDecoder(respRun.Body).Decode(&repRun); err != nil {
		t.Fatalf("failed decoding POST run report: %v", err)
	}
	if repRun.PassedScenarios != 20 {
		t.Fatalf("expected 20 passed scenarios on POST run, got %d", repRun.PassedScenarios)
	}
}
