package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/agent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func main() {
	cfg := config.Load()

	// Enforce Mainnet Safety Gate at startup
	if cfg.EnableLiveExecution {
		log.Printf("[AgentPay Gateway] Live execution enabled: validating strict mainnet safety preconditions...")
		if err := cfg.ValidateLiveExecutionRequirements(); err != nil {
			log.Fatalf("[AgentPay Gateway] FATAL SAFETY ERROR: %v. Server failed closed to protect funds.", err)
		}
	} else {
		log.Printf("[AgentPay Gateway] Live execution is disabled (ENABLE_LIVE_EXECUTION=false). Running in simulation/safe mode.")
	}

	policyClient := policy.NewClient(cfg.PolicyEngineURL, cfg.PolicyEngineTimeout)

	var blockchainClient blockchain.Client
	if cfg.ArcRPCURL != "" {
		ethCl, err := blockchain.NewEthClient(cfg.ArcRPCURL)
		if err != nil {
			if cfg.EnableLiveExecution {
				log.Fatalf("[AgentPay Gateway] FATAL: failed to connect to required Arc RPC (%s): %v. Live execution aborted.", cfg.ArcRPCURL, err)
			}
			log.Printf("[AgentPay Gateway] Warning: failed to connect to Arc RPC (%s): %v. Live execution will remain disabled.", cfg.ArcRPCURL, err)
		} else {
			// Verify connected chain ID
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			actualChainID, err := ethCl.ChainID(ctx)
			cancel()
			if err != nil {
				if cfg.EnableLiveExecution {
					log.Fatalf("[AgentPay Gateway] FATAL: failed to query Chain ID from Arc RPC (%s): %v", cfg.ArcRPCURL, err)
				}
				log.Printf("[AgentPay Gateway] Warning: could not query Chain ID from Arc RPC: %v", err)
			} else if err := blockchain.ValidateChainID(cfg.ArcChainID, actualChainID); err != nil {
				if cfg.EnableLiveExecution {
					log.Fatalf("[AgentPay Gateway] FATAL: Chain ID mismatch: %v. Expected %s, got %s", err, cfg.ArcChainID, actualChainID.String())
				}
				log.Printf("[AgentPay Gateway] Warning: Chain ID mismatch: %v. Expected %s, got %s", err, cfg.ArcChainID, actualChainID.String())
			} else {
				log.Printf("[AgentPay Gateway] Verified Arc RPC connection: Chain ID %s (%s)", actualChainID.String(), cfg.ArcRPCURL)
			}

			blockchainClient = ethCl
			defer blockchainClient.Close()
		}
	}

	// Initialize Storage Repository
	repo, db, err := storage.InitializeRepository(context.Background(), cfg)
	if err != nil {
		log.Fatalf("[AgentPay Gateway] FATAL: storage initialization failed: %v", err)
	}
	if db != nil {
		defer func() {
			log.Printf("[AgentPay Storage] closing database connection pool...")
			if err := db.Close(); err != nil {
				log.Printf("[AgentPay Storage] error closing database pool: %v", err)
			}
		}()
	}

	// Initialize Blockchain Transaction Signer Boundary (Day 3 Hardening)
	auditRecorder := signer.NewStorageAuditRecorder(repo)
	txSigner, err := signer.NewSignerFromConfig(cfg, auditRecorder)
	if err != nil {
		if cfg.EnableLiveExecution {
			log.Fatalf("[AgentPay Gateway] FATAL: failed to initialize transaction signer: %v", err)
		}
		log.Printf("[AgentPay Gateway] Transaction signer not initialized (mock/sim mode): %v", err)
	} else {
		log.Printf("[AgentPay Gateway] Transaction signer initialized: backend=%s address=%s chain_id=%s",
			txSigner.Backend(), txSigner.Address().Hex(), txSigner.ChainID().String())
	}

	execService := execution.NewExecutionServiceWithSigner(cfg, blockchainClient, nil, txSigner, auditRecorder)

	// Initialize Service Registry
	serviceRegistry := registry.NewDefaultRegistry()

	// Initialize Intent Service
	intentTTL := time.Duration(cfg.PaymentIntentTTLSeconds) * time.Second
	intentService := intent.NewService(
		repo,
		policyClient,
		execService,
		serviceRegistry,
		nil, // uses RealClock
		intentTTL,
		cfg.AgentAutoExecution,
	)

	// Initialize AI Agent Model
	var agentModel agent.AgentModel = &agent.MockAgentModel{}
	if cfg.AIAPIKey != "" {
		promptBytes, err := os.ReadFile("services/agent/prompts/agent_system_v1.txt")
		systemPrompt := string(promptBytes)
		if err != nil {
			log.Printf("[AgentPay Gateway] Warning: could not read system prompt file (%v), using default instructions", err)
			systemPrompt = "You are an AI agent under the AgentPay protocol. You may request payments only through registered services."
		}
		agentModel = agent.NewHTTPModel("", cfg.AIModel, cfg.AIAPIKey, systemPrompt)
		log.Printf("[AgentPay Gateway] Configured HTTP LLM agent model (Model: %s)", cfg.AIModel)
	}

	// Initialize AI Agent Service
	agentService := agent.NewService(
		agentModel,
		intentService,
		serviceRegistry,
		cfg.AgentAutoExecution,
	)

	router := gwHttp.NewRouter(cfg, policyClient, execService, agentService, intentService, repo, serviceRegistry)

	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Server run context
	serverCtx, serverStopCtx := context.WithCancel(context.Background())

	// Listen for syscall signals for process to interrupt/quit
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		<-sig

		// Shutdown signal with grace period of 10 seconds
		shutdownCtx, shutdownCancel := context.WithTimeout(serverCtx, 10*time.Second)
		defer shutdownCancel()

		go func() {
			<-shutdownCtx.Done()
			if errors.Is(shutdownCtx.Err(), context.DeadlineExceeded) {
				log.Fatal("Graceful shutdown timed out.. forcing exit.")
			}
		}()

		// Trigger graceful shutdown
		err := srv.Shutdown(shutdownCtx)
		if err != nil {
			log.Fatalf("Server shutdown failed: %v", err)
		}
		serverStopCtx()
	}()

	log.Printf("[AgentPay Gateway] Starting HTTP server on %s (Policy Engine: %s, Arc Chain: %s, Auto-Execution: %t, Live Execution: %t)",
		addr, cfg.PolicyEngineURL, cfg.ArcChainID, cfg.AgentAutoExecution, cfg.EnableLiveExecution)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("Server failed to start: %v", err)
	}

	// Wait for server context to be stopped
	<-serverCtx.Done()
	log.Println("[AgentPay Gateway] Server stopped gracefully")
}
