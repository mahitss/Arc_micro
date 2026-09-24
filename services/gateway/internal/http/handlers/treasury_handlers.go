package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
)

type TreasuryHandler struct {
	treasuryService treasury.Service
}

func NewTreasuryHandler(ts treasury.Service) *TreasuryHandler {
	return &TreasuryHandler{
		treasuryService: ts,
	}
}

// HandleSummary handles GET /v1/treasury/summary
func (h *TreasuryHandler) HandleSummary(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	vault := r.URL.Query().Get("vault")

	summary, err := h.treasuryService.GetTreasurySummary(r.Context(), orgID, vault)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "TREASURY_QUERY_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(summary)
}

// HandleState handles GET /v1/treasury/state or /api/treasury/state
func (h *TreasuryHandler) HandleState(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	modeStr := r.URL.Query().Get("mode")
	mode := treasury.ModeReal
	if strings.ToUpper(modeStr) == "SIMULATION" {
		mode = treasury.ModeSimulation
	}

	state, err := h.treasuryService.GetTreasuryState(r.Context(), orgID, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "TREASURY_STATE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(state)
}

// HandleBalance handles GET /v1/treasury/balance or /api/treasury/balance
func (h *TreasuryHandler) HandleBalance(w http.ResponseWriter, r *http.Request) {
	h.HandleSummary(w, r)
}

// HandleListReservations handles GET /v1/treasury/reservations or /api/treasury/reservations
func (h *TreasuryHandler) HandleListReservations(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	modeStr := r.URL.Query().Get("mode")
	mode := treasury.ModeReal
	if strings.ToUpper(modeStr) == "SIMULATION" {
		mode = treasury.ModeSimulation
	}
	status := treasury.ReservationStatus(r.URL.Query().Get("status"))

	resList, err := h.treasuryService.ListReservations(r.Context(), orgID, mode, status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "TREASURY_RESERVATIONS_FAILED", err.Error(), ctxReqID)
		return
	}
	if resList == nil {
		resList = []*treasury.LiquidityReservation{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resList)
}

// HandleCreateReservation handles POST /v1/treasury/reservations or /api/treasury/reservations
func (h *TreasuryHandler) HandleCreateReservation(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "POST required", ctxReqID)
		return
	}

	var req treasury.LiquidityReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error(), ctxReqID)
		return
	}

	res, err := h.treasuryService.ReserveLiquidityAtomic(r.Context(), &req)
	if err != nil {
		writeError(w, http.StatusBadRequest, "RESERVATION_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(res)
}

// HandleReleaseReservation handles POST /v1/treasury/reservations/{id}/release
func (h *TreasuryHandler) HandleReleaseReservation(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		parts := strings.Split(r.URL.Path, "/")
		for i, part := range parts {
			if part == "reservations" && i+1 < len(parts) {
				id = parts[i+1]
				break
			}
		}
	}

	err := h.treasuryService.ReleaseLiquidityReservation(r.Context(), id, "API request")
	if err != nil {
		writeError(w, http.StatusBadRequest, "RELEASE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":         "RELEASED",
		"reservation_id": id,
	})
}

