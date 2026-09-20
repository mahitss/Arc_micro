# AgentPay Webhook Delivery Infrastructure

## 1. Overview

AgentPay provides a production-grade webhook delivery subsystem designed for real-time notification of financial state changes. When autonomous agents request payments, policies evaluate them, approvals are granted or rejected, and transactions settle on Arc, AgentPay emits structured domain events. Organizations can register HTTPS endpoints to receive these events asynchronously.

### Core Architectural Guarantees

1. **Strict Downstream Isolation**: Webhook delivery is entirely downstream of payment execution. A webhook failure (network timeout, endpoint 500, or invalid configuration) **never** rolls back or delays an authorized or settled payment.
2. **At-Least-Once Delivery**: Events are guaranteed to be delivered at least once within the retry window.
3. **Deterministic Idempotency**: Every event carries a globally unique, stable `id` (`evt_...`). Multiple delivery attempts of the same event retain the exact same `event.id`. Consumers must use `event.id` as their idempotency key.
4. **Cryptographic Integrity**: Payloads are signed with HMAC-SHA256 using a shared endpoint secret, preventing spoofing and replay attacks.
5. **SSRF Hardened**: All destination URLs are validated before registration and re-validated at socket connection time to prevent SSRF and DNS rebinding attacks.

---

## 2. Webhook Lifecycle & State Machine

```
               [ Event Emitted ]
                       │
                       ▼
          [ Match Subscribed Endpoints ]
                       │
                       ▼
           [ Create Delivery Record ]
                 (Status: PENDING)
                       │
                       ▼
            [ Execute HTTP POST ]
                 (Status: DELIVERING)
                       │
          ┌────────────┴────────────┐
          │                         │
     HTTP 2xx                  HTTP 4xx / 5xx / Timeout
          │                         │
          ▼                         ▼
   [ Status: DELIVERED ]     Is Transient Failure & Attempts < 5?
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                        YES                    NO
                         │                     │
                         ▼                     ▼
               [ Status: RETRYING ]   [ Status: FAILED ]
                 (Schedule Backoff)   (Disable if repeated)
```

### Delivery Statuses

| Status | Description |
| :--- | :--- |
| `PENDING` | Delivery record created in database; waiting for worker dispatch. |
| `DELIVERING` | HTTP request currently in-flight. |
| `DELIVERED` | Endpoint responded with HTTP 2xx within timeout. |
| `RETRYING` | Delivery failed with a transient error; scheduled for retry. |
| `FAILED` | Maximum retry attempts (5) exhausted or permanent failure encountered. |
| `DISABLED` | Endpoint disabled due to consecutive terminal failures. |

---

## 3. Webhook Payload Envelope

All webhooks share a canonical, versioned envelope:

```json
{
  "id": "evt_01j7b9k2x3m4n5p6q7r8s9t0",
  "type": "payment_intent.confirmed",
  "version": 1,
  "occurred_at": "2026-09-20T16:30:00Z",
  "organization_id": "org_arc_enterprise_01",
  "actor_type": "SYSTEM",
  "actor_id": "sys_settlement_worker",
  "agent_id": "agent_research_01",
  "payment_intent_id": "pi_01j7b9k2x3m4n5p6q7r8s9t0",
  "execution_id": "exec_01j7b9k2x3m4n5p6q7r8s9t0",
  "approval_id": "appr_01j7b9k2x3m4n5p6q7r8s9t0",
  "transaction_id": "tx_01j7b9k2x3m4n5p6q7r8s9t0",
  "request_id": "req_01j7b9k2x3m4n5p6q7r8s9t0",
  "correlation_id": "pi_01j7b9k2x3m4n5p6q7r8s9t0",
  "causation_id": "exec_01j7b9k2x3m4n5p6q7r8s9t0",
  "data": {
    "intent_id": "pi_01j7b9k2x3m4n5p6q7r8s9t0",
    "agent_id": "agent_research_01",
    "amount": "15.50",
    "currency": "USDC",
    "recipient": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "service_id": "srv_coingecko_api",
    "status": "CONFIRMED",
    "tx_hash": "0x8f3c...b21a",
    "confirmed_at": "2026-09-20T16:30:00Z"
  }
}
```

### Envelope Field Reference

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique event identifier (`evt_...`). Stable across all retries. |
| `type` | string | Event taxonomy type (e.g. `payment_intent.confirmed`). |
| `version` | number | Payload schema version (currently `1`). |
| `occurred_at` | string | ISO 8601 UTC timestamp when the domain event occurred. |
| `organization_id` | string | Scope of the organization owning the event. |
| `actor_type` | string | Originator (`AGENT`, `USER`, `SYSTEM`, `API_KEY`). |
| `actor_id` | string | Identifier of the actor that initiated the change. |
| `agent_id` | string \| null | Associated agent ID if applicable. |
| `payment_intent_id` | string \| null | Associated payment intent ID if applicable. |
| `execution_id` | string \| null | Associated execution ID if applicable. |
| `approval_id` | string \| null | Associated approval request ID if applicable. |
| `transaction_id` | string \| null | Associated Arc transaction ID if applicable. |
| `request_id` | string | Originating HTTP request ID for end-to-end tracing. |
| `correlation_id` | string | Identifies the entire business transaction (root intent ID). |
| `causation_id` | string | Identifies the immediate precursor event/step that caused this event. |
| `data` | object | Structured event-specific business data payload. |

