package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/runtime"
)

// MemoryRuntimeStore provides thread-safe, in-memory storage for runtime models during testing and development.
type MemoryRuntimeStore struct {
	mu          sync.RWMutex
	workflows   map[string]*runtime.Workflow
	steps       map[string]*runtime.ExecutionStep
	leases      map[string]*runtime.Lease      // key: resource_type + ":" + resource_id
	checkpoints map[string][]*runtime.Checkpoint // key: workflow_id
	workers     map[string]*runtime.Worker
	decisions   map[string][]*runtime.RuntimeDecision // key: workflow_id
	outbox      map[string]*runtime.OutboxEvent
	inbox       map[string]*runtime.InboxEvent // key: idempotency_key
	jobs        map[string]*runtime.ScheduledJob
	incidents   map[string]*runtime.RuntimeIncident
}

// NewMemoryRuntimeStore initializes an in-memory runtime store.
func NewMemoryRuntimeStore() *MemoryRuntimeStore {
	return &MemoryRuntimeStore{
		workflows:   make(map[string]*runtime.Workflow),
		steps:       make(map[string]*runtime.ExecutionStep),
		leases:      make(map[string]*runtime.Lease),
		checkpoints: make(map[string][]*runtime.Checkpoint),
		workers:     make(map[string]*runtime.Worker),
		decisions:   make(map[string][]*runtime.RuntimeDecision),
		outbox:      make(map[string]*runtime.OutboxEvent),
		inbox:       make(map[string]*runtime.InboxEvent),
		jobs:        make(map[string]*runtime.ScheduledJob),
		incidents:   make(map[string]*runtime.RuntimeIncident),
	}
}

// --- WorkflowStore ---

func (m *MemoryRuntimeStore) SaveWorkflow(ctx context.Context, w *runtime.Workflow) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	// Deep copy
	cp := *w
	m.workflows[w.WorkflowID] = &cp
	return nil
}

func (m *MemoryRuntimeStore) GetWorkflow(ctx context.Context, workflowID string) (*runtime.Workflow, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	w, exists := m.workflows[workflowID]
	if !exists {
		return nil, runtime.ErrWorkflowNotFound
	}
	cp := *w
	return &cp, nil
}

func (m *MemoryRuntimeStore) ListWorkflows(ctx context.Context, tenantID string, state runtime.WorkflowState, limit int) ([]*runtime.Workflow, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*runtime.Workflow, 0)
	for _, w := range m.workflows {
		if tenantID != "" && w.TenantID != tenantID {
			continue
		}
		if state != "" && w.State != state {
			continue
		}
		cp := *w
		res = append(res, &cp)
		if limit > 0 && len(res) >= limit {
			break
		}
	}
	return res, nil
}

func (m *MemoryRuntimeStore) UpdateWorkflowState(ctx context.Context, workflowID string, expectedVersion int, toState runtime.WorkflowState, failureReason string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	w, exists := m.workflows[workflowID]
	if !exists {
		return runtime.ErrWorkflowNotFound
	}
	if err := runtime.CheckOptimisticVersion(w.Version, expectedVersion); err != nil {
		return err
	}
	w.State = toState
	w.Version++
	w.UpdatedAt = time.Now().UTC()
	if failureReason != "" {
		w.FailureReason = failureReason
	}
	return nil
}

func (m *MemoryRuntimeStore) SaveStep(ctx context.Context, s *runtime.ExecutionStep) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *s
	key := s.WorkflowID + ":" + s.StepID
	m.steps[key] = &cp
	return nil
}

func (m *MemoryRuntimeStore) GetStep(ctx context.Context, workflowID, stepID string) (*runtime.ExecutionStep, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	key := workflowID + ":" + stepID
	s, exists := m.steps[key]
	if !exists {
		return nil, runtime.ErrStepNotFound
	}
	cp := *s
	return &cp, nil
}

func (m *MemoryRuntimeStore) ListSteps(ctx context.Context, workflowID string) ([]*runtime.ExecutionStep, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*runtime.ExecutionStep, 0)
	for _, s := range m.steps {
		if workflowID == "" || s.WorkflowID == workflowID {
			cp := *s
			res = append(res, &cp)
		}
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Sequence < res[j].Sequence
	})
	return res, nil
}

func (m *MemoryRuntimeStore) UpdateStep(ctx context.Context, s *runtime.ExecutionStep) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := s.WorkflowID + ":" + s.StepID
	cp := *s
	m.steps[key] = &cp
	return nil
}

func (m *MemoryRuntimeStore) SaveIncident(ctx context.Context, inc *runtime.RuntimeIncident) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *inc
	m.incidents[inc.IncidentID] = &cp
	return nil
}

func (m *MemoryRuntimeStore) GetIncident(ctx context.Context, incidentID string) (*runtime.RuntimeIncident, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	inc, exists := m.incidents[incidentID]
	if !exists {
		return nil, runtime.ErrIncidentNotFound
	}
	cp := *inc
	return &cp, nil
}

func (m *MemoryRuntimeStore) ListIncidents(ctx context.Context, tenantID, state string) ([]*runtime.RuntimeIncident, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*runtime.RuntimeIncident, 0)
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

func (m *MemoryRuntimeStore) UpdateIncident(ctx context.Context, inc *runtime.RuntimeIncident) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *inc
	m.incidents[inc.IncidentID] = &cp
	return nil
}

// --- LeaseStore ---

func (m *MemoryRuntimeStore) SaveLease(ctx context.Context, l *runtime.Lease) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := l.ResourceType + ":" + l.ResourceID
	cp := *l
	m.leases[key] = &cp
	return nil
}

