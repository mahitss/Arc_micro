package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/auth"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/control"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
)

type sec02Fixture struct {
	server      *httptest.Server
	repo        storage.Repository
	cfg         *config.Config
	aliceKey    string
	aliceOrg    string
	bobKey      string
	bobOrg      string
	adminKey    string
	adminOrg    string
	treasurySvc treasury.Service
	controlSvc  control.Service
}

func setupSEC02Fixture(t *testing.T, environment string) *sec02Fixture {
	t.Helper()

	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      false,
		MaxRequestBodyBytes:     1048576,
		Environment:             environment,
		BootstrapAPIKey:         "ap_live_bootstrap_super_admin_key_sec02",
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := &mockIntegrationPolicyClient{}
	execSvc := &mockIntegrationExecutionService{}

	intentSvc := intent.NewService(repo, pClient, execSvc, reg, nil, 5*time.Minute, false)

	// Create Alice key (ordinary tenant org_alice)
	aliceSecret, aliceKeyObj, err := auth.GenerateAPIKey("org_alice", "Alice Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
		domain.ScopeTreasuryRead,
		domain.ScopeTreasuryManage,
	})
	if err != nil {
		t.Fatalf("failed to create alice key: %v", err)
	}
	_ = repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             aliceKeyObj.ID,
		OrganizationID: aliceKeyObj.OrganizationID,
		KeyHash:        aliceKeyObj.KeyHash,
		Name:           aliceKeyObj.Name,
		MaskedKey:      aliceKeyObj.MaskedKey,
		Scopes:         "payments:read,payments:create,treasury:read,treasury:manage",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	// Create Bob key (ordinary tenant org_bob)
	bobSecret, bobKeyObj, err := auth.GenerateAPIKey("org_bob", "Bob Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
		domain.ScopeTreasuryRead,
		domain.ScopeTreasuryManage,
	})
	if err != nil {
		t.Fatalf("failed to create bob key: %v", err)
	}
	_ = repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             bobKeyObj.ID,
		OrganizationID: bobKeyObj.OrganizationID,
		KeyHash:        bobKeyObj.KeyHash,
		Name:           bobKeyObj.Name,
		MaskedKey:      bobKeyObj.MaskedKey,
		Scopes:         "payments:read,payments:create,treasury:read,treasury:manage",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	// Create Cross-Tenant Admin key (admin scope)
	adminSecret, adminKeyObj, err := auth.GenerateAPIKey("org_platform", "Admin Key", []string{
		domain.ScopeAdmin,
		"*",
	})
	if err != nil {
		t.Fatalf("failed to create admin key: %v", err)
	}
	_ = repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             adminKeyObj.ID,
		OrganizationID: adminKeyObj.OrganizationID,
		KeyHash:        adminKeyObj.KeyHash,
		Name:           adminKeyObj.Name,
		MaskedKey:      adminKeyObj.MaskedKey,
		Scopes:         "admin,*",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	router := gwHttp.NewRouter(cfg, pClient, execSvc, nil, intentSvc, repo, reg)
	server := httptest.NewServer(router)

	return &sec02Fixture{
		server:   server,
		repo:     repo,
		cfg:      cfg,
		aliceKey: aliceSecret,
		aliceOrg: "org_alice",
		bobKey:   bobSecret,
		bobOrg:   "org_bob",
		adminKey: adminSecret,
		adminOrg: "org_platform",
	}
}

// 1. Missing organization ID derives from authenticated caller's context.
func TestSEC02_Scenario1_MissingOrgID_DerivesFromAuthContext(t *testing.T) {
	f := setupSEC02Fixture(t, "production")
	defer f.server.Close()

	// Alice queries treasury state without any organization_id query parameter
	req, _ := http.NewRequest("GET", f.server.URL+"/v1/treasury/state", nil)
	req.Header.Set("Authorization", "Bearer "+f.aliceKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected 200 OK, got %d: %s", resp.StatusCode, string(body))
	}

	var state map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&state); err != nil {
		t.Fatalf("failed to decode json: %v", err)
	}

	if state["organization_id"] != f.aliceOrg {
		t.Errorf("expected organization_id '%s', got '%v'", f.aliceOrg, state["organization_id"])
	}
}

// 2. An authenticated caller accessing its own organization succeeds.
func TestSEC02_Scenario2_CallerAccessingOwnOrg_Succeeds(t *testing.T) {
	f := setupSEC02Fixture(t, "production")
	defer f.server.Close()

	// Alice explicitly supplies her own organization_id
	endpoints := []string{
		"/v1/treasury/state?organization_id=org_alice",
		"/v1/control/overview?organization_id=org_alice",
		"/v1/treasury/summary?organization_id=org_alice",
	}

	for _, ep := range endpoints {
		req, _ := http.NewRequest("GET", f.server.URL+ep, nil)
		req.Header.Set("Authorization", "Bearer "+f.aliceKey)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request to %s failed: %v", ep, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Errorf("endpoint %s: expected 200 OK, got %d: %s", ep, resp.StatusCode, string(body))
		}
	}
}

