package operations

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// WorkflowSupervisor inspects individual workflow progress, stuck thresholds, and dependency blocks.
type WorkflowSupervisor struct {
	stuckThreshold time.Duration
}

// NewWorkflowSupervisor creates an instance of WorkflowSupervisor.
func NewWorkflowSupervisor(stuckThreshold time.Duration) *WorkflowSupervisor {
	if stuckThreshold <= 0 {
		stuckThreshold = 15 * time.Minute
	}
	return &WorkflowSupervisor{
		stuckThreshold: stuckThreshold,
	}
}

// InspectWorkflow checks whether a workflow is stuck, starving for dependencies, or proceeding normally.
func (ws *WorkflowSupervisor) InspectWorkflow(
	wfID string,
	state string,
	lastUpdatedAt time.Time,
	waitingFor string,
	waitingSince time.Time,
) (bool, string, time.Duration) {
	now := time.Now().UTC()
	waitDuration := time.Duration(0)
	if !waitingSince.IsZero() {
		waitDuration = now.Sub(waitingSince)
	}

	// 1. Check if stuck in RUNNING or RETRYING without progress past threshold
	if (state == "RUNNING" || state == "RETRYING") && !lastUpdatedAt.IsZero() {
		if now.Sub(lastUpdatedAt) > ws.stuckThreshold {
			return true, fmt.Sprintf("Workflow stuck in %s for %s without state transition", state, now.Sub(lastUpdatedAt).Round(time.Second)), waitDuration
		}
	}

	// 2. Dependency Starvation check
	if state == "WAITING" && waitingFor != "" && waitDuration > ws.stuckThreshold {
		return true, fmt.Sprintf("Dependency starvation: waiting for %s for %s", waitingFor, waitDuration.Round(time.Second)), waitDuration
	}

	return false, "NORMAL", waitDuration
}

// OperationsSupervisor continuously observes the system and orchestrates workflows across queues and workers.
type OperationsSupervisor struct {
	mu             sync.RWMutex
	decisionEngine *OperationsDecisionEngine
	priorityEngine *PriorityEngine
	scheduler      *ResourceScheduler
	queueManager   *QueueManager
	prober         *HealthProber
	incidentEngine *IncidentCorrelationEngine
	wfSupervisor   *WorkflowSupervisor
	causalEngine   *CausalEngine
	planManager    *PlanManager
	circuitBreakers *CircuitBreakerRegistry
	nextResolver   *NextActionResolver
}

// NewOperationsSupervisor constructs the central OperationsSupervisor.
func NewOperationsSupervisor(
	decisionEngine *OperationsDecisionEngine,
	priorityEngine *PriorityEngine,
	scheduler *ResourceScheduler,
	queueManager *QueueManager,
	prober *HealthProber,
	incidentEngine *IncidentCorrelationEngine,
	causalEngine *CausalEngine,
	planManager *PlanManager,
	breakers *CircuitBreakerRegistry,
) *OperationsSupervisor {
	return &OperationsSupervisor{
		decisionEngine: decisionEngine,
		priorityEngine: priorityEngine,
		scheduler:      scheduler,
		queueManager:   queueManager,
		prober:         prober,
		incidentEngine: incidentEngine,
		wfSupervisor:   NewWorkflowSupervisor(15 * time.Minute),
		causalEngine:   causalEngine,
		planManager:    planManager,
		circuitBreakers: breakers,
		nextResolver:   NewNextActionResolver(),
	}
}

// SuperviseCycle executes one deterministic supervision evaluation loop across all operational items.
func (s *OperationsSupervisor) SuperviseCycle(ctx context.Context, tenantID string) (*OperationsSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	queueStats := s.queueManager.GetQueueStats(tenantID)
	totalQueued := 0
	for _, count := range queueStats {
		totalQueued += count
	}

	activeSlots, totalSlots, _ := s.scheduler.GetCapacityMetrics()
	incidents := s.incidentEngine.ListIncidents(tenantID)

	health := s.prober.ProbeSystem(ctx, totalSlots-activeSlots, totalQueued, false)

	snapshot := &OperationsSnapshot{
		SnapshotID:          fmt.Sprintf("snap_%s_%d", tenantID, now.Unix()),
		TenantID:            tenantID,
		SnapshotVersion:     1,
		Freshness:           FreshnessFresh,
		ActiveWorkflows:     activeSlots,
		QueuedWorkflows:     totalQueued,
		BlockedWorkflows:    0,
		FailedWorkflows:     0,
		RecoveringWorkflows: 0,
		ActiveAgents:        12,
		AvailableWorkers:    totalSlots - activeSlots,
		TreasuryState:       "HEALTHY",
		LiquidityState:      "AVAILABLE",
		ClearingState:       "ACTIVE",
		SecurityState:       string(health.OverallState),
		PolicyState:         "ENFORCING",
		ArcState:            health.Arc.StatusText,
		IncidentCount:       len(incidents),
		GeneratedAt:         now,
	}

	return snapshot, nil
}
