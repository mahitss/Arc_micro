package treasury

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"sync"
	"time"
)

// Orchestrator defines the operational interface for the Autonomous Treasury & Liquidity Orchestrator.
type Orchestrator interface {
	GetTreasuryState(ctx context.Context, orgID string, mode ExecutionMode) (*TreasuryState, error)
	GetLiquidityEnvelope(ctx context.Context, orgID string, scope ScopeLevel, scopeID string, mode ExecutionMode) (*LiquidityEnvelope, error)
	EvaluateLiquidityGate(ctx context.Context, orgID string, amountBase string, mode ExecutionMode) (LiquidityGateResult, string, error)
	ReserveLiquidityAtomic(ctx context.Context, req *LiquidityReservationRequest) (*LiquidityReservation, error)
	ReleaseLiquidityReservation(ctx context.Context, reservationID string, reason string) error
	ConsumeLiquidityReservation(ctx context.Context, reservationID string) error
	ListReservations(ctx context.Context, orgID string, mode ExecutionMode, status ReservationStatus) ([]*LiquidityReservation, error)
	ExpireStaleReservations(ctx context.Context, orgID string) (int, error)
	CreateCommitment(ctx context.Context, commitment *LiquidityCommitment) error
	ListCommitments(ctx context.Context, orgID string) ([]*LiquidityCommitment, error)
	SetBufferPolicy(ctx context.Context, policy *LiquidityBufferPolicy) error
	GetBufferPolicy(ctx context.Context, orgID string, scope ScopeLevel, scopeID string) (*LiquidityBufferPolicy, error)
	SetOperationalMode(ctx context.Context, orgID string, mode OperationalMode) error
	SetTreasuryBalance(ctx context.Context, orgID string, mode ExecutionMode, totalBalance string, minBuffer string) error
	RecordExpectedInflow(ctx context.Context, inflow *ExpectedInflow) error
	ListExpectedInflows(ctx context.Context, orgID string) ([]*ExpectedInflow, error)
	VerifyExpectedInflow(ctx context.Context, inflowID string, txHash string) error
}

// LiquidityReservationRequest carries parameters for creating a bounded reservation.
type LiquidityReservationRequest struct {
	OrganizationID string        `json:"organization_id"`
	Source         string        `json:"source"` // INTENT, OBLIGATION, ESCROW, MISSION, SWARM
	ObligationID   string        `json:"obligation_id,omitempty"`
	MissionID      string        `json:"mission_id,omitempty"`
	SwarmID        string        `json:"swarm_id,omitempty"`
	AgentID        string        `json:"agent_id,omitempty"`
	AmountBase     string        `json:"amount_base"` // micro-USDC
	Currency       string        `json:"currency"`
	Mode           ExecutionMode `json:"mode"`
	TimeoutSeconds int           `json:"timeout_seconds"`
	PolicyVersion  string        `json:"policy_version"`
	PolicyHash     string        `json:"policy_hash"`
	ParentScope    ScopeLevel    `json:"parent_scope,omitempty"`
	ParentScopeID  string        `json:"parent_scope_id,omitempty"`
}

// DefaultLiquidityOrchestrator manages bounded treasury liquidity without fund movement authority.
type DefaultLiquidityOrchestrator struct {
	mu           sync.RWMutex
	states       map[string]*TreasuryState          // key: orgID:mode
	reservations map[string]*LiquidityReservation   // key: reservationID
	commitments  map[string]*LiquidityCommitment    // key: commitmentID
	inflows      map[string]*ExpectedInflow         // key: inflowID
	bufferPolicies map[string]*LiquidityBufferPolicy // key: orgID:scope:scopeID
}

// NewLiquidityOrchestrator initializes an in-memory thread-safe orchestrator.
func NewLiquidityOrchestrator() *DefaultLiquidityOrchestrator {
	return &DefaultLiquidityOrchestrator{
		states:         make(map[string]*TreasuryState),
		reservations:   make(map[string]*LiquidityReservation),
		commitments:    make(map[string]*LiquidityCommitment),
		inflows:        make(map[string]*ExpectedInflow),
		bufferPolicies: make(map[string]*LiquidityBufferPolicy),
	}
}

