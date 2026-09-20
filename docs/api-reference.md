# AgentPay API Reference

The AgentPay Gateway API exposes the public developer surface and programmatic control plane for AI agents procuring services with policy-governed payments on Arc.

---

## Architecture Overview

```
Developer / AI Agent
        │
        ▼
AgentPay Public API (Port 8080)
        │
  ┌─────┴────────────────────────────┐
  │ Go Gateway (Boundary & Auth)     │
  │  ├── SHA-256 API Key Validation  │
  │  ├── Tenant Isolation (Org A/B)  │
  │  ├── Idempotency Controller      │
  │  └── Rate Limiter                │
  └─────┬────────────────────────────┘
        │
        ├── Rust Policy Engine (Port 8081) [Deterministic Policy & Risk]
        ├── Arc Blockchain Execution Service (AgentVault USDC Settlement)
        └── PostgreSQL / Memory Repository
```

---

## Authentication & Headers

| Header | Format | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `Bearer ap_live_...` or `Bearer apk_live_...` | Yes | Developer platform API key secret. |
| `X-API-Key` | `ap_live_...` | Optional | Alternative header for passing the API key. |
| `Idempotency-Key` | String (e.g. `req_12345`) | Recommended for POST | Guarantees exactly-once execution for mutating requests. |
| `X-Request-ID` | String (e.g. `req_...`) | Optional | Distributed trace identifier. Auto-generated if omitted. |

---

## 1. Payment Intents API

### `POST /v1/payment-intents`

Creates a new Payment Intent and executes automatic deterministic policy and risk evaluation.

- **Auth**: Required (`payments:create` scope)
- **Idempotency**: Supported via `Idempotency-Key` header. Repeated requests return the identical payment intent without duplicate processing.

#### Request Body
```json
{
  "agent_id": "agent_research",
  "service": "research-api",
  "amount": "1200000",
  "asset": "USDC",
  "purpose": "Autonomous research telemetry procurement",
  "justification": "Automated data retrieval",
  "vault_address": "0x1111111111111111111111111111111111111111"
}
```

#### Response (201 Created)
```json
{
  "id": "intent_9525df7cd3120591",
  "status": "AUTHORIZED",
  "amount": "1200000",
  "asset": "USDC",
  "service": "research-api",
  "recipient": "0x5555555555555555555555555555555555555555",
  "purpose": "Autonomous research telemetry procurement",
  "agent_id": "agent_research",
  "organization_id": "org_default",
  "decision": {
    "result": "ALLOW",
    "risk": "LOW",
    "reason": "APPROVED"
  },
  "created_at": "2026-09-20T22:08:17Z",
  "expires_at": "2026-09-20T22:13:17Z"
}
```

#### Errors
- `400 Bad Request` (`INVALID_REQUEST`): Missing parameters, unregistered service, or amount exceeds max price.
- `401 Unauthorized` (`UNAUTHORIZED`): Missing, invalid, or revoked API key.
- `403 Forbidden` (`FORBIDDEN`): API key lacks `payments:create` scope.

---

### `GET /v1/payment-intents/{id}`

Retrieves inspection details, lifecycle timestamps, authorization status, and execution transaction hash.

- **Auth**: Required (`payments:read` scope)
- **Tenant Isolation**: Strictly enforced. Accessing another organization's intent returns `404 Not Found`.

#### Response (200 OK)
```json
{
  "intent": {
    "intent_id": "intent_9525df7cd3120591",
    "organization_id": "org_default",
    "agent_id": "agent_research",
    "vault_address": "0x1111111111111111111111111111111111111111",
    "recipient": "0x5555555555555555555555555555555555555555",
    "amount": "1200000",
    "asset": "USDC",
    "purpose": "Autonomous research telemetry procurement",
    "service": "research-api",
    "status": "CONFIRMED"
  },
  "authorization_status": "AUTHORIZED",
  "execution_status": "CONFIRMED",
  "transaction_hash": "0x1c3cef38833ca20bf6548a29eabf43c811952e0f1b5101ec6514a68e661e5207",
  "timestamps": {
    "created_at": "2026-09-20T22:08:17Z",
    "expires_at": "2026-09-20T22:13:17Z",
    "updated_at": "2026-09-20T22:08:18Z",
    "confirmed_at": "2026-09-20T22:08:18Z"
  }
}
```

---

### `POST /v1/payment-intents/{id}/confirm`

Confirms and executes an authorized or approved intent on the Arc blockchain via `AgentVault`.

- **Auth**: Required (`payments:create` scope)
- **Response**:
```json
{
  "intent": { "intent_id": "intent_...", "status": "CONFIRMED" },
  "execution": {
    "request_id": "intent_...",
    "status": "CONFIRMED",
    "transaction_hash": "0x...",
    "vault": "0x...",
    "recipient": "0x...",
    "amount": "1200000"
  }
}
```

---

## 2. API Key Management API

### `POST /v1/api-keys`

Generates a new cryptographically secure API key. The plaintext secret is shown **ONLY ONCE**.

- **Auth**: Required
- **Request Body**:
```json
{
  "name": "Production Agent Key",
  "scopes": ["payments:read", "payments:create", "agents:read", "services:read"]
}
```
- **Response (201 Created)**:
```json
{
  "id": "key_e4b1a23c89d012e4",
  "secret": "ap_live_a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
  "masked_key": "ap_live_...8f90",
  "name": "Production Agent Key",
  "organization_id": "org_default",
  "scopes": ["payments:read", "payments:create", "agents:read", "services:read"],
  "status": "ACTIVE",
  "created_at": "2026-09-20T22:03:20Z",
  "warning": "This secret will never be displayed again. Store it securely in your environment variables."
}
```

### `GET /v1/api-keys`

Lists active and revoked API keys for the caller's organization. Plaintext secrets and hashes are never exposed.

### `DELETE /v1/api-keys/{id}`

Immediately revokes an API key.

---

## 3. Services API

### `GET /v1/services`

Lists all approved external services available for agent payment requests.

- **Response**:
```json
{
  "services": [
    {
      "id": "research-api",
      "name": "Autonomous Research Data Provider",
      "recipient": "0x5555555555555555555555555555555555555555",
      "asset": "USDC",
      "enabled": true,
      "max_price": "20000000"
    }
  ]
}
```

---

## 4. Agents API

### `GET /v1/agents`

Lists agents for the caller's organization.

### `GET /v1/agents/{id}`

Retrieves an agent's configured spending policy, daily limits, and USDC balance.

---

## 5. Approvals Control Plane API

### `GET /v1/approvals`

Lists pending and resolved human financial approvals.

### `POST /v1/approvals/{id}/approve`

Authorizes a pending payment intent requiring human review.

### `POST /v1/approvals/{id}/reject`

Rejects a pending payment intent.

---

## 6. Treasury API

### `GET /v1/treasury/summary`

Returns real-time vault balance, reserved funds, unreserved available capital, and settlement statistics.

---

## 7. System & Emergency Controls API

- `POST /v1/agents/{id}/pause` & `/resume`: Pauses or resumes an individual agent.
- `POST /v1/organizations/{id}/pause` & `/resume`: Pauses or resumes an entire organization.
- `POST /v1/system/pause` & `/resume`: Global execution kill switch.
- `GET /v1/system/status`: Returns health and pause states across all tiers.
