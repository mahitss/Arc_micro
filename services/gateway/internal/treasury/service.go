package treasury

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

var (
	ErrInsufficientAvailableFunds = errors.New("insufficient available treasury balance (on-chain balance minus active reservations)")
	ErrReservationNotFound        = errors.New("treasury reservation not found")
	ErrInvalidReservationState    = errors.New("invalid treasury reservation state transition")
	ErrBalanceQueryFailed         = errors.New("failed to query authoritative on-chain vault balance")
	ErrInvalidAmount              = errors.New("invalid amount: must be positive integer base units (micro-USDC)")
)

// BalanceProvider abstracts on-chain USDC balance retrieval.
type BalanceProvider interface {
	GetVaultBalance(ctx context.Context, vaultAddress string) (*big.Int, error)
}

// TreasurySummary provides a real-time snapshot distinguishing on-chain balance from reserved and available funds.
type TreasurySummary struct {
	OrganizationID  string `json:"organization_id"`
	VaultAddress    string `json:"vault_address"`
	OnChainBalance  string `json:"on_chain_balance"`  // micro-USDC base units
	ReservedAmount  string `json:"reserved_amount"`   // micro-USDC base units
	AvailableAmount string `json:"available_amount"`  // micro-USDC base units
	Asset           string `json:"asset"`             // "USDC"
	Decimals        int    `json:"decimals"`          // 6
}

// Service defines high-level treasury and liquidity orchestration operations.
type Service interface {
	// Original core methods (Day 1 - Day 10)
	ReserveFunds(ctx context.Context, orgID, vaultAddress, intentID, amount string) (*domain.TreasuryReservation, error)
	ReleaseFunds(ctx context.Context, intentID string) error
	SettleFunds(ctx context.Context, intentID string) error
	GetTreasurySummary(ctx context.Context, orgID, vaultAddress string) (*TreasurySummary, error)
	GetReservationByIntent(ctx context.Context, intentID string) (*domain.TreasuryReservation, error)

	// Task 11 Autonomous Treasury & Liquidity Orchestration
	GetTreasuryState(ctx context.Context, orgID string, mode ExecutionMode) (*TreasuryState, error)
	GetLiquidityEnvelope(ctx context.Context, orgID string, scope ScopeLevel, scopeID string, mode ExecutionMode) (*LiquidityEnvelope, error)
	EvaluateLiquidityGate(ctx context.Context, orgID string, amountBase string, mode ExecutionMode) (LiquidityGateResult, string, error)
	ReserveLiquidityAtomic(ctx context.Context, req *LiquidityReservationRequest) (*LiquidityReservation, error)
	ReleaseLiquidityReservation(ctx context.Context, reservationID string, reason string) error
	ListReservations(ctx context.Context, orgID string, mode ExecutionMode, status ReservationStatus) ([]*LiquidityReservation, error)
	ExpireStaleReservations(ctx context.Context, orgID string) (int, error)
	CreateCommitment(ctx context.Context, commitment *LiquidityCommitment) error
	ListCommitments(ctx context.Context, orgID string) ([]*LiquidityCommitment, error)
	GenerateForecast(ctx context.Context, orgID string, horizon ForecastHorizon, scenario StressScenarioType, mode ExecutionMode) (*LiquidityForecast, error)
	RunStressSimulation(ctx context.Context, orgID string, scenario *LiquidityStressScenario, mode ExecutionMode) (*LiquidityStressResult, error)
	ProposeAllocation(ctx context.Context, orgID string, candidates []*AllocationCandidate, mode ExecutionMode) (*LiquidityAllocationProposal, error)
	ReconcileTreasury(ctx context.Context, orgID string, vaultAddress string, mode ExecutionMode) (*TreasuryReconciliationReport, error)
	DetectAnomalies(ctx context.Context, orgID string, mode ExecutionMode) ([]*LiquidityAnomaly, error)
	GetTreasuryHealth(ctx context.Context, orgID string, mode ExecutionMode) (*TreasuryHealthSnapshot, error)
	RecordExpectedInflow(ctx context.Context, inflow *ExpectedInflow) error
	ListExpectedInflows(ctx context.Context, orgID string) ([]*ExpectedInflow, error)
	SetOperationalMode(ctx context.Context, orgID string, mode OperationalMode) error
	SetTreasuryBalance(ctx context.Context, orgID string, mode ExecutionMode, totalBalance string, minBuffer string) error
	SetBufferPolicy(ctx context.Context, policy *LiquidityBufferPolicy) error
	GetBufferPolicy(ctx context.Context, orgID string, scope ScopeLevel, scopeID string) (*LiquidityBufferPolicy, error)
	RouteLiquidity(ctx context.Context, orgID string, currency string, amountBase string, mode ExecutionMode) (*TreasuryState, error)
}

