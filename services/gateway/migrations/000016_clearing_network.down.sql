-- Migration 000016 Down: AgentPay Autonomous Economic Clearing Network

DROP TABLE IF EXISTS clearing_multiparty_netting;
DROP TABLE IF EXISTS clearing_disputes;
DROP TABLE IF EXISTS economic_causal_links;
DROP TABLE IF EXISTS clearing_reconciliation_items;
DROP TABLE IF EXISTS clearing_exposure_snapshots;
DROP TABLE IF EXISTS settlement_batch_items;
DROP TABLE IF EXISTS economic_counterparties;
