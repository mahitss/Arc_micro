package runtime

import (
	"context"
	"errors"
	"testing"
	"time"
)

// MockStore implements the store interfaces for runtime unit tests.
type mockStore struct {
	workflows   map[string]*Workflow
	steps       map[string]*ExecutionStep
	leases      map[string]*Lease
	checkpoints map[string][]*Checkpoint
	workers     map[string]*Worker
	decisions   map[string][]*RuntimeDecision
	outbox      map[string]*OutboxEvent
	inbox       map[string]*InboxEvent
	jobs        map[string]*ScheduledJob
	incidents   map[string]*RuntimeIncident
}

func newMockStore() *mockStore {
	return &mockStore{
		workflows:   make(map[string]*Workflow),
		steps:       make(map[string]*ExecutionStep),
		leases:      make(map[string]*Lease),
		checkpoints: make(map[string][]*Checkpoint),
		workers:     make(map[string]*Worker),
		decisions:   make(map[string][]*RuntimeDecision),
		outbox:      make(map[string]*OutboxEvent),
		inbox:       make(map[string]*InboxEvent),
		jobs:        make(map[string]*ScheduledJob),
		incidents:   make(map[string]*RuntimeIncident),
	}
}

func (m *mockStore) SaveWorkflow(ctx context.Context, w *Workflow) error {
	cp := *w
	m.workflows[w.WorkflowID] = &cp
	return nil
}

func (m *mockStore) GetWorkflow(ctx context.Context, workflowID string) (*Workflow, error) {
	w, exists := m.workflows[workflowID]
	if !exists {
		return nil, ErrWorkflowNotFound
	}
	cp := *w
	return &cp, nil
}

func (m *mockStore) ListWorkflows(ctx context.Context, tenantID string, state WorkflowState, limit int) ([]*Workflow, error) {
	res := make([]*Workflow, 0)
	for _, w := range m.workflows {
		if tenantID != "" && w.TenantID != tenantID {
			continue
		}
		if state != "" && w.State != state {
			continue
		}
		cp := *w
		res = append(res, &cp)
	}
	return res, nil
}

func (m *mockStore) UpdateWorkflowState(ctx context.Context, workflowID string, expectedVersion int, toState WorkflowState, failureReason string) error {
	w, exists := m.workflows[workflowID]
	if !exists {
		return ErrWorkflowNotFound
	}
	if w.Version != expectedVersion {
		return ErrInv111
	}
	w.State = toState
	w.Version++
	w.FailureReason = failureReason
	w.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *mockStore) SaveStep(ctx context.Context, s *ExecutionStep) error {
	cp := *s
	key := s.WorkflowID + ":" + s.StepID
	m.steps[key] = &cp
	return nil
}

func (m *mockStore) GetStep(ctx context.Context, workflowID, stepID string) (*ExecutionStep, error) {
	key := workflowID + ":" + stepID
	s, exists := m.steps[key]
	if !exists {
		return nil, ErrStepNotFound
	}
	cp := *s
	return &cp, nil
}

func (m *mockStore) ListSteps(ctx context.Context, workflowID string) ([]*ExecutionStep, error) {
	res := make([]*ExecutionStep, 0)
	for _, s := range m.steps {
		if workflowID == "" || s.WorkflowID == workflowID {
			cp := *s
			res = append(res, &cp)
		}
	}
	return res, nil
}

func (m *mockStore) UpdateStep(ctx context.Context, s *ExecutionStep) error {
	key := s.WorkflowID + ":" + s.StepID
	cp := *s
	m.steps[key] = &cp
	return nil
}

func (m *mockStore) SaveIncident(ctx context.Context, inc *RuntimeIncident) error {
	cp := *inc
	m.incidents[inc.IncidentID] = &cp
	return nil
}

func (m *mockStore) GetIncident(ctx context.Context, incidentID string) (*RuntimeIncident, error) {
	inc, exists := m.incidents[incidentID]
	if !exists {
		return nil, ErrIncidentNotFound
	}
	cp := *inc
	return &cp, nil
}

func (m *mockStore) ListIncidents(ctx context.Context, tenantID, state string) ([]*RuntimeIncident, error) {
	res := make([]*RuntimeIncident, 0)
	for _, inc := range m.incidents {
		if tenantID != "" && inc.TenantID != tenantID {
			continue
		}
		if state != "" && inc.State != state {
			continue
		}
		cp := *inc
		res = append(res, &cp)
	}
	return res, nil
}

