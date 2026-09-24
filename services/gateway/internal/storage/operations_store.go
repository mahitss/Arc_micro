package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"sync"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/operations"
)

var (
	ErrSnapshotNotFound = errors.New("operations snapshot not found")
	ErrPlanNotFound     = errors.New("operation plan not found")
	ErrIncidentNotFound = errors.New("operation incident not found")
)

// OperationsStore defines persistence methods for the Autonomous Operations OS.
type OperationsStore interface {
	SaveSnapshot(ctx context.Context, snap *operations.OperationsSnapshot) error
	GetLatestSnapshot(ctx context.Context, tenantID string) (*operations.OperationsSnapshot, error)
	SaveDecision(ctx context.Context, dec *operations.OperationsDecision) error
	ListDecisions(ctx context.Context, tenantID, workflowID string) ([]*operations.OperationsDecision, error)
	SavePlan(ctx context.Context, plan *operations.OperationPlan) error
	GetLatestPlan(ctx context.Context, tenantID, workflowID string) (*operations.OperationPlan, error)
	SavePlanDiff(ctx context.Context, diff *operations.OperationPlanDiff) error
	SaveIncident(ctx context.Context, inc *operations.OperationsIncident) error
	GetIncident(ctx context.Context, tenantID, incidentID string) (*operations.OperationsIncident, error)
	ListIncidents(ctx context.Context, tenantID string) ([]*operations.OperationsIncident, error)
	SaveCausalLink(ctx context.Context, link *operations.CausalLink) error
	GetCausalChain(ctx context.Context, tenantID, eventID string) ([]*operations.CausalLink, error)
}

// MemoryOperationsStore is an in-memory, thread-safe implementation.
type MemoryOperationsStore struct {
	mu          sync.RWMutex
	snapshots   map[string]*operations.OperationsSnapshot // tenant_id -> latest
	decisions   map[string][]*operations.OperationsDecision
	plans       map[string][]*operations.OperationPlan
	planDiffs   map[string][]*operations.OperationPlanDiff
	incidents   map[string]*operations.OperationsIncident // incident_id -> inc
	causalLinks map[string]*operations.CausalLink         // event_id -> link
}

// NewMemoryOperationsStore creates an instance of MemoryOperationsStore.
func NewMemoryOperationsStore() *MemoryOperationsStore {
	return &MemoryOperationsStore{
		snapshots:   make(map[string]*operations.OperationsSnapshot),
		decisions:   make(map[string][]*operations.OperationsDecision),
		plans:       make(map[string][]*operations.OperationPlan),
		planDiffs:   make(map[string][]*operations.OperationPlanDiff),
		incidents:   make(map[string]*operations.OperationsIncident),
		causalLinks: make(map[string]*operations.CausalLink),
	}
}

func (s *MemoryOperationsStore) SaveSnapshot(ctx context.Context, snap *operations.OperationsSnapshot) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.snapshots[snap.TenantID] = snap
	return nil
}

func (s *MemoryOperationsStore) GetLatestSnapshot(ctx context.Context, tenantID string) (*operations.OperationsSnapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	snap, ok := s.snapshots[tenantID]
	if !ok {
		return nil, ErrSnapshotNotFound
	}
	return snap, nil
}

func (s *MemoryOperationsStore) SaveDecision(ctx context.Context, dec *operations.OperationsDecision) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.decisions[dec.WorkflowID] = append(s.decisions[dec.WorkflowID], dec)
	return nil
}

func (s *MemoryOperationsStore) ListDecisions(ctx context.Context, tenantID, workflowID string) ([]*operations.OperationsDecision, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := s.decisions[workflowID]
	var res []*operations.OperationsDecision
	for _, d := range list {
		if d.TenantID == tenantID {
			res = append(res, d)
		}
	}
	return res, nil
}

func (s *MemoryOperationsStore) SavePlan(ctx context.Context, plan *operations.OperationPlan) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.plans[plan.WorkflowID] = append(s.plans[plan.WorkflowID], plan)
	return nil
}

