package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/operations"
)

// OperationsHandler handles HTTP requests for the Autonomous Operations OS.
type OperationsHandler struct {
	opsService *operations.OperationsService
}

// NewOperationsHandler constructs an OperationsHandler instance.
func NewOperationsHandler(ops *operations.OperationsService) *OperationsHandler {
	return &OperationsHandler{opsService: ops}
}

// HandleGetStatus handles GET /v1/operations and /api/operations.
func (h *OperationsHandler) HandleGetStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	snap, err := h.opsService.GetSnapshot(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	health := h.opsService.GetHealth(r.Context(), tenantID)

	resp := map[string]interface{}{
		"system":      "AgentPay Autonomous Operations OS",
		"status":      "OPERATIONAL",
		"snapshot":    snap,
		"health":      health.OverallState,
		"arc_state":   health.Arc.StatusText,
		"timestamp":   time.Now().UTC(),
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleGetHealth handles GET /v1/operations/health and /api/operations/health.
func (h *OperationsHandler) HandleGetHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	health := h.opsService.GetHealth(r.Context(), tenantID)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(health)
}

// HandleGetSnapshot handles GET /v1/operations/snapshot and /api/operations/snapshot.
func (h *OperationsHandler) HandleGetSnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	snap, err := h.opsService.GetSnapshot(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(snap)
}

// HandleListWorkflows handles GET /v1/operations/workflows and /api/operations/workflows.
func (h *OperationsHandler) HandleListWorkflows(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	wfs, err := h.opsService.ListSupervisedWorkflows(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"workflows": wfs,
		"total":     len(wfs),
	})
}

// HandleListWorkers handles GET /v1/operations/workers and /api/operations/workers.
func (h *OperationsHandler) HandleListWorkers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	workers, err := h.opsService.ListSupervisedWorkers(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"workers": workers,
		"total":   len(workers),
	})
}

// HandleGetQueues handles GET /v1/operations/queues and /api/operations/queues.
func (h *OperationsHandler) HandleGetQueues(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	qData := h.opsService.GetQueues(r.Context(), tenantID)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(qData)
}

// HandleListIncidents handles GET /v1/operations/incidents and /api/operations/incidents.
func (h *OperationsHandler) HandleListIncidents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	incidents, err := h.opsService.ListIncidents(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"incidents": incidents,
		"total":     len(incidents),
	})
}

// HandleMitigateIncident handles POST /v1/operations/incidents/{id}/mitigate.
func (h *OperationsHandler) HandleMitigateIncident(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	incidentID := r.PathValue("id")
	if incidentID == "" {
		http.Error(w, "missing incident id", http.StatusBadRequest)
		return
	}

	var req struct {
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.opsService.MitigateIncident(r.Context(), tenantID, incidentID, req.Action); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"incident_id": incidentID,
		"action":      req.Action,
		"status":      "MITIGATING",
	})
}

// HandleGetTopology handles GET /v1/operations/topology and /api/operations/topology.
func (h *OperationsHandler) HandleGetTopology(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	topo := h.opsService.GetTopology(r.Context(), tenantID)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(topo)
}

// HandleGetTimeline handles GET /v1/operations/timeline and /api/operations/timeline.
func (h *OperationsHandler) HandleGetTimeline(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	limit := 50
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if parsed, err := strconv.Atoi(lStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	events := h.opsService.GetTimeline(r.Context(), tenantID, limit)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"events": events,
		"total":  len(events),
	})
}

// HandleGetGraph handles GET /v1/operations/graph and /api/operations/graph.
func (h *OperationsHandler) HandleGetGraph(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	graph, err := h.opsService.GetOperationalGraph(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(graph)
}

// HandleGetReplay handles GET /v1/operations/replay/{workflowId}.
func (h *OperationsHandler) HandleGetReplay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	workflowID := r.PathValue("workflowId")
	if workflowID == "" {
		http.Error(w, "missing workflow id", http.StatusBadRequest)
		return
	}

	replay, err := h.opsService.GetReplay(r.Context(), tenantID, workflowID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(replay)
}

// HandleGetStateAt handles GET /v1/operations/state-at/{timestamp}.
func (h *OperationsHandler) HandleGetStateAt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	tsParam := r.PathValue("timestamp")
	if tsParam == "" {
		http.Error(w, "missing timestamp", http.StatusBadRequest)
		return
	}

	targetTime, err := time.Parse(time.RFC3339, tsParam)
	if err != nil {
		// Try unix timestamp
		if sec, errUnix := strconv.ParseInt(tsParam, 10, 64); errUnix == nil {
			targetTime = time.Unix(sec, 0).UTC()
		} else {
			http.Error(w, "invalid timestamp format; use RFC3339 or unix seconds", http.StatusBadRequest)
			return
		}
	}

	state := h.opsService.GetStateAt(r.Context(), tenantID, targetTime)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(state)
}

// HandleExplainEvent handles GET /v1/operations/why/{eventId}.
func (h *OperationsHandler) HandleExplainEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	eventID := r.PathValue("eventId")
	if eventID == "" {
		http.Error(w, "missing event id", http.StatusBadRequest)
		return
	}

	expl, err := h.opsService.ExplainEvent(r.Context(), tenantID, eventID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(expl)
}

// HandleGetNextAction handles GET /v1/operations/next/{workflowId}.
func (h *OperationsHandler) HandleGetNextAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := getTenantID(r)
	workflowID := r.PathValue("workflowId")
	if workflowID == "" {
		http.Error(w, "missing workflow id", http.StatusBadRequest)
		return
	}

	next := h.opsService.GetNextAction(r.Context(), tenantID, workflowID)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(next)
}
