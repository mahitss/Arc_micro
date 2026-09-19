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

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
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
	router := gwHttp.NewRouter(cfg, policyClient, execService)

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

	log.Printf("[AgentPay Gateway] Starting HTTP server on %s (Policy Engine: %s, Arc Chain: %s, Live Execution: %t)",
		addr, cfg.PolicyEngineURL, cfg.ArcChainID, cfg.EnableLiveExecution)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("Server failed to start: %v", err)
	}

	// Wait for server context to be stopped
	<-serverCtx.Done()
	log.Println("[AgentPay Gateway] Server stopped gracefully")
}
