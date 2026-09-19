# AgentPay Deterministic Policy Engine

The **AgentPay Policy Engine** is the deterministic authorization service and security boundary of AgentPay on the Arc blockchain.

Before any payment is dispatched to the on-chain `AgentVault`, it must pass through this service. Given an identical payment request and policy state, the engine **always produces the identical decision** (`ALLOW` or `DENY`) with an auditable reason code.

---

## Core Invariants

1. **Pure Function Evaluation**:
   The core evaluation function `authorize(request, policy)` is 100% pure:
   - No network calls
   - No database queries
   - No filesystem access
   - No external system clock or random number generators
2. **Zero Floating-Point Arithmetic**:
   All monetary amounts are represented as integer base units (micro-USDC: 6 decimals). Floats (`f32`, `f64`) are strictly prohibited in the domain and engine layers. All calculations use checked integer arithmetic (`checked_add`) to prevent silent overflow.
3. **Address Normalization**:
   All recipient addresses are validated and normalized to lowercase `0x` hex strings (42 characters) to eliminate case-sensitivity security bypasses.
4. **Deterministic Evaluation Order**:
   Rules are evaluated in a fixed, explicit order. The first failing rule determines the `reason_code`.

---

## Policy Evaluation Order

1. **Request ID Validation**: Non-empty, non-whitespace.
2. **Agent / Policy State**: Policy must be enabled and match agent ID.
3. **Amount Validation**: Amount must be > 0.
4. **Asset Authorization**: Asset must be in `allowed_assets` (e.g. `USDC`).
5. **Blocked Recipient Check**: Recipient must not be in `blocked_recipients` (blacklist takes precedence).
6. **Allowed Recipient Check**: If allowlist configured, recipient must be in `allowed_recipients`.
7. **Per-Transaction Limit**: Amount must not exceed `per_transaction_limit`.
8. **Daily Transaction Count**: `daily_transaction_count` must be strictly less than `max_transactions_per_day`.
9. **Daily Spending Limit**: `daily_spent + amount` must not exceed `daily_limit` (with overflow check).
10. **Approval**: Returns `ALLOW` with reason code `APPROVED`.

---

## API Reference

### 1. `GET /health`
Returns service health status.

**Response**:
```json
{
  "status": "ok",
  "service": "policy-engine"
}
```

### 2. `POST /v1/authorize`
Evaluates a payment request against an agent's policy.

**Request**:
```json
{
  "request_id": "req_123",
  "agent_id": "research-agent",
  "recipient": "0x71c678d311516474809e39842c12f44b20a32508",
  "amount": "180000",
  "asset": "USDC",
  "purpose": "api_usage"
}
```

**Approval Response (HTTP 200)**:
```json
{
  "request_id": "req_123",
  "decision": "ALLOW",
  "reason_code": "APPROVED",
  "reason": "Payment satisfies the configured policy."
}
```

**Denial Response (HTTP 200)**:
```json
{
  "request_id": "req_123",
  "decision": "DENY",
  "reason_code": "AMOUNT_EXCEEDS_TRANSACTION_LIMIT",
  "reason": "Payment exceeds the single-transaction spending limit."
}
```

**Malformed Request Response (HTTP 400)**:
```json
{
  "error": "MALFORMED_AMOUNT",
  "message": "Field 'amount' must be an unsigned integer string in token base units. Got: '1.5'."
}
```

---

## Reason Codes

| Reason Code | Decision | Description |
|---|---|---|
| `APPROVED` | `ALLOW` | Payment satisfies the configured policy. |
| `POLICY_DISABLED` | `DENY` | The policy for this agent is currently disabled. |
| `INVALID_AMOUNT` | `DENY` | Payment amount must be greater than zero. |
| `AMOUNT_EXCEEDS_TRANSACTION_LIMIT` | `DENY` | Payment exceeds the single-transaction spending limit. |
| `DAILY_LIMIT_EXCEEDED` | `DENY` | Payment would exceed the agent daily spending limit. |
| `RECIPIENT_NOT_ALLOWED` | `DENY` | Recipient address is not on the allowed recipient list. |
| `RECIPIENT_BLOCKED` | `DENY` | Recipient address is on the blocked recipient list. |
| `ASSET_NOT_ALLOWED` | `DENY` | Asset is not supported or authorized by this policy. |
| `DAILY_TRANSACTION_LIMIT_EXCEEDED` | `DENY` | Agent has reached its maximum authorized transactions for today. |
| `INVALID_REQUEST` | `DENY` | Payment request is invalid or missing required parameters. |

---

## Demo Policy (`research-agent`)

For local development and testing, an isolated in-memory demo policy is provided:

- **Agent ID**: `research-agent`
- **Asset**: `USDC`
- **Per-Transaction Limit**: `500,000` ($0.50 USDC)
- **Daily Limit**: `5,000,000` ($5.00 USDC)
- **Daily Spent**: `0`
- **Max Transactions Per Day**: `20`
- **Allowed Recipients**:
  - `0x71c678d311516474809e39842c12f44b20a32508`
  - `0x2546bcd3279c0b1060285661688744d9f7518777`
- **Blocked Recipients**:
  - `0xdead000000000000000000000000000000000000`

---

## Local Development & Testing

```bash
# Run unit, property, and integration test suite
cargo test

# Check formatting
cargo fmt --check

# Run linter
cargo clippy

# Run service locally on port 8081
cargo run
```
