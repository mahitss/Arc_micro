package operations

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

var (
	ErrPlanNotFound      = errors.New("operation plan not found")
	ErrPlanAlreadyActive = errors.New("active plan already exists for workflow")
)

// PlanManager handles operation plan creation, versioning, and structural diffing.
type PlanManager struct {
	mu    sync.RWMutex
	plans map[string][]*OperationPlan // keyed by workflow_id
	diffs map[string][]*OperationPlanDiff
}

// NewPlanManager creates an instance of PlanManager.
func NewPlanManager() *PlanManager {
	return &PlanManager{
		plans: make(map[string][]*OperationPlan),
		diffs: make(map[string][]*OperationPlanDiff),
	}
}

// CreatePlan initializes version 1 of an operation plan for a workflow.
func (pm *PlanManager) CreatePlan(
	tenantID string,
	workflowID string,
	steps []PlanStep,
	deps map[string][]string,
) (*OperationPlan, error) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	now := time.Now().UTC()
	plan := &OperationPlan{
		PlanID:       "plan_" + uuid.NewString()[:8],
		TenantID:     tenantID,
		WorkflowID:   workflowID,
		PlanVersion:  1,
		State:        "ACTIVE",
		Steps:        steps,
		Dependencies: deps,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	pm.plans[workflowID] = []*OperationPlan{plan}
	return plan, nil
}

// MutatePlan increments plan version, produces a diff, and flags policy revalidation if financial steps change.
func (pm *PlanManager) MutatePlan(
	tenantID string,
	workflowID string,
	newSteps []PlanStep,
	newDeps map[string][]string,
) (*OperationPlan, *OperationPlanDiff, error) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	history, exists := pm.plans[workflowID]
	if !exists || len(history) == 0 {
		return nil, nil, ErrPlanNotFound
	}

	current := history[len(history)-1]
	now := time.Now().UTC()

	diff := &OperationPlanDiff{
		DiffID:                      "diff_" + uuid.NewString()[:8],
		TenantID:                    tenantID,
		PlanID:                      current.PlanID,
		FromVersion:                 current.PlanVersion,
		ToVersion:                   current.PlanVersion + 1,
		AddedSteps:                  []string{},
		RemovedSteps:                []string{},
		ChangedDependencies:         []string{},
		ChangedDeadlines:            []string{},
		ChangedProviders:            []string{},
		PolicyRevalidationRequired:  false,
		CreatedAt:                   now,
	}

	// Compute step differences
	oldStepsMap := make(map[string]PlanStep)
	for _, s := range current.Steps {
		oldStepsMap[s.StepID] = s
	}

	newStepsMap := make(map[string]PlanStep)
	for _, s := range newSteps {
		newStepsMap[s.StepID] = s
		if oldS, ok := oldStepsMap[s.StepID]; !ok {
			diff.AddedSteps = append(diff.AddedSteps, s.StepID)
			if s.IsFinancial {
				diff.PolicyRevalidationRequired = true
			}
		} else {
			// Check provider change
			if oldS.ProviderID != s.ProviderID {
				diff.ChangedProviders = append(diff.ChangedProviders, fmt.Sprintf("%s:%s->%s", s.StepID, oldS.ProviderID, s.ProviderID))
				if s.IsFinancial {
					diff.PolicyRevalidationRequired = true
				}
			}
		}
	}

	for stepID, oldS := range oldStepsMap {
		if _, ok := newStepsMap[stepID]; !ok {
			diff.RemovedSteps = append(diff.RemovedSteps, stepID)
			if oldS.IsFinancial {
				diff.PolicyRevalidationRequired = true
			}
		}
	}

	// Create new plan version
	nextPlan := &OperationPlan{
		PlanID:       current.PlanID,
		TenantID:     tenantID,
		WorkflowID:   workflowID,
		PlanVersion:  current.PlanVersion + 1,
		State:        "ACTIVE",
		Steps:        newSteps,
		Dependencies: newDeps,
		CreatedAt:    current.CreatedAt,
		UpdatedAt:    now,
	}

	pm.plans[workflowID] = append(history, nextPlan)
	pm.diffs[current.PlanID] = append(pm.diffs[current.PlanID], diff)

	return nextPlan, diff, nil
}

// GetLatestPlan retrieves the active operation plan version for a workflow.
func (pm *PlanManager) GetLatestPlan(workflowID string) (*OperationPlan, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	history, exists := pm.plans[workflowID]
	if !exists || len(history) == 0 {
		return nil, ErrPlanNotFound
	}
	return history[len(history)-1], nil
}

// GetPlanDiffs returns all structural audit diffs for a plan.
func (pm *PlanManager) GetPlanDiffs(planID string) []*OperationPlanDiff {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.diffs[planID]
}
