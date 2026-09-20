-- Migration 000002 Down: Rollback Domain Foundation V2

DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS approvals;

DROP INDEX IF EXISTS idx_payment_intents_org_req_id;

ALTER TABLE payment_intents DROP COLUMN IF EXISTS requires_approval;
ALTER TABLE payment_intents DROP COLUMN IF EXISTS policy_reason;
ALTER TABLE payment_intents DROP COLUMN IF EXISTS policy_decision;
ALTER TABLE payment_intents DROP COLUMN IF EXISTS request_id;
ALTER TABLE payment_intents DROP COLUMN IF EXISTS organization_id;

ALTER TABLE services DROP COLUMN IF EXISTS updated_at;
ALTER TABLE services DROP COLUMN IF EXISTS status;
ALTER TABLE services DROP COLUMN IF EXISTS description;
ALTER TABLE services DROP COLUMN IF EXISTS organization_id;

ALTER TABLE agents DROP COLUMN IF EXISTS updated_at;
ALTER TABLE agents DROP COLUMN IF EXISTS vault_address;
ALTER TABLE agents DROP COLUMN IF EXISTS policy_id;
ALTER TABLE agents DROP COLUMN IF EXISTS description;
ALTER TABLE agents DROP COLUMN IF EXISTS organization_id;

DROP TABLE IF EXISTS policies;
DROP TABLE IF EXISTS organizations;
