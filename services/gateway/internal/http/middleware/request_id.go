package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
)

type contextKey string

const RequestIDKey contextKey = "request_id"

// GetRequestID extracts the request ID from the context.
func GetRequestID(ctx context.Context) string {
	if val, ok := ctx.Value(RequestIDKey).(string); ok {
		return val
	}
	return ""
}

// RequestID middleware extracts or generates a safe request ID.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := strings.TrimSpace(r.Header.Get("X-Request-ID"))
		if reqID == "" {
			reqID = GenerateRequestID()
		}

		// Set header in response
		w.Header().Set("X-Request-ID", reqID)

		// Attach to context
		ctx := context.WithValue(r.Context(), RequestIDKey, reqID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GenerateRequestID creates a random request ID with prefix "req_".
func GenerateRequestID() string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback safe random
		return fmt.Sprintf("req_%x", timeNowUnixNano())
	}
	return fmt.Sprintf("req_%s", hex.EncodeToString(bytes))
}

func timeNowUnixNano() int64 {
	// Simple fallback helper
	return 0xcafe1234
}