// 3. Ordinary caller attempting to read another organization's treasury state or control overview is rejected with 403 Forbidden.
func TestSEC02_Scenario3_CrossTenantAccess_Rejected403(t *testing.T) {
	f := setupSEC02Fixture(t, "production")
	defer f.server.Close()

	// Alice attempts to access Bob's organization data
	attackRoutes := []string{
		"/v1/treasury/state?organization_id=org_bob",
		"/v1/control/overview?organization_id=org_bob",
		"/v1/treasury/summary?organization_id=org_bob",
		"/v1/treasury/reservations?organization_id=org_bob",
		"/v1/treasury/exposure?organization_id=org_bob",
		"/v1/control/state?organization_id=org_bob",
		"/v1/control/activity?organization_id=org_bob",
		"/v1/control/security?organization_id=org_bob",
		"/v1/control/treasury?organization_id=org_bob",
		"/v1/control/incidents?organization_id=org_bob",
		"/v1/control/search?organization_id=org_bob&q=test",
	}

	for _, route := range attackRoutes {
		t.Run(route, func(t *testing.T) {
			req, _ := http.NewRequest("GET", f.server.URL+route, nil)
			req.Header.Set("Authorization", "Bearer "+f.aliceKey)

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusForbidden {
				body, _ := io.ReadAll(resp.Body)
				t.Errorf("expected 403 Forbidden for cross-tenant access to %s, got %d: %s", route, resp.StatusCode, string(body))
			}
		})
	}
}

// 4. Conflicting organization IDs in query parameters and request bodies are rejected with 400 Bad Request.
func TestSEC02_Scenario4_ConflictingTenantIDs_Rejected400(t *testing.T) {
	f := setupSEC02Fixture(t, "production")
	defer f.server.Close()

	// Alice sends conflicting query and body organization IDs
	conflictCases := []struct {
		name     string
		method   string
		path     string
		body     string
		header   map[string]string
		wantCode int
	}{
		{
			name:     "query org_alice vs body org_bob on reservation",
			method:   "POST",
			path:     "/v1/treasury/reservations?organization_id=org_alice",
			body:     `{"organization_id":"org_bob","agent_id":"agent_1","amount":"1000","mode":"REAL"}`,
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "conflicting query organization_id and org_id",
			method:   "GET",
			path:     "/v1/treasury/state?organization_id=org_alice&org_id=org_bob",
			body:     "",
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "conflicting header X-Tenant-ID and query organization_id",
			method:   "GET",
			path:     "/v1/treasury/state?organization_id=org_alice",
			body:     "",
			header:   map[string]string{"X-Tenant-ID": "org_bob"},
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "query org_bob vs body org_alice on payment intent",
			method:   "POST",
			path:     "/v1/payment-intents?organization_id=org_bob",
			body:     `{"organization_id":"org_alice","agent_id":"agent_1","service":"s1","amount":"100","asset":"USDC","purpose":"test"}`,
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tc := range conflictCases {
		t.Run(tc.name, func(t *testing.T) {
			var bodyReader io.Reader
			if tc.body != "" {
				bodyReader = bytes.NewReader([]byte(tc.body))
			}
			req, _ := http.NewRequest(tc.method, f.server.URL+tc.path, bodyReader)
			req.Header.Set("Authorization", "Bearer "+f.aliceKey)
			req.Header.Set("Content-Type", "application/json")
			for k, v := range tc.header {
				req.Header.Set(k, v)
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tc.wantCode {
				body, _ := io.ReadAll(resp.Body)
				t.Errorf("expected HTTP %d, got %d: %s", tc.wantCode, resp.StatusCode, string(body))
			}
		})
	}
}

// 5. Admin access succeeds for cross-tenant, while non-admin is strictly rejected.
func TestSEC02_Scenario5_AdminAccessVsNonAdminRejection(t *testing.T) {
	f := setupSEC02Fixture(t, "production")
	defer f.server.Close()

	// 1. Admin querying Bob's organization data -> 200 OK
	{
		req, _ := http.NewRequest("GET", f.server.URL+"/v1/treasury/state?organization_id=org_bob", nil)
		req.Header.Set("Authorization", "Bearer "+f.adminKey)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("admin request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected admin to access org_bob with 200 OK, got %d: %s", resp.StatusCode, string(body))
		}

		var state map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&state)
		if state["organization_id"] != "org_bob" {
			t.Errorf("expected admin response for org_bob, got %v", state["organization_id"])
		}
	}

	// 2. Bootstrap Super Admin key querying Alice's data -> 200 OK
	{
		req, _ := http.NewRequest("GET", f.server.URL+"/v1/control/overview?organization_id=org_alice", nil)
		req.Header.Set("Authorization", "Bearer "+f.cfg.BootstrapAPIKey)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("bootstrap admin request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected bootstrap admin to access org_alice with 200 OK, got %d: %s", resp.StatusCode, string(body))
		}
	}

	// 3. Non-admin (Alice) querying Bob's data -> 403 Forbidden
	{
		req, _ := http.NewRequest("GET", f.server.URL+"/v1/treasury/state?organization_id=org_bob", nil)
		req.Header.Set("Authorization", "Bearer "+f.aliceKey)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("alice request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusForbidden {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected non-admin to receive 403 Forbidden, got %d: %s", resp.StatusCode, string(body))
		}
	}
}

