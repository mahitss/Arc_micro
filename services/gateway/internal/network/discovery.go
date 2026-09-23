package network

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

var (
	ErrAgentSuspendedOrRevoked = errors.New("agent is suspended or revoked")
	ErrAgentAlreadyRegistered  = errors.New("agent is already registered")
	ErrDiscoveryLimitExceeded  = errors.New("discovery limit exceeds maximum allowed of 100")
)

// StorageRepository defines the persistence interface required by Discovery and Network services.
type StorageRepository interface {
	SaveNetworkIdentity(ctx context.Context, id *AgentNetworkIdentity) error
	GetNetworkIdentity(ctx context.Context, agentID string) (*AgentNetworkIdentity, error)
	ListNetworkIdentities(ctx context.Context, orgID string) ([]*AgentNetworkIdentity, error)
	UpdateNetworkIdentityStatus(ctx context.Context, agentID string, status IdentityStatus, updatedAt time.Time) error
	SaveManifest(ctx context.Context, m *AgentManifest) error
	GetManifest(ctx context.Context, agentID string) (*AgentManifest, error)
	SaveTrustProfile(ctx context.Context, p *AgentTrustProfile) error
	GetTrustProfile(ctx context.Context, agentID string) (*AgentTrustProfile, error)
	SaveDomainEvent(ctx context.Context, event *domain.DomainEvent) error
}

// DiscoveryFilter parameters for advisory agent discovery.
type DiscoveryFilter struct {
	Capability      string `json:"capability"`
	ProtocolVersion string `json:"protocol_version"`
	PricingModel    string `json:"pricing_model"`
	Availability    string `json:"availability"`
	MinTrustScore   int64  `json:"min_trust_score"`
	OrganizationID  string `json:"organization_id"`
	Limit           int    `json:"limit"`
}

// DiscoveredAgent represents a ranked, advisory candidate returned by the discovery network.
type DiscoveredAgent struct {
	Identity        *AgentNetworkIdentity `json:"identity"`
	TrustEvaluation *TrustEvaluation      `json:"trust_evaluation"`
	MatchedPricing  *ManifestPricing      `json:"matched_pricing,omitempty"`
}

// AgentDiscoveryService handles discovery, manifest publishing, and status changes.
// INVARIANT: Discovery is purely advisory. Discovery results never authorize payments or bypass policy.
type AgentDiscoveryService struct {
	repo           StorageRepository
	manifestVal    *AgentManifestValidator
	trustEvaluator *TrustEvaluator
	capRegistry    *CapabilityRegistry
}

// NewAgentDiscoveryService creates a new discovery service.
func NewAgentDiscoveryService(
	repo StorageRepository,
	manifestVal *AgentManifestValidator,
	trustEvaluator *TrustEvaluator,
	capRegistry *CapabilityRegistry,
) *AgentDiscoveryService {
	return &AgentDiscoveryService{
		repo:           repo,
		manifestVal:    manifestVal,
		trustEvaluator: trustEvaluator,
		capRegistry:    capRegistry,
	}
}

