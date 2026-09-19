package http

import (
	"net/http"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/agent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/health"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/handlers"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// NewRouter sets up and returns the HTTP mux with middleware pipeline for the Gateway.
func NewRouter(
	cfg *config.Config,
	policyClient policy.Client,
	execService execution.Service,
	agentService *agent.Service,
	intentService *intent.Service,
	repo storage.Repository,
	reg *registry.Registry,
) http.Handler {
	mux := http.NewServeMux()

	// 1. Health & Readiness
	mux.HandleFunc("GET /health", health.Handler)
	mux.Handle("GET /ready", handlers.NewReadyHandler(policyClient))

	// 2. V1 Authorization API
	mux.Handle("POST /v1/payments/authorize", handlers.NewAuthorizeHandler(policyClient))

	// 3. V1 Payment Execution API (Protected by Rust authorization)
	if execService != nil {
		mux.Handle("POST /v1/payments/execute", handlers.NewExecuteHandler(policyClient, execService))
	}

	// 4. V1 AI Agent Task API
	if agentService != nil {
		mux.Handle("POST /v1/agents/tasks", handlers.NewAgentTasksHandler(agentService))
	}

	// 5. V1 Payment Intent API
	if intentService != nil {
		piHandler := handlers.NewPaymentIntentsHandler(intentService)
		mux.HandleFunc("GET /v1/payment-intents/{id}", piHandler.HandleGet)
		mux.HandleFunc("POST /v1/payment-intents/{id}/authorize", piHandler.HandleAuthorize)
		mux.HandleFunc("POST /v1/payment-intents/{id}/confirm", piHandler.HandleConfirm)
	}

	// 6. V1 Query & List APIs for Web Control Center
	if repo != nil {
		listHandler := handlers.NewListHandler(repo, reg)
		mux.HandleFunc("GET /v1/agents", listHandler.HandleListAgents)
		mux.HandleFunc("GET /v1/agents/{id}", listHandler.HandleGetAgent)
		mux.HandleFunc("GET /v1/services", listHandler.HandleListServices)
		mux.HandleFunc("GET /v1/payment-intents", listHandler.HandleListIntents)
		mux.HandleFunc("GET /v1/transactions", listHandler.HandleListTransactions)
	}

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
