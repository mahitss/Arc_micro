package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/network"
)

// AgentNetworkHandler provides HTTP handlers for the Open Agent Network APIs.
type AgentNetworkHandler struct {
	discovery      *network.AgentDiscoveryService
	capRegistry    *network.CapabilityRegistry
	economicRouter *network.EconomicRouter
	contractMgr    *network.ContractManager
	paymentBridge  *network.PaymentBridge
	resultVerifier *network.AgentResultVerifier
	delegationMgr  *network.DelegationManager
	disputeMgr     *network.DisputeManager
	graphService   *network.NetworkGraphService
	trustEvaluator *network.TrustEvaluator
	repo           network.DisputeStorageRepository
}

// NewAgentNetworkHandler creates a new AgentNetworkHandler.
func NewAgentNetworkHandler(
	discovery *network.AgentDiscoveryService,
	capRegistry *network.CapabilityRegistry,
	economicRouter *network.EconomicRouter,
	contractMgr *network.ContractManager,
	paymentBridge *network.PaymentBridge,
	resultVerifier *network.AgentResultVerifier,
	delegationMgr *network.DelegationManager,
	disputeMgr *network.DisputeManager,
	graphService *network.NetworkGraphService,
	trustEvaluator *network.TrustEvaluator,
	repo network.DisputeStorageRepository,
) *AgentNetworkHandler {
	return &AgentNetworkHandler{
		discovery:      discovery,
		capRegistry:    capRegistry,
		economicRouter: economicRouter,
		contractMgr:    contractMgr,
		paymentBridge:  paymentBridge,
		resultVerifier: resultVerifier,
		delegationMgr:  delegationMgr,
		disputeMgr:     disputeMgr,
		graphService:   graphService,
		trustEvaluator: trustEvaluator,
		repo:           repo,
	}
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"error": message,
	})
}

// resolveOrg extracts tenant boundary from X-Tenant-ID header or defaults to org_default.
func (h *AgentNetworkHandler) resolveOrg(r *http.Request) string {
	org := r.Header.Get("X-Tenant-ID")
	if org == "" {
		org = "org_default"
	}
	return org
}

// HandleRegisterAgent registers a new agent manifest: POST /v1/agent-network/agents/register
func (h *AgentNetworkHandler) HandleRegisterAgent(w http.ResponseWriter, r *http.Request) {
	var manifest network.AgentManifest
	if err := json.NewDecoder(r.Body).Decode(&manifest); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	if manifest.OrganizationID == "" {
		manifest.OrganizationID = h.resolveOrg(r)
	}

	identity, err := h.discovery.RegisterAgent(r.Context(), &manifest)
	if err != nil {
		writeJSONError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(identity)
}

// HandleListAgents discovers and filters agents: GET /v1/agent-network/agents
func (h *AgentNetworkHandler) HandleListAgents(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	minTrust, _ := strconv.ParseInt(q.Get("min_trust_score"), 10, 64)

	filter := network.DiscoveryFilter{
		Capability:      q.Get("capability"),
		ProtocolVersion: q.Get("protocol_version"),
		PricingModel:    q.Get("pricing_model"),
		Availability:    q.Get("availability"),
		MinTrustScore:   minTrust,
		OrganizationID:  h.resolveOrg(r),
		Limit:           limit,
	}

	results, err := h.discovery.Discover(r.Context(), filter)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"agents": results,
		"count":  len(results),
	})
}

// HandleGetAgent returns identity and trust profile: GET /v1/agent-network/agents/{id}
func (h *AgentNetworkHandler) HandleGetAgent(w http.ResponseWriter, r *http.Request) {
	agentID := r.PathValue("id")
	if agentID == "" {
		agentID = strings.TrimPrefix(r.URL.Path, "/v1/agent-network/agents/")
	}

	identity, err := h.repo.GetNetworkIdentity(r.Context(), agentID)
	if err != nil {
		writeJSONError(w, http.StatusNotFound, "agent not found")
		return
	}

	manifest, _ := h.repo.GetManifest(r.Context(), agentID)
	profile, _ := h.repo.GetTrustProfile(r.Context(), agentID)
	var trustEval *network.TrustEvaluation
	if profile != nil {
		trustEval, _ = h.trustEvaluator.Evaluate(profile)
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"identity":         identity,
		"manifest":         manifest,
		"trust_profile":    profile,
		"trust_evaluation": trustEval,
	})
}