---

## 4. Retry Schedule & Failure Classification

AgentPay uses bounded exponential backoff with jitter to handle temporary receiver outages while preventing retry storms.

### Retry Schedule

| Attempt | Delay Before Attempt | Cumulative Elapsed |
| :---: | :---: | :---: |
| 1 | Immediate | 0s |
| 2 | 15 seconds ± 20% jitter | ~15s |
| 3 | 60 seconds ± 20% jitter | ~75s |
| 4 | 5 minutes ± 20% jitter | ~6m 15s |
| 5 | 30 minutes ± 20% jitter | ~36m 15s |

After 5 failed attempts, the delivery enters `FAILED` status and no further automatic attempts are made.

### Failure Classification

- **Transient Failures (Retried)**:
  - Network timeouts (connect timeout: 5s, response timeout: 10s)
  - Connection reset / dropped
  - HTTP 408 (Request Timeout)
  - HTTP 429 (Too Many Requests / Rate Limited)
  - HTTP 500, 502, 503, 504 (Server Errors)
- **Permanent Failures (Not Retried)**:
  - HTTP 400 (Bad Request)
  - HTTP 401 (Unauthorized)
  - HTTP 403 (Forbidden)
  - HTTP 404 (Not Found)
  - HTTP 405 (Method Not Allowed)
  - HTTP 410 (Gone)
  - DNS resolution failure (NXDOMAIN)
  - SSL/TLS certificate verification failure

---

## 5. Idempotency Guarantees for Consumers

Because networks are unreliable, webhooks may be delivered more than once (e.g. if the consumer processes the webhook but the HTTP 200 response is lost in transit).

### Consumer Implementation Rules

1. **Use `event.id` as Primary Key**: Store received `event.id` values in an ACID database table with a unique constraint.
2. **Check Before Processing**: Before executing downstream side effects (e.g. sending customer emails or provisioning credits), verify whether `event.id` has already been recorded as processed.
3. **Respond Fast with HTTP 200**: Acknowledge receipt within 5 seconds. If processing takes longer, enqueue the event to an internal worker queue and return HTTP 200 immediately.

```typescript
// Example Consumer (Express / Node.js)
app.post('/api/webhooks/agentpay', async (req, res) => {
  const signature = req.headers['agentpay-signature'];
  const rawBody = req.body; // Ensure raw buffer is used

  // 1. Verify cryptographic signature
  if (!agentpay.webhooks.verifySignature(rawBody, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(rawBody.toString());

  // 2. Check for duplicate event ID
  const alreadyProcessed = await db.processedEvents.findUnique({
    where: { id: event.id }
  });

  if (alreadyProcessed) {
    // Acknowledge immediately without reprocessing
    return res.status(200).json({ status: 'already_processed' });
  }

  // 3. Process the event
  await processDomainEvent(event);

  // 4. Record as processed
  await db.processedEvents.create({
    data: { id: event.id, processedAt: new Date() }
  });

  return res.status(200).json({ status: 'ok' });
});
```

---

## 6. Developer API Reference

### 1. Register Webhook Endpoint
`POST /v1/webhooks`

Registers a new HTTPS endpoint. The response returns the signing secret **once**.

**Request**:
```json
{
  "url": "https://api.merchant.com/agentpay/webhooks",
  "description": "Production settlement listener",
  "events": ["payment_intent.*", "approval.*"]
}
```

**Response (201 Created)**:
```json
{
  "id": "we_01j7b8...",
  "organization_id": "org_arc_enterprise_01",
  "url": "https://api.merchant.com/agentpay/webhooks",
  "description": "Production settlement listener",
  "events": ["payment_intent.*", "approval.*"],
  "secret": "whsec_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
  "enabled": true,
  "status": "ACTIVE",
  "created_at": "2026-09-20T16:00:00Z"
}
```

### 2. List Webhook Endpoints
`GET /v1/webhooks`

Returns all registered endpoints for the authenticated organization. Note that `secret` is omitted.

### 3. Get Webhook Endpoint
`GET /v1/webhooks/{id}`

Returns endpoint details, delivery counters, and last delivery timestamp.

### 4. Update Webhook Endpoint
`PATCH /v1/webhooks/{id}`

Modify description, event subscriptions, or enable/disable status.

### 5. Delete Webhook Endpoint
`DELETE /v1/webhooks/{id}`

Permanently removes the endpoint.

### 6. List Deliveries
`GET /v1/webhooks/{id}/deliveries?limit=50`

Returns recent delivery attempts for debugging, including HTTP status codes, latency in milliseconds, attempt counts, and error messages.

### 7. Send Test Ping
`POST /v1/webhooks/{id}/test`

Sends a synthetic `test.ping` event to verify endpoint connectivity and signature verification.
- **Does NOT** touch treasury balances.
- **Does NOT** trigger on-chain transactions.
- **Does NOT** evaluate policies or create payment intents.
