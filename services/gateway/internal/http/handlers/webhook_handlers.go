package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/webhook"
)

// WebhookHandler provides HTTP endpoints for managing webhook endpoints and deliveries.
type WebhookHandler struct {
	repo       storage.Repository
	dispatcher *webhook.Dispatcher
	validator  *webhook.SSRFValidator
}

// NewWebhookHandler creates a new WebhookHandler.
func NewWebhookHandler(repo storage.Repository, dispatcher *webhook.Dispatcher, validator *webhook.SSRFValidator) *WebhookHandler {
	return &WebhookHandler{
		repo:       repo,
		dispatcher: dispatcher,
		validator:  validator,
	}
}

// CreateWebhookEndpointRequest defines the input payload for registering a webhook endpoint.
type CreateWebhookEndpointRequest struct {
	URL              string   `json:"url"`
	Description      string   `json:"description,omitempty"`
	SubscribedEvents []string `json:"subscribed_events,omitempty"`
}

// CreateWebhookEndpointResponse returns the newly created endpoint and the secret ONLY ONCE.
type CreateWebhookEndpointResponse struct {
	ID               string    `json:"id"`
	OrganizationID   string    `json:"organization_id"`
	URL              string    `json:"url"`
	Description      string    `json:"description"`
	SubscribedEvents []string  `json:"subscribed_events"`
	Enabled          bool      `json:"enabled"`
	Secret           string    `json:"secret"` // Shown ONLY ONCE
	CreatedAt        time.Time `json:"created_at"`
	Warning          string    `json:"warning"`
}

