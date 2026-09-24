-- =============================================================================
-- TASK 17: AGENTPAY AUTONOMOUS ECONOMIC MARKETPLACE MIGRATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_listings (
    listing_id VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL DEFAULT 'tenant_default',
    provider_agent_id VARCHAR(128) NOT NULL,
    capability_id VARCHAR(128) NOT NULL,
    title VARCHAR(256) NOT NULL,
    description TEXT NOT NULL,
    input_schema JSONB,
    output_schema JSONB,
    pricing_model VARCHAR(64) NOT NULL DEFAULT 'FIXED',
    base_price_usdc NUMERIC(20, 6) NOT NULL DEFAULT 0.0,
    availability VARCHAR(64) NOT NULL DEFAULT 'AVAILABLE',
    estimated_latency_ms INTEGER NOT NULL DEFAULT 100,
    quality_requirements JSONB,
    supported_protocol_versions JSONB,
    verification_method VARCHAR(128) NOT NULL DEFAULT 'CRYPTO_HASH_AND_SCHEMA',
    status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_service_listings_tenant_cap ON service_listings(tenant_id, capability_id);
CREATE INDEX IF NOT EXISTS idx_service_listings_provider ON service_listings(provider_agent_id);
CREATE INDEX IF NOT EXISTS idx_service_listings_status ON service_listings(status);

CREATE TABLE IF NOT EXISTS marketplace_opportunities (
    opportunity_id VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL DEFAULT 'tenant_default',
    requester_id VARCHAR(128) NOT NULL,
    capability VARCHAR(128) NOT NULL,
    title VARCHAR(256) NOT NULL DEFAULT 'Work Opportunity',
    requirements JSONB,
    deadline TIMESTAMPTZ NOT NULL,
    budget_constraint_usdc NUMERIC(20, 6) NOT NULL DEFAULT 100.0,
    quality_requirement JSONB,
    risk_requirement JSONB,
    constraints JSONB,
    status VARCHAR(64) NOT NULL DEFAULT 'OPEN',
    awarded_provider_id VARCHAR(128),
    awarded_quote_id VARCHAR(128),
    contract_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_status ON marketplace_opportunities(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_capability ON marketplace_opportunities(capability);

CREATE TABLE IF NOT EXISTS marketplace_matches (
    match_id VARCHAR(128) PRIMARY KEY,
    opportunity_id VARCHAR(128) NOT NULL REFERENCES marketplace_opportunities(opportunity_id) ON DELETE CASCADE,
    tenant_id VARCHAR(128) NOT NULL DEFAULT 'tenant_default',
    candidates JSONB NOT NULL,
    selected_provider_id VARCHAR(128),
    match_explanation JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_matches_opp ON marketplace_matches(opportunity_id);

CREATE TABLE IF NOT EXISTS marketplace_metrics (
    metric_id VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL DEFAULT 'tenant_default',
    provider_agent_id VARCHAR(128) NOT NULL,
    capability_id VARCHAR(128) NOT NULL,
    sample_size INTEGER NOT NULL DEFAULT 0,
    completion_rate NUMERIC(5, 4) NOT NULL DEFAULT 1.0,
    failure_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0,
    timeout_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0,
    avg_duration_ms INTEGER NOT NULL DEFAULT 0,
    p50_duration_ms INTEGER NOT NULL DEFAULT 0,
    p95_duration_ms INTEGER NOT NULL DEFAULT 0,
    quote_accuracy NUMERIC(5, 4) NOT NULL DEFAULT 1.0,
    result_acceptance_rate NUMERIC(5, 4) NOT NULL DEFAULT 1.0,
    dispute_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0,
    cancellation_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_marketplace_metrics_provider_cap UNIQUE (tenant_id, provider_agent_id, capability_id)
);

CREATE TABLE IF NOT EXISTS marketplace_anomalies (
    anomaly_id VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL DEFAULT 'tenant_default',
    provider_agent_id VARCHAR(128) NOT NULL,
    anomaly_type VARCHAR(128) NOT NULL,
    severity VARCHAR(64) NOT NULL DEFAULT 'MEDIUM',
    description TEXT NOT NULL,
    evidence JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_anomalies_provider ON marketplace_anomalies(provider_agent_id);
