package runtime

import (
	"context"
	"fmt"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/economy"
)

// WorkflowAdapter binds high-level domain entities (Missions, Swarms) to the Durable Runtime.
type WorkflowAdapter struct {
	runtimeService Service
}

// NewWorkflowAdapter initializes a WorkflowAdapter.
func NewWorkflowAdapter(svc Service) *WorkflowAdapter {
	return &WorkflowAdapter{runtimeService: svc}
}

// AdaptMission creates a durable workflow and execution steps from an autonomous mission.
func (a *WorkflowAdapter) AdaptMission(ctx context.Context, m *economy.Mission) (*Workflow, error) {
	if m == nil {
		return nil, fmt.Errorf("mission is nil")
	}

	metadata := map[string]interface{}{
		"objective": m.Objective,
		"budget":    m.Budget,
		"currency":  m.Currency,
		"agent_id":  m.AgentID,
	}

	wf, err := a.runtimeService.CreateWorkflow(ctx, CreateWorkflowParams{
		TenantID:       m.OrganizationID,
		WorkflowType:   "AUTONOMOUS_MISSION",
		AggregateType:  "MISSION",
		AggregateID:    m.ID,
		IdempotencyKey: "wf_mission_" + m.ID,
		Priority:       1,
		Metadata:       metadata,
	})
	if err != nil {
		return nil, err
	}

	// Create initial durable steps
	stepTypes := []string{"DISCOVERY", "QUOTING", "SELECTION", "POLICY_EVALUATION", "TREASURY_RESERVATION", "EXECUTION", "VERIFICATION", "LEARNING"}
	for i, st := range stepTypes {
		_, _ = a.runtimeService.CreateStep(ctx, &ExecutionStep{
			WorkflowID:     wf.WorkflowID,
			TenantID:       wf.TenantID,
			StepType:       st,
			Sequence:       i + 1,
			State:          StepPending,
			IdempotencyKey: fmt.Sprintf("%s:%s:%d", wf.WorkflowID, st, i+1),
			TimeoutSeconds: 120,
			CreatedAt:      time.Now().UTC(),
			UpdatedAt:      time.Now().UTC(),
		})
	}

	return wf, nil
}

// AdaptSwarm creates a durable workflow and step graph from a multi-agent swarm.
func (a *WorkflowAdapter) AdaptSwarm(ctx context.Context, s *economy.Swarm, tasks []*economy.TaskNode) (*Workflow, error) {
	if s == nil {
		return nil, fmt.Errorf("swarm is nil")
	}

	metadata := map[string]interface{}{
		"objective":             s.Objective,
		"budget":                s.Budget,
		"orchestrator_agent_id": s.OrchestratorAgentID,
		"root_mission_id":       s.RootMissionID,
	}

	wf, err := a.runtimeService.CreateWorkflow(ctx, CreateWorkflowParams{
		TenantID:       s.OrganizationID,
		WorkflowType:   "SWARM_DAG",
		AggregateType:  "SWARM",
		AggregateID:    s.ID,
		IdempotencyKey: "wf_swarm_" + s.ID,
		Priority:       2,
		Metadata:       metadata,
	})
	if err != nil {
		return nil, err
	}

	for i, task := range tasks {
		inputs := map[string]interface{}{
			"role":        string(task.AssignedRole),
			"assigned_to": task.AssignedAgentID,
			"capability":  task.RequiredCapability,
			"allocated":   task.Budget,
		}
		_, _ = a.runtimeService.CreateStep(ctx, &ExecutionStep{
			WorkflowID:     wf.WorkflowID,
			TenantID:       wf.TenantID,
			StepType:       "SWARM_TASK",
			Sequence:       i + 1,
			State:          StepPending,
			IdempotencyKey: fmt.Sprintf("%s:%s", wf.WorkflowID, task.TaskID),
			TimeoutSeconds: 300,
			Inputs:         inputs,
			CreatedAt:      time.Now().UTC(),
			UpdatedAt:      time.Now().UTC(),
		})
	}

	return wf, nil
}
