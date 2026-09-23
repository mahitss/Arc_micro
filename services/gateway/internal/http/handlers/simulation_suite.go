package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/simulation"
)

// SimulationSuiteHandler exposes all Economic Simulator & Digital Twin endpoints.
type SimulationSuiteHandler struct {
	engine         *simulation.SimulationEngine
	counterfactual *simulation.CounterfactualEngine
	monteCarlo     *simulation.MonteCarloEngine
	executionGate  *simulation.ExecutionGate
	snapshotMgr    *simulation.SnapshotManager
	reg            *registry.Registry
	legacyHandler  *SimulationHandler
}

// NewSimulationSuiteHandler creates a new unified Simulation Suite handler.
func NewSimulationSuiteHandler(
	engine *simulation.SimulationEngine,
	counterfactual *simulation.CounterfactualEngine,
	monteCarlo *simulation.MonteCarloEngine,
	executionGate *simulation.ExecutionGate,
	snapshotMgr *simulation.SnapshotManager,
	reg *registry.Registry,
	legacyHandler *SimulationHandler,
) *SimulationSuiteHandler {
	return &SimulationSuiteHandler{
		engine:         engine,
		counterfactual: counterfactual,
		monteCarlo:     monteCarlo,
		executionGate:  executionGate,
		snapshotMgr:    snapshotMgr,
		reg:            reg,
		legacyHandler:  legacyHandler,
	}
}

// HandleCreate handles POST /v1/simulations.
// Supports both new full Scenario simulations and legacy single-payment dry runs.
func (h *SimulationSuiteHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "failed to read body", ctxReqID)
		return
	}
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// Check if this is a legacy dry run (has service_id & amount, but no scenario/objective)
	var rawMap map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &rawMap); err == nil {
		_, hasServiceID := rawMap["service_id"]
		_, hasAmount := rawMap["amount"]
		_, hasObjective := rawMap["objective"]
		_, hasName := rawMap["name"]
		if hasServiceID && hasAmount && !hasObjective && !hasName && h.legacyHandler != nil {
			h.legacyHandler.HandleSimulate(w, r)
			return
		}
	}

	var scenario simulation.SimulationScenario
	if err := json.Unmarshal(bodyBytes, &scenario); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "invalid simulation scenario body", ctxReqID)
		return
	}

	if scenario.OrganizationID == "" {
		scenario.OrganizationID = orgID
	}
	if scenario.Name == "" {
		scenario.Name = "Autonomous Economic Mission"
	}
	if scenario.Budget == "" {
		scenario.Budget = "5000000" // default $5.00
	}

	run, err := h.engine.CreateRun(r.Context(), scenario, h.reg)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "SIMULATION_INIT_FAILED", err.Error(), ctxReqID)
		return
	}

	// Auto-run if requested via query param or header
	if r.URL.Query().Get("auto_run") == "true" {
		executedRun, runErr := h.engine.Run(r.Context(), run.ID)
		if runErr != nil {
			writeError(w, http.StatusInternalServerError, "SIMULATION_RUN_FAILED", runErr.Error(), ctxReqID)
			return
		}
		run = executedRun
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(run)
}

// HandleList handles GET /v1/simulations.
func (h *SimulationSuiteHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	runs := h.engine.ListRuns(orgID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"simulations": runs,
		"count":       len(runs),
	})
}

// HandleGet handles GET /v1/simulations/{id}.
func (h *SimulationSuiteHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "simulation id is required", ctxReqID)
		return
	}

	run, exists := h.engine.GetRun(id)
	if !exists {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "simulation run not found", ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(run)
}

// HandleRun handles POST /v1/simulations/{id}/run.
func (h *SimulationSuiteHandler) HandleRun(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "simulation id is required", ctxReqID)
		return
	}

	run, err := h.engine.Run(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "SIMULATION_EXEC_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(run)
}

// HandleCancel handles POST /v1/simulations/{id}/cancel.
func (h *SimulationSuiteHandler) HandleCancel(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "simulation id is required", ctxReqID)
		return
	}

	run, err := h.engine.CancelRun(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "CANCEL_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(run)
}

// HandleGetTrace handles GET /v1/simulations/{id}/trace.
func (h *SimulationSuiteHandler) HandleGetTrace(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")

	run, exists := h.engine.GetRun(id)
	if !exists {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "simulation run not found", ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"simulation_id": id,
		"status":        run.Status,
		"seed":          run.Seed,
		"trace":         run.Trace,
		"count":         len(run.Trace),
	})
}

// HandleGetEconomics handles GET /v1/simulations/{id}/economics.
func (h *SimulationSuiteHandler) HandleGetEconomics(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")

	run, exists := h.engine.GetRun(id)
	if !exists {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "simulation run not found", ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"simulation_id":       id,
		"projected_economics": run.Economics,
		"worst_case_exposure": run.Exposure,
	})
}

