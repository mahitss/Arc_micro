package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/emergency"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
)

type EmergencyActionRequest struct {
	ActorID string `json:"actor_id"`
}

type EmergencyHandler struct {
	controller emergency.Controller
}

func NewEmergencyHandler(controller emergency.Controller) *EmergencyHandler {
	return &EmergencyHandler{
		controller: controller,
	}
}

// HandlePauseAgent handles POST /v1/agents/{id}/pause
func (h *EmergencyHandler) HandlePauseAgent(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	agentID := r.PathValue("id")
	actorID := h.extractActor(r)

	if err := h.controller.PauseAgent(r.Context(), "", agentID, actorID); err != nil {
		writeError(w, http.StatusBadRequest, "PAUSE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "success",
		"agent_id": agentID,
		"state":    "PAUSED",
	})
}

// HandleResumeAgent handles POST /v1/agents/{id}/resume
func (h *EmergencyHandler) HandleResumeAgent(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	agentID := r.PathValue("id")
	actorID := h.extractActor(r)

	if err := h.controller.ResumeAgent(r.Context(), "", agentID, actorID); err != nil {
		writeError(w, http.StatusBadRequest, "RESUME_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "success",
		"agent_id": agentID,
		"state":    "ACTIVE",
	})
}

// HandlePauseOrganization handles POST /v1/organizations/{id}/pause
func (h *EmergencyHandler) HandlePauseOrganization(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.PathValue("id")
	actorID := h.extractActor(r)

	if err := h.controller.PauseOrganization(r.Context(), orgID, actorID); err != nil {
		writeError(w, http.StatusBadRequest, "PAUSE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":          "success",
		"organization_id": orgID,
		"state":           "PAUSED",
	})
}

// HandleResumeOrganization handles POST /v1/organizations/{id}/resume
func (h *EmergencyHandler) HandleResumeOrganization(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.PathValue("id")
	actorID := h.extractActor(r)

	if err := h.controller.ResumeOrganization(r.Context(), orgID, actorID); err != nil {
		writeError(w, http.StatusBadRequest, "RESUME_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":          "success",
		"organization_id": orgID,
		"state":           "ACTIVE",
	})
}

// HandlePauseGlobal handles POST /v1/system/pause
func (h *EmergencyHandler) HandlePauseGlobal(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	actorID := h.extractActor(r)

	if err := h.controller.PauseGlobalExecution(r.Context(), actorID); err != nil {
		writeError(w, http.StatusInternalServerError, "GLOBAL_PAUSE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":           "success",
		"global_execution": "PAUSED",
	})
}

// HandleResumeGlobal handles POST /v1/system/resume
func (h *EmergencyHandler) HandleResumeGlobal(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	actorID := h.extractActor(r)

	if err := h.controller.ResumeGlobalExecution(r.Context(), actorID); err != nil {
		writeError(w, http.StatusInternalServerError, "GLOBAL_RESUME_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":           "success",
		"global_execution": "ACTIVE",
	})
}

// HandleSystemStatus handles GET /v1/system/status
func (h *EmergencyHandler) HandleSystemStatus(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	paused, err := h.controller.IsGlobalExecutionPaused(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "STATUS_CHECK_FAILED", err.Error(), ctxReqID)
		return
	}

	state := "ACTIVE"
	if paused {
		state = "PAUSED"
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"global_execution": state,
		"execution_paused": paused,
	})
}

func (h *EmergencyHandler) extractActor(r *http.Request) string {
	var req EmergencyActionRequest
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}
	if strings.TrimSpace(req.ActorID) != "" {
		return strings.TrimSpace(req.ActorID)
	}
	return "system_admin"
}