func (m *mockStore) UpdateIncident(ctx context.Context, inc *RuntimeIncident) error {
	cp := *inc
	m.incidents[inc.IncidentID] = &cp
	return nil
}

func (m *mockStore) SaveLease(ctx context.Context, l *Lease) error {
	key := l.ResourceType + ":" + l.ResourceID
	cp := *l
	m.leases[key] = &cp
	return nil
}

func (m *mockStore) GetLease(ctx context.Context, resourceType, resourceID string) (*Lease, error) {
	key := resourceType + ":" + resourceID
	l, exists := m.leases[key]
	if !exists {
		return nil, ErrLeaseNotFound
	}
	cp := *l
	return &cp, nil
}

func (m *mockStore) DeleteLease(ctx context.Context, leaseID string) error {
	for k, l := range m.leases {
		if l.LeaseID == leaseID {
			delete(m.leases, k)
			break
		}
	}
	return nil
}

func (m *mockStore) ListExpiredLeases(ctx context.Context, now time.Time) ([]*Lease, error) {
	res := make([]*Lease, 0)
	for _, l := range m.leases {
		if l.ExpiresAt.Before(now) {
			cp := *l
			res = append(res, &cp)
		}
	}
	return res, nil
}

func (m *mockStore) SaveCheckpoint(ctx context.Context, cp *Checkpoint) error {
	clone := *cp
	m.checkpoints[cp.WorkflowID] = append(m.checkpoints[cp.WorkflowID], &clone)
	return nil
}

func (m *mockStore) GetLatestCheckpoint(ctx context.Context, workflowID string) (*Checkpoint, error) {
	list, exists := m.checkpoints[workflowID]
	if !exists || len(list) == 0 {
		return nil, nil
	}
	cp := *list[len(list)-1]
	return &cp, nil
}

func (m *mockStore) ListCheckpoints(ctx context.Context, workflowID string) ([]*Checkpoint, error) {
	list, exists := m.checkpoints[workflowID]
	if !exists {
		return []*Checkpoint{}, nil
	}
	res := make([]*Checkpoint, len(list))
	for i, c := range list {
		clone := *c
		res[len(list)-1-i] = &clone
	}
	return res, nil
}

func (m *mockStore) SaveWorker(ctx context.Context, w *Worker) error {
	cp := *w
	m.workers[w.WorkerID] = &cp
	return nil
}

func (m *mockStore) GetWorker(ctx context.Context, workerID string) (*Worker, error) {
	w, exists := m.workers[workerID]
	if !exists {
		return nil, ErrWorkerNotFound
	}
	cp := *w
	return &cp, nil
}

func (m *mockStore) ListWorkers(ctx context.Context) ([]*Worker, error) {
	res := make([]*Worker, 0, len(m.workers))
	for _, w := range m.workers {
		cp := *w
		res = append(res, &cp)
	}
	return res, nil
}

func (m *mockStore) UpdateWorkerHeartbeat(ctx context.Context, workerID string, status WorkerStatus, heartbeat time.Time) error {
	w, exists := m.workers[workerID]
	if !exists {
		return ErrWorkerNotFound
	}
	w.Status = status
	w.HeartbeatAt = heartbeat
	w.LastSeen = heartbeat
	return nil
}

func (m *mockStore) SaveDecision(ctx context.Context, d *RuntimeDecision) error {
	cp := *d
	m.decisions[d.WorkflowID] = append(m.decisions[d.WorkflowID], &cp)
	return nil
}

func (m *mockStore) ListDecisions(ctx context.Context, workflowID string) ([]*RuntimeDecision, error) {
	list, exists := m.decisions[workflowID]
	if !exists {
		return []*RuntimeDecision{}, nil
	}
	res := make([]*RuntimeDecision, len(list))
	for i, d := range list {
		cp := *d
		res[i] = &cp
	}
	return res, nil
}

func (m *mockStore) SaveOutboxEvent(ctx context.Context, e *OutboxEvent) error {
	cp := *e
	m.outbox[e.EventID] = &cp
	return nil
}

func (m *mockStore) ListPendingOutboxEvents(ctx context.Context, limit int) ([]*OutboxEvent, error) {
	now := time.Now().UTC()
	res := make([]*OutboxEvent, 0)
	for _, e := range m.outbox {
		if (e.Status == "PENDING" || e.Status == "RETRYING") && !e.NextAttemptAt.After(now) {
			cp := *e
			res = append(res, &cp)
		}
	}
	return res, nil
}

