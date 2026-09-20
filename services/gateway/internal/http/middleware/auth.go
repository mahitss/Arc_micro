package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/auth"
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

// GetOrgID extracts the organization ID from request context, defaulting to "org_default".
func GetOrgID(ctx context.Context) string {
	if val, ok := ctx.Value(OrgIDKey).(string); ok && val != "" {
		return val
	}
	return "org_default"
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

// APIKeyAuth validates API keys presented in Authorization (Bearer ...) or X-API-Key headers.
func APIKeyAuth(repo storage.Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID := GetRequestID(r.Context())

			// Extract API key from Authorization: Bearer <key> or X-API-Key: <key>
			var apiKeySecret string
			authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
			if strings.HasPrefix(authHeader, "Bearer ") {
				apiKeySecret = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
			} else if xKey := strings.TrimSpace(r.Header.Get("X-API-Key")); xKey != "" {
				apiKeySecret = xKey
			}

			// If no key provided, pass along with unauthenticated context
			if apiKeySecret == "" {
				ctx := context.WithValue(r.Context(), OrgIDKey, "org_default")
				ctx = context.WithValue(ctx, ScopesKey, []string{"*"})
				ctx = context.WithValue(ctx, AuthenticatedKey, false)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Validate key secret format
			if !strings.HasPrefix(apiKeySecret, auth.KeyPrefixLive) && !strings.HasPrefix(apiKeySecret, auth.KeyPrefixDemo) {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid API key format", reqID)
				return
			}

			// Compute SHA-256 hash of secret
			keyHash := auth.HashSecret(apiKeySecret)

			// Look up key in repository
			key, err := repo.GetAPIKeyByHash(r.Context(), keyHash)
			if err != nil {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid API key", reqID)
				return
			}

			// Check key status
			if key.Status == string(domain.APIKeyStatusRevoked) {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API key has been revoked", reqID)
				return
			}
			if key.Status != string(domain.APIKeyStatusActive) {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API key is not active", reqID)
				return
			}

			// Check expiration if set
			if key.ExpiresAt != nil && time.Now().UTC().After(*key.ExpiresAt) {
				writeAuthError(w, http.StatusUnauthorized, "UNAUTHORIZED", "API key has expired", reqID)
				return
			}

			// Update last_used_at asynchronously
			go func() {
				_ = repo.UpdateAPIKeyLastUsed(context.Background(), key.ID, time.Now().UTC())
			}()

			// Parse comma-separated scopes
			var scopes []string
			if key.Scopes != "" {
				for _, s := range strings.Split(key.Scopes, ",") {
					s = strings.TrimSpace(s)
					if s != "" {
						scopes = append(scopes, s)
					}
				}
			}

			// Attach organization, key ID, scopes, and authenticated flag to context
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
