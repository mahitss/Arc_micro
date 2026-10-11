package middleware

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/auth"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

type authContextKey string

const (
	OrgIDKey         authContextKey = "auth_org_id"
	KeyIDKey         authContextKey = "auth_key_id"
	ScopesKey        authContextKey = "auth_scopes"
	AuthenticatedKey authContextKey = "auth_authenticated"
)

// GetOrgID extracts the organization ID from request context.
// Returns empty string if unauthenticated or not present (never falls back to org_default).
func GetOrgID(ctx context.Context) string {
	if val, ok := ctx.Value(OrgIDKey).(string); ok && val != "" {
		return val
	}
	return ""
}

// GetKeyID extracts the authenticated API key ID.
func GetKeyID(ctx context.Context) string {
	if val, ok := ctx.Value(KeyIDKey).(string); ok {
		return val
	}
	return ""
}

// GetScopes extracts the granted scopes from request context.
func GetScopes(ctx context.Context) []string {
	if val, ok := ctx.Value(ScopesKey).([]string); ok {
		return val
	}
	return nil
}

// IsAuthenticated checks if the request was authenticated with a valid API key.
func IsAuthenticated(ctx context.Context) bool {
	if val, ok := ctx.Value(AuthenticatedKey).(bool); ok {
		return val
	}
	return false
}

// ResolveTenantOrg resolves the authoritative organization ID for the request.
// If the caller is not authenticated, returns ("", false).
// If requestedOrg is empty or matches the authenticated org, returns (authOrgID, true).
// If requestedOrg != authOrgID, returns requestedOrg only if caller has ScopeAdmin;
// otherwise returns ("", false) indicating forbidden cross-organization access.
func ResolveTenantOrg(ctx context.Context, requestedOrg string) (string, bool) {
	authOrgID := GetOrgID(ctx)
	if authOrgID == "" {
		return "", false
	}
	requestedOrg = strings.TrimSpace(requestedOrg)
	if requestedOrg == "" || requestedOrg == authOrgID {
		return authOrgID, true
	}
	// Cross-tenant access requested: only allowed with ScopeAdmin or wildcard
	scopes := GetScopes(ctx)
	if auth.HasScope(scopes, domain.ScopeAdmin) {
		return requestedOrg, true
	}
	return "", false
}

// isPublicEndpoint checks if a request path is an explicitly allowlisted public endpoint.
// Only /health and /ready are public. /metrics is private and requires authentication.
func isPublicEndpoint(path string) bool {
	cleaned := strings.TrimRight(strings.ToLower(strings.TrimSpace(path)), "/")
	if cleaned == "" {
		cleaned = "/"
	}
	return cleaned == "/health" || cleaned == "/ready"
}

