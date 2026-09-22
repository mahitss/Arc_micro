# AgentPay Python SDK

Official Python client library for **AgentPay** — the programmable financial control plane for AI agents on Arc.

## Overview
AgentPay allows autonomous agents to safely discover services, request quotes, and trigger programmable payments governed by deterministic spending policies and human approvals without ever handling blockchain private keys.

## Installation
```bash
pip install agentpay
```

## Quickstart
```python
from agentpay import AgentPay

client = AgentPay(api_key="ap_live_...")

# 1. Discover approved services
services = client.services.list(enabled=True)

# 2. Get price quote
quote = client.services.quote(service_id=services[0]["id"], amount="180000")

# 3. Create payment intent
payment = client.payments.create(
    service_id=quote["service_id"],
    quote_id=quote["quote_id"],
    amount=quote["amount"],
    asset="USDC",
    purpose="Autonomous research task",
    idempotency_key="task_run_123",
)

# 4. Inspect flight recorder trace
trace = client.payments.trace(payment["id"])
print(f"Status: {trace['status']}, Mode: {trace['execution_mode']}")
```

## Security Invariants
- **Zero Private Keys**: Agents cannot sign raw transactions or manage gas.
- **Safe Money Representation**: Float amounts are rejected; always use integer base units (micro-USDC: 6 decimals), Decimal, or strings.