// RegisterAgent registers a new agent with a validated manifest and initializes its trust profile.
func (s *AgentDiscoveryService) RegisterAgent(ctx context.Context, manifest *AgentManifest) (*AgentNetworkIdentity, error) {
	if err := s.manifestVal.ValidateManifest(manifest); err != nil {
		return nil, fmt.Errorf("manifest validation failed: %w", err)
	}

	// Check if already registered
	existing, err := s.repo.GetNetworkIdentity(ctx, manifest.AgentID)
	if err == nil && existing != nil && existing.Status != IdentityStatusRevoked {
		return nil, fmt.Errorf("%w: agent_id %s", ErrAgentAlreadyRegistered, manifest.AgentID)
	}

	now := time.Now().UTC()
	pricingModels := make([]string, 0, len(manifest.Pricing))
	for _, p := range manifest.Pricing {
		pricingModels = append(pricingModels, p.Model)
	}

	identity := &AgentNetworkIdentity{
		AgentID:                manifest.AgentID,
		OrganizationID:         manifest.OrganizationID,
		DisplayName:            manifest.Name,
		Description:            manifest.Description,
		Version:                manifest.Version,
		ProtocolVersion:        manifest.ProtocolVersion,
		Capabilities:           manifest.Capabilities,
		PricingModels:          pricingModels,
		Currencies:             []string{"USDC"},
		SettlementMethods:      manifest.Settlement,
		Availability:           "ACTIVE",
		TrustMetadata:          manifest.TrustMetadata,
		EndpointMetadata:       map[string]string{"task_url": manifest.Endpoints.TaskURL, "health_url": manifest.Endpoints.HealthURL},
		Status:                 IdentityStatusActive,
		CreatedAt:              now,
		UpdatedAt:              now,
	}

	if err := s.repo.SaveNetworkIdentity(ctx, identity); err != nil {
		return nil, fmt.Errorf("failed to save identity: %w", err)
	}
	if err := s.repo.SaveManifest(ctx, manifest); err != nil {
		return nil, fmt.Errorf("failed to save manifest: %w", err)
	}

	// Initialize baseline trust profile if none exists
	if _, err := s.repo.GetTrustProfile(ctx, manifest.AgentID); err != nil {
		defaultProfile := &AgentTrustProfile{
			AgentID:        manifest.AgentID,
			OrganizationID: manifest.OrganizationID,
			FirstSeenAt:    now,
			LastActiveAt:   now,
			UpdatedAt:      now,
		}
		_ = s.repo.SaveTrustProfile(ctx, defaultProfile)
	}

	// Emit Domain Event
	_ = s.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkAgentRegistered,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: manifest.OrganizationID,
		ActorType:      "AGENT",
		ActorID:        manifest.AgentID,
		AgentID:        manifest.AgentID,
		Data: map[string]interface{}{
			"agent_id":     manifest.AgentID,
			"name":         manifest.Name,
			"capabilities": manifest.Capabilities,
		},
	})

	return identity, nil
}

// UpdateManifest updates an agent's published manifest.
func (s *AgentDiscoveryService) UpdateManifest(ctx context.Context, manifest *AgentManifest) (*AgentNetworkIdentity, error) {
	if err := s.manifestVal.ValidateManifest(manifest); err != nil {
		return nil, fmt.Errorf("manifest validation failed: %w", err)
	}

	identity, err := s.repo.GetNetworkIdentity(ctx, manifest.AgentID)
	if err != nil {
		return nil, err
	}
	if identity.Status == IdentityStatusRevoked || identity.Status == IdentityStatusSuspended {
		return nil, fmt.Errorf("%w: status is %s", ErrAgentSuspendedOrRevoked, identity.Status)
	}

	now := time.Now().UTC()
	identity.DisplayName = manifest.Name
	identity.Description = manifest.Description
	identity.Version = manifest.Version
	identity.Capabilities = manifest.Capabilities
	identity.EndpointMetadata = map[string]string{"task_url": manifest.Endpoints.TaskURL, "health_url": manifest.Endpoints.HealthURL}
	identity.UpdatedAt = now

	if err := s.repo.SaveNetworkIdentity(ctx, identity); err != nil {
		return nil, err
	}
	if err := s.repo.SaveManifest(ctx, manifest); err != nil {
		return nil, err
	}

	_ = s.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkAgentUpdated,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: manifest.OrganizationID,
		ActorType:      "AGENT",
		ActorID:        manifest.AgentID,
		AgentID:        manifest.AgentID,
		Data: map[string]interface{}{
			"agent_id": manifest.AgentID,
			"version":  manifest.Version,
		},
	})

	return identity, nil
}

// SuspendAgent puts an agent into SUSPENDED state, blocking future contract execution.
func (s *AgentDiscoveryService) SuspendAgent(ctx context.Context, agentID, reason string) error {
	now := time.Now().UTC()
	if err := s.repo.UpdateNetworkIdentityStatus(ctx, agentID, IdentityStatusSuspended, now); err != nil {
		return err
	}
	_ = s.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:         domain.GenerateEventID(),
		Type:       domain.EventNetworkAgentSuspended,
		Version:    1,
		OccurredAt: now,
		ActorType:  "SYSTEM",
		ActorID:    "discovery_service",
		AgentID:    agentID,
		Data: map[string]interface{}{
			"agent_id": agentID,
			"reason":   reason,
		},
	})
	return nil
}

