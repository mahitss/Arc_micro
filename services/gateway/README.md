# AgentPay Gateway Service

The Go API Gateway serves as the secure orchestration and communication layer between web/AI clients, the deterministic Rust Policy Engine, and the on-chain Arc execution layer.

```
Client / AI
    ↓ (POST /v1/payments/authorize or POST /v1/payments/execute)
Go Gateway (:8080)
    ↓ (POST /v1/authorize)
Rust Policy Engine (:8081)
    ↓ (ALLOW / DENY)
Go Gateway
    ↓ (If ALLOW)
Execution Service
    ↓ (EIP-1559 Transaction)
AgentVault.sol
    ↓ (usdc.safeTransfer)
Arc Mainnet (USDC Settlement)
```

> [!IMPORTANT]
> **Safety Invariant: Authorization Precedence**:
> Blockchain execution is NEVER initiated without prior explicit `ALLOW` from the authoritative Rust Policy Engine. If Rust returns `DENY`, no transaction is created or broadcast.

> [!NOTE]
> **Live Execution Gate (`ENABLE_LIVE_EXECUTION`)**:
> Production broadcast is disabled by default (`ENABLE_LIVE_EXECUTION=false`). When disabled, transaction preparation, address validation, and policy checks are executed, returning `status: "EXECUTION_DISABLED"` with the authorization decision.

---

## Architectural Responsibilities

- **Public HTTP API**: Exposes clean, versioned REST endpoints (`/v1/...`).
- **Request Validation**: Validates basic JSON syntax, required fields, and recipient/vault hex formats.
- **Request ID Tracking**: Generates or propagates request IDs across log records and downstream requests.
- **Timeout Management**: Enforces configurable timeouts on downstream calls using `context.WithTimeout`.
- **Policy Engine Client**: Typed client communicating with the Rust Policy Engine over HTTP (`POST /v1/authorize`).
- **Execution Service**: Connects to the Arc EVM network, checks chain ID (`5042`), packs `AgentVault.executePayment(...)` calldata, manages nonces, signs transactions, and polls receipts.
- **Idempotency**: Thread-safe execution store indexing by `request_id` to prevent duplicate transaction submissions.
- **Response Normalization**: Maps Rust decisions and execution outcomes into consistent, safe HTTP responses.
- **Safe Structured Logging**: Logs request metadata, decisions, and durations without leaking secrets, private keys, or payload bodies.
- **Health & Readiness**: `/health` (independent) and `/ready` (dependency verification).

---

## Endpoints

### 1. `POST /v1/payments/execute`

Authorizes a payment request via the Rust Policy Engine and, if allowed, executes an on-chain payment from `AgentVault` on Arc.

#### Request Schema

```json
{
  "request_id": "req_123",
  "agent_id": "research-agent",
  "vault_address": "0x2222222222222222222222222222222222222222",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "180000",
  "purpose": "api_usage"
}
```

- `request_id` (string, optional): Unique request identifier. If omitted, the gateway generates `req_<hex>`.
- `agent_id` (string, required): Identifier of the autonomous agent.
- `vault_address` (string, required): 42-character hex address of the agent's `AgentVault` contract.
- `recipient` (string, required): 42-character hex address receiving USDC.
- `amount` (string, required): Payment amount in USDC base units (6 decimals, e.g. `180000` = 0.18 USDC).
- `purpose` (string, required): Purpose identifier or justification.

#### Response Schemas

**Execution Disabled / Dry Run (HTTP 200 OK):**
```json
{
  "request_id": "req_123",
  "status": "EXECUTION_DISABLED",
  "vault": "0x2222222222222222222222222222222222222222",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "180000",
  "authorization": {
    "request_id": "req_123",
    "decision": "ALLOW",
    "reason_code": "APPROVED",
    "reason": "Payment satisfies the configured policy."
  }
}
```

**Policy Denied (HTTP 200 OK - No Blockchain Transaction Sent):**
```json
{
  "request_id": "req_123",
  "status": "DENIED",
  "vault": "0x2222222222222222222222222222222222222222",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "180000",
  "authorization": {
    "request_id": "req_123",
    "decision": "DENY",
    "reason_code": "DAILY_LIMIT_EXCEEDED",
    "reason": "Payment would exceed the agent daily spending limit."
  }
}
```

**Confirmed Transaction (HTTP 200 OK):**
```json
{
  "request_id": "req_123",
  "status": "CONFIRMED",
  "transaction_hash": "0xabc...",
  "block_number": "12345",
  "vault": "0x2222222222222222222222222222222222222222",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "180000",
  "explorer_url": "https://explorer.arc.io/tx/0xabc...",
  "authorization": {
    "request_id": "req_123",
    "decision": "ALLOW",
    "reason_code": "APPROVED",
    "reason": "Payment satisfies the configured policy."
  }
}
```

---

### 2. `POST /v1/payments/authorize`

Evaluates whether a payment satisfies policy without initiating blockchain execution.

---

### 3. `GET /health` and `GET /ready`

- `GET /health`: Liveness probe for Gateway service (`{"status":"ok","service":"gateway"}`).
- `GET /ready`: Readiness probe verifying reachability of upstream dependencies.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GATEWAY_PORT` / `PORT` | Gateway listening port | `8080` |
| `POLICY_ENGINE_URL` | Upstream Rust Policy Engine base URL | `http://localhost:8081` |
| `POLICY_ENGINE_TIMEOUT_MS` | Timeout for policy evaluation in ms | `2000` |
| `ARC_RPC_URL` | Arc Blockchain JSON-RPC endpoint | `https://rpc.mainnet.arc.io` |
| `ARC_CHAIN_ID` | Arc Network Chain ID | `5042` |
| `ARC_USDC_ADDRESS` | USDC token address on Arc | `0x3600000000000000000000000000000000000000` |
| `ARC_EXPLORER_URL` | Arc Block Explorer base URL | `https://explorer.arc.io` |
| `ENABLE_LIVE_EXECUTION` | Whether to broadcast live transactions to Arc | `false` |
| `EXECUTOR_PRIVATE_KEY` | Hex private key for transaction signing (loaded strictly via env/secrets) | *(Unset)* |
| `ARC_RPC_TIMEOUT_MS` | Timeout for RPC queries in ms | `5000` |
| `ARC_CONFIRMATION_TIMEOUT_MS` | Timeout waiting for transaction receipt in ms | `60000` |

---

## Example Usage

### Execute Payment (cURL)

```bash
curl -X POST http://localhost:8080/v1/payments/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "research-agent",
    "vault_address": "0x2222222222222222222222222222222222222222",
    "recipient": "0x1111111111111111111111111111111111111111",
    "amount": "180000",
    "purpose": "api_usage"
  }'
```

---

## Testing

```bash
# Run all gateway tests
go test -v ./...
```
