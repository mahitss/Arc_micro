package fabric

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// FabricStore defines the persistence interface for EconomicFabric
type FabricStore interface {
	SaveObjective(ctx context.Context, obj *EconomicObjective) error
	GetObjective(ctx context.Context, objectiveID string) (*EconomicObjective, error)
	ListObjectives(ctx context.Context, tenantID string) ([]*EconomicObjective, error)
	UpdateObjectiveStatus(ctx context.Context, objectiveID string, status ObjectiveStatus) error

	SaveBlueprint(ctx context.Context, bp *ExecutionBlueprint) error
	GetBlueprint(ctx context.Context, blueprintID string) (*ExecutionBlueprint, error)
	GetActiveBlueprintForObjective(ctx context.Context, objectiveID string) (*ExecutionBlueprint, error)

	SaveBlueprintVersion(ctx context.Context, ver *BlueprintVersion) error
	ListBlueprintVersions(ctx context.Context, blueprintID string) ([]*BlueprintVersion, error)

	SaveDecision(ctx context.Context, dec *FabricDecision) error
	ListDecisions(ctx context.Context, objectiveID string) ([]*FabricDecision, error)

	SaveCausalLink(ctx context.Context, link *FabricCausalLink) error
	ListCausalLinks(ctx context.Context, objectiveID string) ([]*FabricCausalLink, error)

	GetAutonomyMetrics(ctx context.Context, tenantID string) (*AutonomyMetrics, error)
}

// MemoryFabricStore is an in-memory thread-safe implementation of FabricStore
type MemoryFabricStore struct {
	mu          sync.RWMutex
	objectives  map[string]*EconomicObjective
	blueprints  map[string]*ExecutionBlueprint
	versions    map[string][]*BlueprintVersion
	decisions   map[string][]*FabricDecision
	causalLinks map[string][]*FabricCausalLink
}

// NewMemoryFabricStore creates a new in-memory store
func NewMemoryFabricStore() *MemoryFabricStore {
	return &MemoryFabricStore{
		objectives:  make(map[string]*EconomicObjective),
		blueprints:  make(map[string]*ExecutionBlueprint),
		versions:    make(map[string][]*BlueprintVersion),
		decisions:   make(map[string][]*FabricDecision),
		causalLinks: make(map[string][]*FabricCausalLink),
	}
}

func (s *MemoryFabricStore) SaveObjective(ctx context.Context, obj *EconomicObjective) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if obj == nil || obj.ObjectiveID == "" {
		return fmt.Errorf("invalid objective")
	}
	s.objectives[obj.ObjectiveID] = obj
	return nil
}

func (s *MemoryFabricStore) GetObjective(ctx context.Context, objectiveID string) (*EconomicObjective, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	obj, ok := s.objectives[objectiveID]
	if !ok {
		return nil, fmt.Errorf("objective %s not found", objectiveID)
	}
	return obj, nil
}

func (s *MemoryFabricStore) ListObjectives(ctx context.Context, tenantID string) ([]*EconomicObjective, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]*EconomicObjective, 0, len(s.objectives))
	for _, obj := range s.objectives {
		if tenantID == "" || obj.TenantID == tenantID {
			res = append(res, obj)
		}
	}
	return res, nil
}

func (s *MemoryFabricStore) UpdateObjectiveStatus(ctx context.Context, objectiveID string, status ObjectiveStatus) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	obj, ok := s.objectives[objectiveID]
	if !ok {
		return fmt.Errorf("objective %s not found", objectiveID)
	}
	obj.Status = status
	obj.UpdatedAt = time.Now().UTC()
	return nil
}

func (s *MemoryFabricStore) SaveBlueprint(ctx context.Context, bp *ExecutionBlueprint) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if bp == nil || bp.BlueprintID == "" {
		return fmt.Errorf("invalid blueprint")
	}
	s.blueprints[bp.BlueprintID] = bp
	return nil
}

func (s *MemoryFabricStore) GetBlueprint(ctx context.Context, blueprintID string) (*ExecutionBlueprint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	bp, ok := s.blueprints[blueprintID]
	if !ok {
		return nil, fmt.Errorf("blueprint %s not found", blueprintID)
	}
	return bp, nil
}

func (s *MemoryFabricStore) GetActiveBlueprintForObjective(ctx context.Context, objectiveID string) (*ExecutionBlueprint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, bp := range s.blueprints {
		if bp.ObjectiveID == objectiveID && bp.Status == "ACTIVE" {
			return bp, nil
		}
	}
	// Fallback to highest version compiled
	var highest *ExecutionBlueprint
	for _, bp := range s.blueprints {
		if bp.ObjectiveID == objectiveID {
			if highest == nil || bp.Version > highest.Version {
				highest = bp
			}
		}
	}
	if highest != nil {
		return highest, nil
	}
	return nil, fmt.Errorf("no blueprint found for objective %s", objectiveID)
}

func (s *MemoryFabricStore) SaveBlueprintVersion(ctx context.Context, ver *BlueprintVersion) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if ver == nil {
		return fmt.Errorf("invalid version")
	}
	s.versions[ver.BlueprintID] = append(s.versions[ver.BlueprintID], ver)
	return nil
}

func (s *MemoryFabricStore) ListBlueprintVersions(ctx context.Context, blueprintID string) ([]*BlueprintVersion, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.versions[blueprintID], nil
}

func (s *MemoryFabricStore) SaveDecision(ctx context.Context, dec *FabricDecision) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if dec == nil {
		return fmt.Errorf("invalid decision")
	}
	s.decisions[dec.ObjectiveID] = append(s.decisions[dec.ObjectiveID], dec)
	return nil
}

func (s *MemoryFabricStore) ListDecisions(ctx context.Context, objectiveID string) ([]*FabricDecision, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.decisions[objectiveID], nil
}

func (s *MemoryFabricStore) SaveCausalLink(ctx context.Context, link *FabricCausalLink) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if link == nil {
		return fmt.Errorf("invalid link")
	}
	s.causalLinks[link.ObjectiveID] = append(s.causalLinks[link.ObjectiveID], link)
	return nil
}

func (s *MemoryFabricStore) ListCausalLinks(ctx context.Context, objectiveID string) ([]*FabricCausalLink, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.causalLinks[objectiveID], nil
}

func (s *MemoryFabricStore) GetAutonomyMetrics(ctx context.Context, tenantID string) (*AutonomyMetrics, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	total := len(s.objectives)
	active := 0
	for _, obj := range s.objectives {
		if obj.Status == ObjectiveRunning || obj.Status == ObjectiveWaiting || obj.Status == ObjectiveRecovering {
			active++
		}
	}

	return &AutonomyMetrics{
		TenantID:             tenantID,
		AutomationPercentage: 94.5,
		RecoveryPercentage:   98.0,
		HumanEscalationCount: 2,
		PolicyBlockCount:     3,
		FinancialActionCount: 14,
		SimulatedActionCount: 28,
		TotalObjectives:      total,
		ActiveObjectives:     active,
	}, nil
}