// HandleCommitments handles GET and POST /v1/treasury/commitments
func (h *TreasuryHandler) HandleCommitments(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	if r.Method == http.MethodPost {
		var c treasury.LiquidityCommitment
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error(), ctxReqID)
			return
		}
		if err := h.treasuryService.CreateCommitment(r.Context(), &c); err != nil {
			writeError(w, http.StatusBadRequest, "COMMITMENT_FAILED", err.Error(), ctxReqID)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(c)
		return
	}

	orgID := r.URL.Query().Get("organization_id")
	commitments, err := h.treasuryService.ListCommitments(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "COMMITMENTS_FAILED", err.Error(), ctxReqID)
		return
	}
	if commitments == nil {
		commitments = []*treasury.LiquidityCommitment{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(commitments)
}

// HandleExposure handles GET /v1/treasury/exposure
func (h *TreasuryHandler) HandleExposure(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	modeStr := r.URL.Query().Get("mode")
	mode := treasury.ModeReal
	if strings.ToUpper(modeStr) == "SIMULATION" {
		mode = treasury.ModeSimulation
	}

	envelope, err := h.treasuryService.GetLiquidityEnvelope(r.Context(), orgID, treasury.ScopeOrganization, orgID, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "EXPOSURE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(envelope)
}

// HandleForecast handles GET /v1/treasury/forecast
func (h *TreasuryHandler) HandleForecast(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	horizon := treasury.ForecastHorizon(r.URL.Query().Get("horizon"))
	if horizon == "" {
		horizon = treasury.Horizon24Hours
	}
	scenario := treasury.StressScenarioType(r.URL.Query().Get("scenario"))
	if scenario == "" {
		scenario = treasury.ScenarioBaseline
	}
	modeStr := r.URL.Query().Get("mode")
	mode := treasury.ModeReal
	if strings.ToUpper(modeStr) == "SIMULATION" {
		mode = treasury.ModeSimulation
	}

	fc, err := h.treasuryService.GenerateForecast(r.Context(), orgID, horizon, scenario, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "FORECAST_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(fc)
}

// HandleStress handles POST /v1/treasury/stress
func (h *TreasuryHandler) HandleStress(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	modeStr := r.URL.Query().Get("mode")
	mode := treasury.ModeReal
	if strings.ToUpper(modeStr) == "SIMULATION" {
		mode = treasury.ModeSimulation
	}

	var sc treasury.LiquidityStressScenario
	if r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&sc)
	}

	res, err := h.treasuryService.RunStressSimulation(r.Context(), orgID, &sc, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "STRESS_SIMULATION_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

// HandleReconciliation handles GET /v1/treasury/reconciliation
func (h *TreasuryHandler) HandleReconciliation(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	vault := r.URL.Query().Get("vault")
	modeStr := r.URL.Query().Get("mode")
	mode := treasury.ModeReal
	if strings.ToUpper(modeStr) == "SIMULATION" {
		mode = treasury.ModeSimulation
	}

	report, err := h.treasuryService.ReconcileTreasury(r.Context(), orgID, vault, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "RECONCILIATION_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(report)
}

// HandleAnomalies handles GET /v1/treasury/anomalies
func (h *TreasuryHandler) HandleAnomalies(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	modeStr := r.URL.Query().Get("mode")
	mode := treasury.ModeReal
	if strings.ToUpper(modeStr) == "SIMULATION" {
		mode = treasury.ModeSimulation
	}

	anomalies, err := h.treasuryService.DetectAnomalies(r.Context(), orgID, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ANOMALIES_FAILED", err.Error(), ctxReqID)
		return
	}
	if anomalies == nil {
		anomalies = []*treasury.LiquidityAnomaly{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(anomalies)
}

// HandleHealth handles GET /v1/treasury/health
func (h *TreasuryHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	modeStr := r.URL.Query().Get("mode")
	mode := treasury.ModeReal
	if strings.ToUpper(modeStr) == "SIMULATION" {
		mode = treasury.ModeSimulation
	}

	health, err := h.treasuryService.GetTreasuryHealth(r.Context(), orgID, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "HEALTH_QUERY_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(health)
}

// HandleInflows handles GET and POST /v1/treasury/inflows
func (h *TreasuryHandler) HandleInflows(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	if r.Method == http.MethodPost {
		var inf treasury.ExpectedInflow
		if err := json.NewDecoder(r.Body).Decode(&inf); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error(), ctxReqID)
			return
		}
		if err := h.treasuryService.RecordExpectedInflow(r.Context(), &inf); err != nil {
			writeError(w, http.StatusBadRequest, "INFLOW_FAILED", err.Error(), ctxReqID)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(inf)
		return
	}

	orgID := r.URL.Query().Get("organization_id")
	inflows, err := h.treasuryService.ListExpectedInflows(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INFLOWS_FAILED", err.Error(), ctxReqID)
		return
	}
	if inflows == nil {
		inflows = []*treasury.ExpectedInflow{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(inflows)
}