func (s *MemoryOperationsStore) GetLatestPlan(ctx context.Context, tenantID, workflowID string) (*operations.OperationPlan, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list, ok := s.plans[workflowID]
	if !ok || len(list) == 0 {
		return nil, ErrPlanNotFound
	}
	return list[len(list)-1], nil
}

func (s *MemoryOperationsStore) SavePlanDiff(ctx context.Context, diff *operations.OperationPlanDiff) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.planDiffs[diff.PlanID] = append(s.planDiffs[diff.PlanID], diff)
	return nil
}

func (s *MemoryOperationsStore) SaveIncident(ctx context.Context, inc *operations.OperationsIncident) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.incidents[inc.IncidentID] = inc
	return nil
}

func (s *MemoryOperationsStore) GetIncident(ctx context.Context, tenantID, incidentID string) (*operations.OperationsIncident, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	inc, ok := s.incidents[incidentID]
	if !ok || inc.TenantID != tenantID {
		return nil, ErrIncidentNotFound
	}
	return inc, nil
}

func (s *MemoryOperationsStore) ListIncidents(ctx context.Context, tenantID string) ([]*operations.OperationsIncident, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*operations.OperationsIncident
	for _, inc := range s.incidents {
		if inc.TenantID == tenantID {
			res = append(res, inc)
		}
	}
	return res, nil
}

func (s *MemoryOperationsStore) SaveCausalLink(ctx context.Context, link *operations.CausalLink) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.causalLinks[link.EventID] = link
	return nil
}

func (s *MemoryOperationsStore) GetCausalChain(ctx context.Context, tenantID, eventID string) ([]*operations.CausalLink, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var chain []*operations.CausalLink
	curr := eventID
	for curr != "" && len(chain) < 20 {
		link, ok := s.causalLinks[curr]
		if !ok || link.TenantID != tenantID {
			break
		}
		chain = append(chain, link)
		curr = link.CausedByEventID
	}
	return chain, nil
}

// PostgresOperationsStore provides PostgreSQL persistence for Operations OS.
type PostgresOperationsStore struct {
	db *sql.DB
}

// NewPostgresOperationsStore creates an instance of PostgresOperationsStore.
func NewPostgresOperationsStore(db *sql.DB) *PostgresOperationsStore {
	return &PostgresOperationsStore{db: db}
}

func (s *PostgresOperationsStore) SaveSnapshot(ctx context.Context, snap *operations.OperationsSnapshot) error {
	query := `INSERT INTO operations_snapshots (
		snapshot_id, tenant_id, snapshot_version, freshness,
		active_workflows, queued_workflows, blocked_workflows, failed_workflows, recovering_workflows,
		active_agents, available_workers, treasury_state, liquidity_state, clearing_state,
		security_state, policy_state, arc_state, incident_count, generated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`

	_, err := s.db.ExecContext(ctx, query,
		snap.SnapshotID, snap.TenantID, snap.SnapshotVersion, snap.Freshness,
		snap.ActiveWorkflows, snap.QueuedWorkflows, snap.BlockedWorkflows, snap.FailedWorkflows, snap.RecoveringWorkflows,
		snap.ActiveAgents, snap.AvailableWorkers, snap.TreasuryState, snap.LiquidityState, snap.ClearingState,
		snap.SecurityState, snap.PolicyState, snap.ArcState, snap.IncidentCount, snap.GeneratedAt,
	)
	return err
}

