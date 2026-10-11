package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func TestFinding3_AdminCrossTenantErgonomics(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	mockPE := newMockPolicyEngineServer()
	defer mockPE.server.Close()

	policyClient := policy.NewClient(mockPE.server.URL, 2*time.Second)
	intentSvc := intent.NewService(repo, policyClient, nil, reg, intent.RealClock{}, 300*time.Second, false)

	cfg := &config.Config{
		Environment:         "development",
		StorageMode:         "memory",
		EnableLiveExecution: false,
		BootstrapAPIKey:     "admin_master_secret_key_f3",
		MaxRequestBodyBytes: 1048576,
	}

	router := gwHttp.NewRouter(cfg, policyClient, nil, nil, intentSvc, repo, reg)
	gwServer := httptest.NewServer(router)
	defer gwServer.Close()

	// Step 1: Admin creates an API key scoped to tenant-alpha
	createKeyPayload := map[string]interface{}{
		"organization_id": "tenant-alpha",
		"name":            "Tenant Alpha Service Key",
		"scopes":          []string{"intents:create", "intents:read"},
	}
	createBody, _ := json.Marshal(createKeyPayload)

	req, _ := http.NewRequest(http.MethodPost, gwServer.URL+"/v1/api-keys", bytes.NewReader(createBody))
	req.Header.Set("Authorization", "Bearer admin_master_secret_key_f3")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("create key request failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created, got: %d", resp.StatusCode)
	}

	var createdKey struct {
		ID     string `json:"id"`
		Secret string `json:"secret"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&createdKey)
	resp.Body.Close()
	targetKeyID := createdKey.ID

	// Step 2: Admin creates a key scoped to tenant-beta for non-admin isolation testing
	createBetaKeyPayload := map[string]interface{}{
		"organization_id": "tenant-beta",
		"name":            "Tenant Beta Key",
		"scopes":          []string{"intents:create", "intents:read", "apikeys:manage"},
	}
	betaBody, _ := json.Marshal(createBetaKeyPayload)
	reqBeta, _ := http.NewRequest(http.MethodPost, gwServer.URL+"/v1/api-keys", bytes.NewReader(betaBody))
	reqBeta.Header.Set("Authorization", "Bearer admin_master_secret_key_f3")
	reqBeta.Header.Set("Content-Type", "application/json")
	respBeta, err := http.DefaultClient.Do(reqBeta)
	if err != nil || respBeta.StatusCode != http.StatusCreated {
		t.Fatalf("failed to create tenant-beta key: %v", err)
	}
	var betaKey struct {
		ID     string `json:"id"`
		Secret string `json:"secret"`
	}
	_ = json.NewDecoder(respBeta.Body).Decode(&betaKey)
	respBeta.Body.Close()

	// Subtest 1: Admin attempts to revoke tenant-alpha key without specifying organization_id
	t.Run("Admin revoking without organization_id receives actionable ergonomic guidance", func(t *testing.T) {
		delReq, _ := http.NewRequest(http.MethodDelete, gwServer.URL+"/v1/api-keys/"+targetKeyID, nil)
		delReq.Header.Set("Authorization", "Bearer admin_master_secret_key_f3")
		delResp, err := http.DefaultClient.Do(delReq)
		if err != nil {
			t.Fatalf("revoke request failed: %v", err)
		}
		defer delResp.Body.Close()

		if delResp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found, got: %d", delResp.StatusCode)
		}

		var errPayload struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.NewDecoder(delResp.Body).Decode(&errPayload)

		if errPayload.Error.Code != "NOT_FOUND" {
			t.Errorf("expected error code NOT_FOUND, got: %s", errPayload.Error.Code)
		}
		if !strings.Contains(errPayload.Error.Message, "specify '?organization_id=<tenant_id>' or 'X-Organization-Id' header") {
			t.Errorf("expected guidance message, got: %s", errPayload.Error.Message)
		}
	})

	// Subtest 2: Non-admin caller receives standard opaque error without information disclosure
	t.Run("Non-admin caller attempting to revoke receives opaque NOT_FOUND", func(t *testing.T) {
		delReq, _ := http.NewRequest(http.MethodDelete, gwServer.URL+"/v1/api-keys/"+targetKeyID, nil)
		delReq.Header.Set("Authorization", "Bearer "+betaKey.Secret)
		delResp, err := http.DefaultClient.Do(delReq)
		if err != nil {
			t.Fatalf("revoke request failed: %v", err)
		}
		defer delResp.Body.Close()

		if delResp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found, got: %d", delResp.StatusCode)
		}

		var errPayload struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.NewDecoder(delResp.Body).Decode(&errPayload)

		if errPayload.Error.Message != "API key not found" {
			t.Errorf("expected opaque 'API key not found', got: %s", errPayload.Error.Message)
		}
	})

	// Subtest 3: Admin specifying explicit ?organization_id=tenant-alpha succeeds in revocation
	t.Run("Admin with explicit organization_id successfully revokes tenant key", func(t *testing.T) {
		delReq, _ := http.NewRequest(http.MethodDelete, gwServer.URL+"/v1/api-keys/"+targetKeyID+"?organization_id=tenant-alpha", nil)
		delReq.Header.Set("Authorization", "Bearer admin_master_secret_key_f3")
		delResp, err := http.DefaultClient.Do(delReq)
		if err != nil {
			t.Fatalf("revoke request failed: %v", err)
		}
		defer delResp.Body.Close()

		if delResp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got: %d", delResp.StatusCode)
		}
	})

	// Subtest 4: Payment intent cross-tenant retrieval ergonomics
	t.Run("Payment intent cross-tenant retrieval ergonomics", func(t *testing.T) {
		// Create intent under tenant-alpha directly in storage
		piID := "pi_ergonomics_test_001"
		now := time.Now().UTC()
		err := repo.SaveIntent(context.Background(), &intent.PaymentIntent{
			IntentID:       piID,
			OrganizationID: "tenant-alpha",
			AgentID:        "research-agent",
			VaultAddress:   "0x1111111111111111111111111111111111111111",
			Recipient:      "0x1111111111111111111111111111111111111111",
			ServiceID:      "web-research",
			Amount:         "100000",
			Asset:          "USDC",
			Purpose:        "market intelligence",
			Status:         intent.StatusCreated,
			CreatedAt:      now,
			ExpiresAt:      now.Add(10 * time.Minute),
			UpdatedAt:      now,
		})
		if err != nil {
			t.Fatalf("failed to seed intent: %v", err)
		}

		// Admin query WITHOUT organization_id -> receives guidance
		getReq, _ := http.NewRequest(http.MethodGet, gwServer.URL+"/v1/payment-intents/"+piID, nil)
		getReq.Header.Set("Authorization", "Bearer admin_master_secret_key_f3")
		getResp, err := http.DefaultClient.Do(getReq)
		if err != nil {
			t.Fatalf("get request failed: %v", err)
		}
		if getResp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found, got: %d", getResp.StatusCode)
		}
		var errPayload struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.NewDecoder(getResp.Body).Decode(&errPayload)
		getResp.Body.Close()

		if !strings.Contains(errPayload.Error.Message, "specify '?organization_id=<tenant_id>' or 'X-Organization-Id' header") {
			t.Errorf("expected guidance in error message, got: %s", errPayload.Error.Message)
		}

		// Admin query WITH organization_id -> succeeds
		getReqWithOrg, _ := http.NewRequest(http.MethodGet, gwServer.URL+"/v1/payment-intents/"+piID+"?organization_id=tenant-alpha", nil)
		getReqWithOrg.Header.Set("Authorization", "Bearer admin_master_secret_key_f3")
		getRespWithOrg, err := http.DefaultClient.Do(getReqWithOrg)
		if err != nil {
			t.Fatalf("get request failed: %v", err)
		}
		if getRespWithOrg.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got: %d", getRespWithOrg.StatusCode)
		}
		getRespWithOrg.Body.Close()

		// Non-admin query from tenant-beta -> receives opaque NOT_FOUND
		getBetaReq, _ := http.NewRequest(http.MethodGet, gwServer.URL+"/v1/payment-intents/"+piID, nil)
		getBetaReq.Header.Set("Authorization", "Bearer "+betaKey.Secret)
		getBetaResp, err := http.DefaultClient.Do(getBetaReq)
		if err != nil {
			t.Fatalf("get request failed: %v", err)
		}
		if getBetaResp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found, got: %d", getBetaResp.StatusCode)
		}
		var betaErrPayload struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.NewDecoder(getBetaResp.Body).Decode(&betaErrPayload)
		getBetaResp.Body.Close()

		if betaErrPayload.Error.Message != "Payment intent not found" {
			t.Errorf("expected opaque 'Payment intent not found' for tenant-beta, got: %s", betaErrPayload.Error.Message)
		}
	})
}
