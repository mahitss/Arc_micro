package agent

import (
	"errors"
	"fmt"
	"math/big"
	"sync"
)

var (
	ErrInsufficientBudget = errors.New("insufficient agent budget available")
	ErrNegativeAmount     = errors.New("monetary amount must be non-negative")
	ErrInvalidBudgetMath  = errors.New("budget reservation or spend exceeds available balance")
)

// AgentBudget provides safe, concurrent, integer base-unit accounting for an autonomous agent.
// INVARIANT: All calculations use *big.Int (base units, e.g. micro-USDC).
// Floating-point math is strictly prohibited for all financial balances.
type AgentBudget struct {
	mu          sync.RWMutex
	AgentID     string   `json:"agent_id"`
	Currency    string   `json:"currency"`     // "USDC"
	BudgetLimit *big.Int `json:"budget_limit"` // Total authorized allocation in base units
	Spent       *big.Int `json:"spent"`        // Settled disbursements in base units
	Reserved    *big.Int `json:"reserved"`     // In-flight reserved funds in base units
}

// NewAgentBudget creates an AgentBudget initialized with a positive integer limit.
func NewAgentBudget(agentID string, limit *big.Int) *AgentBudget {
	lim := new(big.Int)
	if limit != nil && limit.Sign() > 0 {
		lim.Set(limit)
	}
	return &AgentBudget{
		AgentID:     agentID,
		Currency:    "USDC",
		BudgetLimit: lim,
		Spent:       big.NewInt(0),
		Reserved:    big.NewInt(0),
	}
}

// Available calculates available balance = BudgetLimit - Spent - Reserved.
func (b *AgentBudget) Available() *big.Int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.availableLocked()
}

func (b *AgentBudget) availableLocked() *big.Int {
	committed := new(big.Int).Add(b.Spent, b.Reserved)
	avail := new(big.Int).Sub(b.BudgetLimit, committed)
	if avail.Sign() < 0 {
		return big.NewInt(0)
	}
	return avail
}

// CanAfford checks whether the available budget covers the requested amount.
func (b *AgentBudget) CanAfford(amount *big.Int) bool {
	if amount == nil || amount.Sign() <= 0 {
		return false
	}
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.availableLocked().Cmp(amount) >= 0
}

// Reserve locks funds for an in-flight payment request.
func (b *AgentBudget) Reserve(amount *big.Int) error {
	if amount == nil || amount.Sign() <= 0 {
		return ErrNegativeAmount
	}
	b.mu.Lock()
	defer b.mu.Unlock()

	avail := b.availableLocked()
	if avail.Cmp(amount) < 0 {
		return fmt.Errorf("%w: requested %s, available %s", ErrInsufficientBudget, amount.String(), avail.String())
	}
	b.Reserved.Add(b.Reserved, amount)
	return nil
}

// Spend converts reserved funds into settled expenditure.
func (b *AgentBudget) Spend(amount *big.Int) error {
	if amount == nil || amount.Sign() <= 0 {
		return ErrNegativeAmount
	}
	b.mu.Lock()
	defer b.mu.Unlock()

	// If already reserved, deduct from reserved first
	if b.Reserved.Cmp(amount) >= 0 {
		b.Reserved.Sub(b.Reserved, amount)
		b.Spent.Add(b.Spent, amount)
		return nil
	}

	// Otherwise, verify direct availability
	avail := b.availableLocked()
	if avail.Cmp(amount) < 0 {
		return fmt.Errorf("%w: requested %s, available %s", ErrInsufficientBudget, amount.String(), avail.String())
	}
	b.Spent.Add(b.Spent, amount)
	return nil
}

// Release returns reserved funds to available balance if payment is cancelled or denied.
func (b *AgentBudget) Release(amount *big.Int) error {
	if amount == nil || amount.Sign() <= 0 {
		return ErrNegativeAmount
	}
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.Reserved.Cmp(amount) < 0 {
		b.Reserved.SetInt64(0)
		return nil
	}
	b.Reserved.Sub(b.Reserved, amount)
	return nil
}

// Snapshot returns a point-in-time copy of budget figures.
func (b *AgentBudget) Snapshot() (limit, spent, reserved, available *big.Int) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return new(big.Int).Set(b.BudgetLimit),
		new(big.Int).Set(b.Spent),
		new(big.Int).Set(b.Reserved),
		b.availableLocked()
}
