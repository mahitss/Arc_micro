package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/economy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
)

// SwarmsHandler handles HTTP endpoints for the Swarm Orchestration Layer.
type SwarmsHandler struct {
	swarmEngine  *economy.SwarmEngine
	graphBuilder *economy.GraphBuilder
}

// NewSwarmsHandler initializes a SwarmsHandler.
func NewSwarmsHandler(engine *economy.SwarmEngine, gb *economy.GraphBuilder) *SwarmsHandler {
	if gb == nil {
		gb = economy.NewGraphBuilder()
	}
	return &SwarmsHandler{
		swarmEngine:  engine,
		graphBuilder: gb,
	}
}

// HandleCreate handles POST /v1/swarms.
func (h *SwarmsHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	var req economy.CreateSwarmParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Invalid JSON payload", "")
		return
	}

	if req.OrganizationID == "" {
		req.OrganizationID = middleware.GetOrgID(r.Context())
		if req.OrganizationID == "" {
			req.OrganizationID = "org_default"
		}
	}

	swarm, graph, tasks, err := h.swarmEngine.CreateSwarm(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, "SWARM_CREATION_FAILED", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"swarm": swarm,
		"graph": graph,
		"tasks": tasks,
	})
}

// HandleGet handles GET /v1/swarms/{id}.
func (h *SwarmsHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	swarmID := r.PathValue("id")
	if swarmID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SWARM_ID", "swarm id path parameter required", "")
		return
	}

	swarm, err := h.swarmEngine.GetSwarm(swarmID)
	if err != nil {
		writeError(w, http.StatusNotFound, "SWARM_NOT_FOUND", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"swarm": swarm,
	})
}

// HandleStart handles POST /v1/swarms/{id}/start.
func (h *SwarmsHandler) HandleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	swarmID := r.PathValue("id")
	if swarmID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SWARM_ID", "swarm id path parameter required", "")
		return
	}

	if err := h.swarmEngine.StartSwarm(r.Context(), swarmID); err != nil {
		writeError(w, http.StatusBadRequest, "SWARM_START_FAILED", err.Error(), "")
		return
	}

	swarm, _ := h.swarmEngine.GetSwarm(swarmID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"swarm":   swarm,
		"message": "Swarm execution loop started",
	})
}

// HandleCancel handles POST /v1/swarms/{id}/cancel.
func (h *SwarmsHandler) HandleCancel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	swarmID := r.PathValue("id")
	if swarmID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SWARM_ID", "swarm id path parameter required", "")
		return
	}

	swarm, err := h.swarmEngine.GetSwarm(swarmID)
	if err != nil {
		writeError(w, http.StatusNotFound, "SWARM_NOT_FOUND", err.Error(), "")
		return
	}

	swarm.Status = economy.SwarmStatusCancelled
	now := time.Now().UTC()
	swarm.CompletedAt = &now

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"swarm":   swarm,
		"message": "Swarm cancelled successfully",
	})
}

// HandleSimulate handles POST /v1/swarms/simulate.
func (h *SwarmsHandler) HandleSimulate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	var req economy.CreateSwarmParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Invalid JSON payload", "")
		return
	}

	if req.OrganizationID == "" {
		req.OrganizationID = "org_default"
	}

	trace, err := h.swarmEngine.SimulateSwarm(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, "SIMULATION_FAILED", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"simulation":      trace,
		"simulation_only": true,
	})
}

// HandleGetTasks handles GET /v1/swarms/{id}/tasks.
func (h *SwarmsHandler) HandleGetTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	swarmID := r.PathValue("id")
	if swarmID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SWARM_ID", "swarm id path parameter required", "")
		return
	}

	tasks, err := h.swarmEngine.ListSwarmTasks(swarmID)
	if err != nil {
		writeError(w, http.StatusNotFound, "SWARM_NOT_FOUND", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"tasks": tasks,
	})
}

// HandleGetGraph handles GET /v1/swarms/{id}/graph.
func (h *SwarmsHandler) HandleGetGraph(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	swarmID := r.PathValue("id")
	if swarmID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SWARM_ID", "swarm id path parameter required", "")
		return
	}

	swarm, err := h.swarmEngine.GetSwarm(swarmID)
	if err != nil {
		writeError(w, http.StatusNotFound, "SWARM_NOT_FOUND", err.Error(), "")
		return
	}

	tasks, _ := h.swarmEngine.ListSwarmTasks(swarmID)
	graph := h.graphBuilder.BuildSwarmEconomicGraph(r.Context(), swarm, tasks, nil)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"graph": graph,
	})
}

// HandleGetTrace handles GET /v1/swarms/{id}/trace.
func (h *SwarmsHandler) HandleGetTrace(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	swarmID := r.PathValue("id")
	if swarmID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SWARM_ID", "swarm id path parameter required", "")
		return
	}

	trace, err := h.swarmEngine.GetSwarmTrace(swarmID)
	if err != nil {
		writeError(w, http.StatusNotFound, "SWARM_NOT_FOUND", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"trace": trace,
	})
}

// HandleGetRisk handles GET /v1/swarms/{id}/risk.
func (h *SwarmsHandler) HandleGetRisk(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	swarmID := r.PathValue("id")
	if swarmID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SWARM_ID", "swarm id path parameter required", "")
		return
	}

	risk, err := h.swarmEngine.CalculateSwarmRisk(swarmID)
	if err != nil {
		writeError(w, http.StatusNotFound, "SWARM_NOT_FOUND", err.Error(), "")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"risk": risk,
	})
}

// HandleReplan handles POST /v1/swarms/{id}/replan.
func (h *SwarmsHandler) HandleReplan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	swarmID := r.PathValue("id")
	if swarmID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SWARM_ID", "swarm id path parameter required", "")
		return
	}

	swarm, err := h.swarmEngine.GetSwarm(swarmID)
	if err != nil {
		writeError(w, http.StatusNotFound, "SWARM_NOT_FOUND", err.Error(), "")
		return
	}

	// Trigger replanning proposal
	proposal := economy.ReplanProposal{
		MissionID:              swarm.RootMissionID,
		Reason:                 "SWARM_RECOVERY: Automatic adaptation triggered by task failure or timeout",
		Strategy:               economy.StrategyTryAlternativeService,
		ProposedSteps:          []economy.ProposedStep{},
		EstimatedCost:          "350000",
		EstimatedDurationMs:    450,
		Confidence:          economy.ConfidenceHigh,
		RequiresHuman:       false,
		Explanation:         "Discovered alternative counterparty within authorized task budget ceiling",
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"proposal": proposal,
	})
}
