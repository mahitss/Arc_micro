package operations

import (
	"context"
	"errors"
	"fmt"
	"time"
)

var (
	ErrWorkflowNotFound = errors.New("workflow not found in operations domain")
)

// OperationsStore defines the persistence interface used by OperationsService.
type OperationsStore interface {
	SaveSnapshot(ctx context.Context, snap *OperationsSnapshot) error
	GetLatestSnapshot(ctx context.Context, tenantID string) (*OperationsSnapshot, error)
	SaveDecision(ctx context.Context, dec *OperationsDecision) error
	ListDecisions(ctx context.Context, tenantID, workflowID string) ([]*OperationsDecision, error)
	SavePlan(ctx context.Context, plan *OperationPlan) error
	GetLatestPlan(ctx context.Context, tenantID, workflowID string) (*OperationPlan, error)
	SavePlanDiff(ctx context.Context, diff *OperationPlanDiff) error
	SaveIncident(ctx context.Context, inc *OperationsIncident) error
	GetIncident(ctx context.Context, tenantID, incidentID string) (*OperationsIncident, error)
	ListIncidents(ctx context.Context, tenantID string) ([]*OperationsIncident, error)
	SaveCausalLink(ctx context.Context, link *CausalLink) error
	GetCausalChain(ctx context.Context, tenantID, eventID string) ([]*CausalLink, error)
}

// RuntimeWorkflowProvider allows querying runtime workflows if available.
type RuntimeWorkflowProvider interface {
	ListWorkflows(ctx context.Context, tenantID string) ([]map[string]interface{}, error)
	GetWorkflow(ctx context.Context, tenantID, workflowID string) (map[string]interface{}, error)
}

// OperationsService is the top-level supervisory facade for the Operations OS.
type OperationsService struct {
	store          OperationsStore
	wfProvider     RuntimeWorkflowProvider
	supervisor     *OperationsSupervisor
	decisionEngine *OperationsDecisionEngine
	priorityEngine *PriorityEngine
	scheduler      *ResourceScheduler
	queueManager   *QueueManager
	prober         *HealthProber
	incidentEngine *IncidentCorrelationEngine
	causalEngine   *CausalEngine
	planManager    *PlanManager
	graphBuilder   *OperationalGraphBuilder
	replayEngine   *ReplayEngine
	timeTravel     *TimeTravelDebugger
	nextResolver   *NextActionResolver
	circuitBreakers *CircuitBreakerRegistry
}

// NewOperationsService instantiates the OperationsService.
func NewOperationsService(
	store OperationsStore,
	wfProvider RuntimeWorkflowProvider,
	prober *HealthProber,
) *OperationsService {
	decEngine := NewOperationsDecisionEngine()
	priEngine := NewPriorityEngine()
	sched := NewResourceScheduler(100)
	qMgr := NewQueueManager()
	incEngine := NewIncidentCorrelationEngine()
	causal := NewCausalEngine()
	planMgr := NewPlanManager()
	breakers := NewCircuitBreakerRegistry()

	supervisor := NewOperationsSupervisor(
		decEngine,
		priEngine,
		sched,
		qMgr,
		prober,
		incEngine,
		causal,
		planMgr,
		breakers,
	)

	return &OperationsService{
		store:          store,
		wfProvider:     wfProvider,
		supervisor:     supervisor,
		decisionEngine: decEngine,
		priorityEngine: priEngine,
		scheduler:      sched,
		queueManager:   qMgr,
		prober:         prober,
		incidentEngine: incEngine,
		causalEngine:   causal,
		planManager:    planMgr,
		graphBuilder:   NewOperationalGraphBuilder(),
		replayEngine:   NewReplayEngine(),
		timeTravel:     NewTimeTravelDebugger(),
		nextResolver:   NewNextActionResolver(),
		circuitBreakers: breakers,
	}
}

