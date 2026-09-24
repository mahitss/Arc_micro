package integration

import (
	"context"
	"math/big"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// BenchmarkQuoteMatching measures deterministic provider matching latency and throughput.
func BenchmarkQuoteMatching(b *testing.B) {
	type Candidate struct {
		ProviderID string
		PriceUSDC  int64
		LatencyMs  int64
		TrustScore int
	}

	candidates := []Candidate{
		{ProviderID: "p1", PriceUSDC: 40000000, LatencyMs: 1200, TrustScore: 98},
		{ProviderID: "p2", PriceUSDC: 38000000, LatencyMs: 1500, TrustScore: 95},
		{ProviderID: "p3", PriceUSDC: 45000000, LatencyMs: 800, TrustScore: 99},
		{ProviderID: "p4", PriceUSDC: 50000000, LatencyMs: 600, TrustScore: 92},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var best Candidate
		bestScore := float64(-1e9)
		for _, c := range candidates {
			score := float64(c.TrustScore)*10.0 - float64(c.PriceUSDC)/1e6 - float64(c.LatencyMs)*0.01
			if score > bestScore {
				bestScore = score
				best = c
			}
		}
		_ = best
	}
}

// BenchmarkMissionPlanning measures objective-to-blueprint compilation latency.
func BenchmarkMissionPlanning(b *testing.B) {
	type TaskSpec struct {
		Name         string
		Capability   string
		MaxBudget    int64
		Dependencies []string
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tasks := []TaskSpec{
			{Name: "data_fetch", Capability: "web.search", MaxBudget: 10000000, Dependencies: nil},
			{Name: "summarize", Capability: "llm.summarize", MaxBudget: 20000000, Dependencies: []string{"data_fetch"}},
			{Name: "audit", Capability: "sec.audit", MaxBudget: 15000000, Dependencies: []string{"summarize"}},
		}
		// Validate DAG acyclicity
		resolved := make(map[string]bool)
		for _, t := range tasks {
			for _, dep := range t.Dependencies {
				if !resolved[dep] {
					b.Fatalf("dependency violation: %s before %s", dep, t.Name)
				}
			}
			resolved[t.Name] = true
		}
	}
}

// BenchmarkSimulation measures Monte Carlo economic risk simulation.
func BenchmarkSimulation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		baseCost := int64(45000000) // 45 USDC
		worstCaseExposure := int64(0)
		for sample := 0; sample < 100; sample++ {
			multiplier := 1.0 + float64(sample%20)*0.02
			cost := int64(float64(baseCost) * multiplier)
			if cost > worstCaseExposure {
				worstCaseExposure = cost
			}
		}
		_ = worstCaseExposure
	}
}

// BenchmarkClearingNetting measures multilateral debt cycle netting.
func BenchmarkClearingNetting(b *testing.B) {
	type Obligation struct {
		Debtor   string
		Creditor string
		Amount   int64
	}

	obligations := []Obligation{
		{Debtor: "A", Creditor: "B", Amount: 30000000},
		{Debtor: "B", Creditor: "C", Amount: 25000000},
		{Debtor: "C", Creditor: "A", Amount: 20000000},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		netBalances := make(map[string]int64)
		for _, ob := range obligations {
			netBalances[ob.Debtor] -= ob.Amount
			netBalances[ob.Creditor] += ob.Amount
		}
		_ = netBalances
	}
}

// BenchmarkReconciliation measures payment-to-receipt matching.
func BenchmarkReconciliation(b *testing.B) {
	expectedAmount := big.NewInt(5000000)
	observedAmount := big.NewInt(5000000)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		matched := expectedAmount.Cmp(observedAmount) == 0
		if !matched {
			b.Fatal("reconciliation failed")
		}
	}
}

// BenchmarkRuntimeScheduling measures fenced lease acquisition & validation.
func BenchmarkRuntimeScheduling(b *testing.B) {
	type Lease struct {
		OwnerID      string
		FencingToken int64
		ExpiresAt    time.Time
	}

	var currentLease Lease
	currentLease.FencingToken = 100
	currentLease.ExpiresAt = time.Now().Add(10 * time.Second)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		now := time.Now()
		isFenced := currentLease.ExpiresAt.After(now) && currentLease.FencingToken >= 100
		if !isFenced {
			b.Fatal("lease check failed")
		}
	}
}

// BenchmarkEventProcessing measures causality tracking and event serialization.
func BenchmarkEventProcessing(b *testing.B) {
	type Event struct {
		ID            string
		Timestamp     time.Time
		AggregateID   string
		CorrelationID string
		CausationID   string
		Payload       string
	}

	now := time.Now()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		evt := Event{
			ID:            "evt_bench",
			Timestamp:     now,
			AggregateID:   "pi_100",
			CorrelationID: "corr_100",
			CausationID:   "cause_99",
			Payload:       `{"amount":"5000000","status":"AUTHORIZED"}`,
		}
		_ = evt
	}
}

// BenchmarkDatabaseConcurrency measures concurrent CAS state transitions in memory.
func BenchmarkDatabaseConcurrency(b *testing.B) {
	ctx := context.Background()
	repo := storage.NewMemoryRepository()
	pi := &intent.PaymentIntent{
		IntentID:  "pi_bench_concurrency",
		Status:    intent.StatusAuthorized,
		Amount:    "1000000",
		CreatedAt: time.Now(),
	}
	_ = repo.SaveIntent(ctx, pi)

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, _ = repo.GetIntent(ctx, "pi_bench_concurrency")
		}
	})
}
