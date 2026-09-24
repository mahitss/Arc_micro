-- ============================================================
-- 000013_economic_fabric.up.sql
-- TASK 15: AGENTPAY AUTONOMOUS ECONOMIC FABRIC SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS economic_objectives (
    objective_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    owner VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL, -- DRAFT, PLANNED, SIMULATED, APPROVED, RUNNING, WAITING, DEGRADED, RECOVERING, COMPLETED, FAILED, CANCELLED, EXPIRED
    constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
    economic_budget_usdc NUMERIC(20, 6) NOT NULL DEFAULT 0,
    operational_budget JSONB NOT NULL DEFAULT '{}'::jsonb,
    risk_tolerance VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    required_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    active_blueprint_id VARCHAR(64),
    active_mission_id VARCHAR(64),
    active_workflow_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_economic_objectives_tenant ON economic_objectives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_economic_objectives_status ON economic_objectives(status);

CREATE TABLE IF NOT EXISTS execution_blueprints (
    blueprint_id VARCHAR(64) PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL REFERENCES economic_objectives(objective_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    mission_graph JSONB NOT NULL DEFAULT '{}'::jsonb,
    task_graph JSONB NOT NULL DEFAULT '[]'::jsonb,
    agent_assignments JSONB NOT NULL DEFAULT '{}'::jsonb,
    service_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
    resource_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    deadlines JSONB NOT NULL DEFAULT '{}'::jsonb,
    economic_envelope_id VARCHAR(64),
    risk_envelope_id VARCHAR(64),
    resource_envelope_id VARCHAR(64),
    policy_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    verification_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    fallback_strategies JSONB NOT NULL DEFAULT '[]'::jsonb,
    simulation_id VARCHAR(64),
    simulation_timestamp TIMESTAMPTZ,
    simulation_stale BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPILED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprints_objective ON execution_blueprints(objective_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_tenant ON execution_blueprints(tenant_id);

CREATE TABLE IF NOT EXISTS blueprint_versions (
    version_id VARCHAR(64) PRIMARY KEY,
    blueprint_id VARCHAR(64) NOT NULL REFERENCES execution_blueprints(blueprint_id) ON DELETE CASCADE,
    objective_id VARCHAR(64) NOT NULL,
    version INT NOT NULL,
    diff_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    replan_reason VARCHAR(64),
    policy_revalidation_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprint_versions_bp ON blueprint_versions(blueprint_id);

CREATE TABLE IF NOT EXISTS economic_envelopes (
    envelope_id VARCHAR(64) PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL REFERENCES economic_objectives(objective_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    max_total_cost_usdc NUMERIC(20, 6) NOT NULL DEFAULT 0,
    max_single_cost_usdc NUMERIC(20, 6) NOT NULL DEFAULT 0,
    max_exposure_usdc NUMERIC(20, 6) NOT NULL DEFAULT 0,
    max_parallel_exposure_usdc NUMERIC(20, 6) NOT NULL DEFAULT 0,
    reserved_amount_usdc NUMERIC(20, 6) NOT NULL DEFAULT 0,
    spent_amount_usdc NUMERIC(20, 6) NOT NULL DEFAULT 0,
    expiry TIMESTAMPTZ NOT NULL,
    policy_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_economic_envelopes_objective ON economic_envelopes(objective_id);

CREATE TABLE IF NOT EXISTS risk_envelopes (
    envelope_id VARCHAR(64) PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL REFERENCES economic_objectives(objective_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    max_risk_score INT NOT NULL DEFAULT 50,
    allowed_risk_classes JSONB NOT NULL DEFAULT '["LOW", "MEDIUM"]'::jsonb,
    escalation_threshold INT NOT NULL DEFAULT 70,
    confidence_threshold NUMERIC(5, 4) NOT NULL DEFAULT 0.85,
    security_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_envelopes (
    envelope_id VARCHAR(64) PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL REFERENCES economic_objectives(objective_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    max_workers INT NOT NULL DEFAULT 5,
    max_parallel_tasks INT NOT NULL DEFAULT 10,
    max_provider_calls INT NOT NULL DEFAULT 50,
    max_agent_depth INT NOT NULL DEFAULT 3,
    max_runtime_seconds INT NOT NULL DEFAULT 3600,
    max_retries INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fabric_decisions (
    decision_id VARCHAR(64) PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL REFERENCES economic_objectives(objective_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    decision_type VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64) NOT NULL,
    explanation TEXT NOT NULL,
    inputs_hash VARCHAR(64) NOT NULL,
    financial_authority VARCHAR(32) NOT NULL DEFAULT 'UNCHANGED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fabric_decisions_obj ON fabric_decisions(objective_id);

CREATE TABLE IF NOT EXISTS fabric_causal_links (
    link_id VARCHAR(64) PRIMARY KEY,
    objective_id VARCHAR(64) NOT NULL REFERENCES economic_objectives(objective_id) ON DELETE CASCADE,
    source_node_type VARCHAR(32) NOT NULL,
    source_node_id VARCHAR(64) NOT NULL,
    target_node_type VARCHAR(32) NOT NULL,
    target_node_id VARCHAR(64) NOT NULL,
    relation VARCHAR(32) NOT NULL,
    caused_by_event_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fabric_causal_links_obj ON fabric_causal_links(objective_id);
