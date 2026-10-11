package middleware

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
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func TestGetOrgID_NeverFallsBackToOrgDefault(t *testing.T) {
	// Empty context
	ctx := context.Background()
	orgID := GetOrgID(ctx)
	if orgID != "" {
		t.Fatalf("expected empty string for unauthenticated context, got %q", orgID)
	}

	// Context with empty org ID
	ctxWithEmpty := context.WithValue(ctx, OrgIDKey, "")
	if GetOrgID(ctxWithEmpty) != "" {
		t.Fatalf("expected empty string, got %q", GetOrgID(ctxWithEmpty))
	}

	// Context with real org ID
	ctxWithReal := context.WithValue(ctx, OrgIDKey, "org_acme_corp")
	if GetOrgID(ctxWithReal) != "org_acme_corp" {
		t.Fatalf("expected org_acme_corp, got %q", GetOrgID(ctxWithReal))
	}
}

func TestPublicEndpointsAllowlist(t *testing.T) {
	repo := storage.NewMemoryRepository()
	cfg := &config.Config{Environment: "production"}

	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	mw := APIKeyAuth(repo, cfg)(dummyHandler)

	// 1. /health -> 200 without key
	reqHealth := httptest.NewRequest(http.MethodGet, "/health", nil)
	recHealth := httptest.NewRecorder()
	mw.ServeHTTP(recHealth, reqHealth)
	if recHealth.Code != http.StatusOK {
		t.Fatalf("expected 200 for /health, got %d", recHealth.Code)
	}

	// 2. /ready -> 200 without key
	reqReady := httptest.NewRequest(http.MethodGet, "/ready", nil)
	recReady := httptest.NewRecorder()
	mw.ServeHTTP(recReady, reqReady)
	if recReady.Code != http.StatusOK {
		t.Fatalf("expected 200 for /ready, got %d", recReady.Code)
	}

	// 3. /ready/ trailing slash -> 200 without key
	reqReadySlash := httptest.NewRequest(http.MethodGet, "/ready/", nil)
	recReadySlash := httptest.NewRecorder()
	mw.ServeHTTP(recReadySlash, reqReadySlash)
	if recReadySlash.Code != http.StatusOK {
		t.Fatalf("expected 200 for /ready/, got %d", recReadySlash.Code)
	}

	// 4. CORS preflight OPTIONS -> 200 without key
	reqOptions := httptest.NewRequest(http.MethodOptions, "/v1/payment-intents", nil)
	recOptions := httptest.NewRecorder()
	mw.ServeHTTP(recOptions, reqOptions)
	if recOptions.Code != http.StatusOK {
		t.Fatalf("expected 200 for OPTIONS, got %d", recOptions.Code)
	}

	// 5. /metrics -> MUST BE REJECTED (401) without key
	reqMetrics := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	recMetrics := httptest.NewRecorder()
	mw.ServeHTTP(recMetrics, reqMetrics)
	if recMetrics.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for private /metrics without key, got %d", recMetrics.Code)
	}
}

func TestAPIKeyAuth_MissingKeyFailsClosed(t *testing.T) {
	repo := storage.NewMemoryRepository()
	cfg := &config.Config{Environment: "production"}

	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := APIKeyAuth(repo, cfg)(dummyHandler)

	protectedRoutes := []string{
		"/v1/api-keys",
		"/v1/payment-intents",
		"/v1/payments/execute",
		"/v1/payments/authorize",
		"/v1/system/pause",
		"/v1/system/resume",
		"/v1/treasury/reservations",
		"/v1/agents",
		"/metrics",
	}

	for _, route := range protectedRoutes {
		req := httptest.NewRequest(http.MethodPost, route, nil)
		rec := httptest.NewRecorder()
		mw.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Errorf("route %s: expected 401 Unauthorized, got %d", route, rec.Code)
		}

		var errResp authErrorResponse
		if err := json.NewDecoder(rec.Body).Decode(&errResp); err != nil {
			t.Errorf("route %s: failed to decode error response: %v", route, err)
		}
		if errResp.Error.Code != "UNAUTHORIZED" {
			t.Errorf("route %s: expected code UNAUTHORIZED, got %s", route, errResp.Error.Code)
		}
	}
}