func (s *PostgresOperationsStore) GetLatestSnapshot(ctx context.Context, tenantID string) (*operations.OperationsSnapshot, error) {
	query := `SELECT snapshot_id, tenant_id, snapshot_version, freshness,
		active_workflows, queued_workflows, blocked_workflows, failed_workflows, recovering_workflows,
		active_agents, available_workers, treasury_state, liquidity_state, clearing_state,
		security_state, policy_state, arc_state, incident_count, generated_at
	FROM operations_snapshots
	WHERE tenant_id = $1
	ORDER BY generated_at DESC
	LIMIT 1`

	snap := &operations.OperationsSnapshot{}
	err := s.db.QueryRowContext(ctx, query, tenantID).Scan(
		&snap.SnapshotID, &snap.TenantID, &snap.SnapshotVersion, &snap.Freshness,
		&snap.ActiveWorkflows, &snap.QueuedWorkflows, &snap.BlockedWorkflows, &snap.FailedWorkflows, &snap.RecoveringWorkflows,
		&snap.ActiveAgents, &snap.AvailableWorkers, &snap.TreasuryState, &snap.LiquidityState, &snap.ClearingState,
		&snap.SecurityState, &snap.PolicyState, &snap.ArcState, &snap.IncidentCount, &snap.GeneratedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrSnapshotNotFound
	}
	return snap, err
}

func (s *PostgresOperationsStore) SaveDecision(ctx context.Context, dec *operations.OperationsDecision) error {
	constraintsBytes, _ := json.Marshal(dec.Constraints)
	query := `INSERT INTO operations_decisions (
		decision_id, tenant_id, workflow_id, step_id, decision_type, reason_code,
		inputs_hash, state_version, actor, evidence, constraints, action, financial_authority, timestamp
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`

	_, err := s.db.ExecContext(ctx, query,
		dec.DecisionID, dec.TenantID, dec.WorkflowID, dec.StepID, dec.DecisionType, dec.ReasonCode,
		dec.InputsHash, dec.StateVersion, dec.Actor, dec.Evidence, constraintsBytes, dec.Action,
		dec.FinancialAuthority, dec.Timestamp,
	)
	return err
}