func stateKey(orgID string, mode ExecutionMode) string {
	if orgID == "" {
		orgID = "org_default"
	}
	if mode == "" {
		mode = ModeReal
	}
	return fmt.Sprintf("%s:%s", orgID, mode)
}

func bufferKey(orgID string, scope ScopeLevel, scopeID string) string {
	if orgID == "" {
		orgID = "org_default"
	}
	return fmt.Sprintf("%s:%s:%s", orgID, scope, scopeID)
}

// GetTreasuryState returns the multi-balance state for an organization and execution mode.
func (o *DefaultLiquidityOrchestrator) GetTreasuryState(ctx context.Context, orgID string, mode ExecutionMode) (*TreasuryState, error) {
	o.mu.Lock()
	defer o.mu.Unlock()

	key := stateKey(orgID, mode)
	state, exists := o.states[key]
	if !exists {
		// Initialize standard default state
		// $1,000 USDC default in testing/simulation = 1,000,000,000 base units
		totalBal := "1000000000"
		if mode == ModeReal {
			totalBal = "500000000" // $500 USDC
		}
		minBuffer := "100000000" // $100 USDC buffer floor

		state = &TreasuryState{
			TreasuryID:        "tr_" + generateID("treasury_"),
			OrganizationID:    orgID,
			VaultAddress:      "0x3600000000000000000000000000000000000001",
			Currency:          "USDC",
			Mode:              mode,
			TotalBalance:      totalBal,
			AvailableBalance:  "400000000",
			ReservedBalance:   "0",
			CommittedBalance:  "0",
			PendingSettlement: "0",
			DisputedBalance:   "0",
			MinimumBuffer:     minBuffer,
			MaximumExposure:   "400000000",
			OperationalMode:   OperationalModeNormal,
			UpdatedAt:         time.Now(),
			SourceVersion:     1,
		}
		o.states[key] = state
	}

	// Recompute dynamic aggregates based on active reservations and commitments
	o.recalculateStateBalancesLocked(state)
	return cloneTreasuryState(state), nil
}

// GetLiquidityEnvelope calculates current capacity and safe commitment headroom.
func (o *DefaultLiquidityOrchestrator) GetLiquidityEnvelope(ctx context.Context, orgID string, scope ScopeLevel, scopeID string, mode ExecutionMode) (*LiquidityEnvelope, error) {
	state, err := o.GetTreasuryState(ctx, orgID, mode)
	if err != nil {
		return nil, err
	}

	o.mu.RLock()
	defer o.mu.RUnlock()

	total, _ := ParseBigInt(state.TotalBalance)
	avail, _ := ParseBigInt(state.AvailableBalance)
	reserved, _ := ParseBigInt(state.ReservedBalance)
	committed, _ := ParseBigInt(state.CommittedBalance)
	minBuffer, _ := ParseBigInt(state.MinimumBuffer)

	// Apply hierarchical scope buffer if defined
	bKey := bufferKey(orgID, scope, scopeID)
	if pol, ok := o.bufferPolicies[bKey]; ok && pol != nil {
		polBuf, _ := ParseBigInt(pol.MinimumAbsolute)
		if polBuf.Cmp(minBuffer) > 0 {
			minBuffer = polBuf
		}
	}

	// Current capacity is available liquidity
	currentCapacity := new(big.Int).Set(avail)

	// Safe commitment capacity = max(0, Available - Committed - MinimumBuffer)
	safeCapacity := new(big.Int).Sub(avail, committed)
	safeCapacity.Sub(safeCapacity, minBuffer)
	if safeCapacity.Sign() < 0 {
		safeCapacity = big.NewInt(0)
	}

	// Potential exposure = Reserved + Committed + Pending
	pending, _ := ParseBigInt(state.PendingSettlement)
	potExposure := new(big.Int).Add(reserved, committed)
	potExposure.Add(potExposure, pending)

	return &LiquidityEnvelope{
		Scope:                  scope,
		ScopeID:                scopeID,
		Currency:               state.Currency,
		TotalFunds:             total.String(),
		CurrentAvailable:       avail.String(),
		ReservedFunds:          reserved.String(),
		CommittedFunds:         committed.String(),
		PotentialExposure:      potExposure.String(),
		MinimumBuffer:          minBuffer.String(),
		CurrentCapacity:        currentCapacity.String(),
		SafeCommitmentCapacity: safeCapacity.String(),
		CalculatedAt:           time.Now(),
	}, nil
}