func (m *mockStore) MarkOutboxEventDelivered(ctx context.Context, eventID string) error {
	e, exists := m.outbox[eventID]
	if !exists {
		return errors.New("outbox event not found")
	}
	now := time.Now().UTC()
	e.Status = "DELIVERED"
	e.DeliveredAt = &now
	return nil
}

func (m *mockStore) MarkOutboxEventFailed(ctx context.Context, eventID, errorMsg string, nextAttempt time.Time) error {
	e, exists := m.outbox[eventID]
	if !exists {
		return errors.New("outbox event not found")
	}
	e.Status = "RETRYING"
	e.Attempt++
	e.ErrorMessage = errorMsg
	e.NextAttemptAt = nextAttempt
	return nil
}

func (m *mockStore) SaveInboxEvent(ctx context.Context, e *InboxEvent) error {
	cp := *e
	m.inbox[e.IdempotencyKey] = &cp
	return nil
}

func (m *mockStore) GetInboxEvent(ctx context.Context, idempotencyKey string) (*InboxEvent, error) {
	e, exists := m.inbox[idempotencyKey]
	if !exists {
		return nil, nil
	}
	cp := *e
	return &cp, nil
}

func (m *mockStore) MarkInboxEventProcessed(ctx context.Context, inboxID string) error {
	for _, e := range m.inbox {
		if e.InboxID == inboxID {
			now := time.Now().UTC()
			e.Status = "PROCESSED"
			e.ProcessedAt = &now
			break
		}
	}
	return nil
}

func (m *mockStore) SaveScheduledJob(ctx context.Context, job *ScheduledJob) error {
	cp := *job
	m.jobs[job.JobID] = &cp
	return nil
}

func (m *mockStore) ListDueScheduledJobs(ctx context.Context, now time.Time, limit int) ([]*ScheduledJob, error) {
	res := make([]*ScheduledJob, 0)
	for _, j := range m.jobs {
		if j.State == "SCHEDULED" && !j.ScheduledAt.After(now) {
			cp := *j
			res = append(res, &cp)
		}
	}
	return res, nil
}

func (m *mockStore) MarkJobExecuted(ctx context.Context, jobID string, executedAt time.Time) error {
	j, exists := m.jobs[jobID]
	if !exists {
		return errors.New("scheduled job not found")
	}
	j.State = "EXECUTED"
	j.ExecutedAt = &executedAt
	return nil
}

func (m *mockStore) CancelJob(ctx context.Context, jobID string) error {
	j, exists := m.jobs[jobID]
	if !exists {
		return errors.New("scheduled job not found")
	}
	j.State = "CANCELLED"
	return nil
}

// Tests

func TestRuntime_WorkflowLifecycleAndVersionChecks(t *testing.T) {
	ctx := context.Background()
	store := newMockStore()
	svc := NewService(store, store, store, store, store, store, store, store)

	wf, err := svc.CreateWorkflow(ctx, CreateWorkflowParams{
		TenantID:       "org_test",
		WorkflowType:   "AUTONOMOUS_MISSION",
		AggregateType:  "MISSION",
		AggregateID:    "msn_001",
		IdempotencyKey: "idem_create_wf_01",
	})
	if err != nil {
		t.Fatalf("unexpected error creating workflow: %v", err)
	}

	if wf.State != WorkflowReady {
		t.Errorf("expected initial state READY, got %s", wf.State)
	}
	if wf.Version != 1 {
		t.Errorf("expected initial version 1, got %d", wf.Version)
	}

	// Pause workflow
	pausedWf, err := svc.PauseWorkflow(ctx, "org_test", wf.WorkflowID, "maintenance", "idem_pause_01")
	if err != nil {
		t.Fatalf("unexpected error pausing workflow: %v", err)
	}
	if pausedWf.State != WorkflowPaused {
		t.Errorf("expected state PAUSED, got %s", pausedWf.State)
	}
	if pausedWf.Version != 2 {
		t.Errorf("expected version 2 after pause, got %d", pausedWf.Version)
	}

	// Resume workflow
	resumedWf, err := svc.ResumeWorkflow(ctx, "org_test", wf.WorkflowID, "idem_resume_01")
	if err != nil {
		t.Fatalf("unexpected error resuming workflow: %v", err)
	}
	if resumedWf.State != WorkflowRunning {
		t.Errorf("expected state RUNNING, got %s", resumedWf.State)
	}
	if resumedWf.Version != 3 {
		t.Errorf("expected version 3 after resume, got %d", resumedWf.Version)
	}

	// Cancel workflow
	cancelledWf, err := svc.CancelWorkflow(ctx, "org_test", wf.WorkflowID, "user cancelled", "idem_cancel_01")
	if err != nil {
		t.Fatalf("unexpected error cancelling workflow: %v", err)
	}
	if cancelledWf.State != WorkflowCancelled {
		t.Errorf("expected state CANCELLED, got %s", cancelledWf.State)
	}

	// Terminal state cannot transition to RUNNING (INV-111)
	_, err = svc.ResumeWorkflow(ctx, "org_test", wf.WorkflowID, "idem_resume_invalid")
	if err == nil {
		t.Errorf("expected error resuming cancelled workflow, got nil")
	}
}

