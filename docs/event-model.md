# AgentPay Domain Event Model

## 1. Overview & Core Philosophy

AgentPay enforces a strict, deterministic financial control plane for autonomous AI agents on Arc:

```
AI requests
    ↓
Payment Intent
    ↓
Policy Evaluation
    ↓
Risk Evaluation
    ↓
Approval Control
    ↓
Treasury Lock
    ↓
Execution Gate
    ↓
Arc Settlement
    ↓
Verification
    ↓
Audit Trail (Outbox)
    ↓
Webhook Delivery
```

In AgentPay, domain events are:
1. **Typed**: Every event has a canonical dot-notated event type (e.g. `payment_intent.authorized`).
2. **Versioned**: Schema versioning guarantees backwards compatibility for webhook consumers.
3. **Timestamped**: Recorded in UTC with millisecond precision (`occurred_at`).
4. **Organization-Scoped**: Tenant boundaries are strictly enforced; cross-tenant event leakage is architecturally impossible.
5. **Causally Correlated**: Traceable end-to-end through `request_id`, `correlation_id`, `causation_id`, `agent_id`, and `payment_intent_id`.
6. **Attributable**: Identifies the actor (`AGENT`, `USER`, `SYSTEM`, `API`) and actor ID.
7. **Immutable**: Append-only storage with zero `UPDATE` or `DELETE` capabilities.

---

## 2. Canonical Event Envelope

Every domain event adheres to the following stable envelope:

```json
{
  "id": "evt_4c9ec368566ae18a",
  "type": "payment_intent.authorized",
  "version": 1,
  "occurred_at": "2026-09-20T22:30:17.123Z",
  "organization_id": "org_7f16106536",
  "actor_type": "SYSTEM",
  "actor_id": "policy-engine",
  "agent_id": "agent_market_research",
  "payment_intent_id": "intent_e93c71cc745f2bf0",
  "execution_id": "",
  "approval_id": "",
  "transaction_id": "",
  "request_id": "req_5c537459fb7a8d6a",
  "correlation_id": "req_5c537459fb7a8d6a",
  "causation_id": "intent_e93c71cc745f2bf0",
  "data": {
    "intent_id": "intent_e93c71cc745f2bf0",
    "agent_id": "agent_market_research",
    "decision": "ALLOW",
    "reason_code": "APPROVED",
    "status": "AUTHORIZED"
  }
}
```

### Envelope Fields Reference

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique event identifier prefixed with `evt_` (e.g. `evt_4c9ec368566ae18a`). Idempotency key for consumers. |
| `type` | `string` | Canonical event type name from the taxonomy below. |
| `version` | `integer` | Schema version of the event structure (currently `1`). |
| `occurred_at` | `timestamp` | ISO-8601 UTC timestamp when the domain state change took place. |
| `organization_id` | `string` | Tenant isolation boundary (`org_...`). |
| `actor_type` | `string` | Originator of the action: `AGENT`, `USER`, `SYSTEM`, or `API`. |
| `actor_id` | `string` | Identifier of the specific actor (e.g. `agent_research`, `usr_cfo`). |
| `agent_id` | `string?` | Optional agent identifier involved in the financial action. |
| `payment_intent_id` | `string?` | Optional payment intent identifier for payment lifecycle tracing. |
| `execution_id` | `string?` | Optional execution record identifier. |
| `approval_id` | `string?` | Optional human approval identifier (`app_...`). |
| `transaction_id` | `string?` | Optional on-chain transaction hash or settlement reference. |
| `request_id` | `string` | Originating HTTP request ID (`req_...`) for distributed tracing. |
| `correlation_id` | `string` | End-to-end business correlation identifier spanning the full payment lifecycle. |
| `causation_id` | `string?` | Specific event or intent ID that directly triggered this event. |
| `data` | `object` | Strongly typed payload specific to the event type. |

---

## 3. Canonical Event Taxonomy

The event taxonomy is organized by domain boundary:

### Payment Intent Events
- `payment_intent.created`: Emitted when an agent proposes a new payment intent.
- `payment_intent.authorized`: Emitted when the deterministic Rust Policy Engine allows the payment.
- `payment_intent.denied`: Emitted when a policy or risk limit rejects the payment.
- `payment_intent.approval_required`: Emitted when spending exceeds the autonomous policy threshold and requires human intervention.
- `payment_intent.confirmed`: Emitted when an authorized payment is executed and confirmed on the Arc blockchain.
- `payment_intent.failed`: Emitted when on-chain execution or verification fails.

### Approval Events
- `approval.created`: Emitted when an intent enters `APPROVAL_REQUIRED` and creates an approval ticket.
- `approval.approved`: Emitted when an authorized human approver approves the payment.
- `approval.rejected`: Emitted when an authorized human approver rejects the payment.

### Agent Lifecycle Events
- `agent.paused`: Emitted when an emergency kill switch or policy pauses an agent.
- `agent.resumed`: Emitted when an authorized administrator resumes an agent.

### Security & Developer API Events
- `api_key.created`: Emitted when a developer generates a new API key.
- `api_key.revoked`: Emitted when an API key is revoked.
- `webhook_endpoint.created`: Emitted when a new webhook endpoint is registered.
- `webhook_endpoint.deleted`: Emitted when a webhook endpoint is removed.
- `test.ping`: Synthetic event emitted by `POST /v1/webhooks/{id}/test` with zero financial side effects.

---

## 4. Causal Correlation Lineage

Every financial transaction can be traced end-to-end across multiple distributed boundaries:

```
[User / Agent Request]
      ↓  (request_id = "req_abc123", correlation_id = "req_abc123")
[PaymentIntent Created]
      ↓  (payment_intent_id = "intent_xyz890", causation_id = "req_abc123")
[Policy Evaluated (Rust)]
      ↓  (decision = "APPROVAL_REQUIRED", causation_id = "intent_xyz890")
[Approval Ticket Created]
      ↓  (approval_id = "app_456def", causation_id = "intent_xyz890")
[Human Approver Signs Off]
      ↓  (approved_by = "usr_fin_lead", causation_id = "app_456def")
[Treasury Reservation]
      ↓  (reservation_id = "res_789", amount = "250000 USDC")
[Arc Blockchain Execution]
      ↓  (tx_hash = "0x8899aabb...", causation_id = "intent_xyz890")
[Settlement Confirmation]
      ↓  (payment_intent.confirmed, transaction_id = "0x8899aabb...")
[Webhook Delivered]
         (event_id = "evt_9988", endpoint = "https://...")
```

---

## 5. Event Immutability & Audit Guarantees

- **No Updates**: Audit events cannot be updated under any circumstances.
- **No Deletions**: Audit events cannot be deleted via any application API.
- **Append-Only Outbox**: Events are transactionally written alongside state transitions.
- **Database Privilege Separation**: Application services connect with users that lack `UPDATE` and `DELETE` privileges on `audit_events`.
