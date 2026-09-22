package economy

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"sync"
	"time"
)

// AnomalyDetector analyzes historical service performance baselines and identifies divergence.
// INVARIANT: Anomaly signals are advisory. They inform ranking and human escalation without bypassing policy.
type AnomalyDetector struct {
	mu       sync.RWMutex
	memStore *EconomicMemoryStore
	signals  map[string][]*AnomalySignal // key: orgID:serviceID
}

// NewAnomalyDetector constructs a new AnomalyDetector linked to the economic memory store.
func NewAnomalyDetector(memStore *EconomicMemoryStore) *AnomalyDetector {
	return &AnomalyDetector{
		memStore: memStore,
		signals:  make(map[string][]*AnomalySignal),
	}
}

func generateSignalID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("anom_%s", hex.EncodeToString(b))
}

// DetectAnomalies inspects recent interactions against the historical baseline for a service.
func (d *AnomalyDetector) DetectAnomalies(ctx context.Context, orgID, serviceID string) ([]*AnomalySignal, CircuitBreakerStatus) {
	d.mu.Lock()
	defer d.mu.Unlock()

	allTimePerf := d.memStore.CalculatePerformance(ctx, orgID, serviceID, WindowAllTime)
	recentPerf := d.memStore.CalculatePerformance(ctx, orgID, serviceID, WindowLast10Jobs)

	detected := make([]*AnomalySignal, 0)
	now := time.Now().UTC()

	// 1. Minimum sample threshold for statistical significance
	if allTimePerf.TotalJobs < 3 {
		return detected, CircuitBreakerHealthy
	}

	// 2. Price Anomaly Detection: Current quote or recent avg > 200% of historical average
	if allTimePerf.AveragePrice.Sign() > 0 && recentPerf.AveragePrice.Sign() > 0 {
		ratio := new(big.Int).Mul(recentPerf.AveragePrice, big.NewInt(100))
		ratio.Div(ratio, allTimePerf.AveragePrice)
		if ratio.Int64() >= 200 { // 200% of baseline
			sig := &AnomalySignal{
				ID:             generateSignalID(),
				ServiceID:      serviceID,
				OrganizationID: orgID,
				AnomalyType:    AnomalyPriceAnomaly,
				Severity:       "HIGH",
				BaselineValue:  fmt.Sprintf("%s micro-USDC", allTimePerf.AveragePrice.String()),
				ObservedValue:  fmt.Sprintf("%s micro-USDC (%d%%)", recentPerf.AveragePrice.String(), ratio.Int64()),
				Details:        "Recent average price surged to more than double historical baseline",
				DetectedAt:     now,
			}
			detected = append(detected, sig)
		}
	}

	// 3. Latency Anomaly Detection: Recent latency > 250% of historical average
	if allTimePerf.AverageLatencyMs > 0 && recentPerf.AverageLatencyMs > 0 {
		latRatio := (recentPerf.AverageLatencyMs * 100) / allTimePerf.AverageLatencyMs
		if latRatio >= 250 {
			sig := &AnomalySignal{
				ID:             generateSignalID(),
				ServiceID:      serviceID,
				OrganizationID: orgID,
				AnomalyType:    AnomalyLatencyAnomaly,
				Severity:       "MEDIUM",
				BaselineValue:  fmt.Sprintf("%dms", allTimePerf.AverageLatencyMs),
				ObservedValue:  fmt.Sprintf("%dms (%d%%)", recentPerf.AverageLatencyMs, latRatio),
				Details:        "Recent service latency significantly exceeds historical baseline",
				DetectedAt:     now,
			}
			detected = append(detected, sig)
		}
	}

	// 4. Failure Rate Spike Detection
	// Inspect recent observations to check consecutive failures
	recentObs := d.memStore.GetObservationsByService(ctx, orgID, serviceID)
	consecutiveFailures := 0
	for i := len(recentObs) - 1; i >= 0 && consecutiveFailures < 10; i-- {
		if !recentObs[i].Success {
			consecutiveFailures++
		} else {
			break
		}
	}

	if consecutiveFailures >= 3 || (allTimePerf.FailureRateBps < 3000 && recentPerf.RecentFailureRateBps >= 4000) || (recentPerf.RecentFailureRateBps >= allTimePerf.FailureRateBps+3000) {
		sig := &AnomalySignal{
			ID:             generateSignalID(),
			ServiceID:      serviceID,
			OrganizationID: orgID,
			AnomalyType:    AnomalyFailureSpike,
			Severity:       "CRITICAL",
			BaselineValue:  fmt.Sprintf("%d bps", allTimePerf.FailureRateBps),
			ObservedValue:  fmt.Sprintf("%d bps (consecutive: %d)", recentPerf.RecentFailureRateBps, consecutiveFailures),
			Details:        "Sudden spike in service failure rate detected",
			DetectedAt:     now,
		}
		detected = append(detected, sig)
	}

	// 5. Quality Drop Detection: Recent quality drop >= 3000 bps (30%)
	if allTimePerf.ResultQualityBps > recentPerf.ResultQualityBps+3000 {
		sig := &AnomalySignal{
			ID:             generateSignalID(),
			ServiceID:      serviceID,
			OrganizationID: orgID,
			AnomalyType:    AnomalyQualityDrop,
			Severity:       "MEDIUM",
			BaselineValue:  fmt.Sprintf("%d bps", allTimePerf.ResultQualityBps),
			ObservedValue:  fmt.Sprintf("%d bps", recentPerf.ResultQualityBps),
			Details:        "Observed quality drop compared to historical baseline",
			DetectedAt:     now,
		}
		detected = append(detected, sig)
	}

	// 6. Circuit Breaker Evaluation
	cbStatus := CircuitBreakerHealthy
	if consecutiveFailures >= 5 || recentPerf.RecentFailureRateBps >= 8000 {
		cbStatus = CircuitBreakerTemporarilyUnavailable
	} else if consecutiveFailures >= 3 || recentPerf.RecentFailureRateBps >= 5000 {
		cbStatus = CircuitBreakerDegraded
	}

	key := memKey(orgID, serviceID)
	d.signals[key] = detected

	return detected, cbStatus
}

// GetSignals retrieves cached or fresh anomaly signals for a service.
func (d *AnomalyDetector) GetSignals(ctx context.Context, orgID, serviceID string) []*AnomalySignal {
	d.mu.RLock()
	defer d.mu.RUnlock()
	key := memKey(orgID, serviceID)
	return d.signals[key]
}