// DefaultTreasuryService implements Service.
type DefaultTreasuryService struct {
	repo            storage.Repository
	balanceProvider BalanceProvider
	orchestrator    Orchestrator
	forecaster      Forecaster
	stressTester    StressTester
	reconciler      Reconciler
	allocator       Allocator
	anomalies       AnomalyDetector
	router          Router
	mu              sync.Mutex
}

// NewTreasuryService creates a new DefaultTreasuryService with full orchestrator capabilities.
func NewTreasuryService(repo storage.Repository, bp BalanceProvider) *DefaultTreasuryService {
	orch := NewLiquidityOrchestrator()
	return &DefaultTreasuryService{
		repo:            repo,
		balanceProvider: bp,
		orchestrator:    orch,
		forecaster:      NewLiquidityForecaster(orch),
		stressTester:    NewLiquidityStressTester(orch),
		reconciler:      NewTreasuryReconciler(orch, repo, bp),
		allocator:       NewLiquidityAllocator(orch),
		anomalies:       NewAnomalyDetector(orch),
		router:          NewTreasuryRouter(orch),
	}
}

// ReserveFunds atomically locks available treasury funds for an in-flight payment intent.
func (s *DefaultTreasuryService) ReserveFunds(ctx context.Context, orgID, vaultAddress, intentID, amount string) (*domain.TreasuryReservation, error) {
	amtInt, ok := new(big.Int).SetString(strings.TrimSpace(amount), 10)
	if !ok || amtInt.Sign() <= 0 {
		return nil, ErrInvalidAmount
	}

	if orgID == "" {
		orgID = "org_default"
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. If an active reservation already exists for this intent, return it idempotently
	if s.repo != nil {
		existing, err := s.repo.GetReservationByIntent(ctx, intentID)
		if err == nil && existing != nil {
			if existing.Status == "RESERVED" {
				return toDomainReservation(existing), nil
			}
		}
	}

	// 2. Query authoritative on-chain balance if provider is available
	if s.balanceProvider != nil && vaultAddress != "" {
		onChainBal, err := s.balanceProvider.GetVaultBalance(ctx, vaultAddress)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrBalanceQueryFailed, err)
		}

		currentReserved, err := s.repo.GetTotalReservedAmount(ctx, orgID, vaultAddress)
		if err != nil {
			return nil, fmt.Errorf("failed to query active reservations: %w", err)
		}

		reservedBig := new(big.Int).SetUint64(currentReserved)
		available := new(big.Int).Sub(onChainBal, reservedBig)

		if amtInt.Cmp(available) > 0 {
			return nil, fmt.Errorf("%w: requested %s micro-USDC, available %s micro-USDC",
				ErrInsufficientAvailableFunds, amtInt.String(), available.String())
		}
	}

	// 3. Sync with LiquidityOrchestrator
	_, _ = s.orchestrator.ReserveLiquidityAtomic(ctx, &LiquidityReservationRequest{
		OrganizationID: orgID,
		Source:         "INTENT",
		ObligationID:   intentID,
		AmountBase:     amtInt.String(),
		Currency:       "USDC",
		Mode:           ModeReal,
		TimeoutSeconds: 3600,
	})

	// 4. Create reservation record in repository
	resID := generateID("res_")
	now := time.Now()
	res := &storage.TreasuryReservation{
		ID:             resID,
		OrganizationID: orgID,
		VaultAddress:   vaultAddress,
		IntentID:       intentID,
		Amount:         amtInt.String(),
		Status:         string(domain.TreasuryReservationStatusReserved),
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if s.repo != nil {
		if err := s.repo.CreateReservation(ctx, res); err != nil {
			return nil, fmt.Errorf("failed to persist treasury reservation: %w", err)
		}

		_ = s.repo.SaveAuditEvent(ctx, &storage.AuditEvent{
			ID:              generateID("evt_"),
			OrganizationID:  orgID,
			EventType:       string(domain.AuditEventTreasuryReserved),
			ActorType:       "SYSTEM",
			ActorID:         "treasury_service",
			ResourceType:    "TREASURY",
			ResourceID:      resID,
			RequestID:       intentID,
			PaymentIntentID: intentID,
			Timestamp:       now,
			Metadata:        fmt.Sprintf(`{"intent_id":"%s","amount":"%s","vault":"%s"}`, intentID, amount, vaultAddress),
		})
	}

	return toDomainReservation(res), nil
}

