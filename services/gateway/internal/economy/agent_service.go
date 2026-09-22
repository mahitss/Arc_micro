package economy

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrAgentServiceNotFound = errors.New("agent peer service not found")
	ErrAgentUnavailable     = errors.New("peer agent is currently offline or busy")
)

// AgentDiscoverFilters defines criteria for discovering peer agents.
type AgentDiscoverFilters struct {
	Capability     string `json:"capability"`
	MaxPrice       string `json:"max_price,omitempty"`
	MinReputation  int64  `json:"min_reputation,omitempty"`
	MaxRisk        string `json:"max_risk,omitempty"` // LOW, MEDIUM
	Availability   string `json:"availability,omitempty"`
	Asset          string `json:"asset,omitempty"`
	OrganizationID string `json:"organization_id,omitempty"`
}

// AgentCoordinator manages agent-to-agent economic service registration and execution routing.
// INVARIANT: Peer agents never execute direct wallet-to-wallet transfers.
// All inter-agent compensation MUST travel through AgentPay and AgentVault.sol.
type AgentCoordinator struct {
	mu       sync.RWMutex
	reg      *registry.Registry
	agents   map[string]*AgentService // key: agent_id
	services map[string]*AgentService // key: service_id
	quotes   map[string]*AgentQuote   // key: quote_id
}

// NewAgentCoordinator initializes the agent-to-agent commerce coordinator.
func NewAgentCoordinator(reg *registry.Registry) *AgentCoordinator {
	ac := &AgentCoordinator{
		reg:      reg,
		agents:   make(map[string]*AgentService),
		services: make(map[string]*AgentService),
		quotes:   make(map[string]*AgentQuote),
	}
	ac.initDefaultAgents()
	return ac
}

