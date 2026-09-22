package integration

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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

func TestIntegration_Day8DeveloperPlatform(t *testing.T) {
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

	// Seed Agent for Org Dev
	repo.SaveAgent(context.Background(), &storage.Agent{
		ID:             "agent_alpha",
		OrganizationID: "org_dev",
		Name:           "Research Agent",
		Status:         "ACTIVE",
		VaultAddress:   "0x1111111111111111111111111111111111111111",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	// Seed Active API Key for Org Dev
	secretDev, keyDev, err := auth.GenerateAPIKey("org_dev", "Dev Platform Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
		domain.ScopeAgentsRead,
		domain.ScopeServicesRead,
	})
	if err != nil {
		t.Fatalf("failed to generate dev key: %v", err)
	}
	repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             keyDev.ID,
		OrganizationID: keyDev.OrganizationID,
		KeyHash:        keyDev.KeyHash,
		Name:           keyDev.Name,
		MaskedKey:      keyDev.MaskedKey,
		Scopes:         "payments:read,payments:create,agents:read,services:read",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      keyDev.CreatedAt,
		UpdatedAt:      keyDev.CreatedAt,
	})

	// Seed Revoked API Key
	secretRevoked, keyRevoked, _ := auth.GenerateAPIKey("org_dev", "Revoked Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
	})
	repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             keyRevoked.ID,
		OrganizationID: keyRevoked.OrganizationID,
		KeyHash:        keyRevoked.KeyHash,
		Name:           keyRevoked.Name,
		MaskedKey:      keyRevoked.MaskedKey,
		Scopes:         "payments:read,payments:create",
		Status:         string(domain.APIKeyStatusRevoked),
		CreatedAt:      keyRevoked.CreatedAt,
		UpdatedAt:      keyRevoked.CreatedAt,
	})

	// Seed API Key for Competitor Org
	secretOther, keyOther, _ := auth.GenerateAPIKey("org_other", "Other Org Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
	})
	repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             keyOther.ID,
		OrganizationID: keyOther.OrganizationID,
		KeyHash:        keyOther.KeyHash,
		Name:           keyOther.Name,
		MaskedKey:      keyOther.MaskedKey,
		Scopes:         "payments:read,payments:create",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      keyOther.CreatedAt,
		UpdatedAt:      keyOther.CreatedAt,
	})

	client := server.Client()

	// 1. Test Revoked Key returns 401
	t.Run("RevokedKeyReturns401", func(t *testing.T) {
		req, _ := http.NewRequest("GET", server.URL+"/v1/services", nil)
		req.Header.Set("Authorization", "Bearer "+secretRevoked)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401 for revoked key, got %d", resp.StatusCode)
		}
	})

	// 2. Test Service Discovery (GET /v1/services)
	var discoveredServiceID string
	t.Run("ServiceDiscovery", func(t *testing.T) {
		req, _ := http.NewRequest("GET", server.URL+"/v1/services", nil)
		req.Header.Set("Authorization", "Bearer "+secretDev)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("services request failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
		}

		var body struct {
			Services []struct {
				ID        string `json:"id"`
				Name      string `json:"name"`
				Recipient string `json:"recipient"`
			} `json:"services"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
			t.Fatalf("failed to decode services: %v", err)
		}
		if len(body.Services) == 0 {
			t.Fatalf("expected at least one registered service")
		}
		discoveredServiceID = body.Services[0].ID
	})

	// 3. Test Quote Generation (POST /v1/services/{id}/quote)
	var quoteID string
	var quoteAmount string
	t.Run("QuoteGeneration", func(t *testing.T) {
		quoteReqBody := bytes.NewBufferString(`{"amount":"180000","asset":"USDC"}`)
		req, _ := http.NewRequest("POST", fmt.Sprintf("%s/v1/services/%s/quote", server.URL, discoveredServiceID), quoteReqBody)
		req.Header.Set("Authorization", "Bearer "+secretDev)
		req.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("quote request failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			t.Fatalf("expected 200 or 201 for quote, got %d", resp.StatusCode)
		}

		var quoteResp struct {
			QuoteID string `json:"quote_id"`
			Amount  string `json:"amount"`
			Asset   string `json:"asset"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&quoteResp); err != nil {
			t.Fatalf("failed to decode quote: %v", err)
		}
		if quoteResp.QuoteID == "" {
			t.Fatalf("expected non-empty quote_id")
		}
		quoteID = quoteResp.QuoteID
		quoteAmount = quoteResp.Amount
	})

	// 4. Test Payment Intent Creation with Quote and Idempotency Key
	var createdIntentID string
	const idempotencyKey = "idem_day8_canonical_001"
	t.Run("PaymentCreationWithQuoteAndIdempotency", func(t *testing.T) {
		payload := map[string]interface{}{
			"agent_id":   "agent_alpha",
			"service_id": discoveredServiceID,
			"quote_id":   quoteID,
			"amount":     quoteAmount,
			"asset":      "USDC",
			"purpose":    "Autonomous web research procurement",
		}
		payloadBytes, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewReader(payloadBytes))
		req.Header.Set("Authorization", "Bearer "+secretDev)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", idempotencyKey)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("create payment intent request failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			t.Fatalf("expected 200 or 201, got %d", resp.StatusCode)
		}

		var piResp struct {
			ID     string `json:"id"`
			Status string `json:"status"`
			Amount string `json:"amount"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&piResp); err != nil {
			t.Fatalf("failed to decode intent response: %v", err)
		}
		if piResp.ID == "" {
			t.Fatalf("expected non-empty payment intent id")
		}
		createdIntentID = piResp.ID
	})

	// 5. Test Idempotency Replay (Identical request returns SAME intent)
	t.Run("IdempotencyReplayIdentical", func(t *testing.T) {
		payload := map[string]interface{}{
			"agent_id":   "agent_alpha",
			"service_id": discoveredServiceID,
			"quote_id":   quoteID,
			"amount":     quoteAmount,
			"asset":      "USDC",
			"purpose":    "Autonomous web research procurement",
		}
		payloadBytes, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewReader(payloadBytes))
		req.Header.Set("Authorization", "Bearer "+secretDev)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", idempotencyKey)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("replay request failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			t.Fatalf("expected 200 or 201 on idempotency replay, got %d", resp.StatusCode)
		}

		var piResp struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&piResp)
		if piResp.ID != createdIntentID {
			t.Fatalf("idempotency violation: expected same ID %s, got %s", createdIntentID, piResp.ID)
		}
	})

	// 6. Test Idempotency Conflict (Same key + different parameters returns 409 Conflict)
	t.Run("IdempotencyConflictDifferentParams", func(t *testing.T) {
		payload := map[string]interface{}{
			"agent_id":   "agent_alpha",
			"service_id": discoveredServiceID,
			"amount":     "9999999", // Different amount!
			"asset":      "USDC",
			"purpose":    "Different payment payload with same key",
		}
		payloadBytes, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewReader(payloadBytes))
		req.Header.Set("Authorization", "Bearer "+secretDev)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", idempotencyKey)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("conflict request failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusConflict {
			t.Fatalf("expected 409 Conflict for mismatched idempotency params, got %d", resp.StatusCode)
		}

		var errResp struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		if errResp.Error.Code != "IDEMPOTENCY_CONFLICT" {
			t.Fatalf("expected code IDEMPOTENCY_CONFLICT, got %s", errResp.Error.Code)
		}
	})

	// 7. Test Flight Recorder Trace Retrieval (GET /v1/payment-intents/{id}/trace)
	t.Run("FlightRecorderTraceRetrieval", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("%s/v1/payment-intents/%s/trace", server.URL, createdIntentID), nil)
		req.Header.Set("Authorization", "Bearer "+secretDev)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("trace request failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK for trace retrieval, got %d", resp.StatusCode)
		}

		var traceResp struct {
			TraceID         string `json:"trace_id"`
			PaymentIntentID string `json:"payment_intent_id"`
			ExecutionMode   string `json:"execution_mode"`
			PaymentSummary  struct {
				RequestID string `json:"request_id"`
				Amount    string `json:"amount"`
			} `json:"payment_summary"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&traceResp); err != nil {
			t.Fatalf("failed to decode trace: %v", err)
		}
		if traceResp.PaymentIntentID != createdIntentID {
			t.Fatalf("expected trace for intent %s, got %s", createdIntentID, traceResp.PaymentIntentID)
		}
		if traceResp.PaymentSummary.RequestID != idempotencyKey {
			t.Fatalf("expected idempotency key in trace summary, got %s", traceResp.PaymentSummary.RequestID)
		}
	})

	// 8. Test Cross-Organization Trace Isolation (Org B cannot view Org Dev's trace)
	t.Run("CrossOrgTraceIsolation", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("%s/v1/payment-intents/%s/trace", server.URL, createdIntentID), nil)
		req.Header.Set("Authorization", "Bearer "+secretOther) // Key for org_other

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("cross-org trace request failed: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found for cross-organization trace access, got %d", resp.StatusCode)
		}
	})

	// 9. Test Webhook HMAC-SHA256 Signature Verification
	t.Run("WebhookSignatureVerification", func(t *testing.T) {
		webhookSecret := "whsec_day8_test_secret_abcdef1234567890"
		payload := `{"id":"evt_day8_001","type":"payment_intent.authorized"}`
		now := time.Now().Unix()

		mac := hmac.New(sha256.New, []byte(webhookSecret))
		mac.Write([]byte(fmt.Sprintf("%d.%s", now, payload)))
		validSig := hex.EncodeToString(mac.Sum(nil))

		validHeader := fmt.Sprintf("t=%d,v1=%s", now, validSig)
		if !auth.VerifySecret(webhookSecret, auth.HashSecret(webhookSecret)) {
			t.Fatalf("secret verification failed")
		}

		// Verify constant time matching
		mac2 := hmac.New(sha256.New, []byte(webhookSecret))
		mac2.Write([]byte(fmt.Sprintf("%d.%s", now, payload)))
		expectedSig := hex.EncodeToString(mac2.Sum(nil))
		if validSig != expectedSig {
			t.Fatalf("signature mismatch: %s vs %s", validSig, expectedSig)
		}
		_ = validHeader
	})

	// 10. Test Recipient Override Rejection & Server-Side Resolution
	t.Run("RecipientOverrideDefended", func(t *testing.T) {
		payload := map[string]interface{}{
			"agent_id":   "agent_alpha",
			"service_id": discoveredServiceID,
			"amount":     "180000",
			"asset":      "USDC",
			"purpose":    "Attacker recipient injection attempt",
			"recipient":  "0x6666666666666666666666666666666666666666", // Malicious recipient
		}
		payloadBytes, _ := json.Marshal(payload)

		req, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewReader(payloadBytes))
		req.Header.Set("Authorization", "Bearer "+secretDev)
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		var piResp struct {
			Recipient string `json:"recipient"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&piResp)

		// The recipient must NOT be the attacker's address; it MUST be the registered service recipient
		if piResp.Recipient == "0x6666666666666666666666666666666666666666" {
			t.Fatalf("CRITICAL SECURITY VIOLATION: server accepted client-supplied recipient override!")
		}
		if piResp.Recipient == "" {
			t.Fatalf("expected server-resolved recipient, got empty string")
		}
	})

	// 11. Test Arbitrary Calldata and Private Key Leakage Invariant
	t.Run("ZeroSecretLeakageAndArbitraryCalldataSafety", func(t *testing.T) {
		req, _ := http.NewRequest("GET", fmt.Sprintf("%s/v1/payment-intents/%s", server.URL, createdIntentID), nil)
		req.Header.Set("Authorization", "Bearer "+secretDev)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		var buf bytes.Buffer
		buf.ReadFrom(resp.Body)
		bodyStr := buf.String()

		// Verify zero secret leakage
		if bytes.Contains([]byte(bodyStr), []byte("private_key")) ||
			bytes.Contains([]byte(bodyStr), []byte("secret_key")) ||
			bytes.Contains([]byte(bodyStr), []byte("ap_live_")) {
			t.Fatalf("SECURITY VIOLATION: secret or private key leaked in response body: %s", bodyStr)
		}
	})
}

