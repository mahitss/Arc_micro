-- Task 11: Autonomous Treasury & Liquidity Orchestrator Migrations

CREATE TABLE IF NOT EXISTS treasury_states (
    treasury_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    vault_address VARCHAR(128) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    mode VARCHAR(16) NOT NULL DEFAULT 'REAL',
    total_balance VARCHAR(64) NOT NULL,
    available_balance VARCHAR(64) NOT NULL,
    reserved_balance VARCHAR(64) NOT NULL DEFAULT '0',
    committed_balance VARCHAR(64) NOT NULL DEFAULT '0',
    pending_settlement VARCHAR(64) NOT NULL DEFAULT '0',
    disputed_balance VARCHAR(64) NOT NULL DEFAULT '0',
    minimum_buffer VARCHAR(64) NOT NULL DEFAULT '0',
    maximum_exposure VARCHAR(64) NOT NULL,
    operational_mode VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    source_version BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_states_org_mode ON treasury_states(organization_id, mode);

CREATE TABLE IF NOT EXISTS liquidity_reservations (
    reservation_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    source VARCHAR(32) NOT NULL,
    obligation_id VARCHAR(64),
    mission_id VARCHAR(64),
    swarm_id VARCHAR(64),
    agent_id VARCHAR(64),
    amount VARCHAR(64) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    mode VARCHAR(16) NOT NULL DEFAULT 'REAL',
    status VARCHAR(32) NOT NULL DEFAULT 'RESERVED',
    policy_version VARCHAR(32),
    policy_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_liquidity_reservations_org_status ON liquidity_reservations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_liquidity_reservations_obligation ON liquidity_reservations(obligation_id);

CREATE TABLE IF NOT EXISTS liquidity_commitments (
    commitment_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'HARD_COMMITMENT',
    lifecycle VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
    amount VARCHAR(64) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    source VARCHAR(32) NOT NULL,
    source_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    matures_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liquidity_commitments_org ON liquidity_commitments(organization_id);

CREATE TABLE IF NOT EXISTS expected_inflows (
    inflow_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    source VARCHAR(32) NOT NULL,
    expected_amount VARCHAR(64) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    expected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.90,
    status VARCHAR(32) NOT NULL DEFAULT 'EXPECTED',
    verified_at TIMESTAMP WITH TIME ZONE,
    tx_hash VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_expected_inflows_org_status ON expected_inflows(organization_id, status);

CREATE TABLE IF NOT EXISTS liquidity_buffer_policies (
    policy_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    scope VARCHAR(32) NOT NULL DEFAULT 'ORGANIZATION',
    scope_id VARCHAR(64) NOT NULL,
    minimum_absolute VARCHAR(64) NOT NULL DEFAULT '0',
    minimum_percentage NUMERIC(5, 4) NOT NULL DEFAULT 0.20,
    emergency_buffer VARCHAR(64) NOT NULL DEFAULT '0',
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    effective_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buffer_policies_org_scope ON liquidity_buffer_policies(organization_id, scope, scope_id);

CREATE TABLE IF NOT EXISTS liquidity_anomalies (
    anomaly_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'LOW',
    affected_scope VARCHAR(128),
    evidence TEXT,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN'
);

CREATE INDEX IF NOT EXISTS idx_liquidity_anomalies_org ON liquidity_anomalies(organization_id);