// initDefaultAgents seeds the peer agent marketplace with vetted agents.
func (ac *AgentCoordinator) initDefaultAgents() {
	now := time.Now().UTC()

	defaults := []*AgentService{
		{
			AgentID:        "agent_research",
			ServiceID:      "svc_agent_research",
			OrganizationID: "org_default",
			Name:           "Research Specialist Agent",
			Description:    "Autonomous intelligence agent specializing in deep market research, synthesis, and summarization.",
			Capabilities:   []string{"research", "web_search", "summarization"},
			StructuredCapabilities: []AgentCapability{
				{
					Capability:  "research",
					Version:     "1.0",
					Name:        "Automated Market & Technical Research",
					Category:    "RESEARCH",
					Description: "Comprehensive multi-source research report generation",
				},
				{
					Capability:  "summarization",
					Version:     "1.0",
					Name:        "Executive Text Summarization",
					Category:    "RESEARCH",
					Description: "Distills complex findings into high-signal summaries",
				},
			},
			PricingModel:     "QUOTE_REQUIRED",
			BasePrice:        "400000", // $0.40 USDC
			MaxPrice:         "1000000", // $1.00 USDC
			SupportedAssets:  []string{"USDC"},
			Availability:     "ONLINE",
			Reputation:       9500, // 95.0%
			SuccessRateBps:   9750,
			AverageLatencyMs: 450,
			RiskProfile:      "LOW",
			Enabled:          true,
			Verified:         true,
			CreatedAt:        now,
			UpdatedAt:        now,
		},
		{
			AgentID:        "agent_data",
			ServiceID:      "svc_agent_data",
			OrganizationID: "org_default",
			Name:           "Data Collection & Analytics Agent",
			Description:    "Autonomous data processing agent for structured telemetry, financial ingestion, and cleanup.",
			Capabilities:   []string{"data_analysis", "data_cleaning", "dataset_generation"},
			StructuredCapabilities: []AgentCapability{
				{
					Capability:  "data_analysis",
					Version:     "1.0",
					Name:        "Structured Telemetry & Financial Analysis",
					Category:    "DATA",
					Description: "Analyzes datasets and produces statistical metrics",
				},
			},
			PricingModel:     "VARIABLE",
			BasePrice:        "250000", // $0.25 USDC
			MaxPrice:         "600000", // $0.60 USDC
			SupportedAssets:  []string{"USDC"},
			Availability:     "ONLINE",
			Reputation:       9200, // 92.0%
			SuccessRateBps:   9600,
			AverageLatencyMs: 320,
			RiskProfile:      "LOW",
			Enabled:          true,
			Verified:         true,
			CreatedAt:        now,
			UpdatedAt:        now,
		},
		{
			AgentID:        "agent_validator",
			ServiceID:      "svc_agent_validator",
			OrganizationID: "org_default",
			Name:           "Verification & Compliance Agent",
			Description:    "Deterministic validator ensuring datasets meet SLA, schema, and policy requirements.",
			Capabilities:   []string{"verification", "code_review", "audit"},
			StructuredCapabilities: []AgentCapability{
				{
					Capability:  "verification",
					Version:     "1.0",
					Name:        "Data Quality & Schema Verification",
					Category:    "VALIDATION",
					Description: "Independent verification of data integrity and quality thresholds",
				},
			},
			PricingModel:     "FIXED",
			BasePrice:        "300000", // $0.30 USDC
			MaxPrice:         "800000", // $0.80 USDC
			SupportedAssets:  []string{"USDC"},
			Availability:     "ONLINE",
			Reputation:       9800, // 98.0%
			SuccessRateBps:   9900,
			AverageLatencyMs: 250,
			RiskProfile:      "LOW",
			Enabled:          true,
			Verified:         true,
			CreatedAt:        now,
			UpdatedAt:        now,
		},
		{
			AgentID:        "agent_search",
			ServiceID:      "svc_agent_search",
			OrganizationID: "org_default",
			Name:           "Deep Web Intelligence Agent",
			Description:    "High-speed web crawling and entity extraction worker.",
			Capabilities:   []string{"web_search", "scraping", "entity_extraction"},
			StructuredCapabilities: []AgentCapability{
				{
					Capability:  "web_search",
					Version:     "1.0",
					Name:        "Real-Time Web Intelligence",
					Category:    "RESEARCH",
					Description: "Real-time targeted web scraping and entity recognition",
				},
			},
			PricingModel:     "FIXED",
			BasePrice:        "200000", // $0.20 USDC
			MaxPrice:         "500000", // $0.50 USDC
			SupportedAssets:  []string{"USDC"},
			Availability:     "ONLINE",
			Reputation:       8900, // 89.0%
			SuccessRateBps:   9400,
			AverageLatencyMs: 200,
			RiskProfile:      "LOW",
			Enabled:          true,
			Verified:         true,
			CreatedAt:        now,
			UpdatedAt:        now,
		},
	}

	recipients := map[string]string{
		"agent_research":  "0x1111111111111111111111111111111111111111",
		"agent_data":      "0x2222222222222222222222222222222222222222",
		"agent_validator": "0x3333333333333333333333333333333333333333",
		"agent_search":    "0x4444444444444444444444444444444444444444",
	}

	for _, a := range defaults {
		_ = ac.RegisterAgentService(context.Background(), a, recipients[a.AgentID])
	}
}

// RegisterAgentService exposes an agent as a discoverable service in the registry.
func (ac *AgentCoordinator) RegisterAgentService(ctx context.Context, as *AgentService, recipientAddress string) error {
	if as == nil {
		return errors.New("nil agent service provided")
	}
	if as.AgentID == "" || as.ServiceID == "" {
		return errors.New("agent_id and service_id are required")
	}

	ac.mu.Lock()
	defer ac.mu.Unlock()

	name := as.Name
	if name == "" {
		name = fmt.Sprintf("Agent Peer Service (%s)", as.AgentID)
	}
	desc := as.Description
	if desc == "" {
		desc = fmt.Sprintf("Autonomous agent worker service operated by %s", as.AgentID)
	}
	enabled := as.Enabled
	if !as.Enabled && as.Availability != "OFFLINE" {
		enabled = true
	}
	createdAt := as.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}
	updatedAt := as.UpdatedAt
	if updatedAt.IsZero() {
		updatedAt = time.Now().UTC()
	}

	// Mirror registration in the authoritative ServiceRegistry
	if ac.reg != nil {
		ac.reg.Register(&registry.Service{
			ID:                    as.ServiceID,
			Name:                  name,
			Description:           desc,
			Category:              "AGENT_PEER",
			Capabilities:          as.Capabilities,
			Recipient:             recipientAddress,
			Asset:                 "USDC",
			Enabled:               enabled,
			MaxPrice:              as.MaxPrice,
			FixedPrice:            as.BasePrice,
			PricingModel:          as.PricingModel,
			TrustStatus:           registry.TrustStatusVerified,
			HistoricalReliability: "99.0%",
			SuccessRateBps:        as.Reputation,
			AverageLatencyMs:      as.AverageLatencyMs,
			RiskScore:             15, // 15% risk baseline
			Metadata:              as.TrustMetadata,
			CreatedAt:             createdAt.Format(time.RFC3339),
			UpdatedAt:             updatedAt.Format(time.RFC3339),
		})
	}

	copyAS := *as
	copyAS.Enabled = enabled
	copyAS.Name = name
	copyAS.Description = desc
	copyAS.CreatedAt = createdAt
	copyAS.UpdatedAt = updatedAt
	ac.agents[as.AgentID] = &copyAS
	ac.services[as.ServiceID] = &copyAS

	return nil
}

