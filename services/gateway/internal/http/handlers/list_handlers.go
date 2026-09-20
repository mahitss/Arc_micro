package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// AgentDetail represents an agent with its configured policy and status.
type AgentDetail struct {
	ID             string                 `json:"id"`
	OrganizationID string                 `json:"organization_id,omitempty"`
	Name           string                 `json:"name"`
	Status         string                 `json:"status"`
	VaultAddress   string                 `json:"vault_address"`
	Network        string                 `json:"network"`
	USDCBalance    string                 `json:"usdc_balance"`
	Policy         map[string]interface{} `json:"policy"`
	CreatedAt      string                 `json:"created_at"`
}

// ListHandler handles querying collections of agents, services, intents, and transactions.
type ListHandler struct {
	repo     storage.Repository
	registry *registry.Registry
}

// NewListHandler creates a new ListHandler.
func NewListHandler(repo storage.Repository, reg *registry.Registry) *ListHandler {
	if reg == nil {
		reg = registry.NewDefaultRegistry()
	}
	return &ListHandler{
		repo:     repo,
		registry: reg,
	}
}

// HandleListAgents processes GET /v1/agents with organization isolation.
func (h *ListHandler) HandleListAgents(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	agents, err := h.repo.ListAgents(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	// Filter by organization if authenticated with a specific org
	filtered := make([]*storage.Agent, 0)
	for _, a := range agents {
		if a.OrganizationID == "" || orgID == "" || a.OrganizationID == orgID {
			filtered = append(filtered, a)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"agents": filtered,
	})
}

// HandleGetAgent processes GET /v1/agents/{id} with organization isolation.
func (h *ListHandler) HandleGetAgent(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_AGENT_ID", "agent id is required", ctxReqID)
		return
	}

	agent, err := h.repo.GetAgent(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "AGENT_NOT_FOUND", "Agent not found", ctxReqID)
		return
	}

	// Tenant isolation: do not leak another org's agent
	if agent.OrganizationID != "" && orgID != "" && agent.OrganizationID != orgID {
		writeError(w, http.StatusNotFound, "AGENT_NOT_FOUND", "Agent not found", ctxReqID)
		return
	}

	// Policy visualization details matching Rust policy engine configuration
	detail := AgentDetail{
		ID:             agent.ID,
		OrganizationID: agent.OrganizationID,
		Name:           agent.Name,
		Status:         agent.Status,
		VaultAddress:   "0x1111111111111111111111111111111111111111",
		Network:        "Arc Network (Chain ID 5042)",
		USDCBalance:    "12.48", // 12.48 USDC
		Policy: map[string]interface{}{
			"enabled":                  true,
			"per_transaction_limit":    "500000",   // $0.50 USDC
			"daily_spending_limit":     "5000000",  // $5.00 USDC
			"daily_spent":              "2410000",  // $2.41 USDC
			"remaining_daily_limit":    "2590000",  // $2.59 USDC
			"max_transactions_per_day": 20,
			"transactions_today":       7,
			"allowed_recipients": []string{
				"0x1111111111111111111111111111111111111111",
				"0x2222222222222222222222222222222222222222",
			},
			"blocked_recipients": []string{
				"0x000000000000000000000000000000000000dEaD",
			},
		},
		CreatedAt: agent.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(detail)
}

// HandleListServices processes GET /v1/services with optional filtering.
func (h *ListHandler) HandleListServices(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	asset := r.URL.Query().Get("asset")
	trustStatus := r.URL.Query().Get("trust_status")
	enabledStr := r.URL.Query().Get("enabled")
	enabledOnly := true
	if enabledStr == "false" || enabledStr == "0" || enabledStr == "all" {
		enabledOnly = false
	}

	services := h.registry.ListWithFilter(category, asset, trustStatus, enabledOnly)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"services": services,
	})
}

// HandleGetAgentBudget processes GET /v1/agents/{id}/budget returning safe read-only financial limits.
func (h *ListHandler) HandleGetAgentBudget(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_AGENT_ID", "agent id is required", ctxReqID)
		return
	}

	agent, err := h.repo.GetAgent(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "AGENT_NOT_FOUND", "Agent not found", ctxReqID)
		return
	}

	if agent.OrganizationID != "" && orgID != "" && agent.OrganizationID != orgID {
		writeError(w, http.StatusNotFound, "AGENT_NOT_FOUND", "Agent not found", ctxReqID)
		return
	}

	budget := map[string]interface{}{
		"agent_id":                agent.ID,
		"organization_id":         agent.OrganizationID,
		"vault_address":           "0x1111111111111111111111111111111111111111",
		"network":                 "Arc Network (Chain ID 5042)",
		"usdc_balance":            "12.48",
		"per_transaction_limit":   "500000",  // $0.50 USDC
		"daily_spending_limit":    "5000000", // $5.00 USDC
		"daily_spent":             "2410000", // $2.41 USDC
		"remaining_daily_limit":   "2590000", // $2.59 USDC
		"max_transactions_per_day": 20,
		"transactions_today":      7,
		"is_paused":               agent.Status == "PAUSED",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(budget)
}

// HandleListIntents processes GET /v1/payment-intents with organization isolation.
func (h *ListHandler) HandleListIntents(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	intents, err := h.repo.ListIntents(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))
	filtered := make([]*intent.PaymentIntent, 0)
	for _, pi := range intents {
		// Organization isolation
		if pi.OrganizationID != "" && orgID != "" && pi.OrganizationID != orgID {
			continue
		}
		if statusFilter != "" && !strings.EqualFold(string(pi.Status), statusFilter) {
			continue
		}
		filtered = append(filtered, pi)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"payment_intents": filtered,
	})
}

// HandleListTransactions processes GET /v1/transactions with organization isolation.
func (h *ListHandler) HandleListTransactions(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	executions, err := h.repo.ListExecutions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	// Filter transactions belonging to intents in this org
	filtered := make([]*intent.PaymentExecutionRecord, 0)
	for _, ex := range executions {
		pi, err := h.repo.GetIntent(r.Context(), ex.IntentID)
		if err == nil && pi != nil {
			if pi.OrganizationID != "" && orgID != "" && pi.OrganizationID != orgID {
				continue
			}
		}
		filtered = append(filtered, ex)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"transactions": filtered,
	})
}