func TestRuntime_StepClaimFencingAndCompletion(t *testing.T) {
	ctx := context.Background()
	store := newMockStore()
	svc := NewService(store, store, store, store, store, store, store, store)

	wf, _ := svc.CreateWorkflow(ctx, CreateWorkflowParams{
		TenantID:       "org_test",
		WorkflowType:   "TEST",
		AggregateType:  "TEST",
		AggregateID:    "test_001",
		IdempotencyKey: "idem_wf_02",
	})

	step, err := svc.CreateStep(ctx, &ExecutionStep{
		WorkflowID:     wf.WorkflowID,
		TenantID:       wf.TenantID,
		StepType:       "DISCOVERY",
		Sequence:       1,
		IdempotencyKey: "idem_step_01",
		TimeoutSeconds: 30,
	})
	if err != nil {
		t.Fatalf("unexpected error creating step: %v", err)
	}

	// Worker 1 claims step
	claimedStep, lease, err := svc.ClaimStep(ctx, "org_test", wf.WorkflowID, step.StepID, "worker_1", 10*time.Second)
	if err != nil {
		t.Fatalf("unexpected error claiming step: %v", err)
	}
	if claimedStep.State != StepRunning {
		t.Errorf("expected step state RUNNING, got %s", claimedStep.State)
	}
	if lease.FencingToken != 1 {
		t.Errorf("expected fencing token 1, got %d", lease.FencingToken)
	}

	// Worker 2 attempts to claim active step -> must fail with ErrLeaseAlreadyHeld
	_, _, err = svc.ClaimStep(ctx, "org_test", wf.WorkflowID, step.StepID, "worker_2", 10*time.Second)
	if !errors.Is(err, ErrLeaseAlreadyHeld) {
		t.Errorf("expected ErrLeaseAlreadyHeld, got %v", err)
	}

	// Worker 1 completes step with correct fencing token
	outputs := map[string]interface{}{"provider_selected": "agent_alpha"}
	err = svc.CompleteStep(ctx, "org_test", wf.WorkflowID, step.StepID, "worker_1", lease.FencingToken, outputs)
	if err != nil {
		t.Fatalf("unexpected error completing step: %v", err)
	}

	finalStep, _ := store.GetStep(ctx, wf.WorkflowID, step.StepID)
	if finalStep.State != StepSucceeded {
		t.Errorf("expected SUCCEEDED state, got %s", finalStep.State)
	}
	if finalStep.OutputHash == "" {
		t.Errorf("expected non-empty output hash")
	}
}

