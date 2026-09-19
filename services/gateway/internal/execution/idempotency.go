package execution

import (
	"sync"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
)

// Store defines the interface for recording and retrieving payment execution outcomes.
type Store interface {
	Get(requestID string) (*blockchain.PaymentExecutionResult, bool)
	Set(requestID string, result *blockchain.PaymentExecutionResult)
}

// MemoryStore is an in-memory thread-safe implementation of Store.
type MemoryStore struct {
	mu      sync.RWMutex
	records map[string]*blockchain.PaymentExecutionResult
}

// NewMemoryStore creates a new MemoryStore instance.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		records: make(map[string]*blockchain.PaymentExecutionResult),
	}
}

// Get retrieves an execution record by request ID.
func (s *MemoryStore) Get(requestID string) (*blockchain.PaymentExecutionResult, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res, ok := s.records[requestID]
	if !ok {
		return nil, false
	}
	// Return shallow copy
	copyRes := *res
	return &copyRes, true
}

// Set stores an execution record by request ID.
func (s *MemoryStore) Set(requestID string, result *blockchain.PaymentExecutionResult) {
	s.mu.Lock()
	defer s.mu.Unlock()
	copyRes := *result
	s.records[requestID] = &copyRes
}
