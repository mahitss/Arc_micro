package handlers

import (
	"encoding/json"
	"net/http"

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

// HandleSummary handles GET /v1/treasury/summary?organization_id=...&vault=...
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