// RevokeAgent permanently revokes an agent's network authority.
func (s *AgentDiscoveryService) RevokeAgent(ctx context.Context, agentID, reason string) error {
	now := time.Now().UTC()
	if err := s.repo.UpdateNetworkIdentityStatus(ctx, agentID, IdentityStatusRevoked, now); err != nil {
		return err
	}
	_ = s.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:         domain.GenerateEventID(),
		Type:       domain.EventNetworkAgentRevoked,
		Version:    1,
		OccurredAt: now,
		ActorType:  "SYSTEM",
		ActorID:    "discovery_service",
		AgentID:    agentID,
		Data: map[string]interface{}{
			"agent_id": agentID,
			"reason":   reason,
		},
	})
	return nil
}

// Discover queries the network for candidate agents matching criteria, sorted deterministically.
func (s *AgentDiscoveryService) Discover(ctx context.Context, filter DiscoveryFilter) ([]DiscoveredAgent, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > MaxDiscoveryResults {
		return nil, ErrDiscoveryLimitExceeded
	}

	all, err := s.repo.ListNetworkIdentities(ctx, filter.OrganizationID)
	if err != nil {
		return nil, err
	}

	candidates := make([]DiscoveredAgent, 0, len(all))
	reqProtocol := filter.ProtocolVersion
	if reqProtocol == "" {
		reqProtocol = ProtocolVersionV1
	}

	reqCapName, _, _ := ParseCapabilityVersion(filter.Capability)

	for _, id := range all {
		// Never return revoked agents
		if id.Status == IdentityStatusRevoked {
			continue
		}
		// If filtering for active, omit non-active
		if filter.Availability != "" && strings.ToUpper(id.Availability) != strings.ToUpper(filter.Availability) {
			continue
		}
		if id.ProtocolVersion != reqProtocol {
			continue
		}

		// Capability match
		hasCap := false
		if reqCapName == "" {
			hasCap = true
		} else {
			for _, c := range id.Capabilities {
				cName, _, _ := ParseCapabilityVersion(c)
				if strings.EqualFold(cName, reqCapName) || strings.Contains(strings.ToLower(cName), strings.ToLower(reqCapName)) {
					hasCap = true
					break
				}
			}
		}
		if !hasCap {
			continue
		}

		// Pricing model filter
		if filter.PricingModel != "" {
			hasPricing := false
			for _, pm := range id.PricingModels {
				if strings.EqualFold(pm, filter.PricingModel) {
					hasPricing = true
					break
				}
			}
			if !hasPricing {
				continue
			}
		}

		// Trust evaluation
		profile, err := s.repo.GetTrustProfile(ctx, id.AgentID)
		if err != nil || profile == nil {
			profile = &AgentTrustProfile{AgentID: id.AgentID, OrganizationID: id.OrganizationID}
		}
		eval, _ := s.trustEvaluator.Evaluate(profile)

		if filter.MinTrustScore > 0 && eval.TrustScore < filter.MinTrustScore {
			continue
		}

		// Find pricing entry from manifest
		var matchedPricing *ManifestPricing
		mf, err := s.repo.GetManifest(ctx, id.AgentID)
		if err == nil && mf != nil {
			for i := range mf.Pricing {
				p := &mf.Pricing[i]
				pName, _, _ := ParseCapabilityVersion(p.Capability)
				if strings.EqualFold(pName, reqCapName) {
					matchedPricing = p
					break
				}
			}
		}

		candidates = append(candidates, DiscoveredAgent{
			Identity:        id,
			TrustEvaluation: eval,
			MatchedPricing:  matchedPricing,
		})
	}

	// Deterministic sorting: Highest TrustScore first, then Lowest Latency, then AgentID asc
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].TrustEvaluation.TrustScore != candidates[j].TrustEvaluation.TrustScore {
			return candidates[i].TrustEvaluation.TrustScore > candidates[j].TrustEvaluation.TrustScore
		}
		latencyI := int64(0)
		if candidates[i].Identity.ReputationSummary != nil {
			latencyI = candidates[i].Identity.ReputationSummary.AverageLatencyMs
		}
		latencyJ := int64(0)
		if candidates[j].Identity.ReputationSummary != nil {
			latencyJ = candidates[j].Identity.ReputationSummary.AverageLatencyMs
		}
		if latencyI != latencyJ {
			return latencyI < latencyJ
		}
		return candidates[i].Identity.AgentID < candidates[j].Identity.AgentID
	})

	if len(candidates) > limit {
		candidates = candidates[:limit]
	}

	return candidates, nil
}