func TestAPIKeyAuth_InvalidAndRevokedAndExpired(t *testing.T) {
	repo := storage.NewMemoryRepository()
	cfg := &config.Config{Environment: "production"}

	ctx := context.Background()

	// Seed an active key
	secretActive, activeKey, _ := auth.GenerateAPIKey("org_test", "Active Key", []string{domain.ScopePaymentsCreate})
	_ = repo.SaveAPIKey(ctx, &storage.APIKey{
		ID:             activeKey.ID,
		OrganizationID: activeKey.OrganizationID,
		KeyHash:        activeKey.KeyHash,
		Name:           activeKey.Name,
		MaskedKey:      activeKey.MaskedKey,
		Scopes:         "payments:create",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	// Seed a revoked key
	secretRevoked, revokedKey, _ := auth.GenerateAPIKey("org_test", "Revoked Key", []string{domain.ScopePaymentsCreate})
	_ = repo.SaveAPIKey(ctx, &storage.APIKey{
		ID:             revokedKey.ID,
		OrganizationID: revokedKey.OrganizationID,
		KeyHash:        revokedKey.KeyHash,
		Name:           revokedKey.Name,
		MaskedKey:      revokedKey.MaskedKey,
		Scopes:         "payments:create",
		Status:         string(domain.APIKeyStatusRevoked),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	// Seed an expired key
	expiredTime := time.Now().Add(-1 * time.Hour)
	secretExpired, expiredKey, _ := auth.GenerateAPIKey("org_test", "Expired Key", []string{domain.ScopePaymentsCreate})
	_ = repo.SaveAPIKey(ctx, &storage.APIKey{
		ID:             expiredKey.ID,
		OrganizationID: expiredKey.OrganizationID,
		KeyHash:        expiredKey.KeyHash,
		Name:           expiredKey.Name,
		MaskedKey:      expiredKey.MaskedKey,
		Scopes:         "payments:create",
		Status:         string(domain.APIKeyStatusActive),
		ExpiresAt:      &expiredTime,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	mw := APIKeyAuth(repo, cfg)(dummyHandler)

	tests := []struct {
		name       string
		authHeader string
		wantCode   int
		wantMsg    string
	}{
		{
			name:       "Invalid key prefix format",
			authHeader: "Bearer invalid_prefix_key_12345",
			wantCode:   http.StatusUnauthorized,
			wantMsg:    "Invalid API key format",
		},
		{
			name:       "Unknown key not found in repository",
			authHeader: "Bearer ap_live_0000000000000000000000000000000000000000000000000000000000000000",
			wantCode:   http.StatusUnauthorized,
			wantMsg:    "Invalid API key",
		},
		{
			name:       "Revoked key rejected",
			authHeader: "Bearer " + secretRevoked,
			wantCode:   http.StatusUnauthorized,
			wantMsg:    "API key has been revoked",
		},
		{
			name:       "Expired key rejected",
			authHeader: "Bearer " + secretExpired,
			wantCode:   http.StatusUnauthorized,
			wantMsg:    "API key has expired",
		},
		{
			name:       "Valid active key accepted",
			authHeader: "Bearer " + secretActive,
			wantCode:   http.StatusOK,
		},
		{
			name:       "Valid active key via X-API-Key header",
			authHeader: secretActive,
			wantCode:   http.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/v1/payment-intents", nil)
			if tc.name == "Valid active key via X-API-Key header" {
				req.Header.Set("X-API-Key", tc.authHeader)
			} else {
				req.Header.Set("Authorization", tc.authHeader)
			}
			rec := httptest.NewRecorder()
			mw.ServeHTTP(rec, req)

			if rec.Code != tc.wantCode {
				t.Fatalf("expected code %d, got %d (body: %s)", tc.wantCode, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestAPIKeyAuth_BootstrapKey(t *testing.T) {
	repo := storage.NewMemoryRepository()
	cfg := &config.Config{
		Environment:     "production",
		BootstrapAPIKey: "ap_live_bootstrap_super_secret_admin_token_12345",
	}

	var capturedOrg string
	var capturedScopes []string
	var capturedAuth bool

	inspectHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedOrg = GetOrgID(r.Context())
		capturedScopes = GetScopes(r.Context())
		capturedAuth = IsAuthenticated(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	mw := APIKeyAuth(repo, cfg)(inspectHandler)

	req := httptest.NewRequest(http.MethodPost, "/v1/api-keys", nil)
	req.Header.Set("Authorization", "Bearer ap_live_bootstrap_super_secret_admin_token_12345")
	rec := httptest.NewRecorder()
	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid bootstrap key, got %d", rec.Code)
	}
	if !capturedAuth {
		t.Fatal("expected IsAuthenticated = true")
	}
	if capturedOrg != "org_default" {
		t.Fatalf("expected org_default, got %q", capturedOrg)
	}
	if !auth.HasScope(capturedScopes, domain.ScopeAdmin) {
		t.Fatalf("expected bootstrap key to have admin scope, got %v", capturedScopes)
	}
}

func TestAPIKeyAuth_ProductionMissingRepoFailsClosed(t *testing.T) {
	cfg := &config.Config{
		Environment: "production",
	}

	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// repo == nil in production
	mw := APIKeyAuth(nil, cfg)(dummyHandler)

	req := httptest.NewRequest(http.MethodPost, "/v1/payment-intents", nil)
	req.Header.Set("Authorization", "Bearer ap_live_some_valid_looking_key_1234567890")
	rec := httptest.NewRecorder()
	mw.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 Internal Server Error when repo is nil in production, got %d", rec.Code)
	}

	var errResp authErrorResponse
	_ = json.NewDecoder(rec.Body).Decode(&errResp)
	if errResp.Error.Code != "AUTH_UNAVAILABLE" {
		t.Fatalf("expected error code AUTH_UNAVAILABLE, got %s", errResp.Error.Code)
	}
}

func TestRequireScope(t *testing.T) {
	tests := []struct {
		name          string
		userScopes    []string
		requiredScope string
		wantCode      int
	}{
		{
			name:          "Matching exact scope -> OK",
			userScopes:    []string{domain.ScopePaymentsCreate},
			requiredScope: domain.ScopePaymentsCreate,
			wantCode:      http.StatusOK,
		},
		{
			name:          "ScopeAdmin satisfies any scope -> OK",
			userScopes:    []string{domain.ScopeAdmin},
			requiredScope: domain.ScopeEmergencyManage,
			wantCode:      http.StatusOK,
		},
		{
			name:          "Wildcard * satisfies any scope -> OK",
			userScopes:    []string{"*"},
			requiredScope: domain.ScopeTreasuryManage,
			wantCode:      http.StatusOK,
		},
		{
			name:          "Insufficient scope -> 403 Forbidden",
			userScopes:    []string{domain.ScopePaymentsRead},
			requiredScope: domain.ScopePaymentsCreate,
			wantCode:      http.StatusForbidden,
		},
		{
			name:          "No scopes -> 403 Forbidden",
			userScopes:    nil,
			requiredScope: domain.ScopePaymentsCreate,
			wantCode:      http.StatusForbidden,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			handler := RequireScope(tc.requiredScope)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest(http.MethodPost, "/test", nil)
			ctx := context.WithValue(req.Context(), ScopesKey, tc.userScopes)
			req = req.WithContext(ctx)

			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tc.wantCode {
				t.Fatalf("expected %d, got %d", tc.wantCode, rec.Code)
			}
		})
	}
}
