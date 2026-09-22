package economy

import (
	"context"
	"fmt"
	"math/big"
	"time"
)

// SwarmPlanner decomposes complex objectives into validated, role-specialized DAG task graphs.
type SwarmPlanner struct {
	validator *SwarmGraphValidator
}

// NewSwarmPlanner initializes the planner.
func NewSwarmPlanner(validator *SwarmGraphValidator) *SwarmPlanner {
	if validator == nil {
		validator = NewSwarmGraphValidator(DefaultMaxSwarmTasks, DefaultMaxSwarmDepth)
	}
	return &SwarmPlanner{
		validator: validator,
	}
}

// PlanSwarmGraph decomposes a root objective into a validated SwarmGraph.
func (p *SwarmPlanner) PlanSwarmGraph(ctx context.Context, swarm *Swarm) (*SwarmGraph, []*TaskNode, error) {
	// Parse total swarm budget
	totalBudgetInt := new(big.Int)
	totalBudgetInt.SetString(swarm.Budget, 10)

	// Allocate budget portions deterministically:
	// 20% to Research 1, 20% to Data Collection 2, 20% to Competitor Analysis 3
	// 20% to Synthesis 4, 10% to Verification/Critic 5, 10% Reserve buffer
	twentyPct := new(big.Int).Div(new(big.Int).Mul(totalBudgetInt, big.NewInt(20)), big.NewInt(100))
	tenPct := new(big.Int).Div(new(big.Int).Mul(totalBudgetInt, big.NewInt(10)), big.NewInt(100))

	t1ID := fmt.Sprintf("task_%s_research", swarm.ID)
	t2ID := fmt.Sprintf("task_%s_data", swarm.ID)
	t3ID := fmt.Sprintf("task_%s_competitor", swarm.ID)
	t4ID := fmt.Sprintf("task_%s_analysis", swarm.ID)
	t5ID := fmt.Sprintf("task_%s_verification", swarm.ID)

	now := time.Now().UTC()

	// 1. Parallel Research Task (independent root)
	t1 := &TaskNode{
		TaskID:             t1ID,
		SwarmID:            swarm.ID,
		Name:               "AI Infrastructure Deep Research",
		Description:        "Synthesize primary technological architecture, model clusters, and hardware landscape",
		AssignedRole:       RoleResearcher,
		RequiredCapability: "research",
		Status:             TaskStatusReady, // no dependencies -> ready
		Budget:             twentyPct.String(),
		Spent:              "0",
		Dependencies:       []string{},
		InputRefs:          []string{},
		OutputRefs:         []string{fmt.Sprintf("result://swarm/%s/task/%s", swarm.ID, t1ID)},
		MaxRetries:         2,
		CreatedAt:          now,
	}

	// 2. Parallel Market Data Collection Task (independent root)
	t2 := &TaskNode{
		TaskID:             t2ID,
		SwarmID:            swarm.ID,
		Name:               "Market Pricing & Utilization Telemetry",
		Description:        "Acquire real-time pricing benchmarks and compute cluster load telemetry",
		AssignedRole:       RoleDataProvider,
		RequiredCapability: "market_data",
		Status:             TaskStatusReady, // no dependencies -> ready
		Budget:             twentyPct.String(),
		Spent:              "0",
		Dependencies:       []string{},
		InputRefs:          []string{},
		OutputRefs:         []string{fmt.Sprintf("result://swarm/%s/task/%s", swarm.ID, t2ID)},
		MaxRetries:         2,
		CreatedAt:          now,
	}

	// 3. Parallel Competitor Intelligence Task (independent root)
	t3 := &TaskNode{
		TaskID:             t3ID,
		SwarmID:            swarm.ID,
		Name:               "Competitor Matrix Analysis",
		Description:        "Map counterparty offerings, moat defensibility, and market share trends",
		AssignedRole:       RoleAnalyst,
		RequiredCapability: "competitive_analysis",
		Status:             TaskStatusReady, // no dependencies -> ready
		Budget:             twentyPct.String(),
		Spent:              "0",
		Dependencies:       []string{},
		InputRefs:          []string{},
		OutputRefs:         []string{fmt.Sprintf("result://swarm/%s/task/%s", swarm.ID, t3ID)},
		MaxRetries:         2,
		CreatedAt:          now,
	}

	// 4. Analysis & Synthesis Task (depends on 1, 2, 3)
	t4 := &TaskNode{
		TaskID:             t4ID,
		SwarmID:            swarm.ID,
		Name:               "Multi-Source Market Synthesis",
		Description:        "Cross-correlate empirical research, pricing telemetry, and competitor matrices",
		AssignedRole:       RoleSynthesizer,
		RequiredCapability: "synthesis",
		Status:             TaskStatusPending,
		Budget:             twentyPct.String(),
		Spent:              "0",
		Dependencies:       []string{t1ID, t2ID, t3ID},
		InputRefs: []string{
			fmt.Sprintf("result://swarm/%s/task/%s", swarm.ID, t1ID),
			fmt.Sprintf("result://swarm/%s/task/%s", swarm.ID, t2ID),
			fmt.Sprintf("result://swarm/%s/task/%s", swarm.ID, t3ID),
		},
		OutputRefs: []string{fmt.Sprintf("result://swarm/%s/task/%s", swarm.ID, t4ID)},
		MaxRetries: 2,
		CreatedAt:  now,
	}

	// 5. Verification & Critic Consensus Task (depends on 4)
	t5 := &TaskNode{
		TaskID:             t5ID,
		SwarmID:            swarm.ID,
		Name:               "Independent Critic & Checksum Verification",
		Description:        "Deterministic verification of citations, factual consistency, and quality score",
		AssignedRole:       RoleVerifier,
		RequiredCapability: "verification",
		Status:             TaskStatusPending,
		Budget:             tenPct.String(),
		Spent:              "0",
		Dependencies:       []string{t4ID},
		InputRefs:          []string{fmt.Sprintf("result://swarm/%s/task/%s", swarm.ID, t4ID)},
		OutputRefs:         []string{fmt.Sprintf("result://swarm/%s/task/%s", swarm.ID, t5ID)},
		MaxRetries:         2,
		CreatedAt:          now,
	}

	tasks := []*TaskNode{t1, t2, t3, t4, t5}

	// Validate the planned DAG
	valRes, err := p.validator.ValidateDAG(swarm, tasks)
	if err != nil {
		return nil, nil, fmt.Errorf("swarm planner graph validation failed: %w", err)
	}

	// Construct SwarmGraph
	taskMap := make(map[string]*TaskNode)
	rootIDs := make([]string, 0)
	for _, t := range tasks {
		taskMap[t.TaskID] = t
		if len(t.Dependencies) == 0 {
			rootIDs = append(rootIDs, t.TaskID)
		}
	}

	graph := &SwarmGraph{
		SwarmID:     swarm.ID,
		RootTaskIDs: rootIDs,
		Tasks:       taskMap,
		Depth:       valRes.Depth,
	}

	// Update swarm.Allocated
	swarm.Allocated = valRes.TotalBudget

	return graph, tasks, nil
}