// HandleUpdateManifest updates an agent manifest: POST /v1/agent-network/agents/{id}/manifest
func (h *AgentNetworkHandler) HandleUpdateManifest(w http.ResponseWriter, r *http.Request) {
	agentID := r.PathValue("id")
	var manifest network.AgentManifest
	if err := json.NewDecoder(r.Body).Decode(&manifest); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	if manifest.AgentID == "" {
		manifest.AgentID = agentID
	}
	if manifest.OrganizationID == "" {
		manifest.OrganizationID = h.resolveOrg(r)
	}

	identity, err := h.discovery.UpdateManifest(r.Context(), &manifest)
	if err != nil {
		writeJSONError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(identity)
}

// HandleSuspendAgent suspends an agent: POST /v1/agent-network/agents/{id}/suspend
func (h *AgentNetworkHandler) HandleSuspendAgent(w http.ResponseWriter, r *http.Request) {
	agentID := r.PathValue("id")
	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	if err := h.discovery.SuspendAgent(r.Context(), agentID, body.Reason); err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"agent_id": agentID,
		"status":   "SUSPENDED",
	})
}

// HandleListCapabilities returns structured capabilities: GET /v1/agent-network/capabilities
func (h *AgentNetworkHandler) HandleListCapabilities(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	caps := h.capRegistry.ListCapabilities(category)

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"capabilities": caps,
		"count":        len(caps),
	})
}

// HandleRoutePlan generates an advisory economic execution plan: POST /v1/agent-network/routing/plan
func (h *AgentNetworkHandler) HandleRoutePlan(w http.ResponseWriter, r *http.Request) {
	var req network.TaskRoutingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	if req.OrganizationID == "" {
		req.OrganizationID = h.resolveOrg(r)
	}

	plan, err := h.economicRouter.RouteTask(r.Context(), req)
	if err != nil {
		writeJSONError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(plan)
}

// HandleCreateContract initializes a new service contract: POST /v1/agent-network/contracts
func (h *AgentNetworkHandler) HandleCreateContract(w http.ResponseWriter, r *http.Request) {
	var c network.AgentServiceContract
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	if c.OrganizationID == "" {
		c.OrganizationID = h.resolveOrg(r)
	}

	created, err := h.contractMgr.CreateContract(r.Context(), &c)
	if err != nil {
		writeJSONError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(created)
}

// HandleListContracts lists contracts for tenant: GET /v1/agent-network/contracts
func (h *AgentNetworkHandler) HandleListContracts(w http.ResponseWriter, r *http.Request) {
	contracts, err := h.repo.ListServiceContracts(r.Context(), h.resolveOrg(r))
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"contracts": contracts,
		"count":     len(contracts),
	})
}

// HandleGetContract returns contract details: GET /v1/agent-network/contracts/{id}
func (h *AgentNetworkHandler) HandleGetContract(w http.ResponseWriter, r *http.Request) {
	contractID := r.PathValue("id")
	c, err := h.repo.GetServiceContract(r.Context(), contractID)
	if err != nil {
		writeJSONError(w, http.StatusNotFound, "contract not found")
		return
	}

	_ = json.NewEncoder(w).Encode(c)
}

