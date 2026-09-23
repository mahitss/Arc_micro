package network

import (
	"errors"
	"math"
	"time"
)

var (
	ErrNilTrustProfile = errors.New("trust profile cannot be nil")
)

// TrustEvaluator computes deterministic, explainable trust scores from empirical signals.
// INVARIANT: No LLM is involved in evaluating trust. Calculations are 100% mathematical and explainable.
type TrustEvaluator struct{}

// NewTrustEvaluator creates a new TrustEvaluator.
func NewTrustEvaluator() *TrustEvaluator {
	return &TrustEvaluator{}
}

// Evaluate calculates the deterministic trust score (0 - 10000 basis points) for an agent.
func (e *TrustEvaluator) Evaluate(profile *AgentTrustProfile) (*TrustEvaluation, error) {
	if profile == nil {
		return nil, ErrNilTrustProfile
	}

	signals := make([]TrustSignal, 0, 5)
	var warnings []string

	totalJobs := profile.SuccessfulJobs + profile.FailedJobs
	var rawScore float64 = 5000 // Base baseline score for new agents (50.00%)
	confidence := 0.2           // Baseline low confidence

	if totalJobs > 0 {
		// Sample size confidence scaling (approaches 1.0 at 50+ jobs)
		confidence = math.Min(1.0, 0.2+0.8*(float64(totalJobs)/50.0))

		// 1. Completion Rate (Weight: 30%)
		completionRate := float64(profile.SuccessfulJobs) / float64(totalJobs)
		impactCompletion := int64((completionRate - 0.5) * 3000)
		signals = append(signals, TrustSignal{
			Signal:      "completion_rate",
			Value:       completionRate,
			Weight:      0.30,
			Impact:      impactCompletion,
			Explanation: "Ratio of successfully delivered tasks to total assigned tasks",
		})

		// 2. Verification Success Rate (Weight: 25%)
		totalVerifications := profile.VerificationSuccesses + profile.VerificationFailures
		var verificationRate float64 = 1.0
		if totalVerifications > 0 {
			verificationRate = float64(profile.VerificationSuccesses) / float64(totalVerifications)
		}
		impactVerification := int64((verificationRate - 0.5) * 2500)
		signals = append(signals, TrustSignal{
			Signal:      "verification_success_rate",
			Value:       verificationRate,
			Weight:      0.25,
			Impact:      impactVerification,
			Explanation: "Percentage of deliverables that passed cryptographic & schema verification",
		})

		// 3. Dispute-Free Rate (Weight: 20%)
		disputeRate := float64(profile.DisputeCount) / float64(totalJobs)
		disputeFreeRate := math.Max(0.0, 1.0-disputeRate)
		impactDispute := int64((disputeFreeRate - 0.8) * 2000)
		signals = append(signals, TrustSignal{
			Signal:      "dispute_free_rate",
			Value:       disputeFreeRate,
			Weight:      0.20,
			Impact:      impactDispute,
			Explanation: "Inverse proportion of jobs resulting in formal counterparty disputes",
		})

		// 4. Historical Cost Accuracy (Weight: 15%)
		totalCostQuotes := profile.HistoricalCostAccurate + profile.HistoricalCostDeviated
		var costAccuracy float64 = 1.0
		if totalCostQuotes > 0 {
			costAccuracy = float64(profile.HistoricalCostAccurate) / float64(totalCostQuotes)
		}
		impactCost := int64((costAccuracy - 0.5) * 1500)
		signals = append(signals, TrustSignal{
			Signal:      "cost_accuracy",
			Value:       costAccuracy,
			Weight:      0.15,
			Impact:      impactCost,
			Explanation: "Alignment between quoted execution price and final claimed settlement price",
		})

		// 5. Latency Reliability (Weight: 10%)
		// Normalizes average latency (under 3000ms = good, over 10000ms = penalized)
		var latencyScore float64 = 1.0
		if profile.AverageLatencyMs > 3000 {
			excess := float64(profile.AverageLatencyMs - 3000)
			latencyScore = math.Max(0.0, 1.0-(excess/7000.0))
		}
		impactLatency := int64((latencyScore - 0.5) * 1000)
		signals = append(signals, TrustSignal{
			Signal:      "latency_reliability",
			Value:       latencyScore,
			Weight:      0.10,
			Impact:      impactLatency,
			Explanation: "Responsiveness and adherence to expected capability execution deadlines",
		})

		// Compute weighted aggregate
		rawScore = (completionRate * 3000) +
			(verificationRate * 2500) +
			(disputeFreeRate * 2000) +
			(costAccuracy * 1500) +
			(latencyScore * 1000)
	} else {
		signals = append(signals, TrustSignal{
			Signal:      "cold_start",
			Value:       0.5,
			Weight:      1.0,
			Impact:      0,
			Explanation: "New agent without historical interactions; initialized with baseline score",
		})
		warnings = append(warnings, "COLD_START: Limited interaction history; evaluate with standard verification")
	}

	// Apply Hard Security Penalties
	if profile.PolicyViolationsCount > 0 {
		penalty := int64(profile.PolicyViolationsCount * 2500)
		rawScore -= float64(penalty)
		warnings = append(warnings, "POLICY_VIOLATIONS_DETECTED: Agent previously triggered deterministic policy rejections")
	}
	if profile.SecurityIncidentsCount > 0 {
		penalty := int64(profile.SecurityIncidentsCount * 5000)
		rawScore -= float64(penalty)
		warnings = append(warnings, "SECURITY_INCIDENT_FLAG: Agent flagged for suspicious prompt injection or payload tampering")
	}

	// Clamp final score between 0 and 10,000 basis points
	finalScore := int64(math.Round(rawScore))
	if finalScore < 0 {
		finalScore = 0
	}
	if finalScore > 10000 {
		finalScore = 10000
	}

	return &TrustEvaluation{
		AgentID:     profile.AgentID,
		TrustScore:  finalScore,
		Confidence:  math.Round(confidence*100) / 100,
		Signals:     signals,
		Warnings:    warnings,
		EvaluatedAt: time.Now().UTC(),
	}, nil
}
