-- Initialize AgentPay persistent storage schema

CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    recipient VARCHAR(42) NOT NULL,
    asset VARCHAR(32) NOT NULL DEFAULT 'USDC',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_price VARCHAR(78) NOT NULL,
    fixed_price VARCHAR(78) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_intents (
    id VARCHAR(64) PRIMARY KEY,
    agent_id VARCHAR(64) NOT NULL REFERENCES agents(id),
    vault_address VARCHAR(42) NOT NULL,
    service_id VARCHAR(64) NOT NULL REFERENCES services(id),
    recipient VARCHAR(42) NOT NULL,
    amount VARCHAR(78) NOT NULL,
    asset VARCHAR(32) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    justification TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_executions (
    intent_id VARCHAR(64) PRIMARY KEY REFERENCES payment_intents(id),
    transaction_hash VARCHAR(66),
    status VARCHAR(32) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    error_code VARCHAR(64)
);
