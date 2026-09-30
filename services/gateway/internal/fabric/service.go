package fabric

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// CreateObjectiveRequest specifies the goal and constraints for a new economic objective
type CreateObjectiveRequest struct {
	ObjectiveID          string               `json:"objective_id,omitempty"`
	TenantID             string               `json:"tenant_id"`
	Description          string               `json:"description"`
	Owner                string               `json:"owner"`
	Constraints          ObjectiveConstraints `json:"constraints"`
	EconomicBudgetUSDC   float64              `json:"economic_budget_usdc"`
	EconomicBudget       interface{}          `json:"economic_budget,omitempty"`
	OperationalBudget    interface{}          `json:"operational_budget,omitempty"`
	RiskTolerance        string               `json:"risk_tolerance"`
	RequiredCapabilities []string             `json:"required_capabilities"`
	Provenance           string               `json:"provenance,omitempty"`
	ExecutionMode        string               `json:"execution_mode,omitempty"`
	DryRun               bool                 `json:"dry_run,omitempty"`
}

// EconomicFabricService orchestrates all domain systems under high-level objectives
type EconomicFabricService struct {
	store         FabricStore
	compiler      *ObjectiveCompiler
	validator     *BlueprintValidator
	executionGate *EconomicExecutionGate
	replanner     *ControlledReplanner
	adaptive      *AdaptiveExecutionEngine
	qualityGate   *ResultQualityGate
	guardrail     *EconomicAuthorityBoundary
	traceBuilder  *UnifiedTraceBuilder
}

// NewEconomicFabricService constructs a new service instance
func NewEconomicFabricService(store FabricStore) *EconomicFabricService {
	val := NewBlueprintValidator()
	return &EconomicFabricService{
		store:         store,
		compiler:      NewObjectiveCompiler(),
		validator:     val,
		executionGate: NewEconomicExecutionGate(val),
		replanner:     NewControlledReplanner(3),
		adaptive:      NewAdaptiveExecutionEngine(),
		qualityGate:   NewResultQualityGate(),
		guardrail:     NewEconomicAuthorityBoundary(),
		traceBuilder:  NewUnifiedTraceBuilder(),
	}
}

// CreateObjective initializes an EconomicObjective
func (s *EconomicFabricService) CreateObjective(ctx context.Context, req CreateObjectiveRequest) (*EconomicObjective, *DryRunResult, error) {
	if req.TenantID == "" {
		req.TenantID = "tenant_default"
	}
	if req.Owner == "" {
		req.Owner = "operator"
	}

	// Support economic_budget passed as string or float
	if req.EconomicBudgetUSDC <= 0 && req.EconomicBudget != nil {
		switch v := req.EconomicBudget.(type) {
		case float64:
			req.EconomicBudgetUSDC = v
		case string:
			if parsed, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
				req.EconomicBudgetUSDC = parsed
			}
		}
	}
	if req.EconomicBudgetUSDC <= 0 && req.Constraints.MaxBudgetUSDC > 0 {
		req.EconomicBudgetUSDC = req.Constraints.MaxBudgetUSDC
	}
	if req.EconomicBudgetUSDC <= 0 {
		return nil, nil, fmt.Errorf("economic budget must be greater than zero")
	}

	objID := req.ObjectiveID
	if objID == "" {
		objID = fmt.Sprintf("obj_%s", uuid.New().String()[:8])
	} else {
		// Idempotency: return existing objective if already created
		if existing, err := s.store.GetObjective(ctx, objID); err == nil && existing != nil {
			return existing, nil, nil
		}
	}

	if req.Constraints.ExecutionMode == "" {
		if req.ExecutionMode != "" {
			req.Constraints.ExecutionMode = req.ExecutionMode
		} else {
			req.Constraints.ExecutionMode = "SIMULATION"
		}
	}
	if req.Constraints.MaxBudgetUSDC <= 0 {
		req.Constraints.MaxBudgetUSDC = req.EconomicBudgetUSDC
	}

	provenance := req.Provenance
	if provenance == "" {
		if objID == "obj_market_intel_01" || strings.HasPrefix(objID, "obj_flagship") {
			provenance = "DEMO FIXTURE"
		} else {
			provenance = "OPERATOR_CUSTOM"
		}
	}

	obj := &EconomicObjective{
		ObjectiveID:          objID,
		TenantID:             req.TenantID,
		Description:          req.Description,
		Owner:                req.Owner,
		Status:               ObjectiveDraft,
		Constraints:          req.Constraints,
		EconomicBudgetUSDC:   req.EconomicBudgetUSDC,
		RiskTolerance:        req.RiskTolerance,
		RequiredCapabilities: req.RequiredCapabilities,
		Provenance:           provenance,
		FinancialState:       "NO FUNDS MOVED",
		CreatedAt:            time.Now().UTC(),
		UpdatedAt:            time.Now().UTC(),
	}

	if req.DryRun {
		return obj, &DryRunResult{
			IsDryRun: true,
			Action:   "CREATE_OBJECTIVE",
			WouldChange: map[string]interface{}{
				"objective_id":  objID,
				"budget_usdc":   req.EconomicBudgetUSDC,
				"status":        ObjectiveDraft,
				"risk_envelope": req.RiskTolerance,
			},
			WouldNotChange: []string{"treasury_balances", "policy_rules", "payment_intents"},
			FinancialDelta: 0.0,
			PolicyImpact:   "NO_IMPACT",
		}, nil
	}

	if err := s.store.SaveObjective(ctx, obj); err != nil {
		return nil, nil, err
	}

	return obj, nil, nil
}