// EvaluateLiquidityGate evaluates whether an economic obligation or intent can be safely undertaken.
func (o *DefaultLiquidityOrchestrator) EvaluateLiquidityGate(ctx context.Context, orgID string, amountBase string, mode ExecutionMode) (LiquidityGateResult, string, error) {
	reqAmt, err := ParseBigInt(amountBase)
	if err != nil || reqAmt.Sign() <= 0 {
		return GateLiquidityUnavailable, "Invalid amount requested", ErrInvalidAmount
	}

	envelope, err := o.GetLiquidityEnvelope(ctx, orgID, ScopeOrganization, orgID, mode)
	if err != nil {
		return GateLiquidityUnavailable, "Failed to load liquidity envelope: " + err.Error(), err
	}

	state, _ := o.GetTreasuryState(ctx, orgID, mode)
	if state.OperationalMode == OperationalModeEmergency {
		return GateLiquidityUnavailable, "Treasury is in EMERGENCY paused mode; all new commitments blocked", ErrTreasuryEmergencyPaused
	}

	avail, _ := ParseBigInt(envelope.CurrentAvailable)
	buffer, _ := ParseBigInt(envelope.MinimumBuffer)
	safeCap, _ := ParseBigInt(envelope.SafeCommitmentCapacity)

	// If requested amount exceeds total available liquidity: UNAVAILABLE
	if reqAmt.Cmp(avail) > 0 {
		return GateLiquidityUnavailable, fmt.Sprintf("Requested %s exceeds current available liquidity %s", amountBase, avail.String()), ErrReservationExceedsAvailable
	}

	// If requested amount exceeds safe capacity (encroaching upon buffer or commitments): CONSTRAINED
	if reqAmt.Cmp(safeCap) > 0 {
		if state.OperationalMode == OperationalModeConstrained {
			return GateLiquidityUnavailable, "Treasury in CONSTRAINED mode; safe capacity exceeded", ErrBufferBreached
		}
		return GateLiquidityConstrained, fmt.Sprintf("Requested %s exceeds safe commitment capacity %s (would enter buffer zone %s)", amountBase, safeCap.String(), buffer.String()), nil
	}

	return GateLiquidityAvailable, "Liquidity available within safe commitment capacity", nil
}

