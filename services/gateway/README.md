# AgentPay Gateway Service

The Go API Gateway serves as the secure orchestration and communication layer between web/AI clients and the deterministic Rust Policy Engine.

```
Client / AI
    ↓ (POST /v1/payments/authorize)
Go Gateway (:8080)
    ↓ (POST /v1/authorize)
Rust Policy Engine (:8081)
    ↓ (ALLOW / DENY)
Go Gateway
    ↓
Future: Solidity AgentVault on Arc
```

> [!NOTE]
> **Blockchain Execution Boundary**: For this task, blockchain execution remains disabled. Authorization is side-effect-free policy evaluation and does NOT execute payments or claim a payment occurred.

---

## Architectural Responsibilities

- **Public HTTP API**: Exposes clean, versioned REST endpoints (`/v1/...`).
- **Request Validation**: Validates basic JSON syntax, required fields, and recipient hex format.
- **Request ID Tracking**: Generates or propagates request IDs across log records and downstream requests.
- **Timeout Management**: Enforces configurable timeouts on downstream calls using `context.WithTimeout`.
- **Policy Engine Client**: Typed client communicating with the Rust Policy Engine over HTTP.
- **Response Normalization**: Maps Rust decisions and error states into consistent, safe HTTP responses.
- **Safe Structured Logging**: Logs request metadata, decisions, and durations without leaking secrets or payload bodies.
- **Health & Readiness**: `/health` (independent) and `/ready` (dependency verification).
- **Authentication Boundary**: Establishes the placeholder boundary for future agent authentication.

---

## Endpoints

### 1. `POST /v1/payments/authorize`

Evaluates whether a requested payment satisfies the deterministic spending policy.

#### Request Schema

```json
{
  "request_id": "req_123",
  "agent_id": "research-agent",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "180000",
  "asset": "USDC",
  "purpose": "api_usage"
}
```

- `request_id` (string, optional): Unique client request identifier. If omitted, the gateway generates `req_<hex>`.
- `agent_id` (string, required): Identifier of the autonomous agent requesting payment.
- `recipient` (string, required): 42-character hex Ethereum address starting with `0x`.
- `amount` (string, required): Base units of token (e.g. `180000` = 0.18 USDC with 6 decimals). **Must remain a string to prevent float precision issues.**
- `asset` (string, required): Asset symbol (e.g., `USDC`).
- `purpose` (string, required): Justification for the payment (e.g., `api_usage`, `compute`).

#### Response Schema

**Approved (HTTP 200 OK):**
```json
{
  "request_id": "req_123",
  "decision": "ALLOW",
  "reason_code": "APPROVED",
  "reason": "Payment satisfies the configured policy."
}
```

**Denied (HTTP 200 OK):**
> [!IMPORTANT]
> A valid authorization request resulting in `DENY` is still a successful policy evaluation. The gateway returns HTTP 200 with the deterministic decision and reason code.

```json
{
  "request_id": "req_123",
  "decision": "DENY",
  "reason_code": "DAILY_LIMIT_EXCEEDED",
  "reason": "Payment would exceed the agent daily spending limit."
}
```

#### HTTP Status Codes

| Status | Condition | Example Reason |
|---|---|---|
| `200 OK` | Policy evaluation completed | Both `ALLOW` and `DENY` |
| `400 Bad Request` | Malformed JSON or invalid schema | Missing required field, malformed address |
| `413 Payload Too Large` | Request body exceeds limit | Exceeds `MAX_REQUEST_BODY_BYTES` (1MB) |
| `503 Service Unavailable` | Downstream Rust engine unreachable | Connection refused or Rust returned 5xx |
| `504 Gateway Timeout` | Downstream Rust engine timed out | Exceeded `POLICY_ENGINE_TIMEOUT_MS` |
| `500 Internal Server Error` | Unexpected internal failure | Panic recovered safely |

---

### 2. `GET /health`

Lightweight liveness probe for the Gateway service itself. Does NOT depend on external services.

**Response (HTTP 200 OK):**
```json
{
  "status": "ok",
  "service": "gateway"
}
```

---

### 3. `GET /ready`

Readiness probe verifying that required dependencies (Rust Policy Engine) are reachable.

**Response (HTTP 200 OK when ready):**
```json
{
  "status": "ready",
  "service": "gateway",
  "dependencies": {
    "policy_engine": "ok"
  }
}
```

**Response (HTTP 503 Service Unavailable when degraded):**
```json
{
  "status": "degraded",
  "service": "gateway",
  "dependencies": {
    "policy_engine": "unavailable"
  }
}
```

---

## Go ↔ Rust Integration Contract

The Go Gateway forwards requests to the internal Rust Policy Engine at:
`POST {POLICY_ENGINE_URL}/v1/authorize`

### Rust Request Payload
```json
{
  "request_id": "req_123",
  "agent_id": "research-agent",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "180000",
  "asset": "USDC",
  "purpose": "api_usage"
}
```

### Rust Response Payload
```json
{
  "request_id": "req_123",
  "decision": "ALLOW",
  "reason_code": "APPROVED",
  "reason": "Payment satisfies the configured policy."
}
```

### Deterministic Reason Codes
- `APPROVED`
- `POLICY_DISABLED`
- `INVALID_AMOUNT`
- `AMOUNT_EXCEEDS_TRANSACTION_LIMIT`
- `DAILY_LIMIT_EXCEEDED`
- `RECIPIENT_NOT_ALLOWED`
- `RECIPIENT_BLOCKED`
- `ASSET_NOT_ALLOWED`
- `DAILY_TRANSACTION_LIMIT_EXCEEDED`
- `INVALID_REQUEST`

---

## Example Usage

### Authorize Payment (cURL)

```bash
curl -X POST http://localhost:8080/v1/payments/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "research-agent",
    "recipient": "0x1111111111111111111111111111111111111111",
    "amount": "180000",
    "asset": "USDC",
    "purpose": "api_usage"
  }'
```

### Check Readiness

```bash
curl http://localhost:8080/ready
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GATEWAY_PORT` / `PORT` | Gateway listening port | `8080` |
| `POLICY_ENGINE_URL` | Upstream Rust Policy Engine base URL | `http://localhost:8081` |
| `POLICY_ENGINE_TIMEOUT_MS` | Timeout for policy evaluation in ms | `2000` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `http://localhost:3000` |
| `MAX_REQUEST_BODY_BYTES` | Maximum incoming request body size | `1048576` (1MB) |

---

## Testing

```bash
# Run unit tests
go test -v ./...

# Run integration tests
go test -v ./tests/integration/...
```
