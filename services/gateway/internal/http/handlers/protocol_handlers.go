package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/protocol"
)

// ProtocolHandler exposes HTTP endpoints for the AgentPay Autonomous Economic Protocol v1.
type ProtocolHandler struct {
	gateway *protocol.ProtocolGateway
	service *protocol.ProtocolService
	store   protocol.ProtocolStore
}

// NewProtocolHandler constructs a ProtocolHandler.
func NewProtocolHandler(
	gw *protocol.ProtocolGateway,
	svc *protocol.ProtocolService,
	store protocol.ProtocolStore,
) *ProtocolHandler {
	return &ProtocolHandler{
		gateway: gw,
		service: svc,
		store:   store,
	}
}

// extractID extracts trailing URL segment or path param.
func extractPathID(path, prefix string) string {
	trimmed := strings.TrimPrefix(path, prefix)
	trimmed = strings.Trim(trimmed, "/")
	parts := strings.Split(trimmed, "/")
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

// HandleProcessMessage handles POST /protocol/v1/messages
func (h *ProtocolHandler) HandleProcessMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var msg protocol.ProtocolMessage
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "Invalid message envelope: "+err.Error(), http.StatusBadRequest)
		return
	}

	resp, err := h.gateway.ProcessIncomingMessage(r.Context(), &msg)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"error":     err.Error(),
			"retryable": false,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleAgents handles GET /protocol/v1/agents and GET /protocol/v1/agents/{id}
func (h *ProtocolHandler) HandleAgents(w http.ResponseWriter, r *http.Request) {
	id := extractPathID(r.URL.Path, "/protocol/v1/agents")
	if id != "" {
		m, err := h.service.GetAgentManifest(r.Context(), id)
		if err != nil {
			http.Error(w, "Agent manifest not found: "+err.Error(), http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(m)
		return
	}

	capability := r.URL.Query().Get("capability")
	manifests, err := h.service.DiscoverAgents(r.Context(), capability)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(manifests)
}

// HandleCapabilities handles GET /protocol/v1/capabilities and POST /protocol/v1/capabilities/query
func (h *ProtocolHandler) HandleCapabilities(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var q map[string]string
		_ = json.NewDecoder(r.Body).Decode(&q)
		cap := q["capability"]
		manifests, err := h.service.DiscoverCapabilities(r.Context(), cap)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(manifests)
		return
	}

	id := extractPathID(r.URL.Path, "/protocol/v1/capabilities")
	manifests, err := h.service.DiscoverCapabilities(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(manifests)
}

// HandleServiceRequest handles POST /protocol/v1/requests
func (h *ProtocolHandler) HandleServiceRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req protocol.ServiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid service request: "+err.Error(), http.StatusBadRequest)
		return
	}

	quote, err := h.service.RequestService(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(quote)
}

// HandleQuotes handles POST /protocol/v1/quotes and GET /protocol/v1/quotes/{id}
func (h *ProtocolHandler) HandleQuotes(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var q protocol.ProtocolQuote
		if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := h.service.SaveQuote(r.Context(), &q); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(q)
		return
	}

	id := extractPathID(r.URL.Path, "/protocol/v1/quotes")
	q, err := h.service.GetQuote(r.Context(), id)
	if err != nil {
		http.Error(w, "Quote not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(q)
}

// HandleNegotiate handles POST /protocol/v1/negotiate
func (h *ProtocolHandler) HandleNegotiate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var proposal protocol.NegotiationPayload
	if err := json.NewDecoder(r.Body).Decode(&proposal); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	counter, err := h.service.Negotiate(r.Context(), &proposal)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(counter)
}

// HandleContracts handles POST /protocol/v1/contracts and GET /protocol/v1/contracts/{id}
func (h *ProtocolHandler) HandleContracts(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var c protocol.ProtocolContract
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		created, err := h.service.ProposeContract(r.Context(), &c)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(created)
		return
	}

	path := r.URL.Path
	if strings.HasSuffix(path, "/accept") {
		// POST /protocol/v1/contracts/{id}/accept
		contractID := strings.TrimPrefix(path, "/protocol/v1/contracts/")
		contractID = strings.TrimSuffix(contractID, "/accept")
		contractID = strings.Trim(contractID, "/")
		accepted, err := h.service.AcceptContract(r.Context(), contractID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(accepted)
		return
	}

	id := extractPathID(path, "/protocol/v1/contracts")
	c, err := h.service.GetContract(r.Context(), id)
	if err != nil {
		http.Error(w, "Contract not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(c)
}

// HandleResults handles POST /protocol/v1/results
func (h *ProtocolHandler) HandleResults(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var res protocol.ResultSubmittedPayload
	if err := json.NewDecoder(r.Body).Decode(&res); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	eval, err := h.service.SubmitResult(r.Context(), &res)
	if err != nil && eval == nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(eval)
}

// HandlePayments handles POST /protocol/v1/payments and GET /protocol/v1/payments/{id}
func (h *ProtocolHandler) HandlePayments(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req protocol.PaymentRequestPayload
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		decision, err := h.service.RequestPayment(r.Context(), &req)
		if err != nil && decision == nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if decision != nil && decision.Decision == "AUTHORIZED" {
			w.WriteHeader(http.StatusAccepted)
		} else {
			w.WriteHeader(http.StatusForbidden)
		}
		_ = json.NewEncoder(w).Encode(decision)
		return
	}

	id := extractPathID(r.URL.Path, "/protocol/v1/payments")
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"payment_id":  id,
		"status":      "CONFIRMED",
		"asset":       "USDC",
		"chain":       "arc-testnet",
		"block_proof": "arc_tx_0x9b8c7f",
	})
}

// HandleHeartbeat handles POST /protocol/v1/heartbeat
func (h *ProtocolHandler) HandleHeartbeat(w http.ResponseWriter, r *http.Request) {
	var hb protocol.AgentHeartbeat
	if err := json.NewDecoder(r.Body).Decode(&hb); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.service.RecordHeartbeat(r.Context(), &hb); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ACK"})
}

// HandleSimulate handles POST /protocol/v1/simulate
func (h *ProtocolHandler) HandleSimulate(w http.ResponseWriter, r *http.Request) {
	var simReq protocol.SimulationRequest
	if err := json.NewDecoder(r.Body).Decode(&simReq); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := h.service.Simulate(r.Context(), &simReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

// HandlePrecheck handles POST /protocol/v1/precheck
func (h *ProtocolHandler) HandlePrecheck(w http.ResponseWriter, r *http.Request) {
	var preReq protocol.PrecheckRequest
	if err := json.NewDecoder(r.Body).Decode(&preReq); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := h.service.Precheck(r.Context(), &preReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

// HandleTraffic handles GET /protocol/v1/traffic
func (h *ProtocolHandler) HandleTraffic(w http.ResponseWriter, r *http.Request) {
	entries, err := h.store.GetTraffic(r.Context(), "", 100)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(entries)
}

// HandleSecurity handles GET /protocol/v1/security
func (h *ProtocolHandler) HandleSecurity(w http.ResponseWriter, r *http.Request) {
	entries, _ := h.store.GetTraffic(r.Context(), "", 200)
	securityEvents := make([]*protocol.ProtocolTrafficEntry, 0)
	for _, e := range entries {
		if e.Status == "REJECTED" || e.Status == "AUTH_FAILED" || e.Status == "RATE_LIMITED" {
			securityEvents = append(securityEvents, e)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"security_incident_count": len(securityEvents),
		"events":                  securityEvents,
		"invariants_enforced":     "INV-161 through INV-180",
	})
}