// GetAgentService retrieves an agent service record by service ID.
func (ac *AgentCoordinator) GetAgentService(serviceID string) (*AgentService, error) {
	ac.mu.RLock()
	defer ac.mu.RUnlock()

	as, ok := ac.services[serviceID]
	if !ok {
		return nil, ErrAgentServiceNotFound
	}
	copyAS := *as
	return &copyAS, nil
}

// GetAgentServiceByAgentID retrieves an agent service record by agent ID.
func (ac *AgentCoordinator) GetAgentServiceByAgentID(agentID string) (*AgentService, error) {
	ac.mu.RLock()
	defer ac.mu.RUnlock()

	as, ok := ac.agents[agentID]
	if !ok {
		return nil, ErrAgentServiceNotFound
	}
	copyAS := *as
	return &copyAS, nil
}

// ListAgentServices returns all registered peer agent services.
func (ac *AgentCoordinator) ListAgentServices() []*AgentService {
	ac.mu.RLock()
	defer ac.mu.RUnlock()

	list := make([]*AgentService, 0, len(ac.services))
	for _, s := range ac.services {
		copyS := *s
		list = append(list, &copyS)
	}
	return list
}

// DiscoverAgents filters and ranks peer agents according to deterministic criteria.
func (ac *AgentCoordinator) DiscoverAgents(ctx context.Context, f AgentDiscoverFilters) []*AgentService {
	ac.mu.RLock()
	defer ac.mu.RUnlock()

	var matches []*AgentService
	for _, s := range ac.services {
		if !s.Enabled {
			continue
		}

		// Organization boundary check
		if f.OrganizationID != "" && s.OrganizationID != "" && s.OrganizationID != f.OrganizationID && s.OrganizationID != "org_default" {
			continue
		}

		// Capability filter
		if f.Capability != "" {
			hasCap := false
			for _, c := range s.Capabilities {
				if c == f.Capability {
					hasCap = true
					break
				}
			}
			if !hasCap {
				continue
			}
		}

		// Availability filter
		if f.Availability != "" && s.Availability != f.Availability {
			continue
		}

		// Minimum reputation filter
		if f.MinReputation > 0 && s.Reputation < f.MinReputation {
			continue
		}

		// Risk filter
		if f.MaxRisk == "LOW" && s.RiskProfile != "LOW" {
			continue
		}

		// Max price ceiling filter
		if f.MaxPrice != "" {
			maxPriceFilter, ok1 := new(big.Int).SetString(f.MaxPrice, 10)
			serviceBasePrice, ok2 := new(big.Int).SetString(s.BasePrice, 10)
			if ok1 && ok2 && serviceBasePrice.Cmp(maxPriceFilter) > 0 {
				continue
			}
		}

		copyS := *s
		matches = append(matches, &copyS)
	}

	return matches
}

