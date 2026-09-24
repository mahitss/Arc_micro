package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/marketplace"
)

// MarketplaceHandler exposes HTTP endpoints for the AgentPay Autonomous Economic Marketplace.
type MarketplaceHandler struct {
	service *marketplace.MarketplaceService
}

func NewMarketplaceHandler(svc *marketplace.MarketplaceService) *MarketplaceHandler {
	return &MarketplaceHandler{
		service: svc,
	}
}

// HandleListings manages GET /api/marketplace/listings and POST /api/marketplace/listings
func (h *MarketplaceHandler) HandleListings(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		tenantID = "tenant_default"
	}

	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		listings, err := h.service.ListListings(r.Context(), tenantID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(listings)

	case http.MethodPost:
		var l marketplace.ServiceListing
		if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
			http.Error(w, "Invalid listing payload: "+err.Error(), http.StatusBadRequest)
			return
		}
		if l.TenantID == "" {
			l.TenantID = tenantID
		}
		created, err := h.service.CreateListing(r.Context(), &l)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(created)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandleListingDetail manages GET/POST /api/marketplace/listings/{id}
func (h *MarketplaceHandler) HandleListingDetail(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		tenantID = "tenant_default"
	}
	id := extractPathID(r.URL.Path, "/api/marketplace/listings/")

	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		l, err := h.service.GetListing(r.Context(), tenantID, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		_ = json.NewEncoder(w).Encode(l)

	case http.MethodPost: // e.g. pause listing
		l, err := h.service.PauseListing(r.Context(), tenantID, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(l)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandleSearchListings manages POST /api/marketplace/search
func (h *MarketplaceHandler) HandleSearchListings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var q marketplace.MarketplaceSearchQuery
	_ = json.NewDecoder(r.Body).Decode(&q)
	if q.TenantID == "" {
		q.TenantID = r.Header.Get("X-Tenant-ID")
		if q.TenantID == "" {
			q.TenantID = "tenant_default"
		}
	}

	results, err := h.service.SearchListings(r.Context(), q)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(results)
}

// HandleOpportunities manages GET /api/marketplace/opportunities and POST /api/marketplace/opportunities
func (h *MarketplaceHandler) HandleOpportunities(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		tenantID = "tenant_default"
	}

	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		opps, err := h.service.ListOpportunities(r.Context(), tenantID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(opps)

	case http.MethodPost:
		var opp marketplace.MarketplaceOpportunity
		if err := json.NewDecoder(r.Body).Decode(&opp); err != nil {
			http.Error(w, "Invalid opportunity payload: "+err.Error(), http.StatusBadRequest)
			return
		}
		if opp.TenantID == "" {
			opp.TenantID = tenantID
		}
		created, err := h.service.CreateOpportunity(r.Context(), &opp)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(created)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandleOpportunityDetail manages sub-routes of /api/marketplace/opportunities/{id}/...
func (h *MarketplaceHandler) HandleOpportunityDetail(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		tenantID = "tenant_default"
	}

	path := r.URL.Path
	w.Header().Set("Content-Type", "application/json")

	if strings.HasSuffix(path, "/match") {
		// POST /api/marketplace/opportunities/{id}/match
		id := strings.TrimSuffix(strings.TrimPrefix(path, "/api/marketplace/opportunities/"), "/match")
		id = strings.Trim(id, "/")
		set, err := h.service.MatchOpportunity(r.Context(), tenantID, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(set)
		return
	}

	if strings.HasSuffix(path, "/award") {
		// POST /api/marketplace/opportunities/{id}/award
		id := strings.TrimSuffix(strings.TrimPrefix(path, "/api/marketplace/opportunities/"), "/award")
		id = strings.Trim(id, "/")
		var body struct {
			ProviderID     string `json:"provider_id"`
			QuoteID        string `json:"quote_id"`
			QuotePriceUSDC string `json:"quote_price_usdc"`
			QuoteExpiresAt string `json:"quote_expires_at"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Invalid award payload: "+err.Error(), http.StatusBadRequest)
			return
		}
		var exp time.Time
		if body.QuoteExpiresAt != "" {
			exp, _ = time.Parse(time.RFC3339, body.QuoteExpiresAt)
		}
		awarded, err := h.service.AwardOpportunity(r.Context(), tenantID, id, body.ProviderID, body.QuoteID, body.QuotePriceUSDC, exp)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(awarded)
		return
	}

	// GET /api/marketplace/opportunities/{id}
	id := extractPathID(path, "/api/marketplace/opportunities/")
	opp, err := h.service.GetOpportunity(r.Context(), tenantID, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	_ = json.NewEncoder(w).Encode(opp)
}

// HandleAgentProfile manages GET /api/marketplace/agents/{id} and /api/marketplace/agents/{id}/performance
func (h *MarketplaceHandler) HandleAgentProfile(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		tenantID = "tenant_default"
	}

	w.Header().Set("Content-Type", "application/json")
	path := r.URL.Path
	isPerf := strings.HasSuffix(path, "/performance")
	id := strings.TrimSuffix(strings.TrimPrefix(path, "/api/marketplace/agents/"), "/performance")
	id = strings.Trim(id, "/")

	profile, err := h.service.GetAgentProfile(r.Context(), tenantID, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	if isPerf {
		_ = json.NewEncoder(w).Encode(profile.ContextualPerformance)
		return
	}
	_ = json.NewEncoder(w).Encode(profile)
}

// HandleCompare manages GET /api/marketplace/compare
func (h *MarketplaceHandler) HandleCompare(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		tenantID = "tenant_default"
	}

	capabilityID := r.URL.Query().Get("capability")
	providersStr := r.URL.Query().Get("providers")
	var providerIDs []string
	if providersStr != "" {
		providerIDs = strings.Split(providersStr, ",")
	} else {
		providerIDs = []string{"agent_security_02", "agent_research_01"}
	}

	res, err := h.service.CompareProviders(r.Context(), tenantID, capabilityID, providerIDs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

// HandleHealth manages GET /api/marketplace/health
func (h *MarketplaceHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		tenantID = "tenant_default"
	}

	health, err := h.service.GetMarketplaceHealth(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(health)
}

// HandleSimulate manages POST /api/marketplace/simulate (INV-192)
func (h *MarketplaceHandler) HandleSimulate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req marketplace.MarketplaceSimulationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid simulation payload: "+err.Error(), http.StatusBadRequest)
		return
	}

	res, err := h.service.SimulateMarketplace(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}
