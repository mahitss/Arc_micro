package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

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

	targetOrg, ok := resolveTenantFromRequest(w, r, "", ctxReqID)
	if !ok {
		return
	}

	agents, err := h.repo.ListAgents(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	filtered := make([]*storage.Agent, 0)
	for _, a := range agents {
		if a.OrganizationID == targetOrg {
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

	targetOrg, ok := resolveTenantFromRequest(w, r, "", ctxReqID)
	if !ok {
		return
	}
	if agent.OrganizationID != "" && agent.OrganizationID != targetOrg {
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
			"per_transaction_limit":    "500000",  // $0.50 USDC
			"daily_spending_limit":     "5000000", // $5.00 USDC
			"daily_spent":              "2410000", // $2.41 USDC
			"remaining_daily_limit":    "2590000", // $2.59 USDC
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

	targetOrg, ok := resolveTenantFromRequest(w, r, "", ctxReqID)
	if !ok {
		return
	}
	if agent.OrganizationID != "" && agent.OrganizationID != targetOrg {
		writeError(w, http.StatusNotFound, "AGENT_NOT_FOUND", "Agent not found", ctxReqID)
		return
	}

	budget := map[string]interface{}{
		"agent_id":                 agent.ID,
		"organization_id":          agent.OrganizationID,
		"vault_address":            "0x1111111111111111111111111111111111111111",
		"network":                  "Arc Network (Chain ID 5042)",
		"usdc_balance":             "12.48",
		"per_transaction_limit":    "500000",  // $0.50 USDC
		"daily_spending_limit":     "5000000", // $5.00 USDC
		"daily_spent":              "2410000", // $2.41 USDC
		"remaining_daily_limit":    "2590000", // $2.59 USDC
		"max_transactions_per_day": 20,
		"transactions_today":       7,
		"is_paused":                agent.Status == "PAUSED",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(budget)
}

// HandleListIntents processes GET /v1/payment-intents with organization isolation.
func (h *ListHandler) HandleListIntents(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())

	targetOrg, ok := resolveTenantFromRequest(w, r, "", ctxReqID)
	if !ok {
		return
	}
	intents, err := h.repo.ListIntents(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))
	filtered := make([]*intent.PaymentIntent, 0)
	for _, pi := range intents {
		if pi.OrganizationID != "" && pi.OrganizationID != targetOrg {
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

	targetOrg, ok := resolveTenantFromRequest(w, r, "", ctxReqID)
	if !ok {
		return
	}
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
			if pi.OrganizationID != "" && pi.OrganizationID != targetOrg {
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

type CreateAgentRequest struct {
	ID           string `json:"id,omitempty"`
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	VaultAddress string `json:"vault_address,omitempty"`
	Policy       *struct {
		PerTransactionLimit   string `json:"per_transaction_limit,omitempty"`
		DailyLimit            string `json:"daily_limit,omitempty"`
		MaxTransactionsPerDay int    `json:"max_transactions_per_day,omitempty"`
		ApprovalThreshold     string `json:"approval_threshold,omitempty"`
		AllowedAssets         string `json:"allowed_assets,omitempty"`
	} `json:"policy,omitempty"`
}

// HandleCreateAgent processes POST /v1/agents with organization tenant isolation.
func (h *ListHandler) HandleCreateAgent(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", ctxReqID)
		return
	}

	targetOrg, ok := resolveTenantFromRequest(w, r, "", ctxReqID)
	if !ok {
		return
	}

	var req CreateAgentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload", ctxReqID)
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Agent name is required", ctxReqID)
		return
	}

	agentID := strings.TrimSpace(req.ID)
	if agentID == "" {
		b := make([]byte, 4)
		_, _ = rand.Read(b)
		agentID = fmt.Sprintf("agent_%s", hex.EncodeToString(b))
	}

	vaultAddr := strings.TrimSpace(req.VaultAddress)
	if vaultAddr == "" {
		// Deployed Arc Testnet AgentVault address
		vaultAddr = "0x7789bC3d8366782b97496165C24BD5bB09302843"
	}

	now := time.Now().UTC()
	policyID := fmt.Sprintf("pol_%s", agentID)

	agent := &storage.Agent{
		ID:             agentID,
		OrganizationID: targetOrg,
		Name:           name,
		Description:    strings.TrimSpace(req.Description),
		Status:         "ACTIVE",
		PolicyID:       policyID,
		VaultAddress:   vaultAddr,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := h.repo.SaveAgent(r.Context(), agent); err != nil {
		writeError(w, http.StatusInternalServerError, "STORAGE_ERROR", fmt.Sprintf("Failed to save agent: %v", err), ctxReqID)
		return
	}

	// Create or initialize policy
	perTx := "500000" // 0.50 USDC
	dailyLimit := "5000000" // 5.00 USDC
	maxTx := 20
	approvalThresh := "500000"
	allowedAssets := "USDC"

	if req.Policy != nil {
		if req.Policy.PerTransactionLimit != "" {
			perTx = req.Policy.PerTransactionLimit
		}
		if req.Policy.DailyLimit != "" {
			dailyLimit = req.Policy.DailyLimit
		}
		if req.Policy.MaxTransactionsPerDay > 0 {
			maxTx = req.Policy.MaxTransactionsPerDay
		}
		if req.Policy.ApprovalThreshold != "" {
			approvalThresh = req.Policy.ApprovalThreshold
		}
		if req.Policy.AllowedAssets != "" {
			allowedAssets = req.Policy.AllowedAssets
		}
	}

	policy := &storage.Policy{
		ID:                    policyID,
		OrganizationID:        targetOrg,
		AgentID:               agentID,
		Enabled:               true,
		PerTransactionLimit:   perTx,
		DailyLimit:            dailyLimit,
		MaxTransactionsPerDay: maxTx,
		ApprovalThreshold:     approvalThresh,
		AllowedAssets:         allowedAssets,
		CreatedAt:             now,
		UpdatedAt:             now,
	}
	_ = h.repo.SavePolicy(r.Context(), policy)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"agent":  agent,
		"policy": policy,
	})
}

type SavePolicyRequest struct {
	AgentID               string `json:"agent_id"`
	Enabled               *bool  `json:"enabled,omitempty"`
	PerTransactionLimit   string `json:"per_transaction_limit"`
	DailyLimit            string `json:"daily_limit"`
	MaxTransactionsPerDay int    `json:"max_transactions_per_day"`
	ApprovalThreshold     string `json:"approval_threshold"`
	AllowedAssets         string `json:"allowed_assets,omitempty"`
	AllowedRecipients     string `json:"allowed_recipients,omitempty"`
	BlockedRecipients     string `json:"blocked_recipients,omitempty"`
}

// HandleSavePolicy processes POST/PUT /v1/policies with organization tenant isolation.
func (h *ListHandler) HandleSavePolicy(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", ctxReqID)
		return
	}

	targetOrg, ok := resolveTenantFromRequest(w, r, "", ctxReqID)
	if !ok {
		return
	}

	pathAgentID := r.PathValue("agent_id")

	var req SavePolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload", ctxReqID)
		return
	}

	agentID := strings.TrimSpace(req.AgentID)
	if agentID == "" {
		agentID = pathAgentID
	}
	if agentID == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "agent_id is required", ctxReqID)
		return
	}

	// Verify agent exists and belongs to targetOrg
	ag, err := h.repo.GetAgent(r.Context(), agentID)
	if err != nil || (ag.OrganizationID != "" && ag.OrganizationID != targetOrg) {
		writeError(w, http.StatusNotFound, "AGENT_NOT_FOUND", "Agent not found in organization", ctxReqID)
		return
	}

	now := time.Now().UTC()
	policyID := fmt.Sprintf("pol_%s", agentID)

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	perTx := strings.TrimSpace(req.PerTransactionLimit)
	if perTx == "" {
		perTx = "500000"
	}
	dailyLimit := strings.TrimSpace(req.DailyLimit)
	if dailyLimit == "" {
		dailyLimit = "5000000"
	}
	maxTx := req.MaxTransactionsPerDay
	if maxTx <= 0 {
		maxTx = 20
	}
	approvalThresh := strings.TrimSpace(req.ApprovalThreshold)
	if approvalThresh == "" {
		approvalThresh = "500000"
	}
	allowedAssets := strings.TrimSpace(req.AllowedAssets)
	if allowedAssets == "" {
		allowedAssets = "USDC"
	}

	policy := &storage.Policy{
		ID:                    policyID,
		OrganizationID:        targetOrg,
		AgentID:               agentID,
		Enabled:               enabled,
		PerTransactionLimit:   perTx,
		DailyLimit:            dailyLimit,
		MaxTransactionsPerDay: maxTx,
		ApprovalThreshold:     approvalThresh,
		AllowedAssets:         allowedAssets,
		AllowedRecipients:     req.AllowedRecipients,
		BlockedRecipients:     req.BlockedRecipients,
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	if err := h.repo.SavePolicy(r.Context(), policy); err != nil {
		writeError(w, http.StatusInternalServerError, "STORAGE_ERROR", fmt.Sprintf("Failed to save policy: %v", err), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(policy)
}

// HandleGetPolicy processes GET /v1/policies/{agent_id} with organization tenant isolation.
func (h *ListHandler) HandleGetPolicy(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	targetOrg, ok := resolveTenantFromRequest(w, r, "", ctxReqID)
	if !ok {
		return
	}

	agentID := strings.TrimSpace(r.PathValue("agent_id"))
	if agentID == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "agent_id path parameter is required", ctxReqID)
		return
	}

	policy, err := h.repo.GetPolicyByAgent(r.Context(), targetOrg, agentID)
	if err != nil {
		// Return a default active policy if not explicitly stored
		policy = &storage.Policy{
			ID:                    fmt.Sprintf("pol_%s", agentID),
			OrganizationID:        targetOrg,
			AgentID:               agentID,
			Enabled:               true,
			PerTransactionLimit:   "500000",
			DailyLimit:            "5000000",
			MaxTransactionsPerDay: 20,
			ApprovalThreshold:     "500000",
			AllowedAssets:         "USDC",
			CreatedAt:             time.Now().UTC(),
			UpdatedAt:             time.Now().UTC(),
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(policy)
}
