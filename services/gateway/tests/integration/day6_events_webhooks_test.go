package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
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
	"github.com/arc-agentpay/agentpay/services/gateway/internal/webhook"
)

func TestIntegration_Day6EventsAndWebhooks(t *testing.T) {
	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      false,
		MaxRequestBodyBytes:     1048576,
		AllowLocalhostWebhooks:  true,
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := &mockIntegrationPolicyClient{}
	execSvc := &mockIntegrationExecutionService{}

	intentSvc := intent.NewService(repo, pClient, execSvc, reg, nil, 5*time.Minute, false)

	// In test environment, create dispatcher with AllowLocalhost=true so httptest receiver works
	testValidator := webhook.NewSSRFValidator(true)
	testDispatcher := webhook.NewDispatcher(repo, testValidator, nil)
	intentSvc.SetEventDispatcher(testDispatcher)

	router := gwHttp.NewRouter(cfg, pClient, nil, nil, intentSvc, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// 1. Set up test API keys for Org A and Org B
	secretA, keyA, err := auth.GenerateAPIKey("org_A", "Org A Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
		domain.ScopePaymentsApprove,
	})
	if err != nil {
		t.Fatalf("failed to generate key A: %v", err)
	}
	_ = repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             keyA.ID,
		OrganizationID: keyA.OrganizationID,
		KeyHash:        keyA.KeyHash,
		Name:           keyA.Name,
		MaskedKey:      keyA.MaskedKey,
		Scopes:         "payments:read,payments:create,payments:approve",
		Status:         "ACTIVE",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	secretB, keyB, err := auth.GenerateAPIKey("org_B", "Org B Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
	})
	if err != nil {
		t.Fatalf("failed to generate key B: %v", err)
	}
	_ = repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             keyB.ID,
		OrganizationID: keyB.OrganizationID,
		KeyHash:        keyB.KeyHash,
		Name:           keyB.Name,
		MaskedKey:      keyB.MaskedKey,
		Scopes:         "payments:read,payments:create",
		Status:         "ACTIVE",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	// Seed agents and policies for Org A
	_ = repo.SaveAgent(context.Background(), &storage.Agent{
		ID:             "agent_test",
		OrganizationID: "org_A",
		Name:           "Test Agent",
		Status:         "ACTIVE",
		VaultAddress:   "0xVaultOrgA123456789012345678901234567890",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})
	_ = repo.SavePolicy(context.Background(), &storage.Policy{
		ID:                  "pol_test_agent",
		OrganizationID:      "org_A",
		AgentID:             "agent_test",
		Enabled:             true,
		PerTransactionLimit: "500000",
		DailyLimit:          "5000000",
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	})

	_ = repo.SaveAgent(context.Background(), &storage.Agent{
		ID:             "agent_resilient",
		OrganizationID: "org_A",
		Name:           "Resilient Agent",
		Status:         "ACTIVE",
		VaultAddress:   "0xVaultOrgA123456789012345678901234567890",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})
	_ = repo.SavePolicy(context.Background(), &storage.Policy{
		ID:                  "pol_resilient_agent",
		OrganizationID:      "org_A",
		AgentID:             "agent_resilient",
		Enabled:             true,
		PerTransactionLimit: "500000",
		DailyLimit:          "5000000",
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	})

	// 2. Set up mock webhook receiver server
	var receivedPayloads [][]byte
	var receivedSignatures []string
	var receiverMu sync.Mutex

	receiver := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receiverMu.Lock()
		defer receiverMu.Unlock()

		body, _ := io.ReadAll(r.Body)
		receivedPayloads = append(receivedPayloads, body)
		receivedSignatures = append(receivedSignatures, r.Header.Get("AgentPay-Signature"))

		if r.URL.Path == "/fail" {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error":"simulated failure"}`))
			return
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"received":true}`))
	}))
	defer receiver.Close()

	// 3. Test Webhook Endpoint Registration & SSRF Protection
	t.Run("SSRF Protection Blocks Localhost in Strict Mode", func(t *testing.T) {
		strictValidator := webhook.NewSSRFValidator(false)

		// Loopback blocked
		if _, err := strictValidator.ValidateURL("http://127.0.0.1:8080/webhook"); err == nil {
			t.Error("expected SSRF error for 127.0.0.1 in strict mode, got nil")
		}
		if _, err := strictValidator.ValidateURL("http://localhost:8080/webhook"); err == nil {
			t.Error("expected SSRF error for localhost in strict mode, got nil")
		}

		// Cloud metadata blocked
		if _, err := strictValidator.ValidateURL("http://169.254.169.254/latest/meta-data"); err == nil {
			t.Error("expected SSRF error for AWS metadata IP, got nil")
		}

		// Private RFC1918 blocked
		if _, err := strictValidator.ValidateURL("http://10.0.0.1/webhook"); err == nil {
			t.Error("expected SSRF error for 10.0.0.1, got nil")
		}
	})

	var endpointAID string
	var endpointASecret string

	t.Run("Create Webhook Endpoint for Org A", func(t *testing.T) {
		createBody := map[string]interface{}{
			"url":               receiver.URL + "/webhook",
			"description":       "Org A Production Webhook",
			"subscribed_events": []string{"payment_intent.*", "test.ping"},
		}
		bodyBytes, _ := json.Marshal(createBody)

		req, _ := http.NewRequest("POST", server.URL+"/v1/webhooks", bytes.NewReader(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+secretA)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("failed to create webhook: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			b, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected 201 Created, got %d: %s", resp.StatusCode, string(b))
		}

		var created map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&created)

		endpointAID = created["id"].(string)
		endpointASecret = created["secret"].(string)

		if endpointAID == "" || !bytes.HasPrefix([]byte(endpointAID), []byte("we_")) {
			t.Errorf("expected endpoint ID with 'we_' prefix, got %s", endpointAID)
		}
		if endpointASecret == "" || !bytes.HasPrefix([]byte(endpointASecret), []byte("whsec_")) {
			t.Errorf("expected secret with 'whsec_' prefix, got %s", endpointASecret)
		}
	})

	t.Run("List Webhook Endpoints Does Not Leak Secret", func(t *testing.T) {
		req, _ := http.NewRequest("GET", server.URL+"/v1/webhooks", nil)
		req.Header.Set("Authorization", "Bearer "+secretA)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("failed to list webhooks: %v", err)
		}
		defer resp.Body.Close()

		var listResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&listResp)

		endpoints := listResp["endpoints"].([]interface{})
		if len(endpoints) != 1 {
			t.Fatalf("expected 1 endpoint, got %d", len(endpoints))
		}

		ep := endpoints[0].(map[string]interface{})
		if _, exists := ep["secret"]; exists {
			t.Error("CRITICAL: webhook secret was leaked in list response!")
		}
		if _, exists := ep["secret_hash"]; exists {
			t.Error("CRITICAL: webhook secret_hash was leaked in list response!")
		}
	})

	t.Run("Organization Isolation: Org B Cannot Access Org A Webhooks", func(t *testing.T) {
		// Org B attempts GET on Org A's endpoint
		req, _ := http.NewRequest("GET", server.URL+"/v1/webhooks/"+endpointAID, nil)
		req.Header.Set("Authorization", "Bearer "+secretB)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("expected 404 for cross-org webhook access, got %d", resp.StatusCode)
		}

		// Org B attempts to delete Org A's endpoint
		reqDel, _ := http.NewRequest("DELETE", server.URL+"/v1/webhooks/"+endpointAID, nil)
		reqDel.Header.Set("Authorization", "Bearer "+secretB)

		respDel, err := http.DefaultClient.Do(reqDel)
		if err != nil {
			t.Fatalf("delete request failed: %v", err)
		}
		defer respDel.Body.Close()

		if respDel.StatusCode != http.StatusNotFound {
			t.Errorf("expected 404 for cross-org delete attempt, got %d", respDel.StatusCode)
		}
	})

	t.Run("Test Ping Webhook and Verify HMAC-SHA256 Signature", func(t *testing.T) {
		receiverMu.Lock()
		receivedPayloads = nil
		receivedSignatures = nil
		receiverMu.Unlock()

		req, _ := http.NewRequest("POST", server.URL+"/v1/webhooks/"+endpointAID+"/test", nil)
		req.Header.Set("Authorization", "Bearer "+secretA)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("failed to trigger test webhook: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			b, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected 200 OK, got %d: %s", resp.StatusCode, string(b))
		}

		receiverMu.Lock()
		defer receiverMu.Unlock()

		if len(receivedPayloads) != 1 {
			t.Fatalf("expected receiver to receive 1 delivery, got %d", len(receivedPayloads))
		}

		payload := receivedPayloads[0]
		sigHeader := receivedSignatures[0]

		// Verify signature using webhook.VerifySignature
		sigErr := webhook.VerifySignature(endpointASecret, sigHeader, payload, 5*time.Minute)
		if sigErr != nil {
			t.Fatalf("HMAC signature verification failed: err=%v, header=%s", sigErr, sigHeader)
		}

		// Verify replay protection rejects stale timestamp
		staleHeader := "t=1000000000,v1=fakesignature"
		errStale := webhook.VerifySignature(endpointASecret, staleHeader, payload, 5*time.Minute)
		if errStale == nil {
			t.Error("expected replay protection to reject stale timestamp, but it succeeded")
		}
	})

	t.Run("Payment Intent Lifecycle Generates Correlated Events", func(t *testing.T) {
		// 1. Create Payment Intent
		createReq := map[string]interface{}{
			"agent_id":      "agent_test",
			"service":       "web-research",
			"vault_address": "0xVaultOrgA123456789012345678901234567890",
			"amount":        "250000",
			"asset":         "USDC",
			"purpose":       "Daily AI research subscription",
			"justification": "Required for autonomous research",
		}
		b, _ := json.Marshal(createReq)

		req, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewReader(b))
		req.Header.Set("Authorization", "Bearer "+secretA)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", "idemp_test_corr_001")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("create intent failed: %v", err)
		}
		defer resp.Body.Close()

		var piResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&piResp)
		if piResp["id"] == nil {
			t.Fatalf("expected intent id in response, got %+v", piResp)
		}
		intentID := piResp["id"].(string)

		// 2. Authorize Intent
		authReq, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents/"+intentID+"/authorize", nil)
		authReq.Header.Set("Authorization", "Bearer "+secretA)
		respAuth, err := http.DefaultClient.Do(authReq)
		if err != nil {
			t.Fatalf("authorize intent failed: %v", err)
		}
		respAuth.Body.Close()

		// 3. Confirm Intent
		confReq, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents/"+intentID+"/confirm", nil)
		confReq.Header.Set("Authorization", "Bearer "+secretA)
		respConf, err := http.DefaultClient.Do(confReq)
		if err != nil {
			t.Fatalf("confirm intent failed: %v", err)
		}
		respConf.Body.Close()

		// 4. Query Events via GET /v1/events
		eventsReq, _ := http.NewRequest("GET", server.URL+"/v1/events?payment_intent_id="+intentID, nil)
		eventsReq.Header.Set("Authorization", "Bearer "+secretA)

		respEvents, err := http.DefaultClient.Do(eventsReq)
		if err != nil {
			t.Fatalf("get events failed: %v", err)
		}
		defer respEvents.Body.Close()

		var eventsResp map[string]interface{}
		_ = json.NewDecoder(respEvents.Body).Decode(&eventsResp)

		events := eventsResp["events"].([]interface{})
		if len(events) == 0 {
			t.Fatal("expected events for payment intent, found 0")
		}

		// Verify event correlation
		for _, e := range events {
			evt := e.(map[string]interface{})
			if evt["payment_intent_id"] != intentID {
				t.Errorf("expected event to have payment_intent_id=%s, got %v", intentID, evt["payment_intent_id"])
			}
			if evt["organization_id"] != "org_A" {
				t.Errorf("expected event org_A, got %v", evt["organization_id"])
			}
		}
	})

	t.Run("Webhook Failure Does NOT Roll Back Payment Settlement", func(t *testing.T) {
		// Register a failing endpoint
		failingEP := &webhook.WebhookEndpoint{
			ID:               "we_failing_test",
			OrganizationID:   "org_A",
			URL:              receiver.URL + "/fail", // returns 500
			SecretHash:       "hash",
			SubscribedEvents: []string{"*"},
			Enabled:          true,
			CreatedAt:        time.Now().UTC(),
			UpdatedAt:        time.Now().UTC(),
		}
		_ = repo.SaveWebhookEndpoint(context.Background(), failingEP)

		// Create & Authorize & Confirm payment
		createReq := map[string]interface{}{
			"agent_id":      "agent_resilient",
			"service":       "web-research",
			"vault_address": "0xVaultOrgA123456789012345678901234567890",
			"amount":        "100000",
			"asset":         "USDC",
			"purpose":       "Failure isolation test",
		}
		b, _ := json.Marshal(createReq)

		req, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewReader(b))
		req.Header.Set("Authorization", "Bearer "+secretA)
		req.Header.Set("Content-Type", "application/json")
		resp, _ := http.DefaultClient.Do(req)
		var piResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&piResp)
		resp.Body.Close()
		intentID := piResp["id"].(string)

		// Authorize
		authReq, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents/"+intentID+"/authorize", nil)
		authReq.Header.Set("Authorization", "Bearer "+secretA)
		respAuth, _ := http.DefaultClient.Do(authReq)
		respAuth.Body.Close()

		// Confirm payment
		confReq, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents/"+intentID+"/confirm", nil)
		confReq.Header.Set("Authorization", "Bearer "+secretA)
		respConf, err := http.DefaultClient.Do(confReq)
		if err != nil {
			t.Fatalf("confirm request failed: %v", err)
		}
		defer respConf.Body.Close()

		if respConf.StatusCode != http.StatusOK {
			t.Fatalf("expected payment confirmation 200 OK even when webhook fails, got %d", respConf.StatusCode)
		}

		var confResp map[string]interface{}
		_ = json.NewDecoder(respConf.Body).Decode(&confResp)

		intentObj, ok := confResp["intent"].(map[string]interface{})
		if !ok || intentObj["status"] != string(intent.StatusConfirmed) {
			t.Errorf("expected payment status CONFIRMED in intent response, got %v", confResp)
		}

		// Verify financial state is authoritative: intent is CONFIRMED in repository
		savedIntent, err := repo.GetIntent(context.Background(), intentID)
		if err != nil || savedIntent.Status != intent.StatusConfirmed {
			t.Errorf("expected intent to remain CONFIRMED in storage despite webhook failure: status=%v, err=%v", savedIntent.Status, err)
		}
	})
}