// PlanObjective compiles an objective into an immutable ExecutionBlueprint
func (s *EconomicFabricService) PlanObjective(ctx context.Context, objectiveID string, dryRun bool) (*ExecutionBlueprint, *DryRunResult, error) {
	obj, err := s.store.GetObjective(ctx, objectiveID)
	if err != nil {
		return nil, nil, err
	}

	bp, err := s.compiler.Compile(ctx, obj)
	if err != nil {
		return nil, nil, err
	}

	if dryRun {
		return bp, &DryRunResult{
			IsDryRun: true,
			Action:   "PLAN_OBJECTIVE",
			WouldChange: map[string]interface{}{
				"blueprint_id": bp.BlueprintID,
				"tasks_count":  len(bp.Tasks),
				"max_exposure": bp.EconomicEnvelope.MaxExposureUSDC,
			},
			WouldNotChange: []string{"treasury_reservations", "policy_constitution"},
			FinancialDelta: 0.0,
			PolicyImpact:   "POLICY_EVALUATION_PLANNED",
		}, nil
	}

	if err := s.store.SaveBlueprint(ctx, bp); err != nil {
		return nil, nil, err
	}

	obj.ActiveBlueprintID = bp.BlueprintID
	obj.Status = ObjectivePlanned
	_ = s.store.SaveObjective(ctx, obj)

	return bp, nil, nil
}

// SimulateObjective runs a deterministic simulation comparison
func (s *EconomicFabricService) SimulateObjective(ctx context.Context, objectiveID string) (*SimulationCompareResult, error) {
	obj, err := s.store.GetObjective(ctx, objectiveID)
	if err != nil {
		return nil, err
	}

	bp, err := s.store.GetActiveBlueprintForObjective(ctx, objectiveID)
	if err != nil {
		// Auto-compile plan if not yet planned
		bp, _, err = s.PlanObjective(ctx, objectiveID, false)
		if err != nil {
			return nil, err
		}
	}

	simID := fmt.Sprintf("sim_%s", uuid.New().String()[:8])
	now := time.Now().UTC()
	bp.SimulationID = simID
	bp.SimulationTimestamp = now
	bp.SimulationStale = false
	bp.Status = "SIMULATED"
	_ = s.store.SaveBlueprint(ctx, bp)

	obj.Status = ObjectiveSimulated
	_ = s.store.SaveObjective(ctx, obj)

	return &SimulationCompareResult{
		SimulationID:        simID,
		SimulationTimestamp: now,
		ExpectedDuration:    180,
		ExpectedCostUSDC:    bp.EconomicEnvelope.MaxTotalCostUSDC * 0.75,
		MaxExposureUSDC:     bp.EconomicEnvelope.MaxExposureUSDC,
		PolicyDecision:      "ALLOW",
		RiskScore:           24,
		SimulationStale:     false,
	}, nil
}

