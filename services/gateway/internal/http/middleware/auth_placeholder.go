package middleware

import (
	"net/http"
)

// AuthPlaceholder is an architectural placeholder for future agent authentication.
// Currently passes requests through, establishing the boundary where API key verification,
// JWT validation, or agent signature checks will be enforced before reaching handlers.
func AuthPlaceholder(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Future: Validate Authorization header, API keys, or cryptographic agent signatures
		next.ServeHTTP(w, r)
	})
}