// WebhookEndpointResponse returns safe public metadata of a webhook endpoint (no secret/hash).
type WebhookEndpointResponse struct {
	ID               string     `json:"id"`
	OrganizationID   string     `json:"organization_id"`
	URL              string     `json:"url"`
	Description      string     `json:"description"`
	SubscribedEvents []string   `json:"subscribed_events"`
	Enabled          bool       `json:"enabled"`
	FailureCount     int        `json:"failure_count"`
	LastDeliveryAt   *time.Time `json:"last_delivery_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// UpdateWebhookEndpointRequest defines partial updates to a webhook endpoint.
type UpdateWebhookEndpointRequest struct {
	URL              *string   `json:"url,omitempty"`
	Description      *string   `json:"description,omitempty"`
	SubscribedEvents *[]string `json:"subscribed_events,omitempty"`
	Enabled          *bool     `json:"enabled,omitempty"`
}

// HandleCreate processes POST /v1/webhooks.
func (h *WebhookHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var req CreateWebhookEndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload", reqID)
		return
	}

	if req.URL == "" {
		writeError(w, http.StatusBadRequest, "INVALID_URL", "Destination URL is required", reqID)
		return
	}

	// SSRF validation
	if _, err := h.validator.ValidateURL(req.URL); err != nil {
		writeError(w, http.StatusBadRequest, "SSRF_BLOCKED", err.Error(), reqID)
		return
	}

	subEvents := req.SubscribedEvents
	if len(subEvents) == 0 {
		subEvents = []string{"*"}
	}

	secret, err := webhook.GenerateWebhookSecret()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate webhook secret", reqID)
		return
	}

	now := time.Now().UTC()
	ep := &webhook.WebhookEndpoint{
		ID:               webhook.GenerateEndpointID(),
		OrganizationID:   orgID,
		URL:              req.URL,
		SecretHash:       webhook.HashSecret(secret),
		Description:      req.Description,
		SubscribedEvents: subEvents,
		Enabled:          true,
		FailureCount:     0,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := h.repo.SaveWebhookEndpoint(r.Context(), ep); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save webhook endpoint", reqID)
		return
	}

	if h.dispatcher != nil {
		h.dispatcher.RegisterSecret(ep.ID, secret)
	}

	// Audit event
	_ = h.repo.SaveAuditEvent(r.Context(), &storage.AuditEvent{
		ID:             "evt_" + ep.ID,
		OrganizationID: orgID,
		EventType:      "webhook_endpoint.created",
		ActorType:      "API",
		ActorID:        orgID,
		ResourceType:   "WEBHOOK_ENDPOINT",
		ResourceID:     ep.ID,
		RequestID:      reqID,
		CorrelationID:  reqID,
		Timestamp:      now,
		Metadata:       fmt.Sprintf(`{"url":"%s","events":"%v"}`, ep.URL, ep.SubscribedEvents),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(CreateWebhookEndpointResponse{
		ID:               ep.ID,
		OrganizationID:   ep.OrganizationID,
		URL:              ep.URL,
		Description:      ep.Description,
		SubscribedEvents: ep.SubscribedEvents,
		Enabled:          ep.Enabled,
		Secret:           secret,
		CreatedAt:        ep.CreatedAt,
		Warning:          "Store this secret securely. It will never be displayed again. Use it to verify webhook signatures.",
	})
}

// HandleList processes GET /v1/webhooks.
func (h *WebhookHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	endpoints, err := h.repo.ListWebhookEndpoints(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list webhook endpoints", reqID)
		return
	}

	resp := make([]WebhookEndpointResponse, 0, len(endpoints))
	for _, ep := range endpoints {
		resp = append(resp, WebhookEndpointResponse{
			ID:               ep.ID,
			OrganizationID:   ep.OrganizationID,
			URL:              ep.URL,
			Description:      ep.Description,
			SubscribedEvents: ep.SubscribedEvents,
			Enabled:          ep.Enabled,
			FailureCount:     ep.FailureCount,
			LastDeliveryAt:   ep.LastDeliveryAt,
			CreatedAt:        ep.CreatedAt,
			UpdatedAt:        ep.UpdatedAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"endpoints": resp,
		"total":     len(resp),
	})
}

// HandleGet processes GET /v1/webhooks/{id}.
func (h *WebhookHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")

	ep, err := h.repo.GetWebhookEndpoint(r.Context(), id, orgID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Webhook endpoint not found", reqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch webhook endpoint", reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(WebhookEndpointResponse{
		ID:               ep.ID,
		OrganizationID:   ep.OrganizationID,
		URL:              ep.URL,
		Description:      ep.Description,
		SubscribedEvents: ep.SubscribedEvents,
		Enabled:          ep.Enabled,
		FailureCount:     ep.FailureCount,
		LastDeliveryAt:   ep.LastDeliveryAt,
		CreatedAt:        ep.CreatedAt,
		UpdatedAt:        ep.UpdatedAt,
	})
}

// HandleUpdate processes PATCH /v1/webhooks/{id}.
func (h *WebhookHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")

	ep, err := h.repo.GetWebhookEndpoint(r.Context(), id, orgID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Webhook endpoint not found", reqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch webhook endpoint", reqID)
		return
	}

	var req UpdateWebhookEndpointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload", reqID)
		return
	}

	if req.URL != nil {
		if *req.URL == "" {
			writeError(w, http.StatusBadRequest, "INVALID_URL", "Destination URL cannot be empty", reqID)
			return
		}
		if _, err := h.validator.ValidateURL(*req.URL); err != nil {
			writeError(w, http.StatusBadRequest, "SSRF_BLOCKED", err.Error(), reqID)
			return
		}
		ep.URL = *req.URL
	}

	if req.Description != nil {
		ep.Description = *req.Description
	}

	if req.SubscribedEvents != nil {
		ep.SubscribedEvents = *req.SubscribedEvents
	}

	if req.Enabled != nil {
		ep.Enabled = *req.Enabled
	}

	ep.UpdatedAt = time.Now().UTC()

	if err := h.repo.UpdateWebhookEndpoint(r.Context(), ep); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update webhook endpoint", reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(WebhookEndpointResponse{
		ID:               ep.ID,
		OrganizationID:   ep.OrganizationID,
		URL:              ep.URL,
		Description:      ep.Description,
		SubscribedEvents: ep.SubscribedEvents,
		Enabled:          ep.Enabled,
		FailureCount:     ep.FailureCount,
		LastDeliveryAt:   ep.LastDeliveryAt,
		CreatedAt:        ep.CreatedAt,
		UpdatedAt:        ep.UpdatedAt,
	})
}

// HandleDelete processes DELETE /v1/webhooks/{id}.
func (h *WebhookHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")

	if err := h.repo.DeleteWebhookEndpoint(r.Context(), id, orgID); err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Webhook endpoint not found", reqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete webhook endpoint", reqID)
		return
	}

	_ = h.repo.SaveAuditEvent(r.Context(), &storage.AuditEvent{
		ID:             "evt_del_" + id,
		OrganizationID: orgID,
		EventType:      "webhook_endpoint.deleted",
		ActorType:      "API",
		ActorID:        orgID,
		ResourceType:   "WEBHOOK_ENDPOINT",
		ResourceID:     id,
		RequestID:      reqID,
		CorrelationID:  reqID,
		Timestamp:      time.Now().UTC(),
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"deleted": true,
		"id":      id,
	})
}

// HandleListDeliveries processes GET /v1/webhooks/{id}/deliveries.
func (h *WebhookHandler) HandleListDeliveries(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")

	limit := 50
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	deliveries, err := h.repo.ListWebhookDeliveries(r.Context(), id, orgID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list webhook deliveries", reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"deliveries": deliveries,
		"total":      len(deliveries),
	})
}

// HandleTest processes POST /v1/webhooks/{id}/test.
func (h *WebhookHandler) HandleTest(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")

	ep, err := h.repo.GetWebhookEndpoint(r.Context(), id, orgID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Webhook endpoint not found", reqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch webhook endpoint", reqID)
		return
	}

	if h.dispatcher == nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Webhook dispatcher not configured", reqID)
		return
	}

	delivery, err := h.dispatcher.TestEndpoint(r.Context(), ep)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DISPATCH_ERROR", err.Error(), reqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   delivery.Status,
		"delivery": delivery,
		"message":  "Test ping webhook event dispatched successfully",
	})
}
