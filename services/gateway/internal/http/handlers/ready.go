package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// ReadyResponse represents the readiness status of the Gateway and its dependencies.
type ReadyResponse struct {
	Status       string            `json:"status"`
	Service      string            `json:"service"`
	Dependencies map[string]string `json:"dependencies"`
}

// ReadyHandler handles GET /ready requests.
type ReadyHandler struct {
	policyClient     policy.Client
	blockchainClient blockchain.Client
	repo             storage.Repository
}

// NewReadyHandler creates a new ReadyHandler with dependency health checks.
func NewReadyHandler(client policy.Client, bc blockchain.Client, repo storage.Repository) *ReadyHandler {
	return &ReadyHandler{
		policyClient:     client,
		blockchainClient: bc,
		repo:             repo,
	}
}

// ServeHTTP checks readiness of the Gateway and configured dependencies.
func (h *ReadyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	deps := make(map[string]string)
	isReady := true

	// 1. Check Policy Engine
	if h.policyClient != nil {
		if err := h.policyClient.CheckHealth(r.Context()); err != nil {
			deps["policy_engine"] = "unavailable"
			isReady = false
		} else {
			deps["policy_engine"] = "ok"
		}
	} else {
		deps["policy_engine"] = "unconfigured"
	}

	// 2. Check Arc RPC
	if h.blockchainClient != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if _, err := h.blockchainClient.ChainID(ctx); err != nil {
			deps["arc_rpc"] = "unavailable"
			isReady = false
		} else {
			deps["arc_rpc"] = "ok"
		}
	} else {
		deps["arc_rpc"] = "unconfigured"
	}

	// 3. Check Storage
	if h.repo != nil {
		if _, err := h.repo.ListServices(r.Context()); err != nil {
			deps["storage"] = "unavailable"
			isReady = false
		} else {
			deps["storage"] = "ok"
		}
	} else {
		deps["storage"] = "unconfigured"
	}

	if !isReady {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(ReadyResponse{
			Status:       "degraded",
			Service:      "gateway",
			Dependencies: deps,
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(ReadyResponse{
		Status:       "ready",
		Service:      "gateway",
		Dependencies: deps,
	})
}
