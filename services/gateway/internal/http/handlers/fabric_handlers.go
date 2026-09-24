package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/fabric"
)

// FabricHandler exposes HTTP endpoints for the EconomicFabric subsystem
type FabricHandler struct {
	service *fabric.EconomicFabricService
}

// NewFabricHandler creates a new handler instance
func NewFabricHandler(service *fabric.EconomicFabricService) *FabricHandler {
	return &FabricHandler{service: service}
}

// HandleCreateObjective handles POST /v1/fabric/objectives
func (h *FabricHandler) HandleCreateObjective(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req fabric.CreateObjectiveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	dryRun := r.URL.Query().Get("dry_run") == "true" || req.DryRun
	req.DryRun = dryRun

	obj, dryRunRes, err := h.service.CreateObjective(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if dryRun {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(dryRunRes)
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(obj)
}

// HandleGetObjective handles GET /v1/fabric/objectives/{id}
func (h *FabricHandler) HandleGetObjective(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := extractID(r.URL.Path, "/v1/fabric/objectives/")
	if id == "" {
		id = extractID(r.URL.Path, "/api/fabric/objectives/")
	}
	if id == "" {
		http.Error(w, "Objective ID required", http.StatusBadRequest)
		return
	}

	obj, err := h.service.GetObjective(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(obj)
}

// HandleListObjectives handles GET /v1/fabric/objectives
func (h *FabricHandler) HandleListObjectives(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := r.URL.Query().Get("tenant_id")
	objs, err := h.service.ListObjectives(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"objectives": objs})
}

// HandlePlanObjective handles POST /v1/fabric/objectives/{id}/plan
func (h *FabricHandler) HandlePlanObjective(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "plan")
	dryRun := r.URL.Query().Get("dry_run") == "true"

	bp, dryRes, err := h.service.PlanObjective(r.Context(), id, dryRun)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if dryRun {
		_ = json.NewEncoder(w).Encode(dryRes)
		return
	}
	_ = json.NewEncoder(w).Encode(bp)
}

// HandleSimulateObjective handles POST /v1/fabric/objectives/{id}/simulate
func (h *FabricHandler) HandleSimulateObjective(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "simulate")

	res, err := h.service.SimulateObjective(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

// HandleStartObjective handles POST /v1/fabric/objectives/{id}/start
func (h *FabricHandler) HandleStartObjective(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "start")
	dryRun := r.URL.Query().Get("dry_run") == "true"

	dec, dryRes, err := h.service.StartObjective(r.Context(), id, dryRun)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if dryRun {
		_ = json.NewEncoder(w).Encode(dryRes)
		return
	}
	_ = json.NewEncoder(w).Encode(dec)
}

// HandlePauseObjective handles POST /v1/fabric/objectives/{id}/pause
func (h *FabricHandler) HandlePauseObjective(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "pause")
	dryRun := r.URL.Query().Get("dry_run") == "true"

	dryRes, err := h.service.PauseObjective(r.Context(), id, dryRun)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if dryRun {
		_ = json.NewEncoder(w).Encode(dryRes)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "PAUSED"})
}

// HandleResumeObjective handles POST /v1/fabric/objectives/{id}/resume
func (h *FabricHandler) HandleResumeObjective(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "resume")
	dryRun := r.URL.Query().Get("dry_run") == "true"

	dryRes, err := h.service.ResumeObjective(r.Context(), id, dryRun)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if dryRun {
		_ = json.NewEncoder(w).Encode(dryRes)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "RUNNING"})
}

// HandleReplanObjective handles POST /v1/fabric/objectives/{id}/replan
func (h *FabricHandler) HandleReplanObjective(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "replan")
	dryRun := r.URL.Query().Get("dry_run") == "true"

	var req fabric.ReplanRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	bp, ver, dryRes, err := h.service.ReplanObjective(r.Context(), id, req, dryRun)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if dryRun {
		_ = json.NewEncoder(w).Encode(dryRes)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"blueprint": bp, "version": ver})
}

// HandleCancelObjective handles POST /v1/fabric/objectives/{id}/cancel
func (h *FabricHandler) HandleCancelObjective(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "cancel")
	dryRun := r.URL.Query().Get("dry_run") == "true"

	dryRes, err := h.service.CancelObjective(r.Context(), id, dryRun)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if dryRun {
		_ = json.NewEncoder(w).Encode(dryRes)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "CANCELLED"})
}

// HandleGetTrace handles GET /v1/fabric/objectives/{id}/trace
func (h *FabricHandler) HandleGetTrace(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "trace")
	trace, err := h.service.GetObjectiveTrace(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(trace)
}

// HandleExplainWhy handles GET /v1/fabric/objectives/{id}/why
func (h *FabricHandler) HandleExplainWhy(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "why")
	explanation, err := h.service.ExplainWhyThis(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(explanation)
}

// HandleExplainWhyNot handles GET /v1/fabric/objectives/{id}/why-not
func (h *FabricHandler) HandleExplainWhyNot(w http.ResponseWriter, r *http.Request) {
	id := extractActionTargetID(r.URL.Path, "why-not")
	explanation, err := h.service.ExplainWhyNot(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(explanation)
}

// HandleGetAutonomyMetrics handles GET /v1/fabric/metrics
func (h *FabricHandler) HandleGetAutonomyMetrics(w http.ResponseWriter, r *http.Request) {
	tenantID := r.URL.Query().Get("tenant_id")
	metrics, err := h.service.GetAutonomyMetrics(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(metrics)
}

func extractActionTargetID(path, action string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i, p := range parts {
		if p == action && i > 0 {
			return parts[i-1]
		}
	}
	if len(parts) >= 4 {
		return parts[3]
	}
	return ""
}

func extractID(path, prefix string) string {
	trimmed := strings.TrimPrefix(path, prefix)
	parts := strings.Split(trimmed, "/")
	if len(parts) > 0 && parts[0] != "" {
		return parts[0]
	}
	return ""
}
