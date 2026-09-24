-- Task 16: AgentPay Autonomous Economic Protocol Schema
-- Strictly extends existing tables without duplicate identity or payment systems.

CREATE TABLE IF NOT EXISTS protocol_messages (
    message_id VARCHAR(128) PRIMARY KEY,
    protocol_version VARCHAR(32) NOT NULL DEFAULT '1.0',
    message_type VARCHAR(64) NOT NULL,
    sender_id VARCHAR(128) NOT NULL,
    recipient_id VARCHAR(128) NOT NULL,
    correlation_id VARCHAR(128) NOT NULL,
    causation_id VARCHAR(128),
    idempotency_key VARCHAR(128),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    signature VARCHAR(256),
    payload_hash VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED',
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_default',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_messages_tenant ON protocol_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_protocol_messages_sender ON protocol_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_protocol_messages_type ON protocol_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_protocol_messages_correlation ON protocol_messages(correlation_id);
CREATE INDEX IF NOT EXISTS idx_protocol_messages_idempotency ON protocol_messages(tenant_id, idempotency_key);

CREATE TABLE IF NOT EXISTS protocol_replay_nonces (
    sender_id VARCHAR(128) NOT NULL,
    nonce VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (sender_id, nonce)
);

CREATE INDEX IF NOT EXISTS idx_protocol_nonces_expiry ON protocol_replay_nonces(expires_at);

CREATE TABLE IF NOT EXISTS protocol_operations (
    operation_id VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_default',
    operation_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED',
    result JSONB,
    error JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_operations_tenant ON protocol_operations(tenant_id);

CREATE TABLE IF NOT EXISTS protocol_disputes (
    dispute_id VARCHAR(128) PRIMARY KEY,
    contract_id VARCHAR(128) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_default',
    initiator VARCHAR(128) NOT NULL,
    reason TEXT NOT NULL,
    evidence JSONB,
    requested_resolution TEXT NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_disputes_contract ON protocol_disputes(contract_id);
CREATE INDEX IF NOT EXISTS idx_protocol_disputes_tenant ON protocol_disputes(tenant_id);