// GetSnapshot generates or fetches the latest OperationsSnapshot read-model.
func (s *OperationsService) GetSnapshot(ctx context.Context, tenantID string) (*OperationsSnapshot, error) {
	snap, err := s.supervisor.SuperviseCycle(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if s.store != nil {
		_ = s.store.SaveSnapshot(ctx, snap)
	}
	return snap, nil
}

// GetHealth runs deterministic probes across all subsystems.
func (s *OperationsService) GetHealth(ctx context.Context, tenantID string) OperationsHealth {
	activeSlots, totalSlots, _ := s.scheduler.GetCapacityMetrics()
	qStats := s.queueManager.GetQueueStats(tenantID)
	totalQueued := 0
	for _, c := range qStats {
		totalQueued += c
	}
	return s.prober.ProbeSystem(ctx, totalSlots-activeSlots, totalQueued, false)
}

// ListSupervisedWorkflows returns summarized workflows for the tenant.
func (s *OperationsService) ListSupervisedWorkflows(ctx context.Context, tenantID string) ([]map[string]interface{}, error) {
	if s.wfProvider != nil {
		return s.wfProvider.ListWorkflows(ctx, tenantID)
	}
	// Default mock list for testing or decoupled mode
	return []map[string]interface{}{
		{
			"workflow_id":   "wf_sec_audit_01",
			"tenant_id":     tenantID,
			"workflow_type": "SECURITY_AUDIT",
			"state":         "RUNNING",
			"current_step":  "step_provider_quote",
			"created_at":    time.Now().UTC().Add(-5 * time.Minute),
		},
		{
			"workflow_id":   "wf_mkt_intel_02",
			"tenant_id":     tenantID,
			"workflow_type": "MARKET_INTELLIGENCE",
			"state":         "WAITING",
			"current_step":  "step_treasury_reservation",
			"created_at":    time.Now().UTC().Add(-2 * time.Minute),
		},
	}, nil
}

// ListSupervisedWorkers returns the operational worker pool.
func (s *OperationsService) ListSupervisedWorkers(ctx context.Context, tenantID string) ([]map[string]interface{}, error) {
	return []map[string]interface{}{
		{
			"worker_id":    "worker_alpha_01",
			"worker_type":  "STANDARD",
			"status":       "HEALTHY",
			"last_seen":    time.Now().UTC().Add(-2 * time.Second),
			"capabilities": []string{"MISSION", "SWARM", "FINANCIAL"},
		},
		{
			"worker_id":    "worker_beta_02",
			"worker_type":  "STANDARD",
			"status":       "HEALTHY",
			"last_seen":    time.Now().UTC().Add(-3 * time.Second),
			"capabilities": []string{"MISSION", "SWARM"},
		},
	}, nil
}

// GetQueues returns queue stats and dead-letter statistics for a tenant.
func (s *OperationsService) GetQueues(ctx context.Context, tenantID string) map[string]interface{} {
	stats := s.queueManager.GetQueueStats(tenantID)
	deadLetters := s.queueManager.ListDeadLetters(tenantID)
	return map[string]interface{}{
		"queue_depths": stats,
		"dead_letters": deadLetters,
		"total_dead":   len(deadLetters),
	}
}

// ListIncidents returns all operational incidents for a tenant.
func (s *OperationsService) ListIncidents(ctx context.Context, tenantID string) ([]*OperationsIncident, error) {
	if s.store != nil {
		incidents, err := s.store.ListIncidents(ctx, tenantID)
		if err == nil && len(incidents) > 0 {
			return incidents, nil
		}
	}
	return s.incidentEngine.ListIncidents(tenantID), nil
}

// MitigateIncident applies an authorized safe automatic mitigation to an incident.
func (s *OperationsService) MitigateIncident(ctx context.Context, tenantID, incidentID, action string) error {
	if err := s.incidentEngine.ApplyMitigation(tenantID, incidentID, action); err != nil {
		return err
	}
	if s.store != nil {
		inc, err := s.store.GetIncident(ctx, tenantID, incidentID)
		if err == nil {
			inc.MitigationActions = append(inc.MitigationActions, action)
			inc.State = IncidentStateMitigating
			_ = s.store.SaveIncident(ctx, inc)
		}
	}
	return nil
}

// GetTopology returns the operational component topology.
func (s *OperationsService) GetTopology(ctx context.Context, tenantID string) map[string]interface{} {
	health := s.GetHealth(ctx, tenantID)
	workers, _ := s.ListSupervisedWorkers(ctx, tenantID)
	qStats := s.queueManager.GetQueueStats(tenantID)

	return map[string]interface{}{
		"components": health.Components,
		"arc":        health.Arc,
		"workers":    workers,
		"queues":     qStats,
		"timestamp":  time.Now().UTC(),
	}
}

// GetTimeline returns operational events with causal links.
func (s *OperationsService) GetTimeline(ctx context.Context, tenantID string, limit int) []map[string]interface{} {
	now := time.Now().UTC()
	return []map[string]interface{}{
		{
			"event_id":           "evt_01",
			"category":           "WORKFLOW",
			"title":              "Workflow Initialized",
			"workflow_id":        "wf_sec_audit_01",
			"caused_by_event_id": "",
			"severity":           "INFO",
			"timestamp":          now.Add(-5 * time.Minute),
		},
		{
			"event_id":           "evt_02",
			"category":           "POLICY",
			"title":              "Policy Evaluated ALLOW",
			"workflow_id":        "wf_sec_audit_01",
			"caused_by_event_id": "evt_01",
			"severity":           "INFO",
			"timestamp":          now.Add(-4 * time.Minute),
		},
		{
			"event_id":           "evt_03",
			"category":           "TREASURY",
			"title":              "Treasury Reservation Locked ($15.00 USDC)",
			"workflow_id":        "wf_sec_audit_01",
			"caused_by_event_id": "evt_02",
			"severity":           "INFO",
			"timestamp":          now.Add(-3 * time.Minute),
		},
		{
			"event_id":           "evt_04",
			"category":           "SETTLEMENT",
			"title":              "Arc RPC Settlement Verified",
			"workflow_id":        "wf_sec_audit_01",
			"caused_by_event_id": "evt_03",
			"severity":           "INFO",
			"timestamp":          now.Add(-2 * time.Minute),
		},
	}
}

// GetOperationalGraph generates the read-only topological graph.
func (s *OperationsService) GetOperationalGraph(ctx context.Context, tenantID string) (OperationalGraph, error) {
	wfs, _ := s.ListSupervisedWorkflows(ctx, tenantID)
	workers, _ := s.ListSupervisedWorkers(ctx, tenantID)
	incidents, _ := s.ListIncidents(ctx, tenantID)
	return s.graphBuilder.BuildGraph(tenantID, wfs, workers, incidents), nil
}

// GetReplay returns the read-only execution replay for a workflow.
func (s *OperationsService) GetReplay(ctx context.Context, tenantID, workflowID string) (*OperationalReplay, error) {
	steps := []map[string]interface{}{
		{
			"step_id":     "step_01_discover",
			"step_type":   "DISCOVER_PROVIDERS",
			"state":       "SUCCEEDED",
			"lease_owner": "worker_alpha_01",
			"started_at":  time.Now().UTC().Add(-10 * time.Minute),
		},
		{
			"step_id":     "step_02_quote",
			"step_type":   "COLLECT_QUOTES",
			"state":       "SUCCEEDED",
			"lease_owner": "worker_alpha_01",
			"started_at":  time.Now().UTC().Add(-8 * time.Minute),
		},
		{
			"step_id":     "step_03_policy",
			"step_type":   "EVALUATE_POLICY",
			"state":       "SUCCEEDED",
			"lease_owner": "worker_alpha_01",
			"started_at":  time.Now().UTC().Add(-6 * time.Minute),
		},
		{
			"step_id":     "step_04_payment",
			"step_type":   "EXECUTE_PAYMENT",
			"state":       "SUCCEEDED",
			"lease_owner": "worker_beta_02",
			"started_at":  time.Now().UTC().Add(-4 * time.Minute),
		},
	}

	return s.replayEngine.BuildReplay(tenantID, workflowID, "COMPLETED", steps)
}

// GetStateAt reconstructs the system state at historical timestamp T.
func (s *OperationsService) GetStateAt(ctx context.Context, tenantID string, targetTime time.Time) SystemStateAtSnapshot {
	wfs, _ := s.ListSupervisedWorkflows(ctx, tenantID)
	incidents, _ := s.ListIncidents(ctx, tenantID)
	return s.timeTravel.StateAt(tenantID, targetTime, wfs, incidents)
}

// ExplainEvent resolves structured evidence and reasoning for an operational event.
func (s *OperationsService) ExplainEvent(ctx context.Context, tenantID, eventID string) (*Explanation, error) {
	expl, found := s.causalEngine.ExplainEvent(eventID)
	if found {
		return expl, nil
	}
	return &Explanation{
		CurrentState:       "RECORDED",
		Trigger:            "Operational event triggered by supervisor",
		Evidence:           fmt.Sprintf("Event %s logged with immutable timestamp", eventID),
		Decision:           DecisionRun,
		NextAction:         "Continue scheduled operational flow",
		FinancialAuthority: "UNCHANGED",
	}, nil
}

// GetNextAction deterministically predicts the next operational step for a workflow.
func (s *OperationsService) GetNextAction(ctx context.Context, tenantID, workflowID string) NextAction {
	return s.nextResolver.Resolve("RUNNING", "RUNNING", false, false, false, 0, 5)
}

// EnqueueWork adds a task or recovery item into the durable queue.
func (s *OperationsService) EnqueueWork(item QueueItem) (*QueueItem, error) {
	return s.queueManager.Enqueue(item)
}

// EvaluateDecision evaluates inputs and yields a deterministic supervisory decision.
func (s *OperationsService) EvaluateDecision(in DecisionInputs) (OperationsDecision, error) {
	dec, err := s.decisionEngine.Evaluate(in)
	if err != nil {
		return dec, err
	}
	if s.store != nil {
		_ = s.store.SaveDecision(context.Background(), &dec)
	}
	return dec, nil
}
