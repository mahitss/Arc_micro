package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
)

// AuthorizeHandler processes POST /v1/payments/authorize requests.
type AuthorizeHandler struct {
	policyClient policy.Client
}

// NewAuthorizeHandler creates a new AuthorizeHandler.
func NewAuthorizeHandler(client policy.Client) *AuthorizeHandler {
	return &AuthorizeHandler{
		policyClient: client,
	}
}

// ServeHTTP handles the incoming authorization request.
func (h *AuthorizeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only POST method is supported", "")
		return
	}

	start := time.Now()
	ctxReqID := middleware.GetRequestID(r.Context())

	var req domain.PaymentRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "REQUEST_TOO_LARGE", "Request payload exceeds maximum allowed size", ctxReqID)
			return
		}
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Request body contains malformed JSON", ctxReqID)
		return
	}

	// Request ID handling: use client-supplied if provided, otherwise context request ID
	if req.RequestID == "" {
		req.RequestID = ctxReqID
	}
	activeReqID := req.RequestID
	w.Header().Set("X-Request-ID", activeReqID)

	// Validate basic request shape and required fields
	if err := req.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), activeReqID)
		return
	}

	// Forward authorization to authoritative Rust Policy Engine
	decision, err := h.policyClient.Authorize(r.Context(), req)
	duration := time.Since(start)

	if err != nil {
		if errors.Is(err, policy.ErrTimeout) {
			log.Printf("[AUTHORIZE] req_id=%s agent_id=%s error=timeout duration_ms=%d",
				activeReqID, req.AgentID, duration.Milliseconds())
			writeError(w, http.StatusGatewayTimeout, "POLICY_ENGINE_TIMEOUT", "Authorization service request timed out.", activeReqID)
			return
		}

		if errors.Is(err, policy.ErrUnavailable) {
			log.Printf("[AUTHORIZE] req_id=%s agent_id=%s error=unavailable duration_ms=%d",
				activeReqID, req.AgentID, duration.Milliseconds())
			writeError(w, http.StatusServiceUnavailable, "POLICY_ENGINE_UNAVAILABLE", "Authorization service is temporarily unavailable.", activeReqID)
			return
		}

		if errors.Is(err, policy.ErrBadRequest) {
			log.Printf("[AUTHORIZE] req_id=%s agent_id=%s error=bad_request duration_ms=%d",
				activeReqID, req.AgentID, duration.Milliseconds())
			writeError(w, http.StatusBadRequest, "POLICY_ENGINE_REJECTED", "Authorization request was rejected as malformed by policy engine.", activeReqID)
			return
		}

		if errors.Is(err, policy.ErrInvalidResponse) {
			log.Printf("[AUTHORIZE] req_id=%s agent_id=%s error=invalid_response duration_ms=%d",
				activeReqID, req.AgentID, duration.Milliseconds())
			writeError(w, http.StatusServiceUnavailable, "POLICY_ENGINE_INVALID_RESPONSE", "Authorization service returned an invalid response.", activeReqID)
			return
		}

		if errors.Is(r.Context().Err(), http.ErrHandlerTimeout) || errors.Is(r.Context().Err(), io.EOF) {
			log.Printf("[AUTHORIZE] req_id=%s agent_id=%s error=context_canceled duration_ms=%d",
				activeReqID, req.AgentID, duration.Milliseconds())
			return
		}

		log.Printf("[AUTHORIZE] req_id=%s agent_id=%s error=unexpected duration_ms=%d",
			activeReqID, req.AgentID, duration.Milliseconds())
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred during authorization.", activeReqID)
		return
	}

	// Safe structured logging of decision
	log.Printf("[AUTHORIZE] req_id=%s agent_id=%s decision=%s reason_code=%s duration_ms=%d",
		activeReqID, req.AgentID, decision.Decision, decision.ReasonCode, duration.Milliseconds())

	// Both ALLOW and DENY are valid policy outcomes and return HTTP 200
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(decision)
}

func writeError(w http.ResponseWriter, status int, code, message, reqID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	resp := domain.ErrorResponse{
		Error: domain.ErrorDetail{
			Code:    code,
			Message: message,
		},
		RequestID: reqID,
	}
	_ = json.NewEncoder(w).Encode(resp)
}