func (m *MemoryRuntimeStore) GetLease(ctx context.Context, resourceType, resourceID string) (*runtime.Lease, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	key := resourceType + ":" + resourceID
	l, exists := m.leases[key]
	if !exists {
		return nil, runtime.ErrLeaseNotFound
	}
	cp := *l
	return &cp, nil
}

func (m *MemoryRuntimeStore) DeleteLease(ctx context.Context, leaseID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for k, l := range m.leases {
		if l.LeaseID == leaseID {
			delete(m.leases, k)
			break
		}
	}
	return nil
}

func (m *MemoryRuntimeStore) ListExpiredLeases(ctx context.Context, now time.Time) ([]*runtime.Lease, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	expired := make([]*runtime.Lease, 0)
	for _, l := range m.leases {
		if l.ExpiresAt.Before(now) {
			cp := *l
			expired = append(expired, &cp)
		}
	}
	return expired, nil
}

// --- CheckpointStore ---

func (m *MemoryRuntimeStore) SaveCheckpoint(ctx context.Context, cp *runtime.Checkpoint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	clone := *cp
	m.checkpoints[cp.WorkflowID] = append(m.checkpoints[cp.WorkflowID], &clone)
	return nil
}

func (m *MemoryRuntimeStore) GetLatestCheckpoint(ctx context.Context, workflowID string) (*runtime.Checkpoint, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	list, exists := m.checkpoints[workflowID]
	if !exists || len(list) == 0 {
		return nil, nil
	}
	cp := *list[len(list)-1]
	return &cp, nil
}

func (m *MemoryRuntimeStore) ListCheckpoints(ctx context.Context, workflowID string) ([]*runtime.Checkpoint, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	list, exists := m.checkpoints[workflowID]
	if !exists {
		return []*runtime.Checkpoint{}, nil
	}
	res := make([]*runtime.Checkpoint, len(list))
	for i, c := range list {
		clone := *c
		res[len(list)-1-i] = &clone // Descending
	}
	return res, nil
}

// --- WorkerStore ---

func (m *MemoryRuntimeStore) SaveWorker(ctx context.Context, w *runtime.Worker) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *w
	m.workers[w.WorkerID] = &cp
	return nil
}

func (m *MemoryRuntimeStore) GetWorker(ctx context.Context, workerID string) (*runtime.Worker, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	w, exists := m.workers[workerID]
	if !exists {
		return nil, runtime.ErrWorkerNotFound
	}
	cp := *w
	return &cp, nil
}

func (m *MemoryRuntimeStore) ListWorkers(ctx context.Context) ([]*runtime.Worker, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*runtime.Worker, 0, len(m.workers))
	for _, w := range m.workers {
		cp := *w
		res = append(res, &cp)
	}
	return res, nil
}

func (m *MemoryRuntimeStore) UpdateWorkerHeartbeat(ctx context.Context, workerID string, status runtime.WorkerStatus, heartbeat time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	w, exists := m.workers[workerID]
	if !exists {
		return runtime.ErrWorkerNotFound
	}
	w.Status = status
	w.HeartbeatAt = heartbeat
	w.LastSeen = heartbeat
	return nil
}

// --- DecisionStore ---

func (m *MemoryRuntimeStore) SaveDecision(ctx context.Context, d *runtime.RuntimeDecision) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *d
	m.decisions[d.WorkflowID] = append(m.decisions[d.WorkflowID], &cp)
	return nil
}

func (m *MemoryRuntimeStore) ListDecisions(ctx context.Context, workflowID string) ([]*runtime.RuntimeDecision, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	list, exists := m.decisions[workflowID]
	if !exists {
		return []*runtime.RuntimeDecision{}, nil
	}
	res := make([]*runtime.RuntimeDecision, len(list))
	for i, d := range list {
		cp := *d
		res[i] = &cp
	}
	return res, nil
}

// --- OutboxStore ---

func (m *MemoryRuntimeStore) SaveOutboxEvent(ctx context.Context, e *runtime.OutboxEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *e
	m.outbox[e.EventID] = &cp
	return nil
}

func (m *MemoryRuntimeStore) ListPendingOutboxEvents(ctx context.Context, limit int) ([]*runtime.OutboxEvent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	now := time.Now().UTC()
	res := make([]*runtime.OutboxEvent, 0)
	for _, e := range m.outbox {
		if (e.Status == "PENDING" || e.Status == "RETRYING") && !e.NextAttemptAt.After(now) {
			cp := *e
			res = append(res, &cp)
			if limit > 0 && len(res) >= limit {
				break
			}
		}
	}
	return res, nil
}

func (m *MemoryRuntimeStore) MarkOutboxEventDelivered(ctx context.Context, eventID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	e, exists := m.outbox[eventID]
	if !exists {
		return errors.New("outbox event not found")
	}
	now := time.Now().UTC()
	e.Status = "DELIVERED"
	e.DeliveredAt = &now
	return nil
}

func (m *MemoryRuntimeStore) MarkOutboxEventFailed(ctx context.Context, eventID, errorMsg string, nextAttempt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
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

// --- InboxStore ---

func (m *MemoryRuntimeStore) SaveInboxEvent(ctx context.Context, e *runtime.InboxEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *e
	m.inbox[e.IdempotencyKey] = &cp
	return nil
}

func (m *MemoryRuntimeStore) GetInboxEvent(ctx context.Context, idempotencyKey string) (*runtime.InboxEvent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	e, exists := m.inbox[idempotencyKey]
	if !exists {
		return nil, nil
	}
	cp := *e
	return &cp, nil
}

func (m *MemoryRuntimeStore) MarkInboxEventProcessed(ctx context.Context, inboxID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
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

// --- JobStore ---

func (m *MemoryRuntimeStore) SaveScheduledJob(ctx context.Context, job *runtime.ScheduledJob) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *job
	m.jobs[job.JobID] = &cp
	return nil
}

func (m *MemoryRuntimeStore) ListDueScheduledJobs(ctx context.Context, now time.Time, limit int) ([]*runtime.ScheduledJob, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*runtime.ScheduledJob, 0)
	for _, j := range m.jobs {
		if j.State == "SCHEDULED" && !j.ScheduledAt.After(now) {
			cp := *j
			res = append(res, &cp)
			if limit > 0 && len(res) >= limit {
				break
			}
		}
	}
	return res, nil
}

