package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/economy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/metrics"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

// MissionsHandler handles HTTP requests for autonomous missions and economy discovery.
type MissionsHandler struct {
	missionService *economy.MissionService
	reg            *registry.Registry
	repMgr         *economy.ReputationManager
	agentCoord     *economy.AgentCoordinator
}

// NewMissionsHandler creates a new MissionsHandler.
func NewMissionsHandler(
	missionService *economy.MissionService,
	reg *registry.Registry,
	repMgr *economy.ReputationManager,
	agentCoord *economy.AgentCoordinator,
) *MissionsHandler {
	return &MissionsHandler{
		missionService: missionService,
		reg:            reg,
		repMgr:         repMgr,
		agentCoord:     agentCoord,
	}
}

// HandleCreate processes POST /v1/missions to create and plan a new mission.
func (h *MissionsHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var params economy.CreateMissionParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Request body contains malformed JSON", reqID)
		return
	}

	if params.OrganizationID == "" {
		params.OrganizationID = orgID
	}

	mission, plan, err := h.missionService.CreateMission(r.Context(), params)
	if err != nil {
		metrics.DefaultMetrics.IncrMissionsFailed()
		writeError(w, http.StatusBadRequest, "MISSION_CREATION_FAILED", err.Error(), reqID)
		return
	}

	metrics.DefaultMetrics.IncrMissionsCreated()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"mission": mission,
		"plan":    plan,
	})
}

// HandleList processes GET /v1/missions.
func (h *MissionsHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	missions, err := h.missionService.ListMissions(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "STORAGE_ERROR", err.Error(), reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"missions": missions,
		"count":    len(missions),
	})
}

// HandleGet processes GET /v1/missions/{id}.
func (h *MissionsHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Mission ID is required", reqID)
		return
	}

	mission, err := h.missionService.GetMission(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Mission not found", reqID)
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if orgID != "" && mission.OrganizationID != "" && mission.OrganizationID != orgID {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Mission not found", reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(mission)
}

// HandleStart processes POST /v1/missions/{id}/start.
func (h *MissionsHandler) HandleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Mission ID is required", reqID)
		return
	}

	mission, err := h.missionService.StartMission(r.Context(), id)
	if err != nil {
		metrics.DefaultMetrics.IncrMissionsFailed()
		writeError(w, http.StatusInternalServerError, "EXECUTION_ERROR", err.Error(), reqID)
		return
	}

	if mission.Status == economy.StatusCompleted {
		metrics.DefaultMetrics.IncrMissionsCompleted()
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(mission)
}

// HandleCancel processes POST /v1/missions/{id}/cancel.
func (h *MissionsHandler) HandleCancel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Mission ID is required", reqID)
		return
	}

	mission, err := h.missionService.CancelMission(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "CANCEL_FAILED", err.Error(), reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(mission)
}

// HandleSimulate processes POST /v1/missions/simulate.
func (h *MissionsHandler) HandleSimulate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var params economy.CreateMissionParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Request body contains malformed JSON", reqID)
		return
	}

	if params.OrganizationID == "" {
		params.OrganizationID = orgID
	}

	result, err := h.missionService.SimulateMission(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusBadRequest, "SIMULATION_FAILED", err.Error(), reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(result)
}

// HandleGetTrace processes GET /v1/missions/{id}/trace.
func (h *MissionsHandler) HandleGetTrace(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	orgID := middleware.GetOrgID(r.Context())

	trace, err := h.missionService.GetMissionTrace(r.Context(), orgID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "TRACE_NOT_FOUND", err.Error(), reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(trace)
}

// HandleMarketplace processes GET /v1/marketplace to return discoverable services & peer agents.
func (h *MissionsHandler) HandleMarketplace(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	services := h.reg.List()

	type MarketplaceItem struct {
		Service    *registry.Service          `json:"service"`
		Reputation *economy.ServiceReputation `json:"reputation"`
	}

	items := make([]MarketplaceItem, 0, len(services))
	for _, s := range services {
		rep := h.repMgr.GetReputation(r.Context(), orgID, s.ID)
		items = append(items, MarketplaceItem{
			Service:    s,
			Reputation: rep,
		})
	}

	peerAgents := h.agentCoord.ListAgentServices()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"marketplace_services": items,
		"peer_agents":          peerAgents,
		"timestamp":            time.Now().UTC(),
	})
}

// HandleReputation processes GET /v1/economy/reputation.
func (h *MissionsHandler) HandleReputation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	services := h.reg.List()

	reputations := make([]*economy.ServiceReputation, 0, len(services))
	for _, s := range services {
		rep := h.repMgr.GetReputation(r.Context(), orgID, s.ID)
		reputations = append(reputations, rep)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"organization_id": orgID,
		"reputations":     reputations,
	})
}
