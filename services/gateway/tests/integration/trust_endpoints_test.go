package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/auth"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/handlers"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/trust"
)

// TestTrustAndRedTeam_HTTPEndpoints verifies all Red-Team, Audit Chain, and Trust Engine HTTP routes.
func TestTrustAndRedTeam_HTTPEndpoints(t *testing.T) {
	cfg := &config.Config{
		Port:                "8080",
		MaxRequestBodyBytes: 1048576,
		ArcChainID:          "5042",
	}
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()

	// Seed test API key
	secret, key, err := auth.GenerateAPIKey("org_default", "Trust Engine Test Key", []string{domain.ScopeAdmin, "*"})
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	_ = repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             key.ID,
		OrganizationID: key.OrganizationID,
		KeyHash:        key.KeyHash,
		Name:           key.Name,
		MaskedKey:      key.MaskedKey,
		Scopes:         "admin,*",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	router := gwHttp.NewRouter(cfg, nil, nil, nil, nil, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// 1. GET /v1/redteam/report
	reqGet, _ := http.NewRequest("GET", server.URL+"/v1/redteam/report", nil)
	reqGet.Header.Set("Authorization", "Bearer "+secret)
	respGet, err := http.DefaultClient.Do(reqGet)
	if err != nil {
		t.Fatalf("failed GET /v1/redteam/report: %v", err)
	}
	defer respGet.Body.Close()

	if respGet.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for GET redteam report, got %d", respGet.StatusCode)
	}

	var report trust.RedTeamReport
	if err := json.NewDecoder(respGet.Body).Decode(&report); err != nil {
		t.Fatalf("failed decoding redteam report: %v", err)
	}
	if report.TotalScenarios != 9 || report.PassedScenarios != 9 {
		t.Errorf("Expected 9 passed scenarios, got total=%d, passed=%d", report.TotalScenarios, report.PassedScenarios)
	}

	// 2. POST /v1/redteam/run
	reqRun, _ := http.NewRequest("POST", server.URL+"/v1/redteam/run", nil)
	reqRun.Header.Set("Authorization", "Bearer "+secret)
	respRun, err := http.DefaultClient.Do(reqRun)
	if err != nil {
		t.Fatalf("failed POST /v1/redteam/run: %v", err)
	}
	defer respRun.Body.Close()

	if respRun.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for POST redteam run, got %d", respRun.StatusCode)
	}

	var reportRun trust.RedTeamReport
	if err := json.NewDecoder(respRun.Body).Decode(&reportRun); err != nil {
		t.Fatalf("failed decoding fresh redteam run report: %v", err)
	}
	if reportRun.PassedScenarios != 9 {
		t.Errorf("Expected 9 passed scenarios in fresh run, got %d", reportRun.PassedScenarios)
	}

	// 3. GET /v1/trust/audit-chain
	reqChain, _ := http.NewRequest("GET", server.URL+"/v1/trust/audit-chain", nil)
	reqChain.Header.Set("Authorization", "Bearer "+secret)
	respChain, err := http.DefaultClient.Do(reqChain)
	if err != nil {
		t.Fatalf("failed GET /v1/trust/audit-chain: %v", err)
	}
	defer respChain.Body.Close()

	if respChain.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for GET audit-chain, got %d", respChain.StatusCode)
	}

	var chainResp handlers.AuditChainResponse
	if err := json.NewDecoder(respChain.Body).Decode(&chainResp); err != nil {
		t.Fatalf("failed decoding audit chain response: %v", err)
	}
	if chainResp.TotalEvents == 0 {
		t.Errorf("Expected recorded events in audit chain after redteam runs, got 0")
	}
	if !chainResp.Verification.IsValid {
		t.Errorf("Expected audit chain verification to be valid, got failure: %s", chainResp.Verification.FailureReason)
	}

	// 4. POST /v1/trust/audit-chain/verify
	reqVerify, _ := http.NewRequest("POST", server.URL+"/v1/trust/audit-chain/verify", nil)
	reqVerify.Header.Set("Authorization", "Bearer "+secret)
	respVerify, err := http.DefaultClient.Do(reqVerify)
	if err != nil {
		t.Fatalf("failed POST /v1/trust/audit-chain/verify: %v", err)
	}
	defer respVerify.Body.Close()

	if respVerify.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for audit-chain verify, got %d", respVerify.StatusCode)
	}

	var verifResult trust.ChainVerificationResult
	if err := json.NewDecoder(respVerify.Body).Decode(&verifResult); err != nil {
		t.Fatalf("failed decoding verification result: %v", err)
	}
	if !verifResult.IsValid {
		t.Errorf("Expected verification result IsValid=true, got false: %s", verifResult.FailureReason)
	}

	// 5. GET /v1/trust/scores
	reqScores, _ := http.NewRequest("GET", server.URL+"/v1/trust/scores", nil)
	reqScores.Header.Set("Authorization", "Bearer "+secret)
	respScores, err := http.DefaultClient.Do(reqScores)
	if err != nil {
		t.Fatalf("failed GET /v1/trust/scores: %v", err)
	}
	defer respScores.Body.Close()

	if respScores.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for GET trust scores, got %d", respScores.StatusCode)
	}

	var scoresResp handlers.TrustScoresResponse
	if err := json.NewDecoder(respScores.Body).Decode(&scoresResp); err != nil {
		t.Fatalf("failed decoding trust scores response: %v", err)
	}
	if scoresResp.TotalEvaluated == 0 {
		t.Errorf("Expected evaluated scores, got 0")
	}

	// 6. GET /v1/trust/scores/{id} for brand new agent (must be UNKNOWN / UNVERIFIED, zero synthetic score)
	reqSingle, _ := http.NewRequest("GET", server.URL+"/v1/trust/scores/agent-never-seen-before", nil)
	reqSingle.Header.Set("Authorization", "Bearer "+secret)
	respSingle, err := http.DefaultClient.Do(reqSingle)
	if err != nil {
		t.Fatalf("failed GET /v1/trust/scores/{id}: %v", err)
	}
	defer respSingle.Body.Close()

	if respSingle.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for single agent trust score, got %d", respSingle.StatusCode)
	}

	var singleScore trust.AgentTrustScore
	if err := json.NewDecoder(respSingle.Body).Decode(&singleScore); err != nil {
		t.Fatalf("failed decoding single agent trust score: %v", err)
	}
	if singleScore.Confidence != trust.ConfidenceUnknown {
		t.Errorf("Expected ConfidenceUnknown for new agent, got %s", singleScore.Confidence)
	}
	if singleScore.ScoreBps != 5000 {
		t.Errorf("Expected neutral 5000 bps for new agent, got %d", singleScore.ScoreBps)
	}
	if singleScore.TrustTier != "UNVERIFIED" {
		t.Errorf("Expected UNVERIFIED tier for new agent, got %s", singleScore.TrustTier)
	}
}
