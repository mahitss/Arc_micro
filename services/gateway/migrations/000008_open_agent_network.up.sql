-- Open Agent Network Tables & Indexes (Phase 2)

-- 1. Agent Network Identities
CREATE TABLE IF NOT EXISTS agent_network_identities (
    agent_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    display_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    protocol_version VARCHAR(64) NOT NULL DEFAULT 'agentpay.network.v1',
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    supported_task_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    supported_input_schemas JSONB NOT NULL DEFAULT '{}'::jsonb,
    supported_output_schemas JSONB NOT NULL DEFAULT '{}'::jsonb,
    pricing_models JSONB NOT NULL DEFAULT '["FIXED"]'::jsonb,
    currencies JSONB NOT NULL DEFAULT '["USDC"]'::jsonb,
    settlement_methods JSONB NOT NULL DEFAULT '["ARC_USDC"]'::jsonb,
    availability VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    geographic_scope VARCHAR(64) NOT NULL DEFAULT '',
    trust_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    reputation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    endpoint_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    callback_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    authentication_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_identities_org ON agent_network_identities(organization_id);
CREATE INDEX IF NOT EXISTS idx_network_identities_status ON agent_network_identities(status);

-- 2. Agent Manifests
CREATE TABLE IF NOT EXISTS agent_manifests (
    agent_id VARCHAR(64) PRIMARY KEY REFERENCES agent_network_identities(agent_id) ON DELETE CASCADE,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    manifest_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_manifests_org ON agent_manifests(organization_id);

-- 3. Structured Capabilities Registry
CREATE TABLE IF NOT EXISTS agent_capabilities (
    capability_id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    pricing_model VARCHAR(32) NOT NULL DEFAULT 'FIXED',
    expected_latency_ms BIGINT NOT NULL DEFAULT 1000,
    resource_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    reliability_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    verification_requirement VARCHAR(32) NOT NULL DEFAULT 'SCHEMA',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_capabilities_category ON agent_capabilities(category);

-- 4. Agent Service Contracts
CREATE TABLE IF NOT EXISTS agent_service_contracts (
    contract_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    requester_agent_id VARCHAR(64) NOT NULL,
    provider_agent_id VARCHAR(64) NOT NULL,
    capability VARCHAR(128) NOT NULL,
    mission_id VARCHAR(64) DEFAULT '',
    root_mission_id VARCHAR(64) DEFAULT '',
    parent_contract_id VARCHAR(64) DEFAULT '',
    delegation_depth INT NOT NULL DEFAULT 0,
    input_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    price VARCHAR(64) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    budget_ceiling VARCHAR(64) NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    expiration TIMESTAMP WITH TIME ZONE NOT NULL,
    verification_policy VARCHAR(64) NOT NULL DEFAULT 'SCHEMA_STRICT',
    cancellation_policy VARCHAR(64) NOT NULL DEFAULT 'DEFAULT',
    dispute_policy VARCHAR(64) NOT NULL DEFAULT 'DEFAULT',
    payment_terms VARCHAR(64) NOT NULL DEFAULT 'ON_VERIFIED_RESULT',
    payment_intent_id VARCHAR(64) DEFAULT '',
    quote_id VARCHAR(64) DEFAULT '',
    state VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
    result_payload JSONB DEFAULT NULL,
    error_msg TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_contracts_org ON agent_service_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_contracts_requester ON agent_service_contracts(requester_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_contracts_provider ON agent_service_contracts(provider_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_contracts_state ON agent_service_contracts(state);
CREATE INDEX IF NOT EXISTS idx_agent_contracts_mission ON agent_service_contracts(mission_id);

-- 5. Agent Trust Profiles
CREATE TABLE IF NOT EXISTS agent_trust_profiles (
    agent_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    successful_jobs BIGINT NOT NULL DEFAULT 0,
    failed_jobs BIGINT NOT NULL DEFAULT 0,
    timeout_count BIGINT NOT NULL DEFAULT 0,
    dispute_count BIGINT NOT NULL DEFAULT 0,
    verification_successes BIGINT NOT NULL DEFAULT 0,
    verification_failures BIGINT NOT NULL DEFAULT 0,
    historical_cost_accurate BIGINT NOT NULL DEFAULT 0,
    historical_cost_deviated BIGINT NOT NULL DEFAULT 0,
    average_latency_ms BIGINT NOT NULL DEFAULT 0,
    policy_violations_count BIGINT NOT NULL DEFAULT 0,
    security_incidents_count BIGINT NOT NULL DEFAULT 0,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_trust_org ON agent_trust_profiles(organization_id);

-- 6. Agent Disputes
CREATE TABLE IF NOT EXISTS agent_disputes (
    dispute_id VARCHAR(64) PRIMARY KEY,
    contract_id VARCHAR(64) NOT NULL REFERENCES agent_service_contracts(contract_id),
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    initiator_agent_id VARCHAR(64) NOT NULL,
    respondent_agent_id VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    evidence TEXT NOT NULL DEFAULT '',
    state VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    resolution_notes TEXT NOT NULL DEFAULT '',
    refund_amount VARCHAR(64) NOT NULL DEFAULT '0',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_disputes_contract ON agent_disputes(contract_id);
CREATE INDEX IF NOT EXISTS idx_agent_disputes_org ON agent_disputes(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_disputes_state ON agent_disputes(state);