func (m *MemoryRuntimeStore) MarkJobExecuted(ctx context.Context, jobID string, executedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	j, exists := m.jobs[jobID]
	if !exists {
		return errors.New("scheduled job not found")
	}
	j.State = "EXECUTED"
	j.ExecutedAt = &executedAt
	return nil
}

func (m *MemoryRuntimeStore) CancelJob(ctx context.Context, jobID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	j, exists := m.jobs[jobID]
	if !exists {
		return errors.New("scheduled job not found")
	}
	j.State = "CANCELLED"
	return nil
}

// --- Postgres Implementation ---

// PostgresRuntimeStore implements all runtime storage interfaces against PostgreSQL.
type PostgresRuntimeStore struct {
	db *sql.DB
}

// NewPostgresRuntimeStore initializes a PostgresRuntimeStore.
func NewPostgresRuntimeStore(db *sql.DB) *PostgresRuntimeStore {
	return &PostgresRuntimeStore{db: db}
}

// SaveWorkflow inserts or updates a workflow in PostgreSQL.
func (p *PostgresRuntimeStore) SaveWorkflow(ctx context.Context, w *runtime.Workflow) error {
	metaJSON, _ := json.Marshal(w.Metadata)
	query := `
		INSERT INTO workflows (
			workflow_id, tenant_id, workflow_type, aggregate_type, aggregate_id,
			state, version, priority, idempotency_key, parent_workflow_id,
			correlation_id, current_step, failure_reason, retry_count,
			deadline, started_at, completed_at, created_at, updated_at, metadata
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
		ON CONFLICT (workflow_id) DO UPDATE SET
			state = EXCLUDED.state,
			version = EXCLUDED.version,
			current_step = EXCLUDED.current_step,
			failure_reason = EXCLUDED.failure_reason,
			retry_count = EXCLUDED.retry_count,
			completed_at = EXCLUDED.completed_at,
			updated_at = EXCLUDED.updated_at,
			metadata = EXCLUDED.metadata;
	`
	_, err := p.db.ExecContext(ctx, query,
		w.WorkflowID, w.TenantID, w.WorkflowType, w.AggregateType, w.AggregateID,
		w.State, w.Version, w.Priority, w.IdempotencyKey, w.ParentWorkflowID,
		w.CorrelationID, w.CurrentStep, w.FailureReason, w.RetryCount,
		w.Deadline, w.StartedAt, w.CompletedAt, w.CreatedAt, w.UpdatedAt, metaJSON,
	)
	return err
}

func (p *PostgresRuntimeStore) GetWorkflow(ctx context.Context, workflowID string) (*runtime.Workflow, error) {
	query := `
		SELECT workflow_id, tenant_id, workflow_type, aggregate_type, aggregate_id,
		       state, version, priority, idempotency_key, parent_workflow_id,
		       correlation_id, current_step, failure_reason, retry_count,
		       deadline, started_at, completed_at, created_at, updated_at, metadata
		FROM workflows WHERE workflow_id = $1;
	`
	row := p.db.QueryRowContext(ctx, query, workflowID)
	w := &runtime.Workflow{}
	var parentID, corrID, currStep, failReason sql.NullString
	var metaJSON []byte

	err := row.Scan(
		&w.WorkflowID, &w.TenantID, &w.WorkflowType, &w.AggregateType, &w.AggregateID,
		&w.State, &w.Version, &w.Priority, &w.IdempotencyKey, &parentID,
		&corrID, &currStep, &failReason, &w.RetryCount,
		&w.Deadline, &w.StartedAt, &w.CompletedAt, &w.CreatedAt, &w.UpdatedAt, &metaJSON,
	)
	if err == sql.ErrNoRows {
		return nil, runtime.ErrWorkflowNotFound
	}
	if err != nil {
		return nil, err
	}

	w.ParentWorkflowID = parentID.String
	w.CorrelationID = corrID.String
	w.CurrentStep = currStep.String
	w.FailureReason = failReason.String
	if len(metaJSON) > 0 {
		_ = json.Unmarshal(metaJSON, &w.Metadata)
	}
	return w, nil
}

func (p *PostgresRuntimeStore) ListWorkflows(ctx context.Context, tenantID string, state runtime.WorkflowState, limit int) ([]*runtime.Workflow, error) {
	query := `
		SELECT workflow_id, tenant_id, workflow_type, aggregate_type, aggregate_id,
		       state, version, priority, idempotency_key, parent_workflow_id,
		       correlation_id, current_step, failure_reason, retry_count,
		       deadline, started_at, completed_at, created_at, updated_at, metadata
		FROM workflows
		WHERE ($1 = '' OR tenant_id = $1)
		  AND ($2 = '' OR state = $2)
		ORDER BY created_at DESC
		LIMIT $3;
	`
	rows, err := p.db.QueryContext(ctx, query, tenantID, string(state), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]*runtime.Workflow, 0)
	for rows.Next() {
		w := &runtime.Workflow{}
		var parentID, corrID, currStep, failReason sql.NullString
		var metaJSON []byte
		if err := rows.Scan(
			&w.WorkflowID, &w.TenantID, &w.WorkflowType, &w.AggregateType, &w.AggregateID,
			&w.State, &w.Version, &w.Priority, &w.IdempotencyKey, &parentID,
			&corrID, &currStep, &failReason, &w.RetryCount,
			&w.Deadline, &w.StartedAt, &w.CompletedAt, &w.CreatedAt, &w.UpdatedAt, &metaJSON,
		); err != nil {
			return nil, err
		}
		w.ParentWorkflowID = parentID.String
		w.CorrelationID = corrID.String
		w.CurrentStep = currStep.String
		w.FailureReason = failReason.String
		if len(metaJSON) > 0 {
			_ = json.Unmarshal(metaJSON, &w.Metadata)
		}
		res = append(res, w)
	}
	return res, nil
}

