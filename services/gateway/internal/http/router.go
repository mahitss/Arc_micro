package http

import (
	"net/http"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/agent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/clearinghouse"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/constitution"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/control"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/economy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/emergency"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/fabric"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/health"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/handlers"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/marketplace"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/metrics"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/network"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/operations"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/protocol"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/runtime"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/service"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/simulation"
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

		// 5.6 Agent-to-Agent (A2A) Economic Network APIs
		agentEconHandler := handlers.NewAgentEconomyHandler(missionSvc)
		mux.HandleFunc("GET /v1/agents/discover", agentEconHandler.HandleDiscoverAgents)
		mux.HandleFunc("GET /v1/agents/services/{id}", agentEconHandler.HandleGetAgentServices)
		mux.HandleFunc("GET /v1/agent-services/{id}", agentEconHandler.HandleGetAgentServices)
		mux.HandleFunc("POST /v1/agent-services/{id}/quotes", agentEconHandler.HandleCreateQuote)
		mux.HandleFunc("GET /v1/quotes/{id}", agentEconHandler.HandleGetQuote)
		mux.HandleFunc("POST /v1/quotes/{id}/accept", agentEconHandler.HandleAcceptQuote)
		mux.HandleFunc("POST /v1/quotes/{id}/reject", agentEconHandler.HandleRejectQuote)
		mux.HandleFunc("POST /v1/quotes/{id}/counter", agentEconHandler.HandleCounterQuote)
		mux.HandleFunc("POST /v1/hires", agentEconHandler.HandleCreateHire)
		mux.HandleFunc("GET /v1/hires/{id}", agentEconHandler.HandleGetHire)
		mux.HandleFunc("POST /v1/hires/{id}/cancel", agentEconHandler.HandleCancelHire)
		mux.HandleFunc("POST /v1/hires/{id}/result", agentEconHandler.HandleSubmitResult)
		mux.HandleFunc("GET /v1/missions/{id}/economic-graph", agentEconHandler.HandleGetEconomicGraph)
		mux.HandleFunc("GET /v1/missions/{id}/hires", agentEconHandler.HandleListMissionHires)

		// 5.7 AgentPay Intelligence Layer APIs
		intelHandler := handlers.NewIntelligenceHandler(missionSvc)
		mux.HandleFunc("GET /v1/services/{id}/performance", intelHandler.HandleGetServicePerformance)
		mux.HandleFunc("GET /v1/services/{id}/reputation", intelHandler.HandleGetServiceReputation)
		mux.HandleFunc("GET /v1/services/{id}/anomalies", intelHandler.HandleGetServiceAnomalies)
		mux.HandleFunc("GET /v1/missions/{id}/observations", intelHandler.HandleGetMissionObservations)
		mux.HandleFunc("GET /v1/missions/{id}/recommendations", intelHandler.HandleGetMissionRecommendations)
		mux.HandleFunc("POST /v1/missions/{id}/replan", intelHandler.HandleReplanMission)
		mux.HandleFunc("GET /v1/missions/{id}/recovery", intelHandler.HandleGetMissionRecovery)
		mux.HandleFunc("GET /v1/missions/{id}/intelligence", intelHandler.HandleGetMissionIntelligence)

		// 5.8 Multi-Agent Swarm Orchestration Layer APIs (Phase 30)
		swarmValidator := economy.NewSwarmGraphValidator(20, 4)
		swarmPlanner := economy.NewSwarmPlanner(swarmValidator)
		swarmBudgetMgr := economy.NewSwarmBudgetManager()
		hiringSvc := economy.NewHiringService(agentCoord, intentService, budgetCtrl)
		swarmEngine := economy.NewSwarmEngine(
			swarmPlanner,
			swarmValidator,
			swarmBudgetMgr,
			reg,
			agentCoord,
			hiringSvc,
			econEngine,
			intentService,
			policyClient,
			nil,
			nil,
			nil,
		)
		swarmsHandler := handlers.NewSwarmsHandler(swarmEngine, nil)
		mux.HandleFunc("POST /v1/swarms", swarmsHandler.HandleCreate)
		mux.HandleFunc("GET /v1/swarms/{id}", swarmsHandler.HandleGet)
		mux.HandleFunc("POST /v1/swarms/{id}/start", swarmsHandler.HandleStart)
		mux.HandleFunc("POST /v1/swarms/{id}/cancel", swarmsHandler.HandleCancel)
		mux.HandleFunc("POST /v1/swarms/simulate", swarmsHandler.HandleSimulate)
		mux.HandleFunc("GET /v1/swarms/{id}/tasks", swarmsHandler.HandleGetTasks)
		mux.HandleFunc("GET /v1/swarms/{id}/graph", swarmsHandler.HandleGetGraph)
		mux.HandleFunc("GET /v1/swarms/{id}/trace", swarmsHandler.HandleGetTrace)
		mux.HandleFunc("GET /v1/swarms/{id}/risk", swarmsHandler.HandleGetRisk)
		mux.HandleFunc("POST /v1/swarms/{id}/replan", swarmsHandler.HandleReplan)
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
		legacySimHandler := handlers.NewSimulationHandler(policyClient, reg, ts)

		// Economic Simulator & Digital Twin Suite (Phases 0-33)
		snapMgr := simulation.NewSnapshotManager()
		simEngine := simulation.NewSimulationEngine(snapMgr, policyClient)
		cfEngine := simulation.NewCounterfactualEngine(simEngine)
		mcEngine := simulation.NewMonteCarloEngine(simEngine)
		execGate := simulation.NewExecutionGate(snapMgr, simEngine)
		simSuite := handlers.NewSimulationSuiteHandler(simEngine, cfEngine, mcEngine, execGate, snapMgr, reg, legacySimHandler)

		mux.HandleFunc("POST /v1/simulations", simSuite.HandleCreate)
		mux.HandleFunc("GET /v1/simulations", simSuite.HandleList)
		mux.HandleFunc("GET /v1/simulations/{id}", simSuite.HandleGet)
		mux.HandleFunc("POST /v1/simulations/{id}/run", simSuite.HandleRun)
		mux.HandleFunc("POST /v1/simulations/{id}/cancel", simSuite.HandleCancel)
		mux.HandleFunc("GET /v1/simulations/{id}/trace", simSuite.HandleGetTrace)
		mux.HandleFunc("GET /v1/simulations/{id}/economics", simSuite.HandleGetEconomics)
		mux.HandleFunc("GET /v1/simulations/{id}/risk", simSuite.HandleGetRisk)
		mux.HandleFunc("GET /v1/simulations/{id}/plan", simSuite.HandleGetPlan)
		mux.HandleFunc("POST /v1/simulations/{id}/counterfactual", simSuite.HandleCounterfactual)
		mux.HandleFunc("GET /v1/simulations/{id}/comparison", simSuite.HandleComparison)
		mux.HandleFunc("POST /v1/simulations/monte-carlo", simSuite.HandleMonteCarlo)
		mux.HandleFunc("POST /v1/simulations/{id}/execute-plan", simSuite.HandleExecutePlan)

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

		// 9. Day 3 & Task 11: Autonomous Treasury & Liquidity Orchestrator
		treasuryHandler := handlers.NewTreasuryHandler(ts)
		mux.HandleFunc("GET /v1/treasury/summary", treasuryHandler.HandleSummary)
		mux.HandleFunc("GET /v1/treasury/state", treasuryHandler.HandleState)
		mux.HandleFunc("GET /v1/treasury/balance", treasuryHandler.HandleBalance)
		mux.HandleFunc("GET /v1/treasury/reservations", treasuryHandler.HandleListReservations)
		mux.HandleFunc("POST /v1/treasury/reservations", treasuryHandler.HandleCreateReservation)
		mux.HandleFunc("POST /v1/treasury/reservations/{id}/release", treasuryHandler.HandleReleaseReservation)
		mux.HandleFunc("GET /v1/treasury/commitments", treasuryHandler.HandleCommitments)
		mux.HandleFunc("POST /v1/treasury/commitments", treasuryHandler.HandleCommitments)
		mux.HandleFunc("GET /v1/treasury/exposure", treasuryHandler.HandleExposure)
		mux.HandleFunc("GET /v1/treasury/forecast", treasuryHandler.HandleForecast)
		mux.HandleFunc("POST /v1/treasury/stress", treasuryHandler.HandleStress)
		mux.HandleFunc("GET /v1/treasury/reconciliation", treasuryHandler.HandleReconciliation)
		mux.HandleFunc("GET /v1/treasury/anomalies", treasuryHandler.HandleAnomalies)
		mux.HandleFunc("GET /v1/treasury/health", treasuryHandler.HandleHealth)
		mux.HandleFunc("GET /v1/treasury/inflows", treasuryHandler.HandleInflows)
		mux.HandleFunc("POST /v1/treasury/inflows", treasuryHandler.HandleInflows)

		// Also mount under /api/treasury for frontend compatibility
		mux.HandleFunc("GET /api/treasury/summary", treasuryHandler.HandleSummary)
		mux.HandleFunc("GET /api/treasury/state", treasuryHandler.HandleState)
		mux.HandleFunc("GET /api/treasury/balance", treasuryHandler.HandleBalance)
		mux.HandleFunc("GET /api/treasury/reservations", treasuryHandler.HandleListReservations)
		mux.HandleFunc("POST /api/treasury/reservations", treasuryHandler.HandleCreateReservation)
		mux.HandleFunc("POST /api/treasury/reservations/{id}/release", treasuryHandler.HandleReleaseReservation)
		mux.HandleFunc("GET /api/treasury/commitments", treasuryHandler.HandleCommitments)
		mux.HandleFunc("POST /api/treasury/commitments", treasuryHandler.HandleCommitments)
		mux.HandleFunc("GET /api/treasury/exposure", treasuryHandler.HandleExposure)
		mux.HandleFunc("GET /api/treasury/forecast", treasuryHandler.HandleForecast)
		mux.HandleFunc("POST /api/treasury/stress", treasuryHandler.HandleStress)
		mux.HandleFunc("GET /api/treasury/reconciliation", treasuryHandler.HandleReconciliation)
		mux.HandleFunc("GET /api/treasury/anomalies", treasuryHandler.HandleAnomalies)
		mux.HandleFunc("GET /api/treasury/health", treasuryHandler.HandleHealth)
		mux.HandleFunc("GET /api/treasury/inflows", treasuryHandler.HandleInflows)
		mux.HandleFunc("POST /api/treasury/inflows", treasuryHandler.HandleInflows)

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

		// 13. Open Agent Network Subsystem
		allowLocalhostNet := cfg != nil && cfg.AllowLocalhostWebhooks
		manifestValidator := network.NewAgentManifestValidator(allowLocalhostNet)
		trustEvaluator := network.NewTrustEvaluator()
		capRegistry := network.NewCapabilityRegistry()
		discoveryService := network.NewAgentDiscoveryService(repo, manifestValidator, trustEvaluator, capRegistry)
		selectionEngine := network.NewAgentSelectionEngine()
		economicRouter := network.NewEconomicRouter(discoveryService, selectionEngine)
		contractManager := network.NewContractManager(repo)
		paymentBridge := network.NewPaymentBridge(repo, intentService, policyClient, reg)
		resultVerifier := network.NewAgentResultVerifier(repo)
		delegationManager := network.NewDelegationManager(repo)
		disputeManager := network.NewDisputeManager(repo)
		graphService := network.NewNetworkGraphService(repo)

		netHandler := handlers.NewAgentNetworkHandler(
			discoveryService,
			capRegistry,
			economicRouter,
			contractManager,
			paymentBridge,
			resultVerifier,
			delegationManager,
			disputeManager,
			graphService,
			trustEvaluator,
			repo,
		)

		mux.HandleFunc("POST /v1/agent-network/agents/register", netHandler.HandleRegisterAgent)
		mux.HandleFunc("GET /v1/agent-network/agents", netHandler.HandleListAgents)
		mux.HandleFunc("GET /v1/agent-network/agents/{id}", netHandler.HandleGetAgent)
		mux.HandleFunc("POST /v1/agent-network/agents/{id}/manifest", netHandler.HandleUpdateManifest)
		mux.HandleFunc("POST /v1/agent-network/agents/{id}/suspend", netHandler.HandleSuspendAgent)
		mux.HandleFunc("GET /v1/agent-network/capabilities", netHandler.HandleListCapabilities)
		mux.HandleFunc("POST /v1/agent-network/routing/plan", netHandler.HandleRoutePlan)
		mux.HandleFunc("POST /v1/agent-network/contracts", netHandler.HandleCreateContract)
		mux.HandleFunc("GET /v1/agent-network/contracts", netHandler.HandleListContracts)
		mux.HandleFunc("GET /v1/agent-network/contracts/{id}", netHandler.HandleGetContract)
		mux.HandleFunc("POST /v1/agent-network/contracts/{id}/accept", netHandler.HandleAcceptContract)
		mux.HandleFunc("POST /v1/agent-network/contracts/{id}/fund", netHandler.HandleFundContract)
		mux.HandleFunc("POST /v1/agent-network/contracts/{id}/delegate", netHandler.HandleDelegateContract)
		mux.HandleFunc("POST /v1/agent-network/contracts/{id}/verify", netHandler.HandleVerifyResult)
		mux.HandleFunc("POST /v1/agent-network/contracts/{id}/disputes", netHandler.HandleOpenDispute)
		mux.HandleFunc("GET /v1/agent-network/disputes", netHandler.HandleListDisputes)
		mux.HandleFunc("GET /v1/agent-network/disputes/{id}", netHandler.HandleGetDispute)
		mux.HandleFunc("POST /v1/agent-network/disputes/{id}/resolve", netHandler.HandleResolveDispute)
		mux.HandleFunc("GET /v1/agent-network/graph", netHandler.HandleGetGraph)
		mux.HandleFunc("GET /v1/agent-network/trust/{id}", netHandler.HandleGetTrust)

		// 14. Economic Constitution Subsystem
		constitutionStore := constitution.NewMemoryStore()
		constHandler := handlers.NewConstitutionHandler(constitutionStore)
		mux.HandleFunc("GET /v1/constitutions/active", constHandler.HandleGetActive)
		mux.HandleFunc("GET /v1/constitutions", constHandler.HandleList)
		mux.HandleFunc("GET /v1/constitutions/{version}", constHandler.HandleGetByVersion)
		mux.HandleFunc("POST /v1/constitutions", constHandler.HandlePropose)
		mux.HandleFunc("POST /v1/constitutions/evaluate", constHandler.HandleEvaluate)
		mux.HandleFunc("POST /v1/constitutions/diff", constHandler.HandleDiff)
		mux.HandleFunc("POST /v1/constitutions/test", constHandler.HandleTest)
		mux.HandleFunc("POST /v1/constitutions/activate", constHandler.HandleActivate)
		mux.HandleFunc("POST /v1/constitutions/rollback", constHandler.HandleRollback)
		mux.HandleFunc("GET /v1/constitutions/changes", constHandler.HandleListChanges)
		mux.HandleFunc("POST /v1/constitutions/changes/{id}/review", constHandler.HandleReviewChange)

		// 15. Autonomous Economic Clearinghouse Subsystem (Task 10)
		targetVault := "0x1111111111111111111111111111111111111111"
		chainIDStr := "5042"
		if cfg != nil {
			if cfg.AgentVaultAddress != "" {
				targetVault = cfg.AgentVaultAddress
			}
			if cfg.ArcChainID != "" {
				chainIDStr = cfg.ArcChainID
			}
		}
		clearingReconciler := clearinghouse.NewClearingReconciliationEngine(bc, chainIDStr, targetVault)
		settlementRouter := clearinghouse.NewSettlementRouter(intentService, reg, targetVault)
		clearingSvc := clearinghouse.NewClearinghouseService(settlementRouter, ts, clearingReconciler, reg, dispatcher)
		clearingHandler := handlers.NewClearinghouseHandler(clearingSvc)

		// Obligations
		mux.HandleFunc("POST /v1/economy/obligations", clearingHandler.HandleCreateObligation)
		mux.HandleFunc("GET /v1/economy/obligations", clearingHandler.HandleListObligations)
		mux.HandleFunc("GET /v1/economy/obligations/{id}", clearingHandler.HandleGetObligation)
		mux.HandleFunc("POST /v1/economy/obligations/{id}/cancel", clearingHandler.HandleCancelObligation)
		mux.HandleFunc("POST /api/economy/obligations", clearingHandler.HandleCreateObligation)
		mux.HandleFunc("GET /api/economy/obligations", clearingHandler.HandleListObligations)
		mux.HandleFunc("GET /api/economy/obligations/{id}", clearingHandler.HandleGetObligation)
		mux.HandleFunc("POST /api/economy/obligations/{id}/cancel", clearingHandler.HandleCancelObligation)

		// Invoices
		mux.HandleFunc("POST /v1/economy/invoices", clearingHandler.HandleCreateInvoice)
		mux.HandleFunc("GET /v1/economy/invoices", clearingHandler.HandleListInvoices)
		mux.HandleFunc("GET /v1/economy/invoices/{id}", clearingHandler.HandleGetInvoice)
		mux.HandleFunc("POST /v1/economy/invoices/{id}/accept", clearingHandler.HandleAcceptInvoice)
		mux.HandleFunc("POST /v1/economy/invoices/{id}/dispute", clearingHandler.HandleDisputeInvoice)
		mux.HandleFunc("POST /api/economy/invoices", clearingHandler.HandleCreateInvoice)
		mux.HandleFunc("GET /api/economy/invoices", clearingHandler.HandleListInvoices)
		mux.HandleFunc("GET /api/economy/invoices/{id}", clearingHandler.HandleGetInvoice)
		mux.HandleFunc("POST /api/economy/invoices/{id}/accept", clearingHandler.HandleAcceptInvoice)
		mux.HandleFunc("POST /api/economy/invoices/{id}/dispute", clearingHandler.HandleDisputeInvoice)

		// Escrows
		mux.HandleFunc("POST /v1/economy/escrows", clearingHandler.HandleCreateEscrow)
		mux.HandleFunc("GET /v1/economy/escrows", clearingHandler.HandleListEscrows)
		mux.HandleFunc("GET /v1/economy/escrows/{id}", clearingHandler.HandleGetEscrow)
		mux.HandleFunc("POST /v1/economy/escrows/{id}/release", clearingHandler.HandleReleaseEscrow)
		mux.HandleFunc("POST /v1/economy/escrows/{id}/refund", clearingHandler.HandleRefundEscrow)
		mux.HandleFunc("POST /api/economy/escrows", clearingHandler.HandleCreateEscrow)
		mux.HandleFunc("GET /api/economy/escrows", clearingHandler.HandleListEscrows)
		mux.HandleFunc("GET /api/economy/escrows/{id}", clearingHandler.HandleGetEscrow)

		// Milestones
		mux.HandleFunc("POST /v1/economy/milestones", clearingHandler.HandleCreateMilestone)
		mux.HandleFunc("GET /v1/economy/milestones", clearingHandler.HandleListMilestones)
		mux.HandleFunc("POST /v1/economy/milestones/{id}/submit", clearingHandler.HandleSubmitMilestone)
		mux.HandleFunc("POST /v1/economy/milestones/{id}/verify", clearingHandler.HandleVerifyMilestone)
		mux.HandleFunc("POST /v1/economy/milestones/{id}/settle", clearingHandler.HandleSettleMilestone)
		mux.HandleFunc("POST /api/economy/milestones", clearingHandler.HandleCreateMilestone)
		mux.HandleFunc("POST /api/economy/milestones/{id}/verify", clearingHandler.HandleVerifyMilestone)

		// Netting
		mux.HandleFunc("POST /v1/economy/netting/proposals", clearingHandler.HandleProposeNetting)
		mux.HandleFunc("GET /v1/economy/netting/proposals", clearingHandler.HandleListNetting)
		mux.HandleFunc("POST /v1/economy/netting/{id}/approve", clearingHandler.HandleApproveNetting)
		mux.HandleFunc("POST /v1/economy/netting/{id}/execute", clearingHandler.HandleExecuteNetting)
		mux.HandleFunc("POST /api/economy/netting/proposals", clearingHandler.HandleProposeNetting)
		mux.HandleFunc("POST /api/economy/netting/{id}/approve", clearingHandler.HandleApproveNetting)

		// Batches
		mux.HandleFunc("POST /v1/economy/batches", clearingHandler.HandleCreateBatch)
		mux.HandleFunc("GET /v1/economy/batches", clearingHandler.HandleListBatches)
		mux.HandleFunc("GET /v1/economy/batches/{id}", clearingHandler.HandleGetBatch)
		mux.HandleFunc("POST /v1/economy/batches/{id}/execute", clearingHandler.HandleExecuteBatch)
		mux.HandleFunc("POST /api/economy/batches", clearingHandler.HandleCreateBatch)
		mux.HandleFunc("POST /api/economy/batches/{id}/execute", clearingHandler.HandleExecuteBatch)

		// Refunds
		mux.HandleFunc("POST /v1/economy/refunds", clearingHandler.HandleRequestRefund)
		mux.HandleFunc("GET /v1/economy/refunds", clearingHandler.HandleListRefunds)
		mux.HandleFunc("POST /v1/economy/refunds/{id}/approve", clearingHandler.HandleApproveRefund)
		mux.HandleFunc("POST /v1/economy/refunds/{id}/execute", clearingHandler.HandleExecuteRefund)
		mux.HandleFunc("POST /api/economy/refunds", clearingHandler.HandleRequestRefund)

		// Reconciliation
		mux.HandleFunc("GET /v1/economy/reconciliation", clearingHandler.HandleListReconciliation)
		mux.HandleFunc("POST /v1/economy/reconciliation/{id}", clearingHandler.HandleReconcileObligation)
		mux.HandleFunc("GET /api/economy/reconciliation", clearingHandler.HandleListReconciliation)

		// Exposure, Health & Ledger
		mux.HandleFunc("GET /v1/economy/exposure", clearingHandler.HandleGetExposure)
		mux.HandleFunc("GET /v1/economy/health", clearingHandler.HandleGetHealth)
		mux.HandleFunc("GET /v1/economy/clearing/ledger", clearingHandler.HandleGetLedger)
		mux.HandleFunc("GET /api/economy/exposure", clearingHandler.HandleGetExposure)
		mux.HandleFunc("GET /api/economy/health", clearingHandler.HandleGetHealth)

		// 16. Task 12: Autonomous Economic Control Tower APIs
		controlService := control.NewService(repo, ts, policyClient, bc, reg, cfg)
		controlService.SetClearinghouse(clearingSvc)
		controlHandler := handlers.NewControlHandler(controlService)

		mux.HandleFunc("GET /v1/control/overview", controlHandler.HandleOverview)
		mux.HandleFunc("GET /api/control/overview", controlHandler.HandleOverview)
		mux.HandleFunc("GET /v1/control/state", controlHandler.HandleStateStrip)
		mux.HandleFunc("GET /api/control/state", controlHandler.HandleStateStrip)
		mux.HandleFunc("GET /v1/control/activity", controlHandler.HandleActivity)
		mux.HandleFunc("GET /api/control/activity", controlHandler.HandleActivity)
		mux.HandleFunc("GET /v1/control/financial-trace/{id}", controlHandler.HandleFinancialTrace)
		mux.HandleFunc("GET /api/control/financial-trace/{id}", controlHandler.HandleFinancialTrace)
		mux.HandleFunc("GET /v1/control/missions/{id}", controlHandler.HandleMissionCommandCenter)
		mux.HandleFunc("GET /api/control/missions/{id}", controlHandler.HandleMissionCommandCenter)
		mux.HandleFunc("GET /v1/control/security", controlHandler.HandleSecurity)
		mux.HandleFunc("GET /api/control/security", controlHandler.HandleSecurity)
		mux.HandleFunc("GET /v1/control/treasury", controlHandler.HandleTreasury)
		mux.HandleFunc("GET /api/control/treasury", controlHandler.HandleTreasury)
		mux.HandleFunc("GET /v1/control/arc", controlHandler.HandleArcStatus)
		mux.HandleFunc("GET /api/control/arc", controlHandler.HandleArcStatus)
		mux.HandleFunc("GET /v1/control/incidents", controlHandler.HandleIncidents)
		mux.HandleFunc("GET /api/control/incidents", controlHandler.HandleIncidents)
		mux.HandleFunc("GET /v1/control/intelligence", controlHandler.HandleIntelligence)
		mux.HandleFunc("GET /api/control/intelligence", controlHandler.HandleIntelligence)
		mux.HandleFunc("GET /v1/control/search", controlHandler.HandleSearch)
		mux.HandleFunc("GET /api/control/search", controlHandler.HandleSearch)

		// 17. Task 13: Autonomous Operations & Durable Runtime APIs
		runtimeStore := storage.NewMemoryRuntimeStore()
		runtimeService := runtime.NewService(runtimeStore, runtimeStore, runtimeStore, runtimeStore, runtimeStore, runtimeStore, runtimeStore, runtimeStore)
		runtimeHandler := handlers.NewRuntimeHandler(runtimeService)

		mux.HandleFunc("POST /v1/runtime/workflows", runtimeHandler.HandleCreateWorkflow)
		mux.HandleFunc("POST /api/runtime/workflows", runtimeHandler.HandleCreateWorkflow)
		mux.HandleFunc("GET /v1/runtime/workflows", runtimeHandler.HandleListWorkflows)
		mux.HandleFunc("GET /api/runtime/workflows", runtimeHandler.HandleListWorkflows)
		mux.HandleFunc("GET /v1/runtime/workflows/{id}", runtimeHandler.HandleGetWorkflow)
		mux.HandleFunc("GET /api/runtime/workflows/{id}", runtimeHandler.HandleGetWorkflow)
		mux.HandleFunc("POST /v1/runtime/workflows/{id}/pause", runtimeHandler.HandlePauseWorkflow)
		mux.HandleFunc("POST /api/runtime/workflows/{id}/pause", runtimeHandler.HandlePauseWorkflow)
		mux.HandleFunc("POST /v1/runtime/workflows/{id}/resume", runtimeHandler.HandleResumeWorkflow)
		mux.HandleFunc("POST /api/runtime/workflows/{id}/resume", runtimeHandler.HandleResumeWorkflow)
		mux.HandleFunc("POST /v1/runtime/workflows/{id}/cancel", runtimeHandler.HandleCancelWorkflow)
		mux.HandleFunc("POST /api/runtime/workflows/{id}/cancel", runtimeHandler.HandleCancelWorkflow)
		mux.HandleFunc("POST /v1/runtime/workflows/{id}/retry", runtimeHandler.HandleRetryStep)
		mux.HandleFunc("POST /api/runtime/workflows/{id}/retry", runtimeHandler.HandleRetryStep)
		mux.HandleFunc("GET /v1/runtime/workflows/{id}/steps", runtimeHandler.HandleListSteps)
		mux.HandleFunc("GET /api/runtime/workflows/{id}/steps", runtimeHandler.HandleListSteps)
		mux.HandleFunc("GET /v1/runtime/workflows/{id}/checkpoints", runtimeHandler.HandleListCheckpoints)
		mux.HandleFunc("GET /api/runtime/workflows/{id}/checkpoints", runtimeHandler.HandleListCheckpoints)
		mux.HandleFunc("GET /v1/runtime/workers", runtimeHandler.HandleListWorkers)
		mux.HandleFunc("GET /api/runtime/workers", runtimeHandler.HandleListWorkers)
		mux.HandleFunc("GET /v1/runtime/queues", runtimeHandler.HandleGetQueues)
		mux.HandleFunc("GET /api/runtime/queues", runtimeHandler.HandleGetQueues)
		mux.HandleFunc("GET /v1/runtime/recovery", runtimeHandler.HandleGetRecoveryQueue)
		mux.HandleFunc("GET /api/runtime/recovery", runtimeHandler.HandleGetRecoveryQueue)
		mux.HandleFunc("GET /v1/runtime/incidents", runtimeHandler.HandleListIncidents)
		mux.HandleFunc("GET /api/runtime/incidents", runtimeHandler.HandleListIncidents)
		mux.HandleFunc("POST /v1/runtime/incidents/{id}/reconcile", runtimeHandler.HandleReconcileIncident)
		mux.HandleFunc("POST /api/runtime/incidents/{id}/reconcile", runtimeHandler.HandleReconcileIncident)
		mux.HandleFunc("GET /v1/runtime/metrics", runtimeHandler.HandleGetMetrics)
		mux.HandleFunc("GET /api/runtime/metrics", runtimeHandler.HandleGetMetrics)

		// 18. Task 14: Autonomous Operations OS APIs
		opsStore := storage.NewMemoryOperationsStore()
		opsHealthProber := operations.NewHealthProber(nil, nil, nil, "", false)
		opsService := operations.NewOperationsService(opsStore, nil, opsHealthProber)
		opsHandler := handlers.NewOperationsHandler(opsService)

		mux.HandleFunc("GET /v1/operations", opsHandler.HandleGetStatus)
		mux.HandleFunc("GET /api/operations", opsHandler.HandleGetStatus)
		mux.HandleFunc("GET /v1/operations/health", opsHandler.HandleGetHealth)
		mux.HandleFunc("GET /api/operations/health", opsHandler.HandleGetHealth)
		mux.HandleFunc("GET /v1/operations/snapshot", opsHandler.HandleGetSnapshot)
		mux.HandleFunc("GET /api/operations/snapshot", opsHandler.HandleGetSnapshot)
		mux.HandleFunc("GET /v1/operations/workflows", opsHandler.HandleListWorkflows)
		mux.HandleFunc("GET /api/operations/workflows", opsHandler.HandleListWorkflows)
		mux.HandleFunc("GET /v1/operations/workers", opsHandler.HandleListWorkers)
		mux.HandleFunc("GET /api/operations/workers", opsHandler.HandleListWorkers)
		mux.HandleFunc("GET /v1/operations/queues", opsHandler.HandleGetQueues)
		mux.HandleFunc("GET /api/operations/queues", opsHandler.HandleGetQueues)
		mux.HandleFunc("GET /v1/operations/incidents", opsHandler.HandleListIncidents)
		mux.HandleFunc("GET /api/operations/incidents", opsHandler.HandleListIncidents)
		mux.HandleFunc("POST /v1/operations/incidents/{id}/mitigate", opsHandler.HandleMitigateIncident)
		mux.HandleFunc("POST /api/operations/incidents/{id}/mitigate", opsHandler.HandleMitigateIncident)
		mux.HandleFunc("GET /v1/operations/topology", opsHandler.HandleGetTopology)
		mux.HandleFunc("GET /api/operations/topology", opsHandler.HandleGetTopology)
		mux.HandleFunc("GET /v1/operations/timeline", opsHandler.HandleGetTimeline)
		mux.HandleFunc("GET /api/operations/timeline", opsHandler.HandleGetTimeline)
		mux.HandleFunc("GET /v1/operations/graph", opsHandler.HandleGetGraph)
		mux.HandleFunc("GET /api/operations/graph", opsHandler.HandleGetGraph)
		mux.HandleFunc("GET /v1/operations/replay/{workflowId}", opsHandler.HandleGetReplay)
		mux.HandleFunc("GET /api/operations/replay/{workflowId}", opsHandler.HandleGetReplay)
		mux.HandleFunc("GET /v1/operations/state-at/{timestamp}", opsHandler.HandleGetStateAt)
		mux.HandleFunc("GET /api/operations/state-at/{timestamp}", opsHandler.HandleGetStateAt)
		mux.HandleFunc("GET /v1/operations/why/{eventId}", opsHandler.HandleExplainEvent)
		mux.HandleFunc("GET /api/operations/why/{eventId}", opsHandler.HandleExplainEvent)
		mux.HandleFunc("GET /v1/operations/next/{workflowId}", opsHandler.HandleGetNextAction)
		mux.HandleFunc("GET /api/operations/next/{workflowId}", opsHandler.HandleGetNextAction)

		// 19. Task 15: Autonomous Economic Fabric APIs
		fabricStore := fabric.NewMemoryFabricStore()
		fabricService := fabric.NewEconomicFabricService(fabricStore)
		fabricHandler := handlers.NewFabricHandler(fabricService)

		mux.HandleFunc("POST /v1/fabric/objectives", fabricHandler.HandleCreateObjective)
		mux.HandleFunc("POST /api/fabric/objectives", fabricHandler.HandleCreateObjective)
		mux.HandleFunc("GET /v1/fabric/objectives", fabricHandler.HandleListObjectives)
		mux.HandleFunc("GET /api/fabric/objectives", fabricHandler.HandleListObjectives)
		mux.HandleFunc("GET /v1/fabric/objectives/{id}", fabricHandler.HandleGetObjective)
		mux.HandleFunc("GET /api/fabric/objectives/{id}", fabricHandler.HandleGetObjective)
		mux.HandleFunc("POST /v1/fabric/objectives/{id}/plan", fabricHandler.HandlePlanObjective)
		mux.HandleFunc("POST /api/fabric/objectives/{id}/plan", fabricHandler.HandlePlanObjective)
		mux.HandleFunc("POST /v1/fabric/objectives/{id}/simulate", fabricHandler.HandleSimulateObjective)
		mux.HandleFunc("POST /api/fabric/objectives/{id}/simulate", fabricHandler.HandleSimulateObjective)
		mux.HandleFunc("POST /v1/fabric/objectives/{id}/start", fabricHandler.HandleStartObjective)
		mux.HandleFunc("POST /api/fabric/objectives/{id}/start", fabricHandler.HandleStartObjective)
		mux.HandleFunc("POST /v1/fabric/objectives/{id}/pause", fabricHandler.HandlePauseObjective)
		mux.HandleFunc("POST /api/fabric/objectives/{id}/pause", fabricHandler.HandlePauseObjective)
		mux.HandleFunc("POST /v1/fabric/objectives/{id}/resume", fabricHandler.HandleResumeObjective)
		mux.HandleFunc("POST /api/fabric/objectives/{id}/resume", fabricHandler.HandleResumeObjective)
		mux.HandleFunc("POST /v1/fabric/objectives/{id}/replan", fabricHandler.HandleReplanObjective)
		mux.HandleFunc("POST /api/fabric/objectives/{id}/replan", fabricHandler.HandleReplanObjective)
		mux.HandleFunc("POST /v1/fabric/objectives/{id}/cancel", fabricHandler.HandleCancelObjective)
		mux.HandleFunc("POST /api/fabric/objectives/{id}/cancel", fabricHandler.HandleCancelObjective)
		mux.HandleFunc("GET /v1/fabric/objectives/{id}/trace", fabricHandler.HandleGetTrace)
		mux.HandleFunc("GET /api/fabric/objectives/{id}/trace", fabricHandler.HandleGetTrace)
		mux.HandleFunc("GET /v1/fabric/objectives/{id}/why", fabricHandler.HandleExplainWhy)
		mux.HandleFunc("GET /api/fabric/objectives/{id}/why", fabricHandler.HandleExplainWhy)
		mux.HandleFunc("GET /v1/fabric/objectives/{id}/why-not", fabricHandler.HandleExplainWhyNot)
		mux.HandleFunc("GET /api/fabric/objectives/{id}/why-not", fabricHandler.HandleExplainWhyNot)
		mux.HandleFunc("GET /v1/fabric/metrics", fabricHandler.HandleGetAutonomyMetrics)
		mux.HandleFunc("GET /api/fabric/metrics", fabricHandler.HandleGetAutonomyMetrics)

		// Section 20: Task 16 Autonomous Economic Protocol v1
		protoStore := protocol.NewMemoryProtocolStore()
		protoVal := protocol.NewMessageValidator()
		protoSigner := protocol.NewProtocolSigner(nil)
		protoAuth := protocol.NewMemoryAuthenticator()
		protoRL := protocol.NewRateLimiter(200, time.Minute)
		protoBoundary := protocol.NewPaymentBoundary(nil, intentService)
		protoSvc := protocol.NewProtocolService(protoStore, protoVal, nil, protoBoundary, nil)
		protoGW := protocol.NewProtocolGateway(protoVal, protoSigner, protoAuth, protoRL, protoStore, protoSvc)
		protoHandler := handlers.NewProtocolHandler(protoGW, protoSvc, protoStore)

		mux.HandleFunc("POST /protocol/v1/messages", protoHandler.HandleProcessMessage)
		mux.HandleFunc("GET /protocol/v1/agents", protoHandler.HandleAgents)
		mux.HandleFunc("GET /protocol/v1/agents/{id}", protoHandler.HandleAgents)
		mux.HandleFunc("GET /protocol/v1/capabilities", protoHandler.HandleCapabilities)
		mux.HandleFunc("GET /protocol/v1/capabilities/{id}", protoHandler.HandleCapabilities)
		mux.HandleFunc("POST /protocol/v1/capabilities/query", protoHandler.HandleCapabilities)
		mux.HandleFunc("POST /protocol/v1/requests", protoHandler.HandleServiceRequest)
		mux.HandleFunc("POST /protocol/v1/quotes", protoHandler.HandleQuotes)
		mux.HandleFunc("GET /protocol/v1/quotes/{id}", protoHandler.HandleQuotes)
		mux.HandleFunc("POST /protocol/v1/negotiate", protoHandler.HandleNegotiate)
		mux.HandleFunc("POST /protocol/v1/contracts", protoHandler.HandleContracts)
		mux.HandleFunc("POST /protocol/v1/contracts/{id}/accept", protoHandler.HandleContracts)
		mux.HandleFunc("GET /protocol/v1/contracts/{id}", protoHandler.HandleContracts)
		mux.HandleFunc("POST /protocol/v1/results", protoHandler.HandleResults)
		mux.HandleFunc("POST /protocol/v1/payments", protoHandler.HandlePayments)
		mux.HandleFunc("GET /protocol/v1/payments/{id}", protoHandler.HandlePayments)
		mux.HandleFunc("POST /protocol/v1/heartbeat", protoHandler.HandleHeartbeat)
		mux.HandleFunc("POST /protocol/v1/simulate", protoHandler.HandleSimulate)
		mux.HandleFunc("POST /protocol/v1/precheck", protoHandler.HandlePrecheck)
		mux.HandleFunc("GET /protocol/v1/traffic", protoHandler.HandleTraffic)
		mux.HandleFunc("GET /protocol/v1/security", protoHandler.HandleSecurity)

		// Section 21: Task 17 Autonomous Economic Marketplace
		mktStore := marketplace.NewMemoryMarketplaceStore()
		mktSvc := marketplace.NewMarketplaceService(mktStore)
		mktHandler := handlers.NewMarketplaceHandler(mktSvc)

		mux.HandleFunc("GET /api/marketplace/listings", mktHandler.HandleListings)
		mux.HandleFunc("POST /api/marketplace/listings", mktHandler.HandleListings)
		mux.HandleFunc("GET /api/marketplace/listings/{id}", mktHandler.HandleListingDetail)
		mux.HandleFunc("POST /api/marketplace/listings/{id}", mktHandler.HandleListingDetail)
		mux.HandleFunc("POST /api/marketplace/search", mktHandler.HandleSearchListings)
		mux.HandleFunc("GET /api/marketplace/opportunities", mktHandler.HandleOpportunities)
		mux.HandleFunc("POST /api/marketplace/opportunities", mktHandler.HandleOpportunities)
		mux.HandleFunc("GET /api/marketplace/opportunities/{id}", mktHandler.HandleOpportunityDetail)
		mux.HandleFunc("POST /api/marketplace/opportunities/{id}/match", mktHandler.HandleOpportunityDetail)
		mux.HandleFunc("POST /api/marketplace/opportunities/{id}/award", mktHandler.HandleOpportunityDetail)
		mux.HandleFunc("GET /api/marketplace/agents/{id}", mktHandler.HandleAgentProfile)
		mux.HandleFunc("GET /api/marketplace/agents/{id}/performance", mktHandler.HandleAgentProfile)
		mux.HandleFunc("GET /api/marketplace/compare", mktHandler.HandleCompare)
		mux.HandleFunc("GET /api/marketplace/health", mktHandler.HandleHealth)
		mux.HandleFunc("POST /api/marketplace/simulate", mktHandler.HandleSimulate)

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
