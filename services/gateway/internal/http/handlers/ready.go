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
	policyClient        policy.Client
	blockchainClient    blockchain.Client
	repo                storage.Repository
	enableLiveExecution bool
}

// NewReadyHandler creates a new ReadyHandler with dependency health checks.
// An optional boolean or config may be provided to specify if live execution is enabled.
func NewReadyHandler(client policy.Client, bc blockchain.Client, repo storage.Repository, opts ...any) *ReadyHandler {
	h := &ReadyHandler{
		policyClient:        client,
		blockchainClient:    bc,
		repo:                repo,
		enableLiveExecution: false,
	}
	for _, opt := range opts {
		switch v := opt.(type) {
		case bool:
			h.enableLiveExecution = v
		case interface{ LiveExecutionEnabled() bool }:
			h.enableLiveExecution = v.LiveExecutionEnabled()
		case interface{}:
			// Support *config.Config if passed
			if cfg, ok := opt.(interface{ GetEnableLiveExecution() bool }); ok {
				h.enableLiveExecution = cfg.GetEnableLiveExecution()
			}
		}
	}
	return h
}

// SetLiveExecution configures whether live execution readiness semantics apply.
func (h *ReadyHandler) SetLiveExecution(enabled bool) {
	h.enableLiveExecution = enabled
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

	// 1. Check Policy Engine (Essential dependency: strict check)
	if h.policyClient != nil {
		if err := h.policyClient.CheckHealth(r.Context()); err != nil {
			deps["policy_engine"] = "unavailable"
			isReady = false
		} else {
			deps["policy_engine"] = "ok"
		}
	} else {
		deps["policy_engine"] = "unconfigured"
		if h.enableLiveExecution {
			isReady = false
		}
	}

	// 2. Check Storage (Essential dependency: strict check)
	if h.repo != nil {
		if _, err := h.repo.ListServices(r.Context()); err != nil {
			deps["storage"] = "unavailable"
			isReady = false
		} else {
			deps["storage"] = "ok"
		}
	} else {
		deps["storage"] = "unconfigured"
		if h.enableLiveExecution {
			isReady = false
		}
	}

	// 3. Check Arc RPC
	// In safe mode (enableLiveExecution=false), Arc RPC is not required for operation.
	// We report "disabled_in_safe_mode" without falsely claiming live blockchain connectivity,
	// while keeping the readiness check passing.
	// In live execution mode, Arc RPC connectivity is mandatory and fails closed if unreachable.
	if !h.enableLiveExecution {
		deps["arc_rpc"] = "disabled_in_safe_mode"
	} else {
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
			isReady = false
		}
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
