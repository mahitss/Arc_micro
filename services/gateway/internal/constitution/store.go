package constitution

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

var (
	ErrConstitutionNotFound = errors.New("constitution not found")
	ErrVersionConflict      = errors.New("concurrent activation conflict: active version was updated by another operator (INV-50)")
	ErrImmutableVersion     = errors.New("historical constitution versions are immutable (INV-41)")
	ErrNoActiveConstitution = errors.New("no active constitution found for organization")
)

// Store defines persistence operations for constitutions, change requests, and snapshots.
type Store interface {
	GetActiveConstitution(ctx context.Context, orgID string) (*EconomicConstitution, error)
	GetConstitutionByVersion(ctx context.Context, orgID string, version uint64) (*EconomicConstitution, error)
	ListConstitutions(ctx context.Context, orgID string) ([]EconomicConstitution, error)
	SaveConstitution(ctx context.Context, c *EconomicConstitution) error
	ActivateConstitution(ctx context.Context, orgID string, targetVersion uint64, expectedPrevVersion uint64, actor string) (*EconomicConstitution, error)
	RollbackConstitution(ctx context.Context, orgID string, targetVersion uint64, actor string) (*EconomicConstitution, error)
	
	// Snapshots
	SaveSnapshot(ctx context.Context, snapshot *PolicySnapshot) error
	GetSnapshot(ctx context.Context, snapshotID string) (*PolicySnapshot, error)

	// Change Requests
	SaveChangeRequest(ctx context.Context, req *PolicyChangeRequest) error
	GetChangeRequest(ctx context.Context, requestID string) (*PolicyChangeRequest, error)
	ListChangeRequests(ctx context.Context, orgID string) ([]PolicyChangeRequest, error)
}

// MemoryStore provides thread-safe, concurrent-safe in-memory storage.
type MemoryStore struct {
	mu             sync.RWMutex
	constitutions  map[string]map[uint64]*EconomicConstitution // orgID -> version -> constitution
	activeVersions map[string]uint64                          // orgID -> activeVersion
	snapshots      map[string]*PolicySnapshot                 // snapshotID -> snapshot
	changeRequests map[string]*PolicyChangeRequest            // requestID -> changeRequest
}

// NewMemoryStore creates a new MemoryStore.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		constitutions:  make(map[string]map[uint64]*EconomicConstitution),
		activeVersions: make(map[string]uint64),
		snapshots:      make(map[string]*PolicySnapshot),
		changeRequests: make(map[string]*PolicyChangeRequest),
	}
}

// GetActiveConstitution retrieves the currently active constitution for an organization.
func (s *MemoryStore) GetActiveConstitution(ctx context.Context, orgID string) (*EconomicConstitution, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	activeVer, exists := s.activeVersions[orgID]
	if !exists {
		// Auto-initialize DefaultConstitution if none exists
		return nil, ErrNoActiveConstitution
	}

	c, ok := s.constitutions[orgID][activeVer]
	if !ok {
		return nil, ErrNoActiveConstitution
	}
	// Return a copy to maintain immutability
	cp := *c
	return &cp, nil
}

// GetConstitutionByVersion retrieves a specific version.
func (s *MemoryStore) GetConstitutionByVersion(ctx context.Context, orgID string, version uint64) (*EconomicConstitution, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	orgMap, exists := s.constitutions[orgID]
	if !exists {
		return nil, ErrConstitutionNotFound
	}
	c, ok := orgMap[version]
	if !ok {
		return nil, ErrConstitutionNotFound
	}
	cp := *c
	return &cp, nil
}

// ListConstitutions lists all versions for an organization.
func (s *MemoryStore) ListConstitutions(ctx context.Context, orgID string) ([]EconomicConstitution, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	orgMap, exists := s.constitutions[orgID]
	if !exists {
		return []EconomicConstitution{}, nil
	}

	list := make([]EconomicConstitution, 0, len(orgMap))
	for _, c := range orgMap {
		list = append(list, *c)
	}
	return list, nil
}