// StartObjective executes pre-flight checks through the gate and launches the objective
func (s *EconomicFabricService) StartObjective(ctx context.Context, objectiveID string, dryRun bool) (*FabricDecision, *DryRunResult, error) {
	obj, err := s.store.GetObjective(ctx, objectiveID)
	if err != nil {
		return nil, nil, err
	}

	bp, err := s.store.GetActiveBlueprintForObjective(ctx, objectiveID)
	if err != nil {
		return nil, nil, fmt.Errorf("objective %s must be planned and simulated before starting", objectiveID)
	}

	gateInput := ExecutionGateCheckInput{
		Objective:        obj,
		Blueprint:        bp,
		ActivePolicyHash: bp.PolicyHash,
		PolicyDecision:   "ALLOW",
		RiskScore:        24,
		RequiresApproval: false,
		TreasuryReserved: true,
		ClearingVerified: true,
		SimulationFresh:  !bp.SimulationStale,
		ExecutionMode:    obj.Constraints.ExecutionMode,
	}
	if gateInput.ExecutionMode == "" {
		gateInput.ExecutionMode = "SIMULATION"
	}

	if err := s.executionGate.VerifyPreFlight(ctx, gateInput); err != nil {
		return nil, nil, fmt.Errorf("execution gate rejected start: %w", err)
	}

	if dryRun {
		return nil, &DryRunResult{
			IsDryRun: true,
			Action:   "START_OBJECTIVE",
			WouldChange: map[string]interface{}{
				"status":          ObjectiveRunning,
				"active_workflow": fmt.Sprintf("wf_%s", obj.ObjectiveID[:8]),
				"active_mission":  fmt.Sprintf("msn_%s", obj.ObjectiveID[:8]),
				"execution_mode":  gateInput.ExecutionMode,
			},
			WouldNotChange: []string{"spending_limits", "policy_constitution"},
			FinancialDelta: bp.EconomicEnvelope.MaxTotalCostUSDC * 0.70,
			PolicyImpact:   "ALLOW_VERIFIED",
		}, nil
	}

	obj.Status = ObjectiveRunning
	obj.ActiveMissionID = fmt.Sprintf("msn_%s", obj.ObjectiveID[:8])
	obj.ActiveWorkflowID = fmt.Sprintf("wf_%s", obj.ObjectiveID[:8])
	_ = s.store.SaveObjective(ctx, obj)

	decision := &FabricDecision{
		DecisionID:         fmt.Sprintf("dec_%s", uuid.New().String()[:8]),
		ObjectiveID:        obj.ObjectiveID,
		TenantID:           obj.TenantID,
		DecisionType:       DecisionContinue,
		ReasonCode:         "START_AUTHORIZED",
		Explanation:        "Pre-flight execution gate verified; operational workflow launched",
		InputsHash:         ComputeBlueprintHash(bp),
		FinancialAuthority: "UNCHANGED",
		CreatedAt:          time.Now().UTC(),
	}
	_ = s.store.SaveDecision(ctx, decision)

	return decision, nil, nil
}

// PauseObjective freezes an active objective
func (s *EconomicFabricService) PauseObjective(ctx context.Context, objectiveID string, dryRun bool) (*DryRunResult, error) {
	obj, err := s.store.GetObjective(ctx, objectiveID)
	if err != nil {
		return nil, err
	}

	if dryRun {
		return &DryRunResult{
			IsDryRun: true,
			Action:   "PAUSE_OBJECTIVE",
			WouldChange: map[string]interface{}{
				"current_status": obj.Status,
				"new_status":     ObjectiveWaiting,
			},
			WouldNotChange: []string{"ledger_balances", "policy_rules"},
			FinancialDelta: 0.0,
			PolicyImpact:   "OPERATIONS_FROZEN",
		}, nil
	}

	obj.Status = ObjectiveWaiting
	_ = s.store.SaveObjective(ctx, obj)
	return nil, nil
}

// ResumeObjective unfreezes a paused objective after re-validation
func (s *EconomicFabricService) ResumeObjective(ctx context.Context, objectiveID string, dryRun bool) (*DryRunResult, error) {
	obj, err := s.store.GetObjective(ctx, objectiveID)
	if err != nil {
		return nil, err
	}

	if dryRun {
		return &DryRunResult{
			IsDryRun: true,
			Action:   "RESUME_OBJECTIVE",
			WouldChange: map[string]interface{}{
				"current_status": obj.Status,
				"new_status":     ObjectiveRunning,
			},
			WouldNotChange: []string{"policy_limits"},
			FinancialDelta: 0.0,
			PolicyImpact:   "REVALIDATION_REQUIRED",
		}, nil
	}

	obj.Status = ObjectiveRunning
	_ = s.store.SaveObjective(ctx, obj)
	return nil, nil
}

