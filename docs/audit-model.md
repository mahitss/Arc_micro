# AgentPay Audit Event Model

## 1. Overview

AgentPay V2 implements an **Immutable Logical Audit Trail**. Because autonomous agents make financial decisions without continuous human oversight, every state transition, policy modification, approval decision, and on-chain settlement must produce an append-only, tamper-evident audit record.

---

## 2. Audit Event Schema

```sql
CREATE TABLE audit_events (
    id VARCHAR(64) PRIMARY KEY,              -- "evt_" + UUIDv7 (time-ordered)
    organization_id VARCHAR(64) NOT NULL,   -- Organization scope
    actor_type VARCHAR(32) NOT NULL,        -- "AGENT", "USER", "SYSTEM"
    actor_id VARCHAR(64) NOT NULL,          -- e.g. "agent_research", "usr_fin_controller"
    event_type VARCHAR(64) NOT NULL,        -- e.g. "payment.authorized"
    resource_type VARCHAR(32) NOT NULL,     -- "PAYMENT_INTENT", "POLICY", "SERVICE", "AGENT"
    resource_id VARCHAR(64) NOT NULL,       -- e.g. "pi_9f82..."
    request_id VARCHAR(64) NOT NULL,        -- HTTP request tracing correlation ID
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'    -- Snapshot of evaluated rules, amounts, or reasons
);

-- Indices for rapid querying and audit compliance
CREATE INDEX idx_audit_org_time ON audit_events (organization_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_events (resource_type, resource_id);
CREATE INDEX idx_audit_event_type ON audit_events (organization_id, event_type);
```

---

## 3. Canonical Event Types

| Event Type | Actor | Trigger / Description | Key Metadata Fields |
| :--- | :---: | :--- | :--- |
| `agent.created` | `USER` | New autonomous agent provisioned | `name`, `default_vault_id` |
| `agent.paused` | `USER` | Emergency pause applied to an agent | `reason`, `paused_by` |
| `agent.resumed` | `USER` | Agent returned to active service | `resumed_by` |
| `policy.updated` | `USER` | Spending limits or allowlists modified | `old_limits`, `new_limits`, `diff` |
| `service.created` | `USER` | New service added to registry | `service_id`, `recipient`, `max_price` |
| `service.updated` | `USER` | Service pricing or recipient updated | `old_recipient`, `new_recipient` |
| `payment.created` | `AGENT` | Agent emits structured payment intent | `amount`, `service_id`, `purpose` |
| `payment.authorized` | `SYSTEM` | Rust policy engine approved payment | `policy_id`, `remaining_daily_limit` |
| `payment.denied` | `SYSTEM` | Rust policy engine rejected payment | `violation_code`, `reason`, `evaluated` |
| `payment.approval_required` | `SYSTEM` | Payment exceeded approval threshold | `amount`, `threshold`, `risk_score` |
| `payment.approved` | `USER` | Financial manager approved payment | `approver_id`, `approval_notes` |
| `payment.rejected` | `USER` | Financial manager rejected payment | `rejection_reason` |
| `payment.submitted` | `SYSTEM` | Transaction broadcasted to Arc | `tx_hash`, `nonce`, `gas_limit` |
| `payment.confirmed` | `SYSTEM` | Mined receipt verified on Arc | `block_number`, `gas_spent_usdc`, `event_log` |
| `payment.failed` | `SYSTEM` | Execution reverted or dropped | `error_code`, `revert_reason` |

---

## 4. Storage, Immutability & Retention Strategy

### 1. Database Immutability Enforced by RBAC
At the PostgreSQL database level, the application database user is granted `INSERT` and `SELECT` privileges only on `audit_events`.
```sql
REVOKE UPDATE, DELETE ON audit_events FROM agentpay_app;
```
This guarantees that even if application logic or an API key is compromised, historical audit records cannot be rewritten or erased.

### 2. Hot vs. Cold Storage Strategy
- **Hot Tier (PostgreSQL)**: Retained for 90 days for real-time querying in the Web Control Center and developer API.
- **Cold Tier (Encrypted S3 / Cloud Storage / Arweave)**: Nightly batched exports packed into partitioned Apache Parquet files, cryptographically signed with HMAC-SHA256, and retained for 7 years for enterprise regulatory compliance.
- **Tamper-Evident Hashing**: Each nightly batch includes a Merkle root hash of all events emitted during that UTC day.
