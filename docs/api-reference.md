# AgentPay Public API Reference (v1)

The AgentPay Public API enables autonomous AI agents and developer platforms to interact with the programmable financial control plane on Arc.

## Base URL
- **Local / Test**: `http://localhost:8080`
- **Production**: `https://api.agentpay.arc`

## Standard Request Headers

| Header | Description | Required |
| :--- | :--- | :---: |
| `Authorization` | Bearer token format: `Bearer <api_key>` (e.g. `ap_live_...`). | Yes |
| `Content-Type` | Must be `application/json` for requests with bodies. | When body present |
| `Idempotency-Key` | Unique string to guarantee exactly-once payment intent creation. | Recommended for POST |
| `X-Request-ID` | Tracing identifier; echoed back in response headers. | Optional |

## Denominations & Amounts
All monetary values are strings representing integer base units (6 decimal places for USDC):
- `1000000` = $1.00 USDC
- `2500000` = $2.50 USDC
- `500000` = $0.50 USDC

---

## 1. Payment Intents API

### Create Payment Intent
`POST /v1/payment-intents`

Creates a new payment intent. AgentPay evaluates policies, spending limits, velocity, and approval thresholds.

**Request Body**:
```json
{
  "agent_id": "agent_research_01",
  "service": "research-api",
  "amount": "1500000",
  "asset": "USDC",
  "purpose": "Procure orderbook telemetry",
  "justification": "Autonomous market analysis"
}
```

**Response (201 Created)**:
```json
{
  "id": "pi_01j7b9k2x3m4n5p6q7r8s9t0",
  "status": "AUTHORIZED",
  "amount": "1500000",
  "asset": "USDC",
  "service": "research-api",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "purpose": "Procure orderbook telemetry",
  "agent_id": "agent_research_01",
  "organization_id": "org_arc_enterprise_01",
  "decision": {
    "result": "ALLOW",
    "risk": "LOW"
  },
  "created_at": "2026-09-20T16:30:00Z",
  "expires_at": "2026-09-20T17:30:00Z"
}
```

### Get Payment Intent
`GET /v1/payment-intents/{id}`

Returns the intent details, authorization status, execution status, and transaction hash.

### List Payment Intents
`GET /v1/payment-intents?status=AUTHORIZED`

Lists payment intents scoped to the authenticated organization.

### Confirm Payment Intent
`POST /v1/payment-intents/{id}/confirm`

Triggers execution and settlement of an authorized or approved payment intent on the Arc network.

---

## 2. Agents API

### List Agents
`GET /v1/agents`

Returns all registered agents for the organization.

### Get Agent
`GET /v1/agents/{id}`

Returns agent details, associated vault address, current balance, and spending policy configuration (per-tx limits, daily limits, remaining budget).

---

## 3. Services API

### List Services
`GET /v1/services`

Returns the approved service registry (services approved for agent procurement, their max prices, and settlement recipients).

---

## 4. Approvals API

### List Approvals
`GET /v1/approvals`

Lists payment requests pending human approval.

### Get Approval
`GET /v1/approvals/{id}`

Returns approval request details.

### Approve Payment
`POST /v1/approvals/{id}/approve`

Authorizes a pending payment intent. Requires `payments:approve` permission scope.

### Reject Payment
`POST /v1/approvals/{id}/reject`

Rejects a pending payment intent.

---

## 5. Transactions API

### List Transactions
`GET /v1/transactions`

Lists on-chain Arc execution records including transaction hashes, status, and mining timestamps.

---

## 6. Events API

### List Events
`GET /v1/events?limit=50&event_type=payment_intent.*`

Queries immutable domain audit events with filtering support.

### Get Event
`GET /v1/events/{id}`

Retrieves a single domain event envelope with full causal lineage.

---

## 7. Webhooks API

### Register Webhook Endpoint
`POST /v1/webhooks`

Registers an HTTPS endpoint to receive domain events. Returns the signing secret **only once**.

### List Webhook Endpoints
`GET /v1/webhooks`

Lists registered endpoints (secrets omitted).

### Get Webhook Endpoint
`GET /v1/webhooks/{id}`

Returns endpoint status, failure counts, and subscription topics.

### Update Webhook Endpoint
`PATCH /v1/webhooks/{id}`

Enables/disables or updates subscriptions.

### Delete Webhook Endpoint
`DELETE /v1/webhooks/{id}`

Removes the endpoint.

### List Deliveries
`GET /v1/webhooks/{id}/deliveries?limit=50`

Returns recent delivery attempts, HTTP status codes, latencies, and retry history.

### Send Test Ping
`POST /v1/webhooks/{id}/test`

Sends a synthetic `test.ping` event to verify connectivity and signature verification.

---

## 8. Error Model & Status Codes

AgentPay returns structured JSON errors for all 4xx and 5xx responses:

```json
{
  "error": {
    "code": "POLICY_DENIED",
    "message": "Payment amount exceeds remaining daily spending limit.",
    "request_id": "req_01j7b9...",
    "details": {
      "limit": "5000000",
      "requested": "10000000"
    }
  }
}
```

| HTTP Status | Error Code | Description |
| :---: | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Malformed request body or invalid parameters. |
| `400` | `POLICY_DENIED` | Payment violates spending limits, velocity, or unapproved recipient. |
| `400` | `INSUFFICIENT_TREASURY` | Treasury vault lacks sufficient balance or reservation capacity. |
| `401` | `AUTHENTICATION_ERROR` | Missing, invalid, or revoked API key. |
| `403` | `AUTHORIZATION_ERROR` | API key lacks required scope for this operation. |
| `404` | `NOT_FOUND` | Resource does not exist or belongs to another organization. |
| `409` | `CONFLICT` | Concurrent update conflict or duplicate request. |
| `429` | `RATE_LIMITED` | Organization or API key rate limit exceeded. |
| `500` | `EXECUTION_ERROR` | Arc blockchain transaction reverted or failed. |
| `500` | `INTERNAL_ERROR` | Server-side unexpected failure. |
