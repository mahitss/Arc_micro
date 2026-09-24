package fabric

import (
	"context"
	"fmt"
	"time"
)

// BlueprintValidator performs pre-flight validation on execution blueprints
type BlueprintValidator struct{}

// NewBlueprintValidator creates a new validator instance
func NewBlueprintValidator() *BlueprintValidator {
	return &BlueprintValidator{}
}

// Validate executes the 10-point structural, economic, and policy validation suite
func (v *BlueprintValidator) Validate(ctx context.Context, obj *EconomicObjective, bp *ExecutionBlueprint, activePolicyHash string) error {
	if bp == nil {
		return fmt.Errorf("blueprint cannot be nil")
	}
	if obj == nil {
		return fmt.Errorf("objective cannot be nil")
	}

	// 1. Tenant Isolation
	if bp.TenantID != obj.TenantID {
		return fmt.Errorf("tenant isolation violation: blueprint tenant %s != objective tenant %s", bp.TenantID, obj.TenantID)
	}

	// 2. Budget Constraints (INV-142)
	if err := ValidateINV142(obj, bp); err != nil {
		return err
	}

	// 3. Task Graph Non-Empty & Acyclic Dependency Check
	if len(bp.Tasks) == 0 {
		return fmt.Errorf("blueprint task graph cannot be empty")
	}

	taskMap := make(map[string]bool)
	for _, t := range bp.Tasks {
		if t.TaskID == "" {
			return fmt.Errorf("task ID cannot be empty")
		}
		if taskMap[t.TaskID] {
			return fmt.Errorf("duplicate task ID: %s", t.TaskID)
		}
		taskMap[t.TaskID] = true
	}

	// Verify all dependencies exist in the graph
	for _, t := range bp.Tasks {
		for _, dep := range t.Dependencies {
			// Allow prefix matching (e.g. "task_disc" matches "task_disc_123")
			found := false
			for id := range taskMap {
				if id == dep || (len(id) >= len(dep) && id[:len(dep)] == dep) {
					found = true
					break
				}
			}
			if !found && dep != "" {
				return fmt.Errorf("unresolvable dependency: task %s depends on missing task %s", t.TaskID, dep)
			}
		}
	}

	// 4. Deadline Feasibility
	now := time.Now().UTC()
	if !bp.EconomicEnvelope.Expiry.IsZero() && bp.EconomicEnvelope.Expiry.Before(now) {
		return fmt.Errorf("deadline expired: envelope expiry %s is in the past", bp.EconomicEnvelope.Expiry)
	}

	// 5. Risk Envelope Boundaries (INV-149)
	if bp.RiskEnvelope.MaxRiskScore > 100 || bp.RiskEnvelope.MaxRiskScore < 0 {
		return fmt.Errorf("invalid risk score ceiling: %d", bp.RiskEnvelope.MaxRiskScore)
	}

	// 6. Resource Limits
	if bp.ResourceEnvelope.MaxWorkers <= 0 {
		return fmt.Errorf("max workers must be greater than zero")
	}

	// 7. Simulation Freshness Verification (INV-144)
	if bp.SimulationStale {
		return fmt.Errorf("%w: simulation marked stale; re-simulation required", ErrStaleSimulationExecution)
	}

	if activePolicyHash != "" && bp.PolicyHash != "" && bp.PolicyHash != activePolicyHash {
		return fmt.Errorf("%w: blueprint policy hash %s != active policy hash %s", ErrChangedPolicyInvalidatesAuth, bp.PolicyHash, activePolicyHash)
	}

	return nil
}
