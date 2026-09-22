-- 000007_swarm_orchestration.up.sql
-- AgentPay Multi-Agent Swarm Orchestration Layer schema (Phase 33)

CREATE TABLE IF NOT EXISTS swarms (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    root_mission_id VARCHAR(64) NOT NULL,
    orchestrator_agent_id VARCHAR(64) NOT NULL,
    objective TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    budget VARCHAR(32) NOT NULL,
    allocated VARCHAR(32) NOT NULL DEFAULT '0',
    reserved VARCHAR(32) NOT NULL DEFAULT '0',
    spent VARCHAR(32) NOT NULL DEFAULT '0',
    max_agents INT NOT NULL DEFAULT 10,
    max_depth INT NOT NULL DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    correlation_id VARCHAR(64),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_swarms_org ON swarms(organization_id);
CREATE INDEX IF NOT EXISTS idx_swarms_mission ON swarms(root_mission_id);
CREATE INDEX IF NOT EXISTS idx_swarms_status ON swarms(status);

CREATE TABLE IF NOT EXISTS swarm_tasks (
    task_id VARCHAR(64) PRIMARY KEY,
    swarm_id VARCHAR(64) NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
    parent_task_id VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_agent_id VARCHAR(64),
    assigned_role VARCHAR(32) NOT NULL,
    required_capability VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    budget VARCHAR(32) NOT NULL DEFAULT '0',
    spent VARCHAR(32) NOT NULL DEFAULT '0',
    dependencies JSONB NOT NULL DEFAULT '[]',
    input_refs JSONB NOT NULL DEFAULT '[]',
    output_refs JSONB NOT NULL DEFAULT '[]',
    result_data TEXT,
    result_checksum VARCHAR(64),
    validation_status VARCHAR(32),
    critic_feedback JSONB,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_swarm_tasks_swarm ON swarm_tasks(swarm_id);
CREATE INDEX IF NOT EXISTS idx_swarm_tasks_status ON swarm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_swarm_tasks_role ON swarm_tasks(assigned_role);

CREATE TABLE IF NOT EXISTS swarm_reservations (
    swarm_id VARCHAR(64) NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
    task_id VARCHAR(64) NOT NULL,
    amount VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (swarm_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_swarm_reservations_swarm ON swarm_reservations(swarm_id);
