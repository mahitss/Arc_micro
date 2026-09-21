-- Migration 000006: Production Hardening & Concurrency Protection
-- Ensures each payment intent can have at most one active treasury reservation across all gateway nodes.

CREATE UNIQUE INDEX IF NOT EXISTS idx_treasury_intent_unique ON treasury_reservations (payment_intent_id);
