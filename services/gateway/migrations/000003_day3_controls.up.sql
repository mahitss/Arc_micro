-- Migration 000003: Day 3 Financial Control Plane, Treasury & Emergency Controls

-- 1. Extend Approvals with Expiration
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour');

-- 2. Treasury Reservations (Application-level in-flight fund locking)
CREATE TABLE IF NOT EXISTS treasury_reservations (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    vault_address VARCHAR(42) NOT NULL,
    payment_intent_id VARCHAR(64) NOT NULL REFERENCES payment_intents(id),
    amount VARCHAR(78) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RESERVED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_intent ON treasury_reservations (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_treasury_org_vault_status ON treasury_reservations (organization_id, vault_address, status);

-- 3. System State (Global execution pause / kill switch)
CREATE TABLE IF NOT EXISTS system_state (
    key VARCHAR(64) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    updated_by VARCHAR(64) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed global execution state as ACTIVE
INSERT INTO system_state (key, value, updated_by, updated_at)
VALUES ('global_execution', 'ACTIVE', 'system', NOW())
ON CONFLICT (key) DO NOTHING;
