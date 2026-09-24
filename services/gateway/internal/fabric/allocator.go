package fabric

import (
	"context"
	"fmt"
)

// ResourceAllocationRequest specifies requested compute and concurrency
type ResourceAllocationRequest struct {
	ObjectiveID          string
	TenantID             string
	RequestedWorkers     int
	RequestedParallelism int
	RequestedProviderCalls int
}

// ResourceAllocationResult provides granted operational allocation
type ResourceAllocationResult struct {
	AllocatedWorkers     int
	AllocatedParallelism int
	AllocatedCalls       int
	GrantsFinancialAuthority bool
}

// ResourceAllocator manages operational resource distribution
type ResourceAllocator struct{}

// NewResourceAllocator creates a new allocator instance
func NewResourceAllocator() *ResourceAllocator {
	return &ResourceAllocator{}
}

// Allocate bounds operational compute within the ResourceEnvelope
func (a *ResourceAllocator) Allocate(ctx context.Context, env ResourceEnvelope, req ResourceAllocationRequest) (*ResourceAllocationResult, error) {
	workers := req.RequestedWorkers
	if workers > env.MaxWorkers {
		workers = env.MaxWorkers
	}
	if workers <= 0 {
		workers = 1
	}

	parallelism := req.RequestedParallelism
	if parallelism > env.MaxParallelTasks {
		parallelism = env.MaxParallelTasks
	}
	if parallelism <= 0 {
		parallelism = 1
	}

	calls := req.RequestedProviderCalls
	if calls > env.MaxProviderCalls {
		calls = env.MaxProviderCalls
	}

	result := &ResourceAllocationResult{
		AllocatedWorkers:     workers,
		AllocatedParallelism: parallelism,
		AllocatedCalls:       calls,
		GrantsFinancialAuthority: false, // Invariant INV-150: Never grants financial authority
	}

	// Machine-check INV-150
	if err := ValidateINV150(&env, result.GrantsFinancialAuthority); err != nil {
		return nil, fmt.Errorf("resource allocator invariant failure: %w", err)
	}

	return result, nil
}
