package economy

import (
	"errors"
	"fmt"
	"math/big"
	"sync"
)

var (
	ErrSwarmNotFound          = errors.New("swarm not found")
	ErrSwarmBudgetExceeded    = errors.New("requested allocation exceeds remaining swarm budget ceiling")
	ErrTaskReservationNotFound = errors.New("task budget reservation not found")
	ErrDuplicateReservation   = errors.New("task already holds an active budget reservation")
)

// TaskReservation tracks an active in-flight commitment for a specific task.
type TaskReservation struct {
	SwarmID string   `json:"swarm_id"`
	TaskID  string   `json:"task_id"`
	Amount  *big.Int `json:"amount"`
}

// SwarmBudgetManager enforces atomic, concurrency-safe, multi-tenant budget allocations.
type SwarmBudgetManager struct {
	mu           sync.RWMutex
	swarms       map[string]*Swarm                    // swarm_id -> Swarm
	reservations map[string]map[string]*TaskReservation // swarm_id -> task_id -> TaskReservation
}

// NewSwarmBudgetManager initializes a budget manager.
func NewSwarmBudgetManager() *SwarmBudgetManager {
	return &SwarmBudgetManager{
		swarms:       make(map[string]*Swarm),
		reservations: make(map[string]map[string]*TaskReservation),
	}
}

// RegisterSwarm registers or updates a swarm in the budget manager.
func (sbm *SwarmBudgetManager) RegisterSwarm(s *Swarm) {
	sbm.mu.Lock()
	defer sbm.mu.Unlock()

	if _, exists := sbm.reservations[s.ID]; !exists {
		sbm.reservations[s.ID] = make(map[string]*TaskReservation)
	}
	sbm.swarms[s.ID] = s
}

// ReserveTaskBudget atomically locks a portion of the swarm's uncommitted budget for a task.
// Invariant INV-S2: Spent + Reserved + Amount <= Budget must hold at all times.
func (sbm *SwarmBudgetManager) ReserveTaskBudget(swarmID, taskID string, amount *big.Int) error {
	sbm.mu.Lock()
	defer sbm.mu.Unlock()

	swarm, exists := sbm.swarms[swarmID]
	if !exists {
		return ErrSwarmNotFound
	}

	taskResMap, exists := sbm.reservations[swarmID]
	if !exists {
		taskResMap = make(map[string]*TaskReservation)
		sbm.reservations[swarmID] = taskResMap
	}

	if _, alreadyReserved := taskResMap[taskID]; alreadyReserved {
		return ErrDuplicateReservation
	}

	totalBudgetInt := new(big.Int)
	totalBudgetInt.SetString(swarm.Budget, 10)

	spentInt := new(big.Int)
	if swarm.Spent != "" {
		spentInt.SetString(swarm.Spent, 10)
	}

	reservedInt := new(big.Int)
	if swarm.Reserved != "" {
		reservedInt.SetString(swarm.Reserved, 10)
	}

	// Projected = Spent + Reserved + Amount
	projected := new(big.Int).Add(spentInt, reservedInt)
	projected.Add(projected, amount)

	if projected.Cmp(totalBudgetInt) > 0 {
		return fmt.Errorf("%w: requested %s base units, remaining uncommitted is %s",
			ErrSwarmBudgetExceeded,
			amount.String(),
			new(big.Int).Sub(totalBudgetInt, new(big.Int).Add(spentInt, reservedInt)).String(),
		)
	}

	// Record reservation
	taskResMap[taskID] = &TaskReservation{
		SwarmID: swarmID,
		TaskID:  taskID,
		Amount:  new(big.Int).Set(amount),
	}

	// Update swarm.Reserved
	newReserved := new(big.Int).Add(reservedInt, amount)
	swarm.Reserved = newReserved.String()

	return nil
}

