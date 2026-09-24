package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/control"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
)

// ControlHandler provides HTTP endpoints for the Autonomous Economic Control Tower.
type ControlHandler struct {
	controlService control.Service
}

// NewControlHandler constructs a new ControlHandler.
func NewControlHandler(cs control.Service) *ControlHandler {
	return &ControlHandler{
		controlService: cs,
	}
}

// HandleOverview handles GET /v1/control/overview and /api/control/overview.
func (h *ControlHandler) HandleOverview(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	mode := r.URL.Query().Get("mode")
	if mode == "" {
		mode = "REAL"
	}

	overview, err := h.controlService.GetOverview(r.Context(), orgID, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_OVERVIEW_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(overview)
}

// HandleStateStrip handles GET /v1/control/state and /api/control/state.
func (h *ControlHandler) HandleStateStrip(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	mode := r.URL.Query().Get("mode")
	if mode == "" {
		mode = "REAL"
	}

	strip, err := h.controlService.GetStateStrip(r.Context(), orgID, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_STATE_STRIP_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(strip)
}

// HandleActivity handles GET /v1/control/activity and /api/control/activity.
func (h *ControlHandler) HandleActivity(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	mode := r.URL.Query().Get("mode")
	category := r.URL.Query().Get("category")
	limitStr := r.URL.Query().Get("limit")
	limit := 30
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	events, err := h.controlService.GetActivityTimeline(r.Context(), orgID, mode, category, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_TIMELINE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"events": events,
		"count":  len(events),
	})
}

// HandleFinancialTrace handles GET /v1/control/financial-trace/{id} and /api/control/financial-trace/{id}.
func (h *ControlHandler) HandleFinancialTrace(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		id = r.URL.Query().Get("id")
	}
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "target financial intent or trace ID is required", ctxReqID)
		return
	}
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}

	trace, err := h.controlService.GetFinancialTrace(r.Context(), orgID, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_TRACE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(trace)
}

// HandleMissionCommandCenter handles GET /v1/control/missions/{id} and /api/control/missions/{id}.
func (h *ControlHandler) HandleMissionCommandCenter(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		id = r.URL.Query().Get("id")
	}
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "mission ID is required", ctxReqID)
		return
	}
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}

	mView, err := h.controlService.GetMissionCommandCenter(r.Context(), orgID, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_MISSION_VIEW_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(mView)
}

// HandleSecurity handles GET /v1/control/security and /api/control/security.
func (h *ControlHandler) HandleSecurity(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}

	sec, err := h.controlService.GetSecurityCenter(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_SECURITY_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(sec)
}

// HandleTreasury handles GET /v1/control/treasury and /api/control/treasury.
func (h *ControlHandler) HandleTreasury(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	mode := r.URL.Query().Get("mode")
	if mode == "" {
		mode = "REAL"
	}

	tv, err := h.controlService.GetTreasuryView(r.Context(), orgID, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_TREASURY_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(tv)
}

// HandleArcStatus handles GET /v1/control/arc and /api/control/arc.
func (h *ControlHandler) HandleArcStatus(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())

	arcStatus, err := h.controlService.GetArcStatus(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_ARC_STATUS_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(arcStatus)
}

// HandleIncidents handles GET /v1/control/incidents and /api/control/incidents.
func (h *ControlHandler) HandleIncidents(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	status := r.URL.Query().Get("status")

	incidents, err := h.controlService.GetIncidents(r.Context(), orgID, status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_INCIDENTS_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"incidents": incidents,
		"count":     len(incidents),
	})
}

// HandleIntelligence handles GET /v1/control/intelligence and /api/control/intelligence.
func (h *ControlHandler) HandleIntelligence(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}

	intel, err := h.controlService.GetIntelligenceView(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_INTELLIGENCE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(intel)
}

// HandleSearch handles GET /v1/control/search and /api/control/search.
func (h *ControlHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	query := r.URL.Query().Get("q")
	if query == "" {
		query = r.URL.Query().Get("query")
	}

	results, err := h.controlService.Search(r.Context(), orgID, query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "CONTROL_SEARCH_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"query":   query,
		"results": results,
		"count":   len(results),
	})
}
