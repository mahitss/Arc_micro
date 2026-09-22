package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/trace"
)

// PaymentIntentDetailResponse represents the full inspection response for GET /v1/payment-intents/{id}.
type PaymentIntentDetailResponse struct {
	Intent              *intent.PaymentIntent `json:"intent"`
	AuthorizationStatus string                `json:"authorization_status"`
	ExecutionStatus     string                `json:"execution_status"`
	TransactionHash     string                `json:"transaction_hash,omitempty"`
	Timestamps          IntentTimestamps      `json:"timestamps"`
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

// CreatePaymentIntentRequest represents the developer-facing request payload for POST /v1/payment-intents.
type CreatePaymentIntentRequest struct {
	AgentID       string `json:"agent_id"`
	Service       string `json:"service"`
	ServiceID     string `json:"service_id,omitempty"`
	QuoteID       string `json:"quote_id,omitempty"`
	Amount        string `json:"amount"`
	Asset         string `json:"asset"`
	Purpose       string `json:"purpose"`
	Justification string `json:"justification,omitempty"`
	VaultAddress  string `json:"vault_address,omitempty"`
}

// PaymentIntentResponse represents the developer-friendly response matching Section 9.
type PaymentIntentResponse struct {
	ID             string                 `json:"id"`
	Status         string                 `json:"status"`
	Amount         string                 `json:"amount"`
	Asset          string                 `json:"asset"`
	Service        string                 `json:"service"`
	Recipient      string                 `json:"recipient"`
	Purpose        string                 `json:"purpose,omitempty"`
	AgentID        string                 `json:"agent_id"`
	OrganizationID string                 `json:"organization_id"`
	Decision       *IntentDecisionPayload `json:"decision,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
	ExpiresAt      time.Time              `json:"expires_at"`
}

// IntentDecisionPayload represents policy & risk results in the developer response.
type IntentDecisionPayload struct {
	Result string `json:"result"`
	Risk   string `json:"risk,omitempty"`
	Reason string `json:"reason,omitempty"`
}

// PaymentIntentsHandler handles creation, retrieval, authorization, confirmation, and trace inspection of payment intents.
type PaymentIntentsHandler struct {
	intentService *intent.Service
	traceService  trace.Service
}

// NewPaymentIntentsHandler creates a new PaymentIntentsHandler.
func NewPaymentIntentsHandler(intentService *intent.Service) *PaymentIntentsHandler {
	return &PaymentIntentsHandler{
		intentService: intentService,
	}
}

// SetTraceService sets the trace reconstruction service for financial flight recorder retrieval.
func (h *PaymentIntentsHandler) SetTraceService(ts trace.Service) {
	h.traceService = ts
}

// HandleCreate processes POST /v1/payment-intents with idempotency and server-side recipient resolution.
func (h *PaymentIntentsHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	// 1. Extract idempotency key
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		idempotencyKey = strings.TrimSpace(r.Header.Get("X-Idempotency-Key"))
	}

	var req CreatePaymentIntentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload", ctxReqID)
		return
	}

	// Support both "service" and "service_id"
	svcID := req.Service
	if svcID == "" {
		svcID = req.ServiceID
	}

	if req.AgentID == "" || svcID == "" || req.Amount == "" || req.Asset == "" || req.Purpose == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "agent_id, service, amount, asset, and purpose are required", ctxReqID)
		return
	}

	vaultAddr := req.VaultAddress
	if vaultAddr == "" {
		vaultAddr = "0x1111111111111111111111111111111111111111"
	}

	// 2. Create or idempotently retrieve intent
	pi, err := h.intentService.CreateIntent(r.Context(), intent.CreateIntentParams{
		OrganizationID: orgID,
		AgentID:        req.AgentID,
		VaultAddress:   vaultAddr,
		ServiceID:      svcID,
		QuoteID:        req.QuoteID,
		Amount:         req.Amount,
		Asset:          req.Asset,
		Purpose:        req.Purpose,
		Justification:  req.Justification,
		RequestID:      idempotencyKey,
	})
	if err != nil {
		if errors.Is(err, intent.ErrIdempotencyConflict) {
			writeError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error(), ctxReqID)
			return
		}
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error(), ctxReqID)
		return
	}

	// 3. If intent was newly created, automatically authorize against Policy & Risk engine
	var decision *domain.AuthorizationDecision
	if pi.Status == intent.StatusCreated {
		authPI, dec, authErr := h.intentService.AuthorizeIntent(r.Context(), pi.IntentID)
		if authErr == nil && authPI != nil {
			pi = authPI
			decision = dec
		}
	} else if pi.PolicyDecision != "" {
		decision = &domain.AuthorizationDecision{
			Decision:   domain.Decision(pi.PolicyDecision),
			ReasonCode: domain.ReasonCode(pi.PolicyReason),
			Reason:     pi.PolicyReason,
		}
	}

	var decPayload *IntentDecisionPayload
	if decision != nil {
		riskLevel := "LOW"
		if decision.Decision == domain.DecisionApprovalRequired {
			riskLevel = "MEDIUM"
		} else if decision.Decision == domain.DecisionDeny {
			riskLevel = "HIGH"
		}
		decPayload = &IntentDecisionPayload{
			Result: string(decision.Decision),
			Risk:   riskLevel,
			Reason: decision.Reason,
		}
	}

	resp := PaymentIntentResponse{
		ID:             pi.IntentID,
		Status:         string(pi.Status),
		Amount:         pi.Amount,
		Asset:          pi.Asset,
		Service:        pi.ServiceID,
		Recipient:      pi.Recipient,
		Purpose:        pi.Purpose,
		AgentID:        pi.AgentID,
		OrganizationID: pi.OrganizationID,
		Decision:       decPayload,
		CreatedAt:      pi.CreatedAt,
		ExpiresAt:      pi.ExpiresAt,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleGet processes GET /v1/payment-intents/{id} with tenant isolation.
func (h *PaymentIntentsHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	intentID := r.PathValue("id")
	if intentID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_INTENT_ID", "intent id is required", ctxReqID)
		return
	}

	pi, ex, err := h.intentService.GetIntent(r.Context(), intentID)
	if err != nil {
		if errors.Is(err, intent.ErrIntentNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Payment intent not found", ctxReqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	// Organization isolation check: never leak another org's intent
	if pi.OrganizationID != "" && orgID != "" && pi.OrganizationID != orgID {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Payment intent not found", ctxReqID)
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

// HandleGetTrace processes GET /v1/payment-intents/{id}/trace with tenant isolation.
func (h *PaymentIntentsHandler) HandleGetTrace(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	intentID := r.PathValue("id")
	if intentID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_INTENT_ID", "intent id is required", ctxReqID)
		return
	}

	if h.traceService == nil {
		writeError(w, http.StatusNotImplemented, "TRACE_SERVICE_UNAVAILABLE", "trace service is not configured", ctxReqID)
		return
	}

	trc, err := h.traceService.GetPaymentTrace(r.Context(), orgID, intentID)
	if err != nil {
		if errors.Is(err, trace.ErrTraceNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Payment trace not found", ctxReqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(trc)
}

// HandleAuthorize processes POST /v1/payment-intents/{id}/authorize with tenant isolation.
func (h *PaymentIntentsHandler) HandleAuthorize(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	intentID := r.PathValue("id")
	if intentID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_INTENT_ID", "intent id is required", ctxReqID)
		return
	}

	existing, _, err := h.intentService.GetIntent(r.Context(), intentID)
	if err != nil || (existing.OrganizationID != "" && orgID != "" && existing.OrganizationID != orgID) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Payment intent not found", ctxReqID)
		return
	}

	pi, decision, err := h.intentService.AuthorizeIntent(r.Context(), intentID)
	if err != nil {
		if errors.Is(err, intent.ErrIntentNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Payment intent not found", ctxReqID)
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

// HandleConfirm processes POST /v1/payment-intents/{id}/confirm with tenant isolation.
func (h *PaymentIntentsHandler) HandleConfirm(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	intentID := r.PathValue("id")
	if intentID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_INTENT_ID", "intent id is required", ctxReqID)
		return
	}

	existing, _, err := h.intentService.GetIntent(r.Context(), intentID)
	if err != nil || (existing.OrganizationID != "" && orgID != "" && existing.OrganizationID != orgID) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Payment intent not found", ctxReqID)
		return
	}

	pi, execResult, err := h.intentService.ConfirmIntent(r.Context(), intentID)
	if err != nil {
		if errors.Is(err, intent.ErrIntentNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Payment intent not found", ctxReqID)
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
