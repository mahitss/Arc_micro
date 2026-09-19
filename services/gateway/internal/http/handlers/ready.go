package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
)

// ReadyResponse represents the readiness status of the Gateway and its dependencies.
type ReadyResponse struct {
	Status       string            `json:"status"`
	Service      string            `json:"service"`
	Dependencies map[string]string `json:"dependencies"`
}

// ReadyHandler handles GET /ready requests.
type ReadyHandler struct {
	policyClient policy.Client
}

// NewReadyHandler creates a new ReadyHandler.
func NewReadyHandler(client policy.Client) *ReadyHandler {
	return &ReadyHandler{
		policyClient: client,
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

	if err := h.policyClient.CheckHealth(r.Context()); err != nil {
		deps["policy_engine"] = "unavailable"
		isReady = false
	} else {
		deps["policy_engine"] = "ok"
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
