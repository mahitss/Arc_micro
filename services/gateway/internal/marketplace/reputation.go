package marketplace

import (
	"fmt"
	"math"
	"time"
)

// ReputationEvaluator provides empirical, sample-aware reputation scoring and anomaly detection.
type ReputationEvaluator struct{}

func NewReputationEvaluator() *ReputationEvaluator {
	return &ReputationEvaluator{}
}

// ComputeContextualMetrics updates metrics with a newly observed outcome.
func (r *ReputationEvaluator) ComputeContextualMetrics(
	current *MarketplaceMetrics,
	durationMS int,
	succeeded bool,
	timedOut bool,
	quoteAccurate bool,
	resultAccepted bool,
	disputed bool,
	observedAt time.Time,
) *MarketplaceMetrics {
	if current == nil {
		current = &MarketplaceMetrics{
			SampleSize:           0,
			CompletionRate:       1.0,
			FailureRate:          0.0,
			TimeoutRate:          0.0,
			AvgDurationMS:        durationMS,
			P50DurationMS:        durationMS,
			P95DurationMS:        durationMS,
			QuoteAccuracy:        1.0,
			ResultAcceptanceRate: 1.0,
			DisputeRate:          0.0,
			CancellationRate:     0.0,
		}
	}

	n := float64(current.SampleSize)
	newN := n + 1.0

	// Incremental updates
	if succeeded {
		current.CompletionRate = (current.CompletionRate*n + 1.0) / newN
	} else {
		current.CompletionRate = (current.CompletionRate * n) / newN
		current.FailureRate = (current.FailureRate*n + 1.0) / newN
	}

	if timedOut {
		current.TimeoutRate = (current.TimeoutRate*n + 1.0) / newN
	} else {
		current.TimeoutRate = (current.TimeoutRate * n) / newN
	}

	if quoteAccurate {
		current.QuoteAccuracy = (current.QuoteAccuracy*n + 1.0) / newN
	} else {
		current.QuoteAccuracy = (current.QuoteAccuracy * n) / newN
	}

	if resultAccepted {
		current.ResultAcceptanceRate = (current.ResultAcceptanceRate*n + 1.0) / newN
	} else {
		current.ResultAcceptanceRate = (current.ResultAcceptanceRate * n) / newN
	}

	if disputed {
		current.DisputeRate = (current.DisputeRate*n + 1.0) / newN
	} else {
		current.DisputeRate = (current.DisputeRate * n) / newN
	}

	current.AvgDurationMS = int((float64(current.AvgDurationMS)*n + float64(durationMS)) / newN)
	current.P50DurationMS = current.AvgDurationMS
	current.P95DurationMS = int(float64(current.AvgDurationMS) * 1.35)
	current.SampleSize = int(newN)
	current.UpdatedAt = observedAt

	return current
}

// CheckSybilAndWashAnomalies checks for repetitive low-value wash jobs or self-dealing patterns.
func (r *ReputationEvaluator) CheckSybilAndWashAnomalies(
	tenantID string,
	providerID string,
	requesterID string,
	jobCountInLastHour int,
	avgJobValueUSDC float64,
) *MarketplaceAnomaly {
	// 1. Self-dealing check
	if providerID == requesterID {
		return &MarketplaceAnomaly{
			AnomalyID:       fmt.Sprintf("anom_self_%d", time.Now().UnixNano()),
			TenantID:        tenantID,
			ProviderAgentID: providerID,
			AnomalyType:     "SELF_DEALING",
			Severity:        "HIGH",
			Description:     "Provider and requester agent IDs are identical; self-dealing is prohibited",
			Evidence: map[string]interface{}{
				"provider_id":  providerID,
				"requester_id": requesterID,
			},
			CreatedAt: time.Now().UTC(),
		}
	}

	// 2. High-frequency micro-transaction wash trading pattern
	if jobCountInLastHour > 50 && avgJobValueUSDC < 0.10 {
		return &MarketplaceAnomaly{
			AnomalyID:       fmt.Sprintf("anom_wash_%d", time.Now().UnixNano()),
			TenantID:        tenantID,
			ProviderAgentID: providerID,
			AnomalyType:     "WASH_TRANSACTION_SUSPECT",
			Severity:        "MEDIUM",
			Description:     "High velocity of sub-$0.10 micro-contracts detected; metric inflation flag",
			Evidence: map[string]interface{}{
				"job_count_last_hour": jobCountInLastHour,
				"avg_job_value_usdc":  avgJobValueUSDC,
			},
			CreatedAt: time.Now().UTC(),
		}
	}

	return nil
}

// EvaluateCounterpartyConcentration checks what percentage of workload or exposure is held by a single provider.
func (r *ReputationEvaluator) EvaluateCounterpartyConcentration(
	providerExposureUSDC float64,
	totalMarketplaceExposureUSDC float64,
	concentrationThreshold float64,
) (isConcentrated bool, ratio float64) {
	if totalMarketplaceExposureUSDC <= 0 {
		return false, 0.0
	}
	ratio = providerExposureUSDC / totalMarketplaceExposureUSDC
	if concentrationThreshold <= 0 {
		concentrationThreshold = 0.50 // 50% default warning threshold
	}
	return ratio > concentrationThreshold, math.Round(ratio*100) / 100
}