func (p *PostgresRuntimeStore) UpdateWorkflowState(ctx context.Context, workflowID string, expectedVersion int, toState runtime.WorkflowState, failureReason string) error {
	query := `
		UPDATE workflows
		SET state = $1, version = version + 1, failure_reason = $2, updated_at = NOW()
		WHERE workflow_id = $3 AND version = $4;
	`
	res, err := p.db.ExecContext(ctx, query, string(toState), failureReason, workflowID, expectedVersion)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return runtime.ErrInv111 // Version mismatch
	}
	return nil
}

func (p *PostgresRuntimeStore) SaveStep(ctx context.Context, s *runtime.ExecutionStep) error {
	inJSON, _ := json.Marshal(s.Inputs)
	outJSON, _ := json.Marshal(s.Outputs)
	query := `
		INSERT INTO execution_steps (
			step_id, workflow_id, tenant_id, step_type, sequence,
			state, attempt, idempotency_key, input_hash, output_hash,
			lease_owner, lease_expires_at, timeout_seconds, next_retry_at,
			error_code, error_message, started_at, completed_at,
			created_at, updated_at, inputs, outputs
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
		ON CONFLICT (step_id) DO UPDATE SET
			state = EXCLUDED.state,
			attempt = EXCLUDED.attempt,
			output_hash = EXCLUDED.output_hash,
			lease_owner = EXCLUDED.lease_owner,
			lease_expires_at = EXCLUDED.lease_expires_at,
			next_retry_at = EXCLUDED.next_retry_at,
			error_code = EXCLUDED.error_code,
			error_message = EXCLUDED.error_message,
			started_at = EXCLUDED.started_at,
			completed_at = EXCLUDED.completed_at,
			updated_at = EXCLUDED.updated_at,
			outputs = EXCLUDED.outputs;
	`
	_, err := p.db.ExecContext(ctx, query,
		s.StepID, s.WorkflowID, s.TenantID, s.StepType, s.Sequence,
		s.State, s.Attempt, s.IdempotencyKey, s.InputHash, s.OutputHash,
		s.LeaseOwner, s.LeaseExpiresAt, s.TimeoutSeconds, s.NextRetryAt,
		s.ErrorCode, s.ErrorMessage, s.StartedAt, s.CompletedAt,
		s.CreatedAt, s.UpdatedAt, inJSON, outJSON,
	)
	return err
}

func (p *PostgresRuntimeStore) GetStep(ctx context.Context, workflowID, stepID string) (*runtime.ExecutionStep, error) {
	query := `
		SELECT step_id, workflow_id, tenant_id, step_type, sequence,
		       state, attempt, idempotency_key, input_hash, output_hash,
		       lease_owner, lease_expires_at, timeout_seconds, next_retry_at,
		       error_code, error_message, started_at, completed_at,
		       created_at, updated_at, inputs, outputs
		FROM execution_steps WHERE workflow_id = $1 AND step_id = $2;
	`
	row := p.db.QueryRowContext(ctx, query, workflowID, stepID)
	s := &runtime.ExecutionStep{}
	var inHash, outHash, leaseOwner, errCode, errMsg sql.NullString
	var inJSON, outJSON []byte

	err := row.Scan(
		&s.StepID, &s.WorkflowID, &s.TenantID, &s.StepType, &s.Sequence,
		&s.State, &s.Attempt, &s.IdempotencyKey, &inHash, &outHash,
		&leaseOwner, &s.LeaseExpiresAt, &s.TimeoutSeconds, &s.NextRetryAt,
		&errCode, &errMsg, &s.StartedAt, &s.CompletedAt,
		&s.CreatedAt, &s.UpdatedAt, &inJSON, &outJSON,
	)
	if err == sql.ErrNoRows {
		return nil, runtime.ErrStepNotFound
	}
	if err != nil {
		return nil, err
	}
	s.InputHash = inHash.String
	s.OutputHash = outHash.String
	s.LeaseOwner = leaseOwner.String
	s.ErrorCode = errCode.String
	s.ErrorMessage = errMsg.String
	if len(inJSON) > 0 {
		_ = json.Unmarshal(inJSON, &s.Inputs)
	}
	if len(outJSON) > 0 {
		_ = json.Unmarshal(outJSON, &s.Outputs)
	}
	return s, nil
}