// ReserveLiquidityAtomic safely locks available liquidity under synchronization mutex.
func (o *DefaultLiquidityOrchestrator) ReserveLiquidityAtomic(ctx context.Context, req *LiquidityReservationRequest) (*LiquidityReservation, error) {
	if req == nil {
		return nil, ErrInvalidAmount
	}
	reqAmt, err := ParseBigInt(req.AmountBase)
	if err != nil || reqAmt.Sign() <= 0 {
		return nil, ErrInvalidAmount
	}

	o.mu.Lock()
	defer o.mu.Unlock()

	key := stateKey(req.OrganizationID, req.Mode)
	state, exists := o.states[key]
	if !exists {
		// Initialize
		state = &TreasuryState{
			TreasuryID:        "tr_" + generateID("treasury_"),
			OrganizationID:    req.OrganizationID,
			VaultAddress:      "0x3600000000000000000000000000000000000001",
			Currency:          "USDC",
			Mode:              req.Mode,
			TotalBalance:      "1000000000",
			AvailableBalance:  "800000000",
			ReservedBalance:   "0",
			CommittedBalance:  "0",
			PendingSettlement: "0",
			DisputedBalance:   "0",
			MinimumBuffer:     "100000000",
			MaximumExposure:   "500000000",
			OperationalMode:   OperationalModeNormal,
			UpdatedAt:         time.Now(),
			SourceVersion:     1,
		}
		o.states[key] = state
	}

	// Stale liquidity protection: Re-calculate current real-time balances under write lock
	o.recalculateStateBalancesLocked(state)

	if state.OperationalMode == OperationalModeEmergency {
		return nil, ErrTreasuryEmergencyPaused
	}

	avail, _ := ParseBigInt(state.AvailableBalance)
	minBuffer, _ := ParseBigInt(state.MinimumBuffer)

	// Invariant INV-72 & INV-73: Reservations cannot exceed available liquidity
	netAvailable := new(big.Int).Sub(avail, minBuffer)
	if netAvailable.Sign() < 0 {
		netAvailable = big.NewInt(0)
	}

	if reqAmt.Cmp(netAvailable) > 0 {
		return nil, fmt.Errorf("%w: requested %s, net available %s", ErrConcurrentOversubscription, reqAmt.String(), netAvailable.String())
	}

	// Invariant INV-74: Child liquidity envelope cannot exceed parent authority
	if req.ParentScope != "" && req.ParentScopeID != "" {
		pKey := bufferKey(req.OrganizationID, req.ParentScope, req.ParentScopeID)
		if pol, ok := o.bufferPolicies[pKey]; ok && pol != nil {
			parentCap, _ := ParseBigInt(pol.MinimumAbsolute)
			if parentCap.Sign() > 0 && reqAmt.Cmp(parentCap) > 0 {
				return nil, ErrChildEnvelopeExceedsParent
			}
		}
	}

	// Check idempotency: If active reservation exists for obligation/intent, return it
	if req.ObligationID != "" {
		for _, res := range o.reservations {
			if res.ObligationID == req.ObligationID && res.Status == ReservationReserved {
				return cloneReservation(res), nil
			}
		}
	}

	now := time.Now()
	var expiresAt time.Time
	if req.TimeoutSeconds < 0 {
		expiresAt = now.Add(time.Duration(req.TimeoutSeconds) * time.Second)
	} else if req.TimeoutSeconds == 0 {
		expiresAt = now.Add(3600 * time.Second)
	} else {
		expiresAt = now.Add(time.Duration(req.TimeoutSeconds) * time.Second)
	}

	resID := "res_" + generateID("lq_")
	res := &LiquidityReservation{
		ReservationID:  resID,
		OrganizationID: req.OrganizationID,
		Source:         req.Source,
		ObligationID:   req.ObligationID,
		MissionID:      req.MissionID,
		SwarmID:        req.SwarmID,
		AgentID:        req.AgentID,
		Amount:         reqAmt.String(),
		Currency:       req.Currency,
		Mode:           req.Mode,
		Status:         ReservationReserved,
		PolicyVersion:  req.PolicyVersion,
		PolicyHash:     req.PolicyHash,
		CreatedAt:      now,
		ExpiresAt:      expiresAt,
	}

	o.reservations[resID] = res
	o.recalculateStateBalancesLocked(state)

	return cloneReservation(res), nil
}

// ReleaseLiquidityReservation releases a held reservation back to available liquidity.
func (o *DefaultLiquidityOrchestrator) ReleaseLiquidityReservation(ctx context.Context, reservationID string, reason string) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	res, exists := o.reservations[reservationID]
	if !exists {
		return ErrReservationNotFound
	}

	if res.Status != ReservationReserved {
		return nil // idempotent no-op
	}

	now := time.Now()
	res.Status = ReservationReleased
	res.ReleasedAt = &now

	key := stateKey(res.OrganizationID, res.Mode)
	if state, ok := o.states[key]; ok {
		o.recalculateStateBalancesLocked(state)
	}
	return nil
}

// ConsumeLiquidityReservation marks a reservation as consumed by an in-flight settlement intent.
func (o *DefaultLiquidityOrchestrator) ConsumeLiquidityReservation(ctx context.Context, reservationID string) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	res, exists := o.reservations[reservationID]
	if !exists {
		return ErrReservationNotFound
	}

	if res.Status != ReservationReserved {
		return ErrInvalidReservationState
	}

	now := time.Now()
	res.Status = ReservationConsumed
	res.ConsumedAt = &now

	key := stateKey(res.OrganizationID, res.Mode)
	if state, ok := o.states[key]; ok {
		o.recalculateStateBalancesLocked(state)
	}
	return nil
}

// ListReservations returns filtered reservations.
func (o *DefaultLiquidityOrchestrator) ListReservations(ctx context.Context, orgID string, mode ExecutionMode, status ReservationStatus) ([]*LiquidityReservation, error) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	var result []*LiquidityReservation
	for _, res := range o.reservations {
		if orgID != "" && res.OrganizationID != orgID {
			continue
		}
		if mode != "" && res.Mode != mode {
			continue
		}
		if status != "" && res.Status != status {
			continue
		}
		result = append(result, cloneReservation(res))
	}
	return result, nil
}

