package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/runtime"
)

// RuntimeHandler handles HTTP requests for durable workflows and autonomous operations.
type RuntimeHandler struct {
	runtimeService runtime.Service
}

// NewRuntimeHandler constructs a RuntimeHandler instance.
func NewRuntimeHandler(rs runtime.Service) *RuntimeHandler {
	return &RuntimeHandler{runtimeService: rs}
}

// HandleCreateWorkflow handles POST /v1/runtime/workflows and /api/runtime/workflows.
func (h *RuntimeHandler) HandleCreateWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req runtime.CreateWorkflowParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.TenantID == "" {
		req.TenantID = getTenantID(r)
	}

	wf, err := h.runtimeService.CreateWorkflow(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(wf)
}

// HandleGetWorkflow handles GET /v1/runtime/workflows/{id} and /api/runtime/workflows/{id}.
func (h *RuntimeHandler) HandleGetWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.PathValue("id")
	if workflowID == "" {
		http.Error(w, "missing workflow id", http.StatusBadRequest)
		return
	}

	tenantID := getTenantID(r)
	wf, err := h.runtimeService.GetWorkflow(r.Context(), tenantID, workflowID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(wf)
}

// HandleListWorkflows handles GET /v1/runtime/workflows and /api/runtime/workflows.
func (h *RuntimeHandler) HandleListWorkflows(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := getTenantID(r)
	state := runtime.WorkflowState(r.URL.Query().Get("state"))
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	list, err := h.runtimeService.ListWorkflows(r.Context(), tenantID, state, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"workflows": list,
		"count":     len(list),
	})
}

// HandlePauseWorkflow handles POST /v1/runtime/workflows/{id}/pause.
func (h *RuntimeHandler) HandlePauseWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.PathValue("id")
	tenantID := getTenantID(r)
	idemKey := r.Header.Get("Idempotency-Key")
	if idemKey == "" {
		idemKey = "pause_" + workflowID
	}

	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Reason == "" {
		body.Reason = "Operator requested workflow pause"
	}

	wf, err := h.runtimeService.PauseWorkflow(r.Context(), tenantID, workflowID, body.Reason, idemKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(wf)
}

// HandleResumeWorkflow handles POST /v1/runtime/workflows/{id}/resume.
func (h *RuntimeHandler) HandleResumeWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.PathValue("id")
	tenantID := getTenantID(r)
	idemKey := r.Header.Get("Idempotency-Key")
	if idemKey == "" {
		idemKey = "resume_" + workflowID
	}

	wf, err := h.runtimeService.ResumeWorkflow(r.Context(), tenantID, workflowID, idemKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(wf)
}

// HandleCancelWorkflow handles POST /v1/runtime/workflows/{id}/cancel.
func (h *RuntimeHandler) HandleCancelWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.PathValue("id")
	tenantID := getTenantID(r)
	idemKey := r.Header.Get("Idempotency-Key")
	if idemKey == "" {
		idemKey = "cancel_" + workflowID
	}

	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Reason == "" {
		body.Reason = "Operator requested workflow cancellation"
	}

	wf, err := h.runtimeService.CancelWorkflow(r.Context(), tenantID, workflowID, body.Reason, idemKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(wf)
}

// HandleRetryStep handles POST /v1/runtime/workflows/{id}/retry.
func (h *RuntimeHandler) HandleRetryStep(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.PathValue("id")
	tenantID := getTenantID(r)
	idemKey := r.Header.Get("Idempotency-Key")
	if idemKey == "" {
		idemKey = "retry_" + workflowID
	}

	var body struct {
		StepID string `json:"step_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	step, err := h.runtimeService.RetryStep(r.Context(), tenantID, workflowID, body.StepID, idemKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(step)
}

// HandleListSteps handles GET /v1/runtime/workflows/{id}/steps.
func (h *RuntimeHandler) HandleListSteps(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.PathValue("id")
	tenantID := getTenantID(r)

	steps, err := h.runtimeService.ListSteps(r.Context(), tenantID, workflowID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"workflow_id": workflowID,
		"steps":       steps,
		"count":       len(steps),
	})
}

// HandleListCheckpoints handles GET /v1/runtime/workflows/{id}/checkpoints.
func (h *RuntimeHandler) HandleListCheckpoints(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workflowID := r.PathValue("id")
	tenantID := getTenantID(r)

	checkpoints, err := h.runtimeService.ListCheckpoints(r.Context(), tenantID, workflowID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"workflow_id": workflowID,
		"checkpoints": checkpoints,
		"count":       len(checkpoints),
	})
}

// HandleListWorkers handles GET /v1/runtime/workers.
func (h *RuntimeHandler) HandleListWorkers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workers, err := h.runtimeService.ListWorkers(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"workers": workers,
		"count":   len(workers),
	})
}

// HandleGetQueues handles GET /v1/runtime/queues.
func (h *RuntimeHandler) HandleGetQueues(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := getTenantID(r)
	metrics, err := h.runtimeService.GetMetrics(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"queue_depth":               metrics.QueueDepth,
		"active_workflows":          metrics.ActiveWorkflows,
		"waiting_workflows":         metrics.WaitingWorkflows,
		"reconciliation_queue_size": metrics.ReconciliationQueueSize,
		"worker_utilization_pct":    metrics.WorkerUtilizationPct,
	})
}

// HandleGetRecoveryQueue handles GET /v1/runtime/recovery.
func (h *RuntimeHandler) HandleGetRecoveryQueue(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := getTenantID(r)
	recoverySteps, err := h.runtimeService.GetRecoveryQueue(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"recovery_steps": recoverySteps,
		"count":          len(recoverySteps),
	})
}

// HandleListIncidents handles GET /v1/runtime/incidents.
func (h *RuntimeHandler) HandleListIncidents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := getTenantID(r)
	state := r.URL.Query().Get("state")

	incidents, err := h.runtimeService.ListIncidents(r.Context(), tenantID, state)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"incidents": incidents,
		"count":     len(incidents),
	})
}

// HandleReconcileIncident handles POST /v1/runtime/incidents/{id}/reconcile.
func (h *RuntimeHandler) HandleReconcileIncident(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	incidentID := r.PathValue("id")
	tenantID := getTenantID(r)
	idemKey := r.Header.Get("Idempotency-Key")
	if idemKey == "" {
		idemKey = "recon_" + incidentID
	}

	if err := h.runtimeService.ReconcileIncident(r.Context(), tenantID, incidentID, idemKey); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"incident_id": incidentID,
		"status":      "RESOLVED",
		"message":     "Incident reconciled and remediated successfully",
	})
}

// HandleGetMetrics handles GET /v1/runtime/metrics.
func (h *RuntimeHandler) HandleGetMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tenantID := getTenantID(r)
	metrics, err := h.runtimeService.GetMetrics(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(metrics)
}

func getTenantID(r *http.Request) string {
	tid := r.Header.Get("X-Organization-Id")
	if tid == "" {
		tid = r.URL.Query().Get("organization_id")
	}
	if tid == "" {
		tid = "default"
	}
	return tid
}
