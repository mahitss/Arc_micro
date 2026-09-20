-- Migration 000002: Establish AgentPay Domain Foundation V2

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed default organization to maintain backward compatibility
INSERT INTO organizations (id, name, status, created_at, updated_at)
VALUES ('org_default', 'Default Organization', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Policies
CREATE TABLE IF NOT EXISTS policies (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    agent_id VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    per_transaction_limit VARCHAR(78) NOT NULL DEFAULT '500000',
    daily_limit VARCHAR(78) NOT NULL DEFAULT '5000000',
    max_transactions_per_day INT NOT NULL DEFAULT 20,
    approval_threshold VARCHAR(78) NOT NULL DEFAULT '1000000',
    allowed_assets TEXT NOT NULL DEFAULT 'USDC',
    allowed_recipients TEXT DEFAULT NULL,
    blocked_recipients TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed default policy for research-agent
INSERT INTO policies (id, organization_id, agent_id, enabled, per_transaction_limit, daily_limit, max_transactions_per_day, approval_threshold, allowed_assets, created_at, updated_at)
VALUES ('pol_research_default', 'org_default', 'research-agent', TRUE, '500000', '5000000', 20, '1000000', 'USDC', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Extend Agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) REFERENCES organizations(id) DEFAULT 'org_default';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS policy_id VARCHAR(64) REFERENCES policies(id) DEFAULT 'pol_research_default';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS vault_address VARCHAR(42) DEFAULT '';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Extend Services
ALTER TABLE services ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) REFERENCES organizations(id) DEFAULT 'org_default';
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE services ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Extend Payment Intents
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) REFERENCES organizations(id) DEFAULT 'org_default';
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS request_id VARCHAR(64) DEFAULT NULL;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS policy_decision VARCHAR(32) DEFAULT NULL;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS policy_reason VARCHAR(255) DEFAULT NULL;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE;

-- Idempotency index
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_org_req_id ON payment_intents(organization_id, request_id) WHERE request_id IS NOT NULL;

-- 6. Approvals
CREATE TABLE IF NOT EXISTS approvals (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    payment_intent_id VARCHAR(64) NOT NULL REFERENCES payment_intents(id),
    required BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    approved_by VARCHAR(64) DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Audit Events (Append-only)
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    event_type VARCHAR(64) NOT NULL,
    actor_type VARCHAR(32) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    resource_type VARCHAR(32) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    request_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_org_time ON audit_events (organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_events (resource_type, resource_id);
