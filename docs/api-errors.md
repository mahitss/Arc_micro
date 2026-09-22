# AgentPay API Error Model

AgentPay uses standard HTTP status codes and a consistent JSON error envelope for all error responses across both the Gateway API and the TypeScript SDK.

---

## Error Envelope Format

All 4xx and 5xx responses return a structured JSON payload:

```json
{
  "error": {
    "code": "POLICY_DENIED",
    "message": "Payment exceeds the agent's daily spending limit ($5.00 USDC).",
    "request_id": "req_88df29865148066c"
  }
}
```

In addition, the `X-Request-ID` response header always matches the `request_id` field in the payload, allowing end-to-end correlation across logs and audit events.

Stack traces and internal system details are **NEVER** exposed to clients.

---

## Standard Error Codes

| HTTP Status | Error Code | Description | Client Action |
| :--- | :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_REQUEST` | Missing or invalid request parameters (e.g. invalid amount, unsupported asset). | Fix payload fields and retry. |
| `400 Bad Request` | `POLICY_DENIED` | Deterministic policy rejected the payment (limit exceeded, unapproved recipient). | Do NOT retry blindly. Inspect policy limits. |
| `401 Unauthorized` | `UNAUTHORIZED` | API key is missing, invalid, expired, or revoked. | Provide a valid active API key in `Authorization` header. |
| `403 Forbidden` | `FORBIDDEN` | API key lacks required scope, or emergency controls blocked operation. | Request elevated scope or wait for emergency unpause. |
| `404 Not Found` | `NOT_FOUND` | Resource (intent, agent, service, approval) not found or belongs to another organization. | Verify resource ID and organization context. |
| `409 Conflict` | `IDEMPOTENCY_CONFLICT` | A request with the same idempotency key is currently in-flight with different parameters. | Retry with consistent parameters or generate a new key. |
| `429 Too Many Requests` | `RATE_LIMITED` | Gateway rate limit exceeded. | Back off exponentially and retry. |
| `502 Bad Gateway` | `EXECUTION_UNAVAILABLE` | Blockchain node or RPC settlement layer is temporarily unreachable. | Check Arc RPC connectivity; transaction is safe in gateway state machine. |
| `504 Gateway Timeout` | `POLICY_ENGINE_TIMEOUT` | Rust Policy Engine did not respond within configured deadline (default: 2000ms). | Retry with identical `Idempotency-Key`. |
| `500 Internal Error` | `INTERNAL_ERROR` | Unexpected internal server error. | Contact AgentPay support with `request_id`. |

---

## TypeScript SDK Mapping

The `@agentpay/sdk` automatically translates these error responses into typed JavaScript/TypeScript exceptions:

```typescript
import {
  AgentPayError,
  PolicyDeniedError,
  ApprovalRequiredError,
  UnauthorizedError,
  NotFoundError,
  RateLimitError,
} from '@agentpay/sdk';

try {
  const payment = await agentpay.paymentIntents.create({ ... });
} catch (error) {
  if (error instanceof PolicyDeniedError) {
    console.error(`Policy rejected payment: ${error.message} (Trace: ${error.requestId})`);
  } else if (error instanceof ApprovalRequiredError) {
    console.log(`Payment queued for human approval: ${error.intentId}`);
  } else if (error instanceof UnauthorizedError) {
    console.error('Invalid or revoked API key.');
  } else if (error instanceof RateLimitError) {
    console.warn('Rate limit reached; backing off...');
  } else if (error instanceof AgentPayError) {
    console.error(`AgentPay error [${error.code}]: ${error.message}`);
  }
}
```

---

## Python SDK Mapping

The `agentpay` Python SDK similarly maps API errors into typed Python exceptions:

```python
from agentpay import (
    AgentPay,
    AgentPayError,
    PolicyDeniedError,
    ApprovalRequiredError,
    AuthenticationError,
    NotFoundError,
    RateLimitedError,
    ConflictError,
)

try:
    payment = client.payments.create(...)
except PolicyDeniedError as e:
    print(f"Policy denied: {e.message} (Reason: {e.reason})")
except ApprovalRequiredError as e:
    print(f"Approval required: {e.message}")
except ConflictError as e:
    print(f"Idempotency conflict: {e.message}")
except AuthenticationError as e:
    print(f"Invalid credentials: {e.message}")
except AgentPayError as e:
    print(f"AgentPay API error [{e.code}] (HTTP {e.status_code}): {e.message}")
```