// APIKeyAuth validates API keys presented in Authorization (Bearer ...) or X-API-Key headers.
// Fail-closed: missing, invalid, expired, or revoked keys receive HTTP 401.
// In production, missing authentication repositories fail closed immediately.
func APIKeyAuth(repo storage.Repository, cfg ...*config.Config) func(http.Handler) http.Handler {
	var gatewayCfg *config.Config
	if len(cfg) > 0 {
		gatewayCfg = cfg[0]
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID := GetRequestID(r.Context())

			// 1. CORS Preflight OPTIONS requests pass through
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			// 2. Allowlisted public endpoints (/health, /ready) pass through without credentials
			if isPublicEndpoint(r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			// Extract API key from Authorization: Bearer <key> or X-API-Key: <key>
			var apiKeySecret string
			authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
			if strings.HasPrefix(authHeader, "Bearer ") {
				apiKeySecret = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
			} else if xKey := strings.TrimSpace(r.Header.Get("X-API-Key")); xKey != "" {
				apiKeySecret = xKey
			}

			// 3. Fail closed if authentication backend is missing/misconfigured in production
			isProd := gatewayCfg != nil && (strings.EqualFold(gatewayCfg.Environment, "production") || gatewayCfg.EnableLiveExecution)
			if repo == nil {
				if isProd {
					writeAuthError(w, http.StatusInternalServerError, "AUTH_UNAVAILABLE", "Authentication configuration unavailable; failing closed in production", reqID)
					return
				}
				if apiKeySecret == "" {
					writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API key required. Provide via 'Authorization: Bearer <key>' or 'X-API-Key' header.", reqID)
					return
				}
			}

			// 4. Missing API key on protected routes must receive HTTP 401
			if apiKeySecret == "" {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API key required. Provide via 'Authorization: Bearer <key>' or 'X-API-Key' header.", reqID)
				return
			}

			// 5. Bootstrap Admin API Key verification (constant-time comparison)
			if gatewayCfg != nil && strings.TrimSpace(gatewayCfg.BootstrapAPIKey) != "" {
				if subtle.ConstantTimeCompare([]byte(apiKeySecret), []byte(strings.TrimSpace(gatewayCfg.BootstrapAPIKey))) == 1 {
					ctx := context.WithValue(r.Context(), OrgIDKey, "org_default")
					ctx = context.WithValue(ctx, KeyIDKey, "key_bootstrap_admin")
					ctx = context.WithValue(ctx, ScopesKey, []string{domain.ScopeAdmin, "*"})
					ctx = context.WithValue(ctx, AuthenticatedKey, true)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}

			// 6. Validate key secret format
			if !strings.HasPrefix(apiKeySecret, auth.KeyPrefixLive) && !strings.HasPrefix(apiKeySecret, auth.KeyPrefixDemo) {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid API key format", reqID)
				return
			}

			if repo == nil {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid API key", reqID)
				return
			}

			// 7. Compute SHA-256 hash of secret and verify against repository
			keyHash := auth.HashSecret(apiKeySecret)
			key, err := repo.GetAPIKeyByHash(r.Context(), keyHash)
			if err != nil {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid API key", reqID)
				return
			}

			// 8. Check key status
			if key.Status == string(domain.APIKeyStatusRevoked) {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API key has been revoked", reqID)
				return
			}
			if key.Status != string(domain.APIKeyStatusActive) {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API key is not active", reqID)
				return
			}

			// 9. Check expiration if set
			if key.ExpiresAt != nil && time.Now().UTC().After(*key.ExpiresAt) {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API key has expired", reqID)
				return
			}

			// 10. Update last_used_at asynchronously
			go func() {
				_ = repo.UpdateAPIKeyLastUsed(context.Background(), key.ID, time.Now().UTC())
			}()

			// 11. Parse assigned scopes
			var scopes []string
			if key.Scopes != "" {
				for _, s := range strings.Split(key.Scopes, ",") {
					s = strings.TrimSpace(s)
					if s != "" {
						scopes = append(scopes, s)
					}
				}
			}

			// 12. Attach organization, key ID, scopes, and authenticated flag to context
			ctx := context.WithValue(r.Context(), OrgIDKey, key.OrganizationID)
			ctx = context.WithValue(ctx, KeyIDKey, key.ID)
			ctx = context.WithValue(ctx, ScopesKey, scopes)
			ctx = context.WithValue(ctx, AuthenticatedKey, true)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAuth enforces that a valid API key was provided.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := GetRequestID(r.Context())
		if !IsAuthenticated(r.Context()) {
			writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API key required. Provide via 'Authorization: Bearer <key>' or 'X-API-Key' header.", reqID)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireScope enforces that the caller has the required scope.
func RequireScope(requiredScope string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID := GetRequestID(r.Context())
			scopes := GetScopes(r.Context())
			if !auth.HasScope(scopes, requiredScope) {
				writeAuthError(w, http.StatusForbidden, "FORBIDDEN", "Insufficient scope: required "+requiredScope, reqID)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

type authErrorResponse struct {
	Error struct {
		Code      string `json:"code"`
		Message   string `json:"message"`
		RequestID string `json:"request_id,omitempty"`
	} `json:"error"`
}

func writeAuthError(w http.ResponseWriter, status int, code, message, reqID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	var resp authErrorResponse
	resp.Error.Code = code
	resp.Error.Message = message
	resp.Error.RequestID = reqID
	_ = json.NewEncoder(w).Encode(resp)
}
