package operations

import (
	"math"
)

// PriorityEngine computes deterministic, bounded operational priority scores.
// Note: Priority NEVER bypasses or modifies financial controls (INV-122).
type PriorityEngine struct{}

// NewPriorityEngine creates an instance of PriorityEngine.
func NewPriorityEngine() *PriorityEngine {
	return &PriorityEngine{}
}

// CalculatePriority computes a deterministic priority score between 0 and 1000.
func (p *PriorityEngine) CalculatePriority(factors PriorityFactors) int {
	score := 100.0 // Base priority

	// 1. Deadline proximity weighting (up to +300 points)
	// Closer deadline = higher operational priority to avoid expiration.
	if factors.DeadlineProximitySeconds > 0 {
		if factors.DeadlineProximitySeconds < 300 { // Under 5 minutes
			score += 300.0
		} else if factors.DeadlineProximitySeconds < 1800 { // Under 30 minutes
			score += 200.0
		} else if factors.DeadlineProximitySeconds < 3600 { // Under 1 hour
			score += 100.0
		}
	}

	// 2. Dependency criticality (up to +200 points)
	// Workflows unblocking multiple downstream tasks are prioritized.
	depPoints := float64(factors.DependencyCriticality) * 40.0
	if depPoints > 200.0 {
		depPoints = 200.0
	}
	score += depPoints

	// 3. Workflow age / starvation prevention (up to +200 points)
	// Older waiting workflows gain priority gradually to prevent starvation.
	agePoints := math.Log1p(float64(factors.WorkflowAgeSeconds)) * 25.0
	if agePoints > 200.0 {
		agePoints = 200.0
	}
	score += agePoints

	// 4. Failure recovery boost (+150 points)
	// Restoring crashed or recovering workflows is prioritized to clear leased resources.
	if factors.IsRecovery {
		score += 150.0
	}

	// 5. Tenant priority tier (up to +100 points)
	tierPoints := float64(factors.TenantPriorityTier) * 25.0
	if tierPoints > 100.0 {
		tierPoints = 100.0
	}
	score += tierPoints

	// 6. Resource availability scaling
	if factors.ResourceAvailability > 0 && factors.ResourceAvailability <= 1.0 {
		score *= factors.ResourceAvailability
	}

	// Bound final score between 0 and 1000
	finalScore := int(math.Round(score))
	if finalScore < 0 {
		return 0
	}
	if finalScore > 1000 {
		return 1000
	}
	return finalScore
}
