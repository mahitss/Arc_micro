package treasury

import (
	"context"
	"crypto/rand"
	"encoding/hex"
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

// Service defines high-level treasury operations.
type Service interface {
	ReserveFunds(ctx context.Context, orgID, vaultAddress, intentID, amount string) (*domain.TreasuryReservation, error)
	ReleaseFunds(ctx context.Context, intentID string) error
	SettleFunds(ctx context.Context, intentID string) error
	GetTreasurySummary(ctx context.Context, orgID, vaultAddress string) (*TreasurySummary, error)
	GetReservationByIntent(ctx context.Context, intentID string) (*domain.TreasuryReservation, error)
}

// DefaultTreasuryService implements Service.
type DefaultTreasuryService struct {
	repo            storage.Repository
	balanceProvider BalanceProvider
	mu              sync.Mutex
}

// NewTreasuryService creates a new DefaultTreasuryService.
func NewTreasuryService(repo storage.Repository, bp BalanceProvider) *DefaultTreasuryService {
	return &DefaultTreasuryService{
		repo:            repo,
		balanceProvider: bp,
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
	existing, err := s.repo.GetReservationByIntent(ctx, intentID)
	if err == nil && existing != nil {
		if existing.Status == "RESERVED" {
			return toDomainReservation(existing), nil
		}
	}

	// 2. Query authoritative on-chain balance if provider is available
	if s.balanceProvider != nil && vaultAddress != "" {
		onChainBal, err := s.balanceProvider.GetVaultBalance(ctx, vaultAddress)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrBalanceQueryFailed, err)
		}

		// Query total active reservations
		currentReserved, err := s.repo.GetTotalReservedAmount(ctx, orgID, vaultAddress)
		if err != nil {
			return nil, fmt.Errorf("failed to query active reservations: %w", err)
		}

		reservedBig := new(big.Int).SetUint64(currentReserved)
		available := new(big.Int).Sub(onChainBal, reservedBig)

		// Check if requested amount exceeds available balance
		if amtInt.Cmp(available) > 0 {
			return nil, fmt.Errorf("%w: requested %s micro-USDC, available %s micro-USDC",
				ErrInsufficientAvailableFunds, amtInt.String(), available.String())
		}
	}

	// 3. Create reservation record
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

	if err := s.repo.CreateReservation(ctx, res); err != nil {
		return nil, fmt.Errorf("failed to persist treasury reservation: %w", err)
	}

	// 4. Emit Audit Event
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

	return toDomainReservation(res), nil
}

// ReleaseFunds releases a held reservation (e.g., when an intent is rejected, expired, or failed).
func (s *DefaultTreasuryService) ReleaseFunds(ctx context.Context, intentID string) error {
	res, err := s.repo.GetReservationByIntent(ctx, intentID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil // No reservation to release
		}
		return err
	}

	if res.Status != string(domain.TreasuryReservationStatusReserved) {
		// Already released or settled: no-op
		return nil
	}

	now := time.Now()
	if err := s.repo.UpdateReservationStatus(ctx, res.ID, string(domain.TreasuryReservationStatusReleased), now); err != nil {
		return err
	}

	// Emit Audit Event
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
	res, err := s.repo.GetReservationByIntent(ctx, intentID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil // No reservation found
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

	// Emit Audit Event
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
		// Default mock balance for testing environments (1,000 USDC = 1,000,000,000 base units)
		onChainBal = big.NewInt(1000000000)
	}

	reservedUint, err := s.repo.GetTotalReservedAmount(ctx, orgID, vaultAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to query reserved amount: %w", err)
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
	res, err := s.repo.GetReservationByIntent(ctx, intentID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, ErrReservationNotFound
		}
		return nil, err
	}
	return toDomainReservation(res), nil
}

func toDomainReservation(r *storage.TreasuryReservation) *domain.TreasuryReservation {
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

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + hex.EncodeToString(b)
}
