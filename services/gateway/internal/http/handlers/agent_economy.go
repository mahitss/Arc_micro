package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/economy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/metrics"
)

// AgentEconomyHandler manages HTTP API traffic for the Agent-to-Agent Economic Network.
type AgentEconomyHandler struct {
	missionService    *economy.MissionService
	agentCoord        *economy.AgentCoordinator
	hiringService     *economy.HiringService
	negotiationEngine *economy.NegotiationEngine
}

// NewAgentEconomyHandler constructs the HTTP handler for A2A operations.
func NewAgentEconomyHandler(ms *economy.MissionService) *AgentEconomyHandler {
	return &AgentEconomyHandler{
		missionService:    ms,
		agentCoord:        ms.GetAgentCoordinator(),
		hiringService:     ms.GetHiringService(),
		negotiationEngine: ms.GetNegotiationEngine(),
	}
}

// HandleDiscoverAgents processes GET /v1/agents/discover.
func (h *AgentEconomyHandler) HandleDiscoverAgents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	q := r.URL.Query()
	minRep, _ := strconv.ParseInt(q.Get("min_reputation"), 10, 64)

	orgID := middleware.GetOrgID(r.Context())
	if q.Get("organization_id") != "" {
		orgID = q.Get("organization_id")
	}

	filters := economy.AgentDiscoverFilters{
		Capability:     q.Get("capability"),
		MaxPrice:       q.Get("max_price"),
		MinReputation:  minRep,
		MaxRisk:        q.Get("max_risk"),
		Availability:   q.Get("availability"),
		Asset:          q.Get("asset"),
		OrganizationID: orgID,
	}

	results := h.agentCoord.DiscoverAgents(r.Context(), filters)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"agents": results,
		"count":  len(results),
	})
}

// HandleGetAgentServices processes GET /v1/agents/{id}/services.
func (h *AgentEconomyHandler) HandleGetAgentServices(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing agent ID in path", "")
		return
	}
	agentID := parts[1]

	var services []*economy.AgentService
	all := h.agentCoord.ListAgentServices()
	for _, s := range all {
		if s.AgentID == agentID {
			services = append(services, s)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"agent_id": agentID,
		"services": services,
		"count":    len(services),
	})
}

// HandleCreateQuote processes POST /v1/agent-services/{id}/quotes.
func (h *AgentEconomyHandler) HandleCreateQuote(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing service ID in path", reqID)
		return
	}
	serviceID := parts[1]

	var params economy.CreateAgentQuoteParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Request body contains invalid JSON", reqID)
		return
	}
	params.ServiceID = serviceID

	quote, err := h.agentCoord.CreateQuote(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusBadRequest, "QUOTE_REQUEST_FAILED", err.Error(), reqID)
		return
	}

	metrics.DefaultMetrics.IncrA2AQuotes()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(quote)
}

// HandleGetQuote processes GET /v1/quotes/{id}.
func (h *AgentEconomyHandler) HandleGetQuote(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing quote ID", "")
		return
	}
	quoteID := parts[1]

	quote, err := h.agentCoord.GetQuote(quoteID)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", err.Error(), "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(quote)
}

