-- Migration 000016: AgentPay Autonomous Economic Clearing Network
-- Extends clearinghouse with counterparties, batch items, exposure snapshots, reconciliation items, causal links, multi-party netting, and disputes.

-- 1. Economic Counterparties
CREATE TABLE IF NOT EXISTS economic_counterparties (
    counterparty_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_default',
    agent_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    identity_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED', -- UNVERIFIED, IDENTIFIED, VERIFIED, SUSPENDED
    capability_reference VARCHAR(128),
    protocol_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    exposure_limit VARCHAR(32) NOT NULL DEFAULT '1000000000', -- 1,000 USDC default ceiling
    current_exposure VARCHAR(32) NOT NULL DEFAULT '0',
    historical_obligations INT NOT NULL DEFAULT 0,
    active_contracts INT NOT NULL DEFAULT 0,
    risk_reference VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counterparties_tenant_agent ON economic_counterparties(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_org ON economic_counterparties(organization_id);

-- 2. Settlement Batch Items (Atomicity and partial settlement tracking)
CREATE TABLE IF NOT EXISTS settlement_batch_items (
    item_id VARCHAR(64) PRIMARY KEY,
    batch_id VARCHAR(64) NOT NULL,
    obligation_id VARCHAR(64) NOT NULL,
    amount VARCHAR(32) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, SUBMITTED, SETTLED, FAILED, RECONCILING
    payment_intent_id VARCHAR(64),
    transaction_hash VARCHAR(66),
    error_message TEXT,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON settlement_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_ob ON settlement_batch_items(obligation_id);

-- 3. Clearing Exposure Snapshots
CREATE TABLE IF NOT EXISTS clearing_exposure_snapshots (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_default',
    organization_id VARCHAR(64) NOT NULL,
    gross_exposure VARCHAR(32) NOT NULL,
    net_exposure VARCHAR(32) NOT NULL,
    pending_exposure VARCHAR(32) NOT NULL,
    settled_exposure VARCHAR(32) NOT NULL,
    disputed_exposure VARCHAR(32) NOT NULL,
    overdue_exposure VARCHAR(32) NOT NULL,
    counterparty_breakdown JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exposure_tenant_org ON clearing_exposure_snapshots(tenant_id, organization_id);

-- 4. Reconciliation Items
CREATE TABLE IF NOT EXISTS clearing_reconciliation_items (
    item_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_default',
    obligation_id VARCHAR(64) NOT NULL,
    payment_intent_id VARCHAR(64) NOT NULL,
    expected_amount VARCHAR(32) NOT NULL,
    observed_amount VARCHAR(32),
    expected_recipient VARCHAR(42) NOT NULL,
    observed_recipient VARCHAR(42),
    chain_id VARCHAR(32) NOT NULL,
    transaction_hash VARCHAR(66),
    difference VARCHAR(32) NOT NULL DEFAULT '0',
    status VARCHAR(32) NOT NULL, -- MATCHED, MISSING_RECEIPT, UNMATCHED_RECEIPT, AMOUNT_MISMATCH, RECIPIENT_MISMATCH, CHAIN_MISMATCH, DUPLICATE_EVIDENCE, AMBIGUOUS
    severity VARCHAR(32) NOT NULL DEFAULT 'INFO', -- INFO, WARNING, SECURITY_INCIDENT
    safe_next_action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_items_tenant_ob ON clearing_reconciliation_items(tenant_id, obligation_id);
CREATE INDEX IF NOT EXISTS idx_recon_items_status ON clearing_reconciliation_items(status);

-- 5. Economic Causal Links (Canonical Financial Traceability)
CREATE TABLE IF NOT EXISTS economic_causal_links (
    link_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_default',
    trace_id VARCHAR(64) NOT NULL,
    objective_id VARCHAR(64),
    mission_id VARCHAR(64),
    task_id VARCHAR(64),
    agent_id VARCHAR(64) NOT NULL,
    contract_id VARCHAR(64),
    obligation_id VARCHAR(64) NOT NULL,
    policy_decision VARCHAR(32),
    risk_score INT,
    approval_id VARCHAR(64),
    reservation_id VARCHAR(64),
    payment_intent_id VARCHAR(64),
    vault_address VARCHAR(42),
    arc_chain_id VARCHAR(32),
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    receipt_status INT,
    reconciliation_status VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_causal_links_trace ON economic_causal_links(trace_id);
CREATE INDEX IF NOT EXISTS idx_causal_links_ob ON economic_causal_links(obligation_id);

-- 6. Clearing Disputes
CREATE TABLE IF NOT EXISTS clearing_disputes (
    dispute_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_default',
    organization_id VARCHAR(64) NOT NULL,
    obligation_id VARCHAR(64) NOT NULL,
    contract_id VARCHAR(64),
    claimant_agent_id VARCHAR(64) NOT NULL,
    respondent_agent_id VARCHAR(64) NOT NULL,
    amount VARCHAR(32) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, UNDER_REVIEW, RESOLVED, ESCALATED, CLOSED
    evidence JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_disputes_tenant_org ON clearing_disputes(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_disputes_obligation ON clearing_disputes(obligation_id);

-- 7. Multi-Party Netting Proposals
CREATE TABLE IF NOT EXISTS clearing_multiparty_netting (
    proposal_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_default',
    organization_id VARCHAR(64) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    original_obligations JSONB NOT NULL DEFAULT '[]',
    proposed_net_obligations JSONB NOT NULL DEFAULT '[]',
    gross_value VARCHAR(32) NOT NULL,
    net_value VARCHAR(32) NOT NULL,
    savings_value VARCHAR(32) NOT NULL,
    counterparties JSONB NOT NULL DEFAULT '[]',
    approval_status VARCHAR(32) NOT NULL DEFAULT 'REQUIRES_APPROVAL', -- AUTOMATICALLY_ELIGIBLE, REQUIRES_APPROVAL, BLOCKED
    status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, APPROVED, EXECUTED, REJECTED, EXPIRED
    economic_impact TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_multiparty_netting_tenant_org ON clearing_multiparty_netting(tenant_id, organization_id);

-- 8. Alter existing tables if needed
ALTER TABLE clearing_obligations ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) DEFAULT 'CONTRACT';
ALTER TABLE clearing_obligations ADD COLUMN IF NOT EXISTS source_id VARCHAR(64);
ALTER TABLE clearing_obligations ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'tenant_default';
ALTER TABLE clearing_settlement_batches ADD COLUMN IF NOT EXISTS settlement_window VARCHAR(32) DEFAULT 'IMMEDIATE';
ALTER TABLE clearing_settlement_batches ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) DEFAULT 'APPROVED';