// CommitTaskSpend settles an in-flight reservation into permanent spent base units.
func (sbm *SwarmBudgetManager) CommitTaskSpend(swarmID, taskID string, actualAmount *big.Int) error {
	sbm.mu.Lock()
	defer sbm.mu.Unlock()

	swarm, exists := sbm.swarms[swarmID]
	if !exists {
		return ErrSwarmNotFound
	}

	taskResMap := sbm.reservations[swarmID]
	res, hasRes := taskResMap[taskID]
	if !hasRes {
		return ErrTaskReservationNotFound
	}

	spentInt := new(big.Int)
	if swarm.Spent != "" {
		spentInt.SetString(swarm.Spent, 10)
	}

	reservedInt := new(big.Int)
	if swarm.Reserved != "" {
		reservedInt.SetString(swarm.Reserved, 10)
	}

	// Subtract previous reservation
	newReserved := new(big.Int).Sub(reservedInt, res.Amount)
	if newReserved.Sign() < 0 {
		newReserved = big.NewInt(0)
	}
	swarm.Reserved = newReserved.String()

	// Add actual spent
	newSpent := new(big.Int).Add(spentInt, actualAmount)
	swarm.Spent = newSpent.String()

	// Clean up task reservation
	delete(taskResMap, taskID)

	// Check if budget is completely exhausted
	totalBudgetInt := new(big.Int)
	totalBudgetInt.SetString(swarm.Budget, 10)
	if newSpent.Cmp(totalBudgetInt) >= 0 {
		swarm.Status = SwarmStatusBudgetExhausted
	}

	return nil
}

// ReleaseTaskReservation cancels an in-flight reservation and frees the funds.
func (sbm *SwarmBudgetManager) ReleaseTaskReservation(swarmID, taskID string) error {
	sbm.mu.Lock()
	defer sbm.mu.Unlock()

	swarm, exists := sbm.swarms[swarmID]
	if !exists {
		return ErrSwarmNotFound
	}

	taskResMap := sbm.reservations[swarmID]
	res, hasRes := taskResMap[taskID]
	if !hasRes {
		return nil // idempotent release
	}

	reservedInt := new(big.Int)
	if swarm.Reserved != "" {
		reservedInt.SetString(swarm.Reserved, 10)
	}

	newReserved := new(big.Int).Sub(reservedInt, res.Amount)
	if newReserved.Sign() < 0 {
		newReserved = big.NewInt(0)
	}
	swarm.Reserved = newReserved.String()

	delete(taskResMap, taskID)
	return nil
}

// GetCostIntelligence calculates the real-time financial telemetry for a swarm.
func (sbm *SwarmBudgetManager) GetCostIntelligence(swarmID string) (*SwarmCostIntelligence, error) {
	sbm.mu.RLock()
	defer sbm.mu.RUnlock()

	swarm, exists := sbm.swarms[swarmID]
	if !exists {
		return nil, ErrSwarmNotFound
	}

	totalBudgetInt := new(big.Int)
	totalBudgetInt.SetString(swarm.Budget, 10)

	spentInt := new(big.Int)
	if swarm.Spent != "" {
		spentInt.SetString(swarm.Spent, 10)
	}

	reservedInt := new(big.Int)
	if swarm.Reserved != "" {
		reservedInt.SetString(swarm.Reserved, 10)
	}

	allocatedInt := new(big.Int)
	if swarm.Allocated != "" {
		allocatedInt.SetString(swarm.Allocated, 10)
	}

	// Remaining = Total - Spent - Reserved
	committed := new(big.Int).Add(spentInt, reservedInt)
	remaining := new(big.Int).Sub(totalBudgetInt, committed)
	if remaining.Sign() < 0 {
		remaining = big.NewInt(0)
	}

	// Projected = Spent + Reserved
	projected := new(big.Int).Set(committed)

	return &SwarmCostIntelligence{
		SwarmID:            swarmID,
		PlannedBudget:      swarm.Budget,
		AllocatedBudget:    swarm.Allocated,
		ReservedBudget:     swarm.Reserved,
		SpentBudget:        swarm.Spent,
		RemainingBudget:    remaining.String(),
		ProjectedFinalCost: projected.String(),
	}, nil
}
