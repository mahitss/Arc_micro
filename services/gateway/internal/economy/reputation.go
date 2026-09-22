package economy

import (
	"context"
	"fmt"
	"math/big"
	"sync"
	"time"
)

// ReputationManager manages organization-isolated and global economic performance records.
type ReputationManager struct {
	mu          sync.RWMutex
	reputations map[string]*ServiceReputation // key: orgID:serviceID
}

// NewReputationManager initializes the economic memory manager.
func NewReputationManager() *ReputationManager {
	return &ReputationManager{
		reputations: make(map[string]*ServiceReputation),
	}
}

func makeKey(orgID, serviceID string) string {
	if orgID == "" {
		orgID = "global"
	}
	return fmt.Sprintf("%s:%s", orgID, serviceID)
}

// GetReputation retrieves the isolated reputation for a service within an organization.
func (rm *ReputationManager) GetReputation(ctx context.Context, orgID, serviceID string) *ServiceReputation {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	key := makeKey(orgID, serviceID)
	if rep, ok := rm.reputations[key]; ok {
		copyRep := *rep
		return &copyRep
	}

	// Fallback to global baseline if no org-specific record exists yet
	globalKey := makeKey("global", serviceID)
	if rep, ok := rm.reputations[globalKey]; ok {
		copyRep := *rep
		return &copyRep
	}

	return &ServiceReputation{
		ServiceID:             serviceID,
		OrganizationID:        orgID,
		ReputationScore:       9500, // 95% default reputation
		HistoricalReliability: "100.0%",
		TotalVolumeSettled:    big.NewInt(0),
		AveragePrice:          big.NewInt(0),
		UpdatedAt:             time.Now().UTC(),
	}
}

// RecordOutcome updates the service reputation following an execution attempt.
func (rm *ReputationManager) RecordOutcome(
	ctx context.Context,
	orgID, serviceID string,
	success bool,
	settledAmount *big.Int,
	latencyMs int64,
) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	now := time.Now().UTC()
	key := makeKey(orgID, serviceID)

	rep, ok := rm.reputations[key]
	if !ok {
		rep = &ServiceReputation{
			ServiceID:          serviceID,
			OrganizationID:     orgID,
			TotalVolumeSettled: big.NewInt(0),
			AveragePrice:       big.NewInt(0),
		}
		rm.reputations[key] = rep
	}

	rep.TotalRequests++
	if latencyMs > 0 {
		if rep.AverageLatencyMs == 0 {
			rep.AverageLatencyMs = latencyMs
		} else {
			// Running moving average
			rep.AverageLatencyMs = (rep.AverageLatencyMs*7 + latencyMs*3) / 10
		}
	}

	if success {
		rep.SuccessfulRequests++
		rep.PaymentCount++
		rep.LastSuccessAt = &now

		if settledAmount != nil && settledAmount.Sign() > 0 {
			rep.TotalVolumeSettled.Add(rep.TotalVolumeSettled, settledAmount)
			if rep.PaymentCount > 0 {
				rep.AveragePrice = new(big.Int).Div(rep.TotalVolumeSettled, big.NewInt(int64(rep.PaymentCount)))
			}
		}
	} else {
		rep.FailedRequests++
		rep.LastFailureAt = &now
	}

	// Calculate Failure Rate in basis points (0 - 10000)
	if rep.TotalRequests > 0 {
		rep.FailureRateBps = int64((rep.FailedRequests * 10000) / rep.TotalRequests)
		successRate := float64(rep.SuccessfulRequests) / float64(rep.TotalRequests) * 100.0
		rep.HistoricalReliability = fmt.Sprintf("%.1f%%", successRate)

		// Dynamic reputation score: starts at 10,000, penalizes failures and latency
		repScore := int64(10000) - (rep.FailureRateBps * 2)
		if rep.AverageLatencyMs > 1000 {
			repScore -= (rep.AverageLatencyMs - 1000) * 2
		}
		if repScore < 0 {
			repScore = 0
		} else if repScore > 10000 {
			repScore = 10000
		}
		rep.ReputationScore = repScore
	}

	rep.UpdatedAt = now
}
