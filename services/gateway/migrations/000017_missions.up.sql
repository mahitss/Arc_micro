-- 000017_missions.up.sql
-- AgentPay Autonomous Missions & Operational Steps Schema

CREATE TABLE IF NOT EXISTS missions (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    agent_id VARCHAR(64) NOT NULL REFERENCES agents(id),
    objective TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    budget VARCHAR(78) NOT NULL,
    spent VARCHAR(78) NOT NULL DEFAULT '0',
    remaining_budget VARCHAR(78) NOT NULL,
    currency VARCHAR(32) NOT NULL DEFAULT 'USDC',
    max_execution_amount VARCHAR(78) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    current_step VARCHAR(64),
    failure_reason TEXT,
    metadata JSONB,
    correlation_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_missions_org ON missions(organization_id);
CREATE INDEX IF NOT EXISTS idx_missions_agent ON missions(agent_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);

CREATE TABLE IF NOT EXISTS mission_steps (
    step_id VARCHAR(64) NOT NULL,
    mission_id VARCHAR(64) NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    step_index INT NOT NULL,
    required_capability VARCHAR(64) NOT NULL,
    category VARCHAR(64),
    max_budget VARCHAR(78) NOT NULL,
    selected_service_id VARCHAR(64),
    selected_quote_id VARCHAR(64),
    payment_intent_id VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    result_data TEXT,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (mission_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_mission_steps_mission ON mission_steps(mission_id, step_index);
