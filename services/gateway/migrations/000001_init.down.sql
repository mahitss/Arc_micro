-- Rollback initial AgentPay persistent storage schema

DROP TABLE IF EXISTS payment_executions;
DROP TABLE IF EXISTS payment_intents;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS agents;
