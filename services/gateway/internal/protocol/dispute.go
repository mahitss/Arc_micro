package protocol

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

var (
	ErrDisputeNotFound   = errors.New("dispute record not found")
	ErrDisputeClosed     = errors.New("cannot perform action on closed dispute")
	ErrDirectMutationBlock = errors.New("dispute engine cannot directly mutate treasury ledger balances (INV-178)")
)

// DisputeStore persists dispute records.
type DisputeStore interface {
	SaveDispute(ctx context.Context, dispute *ProtocolDispute) error
	GetDispute(ctx context.Context, disputeID string) (*ProtocolDispute, error)
	ListDisputes(ctx context.Context, tenantID string) ([]*ProtocolDispute, error)
}

// MemoryDisputeStore implements in-memory dispute persistence.
type MemoryDisputeStore struct {
	mu       sync.RWMutex
	disputes map[string]*ProtocolDispute
}

func NewMemoryDisputeStore() *MemoryDisputeStore {
	return &MemoryDisputeStore{
		disputes: make(map[string]*ProtocolDispute),
	}
}

func (s *MemoryDisputeStore) SaveDispute(ctx context.Context, d *ProtocolDispute) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.disputes[d.DisputeID] = d
	return nil
}

func (s *MemoryDisputeStore) GetDispute(ctx context.Context, disputeID string) (*ProtocolDispute, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d, ok := s.disputes[disputeID]
	if !ok {
		return nil, ErrDisputeNotFound
	}
	return d, nil
}

func (s *MemoryDisputeStore) ListDisputes(ctx context.Context, tenantID string) ([]*ProtocolDispute, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var list []*ProtocolDispute
	for _, d := range s.disputes {
		if tenantID == "" || d.TenantID == tenantID {
			list = append(list, d)
		}
	}
	return list, nil
}

// DisputeManager handles protocol disputes.
type DisputeManager struct {
	store DisputeStore
}

func NewDisputeManager(store DisputeStore) *DisputeManager {
	if store == nil {
		store = NewMemoryDisputeStore()
	}
	return &DisputeManager{store: store}
}

// OpenDispute records a formal dispute on a contract.
func (m *DisputeManager) OpenDispute(
	ctx context.Context,
	contractID string,
	tenantID string,
	initiator string,
	reason string,
	evidence map[string]interface{},
	requestedResolution string,
) (*ProtocolDispute, error) {
	dispute := &ProtocolDispute{
		DisputeID:           fmt.Sprintf("disp_%d", time.Now().UnixNano()),
		ContractID:          contractID,
		TenantID:            tenantID,
		Initiator:           initiator,
		Reason:              reason,
		Evidence:            evidence,
		RequestedResolution: requestedResolution,
		State:               DisputeOpen,
		CreatedAt:           time.Now().UTC(),
		UpdatedAt:           time.Now().UTC(),
	}

	if err := m.store.SaveDispute(ctx, dispute); err != nil {
		return nil, err
	}
	return dispute, nil
}

// ResolveDispute proposes a resolution without directly moving funds.
func (m *DisputeManager) ResolveDispute(
	ctx context.Context,
	disputeID string,
	newState DisputeState,
	resolutionNotes string,
	directLedgerMutationAttempted bool,
) (*ProtocolDispute, error) {
	if directLedgerMutationAttempted {
		return nil, ErrDirectMutationBlock
	}

	d, err := m.store.GetDispute(ctx, disputeID)
	if err != nil {
		return nil, err
	}

	if d.State == DisputeClosed {
		return nil, ErrDisputeClosed
	}

	d.State = newState
	d.ResolutionNotes = resolutionNotes
	d.UpdatedAt = time.Now().UTC()

	if err := m.store.SaveDispute(ctx, d); err != nil {
		return nil, err
	}
	return d, nil
}
