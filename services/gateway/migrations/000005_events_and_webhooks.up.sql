-- Migration 000005: Event Infrastructure, Outbox & Webhooks
-- Day 6: Immutable Audit Trail, Correlated Domain Events & Webhook Delivery

-- 1. Extend audit_events with correlation and causal lineage
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64) DEFAULT '';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS causation_id VARCHAR(64) DEFAULT '';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS agent_id VARCHAR(64) DEFAULT '';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(64) DEFAULT '';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS execution_id VARCHAR(64) DEFAULT '';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS approval_id VARCHAR(64) DEFAULT '';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_events (correlation_id) WHERE correlation_id != '';
CREATE INDEX IF NOT EXISTS idx_audit_intent ON audit_events (payment_intent_id) WHERE payment_intent_id != '';
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_events (agent_id) WHERE agent_id != '';

-- 2. Transactional Outbox for atomic event publishing
CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES audit_events(id),
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    event_type VARCHAR(64) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, PROCESSED, FAILED
    retry_count INT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events (status, next_retry_at) WHERE status IN ('PENDING', 'RETRYING');
CREATE INDEX IF NOT EXISTS idx_outbox_org ON outbox_events (organization_id);

-- 3. Webhook Endpoints
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id VARCHAR(64) PRIMARY KEY, -- "we_..."
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    url TEXT NOT NULL,
    secret_hash VARCHAR(128) NOT NULL, -- SHA-256 hash of signing secret
    description VARCHAR(255) DEFAULT '',
    subscribed_events TEXT NOT NULL DEFAULT '["*"]', -- JSON array or comma-separated list
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    failure_count INT NOT NULL DEFAULT 0,
    last_delivery_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org ON webhook_endpoints (organization_id, enabled);

-- 4. Webhook Deliveries (Attempt history & tracking)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR(64) PRIMARY KEY, -- "del_..."
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    endpoint_id VARCHAR(64) NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_id VARCHAR(64) NOT NULL REFERENCES audit_events(id),
    event_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL, -- PENDING, DELIVERING, DELIVERED, RETRYING, FAILED
    http_status INT DEFAULT NULL,
    request_payload TEXT NOT NULL,
    response_body TEXT DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    attempt_count INT NOT NULL DEFAULT 1,
    max_attempts INT NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    latency_ms INT DEFAULT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries (endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_org ON webhook_deliveries (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries (event_id);
