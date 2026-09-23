package simulation

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

// SnapshotManager captures, freezes, and stores immutable digital twin snapshots
// of the economic environment to guarantee absolute isolation from production state.
type SnapshotManager struct {
	mu        sync.RWMutex
	snapshots map[string]*SimulationSnapshot
}

// NewSnapshotManager creates a thread-safe snapshot manager.
func NewSnapshotManager() *SnapshotManager {
	return &SnapshotManager{
		snapshots: make(map[string]*SimulationSnapshot),
	}
}

// CaptureSnapshot builds an immutable digital twin representation of the economic state.
// INVARIANT: The snapshot is a deep-copy. Mutations to the snapshot will NEVER leak into production.
func (sm *SnapshotManager) CaptureSnapshot(
	ctx context.Context,
	orgID string,
	reg *registry.Registry,
	customOverrides *SimulationScenario,
) *SimulationSnapshot {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	snapID := fmt.Sprintf("snap_%d", time.Now().UnixNano())
	now := time.Now().UTC()

	snap := &SimulationSnapshot{
		SnapshotID:         snapID,
		CreatedAt:          now,
		OrganizationID:     orgID,
		Agents:             make(map[string]*domain.Agent),
		Services:           make([]*domain.Service, 0),
		Policies:           make(map[string]*domain.Policy),
		Reputations:        make(map[string]int64),
		LatencyAssumptions: make(map[string]int64),
		IsFrozen:           true,
	}

	// 1. Snapshot registered services
	if reg != nil {
		allServices := reg.List()
		for _, s := range allServices {
			price := s.MaxPrice
			if s.FixedPrice != "" {
				price = s.FixedPrice
			}

			desc := s.Description
			if len(s.Capabilities) > 0 {
				desc = fmt.Sprintf("%s [Capabilities: %s]", s.Description, strings.Join(s.Capabilities, ", "))
			}

			svc := &domain.Service{
				ID:             s.ID,
				OrganizationID: orgID,
				Name:           s.Name,
				Description:    desc,
				Recipient:      s.Recipient,
				Asset:          s.Asset,
				Status:         domain.ServiceStatusActive,
				Enabled:        s.Enabled,
				MaxPrice:       price,
				FixedPrice:     s.FixedPrice,
				CreatedAt:      now,
				UpdatedAt:      now,
			}
			snap.Services = append(snap.Services, svc)
			snap.Reputations[s.ID] = 9800        // default 98% baseline if not loaded
			snap.LatencyAssumptions[s.ID] = 350 // default 350ms
		}
	} else {
		// Populate standard digital twin default services for test/offline isolation
		snap.Services = append(snap.Services,
			&domain.Service{
				ID:             "web-research",
				OrganizationID: orgID,
				Name:           "Web Research Agent",
				Description:    "Real-time web search and scraping [Capabilities: web-research, data-collection]",
				Recipient:      "0x1111111111111111111111111111111111111111",
				Asset:          "USDC",
				Status:         domain.ServiceStatusActive,
				Enabled:        true,
				MaxPrice:       "1000000",
				CreatedAt:      now,
				UpdatedAt:      now,
			},
			&domain.Service{
				ID:             "data-analysis",
				OrganizationID: orgID,
				Name:           "Data Analysis Agent",
				Description:    "Data analysis and modeling [Capabilities: data-analysis, financial-modeling]",
				Recipient:      "0x2222222222222222222222222222222222222222",
				Asset:          "USDC",
				Status:         domain.ServiceStatusActive,
				Enabled:        true,
				MaxPrice:       "1500000",
				CreatedAt:      now,
				UpdatedAt:      now,
			},
			&domain.Service{
				ID:             "validator-agent",
				OrganizationID: orgID,
				Name:           "Consensus Validator Agent",
				Description:    "Verification and validation [Capabilities: verification, consensus]",
				Recipient:      "0x3333333333333333333333333333333333333333",
				Asset:          "USDC",
				Status:         domain.ServiceStatusActive,
				Enabled:        true,
				MaxPrice:       "500000",
				CreatedAt:      now,
				UpdatedAt:      now,
			},
		)
		snap.Reputations["web-research"] = 9900
		snap.Reputations["data-analysis"] = 9600
		snap.Reputations["validator-agent"] = 9950
	}

	// 2. Snapshot standard agents
	snap.Agents["agent_orchestrator"] = &domain.Agent{
		ID:             "agent_orchestrator",
		OrganizationID: orgID,
		Name:           "Digital Twin Orchestrator",
		Status:         domain.AgentStatusActive,
		CreatedAt:      now,
	}
	snap.Agents["research-agent"] = &domain.Agent{
		ID:             "research-agent",
		OrganizationID: orgID,
		Name:           "Autonomous Research Agent",
		Status:         domain.AgentStatusActive,
		CreatedAt:      now,
	}
	snap.Agents["data-agent"] = &domain.Agent{
		ID:             "data-agent",
		OrganizationID: orgID,
		Name:           "Autonomous Data Agent",
		Status:         domain.AgentStatusActive,
		CreatedAt:      now,
	}

	// 3. Populate default policy for simulation
	snap.Policies["default_sim_policy"] = &domain.Policy{
		ID:                  "default_sim_policy",
		OrganizationID:      orgID,
		Enabled:             true,
		PerTransactionLimit: "2000000", // $2.00
		DailyLimit:          "10000000", // $10.00
		ApprovalThreshold:   "5000000", // $5.00
		AllowedAssets:       []string{"USDC"},
		CreatedAt:           now,
	}

	// 4. Compute cryptographic deterministic version fingerprint
	snap.Version = sm.CalculateVersion(snap)
	snap.ConfigurationVersion = snap.Version
	sm.snapshots[snapID] = snap

	return snap
}

// CalculateVersion creates a cryptographic SHA-256 fingerprint of the snapshot environment.
func (sm *SnapshotManager) CalculateVersion(snap *SimulationSnapshot) string {
	h := sha256.New()
	h.Write([]byte(snap.OrganizationID))

	// Sort services by ID for determinism
	svcIDs := make([]string, 0, len(snap.Services))
	for _, s := range snap.Services {
		if s != nil {
			svcIDs = append(svcIDs, s.ID)
		}
	}
	sort.Strings(svcIDs)

	for _, id := range svcIDs {
		h.Write([]byte(fmt.Sprintf(":svc:%s", id)))
		for _, s := range snap.Services {
			if s != nil && s.ID == id {
				h.Write([]byte(fmt.Sprintf(":%s:%s:%t", s.MaxPrice, s.Recipient, s.Enabled)))
			}
		}
	}

	return hex.EncodeToString(h.Sum(nil))[:16]
}

// GetSnapshot retrieves an existing snapshot.
func (sm *SnapshotManager) GetSnapshot(snapID string) (*SimulationSnapshot, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	s, ok := sm.snapshots[snapID]
	return s, ok
}
