package http

import (
	"net/http"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/agent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/economy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/emergency"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/health"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/handlers"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/metrics"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/service"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/trace"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/webhook"
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

	// 1. Health, Readiness & Metrics
	mux.HandleFunc("GET /health", health.Handler)
	var bc blockchain.Client
	if bcp, ok := execService.(interface{ BlockchainClient() blockchain.Client }); ok {
		bc = bcp.BlockchainClient()
	}
	mux.Handle("GET /ready", handlers.NewReadyHandler(policyClient, bc, repo))
	mux.HandleFunc("GET /metrics", metrics.DefaultMetrics.Handler)

	// 2. V1 Authorization API
	mux.Handle("POST /v1/payments/authorize", handlers.NewAuthorizeHandler(policyClient))

	// 3. V1 Payment Execution API (Protected by Rust authorization)
	if execService != nil {
		mux.Handle("POST /v1/payments/execute", handlers.NewExecuteHandler(policyClient, execService))
	}

	// 4. V1 AI Agent Task API
	if agentService != nil {
		if repo != nil {
			agentService.SetRepository(repo)
		}
		agentHandler := handlers.NewAgentTasksHandler(agentService)
		mux.Handle("POST /v1/agents/tasks", agentHandler)
		mux.HandleFunc("GET /v1/agents/tasks/{id}", agentHandler.HandleGetTask)
	}

	// 5. V1 Payment Intent API
	if intentService != nil {
		piHandler := handlers.NewPaymentIntentsHandler(intentService)
		if repo != nil {
			var explorerURL string
			var chainID string
			if cfg != nil {
				explorerURL = cfg.ArcExplorerURL
				chainID = cfg.ArcChainID
			}
			traceService := trace.NewService(repo, chainID, explorerURL)
			piHandler.SetTraceService(traceService)
		}
		mux.HandleFunc("POST /v1/payment-intents", piHandler.HandleCreate)
		mux.HandleFunc("GET /v1/payment-intents/{id}", piHandler.HandleGet)
		mux.HandleFunc("GET /v1/payment-intents/{id}/trace", piHandler.HandleGetTrace)
		mux.HandleFunc("POST /v1/payment-intents/{id}/authorize", piHandler.HandleAuthorize)
		mux.HandleFunc("POST /v1/payment-intents/{id}/confirm", piHandler.HandleConfirm)
	}

	// 5.5 Autonomous Economy Engine & Mission APIs
	if repo != nil {
		repMgr := economy.NewReputationManager()
		agentCoord := economy.NewAgentCoordinator(reg)
		planner := economy.NewPlanner()
		econEngine := economy.NewEconomyEngine(nil)
		budgetCtrl := economy.NewBudgetController(repo, reg, policyClient)
		missionSvc := economy.NewMissionService(repo, reg, planner, econEngine, budgetCtrl, repMgr, agentCoord, intentService, policyClient)
		missionHandler := handlers.NewMissionsHandler(missionSvc, reg, repMgr, agentCoord)

		mux.HandleFunc("POST /v1/missions", missionHandler.HandleCreate)
		mux.HandleFunc("GET /v1/missions", missionHandler.HandleList)
		mux.HandleFunc("GET /v1/missions/{id}", missionHandler.HandleGet)
		mux.HandleFunc("POST /v1/missions/{id}/start", missionHandler.HandleStart)
		mux.HandleFunc("POST /v1/missions/{id}/cancel", missionHandler.HandleCancel)
		mux.HandleFunc("POST /v1/missions/simulate", missionHandler.HandleSimulate)
		mux.HandleFunc("GET /v1/missions/{id}/trace", missionHandler.HandleGetTrace)
		mux.HandleFunc("GET /v1/marketplace", missionHandler.HandleMarketplace)
		mux.HandleFunc("GET /v1/economy/reputation", missionHandler.HandleReputation)
	}

	// 6. V1 Query & List APIs for Web Control Center
	if repo != nil {
		listHandler := handlers.NewListHandler(repo, reg)
		mux.HandleFunc("GET /v1/agents", listHandler.HandleListAgents)
		mux.HandleFunc("GET /v1/agents/{id}", listHandler.HandleGetAgent)
		mux.HandleFunc("GET /v1/agent-budgets/{id}", listHandler.HandleGetAgentBudget)
		mux.HandleFunc("GET /v1/services", listHandler.HandleListServices)
		mux.HandleFunc("GET /v1/payment-intents", listHandler.HandleListIntents)
		mux.HandleFunc("GET /v1/transactions", listHandler.HandleListTransactions)

		// Day 8: Quotes & Simulation Handlers
		quoteHandler := handlers.NewQuoteHandler(reg)
		mux.HandleFunc("POST /v1/services/{id}/quote", quoteHandler.HandleCreateQuote)

		ts := treasury.NewTreasuryService(repo, nil)
		simHandler := handlers.NewSimulationHandler(policyClient, reg, ts)
		mux.HandleFunc("POST /v1/simulations", simHandler.HandleSimulate)

		// 7. Day 3: Approvals Control Plane
		ds := service.NewDomainService(repo)
		appHandler := handlers.NewApprovalsHandler(repo, ds)
		mux.HandleFunc("GET /v1/approvals", appHandler.HandleList)
		mux.HandleFunc("GET /v1/approvals/{id}", appHandler.HandleGet)
		mux.HandleFunc("POST /v1/approvals/{id}/approve", appHandler.HandleApprove)
		mux.HandleFunc("POST /v1/approvals/{id}/reject", appHandler.HandleReject)

		// 8. Day 3: Multi-Tier Emergency Controls (Agent, Org, Global Kill Switch)
		em := emergency.NewController(repo)
		emHandler := handlers.NewEmergencyHandler(em)
		mux.HandleFunc("POST /v1/agents/{id}/pause", emHandler.HandlePauseAgent)
		mux.HandleFunc("POST /v1/agents/{id}/resume", emHandler.HandleResumeAgent)
		mux.HandleFunc("POST /v1/organizations/{id}/pause", emHandler.HandlePauseOrganization)
		mux.HandleFunc("POST /v1/organizations/{id}/resume", emHandler.HandleResumeOrganization)
		mux.HandleFunc("POST /v1/system/pause", emHandler.HandlePauseGlobal)
		mux.HandleFunc("POST /v1/system/resume", emHandler.HandleResumeGlobal)
		mux.HandleFunc("GET /v1/system/status", emHandler.HandleSystemStatus)

		// 9. Day 3: Treasury Model & Reservations
		treasuryHandler := handlers.NewTreasuryHandler(ts)
		mux.HandleFunc("GET /v1/treasury/summary", treasuryHandler.HandleSummary)

		// 10. Day 5: Developer API Key Management
		apiKeyHandler := handlers.NewAPIKeyHandler(repo)
		mux.HandleFunc("POST /v1/api-keys", apiKeyHandler.HandleCreate)
		mux.HandleFunc("GET /v1/api-keys", apiKeyHandler.HandleList)
		mux.HandleFunc("DELETE /v1/api-keys/{id}", apiKeyHandler.HandleRevoke)

		// 11. Day 6: Webhook & Event Infrastructure
		allowLocalhost := cfg != nil && cfg.AllowLocalhostWebhooks
		validator := webhook.NewSSRFValidator(allowLocalhost)
		dispatcher := webhook.NewDispatcher(repo, validator, nil)

		webhookHandler := handlers.NewWebhookHandler(repo, dispatcher, validator)
		mux.HandleFunc("POST /v1/webhooks", webhookHandler.HandleCreate)
		mux.HandleFunc("GET /v1/webhooks", webhookHandler.HandleList)
		mux.HandleFunc("GET /v1/webhooks/{id}", webhookHandler.HandleGet)
		mux.HandleFunc("PATCH /v1/webhooks/{id}", webhookHandler.HandleUpdate)
		mux.HandleFunc("DELETE /v1/webhooks/{id}", webhookHandler.HandleDelete)
		mux.HandleFunc("GET /v1/webhooks/{id}/deliveries", webhookHandler.HandleListDeliveries)
		mux.HandleFunc("POST /v1/webhooks/{id}/test", webhookHandler.HandleTest)

		eventHandler := handlers.NewEventHandler(repo)
		mux.HandleFunc("GET /v1/events", eventHandler.HandleList)
		mux.HandleFunc("GET /v1/events/{id}", eventHandler.HandleGet)

		// 12. Day 7: Adversarial Security Lab Control Plane
		securityLabHandler := handlers.NewSecurityLabHandler(nil)
		mux.HandleFunc("GET /v1/security-lab/report", securityLabHandler.HandleGetReport)
		mux.HandleFunc("POST /v1/security-lab/run", securityLabHandler.HandleRunSuite)

		// Wire Execution Gate, Treasury, and Event Dispatcher into Intent Service if available
		if intentService != nil {
			intentService.SetExecutionGate(execution.NewExecutionGate(repo, em, nil))
			intentService.SetTreasuryService(ts)
			intentService.SetEventDispatcher(dispatcher)
		}
	}

	// Compose middleware chain:
	// Outermost -> Innermost: Recovery -> RequestID -> CORS -> Logger -> RateLimiter -> BodyLimit -> APIKeyAuth -> Mux
	rateLimiter := middleware.NewRateLimiter(60, 100)

	var handler http.Handler = mux
	if repo != nil {
		handler = middleware.APIKeyAuth(repo)(handler)
	} else {
		handler = middleware.AuthPlaceholder(handler)
	}
	handler = middleware.BodyLimit(cfg.MaxRequestBodyBytes)(handler)
	handler = rateLimiter.Middleware(handler)
	handler = middleware.Logger(handler)
	handler = middleware.CORS(cfg.CORSAllowedOrigins)(handler)
	handler = middleware.RequestID(handler)
	handler = middleware.Recovery(handler)

	return handler
}