// ReleaseFunds releases a held reservation.
func (s *DefaultTreasuryService) ReleaseFunds(ctx context.Context, intentID string) error {
	if s.repo == nil {
		return nil
	}
	res, err := s.repo.GetReservationByIntent(ctx, intentID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil
		}
		return err
	}

	if res.Status != string(domain.TreasuryReservationStatusReserved) {
		return nil
	}

	now := time.Now()
	if err := s.repo.UpdateReservationStatus(ctx, res.ID, string(domain.TreasuryReservationStatusReleased), now); err != nil {
		return err
	}

	// Sync with orchestrator
	_ = s.orchestrator.ReleaseLiquidityReservation(ctx, res.ID, "Intent cancelled or expired")

	_ = s.repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:              generateID("evt_"),
		OrganizationID:  res.OrganizationID,
		EventType:       string(domain.AuditEventTreasuryReleased),
		ActorType:       "SYSTEM",
		ActorID:         "treasury_service",
		ResourceType:    "TREASURY",
		ResourceID:      res.ID,
		RequestID:       intentID,
		PaymentIntentID: intentID,
		Timestamp:       now,
		Metadata:        fmt.Sprintf(`{"intent_id":"%s","released_amount":"%s"}`, intentID, res.Amount),
	})

	return nil
}

// SettleFunds transitions a reservation to SETTLED upon confirmed blockchain execution.
func (s *DefaultTreasuryService) SettleFunds(ctx context.Context, intentID string) error {
	if s.repo == nil {
		return nil
	}
	res, err := s.repo.GetReservationByIntent(ctx, intentID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil
		}
		return err
	}

	if res.Status != string(domain.TreasuryReservationStatusReserved) {
		return fmt.Errorf("%w: current status is %s", ErrInvalidReservationState, res.Status)
	}

	now := time.Now()
	if err := s.repo.UpdateReservationStatus(ctx, res.ID, string(domain.TreasuryReservationStatusSettled), now); err != nil {
		return err
	}

	// Sync with orchestrator
	_ = s.orchestrator.ConsumeLiquidityReservation(ctx, res.ID)

	_ = s.repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:              generateID("evt_"),
		OrganizationID:  res.OrganizationID,
		EventType:       string(domain.AuditEventTreasurySettled),
		ActorType:       "SYSTEM",
		ActorID:         "treasury_service",
		ResourceType:    "TREASURY",
		ResourceID:      res.ID,
		RequestID:       intentID,
		PaymentIntentID: intentID,
		Timestamp:       now,
		Metadata:        fmt.Sprintf(`{"intent_id":"%s","settled_amount":"%s"}`, intentID, res.Amount),
	})

	return nil
}

// GetTreasurySummary calculates the current treasury balance breakdown.
func (s *DefaultTreasuryService) GetTreasurySummary(ctx context.Context, orgID, vaultAddress string) (*TreasurySummary, error) {
	if orgID == "" {
		orgID = "org_default"
	}

	var onChainBal *big.Int
	if s.balanceProvider != nil && vaultAddress != "" {
		bal, err := s.balanceProvider.GetVaultBalance(ctx, vaultAddress)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrBalanceQueryFailed, err)
		}
		onChainBal = bal
	} else {
		onChainBal = big.NewInt(1000000000)
	}

	var reservedUint uint64 = 0
	if s.repo != nil {
		res, err := s.repo.GetTotalReservedAmount(ctx, orgID, vaultAddress)
		if err == nil {
			reservedUint = res
		}
	}

	reservedBig := new(big.Int).SetUint64(reservedUint)
	available := new(big.Int).Sub(onChainBal, reservedBig)
	if available.Sign() < 0 {
		available = big.NewInt(0)
	}

	return &TreasurySummary{
		OrganizationID:  orgID,
		VaultAddress:    vaultAddress,
		OnChainBalance:  onChainBal.String(),
		ReservedAmount:  reservedBig.String(),
		AvailableAmount: available.String(),
		Asset:           "USDC",
		Decimals:        6,
	}, nil
}