// HandleAcceptQuote processes POST /v1/quotes/{id}/accept.
func (h *AgentEconomyHandler) HandleAcceptQuote(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing quote ID", reqID)
		return
	}
	quoteID := parts[1]

	var body struct {
		BuyerAgentID string `json:"buyer_agent_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	quote, err := h.agentCoord.AcceptQuote(quoteID, body.BuyerAgentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "QUOTE_ACCEPT_FAILED", err.Error(), reqID)
		return
	}

	metrics.DefaultMetrics.IncrA2AQuotesAccepted()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(quote)
}

// HandleRejectQuote processes POST /v1/quotes/{id}/reject.
func (h *AgentEconomyHandler) HandleRejectQuote(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing quote ID", reqID)
		return
	}
	quoteID := parts[1]

	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	quote, err := h.agentCoord.RejectQuote(quoteID, body.Reason)
	if err != nil {
		writeError(w, http.StatusBadRequest, "QUOTE_REJECT_FAILED", err.Error(), reqID)
		return
	}

	metrics.DefaultMetrics.IncrA2AQuotesRejected()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(quote)
}

// HandleCounterQuote processes POST /v1/quotes/{id}/counter.
func (h *AgentEconomyHandler) HandleCounterQuote(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing quote ID", reqID)
		return
	}
	quoteID := parts[1]

	var body struct {
		ProposerAgentID string            `json:"proposer_agent_id"`
		ProposedPrice   string            `json:"proposed_price"`
		Terms           map[string]string `json:"terms,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid body", reqID)
		return
	}

	quote, err := h.negotiationEngine.ProposeCounter(r.Context(), economy.CounterOfferParams{
		QuoteID:         quoteID,
		ProposerAgentID: body.ProposerAgentID,
		ProposedPrice:   body.ProposedPrice,
		Terms:           body.Terms,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, "NEGOTIATION_FAILED", err.Error(), reqID)
		return
	}

	metrics.DefaultMetrics.IncrNegotiationRounds()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(quote)
}

// HandleCreateHire processes POST /v1/hires.
func (h *AgentEconomyHandler) HandleCreateHire(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var params economy.CreateHireParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Request body contains invalid JSON", reqID)
		return
	}
	if params.OrganizationID == "" {
		params.OrganizationID = orgID
	}

	hire, err := h.hiringService.CreateHire(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusBadRequest, "HIRE_CREATION_FAILED", err.Error(), reqID)
		return
	}

	// Trigger payment execution
	paidHire, err := h.hiringService.AuthorizeAndExecuteHirePayment(r.Context(), hire.ID)
	if err != nil {
		writeError(w, http.StatusPaymentRequired, "PAYMENT_EXECUTION_FAILED", err.Error(), reqID)
		return
	}

	metrics.DefaultMetrics.IncrHiresCreated()
	metrics.DefaultMetrics.IncrAgentPayments()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(paidHire)
}

// HandleGetHire processes GET /v1/hires/{id}.
func (h *AgentEconomyHandler) HandleGetHire(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing hire ID", "")
		return
	}
	hireID := parts[1]

	hire, err := h.hiringService.GetHire(r.Context(), hireID)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", err.Error(), "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(hire)
}

// HandleCancelHire processes POST /v1/hires/{id}/cancel.
func (h *AgentEconomyHandler) HandleCancelHire(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing hire ID", "")
		return
	}
	hireID := parts[1]

	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	hire, err := h.hiringService.CancelHire(r.Context(), hireID, body.Reason)
	if err != nil {
		writeError(w, http.StatusBadRequest, "CANCEL_FAILED", err.Error(), "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(hire)
}

// HandleSubmitResult processes POST /v1/hires/{id}/result.
func (h *AgentEconomyHandler) HandleSubmitResult(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	reqID := middleware.GetRequestID(r.Context())
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing hire ID", reqID)
		return
	}
	hireID := parts[1]

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Invalid payload JSON", reqID)
		return
	}

	hire, err := h.hiringService.SubmitResult(r.Context(), hireID, payload)
	if err != nil {
		writeError(w, http.StatusBadRequest, "RESULT_SUBMISSION_FAILED", err.Error(), reqID)
		return
	}

	metrics.DefaultMetrics.IncrHiresCompleted()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(hire)
}

// HandleGetEconomicGraph processes GET /v1/missions/{id}/economic-graph.
func (h *AgentEconomyHandler) HandleGetEconomicGraph(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing mission ID", "")
		return
	}
	missionID := parts[1]

	graph, err := h.missionService.GetEconomicGraph(r.Context(), missionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", err.Error(), "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(graph)
}

// HandleListMissionHires processes GET /v1/missions/{id}/hires.
func (h *AgentEconomyHandler) HandleListMissionHires(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", "")
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Missing mission ID", "")
		return
	}
	missionID := parts[1]

	hires, err := h.hiringService.ListHiresByMission(r.Context(), missionID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "STORAGE_ERROR", err.Error(), "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"mission_id": missionID,
		"hires":      hires,
		"count":      len(hires),
	})
}
