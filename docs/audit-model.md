# AgentPay Audit Event Model

## 1. Overview

AgentPay implements an **Immutable Logical Audit Trail**. Because autonomous AI agents make financial decisions without continuous human oversight, every state transition, policy modification, approval decision, treasury movement, and on-chain settlement produces an append-only, tamper-evident audit record.

Audit events are **not** ordinary application logs. They represent the authoritative, permanent record of financial decisions and operational actions within an organization.

---

## 2. Audit Event Schema (Post-Day 6)

With Day 6 event infrastructure improvements (`000005_events_and_webhooks.up.sql`), the audit trail is enriched with end-to-end correlation and lineage tracking:

```sql
CREATE TABLE audit_events (
    id VARCHAR(64) PRIMARY KEY,              -- "evt_" + ULID / time-ordered ID
    organization_id VARCHAR(64) NOT NULL,   -- Organization scope
    actor_type VARCHAR(32) NOT NULL,        -- "AGENT", "USER", "SYSTEM", "API_KEY"
    actor_id VARCHAR(64) NOT NULL,          -- e.g. "agent_research_01", "usr_fin_controller"
    event_type VARCHAR(64) NOT NULL,        -- e.g. "payment_intent.authorized"
    resource_type VARCHAR(32) NOT NULL,     -- "PAYMENT_INTENT", "POLICY", "SERVICE", "AGENT", "APPROVAL"
    resource_id VARCHAR(64) NOT NULL,       -- e.g. "pi_9f82..."
    request_id VARCHAR(64) NOT NULL,        -- HTTP request tracing correlation ID
    correlation_id VARCHAR(64),             -- Root business transaction ID (e.g. pi_...)
    causation_id VARCHAR(64),               -- Precursor event or step ID that caused this event
    agent_id VARCHAR(64),                   -- Associated agent ID if applicable
    payment_intent_id VARCHAR(64),          -- Associated payment intent ID
    execution_id VARCHAR(64),               -- Associated execution ID
    approval_id VARCHAR(64),                -- Associated approval request ID
    version INT NOT NULL DEFAULT 1,         -- Event schema version
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'    -- Structured business data snapshot
);

-- Performance & Audit Compliance Indices
CREATE INDEX idx_audit_org_time ON audit_events (organization_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_events (resource_type, resource_id);
CREATE INDEX idx_audit_event_type ON audit_events (organization_id, event_type);
CREATE INDEX idx_audit_correlation ON audit_events (organization_id, correlation_id);
CREATE INDEX idx_audit_intent ON audit_events (organization_id, payment_intent_id);
```

---

## 3. Canonical Event Taxonomy

| Event Type | Actor | Trigger / Business Meaning |
| :--- | :---: | :--- |
| `agent.created` | `USER` | New autonomous agent provisioned with initial policy |
| `agent.updated` | `USER` | Agent configuration or policy assignment updated |
| `agent.paused` | `USER` | Emergency circuit-breaker paused an agent |
| `agent.resumed` | `USER` | Agent returned to active execution |
| `policy.created` | `USER` | New spending policy or rule definition created |
| `policy.updated` | `USER` | Spending limits, velocity, or allowlists modified |
| `service.created` | `USER` | New service added to approved registry |
| `service.updated` | `USER` | Service pricing or settlement recipient modified |
| `service.disabled` | `USER` | Service removed or disabled from agent spending |
| `payment_intent.created` | `AGENT` | Autonomous agent initiated a payment intent |
| `payment_intent.authorized` | `SYSTEM` | Rust policy engine approved payment against all limits |
| `payment_intent.denied` | `SYSTEM` | Policy engine rejected payment due to rule violation |
| `payment_intent.approval_required` | `SYSTEM` | Payment exceeded instant limit; manual approval needed |
| `payment_intent.confirmed` | `SYSTEM` | Arc blockchain transaction confirmed and verified |
| `payment_intent.failed` | `SYSTEM` | Execution or on-chain settlement failed |
| `payment_intent.expired` | `SYSTEM` | Payment intent or approval window expired |
| `approval.created` | `SYSTEM` | Approval ticket generated for human review |
| `approval.approved` | `USER` | Financial officer approved pending payment |
| `approval.rejected` | `USER` | Financial officer rejected pending payment |
| `api_key.created` | `USER` | New developer API key generated |
| `api_key.revoked` | `USER` | API key invalidated |
| `test.ping` | `USER` | Developer synthetic webhook connectivity test |

---

## 4. Answering Critical Audit Questions

The audit trail is structured to answer key compliance, forensic, and operational questions deterministically:

| Investigation Question | Query Strategy / Fields |
| :--- | :--- |
| *"Why was this payment denied?"* | Query `event_type = 'payment_intent.denied'` where `payment_intent_id = :id`. Metadata contains `violations` array with rule IDs, limits, and evaluated amounts. |
| *"Who approved this payment?"* | Query `event_type = 'approval.approved'` where `payment_intent_id = :id`. `actor_id` identifies user, metadata contains decision notes and timestamp. |
| *"Which policy caused the denial?"* | Query metadata of `payment_intent.denied` -> `violations[].policy_id`. |
| *"Which API key created this intent?"* | Query `event_type = 'payment_intent.created'` where `payment_intent_id = :id`. `actor_type` = `API_KEY` and `actor_id` = `key_...`. |
| *"Which agent requested it?"* | Check `agent_id` column directly on any payment lifecycle event. |
| *"Which transaction settled it?"* | Query `event_type = 'payment_intent.confirmed'` where `payment_intent_id = :id`. Metadata contains `tx_hash`, `block_number`, and Arc transaction ID. |
| *"Was this event before or after approval?"* | Check `timestamp` comparison between `approval.approved` and `payment_intent.authorized`. |

---

## 5. Storage, Immutability & Retention

### Database-Level Immutability
At the PostgreSQL database level, the application user is granted `INSERT` and `SELECT` privileges only:
```sql
REVOKE UPDATE, DELETE ON audit_events FROM agentpay_app;
```
Neither the application code nor any API endpoint supports modifying or deleting audit records.

### Multi-Tier Retention
1. **Hot Storage (PostgreSQL)**: Retained for 90 days for real-time querying via `GET /v1/events` and the Web Dashboard.
2. **Cold Storage (Batched Parquet / Cloud Storage / Arweave)**: Nightly batched exports formatted as partitioned Apache Parquet files, hashed and retained for 7 years for enterprise compliance.

---

## 6. Audit Query API

Organizations can query their audit events via the developer API:

### List Events
`GET /v1/events?limit=50&type=payment_intent.denied&agent_id=agent_research_01`

**Query Parameters**:
- `limit`: Number of results (default 50, max 100).
- `offset`: Pagination offset.
- `type`: Filter by exact event type or prefix.
- `payment_intent_id`: Filter by payment intent.
- `agent_id`: Filter by agent.
- `correlation_id`: Filter by root correlation ID.

### Get Event
`GET /v1/events/{id}`

Returns the full domain event envelope and structured data snapshot.
