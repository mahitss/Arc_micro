package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/auth"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func TestIntegration_Day5DeveloperPlatform(t *testing.T) {
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

	// 1. Create API key for Organization A
	secretA, keyA, err := auth.GenerateAPIKey("org_A", "Org A Live Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
		domain.ScopeAgentsRead,
		domain.ScopeServicesRead,
	})
	if err != nil {
		t.Fatalf("failed to generate key A: %v", err)
	}
	storageKeyA := &storage.APIKey{
		ID:             keyA.ID,
		OrganizationID: keyA.OrganizationID,
		KeyHash:        keyA.KeyHash,
		Name:           keyA.Name,
		MaskedKey:      keyA.MaskedKey,
		Scopes:         "payments:read,payments:create,agents:read,services:read",
		Status:         string(keyA.Status),
		CreatedAt:      keyA.CreatedAt,
		UpdatedAt:      keyA.CreatedAt,
	}
	if err := repo.SaveAPIKey(context.Background(), storageKeyA); err != nil {
		t.Fatalf("failed to save key A: %v", err)
	}

	// Create API key for Organization B
	secretB, keyB, err := auth.GenerateAPIKey("org_B", "Org B Live Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
		domain.ScopeAgentsRead,
		domain.ScopeServicesRead,
	})
	if err != nil {
		t.Fatalf("failed to generate key B: %v", err)
	}
	storageKeyB := &storage.APIKey{
		ID:             keyB.ID,
		OrganizationID: keyB.OrganizationID,
		KeyHash:        keyB.KeyHash,
		Name:           keyB.Name,
		MaskedKey:      keyB.MaskedKey,
		Scopes:         "payments:read,payments:create,agents:read,services:read",
		Status:         string(keyB.Status),
		CreatedAt:      keyB.CreatedAt,
		UpdatedAt:      keyB.CreatedAt,
	}
	if err := repo.SaveAPIKey(context.Background(), storageKeyB); err != nil {
		t.Fatalf("failed to save key B: %v", err)
	}

	// 2. Test Authentication Middleware with Valid Key A
	req, _ := http.NewRequest("GET", server.URL+"/v1/payment-intents", nil)
	req.Header.Set("Authorization", "Bearer "+secretA)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("failed GET /v1/payment-intents with key A: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK with valid key A, got: %d", resp.StatusCode)
	}
	resp.Body.Close()

	// 3. Test Authentication Middleware with Invalid Key
	reqBad, _ := http.NewRequest("GET", server.URL+"/v1/payment-intents", nil)
	reqBad.Header.Set("Authorization", "Bearer ap_live_invalidkey1234567890abcdef1234567890abcdef")
	respBad, err := http.DefaultClient.Do(reqBad)
	if err != nil {
		t.Fatalf("failed request with invalid key: %v", err)
	}
	if respBad.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for bad key, got: %d", respBad.StatusCode)
	}
	var errResp map[string]map[string]interface{}
	_ = json.NewDecoder(respBad.Body).Decode(&errResp)
	respBad.Body.Close()
	if errResp["error"]["code"] != "UNAUTHORIZED" {
		t.Fatalf("expected UNAUTHORIZED error code, got: %v", errResp["error"]["code"])
	}

	// 4. Test Revoked Key Rejection
	_ = repo.RevokeAPIKey(context.Background(), keyA.ID, "org_A", time.Now().UTC())
	reqRevoked, _ := http.NewRequest("GET", server.URL+"/v1/payment-intents", nil)
	reqRevoked.Header.Set("Authorization", "Bearer "+secretA)
	respRevoked, err := http.DefaultClient.Do(reqRevoked)
	if err != nil {
		t.Fatalf("failed request with revoked key: %v", err)
	}
	if respRevoked.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for revoked key, got: %d", respRevoked.StatusCode)
	}
	respRevoked.Body.Close()

	// Un-revoke keyA for subsequent tests
	storageKeyA.Status = "ACTIVE"
	_ = repo.SaveAPIKey(context.Background(), storageKeyA)

	// 5. Test Payment Intent Creation (POST /v1/payment-intents) with Idempotency Key
	idempotencyKey := "req_idem_unique_test_123"
	payload := []byte(`{
		"agent_id": "agent_research",
		"service": "research-api",
		"amount": "12000000",
		"asset": "USDC",
		"purpose": "Research report"
	}`)

	reqCreate, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewReader(payload))
	reqCreate.Header.Set("Authorization", "Bearer "+secretA)
	reqCreate.Header.Set("Idempotency-Key", idempotencyKey)
	reqCreate.Header.Set("Content-Type", "application/json")
	respCreate, err := http.DefaultClient.Do(reqCreate)
	if err != nil {
		t.Fatalf("failed POST /v1/payment-intents: %v", err)
	}
	if respCreate.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created from POST /v1/payment-intents, got: %d", respCreate.StatusCode)
	}
	var createdIntent map[string]interface{}
	_ = json.NewDecoder(respCreate.Body).Decode(&createdIntent)
	respCreate.Body.Close()

	intentIDA, ok := createdIntent["id"].(string)
	if !ok || intentIDA == "" {
		t.Fatalf("expected non-empty intent id in response, got: %v", createdIntent)
	}
	if createdIntent["service"] != "research-api" {
		t.Fatalf("expected service research-api, got: %v", createdIntent["service"])
	}
	// Server resolved recipient
	if createdIntent["recipient"] == "" {
		t.Fatalf("expected server-resolved recipient, got empty")
	}

	// 6. Test Idempotency: Repeated request with same Idempotency-Key returns same intent ID
	reqRepeat, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewReader(payload))
	reqRepeat.Header.Set("Authorization", "Bearer "+secretA)
	reqRepeat.Header.Set("Idempotency-Key", idempotencyKey)
	reqRepeat.Header.Set("Content-Type", "application/json")
	respRepeat, err := http.DefaultClient.Do(reqRepeat)
	if err != nil {
		t.Fatalf("failed repeat POST /v1/payment-intents: %v", err)
	}
	var repeatedIntent map[string]interface{}
	_ = json.NewDecoder(respRepeat.Body).Decode(&repeatedIntent)
	respRepeat.Body.Close()

	if repeatedIntent["id"] != intentIDA {
		t.Fatalf("idempotency failed: expected intent ID %s, got %s", intentIDA, repeatedIntent["id"])
	}

	// 7. Test Organization Isolation:
	// Org B must NOT be able to access Org A's payment intent
	reqCrossOrgGet, _ := http.NewRequest("GET", fmt.Sprintf("%s/v1/payment-intents/%s", server.URL, intentIDA), nil)
	reqCrossOrgGet.Header.Set("Authorization", "Bearer "+secretB)
	respCrossOrgGet, err := http.DefaultClient.Do(reqCrossOrgGet)
	if err != nil {
		t.Fatalf("failed cross-org GET /v1/payment-intents/{id}: %v", err)
	}
	if respCrossOrgGet.StatusCode != http.StatusNotFound {
		t.Fatalf("tenant isolation breach! Expected 404 Not Found for Org B accessing Org A intent, got: %d", respCrossOrgGet.StatusCode)
	}
	respCrossOrgGet.Body.Close()

	// Org B listing payment intents must NOT show Org A's intent
	reqListB, _ := http.NewRequest("GET", server.URL+"/v1/payment-intents", nil)
	reqListB.Header.Set("Authorization", "Bearer "+secretB)
	respListB, err := http.DefaultClient.Do(reqListB)
	if err != nil {
		t.Fatalf("failed Org B GET /v1/payment-intents: %v", err)
	}
	var listBResp map[string][]map[string]interface{}
	_ = json.NewDecoder(respListB.Body).Decode(&listBResp)
	respListB.Body.Close()

	for _, pi := range listBResp["payment_intents"] {
		if pi["intent_id"] == intentIDA || pi["id"] == intentIDA {
			t.Fatalf("tenant isolation breach! Org A intent %s appeared in Org B list", intentIDA)
		}
	}

	// 8. Test Concurrent Idempotent Requests
	var wg sync.WaitGroup
	concurrentKey := "req_concurrent_test_456"
	results := make([]string, 5)
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			r, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewReader(payload))
			r.Header.Set("Authorization", "Bearer "+secretA)
			r.Header.Set("Idempotency-Key", concurrentKey)
			r.Header.Set("Content-Type", "application/json")
			res, err := http.DefaultClient.Do(r)
			if err != nil {
				return
			}
			defer res.Body.Close()
			var data map[string]interface{}
			_ = json.NewDecoder(res.Body).Decode(&data)
			if id, ok := data["id"].(string); ok {
				results[idx] = id
			}
		}(i)
	}
	wg.Wait()

	firstID := results[0]
	if firstID == "" {
		t.Fatalf("expected non-empty ID from concurrent idempotency test")
	}
	for i, id := range results {
		if id != firstID {
			t.Fatalf("concurrent idempotency mismatch at index %d: %s vs %s", i, id, firstID)
		}
	}
}
