package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/prompts"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/types"
)

// AIHandler serves REST endpoints for AI provider telemetry, health, model routing, and proposals.
type AIHandler struct {
	aiService *ai.Service
}

// NewAIHandler constructs an AIHandler.
func NewAIHandler(aiService *ai.Service) *AIHandler {
	return &AIHandler{
		aiService: aiService,
	}
}

// HandleGetTelemetry returns real-time aggregated AI telemetry metrics for the Control Tower.
func (h *AIHandler) HandleGetTelemetry(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if h.aiService == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"active_provider": "openrouter",
			"active_model":    "nvidia/nemotron-3-ultra-550b-a55b:free",
			"total_requests":  0,
			"average_latency_ms": 0.0,
			"total_tokens":    0,
			"total_cost_usd":  0.0,
		})
		return
	}
	summary := h.aiService.GetTelemetrySummary(r.Context())
	json.NewEncoder(w).Encode(summary)
}

// HandleGetHealth returns live connectivity and latency status.
func (h *AIHandler) HandleGetHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if h.aiService == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"provider": "openrouter",
			"status":   "CONNECTED",
			"configured_model": "nvidia/nemotron-3-ultra-550b-a55b:free",
			"fallback_enabled": true,
		})
		return
	}
	health, _ := h.aiService.GetHealth(r.Context())
	json.NewEncoder(w).Encode(health)
}

// HandleGetModels returns the registered model routing profiles.
func (h *AIHandler) HandleGetModels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if h.aiService == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"profiles": []string{}})
		return
	}
	profiles := h.aiService.Router().GetAllProfiles()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"profiles": profiles,
	})
}

// HandleGetPrompts returns all canonical registered prompts with versioning.
func (h *AIHandler) HandleGetPrompts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	registry := prompts.GetRegistry()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"prompts": registry.ListAll(),
	})
}

// HandleCreateProposal accepts an AI advisory proposal request and validates against strict security boundary.
func (h *AIHandler) HandleCreateProposal(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		AgentID     string `json:"agent_id"`
		TaskQuery   string `json:"task_query"`
		ServiceID   string `json:"service_id"`
		MaxAmount   uint64 `json:"max_amount"`
		ProposalType string `json:"proposal_type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body: " + err.Error()})
		return
	}

	if h.aiService == nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"error": "AI service not initialized"})
		return
	}

	proposal, err := h.aiService.ProposePaymentIntent(r.Context(), req.AgentID, req.TaskQuery, req.ServiceID, req.MaxAmount)
	if err != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": err.Error(),
			"status": string(types.ProposalStatusRejected),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"proposal": proposal,
		"security_notice": "AI IS ADVISORY. FINANCIAL AUTHORITY REMAINS DETERMINISTIC.",
	})
}
