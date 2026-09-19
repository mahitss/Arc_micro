package middleware

import (
	"encoding/json"
	"log"
	"net/http"
	"runtime/debug"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

// Recovery recovers from panics, logs the error, and returns a normalized 500 error response.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				reqID := GetRequestID(r.Context())
				log.Printf("[PANIC RECOVERED] req_id=%s panic=%v\nstack:\n%s", reqID, rec, string(debug.Stack()))

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				resp := domain.ErrorResponse{
					Error: domain.ErrorDetail{
						Code:    "INTERNAL_SERVER_ERROR",
						Message: "An unexpected internal server error occurred.",
					},
					RequestID: reqID,
				}
				_ = json.NewEncoder(w).Encode(resp)
			}
		}()

		next.ServeHTTP(w, r)
	})
}