// GetReservationByIntent returns the active or historical reservation for an intent.
func (s *DefaultTreasuryService) GetReservationByIntent(ctx context.Context, intentID string) (*domain.TreasuryReservation, error) {
	if s.repo == nil {
		return nil, ErrReservationNotFound
	}
	res, err := s.repo.GetReservationByIntent(ctx, intentID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, ErrReservationNotFound
		}
		return nil, err
	}
	return toDomainReservation(res), nil
}

// --- Task 11 Orchestrator Forwarders ---

func (s *DefaultTreasuryService) GetTreasuryState(ctx context.Context, orgID string, mode ExecutionMode) (*TreasuryState, error) {
	return s.orchestrator.GetTreasuryState(ctx, orgID, mode)
}

func (s *DefaultTreasuryService) GetLiquidityEnvelope(ctx context.Context, orgID string, scope ScopeLevel, scopeID string, mode ExecutionMode) (*LiquidityEnvelope, error) {
	return s.orchestrator.GetLiquidityEnvelope(ctx, orgID, scope, scopeID, mode)
}

func (s *DefaultTreasuryService) EvaluateLiquidityGate(ctx context.Context, orgID string, amountBase string, mode ExecutionMode) (LiquidityGateResult, string, error) {
	return s.orchestrator.EvaluateLiquidityGate(ctx, orgID, amountBase, mode)
}

func (s *DefaultTreasuryService) ReserveLiquidityAtomic(ctx context.Context, req *LiquidityReservationRequest) (*LiquidityReservation, error) {
	return s.orchestrator.ReserveLiquidityAtomic(ctx, req)
}

func (s *DefaultTreasuryService) ReleaseLiquidityReservation(ctx context.Context, reservationID string, reason string) error {
	return s.orchestrator.ReleaseLiquidityReservation(ctx, reservationID, reason)
}

func (s *DefaultTreasuryService) ListReservations(ctx context.Context, orgID string, mode ExecutionMode, status ReservationStatus) ([]*LiquidityReservation, error) {
	return s.orchestrator.ListReservations(ctx, orgID, mode, status)
}

func (s *DefaultTreasuryService) ExpireStaleReservations(ctx context.Context, orgID string) (int, error) {
	return s.orchestrator.ExpireStaleReservations(ctx, orgID)
}

func (s *DefaultTreasuryService) CreateCommitment(ctx context.Context, commitment *LiquidityCommitment) error {
	return s.orchestrator.CreateCommitment(ctx, commitment)
}

func (s *DefaultTreasuryService) ListCommitments(ctx context.Context, orgID string) ([]*LiquidityCommitment, error) {
	return s.orchestrator.ListCommitments(ctx, orgID)
}

func (s *DefaultTreasuryService) GenerateForecast(ctx context.Context, orgID string, horizon ForecastHorizon, scenario StressScenarioType, mode ExecutionMode) (*LiquidityForecast, error) {
	return s.forecaster.GenerateForecast(ctx, orgID, horizon, scenario, mode)
}

func (s *DefaultTreasuryService) RunStressSimulation(ctx context.Context, orgID string, scenario *LiquidityStressScenario, mode ExecutionMode) (*LiquidityStressResult, error) {
	return s.stressTester.RunStressSimulation(ctx, orgID, scenario, mode)
}

func (s *DefaultTreasuryService) ProposeAllocation(ctx context.Context, orgID string, candidates []*AllocationCandidate, mode ExecutionMode) (*LiquidityAllocationProposal, error) {
	return s.allocator.ProposeAllocation(ctx, orgID, candidates, mode)
}

func (s *DefaultTreasuryService) ReconcileTreasury(ctx context.Context, orgID string, vaultAddress string, mode ExecutionMode) (*TreasuryReconciliationReport, error) {
	return s.reconciler.ReconcileTreasury(ctx, orgID, vaultAddress, mode)
}

func (s *DefaultTreasuryService) DetectAnomalies(ctx context.Context, orgID string, mode ExecutionMode) ([]*LiquidityAnomaly, error) {
	return s.anomalies.DetectAnomalies(ctx, orgID, mode)
}