func (p *PostgresRuntimeStore) ListSteps(ctx context.Context, workflowID string) ([]*runtime.ExecutionStep, error) {
	query := `
		SELECT step_id, workflow_id, tenant_id, step_type, sequence,
		       state, attempt, idempotency_key, input_hash, output_hash,
		       lease_owner, lease_expires_at, timeout_seconds, next_retry_at,
		       error_code, error_message, started_at, completed_at,
		       created_at, updated_at, inputs, outputs
		FROM execution_steps
		WHERE ($1 = '' OR workflow_id = $1)
		ORDER BY sequence ASC;
	`
	rows, err := p.db.QueryContext(ctx, query, workflowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]*runtime.ExecutionStep, 0)
	for rows.Next() {
		s := &runtime.ExecutionStep{}
		var inHash, outHash, leaseOwner, errCode, errMsg sql.NullString
		var inJSON, outJSON []byte
		if err := rows.Scan(
			&s.StepID, &s.WorkflowID, &s.TenantID, &s.StepType, &s.Sequence,
			&s.State, &s.Attempt, &s.IdempotencyKey, &inHash, &outHash,
			&leaseOwner, &s.LeaseExpiresAt, &s.TimeoutSeconds, &s.NextRetryAt,
			&errCode, &errMsg, &s.StartedAt, &s.CompletedAt,
			&s.CreatedAt, &s.UpdatedAt, &inJSON, &outJSON,
		); err != nil {
			return nil, err
		}
		s.InputHash = inHash.String
		s.OutputHash = outHash.String
		s.LeaseOwner = leaseOwner.String
		s.ErrorCode = errCode.String
		s.ErrorMessage = errMsg.String
		if len(inJSON) > 0 {
			_ = json.Unmarshal(inJSON, &s.Inputs)
		}
		if len(outJSON) > 0 {
			_ = json.Unmarshal(outJSON, &s.Outputs)
		}
		res = append(res, s)
	}
	return res, nil
}

func (p *PostgresRuntimeStore) UpdateStep(ctx context.Context, s *runtime.ExecutionStep) error {
	return p.SaveStep(ctx, s)
}

func (p *PostgresRuntimeStore) SaveIncident(ctx context.Context, inc *runtime.RuntimeIncident) error {
	evJSON, _ := json.Marshal(inc.Evidence)
	query := `
		INSERT INTO runtime_incidents (
			incident_id, tenant_id, workflow_id, severity, category,
			state, detected_at, acknowledged_at, resolved_at,
			root_cause, evidence, remediation, correlation_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (incident_id) DO UPDATE SET
			state = EXCLUDED.state,
			acknowledged_at = EXCLUDED.acknowledged_at,
			resolved_at = EXCLUDED.resolved_at,
			remediation = EXCLUDED.remediation;
	`
	_, err := p.db.ExecContext(ctx, query,
		inc.IncidentID, inc.TenantID, inc.WorkflowID, inc.Severity, inc.Category,
		inc.State, inc.DetectedAt, inc.AcknowledgedAt, inc.ResolvedAt,
		inc.RootCause, evJSON, inc.Remediation, inc.CorrelationID,
	)
	return err
}

func (p *PostgresRuntimeStore) GetIncident(ctx context.Context, incidentID string) (*runtime.RuntimeIncident, error) {
	query := `
		SELECT incident_id, tenant_id, workflow_id, severity, category,
		       state, detected_at, acknowledged_at, resolved_at,
		       root_cause, evidence, remediation, correlation_id
		FROM runtime_incidents WHERE incident_id = $1;
	`
	row := p.db.QueryRowContext(ctx, query, incidentID)
	inc := &runtime.RuntimeIncident{}
	var evJSON []byte
	var rootCause, rem, corr sql.NullString
	err := row.Scan(
		&inc.IncidentID, &inc.TenantID, &inc.WorkflowID, &inc.Severity, &inc.Category,
		&inc.State, &inc.DetectedAt, &inc.AcknowledgedAt, &inc.ResolvedAt,
		&rootCause, &evJSON, &rem, &corr,
	)
	if err == sql.ErrNoRows {
		return nil, runtime.ErrIncidentNotFound
	}
	if err != nil {
		return nil, err
	}
	inc.RootCause = rootCause.String
	inc.Remediation = rem.String
	inc.CorrelationID = corr.String
	if len(evJSON) > 0 {
		_ = json.Unmarshal(evJSON, &inc.Evidence)
	}
	return inc, nil
}

func (p *PostgresRuntimeStore) ListIncidents(ctx context.Context, tenantID, state string) ([]*runtime.RuntimeIncident, error) {
	query := `
		SELECT incident_id, tenant_id, workflow_id, severity, category,
		       state, detected_at, acknowledged_at, resolved_at,
		       root_cause, evidence, remediation, correlation_id
		FROM runtime_incidents
		WHERE ($1 = '' OR tenant_id = $1)
		  AND ($2 = '' OR state = $2)
		ORDER BY detected_at DESC;
	`
	rows, err := p.db.QueryContext(ctx, query, tenantID, state)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]*runtime.RuntimeIncident, 0)
	for rows.Next() {
		inc := &runtime.RuntimeIncident{}
		var evJSON []byte
		var rootCause, rem, corr sql.NullString
		if err := rows.Scan(
			&inc.IncidentID, &inc.TenantID, &inc.WorkflowID, &inc.Severity, &inc.Category,
			&inc.State, &inc.DetectedAt, &inc.AcknowledgedAt, &inc.ResolvedAt,
			&rootCause, &evJSON, &rem, &corr,
		); err != nil {
			return nil, err
		}
		inc.RootCause = rootCause.String
		inc.Remediation = rem.String
		inc.CorrelationID = corr.String
		if len(evJSON) > 0 {
			_ = json.Unmarshal(evJSON, &inc.Evidence)
		}
		res = append(res, inc)
	}
	return res, nil
}

func (p *PostgresRuntimeStore) UpdateIncident(ctx context.Context, inc *runtime.RuntimeIncident) error {
	return p.SaveIncident(ctx, inc)
}

