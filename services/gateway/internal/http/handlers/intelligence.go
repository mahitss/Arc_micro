package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/economy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
)

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// IntelligenceHandler manages HTTP APIs for the AgentPay Intelligence Layer.
type IntelligenceHandler struct {
	missionService *economy.MissionService
}

// NewIntelligenceHandler constructs a new IntelligenceHandler.
func NewIntelligenceHandler(ms *economy.MissionService) *IntelligenceHandler {
	return &IntelligenceHandler{
		missionService: ms,
	}
}

// HandleGetServicePerformance handles GET /v1/services/{id}/performance.
func (h *IntelligenceHandler) HandleGetServicePerformance(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	serviceID := r.PathValue("id")
	if serviceID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SERVICE_ID", "service_id path parameter is required", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if qOrg := r.URL.Query().Get("organization_id"); qOrg != "" {
		orgID = qOrg
	}

	windowStr := r.URL.Query().Get("window")
	window := economy.PerformanceWindow(windowStr)
	if window == "" {
		window = economy.WindowAllTime
	}

	perf, err := h.missionService.GetServicePerformance(r.Context(), orgID, serviceID, window)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "PERFORMANCE_CALCULATION_FAILED", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, perf)
}

// HandleGetServiceReputation handles GET /v1/services/{id}/reputation.
func (h *IntelligenceHandler) HandleGetServiceReputation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	serviceID := r.PathValue("id")
	if serviceID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SERVICE_ID", "service_id path parameter is required", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if qOrg := r.URL.Query().Get("organization_id"); qOrg != "" {
		orgID = qOrg
	}

	rep, err := h.missionService.GetServiceReputation(r.Context(), orgID, serviceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "REPUTATION_RETRIEVAL_FAILED", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, rep)
}

// HandleGetServiceAnomalies handles GET /v1/services/{id}/anomalies.
func (h *IntelligenceHandler) HandleGetServiceAnomalies(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	serviceID := r.PathValue("id")
	if serviceID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SERVICE_ID", "service_id path parameter is required", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if qOrg := r.URL.Query().Get("organization_id"); qOrg != "" {
		orgID = qOrg
	}

	signals, cbStatus, err := h.missionService.GetServiceAnomalies(r.Context(), orgID, serviceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ANOMALY_DETECTION_FAILED", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"service_id":             serviceID,
		"circuit_breaker_status": cbStatus,
		"anomalies":              signals,
	})
}

// HandleGetMissionObservations handles GET /v1/missions/{id}/observations.
func (h *IntelligenceHandler) HandleGetMissionObservations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	missionID := r.PathValue("id")
	if missionID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_MISSION_ID", "mission_id path parameter is required", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if qOrg := r.URL.Query().Get("organization_id"); qOrg != "" {
		orgID = qOrg
	}

	obs, err := h.missionService.GetMissionObservations(r.Context(), orgID, missionID)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			writeError(w, http.StatusForbidden, "ACCESS_DENIED", err.Error(), "")
			return
		}
		writeError(w, http.StatusNotFound, "MISSION_NOT_FOUND", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"mission_id":   missionID,
		"observations": obs,
	})
}

// HandleGetMissionRecommendations handles GET /v1/missions/{id}/recommendations.
func (h *IntelligenceHandler) HandleGetMissionRecommendations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	missionID := r.PathValue("id")
	if missionID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_MISSION_ID", "mission_id path parameter is required", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if qOrg := r.URL.Query().Get("organization_id"); qOrg != "" {
		orgID = qOrg
	}

	rec, err := h.missionService.GetMissionRecommendations(r.Context(), orgID, missionID)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			writeError(w, http.StatusForbidden, "ACCESS_DENIED", err.Error(), "")
			return
		}
		writeError(w, http.StatusBadRequest, "RECOMMENDATION_FAILED", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, rec)
}

// HandleReplanMission handles POST /v1/missions/{id}/replan.
func (h *IntelligenceHandler) HandleReplanMission(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	missionID := r.PathValue("id")
	if missionID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_MISSION_ID", "mission_id path parameter is required", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if qOrg := r.URL.Query().Get("organization_id"); qOrg != "" {
		orgID = qOrg
	}

	proposal, err := h.missionService.ReplanMission(r.Context(), orgID, missionID)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			writeError(w, http.StatusForbidden, "ACCESS_DENIED", err.Error(), "")
			return
		}
		writeError(w, http.StatusBadRequest, "REPLAN_FAILED", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, proposal)
}

// HandleGetMissionRecovery handles GET /v1/missions/{id}/recovery.
func (h *IntelligenceHandler) HandleGetMissionRecovery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	missionID := r.PathValue("id")
	if missionID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_MISSION_ID", "mission_id path parameter is required", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if qOrg := r.URL.Query().Get("organization_id"); qOrg != "" {
		orgID = qOrg
	}

	intel, err := h.missionService.GetMissionIntelligence(r.Context(), orgID, missionID)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			writeError(w, http.StatusForbidden, "ACCESS_DENIED", err.Error(), "")
			return
		}
		writeError(w, http.StatusNotFound, "MISSION_NOT_FOUND", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"mission_id":            missionID,
		"recovery_attempts":     intel.RecoveryAttempts,
		"max_recovery_attempts": intel.MaxRecoveryAttempts,
		"recommendation":        intel.CurrentRecommendation,
		"status":                intel.Status,
	})
}

// HandleGetMissionIntelligence handles GET /v1/missions/{id}/intelligence.
func (h *IntelligenceHandler) HandleGetMissionIntelligence(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	missionID := r.PathValue("id")
	if missionID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_MISSION_ID", "mission_id path parameter is required", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if qOrg := r.URL.Query().Get("organization_id"); qOrg != "" {
		orgID = qOrg
	}

	intel, err := h.missionService.GetMissionIntelligence(r.Context(), orgID, missionID)
	if err != nil {
		if strings.Contains(err.Error(), "access denied") {
			writeError(w, http.StatusForbidden, "ACCESS_DENIED", err.Error(), "")
			return
		}
		writeError(w, http.StatusNotFound, "MISSION_NOT_FOUND", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, intel)
}
