-- 000011_durable_runtime.up.sql
-- AgentPay Autonomous Operations & Durable Runtime Schema

CREATE TABLE IF NOT EXISTS workflows (
    workflow_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    workflow_type VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    priority INT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(128) NOT NULL,
    parent_workflow_id VARCHAR(64),
    correlation_id VARCHAR(128),
    current_step VARCHAR(64),
    failure_reason TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    deadline TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    CONSTRAINT uq_workflows_tenant_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_workflows_tenant_state ON workflows (tenant_id, state);
CREATE INDEX IF NOT EXISTS idx_workflows_deadline ON workflows (deadline) WHERE state IN ('RUNNING', 'WAITING', 'RETRYING');
CREATE INDEX IF NOT EXISTS idx_workflows_correlation ON workflows (correlation_id);
CREATE INDEX IF NOT EXISTS idx_workflows_aggregate ON workflows (aggregate_type, aggregate_id);

CREATE TABLE IF NOT EXISTS execution_steps (
    step_id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) NOT NULL REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    step_type VARCHAR(64) NOT NULL,
    sequence INT NOT NULL,
    state VARCHAR(32) NOT NULL,
    attempt INT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(128) NOT NULL,
    input_hash VARCHAR(64),
    output_hash VARCHAR(64),
    lease_owner VARCHAR(64),
    lease_expires_at TIMESTAMPTZ,
    timeout_seconds INT NOT NULL DEFAULT 60,
    next_retry_at TIMESTAMPTZ,
    error_code VARCHAR(64),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inputs JSONB,
    outputs JSONB,
    CONSTRAINT uq_execution_steps_wf_seq UNIQUE (workflow_id, sequence),
    CONSTRAINT uq_execution_steps_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_execution_steps_wf_state ON execution_steps (workflow_id, state);
CREATE INDEX IF NOT EXISTS idx_execution_steps_lease_exp ON execution_steps (lease_expires_at) WHERE state = 'RUNNING';
CREATE INDEX IF NOT EXISTS idx_execution_steps_retry ON execution_steps (next_retry_at) WHERE state = 'RETRYABLE_FAILURE';

CREATE TABLE IF NOT EXISTS leases (
    lease_id VARCHAR(64) PRIMARY KEY,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    worker_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fencing_token BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT uq_leases_resource UNIQUE (resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_leases_worker ON leases (worker_id);
CREATE INDEX IF NOT EXISTS idx_leases_expires ON leases (expires_at);

CREATE TABLE IF NOT EXISTS checkpoints (
    checkpoint_id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) NOT NULL REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    step_id VARCHAR(64),
    tenant_id VARCHAR(64) NOT NULL,
    state_hash VARCHAR(64) NOT NULL,
    event_position BIGINT NOT NULL DEFAULT 0,
    schema_version INT NOT NULL DEFAULT 1,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_wf ON checkpoints (workflow_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workers (
    worker_id VARCHAR(64) PRIMARY KEY,
    worker_type VARCHAR(64) NOT NULL,
    hostname VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY',
    capabilities JSONB,
    version VARCHAR(32) NOT NULL,
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_heartbeat ON workers (heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers (status);

CREATE TABLE IF NOT EXISTS runtime_decisions (
    decision_id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) NOT NULL,
    step_id VARCHAR(64),
    tenant_id VARCHAR(64) NOT NULL,
    decision_type VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64) NOT NULL,
    inputs_hash VARCHAR(64),
    state_version INT NOT NULL,
    policy_snapshot_id VARCHAR(64),
    actor VARCHAR(64) NOT NULL,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_decisions_wf ON runtime_decisions (workflow_id);
CREATE INDEX IF NOT EXISTS idx_runtime_decisions_tenant ON runtime_decisions (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
    event_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempt INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_delivery ON outbox_events (status, next_attempt_at) WHERE status IN ('PENDING', 'RETRYING');

CREATE TABLE IF NOT EXISTS inbox_events (
    inbox_id VARCHAR(64) PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    tenant_id VARCHAR(64) NOT NULL,
    sender_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_events_status ON inbox_events (status);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    job_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    job_type VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    payload JSONB,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_due ON scheduled_jobs (state, scheduled_at) WHERE state = 'SCHEDULED';

CREATE TABLE IF NOT EXISTS runtime_incidents (
    incident_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    workflow_id VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    root_cause TEXT,
    evidence JSONB,
    remediation TEXT,
    correlation_id VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_runtime_incidents_tenant_state ON runtime_incidents (tenant_id, state);