func (p *PostgresRuntimeStore) SaveLease(ctx context.Context, l *runtime.Lease) error {
	query := `
		INSERT INTO leases (
			lease_id, resource_type, resource_id, worker_id, tenant_id,
			acquired_at, expires_at, heartbeat_at, fencing_token
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (resource_type, resource_id) DO UPDATE SET
			worker_id = EXCLUDED.worker_id,
			tenant_id = EXCLUDED.tenant_id,
			acquired_at = EXCLUDED.acquired_at,
			expires_at = EXCLUDED.expires_at,
			heartbeat_at = EXCLUDED.heartbeat_at,
			fencing_token = EXCLUDED.fencing_token;
	`
	_, err := p.db.ExecContext(ctx, query,
		l.LeaseID, l.ResourceType, l.ResourceID, l.WorkerID, l.TenantID,
		l.AcquiredAt, l.ExpiresAt, l.HeartbeatAt, l.FencingToken,
	)
	return err
}

func (p *PostgresRuntimeStore) GetLease(ctx context.Context, resourceType, resourceID string) (*runtime.Lease, error) {
	query := `
		SELECT lease_id, resource_type, resource_id, worker_id, tenant_id,
		       acquired_at, expires_at, heartbeat_at, fencing_token
		FROM leases WHERE resource_type = $1 AND resource_id = $2;
	`
	row := p.db.QueryRowContext(ctx, query, resourceType, resourceID)
	l := &runtime.Lease{}
	err := row.Scan(
		&l.LeaseID, &l.ResourceType, &l.ResourceID, &l.WorkerID, &l.TenantID,
		&l.AcquiredAt, &l.ExpiresAt, &l.HeartbeatAt, &l.FencingToken,
	)
	if err == sql.ErrNoRows {
		return nil, runtime.ErrLeaseNotFound
	}
	return l, err
}

func (p *PostgresRuntimeStore) DeleteLease(ctx context.Context, leaseID string) error {
	query := `DELETE FROM leases WHERE lease_id = $1;`
	_, err := p.db.ExecContext(ctx, query, leaseID)
	return err
}

func (p *PostgresRuntimeStore) ListExpiredLeases(ctx context.Context, now time.Time) ([]*runtime.Lease, error) {
	query := `
		SELECT lease_id, resource_type, resource_id, worker_id, tenant_id,
		       acquired_at, expires_at, heartbeat_at, fencing_token
		FROM leases WHERE expires_at < $1;
	`
	rows, err := p.db.QueryContext(ctx, query, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]*runtime.Lease, 0)
	for rows.Next() {
		l := &runtime.Lease{}
		if err := rows.Scan(
			&l.LeaseID, &l.ResourceType, &l.ResourceID, &l.WorkerID, &l.TenantID,
			&l.AcquiredAt, &l.ExpiresAt, &l.HeartbeatAt, &l.FencingToken,
		); err != nil {
			return nil, err
		}
		res = append(res, l)
	}
	return res, nil
}

func (p *PostgresRuntimeStore) SaveCheckpoint(ctx context.Context, cp *runtime.Checkpoint) error {
	dataJSON, _ := json.Marshal(cp.SnapshotData)
	query := `
		INSERT INTO checkpoints (
			checkpoint_id, workflow_id, step_id, tenant_id,
			state_hash, event_position, schema_version, snapshot_data, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
	`
	_, err := p.db.ExecContext(ctx, query,
		cp.CheckpointID, cp.WorkflowID, cp.StepID, cp.TenantID,
		cp.StateHash, cp.EventPosition, cp.SchemaVersion, dataJSON, cp.CreatedAt,
	)
	return err
}

func (p *PostgresRuntimeStore) GetLatestCheckpoint(ctx context.Context, workflowID string) (*runtime.Checkpoint, error) {
	query := `
		SELECT checkpoint_id, workflow_id, step_id, tenant_id,
		       state_hash, event_position, schema_version, snapshot_data, created_at
		FROM checkpoints
		WHERE workflow_id = $1
		ORDER BY created_at DESC
		LIMIT 1;
	`
	row := p.db.QueryRowContext(ctx, query, workflowID)
	cp := &runtime.Checkpoint{}
	var stepID sql.NullString
	var dataJSON []byte
	err := row.Scan(
		&cp.CheckpointID, &cp.WorkflowID, &stepID, &cp.TenantID,
		&cp.StateHash, &cp.EventPosition, &cp.SchemaVersion, &dataJSON, &cp.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	cp.StepID = stepID.String
	if len(dataJSON) > 0 {
		_ = json.Unmarshal(dataJSON, &cp.SnapshotData)
	}
	return cp, nil
}

func (p *PostgresRuntimeStore) ListCheckpoints(ctx context.Context, workflowID string) ([]*runtime.Checkpoint, error) {
	query := `
		SELECT checkpoint_id, workflow_id, step_id, tenant_id,
		       state_hash, event_position, schema_version, snapshot_data, created_at
		FROM checkpoints
		WHERE workflow_id = $1
		ORDER BY created_at DESC;
	`
	rows, err := p.db.QueryContext(ctx, query, workflowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]*runtime.Checkpoint, 0)
	for rows.Next() {
		cp := &runtime.Checkpoint{}
		var stepID sql.NullString
		var dataJSON []byte
		if err := rows.Scan(
			&cp.CheckpointID, &cp.WorkflowID, &stepID, &cp.TenantID,
			&cp.StateHash, &cp.EventPosition, &cp.SchemaVersion, &dataJSON, &cp.CreatedAt,
		); err != nil {
			return nil, err
		}
		cp.StepID = stepID.String
		if len(dataJSON) > 0 {
			_ = json.Unmarshal(dataJSON, &cp.SnapshotData)
		}
		res = append(res, cp)
	}
	return res, nil
}

