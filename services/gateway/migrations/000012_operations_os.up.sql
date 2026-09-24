-- 000012_operations_os.up.sql
-- AgentPay Autonomous Operations OS Schema (Task 14)

-- 1. Operations Snapshots (Aggregated Read Model Projections)
CREATE TABLE IF NOT EXISTS operations_snapshots (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    snapshot_version INT NOT NULL DEFAULT 1,
    freshness VARCHAR(32) NOT NULL DEFAULT 'FRESH',
    active_workflows INT NOT NULL DEFAULT 0,
    queued_workflows INT NOT NULL DEFAULT 0,
    blocked_workflows INT NOT NULL DEFAULT 0,
    failed_workflows INT NOT NULL DEFAULT 0,
    recovering_workflows INT NOT NULL DEFAULT 0,
    active_agents INT NOT NULL DEFAULT 0,
    available_workers INT NOT NULL DEFAULT 0,
    treasury_state VARCHAR(64) NOT NULL DEFAULT 'HEALTHY',
    liquidity_state VARCHAR(64) NOT NULL DEFAULT 'AVAILABLE',
    clearing_state VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
    security_state VARCHAR(64) NOT NULL DEFAULT 'NORMAL',
    policy_state VARCHAR(64) NOT NULL DEFAULT 'ENFORCING',
    arc_state VARCHAR(64) NOT NULL DEFAULT 'UNVERIFIED',
    incident_count INT NOT NULL DEFAULT 0,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_ops_snapshots_tenant ON operations_snapshots (tenant_id, generated_at DESC);

-- 2. Operations Decisions (Auditable Reasoning Record)
CREATE TABLE IF NOT EXISTS operations_decisions (
    decision_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    workflow_id VARCHAR(64) NOT NULL,
    step_id VARCHAR(64),
    decision_type VARCHAR(32) NOT NULL, -- RUN, WAIT, RETRY, RECOVER, REPLAN, ESCALATE, PAUSE, CANCEL, RECONCILE
    reason_code VARCHAR(64) NOT NULL,
    inputs_hash VARCHAR(64) NOT NULL,
    state_version INT NOT NULL,
    actor VARCHAR(64) NOT NULL DEFAULT 'SYSTEM_SUPERVISOR',
    evidence TEXT,
    constraints JSONB,
    action TEXT,
    financial_authority VARCHAR(32) NOT NULL DEFAULT 'UNCHANGED',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_decisions_wf ON operations_decisions (workflow_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_decisions_tenant ON operations_decisions (tenant_id, timestamp DESC);

-- 3. Operations Plans & Versioning
CREATE TABLE IF NOT EXISTS operations_plans (
    plan_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    workflow_id VARCHAR(64) NOT NULL,
    plan_version INT NOT NULL DEFAULT 1,
    state VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    steps JSONB NOT NULL,
    dependencies JSONB,
    resource_requirements JSONB,
    deadlines JSONB,
    retry_policies JSONB,
    checkpoint_references JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ops_plans_wf_version UNIQUE (workflow_id, plan_version)
);

CREATE INDEX IF NOT EXISTS idx_ops_plans_wf ON operations_plans (workflow_id, plan_version DESC);

-- 4. Operations Plan Diffs (Structural & Financial Impact Audit)
CREATE TABLE IF NOT EXISTS operations_plan_diffs (
    diff_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    plan_id VARCHAR(64) NOT NULL,
    from_version INT NOT NULL,
    to_version INT NOT NULL,
    added_steps JSONB,
    removed_steps JSONB,
    changed_dependencies JSONB,
    changed_deadlines JSONB,
    changed_providers JSONB,
    policy_revalidation_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_diffs_plan ON operations_plan_diffs (plan_id, to_version DESC);

-- 5. Operations Durable Queues
CREATE TABLE IF NOT EXISTS operations_queues (
    item_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    queue_name VARCHAR(64) NOT NULL, -- mission, swarm, task, recovery, reconciliation, callback, scheduled, incident
    priority INT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(128) NOT NULL,
    workflow_id VARCHAR(64),
    step_id VARCHAR(64),
    payload JSONB NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'QUEUED', -- QUEUED, IN_FLIGHT, COMPLETED, FAILED, DEAD_LETTERED
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    visibility_expires_at TIMESTAMPTZ,
    lease_owner VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ops_queues_idempotency UNIQUE (tenant_id, queue_name, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ops_queues_fetch ON operations_queues (tenant_id, queue_name, state, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ops_queues_visibility ON operations_queues (visibility_expires_at) WHERE state = 'IN_FLIGHT';

-- 6. Dead Letter System (Auditable Unrecoverable Work)
CREATE TABLE IF NOT EXISTS operations_dead_letters (
    dead_letter_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    item_id VARCHAR(64) NOT NULL,
    queue_name VARCHAR(64) NOT NULL,
    workflow_id VARCHAR(64),
    reason VARCHAR(128) NOT NULL,
    evidence TEXT,
    original_payload JSONB NOT NULL,
    attempt_history JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_dead_letters_tenant ON operations_dead_letters (tenant_id, created_at DESC);

-- 7. Operations Incidents & Correlation
CREATE TABLE IF NOT EXISTS operations_incidents (
    incident_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'MEDIUM', -- INFO, LOW, MEDIUM, HIGH, CRITICAL
    category VARCHAR(64) NOT NULL, -- WORKER_FAILURE, DATABASE_LATENCY, PROVIDER_OUTAGE, QUEUE_CONGESTION, etc.
    state VARCHAR(32) NOT NULL DEFAULT 'DETECTED', -- DETECTED, TRIAGED, INVESTIGATING, MITIGATING, MONITORING, RESOLVED, CLOSED
    root_cause TEXT,
    affected_workflows JSONB,
    affected_resources JSONB,
    mitigation_actions JSONB,
    correlation_id VARCHAR(128),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triaged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ops_incidents_tenant ON operations_incidents (tenant_id, state, severity);
CREATE INDEX IF NOT EXISTS idx_ops_incidents_correlation ON operations_incidents (correlation_id);

-- 8. Circuit Breakers (Providers & Agents)
CREATE TABLE IF NOT EXISTS operations_circuit_breakers (
    breaker_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL, -- PROVIDER, AGENT, SERVICE
    target_id VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'CLOSED', -- CLOSED, OPEN, HALF_OPEN
    failure_count INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    threshold INT NOT NULL DEFAULT 5,
    cooldown_seconds INT NOT NULL DEFAULT 60,
    last_failure_at TIMESTAMPTZ,
    next_probe_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ops_breakers_target UNIQUE (tenant_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_breakers_state ON operations_circuit_breakers (tenant_id, state);

-- 9. Causal Links ("Why Did This Happen?" Engine)
CREATE TABLE IF NOT EXISTS operations_causal_links (
    link_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    event_id VARCHAR(64) NOT NULL,
    caused_by_event_id VARCHAR(64),
    causal_type VARCHAR(64) NOT NULL,
    trigger TEXT NOT NULL,
    evidence TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_causal_event ON operations_causal_links (event_id);
CREATE INDEX IF NOT EXISTS idx_ops_causal_parent ON operations_causal_links (caused_by_event_id);