func (s *PostgresOperationsStore) ListDecisions(ctx context.Context, tenantID, workflowID string) ([]*operations.OperationsDecision, error) {
	query := `SELECT decision_id, tenant_id, workflow_id, step_id, decision_type, reason_code,
		inputs_hash, state_version, actor, evidence, action, financial_authority, timestamp
	FROM operations_decisions
	WHERE tenant_id = $1 AND workflow_id = $2
	ORDER BY timestamp ASC`

	rows, err := s.db.QueryContext(ctx, query, tenantID, workflowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*operations.OperationsDecision
	for rows.Next() {
		dec := &operations.OperationsDecision{}
		var stepID sql.NullString
		var evidence sql.NullString
		var action sql.NullString

		if err := rows.Scan(
			&dec.DecisionID, &dec.TenantID, &dec.WorkflowID, &stepID, &dec.DecisionType, &dec.ReasonCode,
			&dec.InputsHash, &dec.StateVersion, &dec.Actor, &evidence, &action, &dec.FinancialAuthority, &dec.Timestamp,
		); err != nil {
			return nil, err
		}
		if stepID.Valid {
			dec.StepID = stepID.String
		}
		if evidence.Valid {
			dec.Evidence = evidence.String
		}
		if action.Valid {
			dec.Action = action.String
		}
		result = append(result, dec)
	}
	return result, rows.Err()
}

func (s *PostgresOperationsStore) SavePlan(ctx context.Context, plan *operations.OperationPlan) error {
	stepsBytes, _ := json.Marshal(plan.Steps)
	depsBytes, _ := json.Marshal(plan.Dependencies)

	query := `INSERT INTO operations_plans (
		plan_id, tenant_id, workflow_id, plan_version, state, steps, dependencies, created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := s.db.ExecContext(ctx, query,
		plan.PlanID, plan.TenantID, plan.WorkflowID, plan.PlanVersion, plan.State,
		stepsBytes, depsBytes, plan.CreatedAt, plan.UpdatedAt,
	)
	return err
}

func (s *PostgresOperationsStore) GetLatestPlan(ctx context.Context, tenantID, workflowID string) (*operations.OperationPlan, error) {
	query := `SELECT plan_id, tenant_id, workflow_id, plan_version, state, steps, dependencies, created_at, updated_at
	FROM operations_plans
	WHERE tenant_id = $1 AND workflow_id = $2
	ORDER BY plan_version DESC
	LIMIT 1`

	plan := &operations.OperationPlan{}
	var stepsBytes []byte
	var depsBytes []byte

	err := s.db.QueryRowContext(ctx, query, tenantID, workflowID).Scan(
		&plan.PlanID, &plan.TenantID, &plan.WorkflowID, &plan.PlanVersion, &plan.State,
		&stepsBytes, &depsBytes, &plan.CreatedAt, &plan.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrPlanNotFound
	}
	if err != nil {
		return nil, err
	}

	_ = json.Unmarshal(stepsBytes, &plan.Steps)
	_ = json.Unmarshal(depsBytes, &plan.Dependencies)
	return plan, nil
}

func (s *PostgresOperationsStore) SavePlanDiff(ctx context.Context, diff *operations.OperationPlanDiff) error {
	addedBytes, _ := json.Marshal(diff.AddedSteps)
	removedBytes, _ := json.Marshal(diff.RemovedSteps)
	changedDepsBytes, _ := json.Marshal(diff.ChangedDependencies)
	changedProvBytes, _ := json.Marshal(diff.ChangedProviders)

	query := `INSERT INTO operations_plan_diffs (
		diff_id, tenant_id, plan_id, from_version, to_version,
		added_steps, removed_steps, changed_dependencies, changed_providers, policy_revalidation_required, created_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	_, err := s.db.ExecContext(ctx, query,
		diff.DiffID, diff.TenantID, diff.PlanID, diff.FromVersion, diff.ToVersion,
		addedBytes, removedBytes, changedDepsBytes, changedProvBytes, diff.PolicyRevalidationRequired, diff.CreatedAt,
	)
	return err
}

func (s *PostgresOperationsStore) SaveIncident(ctx context.Context, inc *operations.OperationsIncident) error {
	affWfBytes, _ := json.Marshal(inc.AffectedWorkflows)
	affResBytes, _ := json.Marshal(inc.AffectedResources)
	mitActionsBytes, _ := json.Marshal(inc.MitigationActions)

	query := `INSERT INTO operations_incidents (
		incident_id, tenant_id, severity, category, state, root_cause,
		affected_workflows, affected_resources, mitigation_actions, correlation_id, detected_at, triaged_at, resolved_at, closed_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	ON CONFLICT (incident_id) DO UPDATE SET
		state = EXCLUDED.state,
		mitigation_actions = EXCLUDED.mitigation_actions,
		triaged_at = EXCLUDED.triaged_at,
		resolved_at = EXCLUDED.resolved_at,
		closed_at = EXCLUDED.closed_at`

	_, err := s.db.ExecContext(ctx, query,
		inc.IncidentID, inc.TenantID, inc.Severity, inc.Category, inc.State, inc.RootCause,
		affWfBytes, affResBytes, mitActionsBytes, inc.CorrelationID, inc.DetectedAt, inc.TriagedAt, inc.ResolvedAt, inc.ClosedAt,
	)
	return err
}

func (s *PostgresOperationsStore) GetIncident(ctx context.Context, tenantID, incidentID string) (*operations.OperationsIncident, error) {
	query := `SELECT incident_id, tenant_id, severity, category, state, root_cause,
		affected_workflows, affected_resources, mitigation_actions, correlation_id, detected_at, triaged_at, resolved_at, closed_at
	FROM operations_incidents
	WHERE tenant_id = $1 AND incident_id = $2`

	inc := &operations.OperationsIncident{}
	var affWfBytes []byte
	var affResBytes []byte
	var mitActionsBytes []byte
	var rootCause sql.NullString
	var corrID sql.NullString

	err := s.db.QueryRowContext(ctx, query, tenantID, incidentID).Scan(
		&inc.IncidentID, &inc.TenantID, &inc.Severity, &inc.Category, &inc.State, &rootCause,
		&affWfBytes, &affResBytes, &mitActionsBytes, &corrID, &inc.DetectedAt, &inc.TriagedAt, &inc.ResolvedAt, &inc.ClosedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrIncidentNotFound
	}
	if err != nil {
		return nil, err
	}

	if rootCause.Valid {
		inc.RootCause = rootCause.String
	}
	if corrID.Valid {
		inc.CorrelationID = corrID.String
	}
	_ = json.Unmarshal(affWfBytes, &inc.AffectedWorkflows)
	_ = json.Unmarshal(affResBytes, &inc.AffectedResources)
	_ = json.Unmarshal(mitActionsBytes, &inc.MitigationActions)
	return inc, nil
}

func (s *PostgresOperationsStore) ListIncidents(ctx context.Context, tenantID string) ([]*operations.OperationsIncident, error) {
	query := `SELECT incident_id, tenant_id, severity, category, state, root_cause,
		affected_workflows, affected_resources, mitigation_actions, correlation_id, detected_at, triaged_at, resolved_at, closed_at
	FROM operations_incidents
	WHERE tenant_id = $1
	ORDER BY detected_at DESC`

	rows, err := s.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*operations.OperationsIncident
	for rows.Next() {
		inc := &operations.OperationsIncident{}
		var affWfBytes []byte
		var affResBytes []byte
		var mitActionsBytes []byte
		var rootCause sql.NullString
		var corrID sql.NullString

		if err := rows.Scan(
			&inc.IncidentID, &inc.TenantID, &inc.Severity, &inc.Category, &inc.State, &rootCause,
			&affWfBytes, &affResBytes, &mitActionsBytes, &corrID, &inc.DetectedAt, &inc.TriagedAt, &inc.ResolvedAt, &inc.ClosedAt,
		); err != nil {
			return nil, err
		}
		if rootCause.Valid {
			inc.RootCause = rootCause.String
		}
		if corrID.Valid {
			inc.CorrelationID = corrID.String
		}
		_ = json.Unmarshal(affWfBytes, &inc.AffectedWorkflows)
		_ = json.Unmarshal(affResBytes, &inc.AffectedResources)
		_ = json.Unmarshal(mitActionsBytes, &inc.MitigationActions)
		result = append(result, inc)
	}
	return result, rows.Err()
}

func (s *PostgresOperationsStore) SaveCausalLink(ctx context.Context, link *operations.CausalLink) error {
	query := `INSERT INTO operations_causal_links (
		link_id, tenant_id, event_id, caused_by_event_id, causal_type, trigger, evidence, created_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := s.db.ExecContext(ctx, query,
		link.LinkID, link.TenantID, link.EventID, link.CausedByEventID,
		link.CausalType, link.Trigger, link.Evidence, link.CreatedAt,
	)
	return err
}

func (s *PostgresOperationsStore) GetCausalChain(ctx context.Context, tenantID, eventID string) ([]*operations.CausalLink, error) {
	// Simple iterative traversal
	var chain []*operations.CausalLink
	curr := eventID

	for curr != "" && len(chain) < 20 {
		query := `SELECT link_id, tenant_id, event_id, caused_by_event_id, causal_type, trigger, evidence, created_at
		FROM operations_causal_links
		WHERE tenant_id = $1 AND event_id = $2`

		link := &operations.CausalLink{}
		var parentID sql.NullString
		var evidence sql.NullString

		err := s.db.QueryRowContext(ctx, query, tenantID, curr).Scan(
			&link.LinkID, &link.TenantID, &link.EventID, &parentID,
			&link.CausalType, &link.Trigger, &evidence, &link.CreatedAt,
		)
		if err == sql.ErrNoRows {
			break
		}
		if err != nil {
			return nil, err
		}
		if parentID.Valid {
			link.CausedByEventID = parentID.String
		}
		if evidence.Valid {
			link.Evidence = evidence.String
		}

		chain = append(chain, link)
		curr = link.CausedByEventID
	}

	return chain, nil
}