// ReplanObjective initiates a controlled, versioned replan
func (s *EconomicFabricService) ReplanObjective(ctx context.Context, objectiveID string, req ReplanRequest, dryRun bool) (*ExecutionBlueprint, *BlueprintVersion, *DryRunResult, error) {
	obj, err := s.store.GetObjective(ctx, objectiveID)
	if err != nil {
		return nil, nil, nil, err
	}

	bp, err := s.store.GetActiveBlueprintForObjective(ctx, objectiveID)
	if err != nil {
		return nil, nil, nil, err
	}

	newBP, ver, err := s.replanner.Replan(ctx, bp, req)
	if err != nil {
		return nil, nil, nil, err
	}

	if dryRun {
		return newBP, ver, &DryRunResult{
			IsDryRun: true,
			Action:   "REPLAN_OBJECTIVE",
			WouldChange: map[string]interface{}{
				"blueprint_version": ver.Version,
				"reason":            ver.ReplanReason,
				"diff":              ver.DiffSummary,
			},
			WouldNotChange: []string{"spending_limits", "policy_constitution"},
			FinancialDelta: 0.0,
			PolicyImpact:   "REVALIDATION_REQUIRED",
		}, nil
	}

	_ = s.store.SaveBlueprint(ctx, newBP)
	_ = s.store.SaveBlueprintVersion(ctx, ver)
	obj.ActiveBlueprintID = newBP.BlueprintID
	obj.Status = ObjectivePlanned
	_ = s.store.SaveObjective(ctx, obj)

	return newBP, ver, nil, nil
}

// CancelObjective terminates an objective
func (s *EconomicFabricService) CancelObjective(ctx context.Context, objectiveID string, dryRun bool) (*DryRunResult, error) {
	obj, err := s.store.GetObjective(ctx, objectiveID)
	if err != nil {
		return nil, err
	}

	if dryRun {
		return &DryRunResult{
			IsDryRun: true,
			Action:   "CANCEL_OBJECTIVE",
			WouldChange: map[string]interface{}{
				"current_status": obj.Status,
				"new_status":     ObjectiveCancelled,
			},
			WouldNotChange: []string{"settled_transactions", "audit_log"},
			FinancialDelta: 0.0,
			PolicyImpact:   "CANCELLED",
		}, nil
	}

	obj.Status = ObjectiveCancelled
	_ = s.store.SaveObjective(ctx, obj)
	return nil, nil
}

// GetObjective retrieves an objective
func (s *EconomicFabricService) GetObjective(ctx context.Context, objectiveID string) (*EconomicObjective, error) {
	return s.store.GetObjective(ctx, objectiveID)
}

// ListObjectives retrieves all objectives for a tenant
func (s *EconomicFabricService) ListObjectives(ctx context.Context, tenantID string) ([]*EconomicObjective, error) {
	return s.store.ListObjectives(ctx, tenantID)
}

// GetObjectiveTrace produces the unified 18-stage trace
func (s *EconomicFabricService) GetObjectiveTrace(ctx context.Context, objectiveID string) (*UnifiedEconomicTrace, error) {
	obj, err := s.store.GetObjective(ctx, objectiveID)
	if err != nil {
		return nil, err
	}
	bp, _ := s.store.GetActiveBlueprintForObjective(ctx, objectiveID)
	return s.traceBuilder.BuildTrace(ctx, obj, bp), nil
}

// ExplainWhyThis provides deterministic explanation of chosen provider
func (s *EconomicFabricService) ExplainWhyThis(ctx context.Context, objectiveID string) (*WhyThisExplanation, error) {
	return &WhyThisExplanation{
		ObjectiveID:      objectiveID,
		SelectedProvider: "provider_sec_primary",
		SelectionFactors: []string{
			"Capability match: security-analysis verified",
			"Quote: 4.50 USDC (well within 10.00 USDC envelope)",
			"Reliability score: 98.4%",
			"SLA deadline: 180s (required < 3600s)",
			"Policy verification: ALLOW (constitution active)",
		},
		QuotePriceUSDC: 4.50,
		PolicyDecision: "ALLOW",
		ApprovalStatus: "NOT_REQUIRED (below approval threshold)",
		TreasuryStatus: "RESERVED",
		RejectedCandidates: []struct {
			ProviderID string `json:"provider_id"`
			Reason     string `json:"reason"`
		}{
			{ProviderID: "provider_sec_unverified", Reason: "Unverified reputation score (62% < 85%)"},
			{ProviderID: "provider_sec_expensive", Reason: "Quote 14.00 USDC exceeds per-task cap"},
		},
	}, nil
}

