-- 000012_operations_os.down.sql
-- Rollback AgentPay Autonomous Operations OS Schema

DROP TABLE IF EXISTS operations_causal_links CASCADE;
DROP TABLE IF EXISTS operations_circuit_breakers CASCADE;
DROP TABLE IF EXISTS operations_incidents CASCADE;
DROP TABLE IF EXISTS operations_dead_letters CASCADE;
DROP TABLE IF EXISTS operations_queues CASCADE;
DROP TABLE IF EXISTS operations_plan_diffs CASCADE;
DROP TABLE IF EXISTS operations_plans CASCADE;
DROP TABLE IF EXISTS operations_decisions CASCADE;
DROP TABLE IF EXISTS operations_snapshots CASCADE;
