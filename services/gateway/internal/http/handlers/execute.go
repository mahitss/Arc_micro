package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
)

// ExecutePaymentRequest is the incoming payload for POST /v1/payments/execute.
type ExecutePaymentRequest struct {
	RequestID    string `json:"request_id"`
	AgentID      string `json:"agent_id"`
	VaultAddress string `json:"vault_address"`
	Recipient    string `json:"recipient"`
	Amount       string `json:"amount"`
	Purpose      string `json:"purpose"`
}

// ExecutePaymentResponse represents the unified response for payment execution requests.
type ExecutePaymentResponse struct {
	RequestID       string                        `json:"request_id"`
	Status          string                        `json:"status"`
	TransactionHash string                        `json:"transaction_hash,omitempty"`
	BlockNumber     string                        `json:"block_number,omitempty"`
	Vault           string                        `json:"vault,omitempty"`
	Recipient       string                        `json:"recipient,omitempty"`
	Amount          string                        `json:"amount,omitempty"`
	ExplorerURL     string                        `json:"explorer_url,omitempty"`
	Authorization   *domain.AuthorizationDecision `json:"authorization,omitempty"`
	Error           string                        `json:"error,omitempty"`
}

// ExecuteHandler processes POST /v1/payments/execute requests.
type ExecuteHandler struct {
	policyClient     policy.Client
	executionService execution.Service
}

// NewExecuteHandler creates a new ExecuteHandler.
func NewExecuteHandler(pClient policy.Client, eService execution.Service) *ExecuteHandler {
	return &ExecuteHandler{
		policyClient:     pClient,
		executionService: eService,
	}
}

// ServeHTTP handles the incoming payment execution request.
func (h *ExecuteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only POST method is supported", "")
		return
	}

	start := time.Now()
	ctxReqID := middleware.GetRequestID(r.Context())

	var req ExecutePaymentRequest
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

	if req.RequestID == "" {
		req.RequestID = ctxReqID
	}
	activeReqID := req.RequestID
	w.Header().Set("X-Request-ID", activeReqID)

	// Validate basic required fields
	if req.AgentID == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", "missing required field: agent_id", activeReqID)
		return
	}
	if req.VaultAddress == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", "missing required field: vault_address", activeReqID)
		return
	}
	if req.Recipient == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", "missing required field: recipient", activeReqID)
		return
	}
	if req.Amount == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", "missing required field: amount", activeReqID)
		return
	}
	if req.Purpose == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", "missing required field: purpose", activeReqID)
		return
	}

	// 1. Mandatory Rust Policy Authorization: NEVER bypass the Rust policy engine
	authReq := domain.PaymentRequest{
		RequestID: activeReqID,
		AgentID:   req.AgentID,
		Recipient: req.Recipient,
		Amount:    req.Amount,
		Asset:     "USDC",
		Purpose:   req.Purpose,
	}

	authDecision, err := h.policyClient.Authorize(r.Context(), authReq)
	duration := time.Since(start)

	if err != nil {
		if errors.Is(err, policy.ErrTimeout) {
			log.Printf("[EXECUTE] req_id=%s agent_id=%s error=policy_timeout duration_ms=%d",
				activeReqID, req.AgentID, duration.Milliseconds())
			writeError(w, http.StatusGatewayTimeout, "POLICY_ENGINE_TIMEOUT", "Authorization service request timed out.", activeReqID)
			return
		}
		log.Printf("[EXECUTE] req_id=%s agent_id=%s error=policy_unavailable duration_ms=%d",
			activeReqID, req.AgentID, duration.Milliseconds())
		writeError(w, http.StatusServiceUnavailable, "POLICY_ENGINE_UNAVAILABLE", "Authorization service is temporarily unavailable.", activeReqID)
		return
	}

	// 2. If policy engine returns DENY: fail closed, send NO blockchain transaction
	if authDecision.Decision != domain.DecisionAllow {
		log.Printf("[EXECUTE] req_id=%s agent_id=%s decision=DENY reason_code=%s duration_ms=%d",
			activeReqID, req.AgentID, authDecision.ReasonCode, duration.Milliseconds())

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(ExecutePaymentResponse{
			RequestID:     activeReqID,
			Status:        "DENIED",
			Authorization: &authDecision,
			Vault:         req.VaultAddress,
			Recipient:     req.Recipient,
			Amount:        req.Amount,
		})
		return
	}

	// 3. Policy is ALLOW -> forward to execution service
	execReq := blockchain.PaymentExecutionRequest{
		RequestID:    activeReqID,
		AgentID:      req.AgentID,
		VaultAddress: req.VaultAddress,
		Recipient:    req.Recipient,
		Amount:       req.Amount,
		Purpose:      req.Purpose,
	}

	execResult, err := h.executionService.ExecutePayment(r.Context(), execReq)
	duration = time.Since(start)

	if err != nil {
		var valErr *blockchain.ValidationError
		if errors.As(err, &valErr) {
			writeError(w, http.StatusBadRequest, "VALIDATION_FAILED", valErr.Error(), activeReqID)
			return
		}

		var netErr *blockchain.NetworkMismatchError
		if errors.As(err, &netErr) {
			log.Printf("[EXECUTE] req_id=%s network_mismatch: %v", activeReqID, netErr)
			writeError(w, http.StatusServiceUnavailable, "NETWORK_MISMATCH", "Blockchain network configuration mismatch.", activeReqID)
			return
		}

		var cfgErr *blockchain.ConfigurationError
		if errors.As(err, &cfgErr) {
			log.Printf("[EXECUTE] req_id=%s configuration_error: %v", activeReqID, cfgErr)
			writeError(w, http.StatusServiceUnavailable, "BLOCKCHAIN_CONFIG_ERROR", "Blockchain execution service misconfigured.", activeReqID)
			return
		}

		var confTimeoutErr *blockchain.ConfirmationTimeoutError
		if errors.As(err, &confTimeoutErr) {
			log.Printf("[EXECUTE] req_id=%s confirmation_timeout: tx=%s", activeReqID, confTimeoutErr.TxHash)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(ExecutePaymentResponse{
				RequestID:       activeReqID,
				Status:          "SUBMITTED",
				TransactionHash: confTimeoutErr.TxHash,
				Vault:           req.VaultAddress,
				Recipient:       req.Recipient,
				Amount:          req.Amount,
				Authorization:   &authDecision,
			})
			return
		}

		log.Printf("[EXECUTE] req_id=%s execution_failed: %v duration_ms=%d",
			activeReqID, err, duration.Milliseconds())
		writeError(w, http.StatusBadGateway, "EXECUTION_FAILED", "Failed to execute transaction on blockchain.", activeReqID)
		return
	}

	// 4. Return execution outcome
	resp := ExecutePaymentResponse{
		RequestID:       execResult.RequestID,
		Status:          string(execResult.Status),
		TransactionHash: execResult.TransactionHash,
		BlockNumber:     execResult.BlockNumber,
		Vault:           execResult.Vault,
		Recipient:       execResult.Recipient,
		Amount:          execResult.Amount,
		ExplorerURL:     execResult.ExplorerURL,
		Authorization:   &authDecision,
		Error:           execResult.Error,
	}

	log.Printf("[EXECUTE] req_id=%s status=%s tx=%s duration_ms=%d",
		activeReqID, resp.Status, resp.TransactionHash, duration.Milliseconds())

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