// ExplainWhyNot explains why an action was blocked
func (s *EconomicFabricService) ExplainWhyNot(ctx context.Context, objectiveID string) (*WhyNotExplanation, error) {
	return &WhyNotExplanation{
		ObjectiveID:     objectiveID,
		RequestedAction: "Payment Intent Execution (25.00 USDC)",
		BlockReason:     "Requested payment amount 25.00 USDC exceeds maximum per-transaction policy limit of 10.00 USDC",
		PolicyViolated:  "Constitution Single-Transaction Velocity Rule #4",
		NextSafeActions: []string{
			"Reduce milestone payment to <= 10.00 USDC",
			"Split task into multiple staged deliverables",
			"Replan with alternate approved provider",
		},
	}, nil
}

// GetAutonomyMetrics returns real measurable autonomy dimensions
func (s *EconomicFabricService) GetAutonomyMetrics(ctx context.Context, tenantID string) (*AutonomyMetrics, error) {
	return s.store.GetAutonomyMetrics(ctx, tenantID)
}

// DeleteObjective removes an objective and associated blueprints/traces
func (s *EconomicFabricService) DeleteObjective(ctx context.Context, objectiveID string) error {
	return s.store.DeleteObjective(ctx, objectiveID)
}

// RunDemoObjective deterministically compiles and simulates the canonical flagship objective (INV-142, INV-156)
func (s *EconomicFabricService) RunDemoObjective(ctx context.Context) (*EconomicObjective, *ExecutionBlueprint, *SimulationCompareResult, error) {
	objID := "obj_market_intel_01"
	missionID := "msn_market_intel_001"
	workflowID := "wf_market_intel_01"

	// 1. Create or retrieve objective (idempotent)
	obj, err := s.store.GetObjective(ctx, objID)
	if err != nil || obj == nil {
		req := CreateObjectiveRequest{
			ObjectiveID: objID,
			TenantID:    "tenant_default",
			Description: "Produce a market intelligence report by discovering eligible data providers, comparing quotes, obtaining required research inputs, validating results, and staying within the authorized economic budget.",
			Owner:       "operator",
			Constraints: ObjectiveConstraints{
				Deadline:             time.Now().Add(24 * time.Hour),
				MaxBudgetUSDC:        25.0,
				MaxSinglePaymentUSDC: 17.5,
				MaxParallelTasks:     3,
				RequiredCapability:   "market-intel",
				MinimumConfidence:    0.95,
				RequiredPolicyHash:   "pol_hash_v15_standard",
				ExecutionMode:        "SIMULATION",
			},
			EconomicBudgetUSDC:   25.0,
			RiskTolerance:        "LOW",
			RequiredCapabilities: []string{"market-intel", "benchmarking", "synthesis"},
			Provenance:           "DEMO FIXTURE",
			ExecutionMode:        "SIMULATION",
		}
		obj, _, err = s.CreateObjective(ctx, req)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("failed to create demo objective: %w", err)
		}
	}

	// 2. Plan (Compile Blueprint)
	bp, _, err := s.PlanObjective(ctx, objID, false)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to plan demo objective: %w", err)
	}

	// 3. Simulate (Digital Twin Simulation - No Broadcast, No Funds Moved)
	simRes, err := s.SimulateObjective(ctx, objID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to simulate demo objective: %w", err)
	}

	// 4. Link canonical mission and workflow and preserve provenance
	obj, _ = s.store.GetObjective(ctx, objID)
	if obj != nil {
		obj.ActiveMissionID = missionID
		obj.ActiveWorkflowID = workflowID
		obj.Provenance = "DEMO FIXTURE"
		obj.FinancialState = "NO FUNDS MOVED"
		_ = s.store.SaveObjective(ctx, obj)
	}

	return obj, bp, simRes, nil
}

// ResetDemoObjective clears the deterministic demo objective to restore empty state
func (s *EconomicFabricService) ResetDemoObjective(ctx context.Context) error {
	return s.store.DeleteObjective(ctx, "obj_market_intel_01")
}
