# AgentPay Observability & Failure Semantics

## 1. Overview

Observability in AgentPay is built around a single invariant: **every financial decision, policy evaluation, and treasury movement must be completely traceable end-to-end across distributed components**.

Because AgentPay mediates untrusted AI agents and on-chain settlement on Arc, operations must provide unambiguous auditability and real-time operational visibility without compromising security or leaking credentials.

---

## 2. Structured Logging Schema

All AgentPay services (Gateway, Policy Engine, Settlement Workers) output structured JSON logs to `stdout`.

### Canonical Log Entry Schema

```json
{
  "timestamp": "2026-09-20T16:30:00.123Z",
  "level": "info",
  "service": "agentpay-gateway",
  "event": "payment.execution.confirmed",
  "organization_id": "org_arc_enterprise_01",
  "request_id": "req_01j7b9k2x3m4n5p6q7r8s9t0",
  "correlation_id": "pi_01j7b9k2x3m4n5p6q7r8s9t0",
  "causation_id": "exec_01j7b9k2x3m4n5p6q7r8s9t0",
  "agent_id": "agent_research_01",
  "payment_intent_id": "pi_01j7b9k2x3m4n5p6q7r8s9t0",
  "execution_id": "exec_01j7b9k2x3m4n5p6q7r8s9t0",
  "transaction_id": "tx_01j7b9k2x3m4n5p6q7r8s9t0",
  "tx_hash": "0x8f3cb21a9876543210fedcba0123456789abcdef0123456789abcdef01234567",
  "duration_ms": 42.5,
  "message": "Payment execution confirmed on Arc settlement layer"
}
```

### Strictly Prohibited Logging Fields (Redaction Invariants)

AgentPay strictly forbids logging sensitive credentials. The logger enforces redacting the following fields:

| Category | Prohibited Items |
| :--- | :--- |
| **Authentication Secrets** | API keys (`agentpay_sk_...`), JWT tokens, Bearer tokens, HTTP `Authorization` headers |
| **Webhook Secrets** | Raw webhook secrets (`whsec_...`) |
| **Cryptographic Keys** | Private keys, mnemonic phrases, raw signature preimages |
| **Sensitive Calldata** | Raw unparsed contract calldata containing proprietary payloads |

---

## 3. End-to-End Traceability & Correlation

A single business payment is correlated across the entire stack using structured identifiers:

```
[HTTP Request]          request_id:        req_01j7b9...
      ↓
[Payment Intent]        payment_intent_id: pi_01j7b9...  (also root correlation_id)
      ↓
[Policy Evaluation]     causation_id:      req_01j7b9...
      ↓
[Approval Ticket]       approval_id:       appr_01j7b9...
      ↓
[Treasury Reservation]  reservation_id:    res_01j7b9...
      ↓
[Execution]             execution_id:      exec_01j7b9...
      ↓
[Arc Transaction]       transaction_id:    tx_01j7b9...
      ↓
[Arc Settlement]        tx_hash:           0x8f3c...b21a
      ↓
[Audit Record]          event_id:          evt_01j7b9...
      ↓
[Webhook Delivery]      delivery_id:       del_01j7b9...
```

### Identifier Semantics

1. `request_id`: Generated at the API gateway per incoming HTTP request. Passed in response headers (`X-Request-ID`).
2. `correlation_id`: Set to the `payment_intent_id` for all downstream events in that payment lifecycle. Enables grouping all logs for a payment.
3. `causation_id`: Points to the immediate parent event or operation that triggered the current step.

---

## 4. Operational Metrics

The following metrics are tracked across the event and webhook subsystem:

| Metric | Type | Description |
| :--- | :---: | :--- |
| `events_emitted_total` | Counter | Total domain events generated, labeled by `event_type` and `organization_id` |
| `outbox_pending_count` | Gauge | Number of events waiting in outbox for asynchronous fan-out |
| `webhook_delivery_attempts_total` | Counter | Total delivery attempts, labeled by `status` (`200`, `500`, `timeout`, etc.) |
| `webhook_delivery_latency_ms` | Histogram | Latency of webhook HTTP requests |
| `webhook_retries_total` | Counter | Total retry attempts scheduled |
| `webhook_endpoint_failures_consecutive` | Gauge | Consecutive failures per endpoint (used to trigger `DISABLED` state) |

---

## 5. Failure Semantics Matrix

The table below specifies how AgentPay handles operational failures while preserving financial correctness:

| Failure Scenario | System Behavior | Impact on Payment / Financial State |
| :--- | :--- | :--- |
| **Database Failure (during Intent creation)** | Transaction rolls back; 500 error returned to caller. | Zero state change. No funds reserved. |
| **Database Failure (during Outbox insert)** | Part of the same DB transaction as state update; rolls back atomically. | Consistent state preserved. No orphaned intent. |
| **Webhook Endpoint Timeout (>10s)** | Connection aborted; delivery marked `RETRYING`; backoff scheduled. | **No impact.** Payment remains authorized or confirmed. |
| **Webhook Endpoint Returns 5xx** | Delivery recorded with HTTP status; marked `RETRYING`; backoff scheduled. | **No impact.** Payment remains confirmed. |
| **Webhook Endpoint Returns 429** | Treated as transient; backoff scheduled. | **No impact.** Payment remains confirmed. |
| **Invalid Webhook URL (SSRF / DNS)** | Delivery marked `FAILED` immediately (no retries). Endpoint flagged. | **No impact.** Payment remains confirmed. |
| **Webhook Endpoint Disabled** | Event skipped for this endpoint; logged. | **No impact.** Payment remains confirmed. |
| **Duplicate Event Emitted** | Prevented by unique constraints on `(payment_intent_id, event_type)`. | Deduplicated safely. |
| **Duplicate Webhook Delivery Received** | Consumer uses `event.id` as idempotency key to discard duplicate. | Consumer state protected. |
| **Worker Crash During Delivery** | Uncommitted delivery stays `PENDING` or `DELIVERING`; picked up on restart. | At-least-once delivery guaranteed. |
| **Process Restart / Outbox Recovery** | Startup scanner queries `status = 'PENDING'` outbox entries and resumes dispatch. | No events lost. |
| **Payment Succeeds, Webhook Fails** | Webhook attempts retry up to 5 times. If all fail, marked `FAILED`. | **Financial state authoritative.** Webhook does not alter settlement. |
| **Webhook Succeeds, Response Lost** | Timeout causes retry. Consumer detects duplicate `event.id` and returns 200. | Idempotent recovery. |
| **Arc Transaction Ambiguous (Reorg/Pending)** | Intent stays `EXECUTING`; watcher verifies block confirmations before emitting `payment_intent.confirmed`. | No premature confirmation. |