// ExpireStaleReservations scans and releases expired reservations.
func (o *DefaultLiquidityOrchestrator) ExpireStaleReservations(ctx context.Context, orgID string) (int, error) {
	o.mu.Lock()
	defer o.mu.Unlock()

	now := time.Now()
	expiredCount := 0

	for _, res := range o.reservations {
		if orgID != "" && res.OrganizationID != orgID {
			continue
		}
		if res.Status == ReservationReserved && now.After(res.ExpiresAt) {
			res.Status = ReservationExpired
			res.ReleasedAt = &now
			expiredCount++

			key := stateKey(res.OrganizationID, res.Mode)
			if state, ok := o.states[key]; ok {
				o.recalculateStateBalancesLocked(state)
			}
		}
	}
	return expiredCount, nil
}

// CreateCommitment registers a future soft or hard commitment.
func (o *DefaultLiquidityOrchestrator) CreateCommitment(ctx context.Context, commitment *LiquidityCommitment) error {
	if commitment == nil {
		return ErrInvalidAmount
	}
	amt, err := ParseBigInt(commitment.Amount)
	if err != nil || amt.Sign() <= 0 {
		return ErrInvalidAmount
	}

	o.mu.Lock()
	defer o.mu.Unlock()

	if commitment.CommitmentID == "" {
		commitment.CommitmentID = "cmt_" + generateID("c_")
	}
	now := time.Now()
	commitment.CreatedAt = now
	commitment.UpdatedAt = now

	o.commitments[commitment.CommitmentID] = commitment

	key := stateKey(commitment.OrganizationID, ModeReal)
	if state, ok := o.states[key]; ok {
		o.recalculateStateBalancesLocked(state)
	}
	return nil
}

// ListCommitments returns registered commitments.
func (o *DefaultLiquidityOrchestrator) ListCommitments(ctx context.Context, orgID string) ([]*LiquidityCommitment, error) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	var result []*LiquidityCommitment
	for _, c := range o.commitments {
		if orgID != "" && c.OrganizationID != orgID {
			continue
		}
		result = append(result, c)
	}
	return result, nil
}

// SetBufferPolicy stores a scoped buffer policy.
func (o *DefaultLiquidityOrchestrator) SetBufferPolicy(ctx context.Context, policy *LiquidityBufferPolicy) error {
	if policy == nil {
		return ErrInvalidAmount
	}
	o.mu.Lock()
	defer o.mu.Unlock()

	key := bufferKey(policy.OrganizationID, policy.Scope, policy.ScopeID)
	o.bufferPolicies[key] = policy
	return nil
}

// GetBufferPolicy retrieves a scoped buffer policy.
func (o *DefaultLiquidityOrchestrator) GetBufferPolicy(ctx context.Context, orgID string, scope ScopeLevel, scopeID string) (*LiquidityBufferPolicy, error) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	key := bufferKey(orgID, scope, scopeID)
	if pol, ok := o.bufferPolicies[key]; ok {
		return pol, nil
	}
	return &LiquidityBufferPolicy{
		PolicyID:        "default_buf",
		OrganizationID:  orgID,
		Scope:           scope,
		ScopeID:         scopeID,
		MinimumAbsolute: "100000000", // $100 USDC default
		Currency:        "USDC",
		EffectiveAt:     time.Now(),
	}, nil
}

// SetOperationalMode toggles NORMAL, CONSTRAINED, or EMERGENCY mode.
func (o *DefaultLiquidityOrchestrator) SetOperationalMode(ctx context.Context, orgID string, mode OperationalMode) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	for _, state := range o.states {
		if orgID == "" || state.OrganizationID == orgID {
			state.OperationalMode = mode
			state.UpdatedAt = time.Now()
		}
	}
	return nil
}

