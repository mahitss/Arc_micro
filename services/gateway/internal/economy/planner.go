package economy

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
)

var (
	ErrPlanExceedsBudget       = errors.New("total planned step budget exceeds authorized mission budget")
	ErrStepExceedsMaxExecution = errors.New("step budget exceeds maximum allowed execution amount")
	ErrInvalidObjective       = errors.New("mission objective cannot be empty")
	ErrZeroBudget              = errors.New("mission budget must be a positive integer base unit string")
)

// Planner defines the interface for creating structured mission execution plans.
type Planner interface {
	PlanMission(ctx context.Context, mission *Mission) (*MissionPlan, error)
}

// DeterministicPlanner produces structured plans without subjective or nondeterministic LLM authority.
type DeterministicPlanner struct{}

// NewPlanner constructs a new deterministic mission planner.
func NewPlanner() *DeterministicPlanner {
	return &DeterministicPlanner{}
}

// PlanMission decomposes the mission's objective into ordered capability steps.
func (p *DeterministicPlanner) PlanMission(ctx context.Context, m *Mission) (*MissionPlan, error) {
	if m == nil {
		return nil, errors.New("nil mission provided to planner")
	}
	if strings.TrimSpace(m.Objective) == "" {
		return nil, ErrInvalidObjective
	}

	missionBudget, ok := new(big.Int).SetString(m.Budget, 10)
	if !ok || missionBudget.Sign() <= 0 {
		return nil, ErrZeroBudget
	}

	var maxExec *big.Int
	if m.MaxExecutionAmount != "" {
		maxExec, ok = new(big.Int).SetString(m.MaxExecutionAmount, 10)
		if !ok || maxExec.Sign() <= 0 {
			maxExec = new(big.Int).Set(missionBudget)
		}
	} else {
		maxExec = new(big.Int).Set(missionBudget)
	}

	// Deterministic capability mapping based on mission objective keywords
	lowerObj := strings.ToLower(m.Objective)
	var plannedRequirements []struct {
		Capability string
		Category   string
		Ratio      int64 // Fraction of budget (basis points, sum <= 10000)
	}

	if strings.Contains(lowerObj, "weather") {
		plannedRequirements = []struct {
			Capability string
			Category   string
			Ratio      int64
		}{
			{Capability: "web_search", Category: "RESEARCH", Ratio: 6000}, // 60%
			{Capability: "state_proofs", Category: "ORACLE", Ratio: 4000}, // 40%
		}
	} else if strings.Contains(lowerObj, "market") || strings.Contains(lowerObj, "research") {
		plannedRequirements = []struct {
			Capability string
			Category   string
			Ratio      int64
		}{
			{Capability: "web_search", Category: "RESEARCH", Ratio: 5000},
			{Capability: "data_feed", Category: "DATA", Ratio: 3000},
			{Capability: "state_proofs", Category: "ORACLE", Ratio: 2000},
		}
	} else if strings.Contains(lowerObj, "compute") || strings.Contains(lowerObj, "infer") {
		plannedRequirements = []struct {
			Capability string
			Category   string
			Ratio      int64
		}{
			{Capability: "gpu_inference", Category: "COMPUTE", Ratio: 8000},
			{Capability: "state_proofs", Category: "ORACLE", Ratio: 2000},
		}
	} else {
		// Single comprehensive research step by default
		plannedRequirements = []struct {
			Capability string
			Category   string
			Ratio      int64
		}{
			{Capability: "web_search", Category: "RESEARCH", Ratio: 10000},
		}
	}

	plan := &MissionPlan{
		MissionID: m.ID,
		Steps:     make([]MissionStep, 0, len(plannedRequirements)),
	}

	totalPlanned := big.NewInt(0)

	for i, req := range plannedRequirements {
		stepBudget := new(big.Int).Mul(missionBudget, big.NewInt(req.Ratio))
		stepBudget.Div(stepBudget, big.NewInt(10000))

		if stepBudget.Sign() <= 0 {
			stepBudget = big.NewInt(1)
		}

		// Cap at max execution amount
		if stepBudget.Cmp(maxExec) > 0 {
			stepBudget.Set(maxExec)
		}

		totalPlanned.Add(totalPlanned, stepBudget)

		randB := make([]byte, 4)
		_, _ = rand.Read(randB)
		stepID := fmt.Sprintf("step_%s_%d_%s", req.Capability, i+1, hex.EncodeToString(randB))

		step := MissionStep{
			StepID:             stepID,
			MissionID:          m.ID,
			Index:              i,
			RequiredCapability: req.Capability,
			Category:           req.Category,
			MaxBudget:          stepBudget.String(),
			Status:             "PENDING",
		}
		plan.Steps = append(plan.Steps, step)
	}

	// Verify total planned does not exceed total authorized mission budget
	if totalPlanned.Cmp(missionBudget) > 0 {
		return nil, fmt.Errorf("%w: planned %s > budget %s", ErrPlanExceedsBudget, totalPlanned.String(), missionBudget.String())
	}

	return plan, nil
}
