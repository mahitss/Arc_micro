-- Migration 000009: Autonomous Economic Clearinghouse Foundation
-- Implements tables for obligations, invoices, escrows, milestones, schedules, netting, batches, refunds, and reconciliation.

CREATE TABLE IF NOT EXISTS clearing_obligations (
    obligation_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    payer_agent_id VARCHAR(64) NOT NULL,
    payee_agent_id VARCHAR(64) NOT NULL,
    contract_id VARCHAR(64),
    mission_id VARCHAR(64),
    capability VARCHAR(128) NOT NULL,
    amount VARCHAR(32) NOT NULL, -- micro-USDC integer string
    settled_amount VARCHAR(32) NOT NULL DEFAULT '0',
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
    due_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    policy_version VARCHAR(64),
    policy_hash VARCHAR(128),
    verification_requirement TEXT,
    payment_intent_id VARCHAR(64),
    execution_mode VARCHAR(16) NOT NULL DEFAULT 'REAL',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clearing_obligations_org ON clearing_obligations(organization_id);
CREATE INDEX IF NOT EXISTS idx_clearing_obligations_payer ON clearing_obligations(payer_agent_id);
CREATE INDEX IF NOT EXISTS idx_clearing_obligations_payee ON clearing_obligations(payee_agent_id);
CREATE INDEX IF NOT EXISTS idx_clearing_obligations_contract ON clearing_obligations(contract_id);
CREATE INDEX IF NOT EXISTS idx_clearing_obligations_status ON clearing_obligations(status);

CREATE TABLE IF NOT EXISTS clearing_escrows (
    escrow_id VARCHAR(64) PRIMARY KEY,
    obligation_id VARCHAR(64),
    contract_id VARCHAR(64),
    organization_id VARCHAR(64) NOT NULL,
    payer VARCHAR(64) NOT NULL,
    payee VARCHAR(64) NOT NULL,
    vault_address VARCHAR(42) NOT NULL,
    amount VARCHAR(32) NOT NULL,
    reserved_amount VARCHAR(32) NOT NULL,
    released_amount VARCHAR(32) NOT NULL DEFAULT '0',
    refunded_amount VARCHAR(32) NOT NULL DEFAULT '0',
    status VARCHAR(32) NOT NULL DEFAULT 'RESERVED',
    reservation_id VARCHAR(64),
    execution_mode VARCHAR(16) NOT NULL DEFAULT 'REAL',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clearing_escrows_org ON clearing_escrows(organization_id);
CREATE INDEX IF NOT EXISTS idx_clearing_escrows_contract ON clearing_escrows(contract_id);

CREATE TABLE IF NOT EXISTS clearing_milestones (
    milestone_id VARCHAR(64) PRIMARY KEY,
    contract_id VARCHAR(64) NOT NULL,
    obligation_id VARCHAR(64),
    organization_id VARCHAR(64) NOT NULL,
    sequence INT NOT NULL,
    description TEXT NOT NULL,
    amount VARCHAR(32) NOT NULL,
    verification_rule VARCHAR(128),
    due_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    result_hash VARCHAR(128),
    evidence_uri TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    payment_intent_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clearing_milestones_contract ON clearing_milestones(contract_id);

CREATE TABLE IF NOT EXISTS clearing_invoices (
    invoice_id VARCHAR(64) PRIMARY KEY,
    contract_id VARCHAR(64) NOT NULL,
    obligation_id VARCHAR(64),
    organization_id VARCHAR(64) NOT NULL,
    provider_agent_id VARCHAR(64) NOT NULL,
    requester_agent_id VARCHAR(64) NOT NULL,
    amount VARCHAR(32) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    status VARCHAR(32) NOT NULL DEFAULT 'ISSUED',
    invoice_hash VARCHAR(128) NOT NULL,
    line_items JSONB NOT NULL DEFAULT '[]',
    milestone_refs JSONB DEFAULT '[]',
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    due_at TIMESTAMP WITH TIME ZONE,
    payment_intent_id VARCHAR(64),
    execution_mode VARCHAR(16) NOT NULL DEFAULT 'REAL',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clearing_invoices_org ON clearing_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_clearing_invoices_contract ON clearing_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_clearing_invoices_hash ON clearing_invoices(invoice_hash);

CREATE TABLE IF NOT EXISTS clearing_schedules (
    schedule_id VARCHAR(64) PRIMARY KEY,
    contract_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    payer_agent_id VARCHAR(64) NOT NULL,
    payee_agent_id VARCHAR(64) NOT NULL,
    schedule_type VARCHAR(32) NOT NULL,
    frequency VARCHAR(32),
    amount_per_payment VARCHAR(32) NOT NULL,
    max_occurrences INT NOT NULL DEFAULT 0,
    occurred_count INT NOT NULL DEFAULT 0,
    max_total_value VARCHAR(32) NOT NULL DEFAULT '0',
    total_settled_value VARCHAR(32) NOT NULL DEFAULT '0',
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    cancellation_policy TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clearing_ledger_entries (
    entry_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    obligation_id VARCHAR(64) NOT NULL,
    contract_id VARCHAR(64),
    invoice_id VARCHAR(64),
    milestone_id VARCHAR(64),
    payment_intent_id VARCHAR(64),
    transaction_hash VARCHAR(66),
    entry_type VARCHAR(64) NOT NULL,
    debit_account VARCHAR(128) NOT NULL,
    credit_account VARCHAR(128) NOT NULL,
    amount VARCHAR(32) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    execution_mode VARCHAR(16) NOT NULL DEFAULT 'REAL',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    hash VARCHAR(128) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clearing_ledger_org ON clearing_ledger_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_clearing_ledger_ob ON clearing_ledger_entries(obligation_id);

CREATE TABLE IF NOT EXISTS clearing_netting_proposals (
    proposal_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    agent_a VARCHAR(64) NOT NULL,
    agent_b VARCHAR(64) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    obligations_a_to_b JSONB NOT NULL DEFAULT '[]',
    obligations_b_to_a JSONB NOT NULL DEFAULT '[]',
    gross_amount_a_to_b VARCHAR(32) NOT NULL,
    gross_amount_b_to_a VARCHAR(32) NOT NULL,
    gross_total VARCHAR(32) NOT NULL,
    net_payer VARCHAR(64) NOT NULL,
    net_payee VARCHAR(64) NOT NULL,
    net_amount VARCHAR(32) NOT NULL,
    savings_amount VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ELIGIBLE',
    approved_by_a BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by_b BOOLEAN NOT NULL DEFAULT FALSE,
    payment_intent_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS clearing_settlement_batches (
    batch_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    obligation_ids JSONB NOT NULL DEFAULT '[]',
    gross_amount VARCHAR(32) NOT NULL,
    net_amount VARCHAR(32) NOT NULL,
    savings VARCHAR(32) NOT NULL DEFAULT '0',
    status VARCHAR(32) NOT NULL DEFAULT 'READY',
    failure_reason TEXT,
    payment_intent_ids JSONB DEFAULT '[]',
    execution_mode VARCHAR(16) NOT NULL DEFAULT 'REAL',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS clearing_refund_requests (
    refund_id VARCHAR(64) PRIMARY KEY,
    original_payment_id VARCHAR(64) NOT NULL,
    contract_id VARCHAR(64),
    obligation_id VARCHAR(64),
    organization_id VARCHAR(64) NOT NULL,
    requester_agent_id VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    original_amount VARCHAR(32) NOT NULL,
    refund_amount VARCHAR(32) NOT NULL,
    evidence TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
    payment_intent_id VARCHAR(64),
    execution_mode VARCHAR(16) NOT NULL DEFAULT 'REAL',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS clearing_credits (
    credit_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64) NOT NULL,
    obligation_ref VARCHAR(64),
    contract_ref VARCHAR(64),
    amount VARCHAR(32) NOT NULL,
    remaining_amount VARCHAR(32) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USDC',
    reason TEXT NOT NULL,
    issued_by VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clearing_reconciliation_records (
    record_id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    obligation_id VARCHAR(64) NOT NULL,
    payment_intent_id VARCHAR(64) NOT NULL,
    transaction_hash VARCHAR(66),
    status VARCHAR(32) NOT NULL,
    expected_amount VARCHAR(32) NOT NULL,
    actual_amount VARCHAR(32),
    expected_recipient VARCHAR(42) NOT NULL,
    actual_recipient VARCHAR(42),
    chain_id VARCHAR(32) NOT NULL,
    target_contract VARCHAR(42) NOT NULL,
    discrepancy_notes TEXT,
    recommended_action TEXT,
    execution_mode VARCHAR(16) NOT NULL DEFAULT 'REAL',
    reconciled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
