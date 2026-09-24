package treasury

import (
	"context"
	"fmt"
	"math/big"
	"time"
)

// AnomalyDetector inspects behavioral metrics for suspicious liquidity patterns.
type AnomalyDetector interface {
	DetectAnomalies(ctx context.Context, orgID string, mode ExecutionMode) ([]*LiquidityAnomaly, error)
}

// DefaultAnomalyDetector implements AnomalyDetector.
type DefaultAnomalyDetector struct {
	orchestrator Orchestrator
}

// NewAnomalyDetector creates a new DefaultAnomalyDetector.
func NewAnomalyDetector(orch Orchestrator) *DefaultAnomalyDetector {
	return &DefaultAnomalyDetector{
		orchestrator: orch,
	}
}

// DetectAnomalies inspects real-time reservations, commitments, and health metrics to flag risks.
func (d *DefaultAnomalyDetector) DetectAnomalies(ctx context.Context, orgID string, mode ExecutionMode) ([]*LiquidityAnomaly, error) {
	state, err := d.orchestrator.GetTreasuryState(ctx, orgID, mode)
	if err != nil {
		return nil, err
	}

	reservations, err := d.orchestrator.ListReservations(ctx, orgID, mode, "")
	if err != nil {
		return nil, err
	}

	var anomalies []*LiquidityAnomaly
	now := time.Now()

	// 1. Agent & Provider Concentration Tracking
	agentSpend := make(map[string]*big.Int)
	totalReserved := big.NewInt(0)
	cancellationCount := 0

	for _, res := range reservations {
		amt, _ := ParseBigInt(res.Amount)
		if res.Status == ReservationReserved {
			totalReserved.Add(totalReserved, amt)
			if res.AgentID != "" {
				if _, ok := agentSpend[res.AgentID]; !ok {
					agentSpend[res.AgentID] = big.NewInt(0)
				}
				agentSpend[res.AgentID].Add(agentSpend[res.AgentID], amt)
			}
		} else if res.Status == ReservationCancelled || res.Status == ReservationExpired {
			cancellationCount++
		}
	}

	// Check if any single agent holds > 50% of all active reservations
	if totalReserved.Sign() > 0 {
		halfReserved := new(big.Int).Div(totalReserved, big.NewInt(2))
		for agentID, spend := range agentSpend {
			if spend.Cmp(halfReserved) > 0 {
				anomalies = append(anomalies, &LiquidityAnomaly{
					AnomalyID:      "anom_" + generateID("an_"),
					OrganizationID: orgID,
					Type:           "AGENT_CONCENTRATION",
					Severity:       "HIGH",
					AffectedScope:  agentID,
					Evidence:       fmt.Sprintf("Agent %s consumes %s micro-USDC (>50%% of total reserved %s)", agentID, spend.String(), totalReserved.String()),
					DetectedAt:     now,
					Status:         "OPEN",
				})
			}
		}
	}

	// 2. High Cancellation / Flapping Rate
	if len(reservations) >= 5 {
		cancelRatio := float64(cancellationCount) / float64(len(reservations))
		if cancelRatio >= 0.40 {
			anomalies = append(anomalies, &LiquidityAnomaly{
				AnomalyID:      "anom_" + generateID("an_"),
				OrganizationID: orgID,
				Type:           "HIGH_CANCELLATION_RATE",
				Severity:       "MEDIUM",
				AffectedScope:  orgID,
				Evidence:       fmt.Sprintf("%.1f%% of reservations have been cancelled or expired (%d of %d)", cancelRatio*100, cancellationCount, len(reservations)),
				DetectedAt:     now,
				Status:         "OPEN",
			})
		}
	}

	
	if state.OperationalMode == OperationalModeEmergency {
		anomalies = append(anomalies, &LiquidityAnomaly{
			AnomalyID:      "anom_" + generateID("an_"),
			OrganizationID: orgID,
			Type:           "EMERGENCY_MODE_ACTIVE",
			Severity:       "CRITICAL",
			AffectedScope:  orgID,
			Evidence:       "Treasury operational mode is set to EMERGENCY; autonomous commitments halted",
			DetectedAt:     now,
			Status:         "OPEN",
		})
	}

	return anomalies, nil
}