// 6. Unauthenticated requests receive 401, and nil repository in production fails closed with 500.
func TestSEC02_Scenario6_UnauthenticatedAndNilRepositoryBehavior(t *testing.T) {
	// 1. Unauthenticated requests on protected routes -> 401
	{
		f := setupSEC02Fixture(t, "production")
		defer f.server.Close()

		req, _ := http.NewRequest("GET", f.server.URL+"/v1/treasury/state", nil)
		// No Authorization header

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusUnauthorized {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected 401 Unauthorized for unauthenticated request, got %d: %s", resp.StatusCode, string(body))
		}
	}

	// 2. Nil repository in production fails closed -> 500 AUTH_UNAVAILABLE
	{
		cfgProd := &config.Config{
			Port:                "8080",
			Environment:         "production",
			MaxRequestBodyBytes: 1048576,
		}
		routerProd := gwHttp.NewRouter(cfgProd, nil, nil, nil, nil, nil, nil)
		serverProd := httptest.NewServer(routerProd)
		defer serverProd.Close()

		req, _ := http.NewRequest("GET", serverProd.URL+"/v1/treasury/state", nil)
		req.Header.Set("Authorization", "Bearer ap_live_some_dummy_key_123")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusInternalServerError {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected 500 Internal Server Error when repository is nil in production, got %d: %s", resp.StatusCode, string(body))
		}
	}
}

// 7. Alternate routes and parameter aliases cannot bypass tenant isolation.
func TestSEC02_Scenario7_AlternateRoutesAndBypassAttempts(t *testing.T) {
	f := setupSEC02Fixture(t, "production")
	defer f.server.Close()

	bypassAttempts := []struct {
		name     string
		method   string
		path     string
		header   map[string]string
		wantCode int
	}{
		{
			name:     "X-Tenant-ID header spoofing",
			method:   "GET",
			path:     "/v1/treasury/state",
			header:   map[string]string{"X-Tenant-ID": "org_bob"},
			wantCode: http.StatusForbidden,
		},
		{
			name:     "org_id query parameter alias for bob",
			method:   "GET",
			path:     "/v1/treasury/state?org_id=org_bob",
			wantCode: http.StatusForbidden,
		},
		{
			name:     "tenant_id query parameter alias for bob",
			method:   "GET",
			path:     "/v1/treasury/state?tenant_id=org_bob",
			wantCode: http.StatusForbidden,
		},
		{
			name:     "clearinghouse exposure with org_bob",
			method:   "GET",
			path:     "/v1/economy/exposure?organization_id=org_bob",
			wantCode: http.StatusForbidden,
		},
		{
			name:     "runtime workflows with org_bob",
			method:   "GET",
			path:     "/v1/runtime/workflows/wf_123?organization_id=org_bob",
			wantCode: http.StatusForbidden,
		},
		{
			name:     "constitutions active with org_bob",
			method:   "GET",
			path:     "/v1/constitutions/active?organization_id=org_bob",
			wantCode: http.StatusForbidden,
		},
		{
			name:     "intelligence service performance with org_bob",
			method:   "GET",
			path:     "/v1/services/svc_123/performance?organization_id=org_bob",
			wantCode: http.StatusForbidden,
		},
	}

	for _, tc := range bypassAttempts {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest(tc.method, f.server.URL+tc.path, nil)
			req.Header.Set("Authorization", "Bearer "+f.aliceKey)
			for k, v := range tc.header {
				req.Header.Set(k, v)
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tc.wantCode {
				body, _ := io.ReadAll(resp.Body)
				t.Errorf("expected HTTP %d, got %d: %s", tc.wantCode, resp.StatusCode, string(body))
			}
		})
	}
}
