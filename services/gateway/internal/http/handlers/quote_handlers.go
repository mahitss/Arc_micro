package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

// QuoteHandler handles service quote generation and validation.
type QuoteHandler struct {
	registry *registry.Registry
}

// NewQuoteHandler creates a new QuoteHandler.
func NewQuoteHandler(reg *registry.Registry) *QuoteHandler {
	if reg == nil {
		reg = registry.NewDefaultRegistry()
	}
	return &QuoteHandler{registry: reg}
}

// QuoteRequestPayload represents parameters for requesting a service price quote.
type QuoteRequestPayload struct {
	Amount string `json:"amount"`
	Asset  string `json:"asset"`
}

// HandleCreateQuote processes POST /v1/services/{id}/quote.
func (h *QuoteHandler) HandleCreateQuote(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	serviceID := r.PathValue("id")
	if serviceID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_SERVICE_ID", "service id is required", ctxReqID)
		return
	}

	var payload QuoteRequestPayload
	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "invalid request body", ctxReqID)
			return
		}
	}

	quote, err := h.registry.CreateQuote(serviceID, payload.Amount, payload.Asset)
	if err != nil {
		if errors.Is(err, registry.ErrServiceNotFound) {
			writeError(w, http.StatusNotFound, "SERVICE_NOT_FOUND", err.Error(), ctxReqID)
			return
		}
		if errors.Is(err, registry.ErrServiceDisabled) {
			writeError(w, http.StatusBadRequest, "SERVICE_DISABLED", err.Error(), ctxReqID)
			return
		}
		if errors.Is(err, registry.ErrPriceExceeded) {
			writeError(w, http.StatusBadRequest, "PRICE_EXCEEDED", err.Error(), ctxReqID)
			return
		}
		if errors.Is(err, registry.ErrInvalidAmount) {
			writeError(w, http.StatusBadRequest, "INVALID_AMOUNT", err.Error(), ctxReqID)
			return
		}
		if errors.Is(err, registry.ErrInvalidAsset) {
			writeError(w, http.StatusBadRequest, "INVALID_ASSET", err.Error(), ctxReqID)
			return
		}
		writeError(w, http.StatusBadRequest, "QUOTE_ERROR", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(quote)
}
