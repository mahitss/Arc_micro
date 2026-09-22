# AgentPay Public API Reference (v1)

The AgentPay Public API enables autonomous AI agents and developer platforms to interact with the programmable financial control plane on Arc.

## Base URL
- **Local / Simulation**: `http://localhost:8080`
- **Production (Live Arc)**: `https://api.agentpay.arc`

## Standard Request Headers

| Header | Description | Required |
| :--- | :--- | :---: |
| `Authorization` | Bearer token format: `Bearer <api_key>` (`ap_live_...`). | Yes |
| `Content-Type` | `application/json` for requests with bodies. | When body present |
| `Idempotency-Key` | Unique UUID or nonce to prevent duplicate charges across network retries. | Recommended for POST |
| `X-Request-ID` | Tracing identifier; echoed back in response headers. | Optional |

## Denominations & Money Safety
All monetary values are strings representing integer base units (6 decimal places for USDC):
- `1000000` = $1.00 USDC
- `180000` = $0.18 USDC
- `2500000` = $2.50 USDC

> [!CAUTION]
> Never represent monetary amounts as floating-point numbers. Always use integer base units, strings, or arbitrary-precision Decimals.

---

## 1. Service Discovery & Quotes

### List Approved Services
`GET /v1/services`

Query parameters:
- `category` (optional): `RESEARCH`, `DATA`, `COMPUTE`, `ORACLE`, `AI_MODELS`
- `enabled` (optional): `true` / `false`

**Response (200 OK)**:
```json
{
  "services": [
    {
      "id": "web-research",
      "name": "Autonomous Web Research Provider",
      "recipient": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "asset": "USDC",
      "enabled": true,
      "pricing_model": "QUOTE_REQUIRED"
    }
  ]
}
```

### Request Service Quote
`POST /v1/services/{id}/quote`

**Request Body**:
```json
{
  "amount": "180000",
  "asset": "USDC"
}
```

**Response (201 Created)**:
```json
{
  "quote_id": "quote_01j7b9k2x3m4n5p6q7r8s9t0",
  "service_id": "web-research",
  "amount": "180000",
  "asset": "USDC",
  "expires_at": "2026-09-22T19:00:00Z"
}
```

---

## 2. Payment Intents API

### Create Payment Intent
`POST /v1/payment-intents`

Creates a new payment intent. AgentPay resolves the registered recipient, binds the quote (if provided), and deterministically evaluates policy limits and risk.

**Request Body**:
```json
{
  "agent_id": "agent_alpha",
  "service": "web-research",
  "quote_id": "quote_01j7b9k2x3m4n5p6q7r8s9t0",
  "amount": "180000",
  "asset": "USDC",
  "purpose": "Autonomous web research procurement",
  "justification": "Task telemetry query"
}
```

**Response (201 Created)**:
```json
{
  "id": "intent_0468113df765b413",
  "status": "AUTHORIZED",
  "amount": "180000",
  "asset": "USDC",
  "service": "web-research",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "agent_id": "agent_alpha",
  "organization_id": "org_dev",
  "decision": {
    "result": "ALLOW",
    "risk": "LOW"
  },
  "created_at": "2026-09-22T18:48:39Z",
  "expires_at": "2026-09-22T18:53:39Z"
}
```

### Get Payment Intent
`GET /v1/payment-intents/{id}`

Returns the full status and execution timestamps of a payment intent.

### Get Financial Flight Recorder Trace
`GET /v1/payment-intents/{id}/trace`

Returns the deterministic, reconstructable Flight Recorder record for the payment intent.

**Response (200 OK)**:
```json
{
  "trace_id": "trc_intent_0468113df765b413",
  "organization_id": "org_dev",
  "agent_id": "agent_alpha",
  "payment_intent_id": "intent_0468113df765b413",
  "status": "CONFIRMED",
  "execution_mode": "SIMULATION",
  "created_at": "2026-09-22T18:48:39Z",
  "updated_at": "2026-09-22T18:48:40Z",
  "payment_summary": {
    "intent_id": "intent_0468113df765b413",
    "organization_id": "org_dev",
    "agent_id": "agent_alpha",
    "service_id": "web-research",
    "recipient": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "amount": "180000",
    "asset": "USDC",
    "purpose": "Autonomous web research procurement",
    "request_id": "idem_day8_canonical_001"
  },
  "policy_evidence": {
    "decision": "ALLOW",
    "reason_code": "POLICY_PERMITTED",
    "risk_level": "LOW",
    "evaluated_at": "2026-09-22T18:48:39Z"
  },
  "steps": [
    {
      "step_number": 1,
      "type": "PAYMENT_REQUESTED",
      "status": "COMPLETED",
      "actor": "AGENT:agent_alpha",
      "timestamp": "2026-09-22T18:48:39Z"
    },
    {
      "step_number": 2,
      "type": "POLICY_EVALUATED",
      "status": "COMPLETED",
      "actor": "SYSTEM",
      "timestamp": "2026-09-22T18:48:39Z"
    }
  ]
}
```

---

## 3. Idempotency & Error Semantics

- **Identical Replay**: Submitting the same `Idempotency-Key` with identical parameters returns the existing payment intent with `200 OK` or `201 Created`.
- **Conflict Rejection**: Submitting the same `Idempotency-Key` with differing parameters yields `409 Conflict`:
```json
{
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "idempotency conflict: key already used with different request parameters"
  }
}
```
