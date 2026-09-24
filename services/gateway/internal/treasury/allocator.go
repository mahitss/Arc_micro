package treasury

import (
	"context"
	"fmt"
	"math/big"
	"sort"
	"time"
)

// Allocator calculates fair and explainable liquidity allocations without executing payments.
type Allocator interface {
	ProposeAllocation(ctx context.Context, orgID string, candidates []*AllocationCandidate, mode ExecutionMode) (*LiquidityAllocationProposal, error)
}

// DefaultLiquidityAllocator implements Allocator.
type DefaultLiquidityAllocator struct {
	orchestrator Orchestrator
}

// NewLiquidityAllocator creates a new DefaultLiquidityAllocator.
func NewLiquidityAllocator(orch Orchestrator) *DefaultLiquidityAllocator {
	return &DefaultLiquidityAllocator{
		orchestrator: orch,
	}
}

// ProposeAllocation ranks candidates across priority and fairness dimensions, allocating capacity up to safe bounds.
func (a *DefaultLiquidityAllocator) ProposeAllocation(ctx context.Context, orgID string, candidates []*AllocationCandidate, mode ExecutionMode) (*LiquidityAllocationProposal, error) {
	envelope, err := a.orchestrator.GetLiquidityEnvelope(ctx, orgID, ScopeOrganization, orgID, mode)
	if err != nil {
		return nil, err
	}

	safeCap, _ := ParseBigInt(envelope.SafeCommitmentCapacity)
	remainingCap := new(big.Int).Set(safeCap)

	// 1. Calculate Priority Scores with Starvation Prevention
	now := time.Now()
	for _, c := range candidates {
		baseScore := 50.0 // baseline

		// Deadline urgency
		if !c.Deadline.IsZero() {
			timeUntilDeadline := c.Deadline.Sub(now)
			if timeUntilDeadline <= 1*time.Hour {
				baseScore += 30.0
			} else if timeUntilDeadline <= 6*time.Hour {
				baseScore += 20.0
			} else if timeUntilDeadline <= 24*time.Hour {
				baseScore += 10.0
			}
		}

		// Critical path in mission DAG
		if c.CriticalPath {
			baseScore += 25.0
		}

		// Verified deliverable milestone gets high priority
		if c.IsMilestone {
			baseScore += 20.0
		}

		// Starvation boost: Anti-starvation mechanism
		if c.DeferralCount > 0 {
			// +10 points per previous deferral to prevent permanent queue stalling
			baseScore += float64(c.DeferralCount * 10)
		}
		if c.WaitDuration > 2*time.Hour {
			baseScore += 15.0
		}

		c.PriorityScore = baseScore
	}

	// 2. Sort Candidates Descending by Priority Score
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].PriorityScore > candidates[j].PriorityScore
	})

	var approved []*AllocationCandidate
	var deferred []*AllocationCandidate
	totalApproved := big.NewInt(0)
	totalDeferred := big.NewInt(0)
	var explanations []string

	for _, c := range candidates {
		reqAmt, err := ParseBigInt(c.Amount)
		if err != nil {
			continue
		}

		if reqAmt.Cmp(remainingCap) <= 0 {
			// Allocate capacity
			approved = append(approved, c)
			remainingCap.Sub(remainingCap, reqAmt)
			totalApproved.Add(totalApproved, reqAmt)
			explanations = append(explanations, fmt.Sprintf("Candidate %s approved for %s micro-USDC (Priority: %.1f)", c.CandidateID, c.Amount, c.PriorityScore))
		} else {
			// Defer candidate
			c.DeferralCount++
			deferred = append(deferred, c)
			totalDeferred.Add(totalDeferred, reqAmt)
			explanations = append(explanations, fmt.Sprintf("Candidate %s deferred (requires %s, only %s safe capacity remaining)", c.CandidateID, c.Amount, remainingCap.String()))
		}
	}

	proposalID := "prop_" + generateID("pr_")
	return &LiquidityAllocationProposal{
		ProposalID:          proposalID,
		OrganizationID:      orgID,
		ApprovedCandidates:  approved,
		DeferredCandidates:  deferred,
		TotalApprovedAmount: totalApproved.String(),
		TotalDeferredAmount: totalDeferred.String(),
		RemainingBuffer:     envelope.MinimumBuffer,
		Explanation:         explanations,
		RequiresHumanReview: len(deferred) > 0,
		CreatedAt:           now,
	}, nil
}