func TestRuntime_FencingTokenRejectionOfStaleWorker(t *testing.T) {
	ctx := context.Background()
	store := newMockStore()
	svc := NewService(store, store, store, store, store, store, store, store)

	wf, _ := svc.CreateWorkflow(ctx, CreateWorkflowParams{
		TenantID:       "org_test",
		WorkflowType:   "TEST",
		AggregateType:  "TEST",
		AggregateID:    "test_002",
		IdempotencyKey: "idem_wf_03",
	})

	step, _ := svc.CreateStep(ctx, &ExecutionStep{
		WorkflowID:     wf.WorkflowID,
		TenantID:       wf.TenantID,
		StepType:       "TASK",
		Sequence:       1,
		IdempotencyKey: "idem_step_02",
	})

	// Worker 1 claims with 1 millisecond lease
	_, lease1, _ := svc.ClaimStep(ctx, "org_test", wf.WorkflowID, step.StepID, "worker_1", 1*time.Millisecond)
	time.Sleep(5 * time.Millisecond) // Allow lease to expire

	// Worker 2 pre-empts expired lease -> fencing token advances to 2
	_, lease2, err := svc.ClaimStep(ctx, "org_test", wf.WorkflowID, step.StepID, "worker_2", 10*time.Second)
	if err != nil {
		t.Fatalf("unexpected error on pre-emption: %v", err)
	}
	if lease2.FencingToken != 2 {
		t.Errorf("expected incremented fencing token 2, got %d", lease2.FencingToken)
	}

	// Worker 1 wakes up and attempts to commit with stale fencing token 1 -> MUST BE REJECTED (INV-101)
	err = svc.CompleteStep(ctx, "org_test", wf.WorkflowID, step.StepID, "worker_1", lease1.FencingToken, nil)
	if !errors.Is(err, ErrInv101) {
		t.Errorf("expected ErrInv101 on stale worker commit, got %v", err)
	}

	// Worker 2 commits with valid token 2 -> succeeds
	err = svc.CompleteStep(ctx, "org_test", wf.WorkflowID, step.StepID, "worker_2", lease2.FencingToken, nil)
	if err != nil {
		t.Fatalf("unexpected error from legitimate worker 2: %v", err)
	}
}

func TestRuntime_FinancialBarrierValidation(t *testing.T) {
	ctx := context.Background()
	fb := NewFinancialBarrier()

	validExpiry := time.Now().UTC().Add(1 * time.Hour)
	expiredTime := time.Now().UTC().Add(-1 * time.Hour)

	// Case 1: Valid params -> passes
	validParams := FinancialBarrierParams{
		WorkflowState:        WorkflowRunning,
		PolicySnapshotID:     "pol_v8",
		PolicyHash:           "hash_v8",
		CurrentPolicyHash:    "hash_v8",
		RequiresApproval:     true,
		IsApproved:           true,
		ApprovalExpiresAt:    &validExpiry,
		ReservationID:        "res_01",
		ReservationExpiresAt: &validExpiry,
		IdempotencyKey:       "idem_barrier_01",
		CallerComponent:      "AUTHORIZED_GATEWAY_CLIENT",
	}
	if err := fb.Verify(ctx, validParams); err != nil {
		t.Errorf("unexpected error on valid barrier params: %v", err)
	}

	// Case 2: Workflow not running -> fails
	invalidStateParams := validParams
	invalidStateParams.WorkflowState = WorkflowPaused
	if err := fb.Verify(ctx, invalidStateParams); !errors.Is(err, ErrBarrierWorkflowNotRunning) {
		t.Errorf("expected ErrBarrierWorkflowNotRunning, got %v", err)
	}

	// Case 3: Policy hash changed -> fails (INV-111)
	driftedPolicyParams := validParams
	driftedPolicyParams.CurrentPolicyHash = "hash_v9_changed"
	if err := fb.Verify(ctx, driftedPolicyParams); !errors.Is(err, ErrBarrierPolicyInvalid) {
		t.Errorf("expected ErrBarrierPolicyInvalid, got %v", err)
	}

	// Case 4: Approval expired -> fails (INV-114)
	expiredApprovalParams := validParams
	expiredApprovalParams.ApprovalExpiresAt = &expiredTime
	if err := fb.Verify(ctx, expiredApprovalParams); !errors.Is(err, ErrBarrierApprovalRequired) {
		t.Errorf("expected ErrBarrierApprovalRequired, got %v", err)
	}

	// Case 5: Treasury reservation expired -> fails (INV-105)
	expiredTreasuryParams := validParams
	expiredTreasuryParams.ReservationExpiresAt = &expiredTime
	if err := fb.Verify(ctx, expiredTreasuryParams); !errors.Is(err, ErrBarrierTreasuryInvalid) {
		t.Errorf("expected ErrBarrierTreasuryInvalid, got %v", err)
	}

	// Case 6: Direct vault call attempt by runtime -> fails (INV-108)
	directVaultParams := validParams
	directVaultParams.CallerComponent = "DURABLE_RUNTIME"
	if err := fb.Verify(ctx, directVaultParams); !errors.Is(err, ErrInv108) {
		t.Errorf("expected ErrInv108 on direct vault call, got %v", err)
	}

	// Case 7: Simulation workflow targeting live execution -> fails (INV-107)
	simLeakParams := validParams
	simLeakParams.IsSimulation = true
	simLeakParams.IsLiveTarget = true
	if err := fb.Verify(ctx, simLeakParams); !errors.Is(err, ErrBarrierSimulationLeak) {
		t.Errorf("expected ErrBarrierSimulationLeak, got %v", err)
	}
}

