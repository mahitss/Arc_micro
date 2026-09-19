package http

import (
	"net/http"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/health"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/handlers"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
)

// NewRouter sets up and returns the HTTP mux with middleware pipeline for the Gateway.
func NewRouter(cfg *config.Config, policyClient policy.Client) http.Handler {
	mux := http.NewServeMux()

	// 1. Health & Readiness
	mux.HandleFunc("GET /health", health.Handler)
	mux.Handle("GET /ready", handlers.NewReadyHandler(policyClient))

	// 2. V1 Authorization API
	mux.Handle("POST /v1/payments/authorize", handlers.NewAuthorizeHandler(policyClient))

	// Compose middleware chain:
	// Outermost -> Innermost: Recovery -> RequestID -> CORS -> Logger -> BodyLimit -> AuthPlaceholder -> Mux
	var handler http.Handler = mux
	handler = middleware.AuthPlaceholder(handler)
	handler = middleware.BodyLimit(cfg.MaxRequestBodyBytes)(handler)
	handler = middleware.Logger(handler)
	handler = middleware.CORS(cfg.CORSAllowedOrigins)(handler)
	handler = middleware.RequestID(handler)
	handler = middleware.Recovery(handler)

	return handler
}
