package fabric

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ObjectiveCompiler compiles a high-level EconomicObjective into an ExecutionBlueprint
type ObjectiveCompiler struct{}

// NewObjectiveCompiler creates a new compiler instance
func NewObjectiveCompiler() *ObjectiveCompiler {
	return &ObjectiveCompiler{}
}

// Compile generates an ExecutionBlueprint strictly constrained by the objective's limits
func (c *ObjectiveCompiler) Compile(ctx context.Context, obj *EconomicObjective) (*ExecutionBlueprint, error) {
	if obj == nil {
		return nil, fmt.Errorf("objective cannot be nil")
	}

	blueprintID := fmt.Sprintf("bp_%s", uuid.New().String()[:8])
	envelopeID := fmt.Sprintf("env_%s", uuid.New().String()[:8])

	// Calculate bounded task budget per task based on constraints
	maxBudget := obj.EconomicBudgetUSDC
	if obj.Constraints.MaxBudgetUSDC > 0 && obj.Constraints.MaxBudgetUSDC < maxBudget {
		maxBudget = obj.Constraints.MaxBudgetUSDC
	}

	maxParallel := obj.Constraints.MaxParallelTasks
	if maxParallel <= 0 {
		maxParallel = 3
	}

	deadline := obj.Constraints.Deadline
	if deadline.IsZero() {
		deadline = time.Now().Add(24 * time.Hour)
	}

	// Compile standardized canonical DAG: Discover -> Research/Execute -> Validate -> Settle/Synthesize
	tasks := []BlueprintTask{
		{
			TaskID:             fmt.Sprintf("task_disc_%s", uuid.New().String()[:6]),
			TaskName:           "Discover & Evaluate Service Candidates",
			RequiredCapability: obj.Constraints.RequiredCapability,
			Dependencies:       []string{},
			EstimatedCostUSDC:  0.0,
			RequiresPayment:    false,
		},
		{
			TaskID:             fmt.Sprintf("task_exec_%s", uuid.New().String()[:6]),
			TaskName:           fmt.Sprintf("Execute Primary Objective Work: %s", obj.Description),
			RequiredCapability: obj.Constraints.RequiredCapability,
			Dependencies:       []string{"task_disc"},
			EstimatedCostUSDC:  maxBudget * 0.70,
			RequiresPayment:    true,
		},
		{
			TaskID:             fmt.Sprintf("task_val_%s", uuid.New().String()[:6]),
			TaskName:           "Validate Deliverable Quality & Result Integrity",
			RequiredCapability: "verification",
			Dependencies:       []string{"task_exec"},
			EstimatedCostUSDC:  0.0,
			RequiresPayment:    false,
		},
		{
			TaskID:             fmt.Sprintf("task_synth_%s", uuid.New().String()[:6]),
			TaskName:           "Synthesize Deliverables & Final Milestone Settlement",
			RequiredCapability: "synthesis",
			Dependencies:       []string{"task_val"},
			EstimatedCostUSDC:  maxBudget * 0.30,
			RequiresPayment:    true,
		},
	}

	econEnvelope := EconomicEnvelope{
		EnvelopeID:              envelopeID,
		ObjectiveID:             obj.ObjectiveID,
		TenantID:                obj.TenantID,
		MaxTotalCostUSDC:        maxBudget,
		MaxSingleCostUSDC:       maxBudget * 0.70,
		MaxExposureUSDC:         maxBudget,
		MaxParallelExposureUSDC: maxBudget * 0.50,
		ReservedAmountUSDC:      0.0,
		SpentAmountUSDC:         0.0,
		Expiry:                  deadline,
		PolicyHash:              obj.Constraints.RequiredPolicyHash,
		CreatedAt:               time.Now().UTC(),
	}

	riskScoreCeiling := 50
	if obj.RiskTolerance == "HIGH" {
		riskScoreCeiling = 75
	} else if obj.RiskTolerance == "LOW" {
		riskScoreCeiling = 30
	}

	riskEnvelope := RiskEnvelope{
		EnvelopeID:           fmt.Sprintf("risk_%s", uuid.New().String()[:8]),
		ObjectiveID:          obj.ObjectiveID,
		TenantID:             obj.TenantID,
		MaxRiskScore:         riskScoreCeiling,
		AllowedRiskClasses:   []string{"LOW", "MEDIUM"},
		EscalationThreshold:  65,
		ConfidenceThreshold:  obj.Constraints.MinimumConfidence,
		SecurityRequirements: obj.RequiredCapabilities,
		CreatedAt:            time.Now().UTC(),
	}

	resEnvelope := ResourceEnvelope{
		EnvelopeID:         fmt.Sprintf("res_%s", uuid.New().String()[:8]),
		ObjectiveID:        obj.ObjectiveID,
		TenantID:           obj.TenantID,
		MaxWorkers:         maxParallel,
		MaxParallelTasks:   maxParallel,
		MaxProviderCalls:   20,
		MaxAgentDepth:      3,
		MaxRuntimeSeconds:  int(time.Until(deadline).Seconds()),
		MaxRetries:         3,
		CreatedAt:          time.Now().UTC(),
	}

	bp := &ExecutionBlueprint{
		BlueprintID:         blueprintID,
		ObjectiveID:         obj.ObjectiveID,
		TenantID:            obj.TenantID,
		Version:             1,
		Tasks:               tasks,
		AgentAssignments:    make(map[string]string),
		ServiceCandidates:   []string{"provider_sec_primary", "provider_sec_fallback"},
		EconomicEnvelope:    econEnvelope,
		RiskEnvelope:        riskEnvelope,
		ResourceEnvelope:    resEnvelope,
		PolicyReferences:    []string{"policy_constitution_active", obj.Constraints.RequiredPolicyHash},
		PolicyHash:          obj.Constraints.RequiredPolicyHash,
		SimulationStale:     false,
		Status:              "COMPILED",
		CreatedAt:           time.Now().UTC(),
	}

	// Validate INV-142: ObjectiveCompiler cannot create financial authority
	if err := ValidateINV142(obj, bp); err != nil {
		return nil, err
	}

	return bp, nil
}

// ComputeBlueprintHash produces a deterministic hash of the compiled blueprint
func ComputeBlueprintHash(bp *ExecutionBlueprint) string {
	h := sha256.New()
	h.Write([]byte(fmt.Sprintf("%s:%s:%d:%.2f:%d", bp.BlueprintID, bp.ObjectiveID, bp.Version, bp.EconomicEnvelope.MaxTotalCostUSDC, len(bp.Tasks))))
	return hex.EncodeToString(h.Sum(nil))
}