// SetTreasuryBalance explicitly sets the total balance and minimum buffer for an organization and mode.
func (o *DefaultLiquidityOrchestrator) SetTreasuryBalance(ctx context.Context, orgID string, mode ExecutionMode, totalBalance string, minBuffer string) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	key := stateKey(orgID, mode)
	state, exists := o.states[key]
	if !exists {
		state = &TreasuryState{
			TreasuryID:        "tr_" + generateID("treasury_"),
			OrganizationID:    orgID,
			VaultAddress:      "0x3600000000000000000000000000000000000001",
			Currency:          "USDC",
			Mode:              mode,
			TotalBalance:      totalBalance,
			AvailableBalance:  totalBalance,
			ReservedBalance:   "0",
			CommittedBalance:  "0",
			PendingSettlement: "0",
			DisputedBalance:   "0",
			MinimumBuffer:     minBuffer,
			MaximumExposure:   totalBalance,
			OperationalMode:   OperationalModeNormal,
			UpdatedAt:         time.Now(),
			SourceVersion:     1,
		}
		o.states[key] = state
	} else {
		state.TotalBalance = totalBalance
		state.MinimumBuffer = minBuffer
	}

	o.recalculateStateBalancesLocked(state)
	return nil
}

// RecordExpectedInflow records an expected future incoming receipt.
func (o *DefaultLiquidityOrchestrator) RecordExpectedInflow(ctx context.Context, inflow *ExpectedInflow) error {
	if inflow == nil {
		return ErrInvalidAmount
	}
	amt, err := ParseBigInt(inflow.ExpectedAmount)
	if err != nil || amt.Sign() <= 0 {
		return ErrInvalidAmount
	}

	o.mu.Lock()
	defer o.mu.Unlock()

	if inflow.InflowID == "" {
		inflow.InflowID = "inf_" + generateID("in_")
	}
	inflow.Status = InflowExpected

	// Invariant INV-71 & INV-82: Expected inflows CANNOT be treated as available funds
	o.inflows[inflow.InflowID] = inflow
	return nil
}

// ListExpectedInflows lists expected inflows.
func (o *DefaultLiquidityOrchestrator) ListExpectedInflows(ctx context.Context, orgID string) ([]*ExpectedInflow, error) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	var result []*ExpectedInflow
	for _, inf := range o.inflows {
		if orgID != "" && inf.OrganizationID != orgID {
			continue
		}
		result = append(result, inf)
	}
	return result, nil
}

// VerifyExpectedInflow marks an inflow as verified upon on-chain confirmation.
func (o *DefaultLiquidityOrchestrator) VerifyExpectedInflow(ctx context.Context, inflowID string, txHash string) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	inf, exists := o.inflows[inflowID]
	if !exists {
		return ErrReservationNotFound
	}
	now := time.Now()
	inf.Status = InflowVerified
	inf.VerifiedAt = &now
	inf.TxHash = txHash
	return nil
}

// recalculateStateBalancesLocked updates AvailableBalance, ReservedBalance, and CommittedBalance deterministically.
func (o *DefaultLiquidityOrchestrator) recalculateStateBalancesLocked(state *TreasuryState) {
	total, _ := ParseBigInt(state.TotalBalance)

	var reservedSum uint64 = 0
	for _, res := range o.reservations {
		if res.OrganizationID == state.OrganizationID && res.Mode == state.Mode && res.Status == ReservationReserved {
			amt, err := ParseBigInt(res.Amount)
			if err == nil {
				reservedSum += amt.Uint64()
			}
		}
	}

	var committedSum uint64 = 0
	for _, c := range o.commitments {
		if c.OrganizationID == state.OrganizationID && c.Type == CommitmentHard {
			amt, err := ParseBigInt(c.Amount)
			if err == nil {
				committedSum += amt.Uint64()
			}
		}
	}

	reservedBig := new(big.Int).SetUint64(reservedSum)
	committedBig := new(big.Int).SetUint64(committedSum)

	avail := new(big.Int).Sub(total, reservedBig)
	if avail.Sign() < 0 {
		avail = big.NewInt(0)
	}

	state.ReservedBalance = reservedBig.String()
	state.CommittedBalance = committedBig.String()
	state.AvailableBalance = avail.String()
	state.UpdatedAt = time.Now()
	state.SourceVersion++
}

func cloneTreasuryState(s *TreasuryState) *TreasuryState {
	c := *s
	return &c
}

func cloneReservation(r *LiquidityReservation) *LiquidityReservation {
	c := *r
	return &c
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + hex.EncodeToString(b)
}
