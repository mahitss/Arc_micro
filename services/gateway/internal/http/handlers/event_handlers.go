package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// EventHandler handles querying immutable audit and domain events.
type EventHandler struct {
	repo storage.Repository
}

// NewEventHandler creates a new EventHandler.
func NewEventHandler(repo storage.Repository) *EventHandler {
	return &EventHandler{repo: repo}
}

// HandleList processes GET /v1/events.
func (h *EventHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	eventType := r.URL.Query().Get("event_type")
	paymentIntentID := r.URL.Query().Get("payment_intent_id")
	agentID := r.URL.Query().Get("agent_id")

	limit := 50
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 500 {
			limit = l
		}
	}

	events, err := h.repo.ListAuditEventsWithFilter(r.Context(), orgID, eventType, paymentIntentID, agentID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to query events", reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"events": events,
		"total":  len(events),
		"limit":  limit,
	})
}

// HandleGet processes GET /v1/events/{id}.
func (h *EventHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")

	evt, err := h.repo.GetAuditEvent(r.Context(), id, orgID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Event not found", reqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch event", reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(evt)
}