// SaveConstitution stores a new constitution version immutably.
func (s *MemoryStore) SaveConstitution(ctx context.Context, c *EconomicConstitution) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.constitutions[c.OrganizationID]; !ok {
		s.constitutions[c.OrganizationID] = make(map[uint64]*EconomicConstitution)
	}

	// INVARIANT INV-41: Historical versions cannot be mutated once saved
	if _, exists := s.constitutions[c.OrganizationID][c.Version]; exists {
		return fmt.Errorf("%w: version %d for organization %s already exists", ErrImmutableVersion, c.Version, c.OrganizationID)
	}

	cp := *c
	if cp.PolicyHash == "" {
		cp.PolicyHash = cp.CalculatePolicyHash()
	}
	s.constitutions[c.OrganizationID][c.Version] = &cp

	if cp.Status == StatusActive {
		if _, hasActive := s.activeVersions[c.OrganizationID]; !hasActive {
			s.activeVersions[c.OrganizationID] = c.Version
		}
	}
	return nil
}

// ActivateConstitution performs atomic compare-and-swap activation.
// INVARIANT INV-50: Exactly one active constitution per organization.
func (s *MemoryStore) ActivateConstitution(ctx context.Context, orgID string, targetVersion uint64, expectedPrevVersion uint64, actor string) (*EconomicConstitution, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	currentActiveVer := s.activeVersions[orgID]
	if currentActiveVer != expectedPrevVersion {
		return nil, fmt.Errorf("%w: expected active version %d, but found %d", ErrVersionConflict, expectedPrevVersion, currentActiveVer)
	}

	if targetVersion <= currentActiveVer {
		return nil, fmt.Errorf("activation downgrade rejected: target version %d must be greater than current active version %d (use rollback instead)", targetVersion, currentActiveVer)
	}

	orgMap, ok := s.constitutions[orgID]
	if !ok {
		return nil, ErrConstitutionNotFound
	}

	target, exists := orgMap[targetVersion]
	if !exists {
		return nil, fmt.Errorf("target constitution version %d not found", targetVersion)
	}

	now := time.Now().UTC()

	// Deprecate old active version
	if oldActive, exists := orgMap[currentActiveVer]; exists && currentActiveVer > 0 {
		oldActive.Status = StatusSuperseded
	}

	// Promote target version
	target.Status = StatusActive
	target.EffectiveAt = &now
	s.activeVersions[orgID] = targetVersion

	res := *target
	return &res, nil
}

// RollbackConstitution performs an auditable rollback to a prior valid version.
// INVARIANT INV-51: Policy rollback is auditable.
func (s *MemoryStore) RollbackConstitution(ctx context.Context, orgID string, targetVersion uint64, actor string) (*EconomicConstitution, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	currentActiveVer := s.activeVersions[orgID]
	orgMap, ok := s.constitutions[orgID]
	if !ok {
		return nil, ErrConstitutionNotFound
	}

	target, exists := orgMap[targetVersion]
	if !exists {
		return nil, fmt.Errorf("target rollback version %d not found", targetVersion)
	}

	now := time.Now().UTC()

	// Mark currently active version as revoked/superseded
	if curr, ok := orgMap[currentActiveVer]; ok {
		curr.Status = StatusSuperseded
	}

	// Activate target version
	target.Status = StatusActive
	target.EffectiveAt = &now
	s.activeVersions[orgID] = targetVersion

	res := *target
	return &res, nil
}

// SaveSnapshot stores an immutable authorization snapshot.
func (s *MemoryStore) SaveSnapshot(ctx context.Context, snapshot *PolicySnapshot) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *snapshot
	s.snapshots[snapshot.SnapshotID] = &cp
	return nil
}

// GetSnapshot retrieves an authorization snapshot.
func (s *MemoryStore) GetSnapshot(ctx context.Context, snapshotID string) (*PolicySnapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sn, ok := s.snapshots[snapshotID]
	if !ok {
		return nil, errors.New("policy snapshot not found")
	}
	cp := *sn
	return &cp, nil
}

// SaveChangeRequest stores a policy change request.
func (s *MemoryStore) SaveChangeRequest(ctx context.Context, req *PolicyChangeRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *req
	s.changeRequests[req.RequestID] = &cp
	return nil
}

// GetChangeRequest retrieves a change request by ID.
func (s *MemoryStore) GetChangeRequest(ctx context.Context, requestID string) (*PolicyChangeRequest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	cr, ok := s.changeRequests[requestID]
	if !ok {
		return nil, errors.New("policy change request not found")
	}
	cp := *cr
	return &cp, nil
}

// ListChangeRequests lists all change requests for an organization.
func (s *MemoryStore) ListChangeRequests(ctx context.Context, orgID string) ([]PolicyChangeRequest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]PolicyChangeRequest, 0)
	for _, cr := range s.changeRequests {
		if cr.OrganizationID == orgID {
			list = append(list, *cr)
		}
	}
	return list, nil
}