// HandleAcceptContract accepts a proposed contract: POST /v1/agent-network/contracts/{id}/accept
func (h *AgentNetworkHandler) HandleAcceptContract(w http.ResponseWriter, r *http.Request) {
	contractID := r.PathValue("id")
	var body struct {
		AcceptorAgentID string `json:"acceptor_agent_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	accepted, err := h.contractMgr.AcceptContract(r.Context(), contractID, body.AcceptorAgentID)
	if err != nil {
		writeJSONError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(accepted)
}

// HandleFundContract funds a contract via PaymentBridge: POST /v1/agent-network/contracts/{id}/fund
func (h *AgentNetworkHandler) HandleFundContract(w http.ResponseWriter, r *http.Request) {
	contractID := r.PathValue("id")

	pi, err := h.paymentBridge.FundContract(r.Context(), contractID)
	if err != nil {
		writeJSONError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"contract_id":       contractID,
		"status":            "FUNDED",
		"payment_intent_id": pi.IntentID,
		"amount":            pi.Amount,
		"asset":             pi.Asset,
	})
}

// HandleDelegateContract creates a child sub-contract: POST /v1/agent-network/contracts/{id}/delegate
func (h *AgentNetworkHandler) HandleDelegateContract(w http.ResponseWriter, r *http.Request) {
	parentID := r.PathValue("id")
	var body struct {
		SubcontractorAgentID string                 `json:"subcontractor_agent_id"`
		Capability           string                 `json:"capability"`
		PriceBaseUnits       string                 `json:"price_base_units"`
		Deadline             time.Time              `json:"deadline"`
		InputSpec            map[string]interface{} `json:"input_spec"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	child, err := h.delegationMgr.DelegateSubcontract(
		r.Context(),
		parentID,
		body.SubcontractorAgentID,
		body.Capability,
		body.PriceBaseUnits,
		body.Deadline,
		body.InputSpec,
	)
	if err != nil {
		writeJSONError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(child)
}

// HandleVerifyResult cryptographically verifies a deliverable: POST /v1/agent-network/contracts/{id}/verify
func (h *AgentNetworkHandler) HandleVerifyResult(w http.ResponseWriter, r *http.Request) {
	contractID := r.PathValue("id")
	var payload network.AgentResultPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	if payload.ContractID == "" {
		payload.ContractID = contractID
	}

	report, err := h.resultVerifier.VerifyResult(r.Context(), &payload)
	if err != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_ = json.NewEncoder(w).Encode(report)
		return
	}

	_ = json.NewEncoder(w).Encode(report)
}

// HandleOpenDispute files a counterparty complaint: POST /v1/agent-network/contracts/{id}/disputes
func (h *AgentNetworkHandler) HandleOpenDispute(w http.ResponseWriter, r *http.Request) {
	contractID := r.PathValue("id")
	var body struct {
		InitiatorAgentID string `json:"initiator_agent_id"`
		Reason           string `json:"reason"`
		Evidence         string `json:"evidence"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	dispute, err := h.disputeMgr.OpenDispute(r.Context(), contractID, body.InitiatorAgentID, body.Reason, body.Evidence)
	if err != nil {
		writeJSONError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(dispute)
}

// HandleListDisputes lists disputes: GET /v1/agent-network/disputes
func (h *AgentNetworkHandler) HandleListDisputes(w http.ResponseWriter, r *http.Request) {
	disputes, err := h.repo.ListDisputes(r.Context(), h.resolveOrg(r))
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"disputes": disputes,
		"count":    len(disputes),
	})
}

// HandleGetDispute retrieves a dispute by ID: GET /v1/agent-network/disputes/{id}
func (h *AgentNetworkHandler) HandleGetDispute(w http.ResponseWriter, r *http.Request) {
	disputeID := r.PathValue("id")
	dispute, err := h.repo.GetDispute(r.Context(), disputeID)
	if err != nil {
		writeJSONError(w, http.StatusNotFound, "dispute not found")
		return
	}

	_ = json.NewEncoder(w).Encode(dispute)
}

// HandleResolveDispute resolves a dispute: POST /v1/agent-network/disputes/{id}/resolve
func (h *AgentNetworkHandler) HandleResolveDispute(w http.ResponseWriter, r *http.Request) {
	disputeID := r.PathValue("id")
	var body struct {
		State        network.DisputeState `json:"state"`
		Notes        string               `json:"notes"`
		RefundAmount string               `json:"refund_amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	resolved, err := h.disputeMgr.ResolveDispute(r.Context(), disputeID, body.State, body.Notes, body.RefundAmount)
	if err != nil {
		writeJSONError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(resolved)
}

// HandleGetGraph returns the network graph: GET /v1/agent-network/graph
func (h *AgentNetworkHandler) HandleGetGraph(w http.ResponseWriter, r *http.Request) {
	graph, err := h.graphService.BuildGraph(r.Context(), h.resolveOrg(r))
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(graph)
}

// HandleGetTrust returns deterministic trust evaluation: GET /v1/agent-network/trust/{id}
func (h *AgentNetworkHandler) HandleGetTrust(w http.ResponseWriter, r *http.Request) {
	agentID := r.PathValue("id")
	profile, err := h.repo.GetTrustProfile(r.Context(), agentID)
	if err != nil {
		profile = &network.AgentTrustProfile{AgentID: agentID, OrganizationID: h.resolveOrg(r)}
	}

	eval, err := h.trustEvaluator.Evaluate(profile)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_ = json.NewEncoder(w).Encode(eval)
}