func (p *PostgresRuntimeStore) SaveWorker(ctx context.Context, w *runtime.Worker) error {
	capJSON, _ := json.Marshal(w.Capabilities)
	query := `
		INSERT INTO workers (
			worker_id, worker_type, hostname, status, capabilities, version, heartbeat_at, last_seen, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (worker_id) DO UPDATE SET
			status = EXCLUDED.status,
			capabilities = EXCLUDED.capabilities,
			heartbeat_at = EXCLUDED.heartbeat_at,
			last_seen = EXCLUDED.last_seen;
	`
	_, err := p.db.ExecContext(ctx, query,
		w.WorkerID, w.WorkerType, w.Hostname, string(w.Status), capJSON, w.Version,
		w.HeartbeatAt, w.LastSeen, w.CreatedAt,
	)
	return err
}

func (p *PostgresRuntimeStore) GetWorker(ctx context.Context, workerID string) (*runtime.Worker, error) {
	query := `
		SELECT worker_id, worker_type, hostname, status, capabilities, version, heartbeat_at, last_seen, created_at
		FROM workers WHERE worker_id = $1;
	`
	row := p.db.QueryRowContext(ctx, query, workerID)
	w := &runtime.Worker{}
	var capJSON []byte
	err := row.Scan(
		&w.WorkerID, &w.WorkerType, &w.Hostname, &w.Status, &capJSON, &w.Version,
		&w.HeartbeatAt, &w.LastSeen, &w.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, runtime.ErrWorkerNotFound
	}
	if err != nil {
		return nil, err
	}
	if len(capJSON) > 0 {
		_ = json.Unmarshal(capJSON, &w.Capabilities)
	}
	return w, nil
}

func (p *PostgresRuntimeStore) ListWorkers(ctx context.Context) ([]*runtime.Worker, error) {
	query := `
		SELECT worker_id, worker_type, hostname, status, capabilities, version, heartbeat_at, last_seen, created_at
		FROM workers ORDER BY heartbeat_at DESC;
	`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]*runtime.Worker, 0)
	for rows.Next() {
		w := &runtime.Worker{}
		var capJSON []byte
		if err := rows.Scan(
			&w.WorkerID, &w.WorkerType, &w.Hostname, &w.Status, &capJSON, &w.Version,
			&w.HeartbeatAt, &w.LastSeen, &w.CreatedAt,
		); err != nil {
			return nil, err
		}
		if len(capJSON) > 0 {
			_ = json.Unmarshal(capJSON, &w.Capabilities)
		}
		res = append(res, w)
	}
	return res, nil
}

func (p *PostgresRuntimeStore) UpdateWorkerHeartbeat(ctx context.Context, workerID string, status runtime.WorkerStatus, heartbeat time.Time) error {
	query := `
		UPDATE workers
		SET status = $1, heartbeat_at = $2, last_seen = $2
		WHERE worker_id = $3;
	`
	_, err := p.db.ExecContext(ctx, query, string(status), heartbeat, workerID)
	return err
}

func (p *PostgresRuntimeStore) SaveDecision(ctx context.Context, d *runtime.RuntimeDecision) error {
	resJSON, _ := json.Marshal(d.Result)
	query := `
		INSERT INTO runtime_decisions (
			decision_id, workflow_id, step_id, tenant_id, decision_type,
			reason_code, inputs_hash, state_version, policy_snapshot_id,
			actor, result, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
	`
	_, err := p.db.ExecContext(ctx, query,
		d.DecisionID, d.WorkflowID, d.StepID, d.TenantID, string(d.DecisionType),
		d.ReasonCode, d.InputsHash, d.StateVersion, d.PolicySnapshotID,
		d.Actor, resJSON, d.CreatedAt,
	)
	return err
}

func (p *PostgresRuntimeStore) ListDecisions(ctx context.Context, workflowID string) ([]*runtime.RuntimeDecision, error) {
	query := `
		SELECT decision_id, workflow_id, step_id, tenant_id, decision_type,
		       reason_code, inputs_hash, state_version, policy_snapshot_id,
		       actor, result, created_at
		FROM runtime_decisions
		WHERE workflow_id = $1
		ORDER BY created_at ASC;
	`
	rows, err := p.db.QueryContext(ctx, query, workflowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]*runtime.RuntimeDecision, 0)
	for rows.Next() {
		d := &runtime.RuntimeDecision{}
		var stepID, inHash, polID sql.NullString
		var resJSON []byte
		if err := rows.Scan(
			&d.DecisionID, &d.WorkflowID, &stepID, &d.TenantID, &d.DecisionType,
			&d.ReasonCode, &inHash, &d.StateVersion, &polID,
			&d.Actor, &resJSON, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		d.StepID = stepID.String
		d.InputsHash = inHash.String
		d.PolicySnapshotID = polID.String
		if len(resJSON) > 0 {
			_ = json.Unmarshal(resJSON, &d.Result)
		}
		res = append(res, d)
	}
	return res, nil
}

func (p *PostgresRuntimeStore) SaveOutboxEvent(ctx context.Context, e *runtime.OutboxEvent) error {
	query := `
		INSERT INTO outbox_events (
			event_id, tenant_id, aggregate_type, aggregate_id, event_type,
			payload, status, attempt, next_attempt_at, error_message, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
	`
	_, err := p.db.ExecContext(ctx, query,
		e.EventID, e.TenantID, e.AggregateType, e.AggregateID, e.EventType,
		e.Payload, e.Status, e.Attempt, e.NextAttemptAt, e.ErrorMessage, e.CreatedAt,
	)
	return err
}

