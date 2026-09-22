# AgentPay Developer Quickstart: From Zero to First Payment

> **The AgentPay Thesis**: *"Give your AI agent controlled access to programmable payments."*
>
> Autonomous agents need to pay for compute, data, inference, and oracles. However, granting agents direct access to blockchain private keys, transaction signing, or arbitrary recipient addresses is an unacceptable financial and security hazard.
>
> AgentPay is the enterprise financial control plane: developers integrate programmable payments with a single SDK method call, while AgentPay enforces policy, limits, human approvals, treasury reservation, and Arc mainnet settlement.

---

## 1. What AgentPay Does

AgentPay removes the entire Web3 infrastructure burden from the developer:
- **No private keys**: Autonomous agents never store, manage, or access private keys.
- **No raw signing**: The agent cannot craft or sign raw transactions.
- **No arbitrary recipients**: Payments can only route to registered, verified service providers.
- **No contract calldata**: Agents request economic capabilities, not smart contract functions.
- **No gas or nonce management**: Nonce sequencing and gas sponsorship are handled by the control plane.
- **No AgentVault internals**: Safe vault interactions are executed deterministically on Arc.

---

## 2. Architecture & Execution Modes

```
+------------------+         +----------------------------+         +--------------------+
| Autonomous Agent | ------> | AgentPay Control Plane     | ------> | Arc Mainnet (5042) |
| (TS / Python)    |         | - API Key Auth & Isolation |         | - AgentVault       |
| - Discover       |         | - Deterministic Policy     |         | - USDC Settlement  |
| - Quote          |         | - Human Approval Gate      |         +--------------------+
| - Request Pay    |         | - Flight Recorder Trace    |
+------------------+         +----------------------------+
```

### Critical Mode Distinction
> [!IMPORTANT]
> - **SIMULATION**: Uses local or test gateway. Zero real USDC is transferred. No on-chain state is altered. Ideal for rapid iteration, agent benchmarking, and policy testing.
> - **LIVE ARC MAINNET**: Settles USDC on Arc Mainnet Chain ID 5042 via the deployed AgentVault contract. Requires operator-configured signer and deposited USDC treasury.

---

## 3. Prerequisites

- Node.js 18+ (for TypeScript / CLI) or Python 3.10+ (for Python SDK)
- An active AgentPay Gateway instance (`http://localhost:8080` for local dev or production URL)
- Organization API Key (`ap_live_...`)

---

## 4. Authentication & API Key Setup

API keys are scoped, hashed using SHA-256 upon creation, and never stored in plaintext.

Set your API key in the environment:
```bash
export AGENTPAY_API_KEY="ap_live_0123456789abcdef0123456789abcdef"
export AGENTPAY_BASE_URL="http://localhost:8080" # or production gateway
```

---

## 5. Install SDK

### TypeScript
```bash
npm install @agentpay/sdk
```

### Python
```bash
pip install agentpay
```

### CLI
```bash
npm install -g @agentpay/cli
```

---

## 6. Configure Client

### TypeScript
```typescript
import { AgentPay } from '@agentpay/sdk';

const client = new AgentPay({
  apiKey: process.env.AGENTPAY_API_KEY,
  baseUrl: process.env.AGENTPAY_BASE_URL || 'http://localhost:8080',
});
```

### Python
```python
import os
from agentpay import AgentPay

client = AgentPay(
    api_key=os.environ.get("AGENTPAY_API_KEY"),
    base_url=os.environ.get("AGENTPAY_BASE_URL", "http://localhost:8080"),
)
```

---

## 7. Discover Services

Autonomous agents discover approved service providers from the registry:

### TypeScript
```typescript
const services = await client.services.list({ enabled: true });
console.log(`Found ${services.length} approved services.`);
const service = services[0];
```

### Python
```python
services = client.services.list(enabled=True)
print(f"Found {len(services)} approved services.")
service = services[0]
```

---

## 8. Request a Price Quote

Quotes lock in exchange and pricing terms with an expiry timestamp:

### TypeScript
```typescript
const quote = await client.services.getQuote(service.id, {
  amount: "180000", // 0.18 USDC in micro-units (6 decimals)
  asset: "USDC",
});
console.log(`Received quote ${quote.quote_id} for ${quote.amount} micro-USDC.`);
```

### Python
```python
quote = client.services.quote(
    service_id=service["id"],
    amount="180000", # Safe string representation (never use floats)
    asset="USDC",
)
print(f"Received quote {quote['quote_id']} for {quote['amount']} micro-USDC.")
```

---

## 9. Request Programmable Payment

Create a Payment Intent bound to the quote and pass an **Idempotency Key**.

