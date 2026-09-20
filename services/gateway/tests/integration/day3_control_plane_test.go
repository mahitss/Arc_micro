package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func TestIntegration_Day3ControlPlane(t *testing.T) {
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
	router := gwHttp.NewRouter(cfg, pClient, nil, nil, intentSvc, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// 1. Test Treasury Summary API: GET /v1/treasury/summary
	resp, err := http.Get(server.URL + "/v1/treasury/summary?organization_id=org_default&vault=0x1111111111111111111111111111111111111111")
	if err != nil {
		t.Fatalf("failed to get treasury summary: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK from treasury summary, got: %d", resp.StatusCode)
	}

	var summary map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&summary); err != nil {
		t.Fatalf("failed to decode treasury summary: %v", err)
	}
	if summary["asset"] != "USDC" {
		t.Fatalf("expected asset USDC, got: %v", summary["asset"])
	}

	// 2. Test Global Execution Pause & Resume APIs
	// POST /v1/system/pause
	pauseBody := bytes.NewReader([]byte(`{"actor_id":"usr_admin"}`))
	resp, err = http.Post(server.URL+"/v1/system/pause", "application/json", pauseBody)
	if err != nil {
		t.Fatalf("failed to pause system: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK from system pause, got: %d", resp.StatusCode)
	}

	// Verify GET /v1/system/status reflects PAUSED
	statusResp, err := http.Get(server.URL + "/v1/system/status")
	if err != nil {
		t.Fatalf("failed to get system status: %v", err)
	}
	defer statusResp.Body.Close()
	var sysStatus map[string]interface{}
	_ = json.NewDecoder(statusResp.Body).Decode(&sysStatus)
	if sysStatus["global_execution"] != "PAUSED" {
		t.Fatalf("expected global_execution PAUSED, got: %v", sysStatus["global_execution"])
	}

	// Resume system: POST /v1/system/resume
	resumeBody := bytes.NewReader([]byte(`{"actor_id":"usr_admin"}`))
	resp, err = http.Post(server.URL+"/v1/system/resume", "application/json", resumeBody)
	if err != nil {
		t.Fatalf("failed to resume system: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK from system resume, got: %d", resp.StatusCode)
	}

	// 3. Test Approval API endpoints
	// Seed an intent requiring approval
	pi, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:      "research-agent",
		VaultAddress: "0x1111111111111111111111111111111111111111",
		ServiceID:    "compute-cluster",
		Amount:       "1500000",
		Asset:        "USDC",
		Purpose:      "approval_test",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}
	pi.Status = intent.StatusApprovalRequired
	pi.RequiresApproval = true
	_ = repo.UpdateIntentStatus(context.Background(), pi.IntentID, intent.StatusApprovalRequired, time.Now())

	appID := "appr_integration_test"
	now := time.Now()
	_ = repo.SaveApproval(context.Background(), &storage.Approval{
		ID:              appID,
		OrganizationID:  "org_default",
		PaymentIntentID: pi.IntentID,
		Required:        true,
		Status:          "PENDING",
		RequestedAt:     now,
		ExpiresAt:       now.Add(1 * time.Hour),
		CreatedAt:       now,
	})

	// GET /v1/approvals
	appResp, err := http.Get(server.URL + "/v1/approvals?organization_id=org_default")
	if err != nil {
		t.Fatalf("failed to list approvals: %v", err)
	}
	defer appResp.Body.Close()
	if appResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK from list approvals, got: %d", appResp.StatusCode)
	}

	// Self-Approval attempt by AI agent: MUST BE REJECTED with 403 Forbidden
	selfApprBody := bytes.NewReader([]byte(`{"approver_id":"research-agent","reason":"AI self-approving"}`))
	failResp, err := http.Post(server.URL+"/v1/approvals/"+appID+"/approve", "application/json", selfApprBody)
	if err != nil {
		t.Fatalf("failed to post approval: %v", err)
	}
	defer failResp.Body.Close()
	if failResp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden on AI self-approval, got: %d", failResp.StatusCode)
	}

	// Valid human approval: POST /v1/approvals/{id}/approve
	validApprBody := bytes.NewReader([]byte(`{"approver_id":"usr_compliance_manager","reason":"Approved after audit"}`))
	okResp, err := http.Post(server.URL+"/v1/approvals/"+appID+"/approve", "application/json", validApprBody)
	if err != nil {
		t.Fatalf("failed to post valid approval: %v", err)
	}
	defer okResp.Body.Close()
	if okResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK on valid approval, got: %d", okResp.StatusCode)
	}

	// Verify intent is now execution eligible
	confirmedPI, err := repo.GetIntent(context.Background(), pi.IntentID)
	if err != nil {
		t.Fatalf("failed to get intent: %v", err)
	}
	if confirmedPI.Status != intent.StatusApproved {
		t.Fatalf("expected intent status APPROVED, got: %s", confirmedPI.Status)
	}
}