func (p *PostgresRuntimeStore) ListPendingOutboxEvents(ctx context.Context, limit int) ([]*runtime.OutboxEvent, error) {
	query := `
		SELECT event_id, tenant_id, aggregate_type, aggregate_id, event_type,
		       payload, status, attempt, next_attempt_at, error_message, created_at
		FROM outbox_events
		WHERE status IN ('PENDING', 'RETRYING') AND next_attempt_at <= NOW()
		ORDER BY created_at ASC
		LIMIT $1;
	`
	rows, err := p.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]*runtime.OutboxEvent, 0)
	for rows.Next() {
		e := &runtime.OutboxEvent{}
		var errMsg sql.NullString
		if err := rows.Scan(
			&e.EventID, &e.TenantID, &e.AggregateType, &e.AggregateID, &e.EventType,
			&e.Payload, &e.Status, &e.Attempt, &e.NextAttemptAt, &errMsg, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		e.ErrorMessage = errMsg.String
		res = append(res, e)
	}
	return res, nil
}

func (p *PostgresRuntimeStore) MarkOutboxEventDelivered(ctx context.Context, eventID string) error {
	query := `
		UPDATE outbox_events
		SET status = 'DELIVERED', delivered_at = NOW()
		WHERE event_id = $1;
	`
	_, err := p.db.ExecContext(ctx, query, eventID)
	return err
}

func (p *PostgresRuntimeStore) MarkOutboxEventFailed(ctx context.Context, eventID, errorMsg string, nextAttempt time.Time) error {
	query := `
		UPDATE outbox_events
		SET status = 'RETRYING', attempt = attempt + 1, error_message = $1, next_attempt_at = $2
		WHERE event_id = $3;
	`
	_, err := p.db.ExecContext(ctx, query, errorMsg, nextAttempt, eventID)
	return err
}

func (p *PostgresRuntimeStore) SaveInboxEvent(ctx context.Context, e *runtime.InboxEvent) error {
	query := `
		INSERT INTO inbox_events (
			inbox_id, idempotency_key, tenant_id, sender_id, event_type, payload, status, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
	`
	_, err := p.db.ExecContext(ctx, query,
		e.InboxID, e.IdempotencyKey, e.TenantID, e.SenderID, e.EventType, e.Payload, e.Status, e.CreatedAt,
	)
	return err
}

func (p *PostgresRuntimeStore) GetInboxEvent(ctx context.Context, idempotencyKey string) (*runtime.InboxEvent, error) {
	query := `
		SELECT inbox_id, idempotency_key, tenant_id, sender_id, event_type, payload, status, processed_at, created_at
		FROM inbox_events WHERE idempotency_key = $1;
	`
	row := p.db.QueryRowContext(ctx, query, idempotencyKey)
	e := &runtime.InboxEvent{}
	err := row.Scan(
		&e.InboxID, &e.IdempotencyKey, &e.TenantID, &e.SenderID, &e.EventType, &e.Payload, &e.Status, &e.ProcessedAt, &e.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return e, err
}

func (p *PostgresRuntimeStore) MarkInboxEventProcessed(ctx context.Context, inboxID string) error {
	query := `
		UPDATE inbox_events
		SET status = 'PROCESSED', processed_at = NOW()
		WHERE inbox_id = $1;
	`
	_, err := p.db.ExecContext(ctx, query, inboxID)
	return err
}

func (p *PostgresRuntimeStore) SaveScheduledJob(ctx context.Context, job *runtime.ScheduledJob) error {
	payJSON, _ := json.Marshal(job.Payload)
	query := `
		INSERT INTO scheduled_jobs (
			job_id, tenant_id, job_type, target_type, target_id,
			scheduled_at, state, idempotency_key, payload, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
	`
	_, err := p.db.ExecContext(ctx, query,
		job.JobID, job.TenantID, job.JobType, job.TargetType, job.TargetID,
		job.ScheduledAt, job.State, job.IdempotencyKey, payJSON, job.CreatedAt,
	)
	return err
}

func (p *PostgresRuntimeStore) ListDueScheduledJobs(ctx context.Context, now time.Time, limit int) ([]*runtime.ScheduledJob, error) {
	query := `
		SELECT job_id, tenant_id, job_type, target_type, target_id,
		       scheduled_at, state, idempotency_key, payload, created_at
		FROM scheduled_jobs
		WHERE state = 'SCHEDULED' AND scheduled_at <= $1
		ORDER BY scheduled_at ASC
		LIMIT $2;
	`
	rows, err := p.db.QueryContext(ctx, query, now, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]*runtime.ScheduledJob, 0)
	for rows.Next() {
		j := &runtime.ScheduledJob{}
		var payJSON []byte
		if err := rows.Scan(
			&j.JobID, &j.TenantID, &j.JobType, &j.TargetType, &j.TargetID,
			&j.ScheduledAt, &j.State, &j.IdempotencyKey, &payJSON, &j.CreatedAt,
		); err != nil {
			return nil, err
		}
		if len(payJSON) > 0 {
			_ = json.Unmarshal(payJSON, &j.Payload)
		}
		res = append(res, j)
	}
	return res, nil
}

func (p *PostgresRuntimeStore) MarkJobExecuted(ctx context.Context, jobID string, executedAt time.Time) error {
	query := `
		UPDATE scheduled_jobs
		SET state = 'EXECUTED', executed_at = $1
		WHERE job_id = $2;
	`
	_, err := p.db.ExecContext(ctx, query, executedAt, jobID)
	return err
}

func (p *PostgresRuntimeStore) CancelJob(ctx context.Context, jobID string) error {
	query := `
		UPDATE scheduled_jobs
		SET state = 'CANCELLED'
		WHERE job_id = $1;
	`
	_, err := p.db.ExecContext(ctx, query, jobID)
	return err
}
