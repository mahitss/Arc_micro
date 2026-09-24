package treasury_test

import (
	"context"
	"fmt"
	"math/big"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
)

func TestConcurrency_50ParallelReservations_NeverOversubscribe(t *testing.T) {
	orch := treasury.NewLiquidityOrchestrator()
	ctx := context.Background()

	// Initial treasury setup:
	// Set TotalBalance = 100 USDC (100,000,000 base units)
	// MinimumBuffer = 0 so that exactly 100 USDC is available
	err := orch.SetBufferPolicy(ctx, &treasury.LiquidityBufferPolicy{
		OrganizationID:  "org_concurrent",
		Scope:           treasury.ScopeOrganization,
		ScopeID:         "org_concurrent",
		MinimumAbsolute: "0",
		Currency:        "USDC",
	})
	if err != nil {
		t.Fatalf("failed to set buffer: %v", err)
	}

	// Set total balance to exactly 100 USDC and 0 buffer for this test
	_ = orch.SetTreasuryBalance(ctx, "org_concurrent", treasury.ModeReal, "100000000", "0")

	// 50 concurrent reservation requests of 5 USDC each (5,000,000 base units)
	// Total requested = 50 * 5 = 250 USDC.
	// Available = 100 USDC.
	// Maximum allowed successes = 20.
	var successfulCount int64 = 0
	var rejectedCount int64 = 0
	var wg sync.WaitGroup

	reqCount := 50
	wg.Add(reqCount)

	for i := 0; i < reqCount; i++ {
		go func(idx int) {
			defer wg.Done()
			req := &treasury.LiquidityReservationRequest{
				OrganizationID: "org_concurrent",
				Source:         "MISSION",
				MissionID:      fmt.Sprintf("msn_conc_%d", idx),
				AmountBase:     "5000000", // $5.00 USDC
				Currency:       "USDC",
				Mode:           treasury.ModeReal,
				TimeoutSeconds: 3600,
			}

			_, err := orch.ReserveLiquidityAtomic(ctx, req)
			if err == nil {
				atomic.AddInt64(&successfulCount, 1)
			} else {
				atomic.AddInt64(&rejectedCount, 1)
			}
		}(i)
	}

	wg.Wait()

	if successfulCount > 20 {
		t.Fatalf("INV-73 VIOLATION: Oversubscription occurred! Expected at most 20 successful reservations, got %d", successfulCount)
	}

	if successfulCount+rejectedCount != int64(reqCount) {
		t.Fatalf("expected sum of successes and rejections to equal %d, got %d", reqCount, successfulCount+rejectedCount)
	}

	// Verify the final reserved balance strictly equals successfulCount * 5 USDC
	endState, _ := orch.GetTreasuryState(ctx, "org_concurrent", treasury.ModeReal)
	reserved, _ := treasury.ParseBigInt(endState.ReservedBalance)
	expectedReserved := new(big.Int).Mul(big.NewInt(successfulCount), big.NewInt(5000000))

	if reserved.Cmp(expectedReserved) != 0 {
		t.Errorf("expected reserved balance %s, got %s", expectedReserved.String(), reserved.String())
	}

	// Verify remaining available balance does not go negative
	avail, _ := treasury.ParseBigInt(endState.AvailableBalance)
	if avail.Sign() < 0 {
		t.Errorf("INV-72 VIOLATION: Available balance went negative: %s", avail.String())
	}
}

func TestConcurrency_SimultaneousReleaseAndReservation(t *testing.T) {
	orch := treasury.NewLiquidityOrchestrator()
	ctx := context.Background()

	// Initial reserve
	res1, err := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
		OrganizationID: "org_rel_test",
		Source:         "INTENT",
		AmountBase:     "50000000", // $50 USDC
		Currency:       "USDC",
		Mode:           treasury.ModeReal,
		TimeoutSeconds: 3600,
	})
	if err != nil {
		t.Fatalf("initial reservation failed: %v", err)
	}

	var wg sync.WaitGroup
	wg.Add(2)

	// Goroutine 1: Release res1
	go func() {
		defer wg.Done()
		_ = orch.ReleaseLiquidityReservation(ctx, res1.ReservationID, "Task completed")
	}()

	// Goroutine 2: Try to reserve 50 USDC
	var res2Success bool
	go func() {
		defer wg.Done()
		_, err := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
			OrganizationID: "org_rel_test",
			Source:         "INTENT",
			AmountBase:     "50000000",
			Currency:       "USDC",
			Mode:           treasury.ModeReal,
			TimeoutSeconds: 3600,
		})
		if err == nil {
			res2Success = true
		}
	}()

	wg.Wait()

	// Ensure internal balance remains non-negative and properly reconciled
	state, err := orch.GetTreasuryState(ctx, "org_rel_test", treasury.ModeReal)
	if err != nil {
		t.Fatalf("failed to get state: %v", err)
	}
	avail, _ := treasury.ParseBigInt(state.AvailableBalance)
	if avail.Sign() < 0 {
		t.Errorf("available balance went negative: %s (res2Success: %v)", avail.String(), res2Success)
	}
}

func TestConcurrency_ReservationAndConsumption(t *testing.T) {
	orch := treasury.NewLiquidityOrchestrator()
	ctx := context.Background()

	res, err := orch.ReserveLiquidityAtomic(ctx, &treasury.LiquidityReservationRequest{
		OrganizationID: "org_consume",
		Source:         "INTENT",
		AmountBase:     "20000000",
		Currency:       "USDC",
		Mode:           treasury.ModeReal,
		TimeoutSeconds: 3600,
	})
	if err != nil {
		t.Fatalf("reservation failed: %v", err)
	}

	err = orch.ConsumeLiquidityReservation(ctx, res.ReservationID)
	if err != nil {
		t.Fatalf("consumption failed: %v", err)
	}

	// Verify consumed reservation cannot be consumed a second time
	err2 := orch.ConsumeLiquidityReservation(ctx, res.ReservationID)
	if err2 == nil {
		t.Errorf("expected error consuming already-consumed reservation")
	}
}
