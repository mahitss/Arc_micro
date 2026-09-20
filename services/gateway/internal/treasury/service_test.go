package treasury

import (
	"context"
	"math/big"
	"sync"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

type mockBalanceProvider struct {
	balance *big.Int
}

func (m *mockBalanceProvider) GetVaultBalance(ctx context.Context, vaultAddress string) (*big.Int, error) {
	return new(big.Int).Set(m.balance), nil
}

func TestTreasury_ReservationLifecycle(t *testing.T) {
	repo := storage.NewMemoryRepository()
	// Initial on-chain balance: $100.00 = 100,000,000 micro-USDC
	bp := &mockBalanceProvider{balance: big.NewInt(100000000)}
	ts := NewTreasuryService(repo, bp)
	ctx := context.Background()

	vault := "0x1111111111111111111111111111111111111111"
	intentID := "pi_treasury_test_1"

	// 1. Reserve $60 (60,000,000 base units)
	res, err := ts.ReserveFunds(ctx, "org_default", vault, intentID, "60000000")
	if err != nil {
		t.Fatalf("failed to reserve funds: %v", err)
	}
	if res.Status != domain.TreasuryReservationStatusReserved {
		t.Fatalf("expected RESERVED, got %s", res.Status)
	}

	// 2. Check Treasury Summary
	summary, err := ts.GetTreasurySummary(ctx, "org_default", vault)
	if err != nil {
		t.Fatalf("failed to get summary: %v", err)
	}
	if summary.OnChainBalance != "100000000" {
		t.Fatalf("expected on-chain balance 100000000, got %s", summary.OnChainBalance)
	}
	if summary.ReservedAmount != "60000000" {
		t.Fatalf("expected reserved amount 60000000, got %s", summary.ReservedAmount)
	}
	if summary.AvailableAmount != "40000000" {
		t.Fatalf("expected available amount 40000000, got %s", summary.AvailableAmount)
	}

	// 3. Attempt to reserve another $60 (should fail because only $40 is available)
	_, err = ts.ReserveFunds(ctx, "org_default", vault, "pi_treasury_test_2", "60000000")
	if err == nil {
		t.Fatal("expected error reserving more than available funds, got nil")
	}

	// 4. Settle first reservation
	err = ts.SettleFunds(ctx, intentID)
	if err != nil {
		t.Fatalf("failed to settle funds: %v", err)
	}

	// 5. Release an intent reservation test
	res2, err := ts.ReserveFunds(ctx, "org_default", vault, "pi_treasury_test_3", "20000000")
	if err != nil {
		t.Fatalf("failed to reserve for release test: %v", err)
	}
	err = ts.ReleaseFunds(ctx, "pi_treasury_test_3")
	if err != nil {
		t.Fatalf("failed to release funds: %v", err)
	}

	resCheck, _ := ts.GetReservationByIntent(ctx, "pi_treasury_test_3")
	if resCheck.Status != domain.TreasuryReservationStatusReleased {
		t.Fatalf("expected RELEASED, got %s", resCheck.Status)
	}
	_ = res2
}

func TestTreasury_ConcurrentReservations(t *testing.T) {
	repo := storage.NewMemoryRepository()
	// On-chain balance: $100.00
	bp := &mockBalanceProvider{balance: big.NewInt(100000000)}
	ts := NewTreasuryService(repo, bp)
	ctx := context.Background()

	vault := "0x1111111111111111111111111111111111111111"

	// 2 parallel intents each requesting $60
	var wg sync.WaitGroup
	wg.Add(2)

	var err1, err2 error
	go func() {
		defer wg.Done()
		_, err1 = ts.ReserveFunds(ctx, "org_default", vault, "intent_race_1", "60000000")
	}()

	go func() {
		defer wg.Done()
		_, err2 = ts.ReserveFunds(ctx, "org_default", vault, "intent_race_2", "60000000")
	}()

	wg.Wait()

	// Exactly one should succeed, and one should fail due to insufficient available balance
	successes := 0
	if err1 == nil {
		successes++
	}
	if err2 == nil {
		successes++
	}

	if successes != 1 {
		t.Fatalf("expected exactly 1 successful reservation, got %d (err1: %v, err2: %v)", successes, err1, err2)
	}
}