> [!TIP]
> **Idempotency Rule**: If you retry a payment request due to network timeouts, always reuse the identical `Idempotency-Key`. AgentPay guarantees that retries with the same key return the identical payment without duplicate billing. Submitting a different payload with an existing key produces an `IDEMPOTENCY_CONFLICT` (HTTP 409).

### TypeScript
```typescript
const payment = await client.payments.create(
  {
    agentId: 'agent_alpha',
    serviceId: quote.service_id,
    quoteId: quote.quote_id,
    amount: quote.amount,
    asset: 'USDC',
    purpose: 'Procure autonomous web research report',
  },
  { idempotencyKey: `run_${Date.now()}` }
);

console.log(`Payment Intent ID: ${payment.id}, Status: ${payment.status}`);
```

### Python
```python
import time

payment = client.payments.create(
    service_id=quote["service_id"],
    quote_id=quote["quote_id"],
    amount=quote["amount"],
    asset="USDC",
    purpose="Procure autonomous web research report",
    idempotency_key=f"run_{int(time.time() * 1000)}",
)

print(f"Payment Intent ID: {payment['id']}, Status: {payment['status']}")
```

---

## 10. Check Status & Polling

Payment statuses follow a deterministic state machine:
`CREATED` -> `AUTHORIZED` -> (`APPROVAL_REQUIRED` / `APPROVED`) -> `EXECUTING` -> `CONFIRMED`

### TypeScript
```typescript
// Instant check:
const detail = await client.payments.get(payment.id);

// Or safe polling helper with timeout:
const finalResult = await client.payments.waitForCompletion(payment.id, {
  timeoutMs: 15000,
  intervalMs: 1000,
});
console.log('Final status:', finalResult.intent.status);
```

### Python
```python
# Instant check:
detail = client.payments.get(payment["id"])

# Or safe polling:
final_result = client.payments.wait_for_completion(payment["id"], timeout_seconds=15)
print("Final status:", final_result["intent"]["status"])
```

---

## 11. Inspect Financial Flight Recorder Trace

Retrieve complete mathematical proof of policy evaluation, human review, and on-chain settlement:

### TypeScript
```typescript
const trace = await client.payments.trace(payment.id);
console.log(`Flight Recorder Trace: ${trace.trace_id}`);
console.log(`Execution Mode: ${trace.execution_mode}`);
trace.steps.forEach((step) => {
  console.log(`  [#${step.step_number}] ${step.type} -> ${step.status} (${step.actor})`);
});
```

### Python
```python
trace = client.payments.trace(payment["id"])
print(f"Flight Recorder Trace: {trace['trace_id']}")
for step in trace.get("steps", []):
    print(f"  [#{step['step_number']}] {step['type']} -> {step['status']}")
```

---

## 12. Webhook Configuration & Signature Verification

AgentPay delivers HMAC-SHA256 signed webhooks for payment events. Verify signatures with timing-safe helpers:

### TypeScript
```typescript
import { verifyWebhookSignature } from '@agentpay/sdk';

const isValid = verifyWebhookSignature(
  rawRequestBody,
  req.headers['agentpay-signature'],
  process.env.AGENTPAY_WEBHOOK_SECRET
);
if (!isValid) throw new Error('Unauthorized webhook delivery');
```

### Python
```python
from agentpay import verify_webhook

is_valid = verify_webhook(
    raw_request_body,
    request.headers.get("AgentPay-Signature"),
    os.environ.get("AGENTPAY_WEBHOOK_SECRET"),
)
if not is_valid:
    raise PermissionError("Unauthorized webhook delivery")
```

---

## 13. Troubleshooting & Common Errors

| Error Code | HTTP Status | Cause | Action |
|---|---|---|---|
| `AUTHENTICATION_FAILED` | 401 | Missing or invalid API key | Verify `AGENTPAY_API_KEY` header. |
| `POLICY_DENIED` | 400 | Exceeds transaction or daily limits | Check agent budget via `client.agents.get_budget(id)`. |
| `APPROVAL_REQUIRED` | 400 / 200 | Payment requires human sign-off | Direct operator to `/dashboard` or wait for resolution. |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key re-used with different params | Use a new key for a new request; reuse same key for retry. |
| `SERVICE_NOT_FOUND` | 404 | Service not approved or active | Verify service ID via `client.services.list()`. |
| `QUOTE_EXPIRED` | 400 | Quote TTL expired before submission | Request a fresh quote before payment creation. |

---

## Summary

With AgentPay, developers provide AI agents with autonomous economic agency while retaining 100% control over spending policies, approvals, and on-chain settlement.
