# agentpay — Official Python SDK

The `agentpay` Python package is the official client library for giving autonomous AI agents programmable access to payments on Arc without exposing private keys or transaction signing credentials.

---

## Key Features

- 🔒 **Zero Private Keys**: Never handle private keys, nonces, or gas.
- 💰 **Safe Money Representation**: Strictly prevents floating-point rounding errors on currency.
- ⚡ **Autonomous Procurement**: Agents request economic capabilities, not smart contract calldata.
- 🛡️ **Policy Engine Enforcement**: Hard transaction limits and velocity throttles evaluated server-side.
- 🔁 **Built-in Idempotency**: Safe network retries using `idempotency_key`.
- 🛰️ **Flight Recorder Tracing**: Instant programmatic access to deterministic decision trails.
- 🔔 **Webhook Signature Verification**: Constant-time HMAC-SHA256 signature verification.

---

## Installation

```bash
pip install agentpay
```

---

## Quick Initialization

```python
import os
from agentpay import AgentPay

client = AgentPay(
    api_key=os.environ.get("AGENTPAY_API_KEY"),
    base_url=os.environ.get("AGENTPAY_BASE_URL", "http://localhost:8080"),
)
```

---

## Safe Money Invariant

> [!CAUTION]
> **Floating-Point Prohibited**: The Python SDK strictly forbids passing Python `float` values (e.g. `0.18`) to payment or quote methods to avoid precision loss. Always pass integer base units (micro-USDC: `180000` = 0.18 USDC), `Decimal`, or string representations.

---

## SDK Methods

### 1. Service Discovery & Quotes

```python
# List approved services
services = client.services.list(enabled=True)

# Request a price quote
quote = client.services.quote(
    service_id=services[0]["id"],
    amount="180000",
    asset="USDC",
)
```

### 2. Payments (`client.payments`)

#### Create a Payment Intent
```python
import time

payment = client.payments.create(
    service_id="web-research",
    quote_id=quote["quote_id"],
    amount="180000",
    asset="USDC",
    purpose="Autonomous research report procurement",
    idempotency_key=f"run_{int(time.time() * 1000)}",
)

print(f"Payment ID: {payment['id']}, Status: {payment['status']}")
```

#### Poll for Completion
```python
result = client.payments.wait_for_completion(
    payment["id"],
    timeout_seconds=30,
    interval_seconds=1.0,
)
```

### 3. Financial Flight Recorder Trace

Retrieve the complete step-by-step audit record:

```python
trace = client.payments.trace(payment["id"])
print(f"Trace ID: {trace['trace_id']}")
print(f"Execution Mode: {trace['execution_mode']}")
for step in trace.get("steps", []):
    print(f"  [#{step['step_number']}] {step['type']} -> {step['status']}")
```

### 4. Webhook Verification

Verify incoming webhook deliveries with HMAC-SHA256:

```python
from agentpay import verify_webhook

is_valid = verify_webhook(
    raw_payload_bytes,
    request.headers.get("AgentPay-Signature"),
    os.environ.get("AGENTPAY_WEBHOOK_SECRET"),
    tolerance_seconds=300,
)
```

---

## Error Handling

The Python SDK maps API errors into specialized exceptions:

```python
from agentpay import (
    AgentPayError,
    PolicyDeniedError,
    ApprovalRequiredError,
    AuthenticationError,
    ConflictError,
    NotFoundError,
    RateLimitedError,
)

try:
    payment = client.payments.create(...)
except PolicyDeniedError as e:
    print(f"Payment policy rejected: {e.message} (Reason: {e.reason})")
except ApprovalRequiredError as e:
    print(f"Human approval required: {e.message}")
except ConflictError as e:
    print(f"Idempotency conflict: {e.message}")
except AuthenticationError as e:
    print(f"Invalid API key: {e.message}")
except AgentPayError as e:
    print(f"AgentPay error [{e.code}] (HTTP {e.status_code}): {e.message}")
```
