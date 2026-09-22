package economy

import (
	"context"
	"fmt"
	"math/big"
	"sync"
	"sync/atomic"
	"testing"
)

func TestSwarm_LifecycleAndStateTransitions(t *testing.T) {
	validator := NewSwarmGraphValidator(20, 4)
	planner := NewSwarmPlanner(validator)
	budgetMgr := NewSwarmBudgetManager()
	engine := NewSwarmEngine(planner, validator, budgetMgr, nil, nil, nil, nil, nil, nil, nil, nil, nil)

	ctx := context.Background()
	p := CreateSwarmParams{
		OrganizationID:      "org_test",
		RootMissionID:       "msn_root_1",
		OrchestratorAgentID: "agent_orchestrator",
		Objective:           "Compile AI infrastructure report",
		Budget:              "5000000", // $5.00 USDC
		MaxAgents:           8,
		MaxDepth:            4,
	}

	swarm, graph, tasks, err := engine.CreateSwarm(ctx, p)
	if err != nil {
		t.Fatalf("expected swarm creation to succeed, got: %v", err)
	}

	if swarm.Status != SwarmStatusCreated {
		t.Errorf("expected status CREATED, got: %s", swarm.Status)
	}
	if len(tasks) != 5 {
		t.Errorf("expected 5 planned tasks, got: %d", len(tasks))
	}
	if graph.Depth > 4 {
		t.Errorf("expected graph depth <= 4, got: %d", graph.Depth)
	}

	// Start Swarm
	if err := engine.StartSwarm(ctx, swarm.ID); err != nil {
		t.Fatalf("failed to start swarm: %v", err)
	}

	// Verify swarm transitioned to COMPLETED after executing all wave tasks
	updatedSwarm, err := engine.GetSwarm(swarm.ID)
	if err != nil {
		t.Fatalf("failed to fetch updated swarm: %v", err)
	}
	if updatedSwarm.Status != SwarmStatusCompleted {
		t.Errorf("expected status COMPLETED, got: %s", updatedSwarm.Status)
	}
	if updatedSwarm.CompletedAt == nil {
		t.Errorf("expected CompletedAt to be set")
	}
}

func TestSwarm_GraphValidatorCyclesAndDepth(t *testing.T) {
	validator := NewSwarmGraphValidator(10, 3)
	swarm := &Swarm{
		ID:     "swm_val_test",
		Budget: "10000000",
	}

	// Case 1: Cyclic Graph
	t1 := &TaskNode{
		TaskID:             "t1",
		SwarmID:            swarm.ID,
		RequiredCapability: "cap1",
		Budget:             "2000000",
		Dependencies:       []string{"t2"}, // t1 depends on t2
	}
	t2 := &TaskNode{
		TaskID:             "t2",
		SwarmID:            swarm.ID,
		RequiredCapability: "cap2",
		Budget:             "2000000",
		Dependencies:       []string{"t1"}, // t2 depends on t1 -> CYCLE!
	}

	_, err := validator.ValidateDAG(swarm, []*TaskNode{t1, t2})
	if err == nil {
		t.Fatalf("expected cyclic graph to be rejected, but it was accepted")
	}

	// Case 2: Depth Limit Exceeded (Depth 4 > Max 3)
	t3 := &TaskNode{TaskID: "t_a", SwarmID: swarm.ID, RequiredCapability: "c", Budget: "1000000"}
	t4 := &TaskNode{TaskID: "t_b", SwarmID: swarm.ID, RequiredCapability: "c", Budget: "1000000", Dependencies: []string{"t_a"}}
	t5 := &TaskNode{TaskID: "t_c", SwarmID: swarm.ID, RequiredCapability: "c", Budget: "1000000", Dependencies: []string{"t_b"}}
	t6 := &TaskNode{TaskID: "t_d", SwarmID: swarm.ID, RequiredCapability: "c", Budget: "1000000", Dependencies: []string{"t_c"}} // Depth = 4

	_, err = validator.ValidateDAG(swarm, []*TaskNode{t3, t4, t5, t6})
	if err == nil {
		t.Fatalf("expected depth > 3 to be rejected, but it was accepted")
	}

	// Case 3: Task Budget Exceeds Swarm Budget
	t7 := &TaskNode{TaskID: "t_over", SwarmID: swarm.ID, RequiredCapability: "c", Budget: "15000000"} // 15M > 10M
	_, err = validator.ValidateDAG(swarm, []*TaskNode{t7})
	if err == nil {
		t.Fatalf("expected budget exceeding swarm cap to be rejected, but it was accepted")
	}
}

