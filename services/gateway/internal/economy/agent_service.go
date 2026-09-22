package economy

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrAgentServiceNotFound = errors.New("agent peer service not found")
	ErrAgentUnavailable     = errors.New("peer agent is currently offline or busy")
)

// AgentCoordinator manages agent-to-agent economic service registration and execution routing.
// INVARIANT: Peer agents never execute direct wallet-to-wallet transfers.
// All inter-agent compensation MUST travel through AgentPay and AgentVault.sol.
type AgentCoordinator struct {
	mu       sync.RWMutex
	reg      *registry.Registry
	agents   map[string]*AgentService // key: agent_id
	services map[string]*AgentService // key: service_id
}

// NewAgentCoordinator initializes the agent-to-agent commerce coordinator.
func NewAgentCoordinator(reg *registry.Registry) *AgentCoordinator {
	return &AgentCoordinator{
		reg:      reg,
		agents:   make(map[string]*AgentService),
		services: make(map[string]*AgentService),
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

	// Mirror registration in the authoritative ServiceRegistry
	ac.reg.Register(&registry.Service{
		ID:                    as.ServiceID,
		Name:                  fmt.Sprintf("Agent Peer Service (%s)", as.AgentID),
		Description:           fmt.Sprintf("Autonomous agent worker service operated by %s", as.AgentID),
		Category:              "AGENT_PEER",
		Capabilities:          as.Capabilities,
		Recipient:             recipientAddress,
		Asset:                 "USDC",
		Enabled:               true,
		MaxPrice:              as.MaxPrice,
		FixedPrice:            as.BasePrice,
		PricingModel:          as.PricingModel,
		TrustStatus:           registry.TrustStatusVerified,
		HistoricalReliability: "99.0%",
		SuccessRateBps:        as.Reputation,
		AverageLatencyMs:      600,
		RiskScore:             15, // 15% risk baseline
		Metadata:              as.TrustMetadata,
		CreatedAt:             time.Now().UTC().Format(time.RFC3339),
		UpdatedAt:             time.Now().UTC().Format(time.RFC3339),
	})

	copyAS := *as
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