// HandleGetRisk handles GET /v1/simulations/{id}/risk.
func (h *SimulationSuiteHandler) HandleGetRisk(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")

	run, exists := h.engine.GetRun(id)
	if !exists {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "simulation run not found", ctxReqID)
		return
	}

	// Gather distinct risk factors across steps
	factorsMap := make(map[string]bool)
	for _, step := range run.Plan.Steps {
		for _, f := range step.RiskFactors {
			factorsMap[f] = true
		}
	}

	distinctFactors := make([]string, 0, len(factorsMap))
	for f := range factorsMap {
		distinctFactors = append(distinctFactors, f)
	}

	riskCategory := "LOW"
	if run.Economics.RiskScore >= 70 {
		riskCategory = "HIGH"
	} else if run.Economics.RiskScore >= 35 {
		riskCategory = "MEDIUM"
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"simulation_id":        id,
		"risk_score":           run.Economics.RiskScore,
		"risk_level":           riskCategory,
		"contributing_factors": distinctFactors,
		"approval_required":    run.Economics.ApprovalCount > 0,
		"approval_count":       run.Economics.ApprovalCount,
		"steps_evaluated":      len(run.Plan.Steps),
	})
}

// HandleGetPlan handles GET /v1/simulations/{id}/plan.
func (h *SimulationSuiteHandler) HandleGetPlan(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")

	run, exists := h.engine.GetRun(id)
	if !exists {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "simulation run not found", ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"simulation_id":  id,
		"execution_plan": run.Plan,
	})
}

// CounterfactualBody represents incoming counterfactual parameters.
type CounterfactualBody struct {
	Description  string                         `json:"description"`
	Perturbation simulation.SimulationScenario  `json:"perturbation"`
}

// HandleCounterfactual handles POST /v1/simulations/{id}/counterfactual.
func (h *SimulationSuiteHandler) HandleCounterfactual(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")

	var body CounterfactualBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "invalid counterfactual request body", ctxReqID)
		return
	}

	if body.Description == "" {
		body.Description = "Counterfactual perturbation analysis"
	}

	comparison, cfRun, err := h.counterfactual.RunCounterfactual(r.Context(), id, body.Perturbation, body.Description)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "COUNTERFACTUAL_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"comparison":          comparison,
		"counterfactual_run":  cfRun,
	})
}

// HandleComparison handles GET /v1/simulations/{id}/comparison.
func (h *SimulationSuiteHandler) HandleComparison(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	compareTo := r.URL.Query().Get("compare_to")

	runA, existsA := h.engine.GetRun(id)
	if !existsA {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "primary simulation not found", ctxReqID)
		return
	}

	if compareTo == "" {
		// Return self baseline summary
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"simulation_a": runA,
		})
		return
	}

	runB, existsB := h.engine.GetRun(compareTo)
	if !existsB {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "comparison target simulation not found", ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"simulation_a": runA,
		"simulation_b": runB,
		"delta_spend":  runB.Economics.ProjectedSpend + " vs " + runA.Economics.ProjectedSpend,
		"delta_risk":   runB.Economics.RiskScore - runA.Economics.RiskScore,
	})
}

// HandleMonteCarlo handles POST /v1/simulations/monte-carlo.
func (h *SimulationSuiteHandler) HandleMonteCarlo(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	var req simulation.MonteCarloRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "invalid monte carlo request body", ctxReqID)
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}
	if req.Scenario.OrganizationID == "" {
		req.Scenario.OrganizationID = orgID
	}

	summary, err := h.monteCarlo.RunMonteCarlo(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "MONTE_CARLO_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(summary)
}

// HandleExecutePlan handles POST /v1/simulations/{id}/execute-plan (Phases 23 & 24).
// Revalidates fresh reality against simulation assumptions and prepares a safe live plan.
func (h *SimulationSuiteHandler) HandleExecutePlan(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	// Capture fresh live snapshot
	freshSnapshot := h.snapshotMgr.CaptureSnapshot(r.Context(), orgID, h.reg, nil)

	payload, err := h.executionGate.PrepareExecutePlan(r.Context(), id, freshSnapshot)
	if err != nil {
		if strings.Contains(err.Error(), "SIMULATION OUTDATED") {
			writeError(w, http.StatusConflict, "SIMULATION_OUTDATED", err.Error(), ctxReqID)
			return
		}
		writeError(w, http.StatusBadRequest, "PLAN_EXECUTION_REJECTED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "PLAN_VERIFIED_AND_PREPARED",
		"mode":     "LIVE",
		"payload":  payload,
		"revalidated": true,
	})
}
