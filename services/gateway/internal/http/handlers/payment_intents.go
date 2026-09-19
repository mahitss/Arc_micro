package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
)

// PaymentIntentDetailResponse represents the full inspection response for GET /v1/payment-intents/{id}.
type PaymentIntentDetailResponse struct {
	Intent              *intent.PaymentIntent  `json:"intent"`
	AuthorizationStatus string                 `json:"authorization_status"`
	ExecutionStatus     string                 `json:"execution_status"`
	TransactionHash     string                 `json:"transaction_hash,omitempty"`
	Timestamps          IntentTimestamps       `json:"timestamps"`
}

// IntentTimestamps groups all relevant lifecycle timestamps.
type IntentTimestamps struct {
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	SubmittedAt *time.Time `json:"submitted_at,omitempty"`
	ConfirmedAt *time.Time `json:"confirmed_at,omitempty"`
}

// AuthorizeIntentResponse is returned by POST /v1/payment-intents/{id}/authorize.
type AuthorizeIntentResponse struct {
	Intent   *intent.PaymentIntent         `json:"intent"`
	Decision *domain.AuthorizationDecision `json:"decision"`
}

// ConfirmIntentResponse is returned by POST /v1/payment-intents/{id}/confirm.
type ConfirmIntentResponse struct {
	Intent    *intent.PaymentIntent `json:"intent"`
	Execution interface{}           `json:"execution"`
}

// PaymentIntentsHandler handles retrieval, authorization, and confirmation of payment intents.
type PaymentIntentsHandler struct {
	intentService *intent.Service
}

// NewPaymentIntentsHandler creates a new PaymentIntentsHandler.
func NewPaymentIntentsHandler(intentService *intent.Service) *PaymentIntentsHandler {
	return &PaymentIntentsHandler{
		intentService: intentService,
	}
}

// HandleGet processes GET /v1/payment-intents/{id}.
func (h *PaymentIntentsHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	intentID := r.PathValue("id")
	if intentID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_INTENT_ID", "intent id is required", ctxReqID)
		return
	}

	pi, ex, err := h.intentService.GetIntent(r.Context(), intentID)
	if err != nil {
		if errors.Is(err, intent.ErrIntentNotFound) {
			writeError(w, http.StatusNotFound, "INTENT_NOT_FOUND", "Payment intent not found", ctxReqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	authStatus := "NONE"
	if pi.Status == intent.StatusAuthorized || pi.Status == intent.StatusExecuting || pi.Status == intent.StatusSubmitted || pi.Status == intent.StatusConfirmed {
		authStatus = "AUTHORIZED"
	} else if pi.Status == intent.StatusDenied {
		authStatus = "DENIED"
	} else if pi.Status == intent.StatusCreated {
		authStatus = "PENDING"
	} else if pi.Status == intent.StatusExpired {
		authStatus = "EXPIRED"
	}

	execStatus := "NONE"
	txHash := ""
	var subAt, confAt *time.Time
	if ex != nil {
		execStatus = ex.Status
		txHash = ex.TransactionHash
		subAt = ex.SubmittedAt
		confAt = ex.ConfirmedAt
	}

	resp := PaymentIntentDetailResponse{
		Intent:              pi,
		AuthorizationStatus: authStatus,
		ExecutionStatus:     execStatus,
		TransactionHash:     txHash,
		Timestamps: IntentTimestamps{
			CreatedAt:   pi.CreatedAt,
			ExpiresAt:   pi.ExpiresAt,
			UpdatedAt:   pi.UpdatedAt,
			SubmittedAt: subAt,
			ConfirmedAt: confAt,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleAuthorize processes POST /v1/payment-intents/{id}/authorize.
func (h *PaymentIntentsHandler) HandleAuthorize(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	intentID := r.PathValue("id")
	if intentID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_INTENT_ID", "intent id is required", ctxReqID)
		return
	}

	pi, decision, err := h.intentService.AuthorizeIntent(r.Context(), intentID)
	if err != nil {
		if errors.Is(err, intent.ErrIntentNotFound) {
			writeError(w, http.StatusNotFound, "INTENT_NOT_FOUND", "Payment intent not found", ctxReqID)
			return
		}
		if errors.Is(err, intent.ErrIntentExpired) {
			writeError(w, http.StatusGone, "INTENT_EXPIRED", "Payment intent has expired and cannot be authorized", ctxReqID)
			return
		}
		if errors.Is(err, policy.ErrTimeout) {
			writeError(w, http.StatusGatewayTimeout, "POLICY_ENGINE_TIMEOUT", "Authorization service timed out", ctxReqID)
			return
		}
		if errors.Is(err, policy.ErrUnavailable) {
			writeError(w, http.StatusServiceUnavailable, "POLICY_ENGINE_UNAVAILABLE", "Authorization service unavailable", ctxReqID)
			return
		}
		log.Printf("[INTENT_AUTHORIZE] intent_id=%s error=%v", intentID, err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	resp := AuthorizeIntentResponse{
		Intent:   pi,
		Decision: decision,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleConfirm processes POST /v1/payment-intents/{id}/confirm.
func (h *PaymentIntentsHandler) HandleConfirm(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	intentID := r.PathValue("id")
	if intentID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_INTENT_ID", "intent id is required", ctxReqID)
		return
	}

	pi, execResult, err := h.intentService.ConfirmIntent(r.Context(), intentID)
	if err != nil {
		if errors.Is(err, intent.ErrIntentNotFound) {
			writeError(w, http.StatusNotFound, "INTENT_NOT_FOUND", "Payment intent not found", ctxReqID)
			return
		}
		if errors.Is(err, intent.ErrIntentExpired) {
			writeError(w, http.StatusGone, "INTENT_EXPIRED", "Payment intent has expired and cannot be confirmed", ctxReqID)
			return
		}
		if errors.Is(err, intent.ErrNotAuthorized) {
			writeError(w, http.StatusBadRequest, "INTENT_NOT_AUTHORIZED", err.Error(), ctxReqID)
			return
		}
		log.Printf("[INTENT_CONFIRM] intent_id=%s error=%v", intentID, err)
		writeError(w, http.StatusInternalServerError, "EXECUTION_FAILED", err.Error(), ctxReqID)
		return
	}

	resp := ConfirmIntentResponse{
		Intent:    pi,
		Execution: execResult,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