// CreateAgentQuoteParams encapsulates parameters to solicit a binding quote from an agent.
type CreateAgentQuoteParams struct {
	BuyerAgentID  string            `json:"buyer_agent_id"`
	SellerAgentID string            `json:"seller_agent_id"`
	ServiceID     string            `json:"service_id"`
	MissionID     string            `json:"mission_id,omitempty"`
	ProposedPrice string            `json:"proposed_price,omitempty"`
	Asset         string            `json:"asset,omitempty"`
	Terms         map[string]string `json:"terms,omitempty"`
}

// CreateQuote creates a formal binding quote for an agent service.
func (ac *AgentCoordinator) CreateQuote(ctx context.Context, p CreateAgentQuoteParams) (*AgentQuote, error) {
	ac.mu.Lock()
	defer ac.mu.Unlock()

	svc, ok := ac.services[p.ServiceID]
	if !ok {
		return nil, ErrAgentServiceNotFound
	}
	if !svc.Enabled || svc.Availability == "OFFLINE" {
		return nil, ErrAgentUnavailable
	}

	quotePrice := svc.BasePrice
	if p.ProposedPrice != "" {
		quotePrice = p.ProposedPrice
	}

	quoteID := fmt.Sprintf("aq_%d", time.Now().UnixNano())
	asset := "USDC"
	if p.Asset != "" {
		asset = p.Asset
	}

	q := &AgentQuote{
		QuoteID:            quoteID,
		BuyerAgentID:       p.BuyerAgentID,
		SellerAgentID:      svc.AgentID,
		ServiceID:          svc.ServiceID,
		MissionID:          p.MissionID,
		Price:              quotePrice,
		Asset:              asset,
		EstimatedLatencyMs: svc.AverageLatencyMs,
		Quality:            svc.Reputation,
		ValidUntil:         time.Now().UTC().Add(15 * time.Minute),
		Terms:              p.Terms,
		Status:             QuoteStatusOffered,
		NegotiationRounds: []NegotiationProposal{
			{
				Round:           1,
				ProposerAgentID: svc.AgentID,
				ProposedPrice:   quotePrice,
				Terms:           p.Terms,
				Status:          "PENDING",
				CreatedAt:       time.Now().UTC(),
			},
		},
		CreatedAt: time.Now().UTC(),
	}

	ac.quotes[quoteID] = q
	return q, nil
}

// GetQuote retrieves an agent quote by ID.
func (ac *AgentCoordinator) GetQuote(quoteID string) (*AgentQuote, error) {
	ac.mu.RLock()
	defer ac.mu.RUnlock()

	q, ok := ac.quotes[quoteID]
	if !ok {
		return nil, errors.New("quote not found")
	}
	copyQ := *q
	return &copyQ, nil
}

// AcceptQuote marks a quote as ACCEPTED and strictly locks its pricing and terms.
func (ac *AgentCoordinator) AcceptQuote(quoteID string, buyerAgentID string) (*AgentQuote, error) {
	ac.mu.Lock()
	defer ac.mu.Unlock()

	q, ok := ac.quotes[quoteID]
	if !ok {
		return nil, errors.New("quote not found")
	}

	if q.Status == QuoteStatusAccepted {
		copyQ := *q
		return &copyQ, nil // Idempotent acceptance
	}

	if q.Status != QuoteStatusOffered {
		return nil, fmt.Errorf("quote cannot be accepted in status '%s'", q.Status)
	}

	if time.Now().UTC().After(q.ValidUntil) {
		q.Status = QuoteStatusExpired
		return nil, errors.New("quote has expired")
	}

	if buyerAgentID != "" && q.BuyerAgentID != "" && q.BuyerAgentID != buyerAgentID {
		return nil, errors.New("unauthorized: buyer agent ID mismatch")
	}

	q.Status = QuoteStatusAccepted
	copyQ := *q
	return &copyQ, nil
}

// RejectQuote marks a quote as REJECTED.
func (ac *AgentCoordinator) RejectQuote(quoteID string, reason string) (*AgentQuote, error) {
	ac.mu.Lock()
	defer ac.mu.Unlock()

	q, ok := ac.quotes[quoteID]
	if !ok {
		return nil, errors.New("quote not found")
	}

	if q.Status == QuoteStatusAccepted {
		return nil, errors.New("cannot reject an already accepted quote")
	}

	q.Status = QuoteStatusRejected
	copyQ := *q
	return &copyQ, nil
}

