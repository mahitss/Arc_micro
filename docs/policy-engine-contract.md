# AgentPay Policy Engine Integration Contract

This document defines the machine-readable HTTP contract between the **Go Gateway** and the **Rust Policy Engine**.

---

## 1. Overview

The Rust Policy Engine exposes an authorization endpoint:

- **Method**: `POST`
- **Path**: `/v1/authorize`
- **Content-Type**: `application/json`

It evaluates a payment request against an agent's deterministic spending policy and returns an explicit `ALLOW` or `DENY` decision with an auditable `reason_code`.

---

## 2. Invariants

1. **Integer Base Units**:
   Amounts are strictly unsigned integers representing the smallest token unit (micro-USDC: 6 decimals).
   Example: `$1.00 USDC` = `1000000`.
2. **String Amounts at HTTP Boundary**:
   The `amount` field MUST be passed as a string of base-10 digits (e.g. `"180000"`) to avoid JSON number precision loss and prevent floating-point representation bugs.
3. **Normalized Addresses**:
   Recipient addresses must be 42-character hex strings starting with `0x`. The engine normalizes all addresses to lowercase for case-insensitive comparison.
4. **HTTP Status Codes**:
   - `200 OK`: Returned for all successfully evaluated requests (both `ALLOW` and `DENY`).
   - `400 Bad Request`: Returned when the request payload is malformed (e.g. invalid JSON, malformed amount string like `"1.5"`, or invalid hex address).
   - `500 Internal Server Error`: Reserved strictly for unrecoverable server errors.

---

## 3. Request Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AuthorizeHttpRequest",
  "type": "object",
  "required": ["request_id", "agent_id", "recipient", "amount", "asset", "purpose"],
  "properties": {
    "request_id": {
      "type": "string",
      "description": "Unique identifier for the payment request intent.",
      "minLength": 1
    },
    "agent_id": {
      "type": "string",
      "description": "Identifier of the agent initiating the payment.",
      "minLength": 1
    },
    "recipient": {
      "type": "string",
      "description": "Target EVM / Arc recipient address (0x followed by 40 hex digits).",
      "pattern": "^0[xX][0-9a-fA-F]{40}$"
    },
    "amount": {
      "type": "string",
      "description": "Base-unit integer amount (e.g. micro-USDC) without decimals or signs.",
      "pattern": "^[0-9]+$"
    },
    "asset": {
      "type": "string",
      "description": "Asset ticker symbol (e.g. 'USDC').",
      "minLength": 1
    },
    "purpose": {
      "type": "string",
      "description": "Human-readable purpose or metadata for audit logs."
    }
  }
}
```

---

## 4. Response Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AuthorizeHttpResponse",
  "type": "object",
  "required": ["request_id", "decision", "reason_code", "reason"],
  "properties": {
    "request_id": {
      "type": "string",
      "description": "Echoed unique request ID."
    },
    "decision": {
      "type": "string",
      "enum": ["ALLOW", "DENY"],
      "description": "Final authorization decision."
    },
    "reason_code": {
      "type": "string",
      "enum": [
        "APPROVED",
        "POLICY_DISABLED",
        "INVALID_AMOUNT",
        "AMOUNT_EXCEEDS_TRANSACTION_LIMIT",
        "DAILY_LIMIT_EXCEEDED",
        "RECIPIENT_NOT_ALLOWED",
        "RECIPIENT_BLOCKED",
        "ASSET_NOT_ALLOWED",
        "DAILY_TRANSACTION_LIMIT_EXCEEDED",
        "INVALID_REQUEST"
      ],
      "description": "Deterministic machine-readable reason code."
    },
    "reason": {
      "type": "string",
      "description": "Human-readable explanation of the decision."
    }
  }
}
```

---

## 5. Reason Codes Reference

| Reason Code | Decision | Description |
|---|---|---|
| `APPROVED` | `ALLOW` | Payment satisfies all configured policy rules. |
| `POLICY_DISABLED` | `DENY` | The policy for this agent is disabled. |
| `INVALID_AMOUNT` | `DENY` | Amount is zero or cannot be authorized. |
| `AMOUNT_EXCEEDS_TRANSACTION_LIMIT` | `DENY` | Amount exceeds single-transaction limit. |
| `DAILY_LIMIT_EXCEEDED` | `DENY` | Amount would exceed agent's remaining daily spending budget. |
| `RECIPIENT_NOT_ALLOWED` | `DENY` | Recipient address is not on the allowed recipient list. |
| `RECIPIENT_BLOCKED` | `DENY` | Recipient address is explicitly blacklisted. |
| `ASSET_NOT_ALLOWED` | `DENY` | Asset is not supported or authorized by policy. |
| `DAILY_TRANSACTION_LIMIT_EXCEEDED` | `DENY` | Maximum transactions per day limit reached. |
| `INVALID_REQUEST` | `DENY` | Request ID or agent ID mismatch / invalid. |

---

## 6. Example Payloads

### Example 1: Approved Payment
**Request**:
```http
POST /v1/authorize HTTP/1.1
Host: localhost:8081
Content-Type: application/json

{
  "request_id": "req_123",
  "agent_id": "research-agent",
  "recipient": "0x71C678d311516474809e39842c12f44b20a32508",
  "amount": "180000",
  "asset": "USDC",
  "purpose": "api_usage"
}
```

**Response (HTTP 200)**:
```json
{
  "request_id": "req_123",
  "decision": "ALLOW",
  "reason_code": "APPROVED",
  "reason": "Payment satisfies the configured policy."
}
```

### Example 2: Denied Payment (Exceeds Limit)
**Request**:
```http
POST /v1/authorize HTTP/1.1
Host: localhost:8081
Content-Type: application/json

{
  "request_id": "req_124",
  "agent_id": "research-agent",
  "recipient": "0x71C678d311516474809e39842c12f44b20a32508",
  "amount": "900000",
  "asset": "USDC",
  "purpose": "gpu_cluster_rental"
}
```

**Response (HTTP 200)**:
```json
{
  "request_id": "req_124",
  "decision": "DENY",
  "reason_code": "AMOUNT_EXCEEDS_TRANSACTION_LIMIT",
  "reason": "Payment exceeds the single-transaction spending limit."
}
```

### Example 3: Malformed Request (Invalid Amount)
**Request**:
```http
POST /v1/authorize HTTP/1.1
Host: localhost:8081
Content-Type: application/json

{
  "request_id": "req_125",
  "agent_id": "research-agent",
  "recipient": "0x71C678d311516474809e39842c12f44b20a32508",
  "amount": "1.5",
  "asset": "USDC",
  "purpose": "api_usage"
}
```

**Response (HTTP 400)**:
```json
{
  "error": "MALFORMED_AMOUNT",
  "message": "Field 'amount' must be an unsigned integer string in token base units. Got: '1.5'."
}
```
