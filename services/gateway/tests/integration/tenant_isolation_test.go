package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func setupTenantTestServer() (*httptest.Server, storage.Repository) {
	cfg := &config.Config{
		Port:                "8080",
		MaxRequestBodyBytes: 1048576,
	}
	repo := storage.NewMemoryRepository()
	router := gwHttp.NewRouter(cfg, nil, nil, nil, nil, repo, nil)
	server := httptest.NewServer(router)
	return server, repo
}

// TestTenantIsolationAndSessionSecurity rigorously verifies:
// 1. Two users in different organizations cannot view or manipulate each other's agents or policies.
// 2. Unauthenticated requests to protected endpoints fail closed with 401 (no silent org_default or demo key fallback).
// 3. User sessions are strictly isolated and invalidated upon logout.
func TestTenantIsolationAndSessionSecurity(t *testing.T) {
	server, _ := setupTenantTestServer()
	defer server.Close()

	client := &http.Client{Timeout: 5 * time.Second}

	// -------------------------------------------------------------------------
	// 1. Register User Alice (Organization: Smith Robotics)
	// -------------------------------------------------------------------------
	aliceSignup, _ := json.Marshal(map[string]string{
		"email":    "alice@smith-robotics.com",
		"password": "Password123!",
		"name":     "Alice Smith",
		"org_name": "Smith Robotics",
	})
	resp, err := client.Post(server.URL+"/v1/auth/signup", "application/json", bytes.NewReader(aliceSignup))
	if err != nil {
		t.Fatalf("Alice signup failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created for Alice signup, got %d", resp.StatusCode)
	}

	var aliceData struct {
		User struct {
			ID             string `json:"id"`
			OrganizationID string `json:"organization_id"`
		} `json:"user"`
		Session struct {
			Token string `json:"token"`
		} `json:"session"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&aliceData)
	resp.Body.Close()

	aliceToken := aliceData.Session.Token
	aliceOrg := aliceData.User.OrganizationID

	// -------------------------------------------------------------------------
	// 2. Register User Bob (Organization: Jones AI)
	// -------------------------------------------------------------------------
	bobSignup, _ := json.Marshal(map[string]string{
		"email":    "bob@jones-ai.com",
		"password": "Password123!",
		"name":     "Bob Jones",
		"org_name": "Jones AI",
	})
	resp, err = client.Post(server.URL+"/v1/auth/signup", "application/json", bytes.NewReader(bobSignup))
	if err != nil {
		t.Fatalf("Bob signup failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created for Bob signup, got %d", resp.StatusCode)
	}

	var bobData struct {
		User struct {
			ID             string `json:"id"`
			OrganizationID string `json:"organization_id"`
		} `json:"user"`
		Session struct {
			Token string `json:"token"`
		} `json:"session"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&bobData)
	resp.Body.Close()

	bobToken := bobData.Session.Token
	bobOrg := bobData.User.OrganizationID

	if aliceOrg == bobOrg {
		t.Fatalf("critical error: Alice and Bob were assigned the same organization ID: %s", aliceOrg)
	}

	// -------------------------------------------------------------------------
	// 3. Alice creates an Agent in Smith Robotics
	// -------------------------------------------------------------------------
	createAgentPayload, _ := json.Marshal(map[string]interface{}{
		"name":          "Alice Research Scout",
		"description":   "Proprietary market intelligence agent",
		"vault_address": "0x7789bC3d8366782b97496165C24BD5bB09302843",
	})
	req, _ := http.NewRequest("POST", server.URL+"/v1/agents", bytes.NewReader(createAgentPayload))
	req.Header.Set("Authorization", "Bearer "+aliceToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("Alice create agent request failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created for Alice agent creation, got %d", resp.StatusCode)
	}

	var agentResp struct {
		Agent struct {
			ID             string `json:"id"`
			Name           string `json:"name"`
			OrganizationID string `json:"organization_id"`
		} `json:"agent"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&agentResp)
	resp.Body.Close()

	aliceAgentID := agentResp.Agent.ID
	if agentResp.Agent.OrganizationID != aliceOrg {
		t.Errorf("expected agent to belong to Alice's org %s, got %s", aliceOrg, agentResp.Agent.OrganizationID)
	}

	// -------------------------------------------------------------------------
	// 4. Alice configures a Spending Policy for her Agent
	// -------------------------------------------------------------------------
	savePolicyPayload, _ := json.Marshal(map[string]interface{}{
		"agent_id":                 aliceAgentID,
		"per_transaction_limit":    "750000",
		"daily_limit":             "7500000",
		"max_transactions_per_day": 15,
		"approval_threshold":      "500000",
	})
	req, _ = http.NewRequest("PUT", server.URL+"/v1/policies", bytes.NewReader(savePolicyPayload))
	req.Header.Set("Authorization", "Bearer "+aliceToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("Alice policy configuration failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for Alice policy save, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// -------------------------------------------------------------------------
	// 5. Bob queries agents: Must NOT see Alice's Agent
	// -------------------------------------------------------------------------
	req, _ = http.NewRequest("GET", server.URL+"/v1/agents", nil)
	req.Header.Set("Authorization", "Bearer "+bobToken)

	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("Bob list agents failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for Bob list agents, got %d", resp.StatusCode)
	}

	var bobAgentsResp struct {
		Agents []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"agents"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&bobAgentsResp)
	resp.Body.Close()

	for _, a := range bobAgentsResp.Agents {
		if a.ID == aliceAgentID {
			t.Fatalf("TENANT ISOLATION BREACH: Bob can see Alice's private agent %s (%s)", a.ID, a.Name)
		}
	}

	// -------------------------------------------------------------------------
	// 6. Bob tries to read Alice's agent directly: Must receive 404
	// -------------------------------------------------------------------------
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/v1/agents/%s", server.URL, aliceAgentID), nil)
	req.Header.Set("Authorization", "Bearer "+bobToken)

	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("Bob get agent request failed: %v", err)
	}
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404 Not Found when cross-tenant agent read attempted, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// -------------------------------------------------------------------------
	// 7. Bob tries to update Alice's agent policy: Must receive 404
	// -------------------------------------------------------------------------
	maliciousPolicy, _ := json.Marshal(map[string]interface{}{
		"agent_id":              aliceAgentID,
		"per_transaction_limit": "999999999",
	})
	req, _ = http.NewRequest("PUT", server.URL+"/v1/policies", bytes.NewReader(maliciousPolicy))
	req.Header.Set("Authorization", "Bearer "+bobToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("Bob malicious policy update request failed: %v", err)
	}
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404 Not Found when cross-tenant policy edit attempted, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// -------------------------------------------------------------------------
	// 8. Bob tries to pause Alice's agent: Must receive 404
	// -------------------------------------------------------------------------
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/v1/agents/%s/pause", server.URL, aliceAgentID), nil)
	req.Header.Set("Authorization", "Bearer "+bobToken)

	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("Bob malicious pause request failed: %v", err)
	}
	if resp.StatusCode != http.StatusNotFound && resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 404 or 403 when cross-tenant agent pause attempted, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// -------------------------------------------------------------------------
	// 9. Unauthenticated request without session or API key: Must receive 401
	// -------------------------------------------------------------------------
	req, _ = http.NewRequest("GET", server.URL+"/v1/agents", nil)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("Unauthenticated list agents failed: %v", err)
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for unauthenticated request, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// -------------------------------------------------------------------------
	// 10. Alice Logs Out -> Session Invalidated
	// -------------------------------------------------------------------------
	logoutReq, _ := http.NewRequest("POST", server.URL+"/v1/auth/logout", nil)
	logoutReq.Header.Set("Authorization", "Bearer "+aliceToken)

	resp, err = client.Do(logoutReq)
	if err != nil {
		t.Fatalf("Alice logout failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK for logout, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// -------------------------------------------------------------------------
	// 11. Subsequent request with Alice's invalidated session: Must receive 401
	// -------------------------------------------------------------------------
	req, _ = http.NewRequest("GET", server.URL+"/v1/agents", nil)
	req.Header.Set("Authorization", "Bearer "+aliceToken)

	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("Request with invalidated session failed: %v", err)
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for invalidated session, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}
