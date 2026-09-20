package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/auth"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// APIKeyHandler handles developer API key management.
type APIKeyHandler struct {
	repo storage.Repository
}

// NewAPIKeyHandler creates a new APIKeyHandler.
func NewAPIKeyHandler(repo storage.Repository) *APIKeyHandler {
	return &APIKeyHandler{repo: repo}
}

// CreateKeyRequest defines the input payload for creating an API key.
type CreateKeyRequest struct {
	Name   string   `json:"name"`
	Scopes []string `json:"scopes,omitempty"`
}

// CreateKeyResponse returns the generated key with its secret shown ONLY ONCE.
type CreateKeyResponse struct {
	ID             string    `json:"id"`
	Secret         string    `json:"secret"` // Shown ONLY ONCE
	MaskedKey      string    `json:"masked_key"`
	Name           string    `json:"name"`
	OrganizationID string    `json:"organization_id"`
	Scopes         []string  `json:"scopes"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	Warning        string    `json:"warning"`
}

// KeyListItemResponse returns public metadata of an API key (never secret or hash).
type KeyListItemResponse struct {
	ID             string     `json:"id"`
	MaskedKey      string     `json:"masked_key"`
	Name           string     `json:"name"`
	OrganizationID string     `json:"organization_id"`
	Scopes         []string   `json:"scopes"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	LastUsedAt     *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
}

// HandleCreate processes POST /v1/api-keys.
func (h *APIKeyHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var req CreateKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err.Error() != "EOF" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload", reqID)
		return
	}

	secret, apiKey, err := auth.GenerateAPIKey(orgID, req.Name, req.Scopes)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate API key", reqID)
		return
	}

	storageKey := &storage.APIKey{
		ID:             apiKey.ID,
		OrganizationID: apiKey.OrganizationID,
		KeyHash:        apiKey.KeyHash,
		Name:           apiKey.Name,
		MaskedKey:      apiKey.MaskedKey,
		Scopes:         strings.Join(apiKey.Scopes, ","),
		Status:         string(apiKey.Status),
		CreatedAt:      apiKey.CreatedAt,
		UpdatedAt:      apiKey.CreatedAt,
	}

	if err := h.repo.SaveAPIKey(r.Context(), storageKey); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to store API key", reqID)
		return
	}

	// Audit event
	now := time.Now().UTC()
	_ = h.repo.SaveAuditEvent(r.Context(), &storage.AuditEvent{
		ID:             "evt_" + apiKey.ID,
		OrganizationID: orgID,
		EventType:      string(domain.AuditEventAPIKeyCreated),
		ActorType:      "API",
		ActorID:        orgID,
		ResourceType:   "APIKey",
		ResourceID:     apiKey.ID,
		RequestID:      reqID,
		Timestamp:      now,
		Metadata:       fmt.Sprintf(`{"name":"%s","masked_key":"%s"}`, apiKey.Name, apiKey.MaskedKey),
	})

	resp := CreateKeyResponse{
		ID:             apiKey.ID,
		Secret:         secret,
		MaskedKey:      apiKey.MaskedKey,
		Name:           apiKey.Name,
		OrganizationID: apiKey.OrganizationID,
		Scopes:         apiKey.Scopes,
		Status:         string(apiKey.Status),
		CreatedAt:      apiKey.CreatedAt,
		Warning:        "This secret will never be displayed again. Store it securely in your environment variables.",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleList processes GET /v1/api-keys.
func (h *APIKeyHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	keys, err := h.repo.ListAPIKeys(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list API keys", reqID)
		return
	}

	items := make([]KeyListItemResponse, 0, len(keys))
	for _, k := range keys {
		var scopes []string
		if k.Scopes != "" {
			for _, s := range strings.Split(k.Scopes, ",") {
				s = strings.TrimSpace(s)
				if s != "" {
					scopes = append(scopes, s)
				}
			}
		}
		items = append(items, KeyListItemResponse{
			ID:             k.ID,
			MaskedKey:      k.MaskedKey,
			Name:           k.Name,
			OrganizationID: k.OrganizationID,
			Scopes:         scopes,
			Status:         k.Status,
			CreatedAt:      k.CreatedAt,
			LastUsedAt:     k.LastUsedAt,
			ExpiresAt:      k.ExpiresAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"api_keys": items,
	})
}

// HandleRevoke processes DELETE /v1/api-keys/{id}.
func (h *APIKeyHandler) HandleRevoke(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	keyID := r.PathValue("id")
	if keyID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_KEY_ID", "API key id is required", reqID)
		return
	}

	// Verify the key belongs to this organization before revoking
	keys, err := h.repo.ListAPIKeys(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to verify key", reqID)
		return
	}
	var found bool
	for _, k := range keys {
		if k.ID == keyID {
			found = true
			break
		}
	}
	if !found {
		// Safe error response: never leak existence across tenants
		writeError(w, http.StatusNotFound, "NOT_FOUND", "API key not found", reqID)
		return
	}

	now := time.Now().UTC()
	if err := h.repo.RevokeAPIKey(r.Context(), keyID, orgID, now); err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "API key not found", reqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to revoke API key", reqID)
		return
	}

	// Audit event
	_ = h.repo.SaveAuditEvent(r.Context(), &storage.AuditEvent{
		ID:             "evt_rev_" + keyID,
		OrganizationID: orgID,
		EventType:      string(domain.AuditEventAPIKeyRevoked),
		ActorType:      "API",
		ActorID:        orgID,
		ResourceType:   "APIKey",
		ResourceID:     keyID,
		RequestID:      reqID,
		Timestamp:      now,
		Metadata:       fmt.Sprintf(`{"revoked_at":"%s"}`, now.Format(time.RFC3339)),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"id":     keyID,
		"status": "REVOKED",
	})
}