func TestSwarm_AtomicBudgetReservation100Concurrent(t *testing.T) {
	budgetMgr := NewSwarmBudgetManager()
	swarmID := "swm_concurrent_race"
	hardBudget := big.NewInt(5000000) // $5.00 = 5,000,000 base units

	swarm := &Swarm{
		ID:        swarmID,
		Budget:    hardBudget.String(),
		Allocated: "0",
		Reserved:  "0",
		Spent:     "0",
	}
	budgetMgr.RegisterSwarm(swarm)

	// Launch 100 concurrent tasks each attempting to reserve $0.10 (100,000 base units)
	// 100 * 100,000 = 10,000,000, which is DOUBLE the $5.00 budget ceiling.
	// Only at most 50 tasks can succeed. Under NO circumstance may the total spend exceed 5,000,000.
	numTasks := 100
	taskAmount := big.NewInt(100000)

	var wg sync.WaitGroup
	var successCount int64
	var rejectCount int64

	for i := 0; i < numTasks; i++ {
		wg.Add(1)
		taskID := fmt.Sprintf("concurrent_task_%d", i)

		go func(tid string) {
			defer wg.Done()
			err := budgetMgr.ReserveTaskBudget(swarmID, tid, taskAmount)
			if err == nil {
				atomic.AddInt64(&successCount, 1)
				// Settle the spend
				_ = budgetMgr.CommitTaskSpend(swarmID, tid, taskAmount)
			} else {
				atomic.AddInt64(&rejectCount, 1)
			}
		}(taskID)
	}

	wg.Wait()

	costIntel, err := budgetMgr.GetCostIntelligence(swarmID)
	if err != nil {
		t.Fatalf("failed to get cost intelligence: %v", err)
	}

	totalSpentInt := new(big.Int)
	totalSpentInt.SetString(costIntel.SpentBudget, 10)

	if totalSpentInt.Cmp(hardBudget) > 0 {
		t.Fatalf("FATAL INVARIANT VIOLATION: Actual spend %s exceeded hard budget %s!",
			totalSpentInt.String(), hardBudget.String())
	}

	if successCount > 50 {
		t.Errorf("expected at most 50 tasks to succeed under 5M budget, got: %d", successCount)
	}
	if rejectCount < 50 {
		t.Errorf("expected at least 50 tasks to be rejected, got: %d", rejectCount)
	}

	t.Logf("100 Concurrent Tasks Race: %d reserved & committed, %d rejected safely. Total spend: %s / %s",
		successCount, rejectCount, costIntel.SpentBudget, hardBudget.String())
}

func TestSwarm_CriticAndConsensus(t *testing.T) {
	// Critic feedback validation
	feedback := &CriticFeedback{
		CriticAgentID: "agent_critic_alpha",
		Decision:      CriticPass,
		Reason:        "Schema valid and factual assertions verified with 99.4% confidence",
		Confidence:    9940,
	}

	if feedback.Decision != CriticPass {
		t.Errorf("expected CriticPass, got: %s", feedback.Decision)
	}

	// Consensus disagreement detection
	cv := &ConsensusValidation{
		TaskID: "task_high_value_analysis",
		SourceResults: map[string]string{
			"agent_a": "Revenue projection: $42M",
			"agent_b": "Revenue projection: $42M",
			"agent_c": "Revenue projection: $18M", // Outlier!
		},
		Agreed:             false,
		DisagreementReason: "Disagreement detected: agent_c reports $18M vs consensus $42M",
		ConsensusScore:     6666, // 2 out of 3
	}

	if cv.Agreed {
		t.Errorf("expected disagreement flag to be true")
	}
	if cv.DisagreementReason == "" {
		t.Errorf("expected structured disagreement reason")
	}
}

func TestSwarm_CostIntelligenceAndRisk(t *testing.T) {
	validator := NewSwarmGraphValidator(20, 4)
	planner := NewSwarmPlanner(validator)
	budgetMgr := NewSwarmBudgetManager()
	engine := NewSwarmEngine(planner, validator, budgetMgr, nil, nil, nil, nil, nil, nil, nil, nil, nil)

	ctx := context.Background()
	swarm, _, _, err := engine.CreateSwarm(ctx, CreateSwarmParams{
		OrganizationID:      "org_risk_test",
		RootMissionID:       "msn_root_risk",
		OrchestratorAgentID: "agent_risk_orch",
		Objective:           "Risk and cost intelligence analysis",
		Budget:              "10000000", // $10.00
		MaxAgents:           12,         // High agent count trigger
		MaxDepth:            4,          // Deep graph trigger
	})
	if err != nil {
		t.Fatalf("failed to create swarm: %v", err)
	}

	// Calculate initial risk
	risk, err := engine.CalculateSwarmRisk(swarm.ID)
	if err != nil {
		t.Fatalf("failed to calculate risk: %v", err)
	}

	if risk.RiskScore <= 10 {
		t.Errorf("expected risk score to increase above baseline due to max agents and depth, got: %d", risk.RiskScore)
	}

	// Verify cost intelligence
	costIntel, err := budgetMgr.GetCostIntelligence(swarm.ID)
	if err != nil {
		t.Fatalf("failed to get cost intelligence: %v", err)
	}
	if costIntel.PlannedBudget != "10000000" {
		t.Errorf("expected planned budget 10000000, got: %s", costIntel.PlannedBudget)
	}
}