func (s *DefaultTreasuryService) GetTreasuryHealth(ctx context.Context, orgID string, mode ExecutionMode) (*TreasuryHealthSnapshot, error) {
	state, err := s.orchestrator.GetTreasuryState(ctx, orgID, mode)
	if err != nil {
		return nil, err
	}
	envelope, err := s.orchestrator.GetLiquidityEnvelope(ctx, orgID, ScopeOrganization, orgID, mode)
	if err != nil {
		return nil, err
	}

	recon, _ := s.reconciler.ReconcileTreasury(ctx, orgID, state.VaultAddress, mode)
	anomalies, _ := s.anomalies.DetectAnomalies(ctx, orgID, mode)
	reservations, _ := s.orchestrator.ListReservations(ctx, orgID, mode, ReservationReserved)

	tot, _ := ParseBigInt(state.TotalBalance)
	res, _ := ParseBigInt(state.ReservedBalance)
	com, _ := ParseBigInt(state.CommittedBalance)
	encumbered := new(big.Int).Add(res, com)

	solvencyRatio := 10.0
	if encumbered.Sign() > 0 {
		totFloat := new(big.Float).SetInt(tot)
		encFloat := new(big.Float).SetInt(encumbered)
		ratioFloat := new(big.Float).Quo(totFloat, encFloat)
		solvencyRatio, _ = ratioFloat.Float64()
	}

	reconStatus := ReconMatched
	blockchainBal := state.TotalBalance
	var reconTime time.Time = time.Now()
	if recon != nil {
		reconStatus = recon.Status
		blockchainBal = recon.BlockchainBalance
		reconTime = recon.VerifiedAt
	}

	return &TreasuryHealthSnapshot{
		OrganizationID:             orgID,
		Mode:                       mode,
		TotalBalance:               state.TotalBalance,
		AvailableBalance:           state.AvailableBalance,
		ReservedBalance:            state.ReservedBalance,
		CommittedBalance:           state.CommittedBalance,
		PendingSettlement:          state.PendingSettlement,
		DisputedBalance:            state.DisputedBalance,
		MinimumBuffer:              state.MinimumBuffer,
		SafeCapacity:               envelope.SafeCommitmentCapacity,
		WorstCaseExposure:          envelope.PotentialExposure,
		SolvencyRatio:              solvencyRatio,
		OperationalMode:            state.OperationalMode,
		ReconciliationStatus:       reconStatus,
		LastVerifiedOnChainBalance: blockchainBal,
		VerificationTimestamp:      reconTime,
		ActiveReservationsCount:    len(reservations),
		ActiveAnomaliesCount:       len(anomalies),
	}, nil
}

func (s *DefaultTreasuryService) RecordExpectedInflow(ctx context.Context, inflow *ExpectedInflow) error {
	return s.orchestrator.RecordExpectedInflow(ctx, inflow)
}

func (s *DefaultTreasuryService) ListExpectedInflows(ctx context.Context, orgID string) ([]*ExpectedInflow, error) {
	return s.orchestrator.ListExpectedInflows(ctx, orgID)
}

func (s *DefaultTreasuryService) SetOperationalMode(ctx context.Context, orgID string, mode OperationalMode) error {
	return s.orchestrator.SetOperationalMode(ctx, orgID, mode)
}

func (s *DefaultTreasuryService) SetTreasuryBalance(ctx context.Context, orgID string, mode ExecutionMode, totalBalance string, minBuffer string) error {
	return s.orchestrator.SetTreasuryBalance(ctx, orgID, mode, totalBalance, minBuffer)
}

func (s *DefaultTreasuryService) SetBufferPolicy(ctx context.Context, policy *LiquidityBufferPolicy) error {
	return s.orchestrator.SetBufferPolicy(ctx, policy)
}

func (s *DefaultTreasuryService) GetBufferPolicy(ctx context.Context, orgID string, scope ScopeLevel, scopeID string) (*LiquidityBufferPolicy, error) {
	return s.orchestrator.GetBufferPolicy(ctx, orgID, scope, scopeID)
}

func (s *DefaultTreasuryService) RouteLiquidity(ctx context.Context, orgID string, currency string, amountBase string, mode ExecutionMode) (*TreasuryState, error) {
	return s.router.RouteLiquidity(ctx, orgID, currency, amountBase, mode)
}

func toDomainReservation(r *storage.TreasuryReservation) *domain.TreasuryReservation {
	if r == nil {
		return nil
	}
	return &domain.TreasuryReservation{
		ID:             r.ID,
		OrganizationID: r.OrganizationID,
		VaultAddress:   r.VaultAddress,
		IntentID:       r.IntentID,
		Amount:         r.Amount,
		Status:         domain.TreasuryReservationStatus(r.Status),
		CreatedAt:      r.CreatedAt,
		UpdatedAt:      r.UpdatedAt,
	}
}
