package handlers

import (
	"encoding/json"
	"math/big"
	"net/http"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
)

// SimulationHandler handles simulating hypothetical payment intents without side effects.
type SimulationHandler struct {
	policyClient policy.Client
	registry     *registry.Registry
	treasury     treasury.Service
}

// NewSimulationHandler creates a new SimulationHandler.
func NewSimulationHandler(
	policyClient policy.Client,
	reg *registry.Registry,
	ts treasury.Service,
) *SimulationHandler {
	if reg == nil {
		reg = registry.NewDefaultRegistry()
	}
	return &SimulationHandler{
		policyClient: policyClient,
		registry:     reg,
		treasury:     ts,
	}
}

// SimulationRequest represents the input parameters for simulating a payment.
type SimulationRequest struct {
	AgentID   string `json:"agent_id"`
	ServiceID string `json:"service_id"`
	Amount    string `json:"amount"`
	Asset     string `json:"asset"`
	Purpose   string `json:"purpose"`
}

// SimulationResponse represents the structured prediction of what would happen.
type SimulationResponse struct {
	Simulation         bool   `json:"simulation"`
	AgentID            string `json:"agent_id"`
	ServiceID          string `json:"service_id"`
	ServiceName        string `json:"service_name"`
	Recipient          string `json:"recipient"`
	Amount             string `json:"amount"`
	Asset              string `json:"asset"`
	PolicyDecision     string `json:"policy_decision"` // ALLOW, APPROVAL_REQUIRED, DENY
	RiskLevel          string `json:"risk_level"`      // LOW, MEDIUM, HIGH
	Reason             string `json:"reason,omitempty"`
	ApprovalRequired   bool   `json:"approval_required"`
	TreasurySufficient bool   `json:"treasury_sufficient"`
	PredictedOutcome   string `json:"predicted_outcome"` // WOULD_EXECUTE, APPROVAL_REQUIRED, WOULD_DENY, INSUFFICIENT_TREASURY
}

// HandleSimulate processes POST /v1/simulations.
func (h *SimulationHandler) HandleSimulate(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	var req SimulationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "invalid request body", ctxReqID)
		return
	}

	if req.AgentID == "" || req.ServiceID == "" || req.Amount == "" {
		writeError(w, http.StatusBadRequest, "MISSING_FIELDS", "agent_id, service_id, and amount are required", ctxReqID)
		return
	}
	if req.Asset == "" {
		req.Asset = "USDC"
	}

	// 1. Resolve and validate service
	svc, err := h.registry.ValidatePayment(req.ServiceID, req.Amount, req.Asset)
	if err != nil {
		res := SimulationResponse{
			Simulation:         true,
			AgentID:            req.AgentID,
			ServiceID:          req.ServiceID,
			Amount:             req.Amount,
			Asset:              req.Asset,
			PolicyDecision:     "DENY",
			RiskLevel:          "HIGH",
			Reason:             err.Error(),
			ApprovalRequired:   false,
			TreasurySufficient: true,
			PredictedOutcome:   "WOULD_DENY",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(res)
		return
	}

	// 2. Simulate Rust Policy Engine evaluation
	nowUnix := time.Now().Unix()
	policyReq := domain.PaymentRequest{
		RequestID:      ctxReqID,
		AgentID:        req.AgentID,
		OrganizationID: orgID,
		ServiceID:      svc.ID,
		Recipient:      svc.Recipient,
		Amount:         req.Amount,
		Asset:          req.Asset,
		Purpose:        req.Purpose,
		Timestamp:      &nowUnix,
	}

	policyDecision, err := h.policyClient.Simulate(r.Context(), policyReq)
	if err != nil {
		// Fallback to Authorize if policy engine simulate endpoint is unavailable
		policyDecision, err = h.policyClient.Authorize(r.Context(), policyReq)
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "POLICY_SIMULATION_FAILED", err.Error(), ctxReqID)
			return
		}
	}

	// 3. Check treasury feasibility if treasury service is configured
	treasurySufficient := true
	if h.treasury != nil {
		summary, err := h.treasury.GetTreasurySummary(r.Context(), orgID, "")
		if err == nil && summary != nil {
			availInt, ok1 := new(big.Int).SetString(summary.AvailableAmount, 10)
			reqInt, ok2 := new(big.Int).SetString(req.Amount, 10)
			if ok1 && ok2 && availInt.Cmp(reqInt) < 0 {
				treasurySufficient = false
			}
		}
	}

	// 4. Derive predicted outcome
	decisionStr := string(policyDecision.Decision)
	approvalReq := decisionStr == "APPROVAL_REQUIRED"
	var outcome string

	if decisionStr == "DENY" {
		outcome = "WOULD_DENY"
	} else if !treasurySufficient {
		outcome = "INSUFFICIENT_TREASURY"
	} else if approvalReq {
		outcome = "APPROVAL_REQUIRED"
	} else {
		outcome = "WOULD_EXECUTE"
	}

	riskStr := "LOW"
	if policyDecision.RiskLevel != nil {
		riskStr = string(*policyDecision.RiskLevel)
	}

	res := SimulationResponse{
		Simulation:         true,
		AgentID:            req.AgentID,
		ServiceID:          svc.ID,
		ServiceName:        svc.Name,
		Recipient:          svc.Recipient,
		Amount:             req.Amount,
		Asset:              req.Asset,
		PolicyDecision:     decisionStr,
		RiskLevel:          riskStr,
		Reason:             string(policyDecision.ReasonCode),
		ApprovalRequired:   approvalReq,
		TreasurySufficient: treasurySufficient,
		PredictedOutcome:   outcome,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(res)
}
