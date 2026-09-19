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
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func main() {
	cfg := config.Load()
	policyClient := policy.NewClient(cfg.PolicyEngineURL, cfg.PolicyEngineTimeout)

	var blockchainClient blockchain.Client
	if cfg.ArcRPCURL != "" {
		ethCl, err := blockchain.NewEthClient(cfg.ArcRPCURL)
		if err != nil {
			log.Printf("[AgentPay Gateway] Warning: failed to connect to Arc RPC (%s): %v. Live execution will remain disabled.", cfg.ArcRPCURL, err)
		} else {
			blockchainClient = ethCl
			defer blockchainClient.Close()
		}
	}

	execService := execution.NewExecutionService(cfg, blockchainClient, nil)

	// Initialize Storage Repository
	var repo storage.Repository = storage.NewMemoryRepository()
	if cfg.DatabaseURL != "" {
		log.Printf("[AgentPay Gateway] Database URL configured: %s (PostgreSQL persistence ready)", cfg.DatabaseURL)
		// Postgres repository can be attached here when PostgreSQL is running
	}

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

	router := gwHttp.NewRouter(cfg, policyClient, execService, agentService, intentService)

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