func TestRuntime_CrashRecoveryEngine(t *testing.T) {
	ctx := context.Background()
	store := newMockStore()
	svc := NewService(store, store, store, store, store, store, store, store)

	wf, _ := svc.CreateWorkflow(ctx, CreateWorkflowParams{
		TenantID:       "org_test",
		WorkflowType:   "MISSION",
		AggregateType:  "MISSION",
		AggregateID:    "msn_crash_01",
		IdempotencyKey: "idem_crash_01",
	})

	// Step 1: Normal step with expired lease
	past := time.Now().UTC().Add(-10 * time.Minute)
	s1, _ := svc.CreateStep(ctx, &ExecutionStep{
		WorkflowID:     wf.WorkflowID,
		TenantID:       wf.TenantID,
		StepType:       "DISCOVERY",
		Sequence:       1,
		State:          StepRunning,
		LeaseOwner:     "dead_worker_01",
		LeaseExpiresAt: &past,
		IdempotencyKey: "idem_step_c1",
	})

	// Step 2: Financial payment step with AMBIGUOUS output
	s2, _ := svc.CreateStep(ctx, &ExecutionStep{
		WorkflowID:     wf.WorkflowID,
		TenantID:       wf.TenantID,
		StepType:       "PAYMENT",
		Sequence:       2,
		State:          StepRunning,
		LeaseOwner:     "dead_worker_01",
		LeaseExpiresAt: &past,
		IdempotencyKey: "idem_step_c2",
		Outputs: map[string]interface{}{
			"blockchain_status": "AMBIGUOUS",
		},
	})

	recoveryEng := NewRuntimeRecoveryEngine(store, svc.checkpointMgr, svc.leaseMgr, svc.decLogger)
	res, err := recoveryEng.RecoverWorkflow(ctx, wf.WorkflowID)
	if err != nil {
		t.Fatalf("unexpected error recovering workflow: %v", err)
	}

	if res.RecoveredStepsCount != 2 {
		t.Errorf("expected 2 recovered steps, got %d", res.RecoveredStepsCount)
	}
	if res.RequeuedSteps != 1 {
		t.Errorf("expected 1 requeued safe step, got %d", res.RequeuedSteps)
	}
	if res.ReconciledSteps != 1 {
		t.Errorf("expected 1 reconciled ambiguous payment step, got %d", res.ReconciledSteps)
	}
	if !res.AmbiguousPayment {
		t.Errorf("expected ambiguous payment flag true")
	}

	// Verify Step 1 was requeued to PENDING
	step1, _ := store.GetStep(ctx, wf.WorkflowID, s1.StepID)
	if step1.State != StepPending {
		t.Errorf("expected Step 1 to be PENDING, got %s", step1.State)
	}

	// Verify Step 2 was routed to WAITING for reconciliation (NOT blindly rebroadcast)
	step2, _ := store.GetStep(ctx, wf.WorkflowID, s2.StepID)
	if step2.State != StepWaiting {
		t.Errorf("expected Step 2 to be WAITING, got %s", step2.State)
	}
}

func TestRuntime_InboxDeduplication(t *testing.T) {
	ctx := context.Background()
	store := newMockStore()
	om := NewOutboxManager(store, store)

	// First callback delivery
	_, isNew, err := om.IngestExternalEvent(ctx, "idem_cb_99", "org_test", "agent_beta", "RESULT_SUBMITTED", map[string]string{"result": "success"})
	if err != nil {
		t.Fatalf("unexpected error ingesting event: %v", err)
	}
	if !isNew {
		t.Errorf("expected first event to be new")
	}

	// Duplicate callback delivery (INV-112)
	_, isNew2, err := om.IngestExternalEvent(ctx, "idem_cb_99", "org_test", "agent_beta", "RESULT_SUBMITTED", map[string]string{"result": "success"})
	if err != nil {
		t.Fatalf("unexpected error ingesting duplicate event: %v", err)
	}
	if isNew2 {
		t.Errorf("expected duplicate event to return isNew=false")
	}
}
