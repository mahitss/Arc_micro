# AgentPay Autonomous Agent Tool Interface & Permissions (Day 4)

## 1. Overview

AgentPay exposes a **strictly narrowed tool interface** to autonomous AI agents. Rather than providing agents with broad wallet, signing, or blockchain RPC tools, AgentPay restricts agent capabilities to 4 specific economic and task tools.

---

## 2. Tool Permission Whitelist

| Tool Name | Permission Granted | Description |
|---|---|---|
| `search_service` | **ALLOWED** | Discovers approved commercial services from the Service Registry |
| `request_payment` | **ALLOWED** | Proposes a payment intent subject to deterministic policy & risk checks |
| `check_payment` | **ALLOWED** | Inspects payment intent status during approval or execution |
| `continue_task` | **ALLOWED** | Fetches commercial data payload after payment confirmation |

### Explicitly Forbidden Tool Actions

The agent does **NOT** receive:
- `execute_transaction` — Transactions can only be signed and broadcast by the trusted backend.
- `sign_transaction` — Private keys are strictly air-gapped from the agent runtime.
- `withdraw` — Fund custody is governed exclusively by `AgentVault.sol` contract logic.
- `update_policy` — Policies are configured by human financial controllers.
- `update_service` — Services are registered and verified by organization administrators.
- `change_recipient` — Recipients are resolved server-side; agents cannot substitute addresses.
- `approve_payment` — AI agents cannot approve their own payments.

---

## 3. Tool Schemas & Contracts

### 1. `search_service`

**Purpose**: Discovers approved services matching a query.

**Input Schema**:
```json
{
  "query": "compute" // Optional filter string
}
```

**Output Schema**:
```json
[
  {
    "id": "compute-cluster",
    "name": "GPU Inference Compute Cluster",
    "asset": "USDC",
    "max_price": "2000000",
    "enabled": true
  }
]
```

---

### 2. `request_payment`

**Purpose**: Proposes an economic payment intent for a registered service.

**Input Schema**:
```json
{
  "service_id": "web-research",
  "amount": "180000",         // Integer base units (micro-USDC, 6 decimals). NO FLOATS.
  "asset": "USDC",            // Must be "USDC"
  "purpose": "api_usage",
  "justification": "Retrieve 2026 AI compute benchmark data"
}
```

**Output Schema**:
```json
{
  "payment_intent_id": "intent_8f29e1a0b3c4d5e6",
  "status": "AUTHORIZED",      // or "APPROVAL_REQUIRED", "DENIED"
  "decision": "ALLOW",         // or "APPROVAL_REQUIRED", "DENY"
  "reason": "Payment satisfies the configured policy.",
  "risk_score": 15,
  "risk_level": "LOW",
  "requires_approval": false,
  "transaction_hash": "0x7777...7777"
}
```

---

### 3. `check_payment`

**Purpose**: Polls payment intent status when in `WAITING_FOR_APPROVAL` or `WAITING_FOR_PAYMENT`.

**Input Schema**:
```json
{
  "payment_intent_id": "intent_8f29e1a0b3c4d5e6"
}
```

**Output Schema**:
```json
{
  "payment_intent_id": "intent_8f29e1a0b3c4d5e6",
  "status": "APPROVED",        // or "CONFIRMED", "REJECTED", "EXPIRED"
  "transaction_hash": "0x7777...7777"
}
```

---

### 4. `continue_task`

**Purpose**: Fetches the commercial data payload from the external service provider using the confirmed intent.

**Input Schema**:
```json
{
  "payment_intent_id": "intent_8f29e1a0b3c4d5e6",
  "service_id": "web-research",
  "task_context": "Research compute pricing"
}
```

**Output Schema**:
```json
{
  "service_id": "web-research",
  "payment_intent_id": "intent_8f29e1a0b3c4d5e6",
  "raw_content": "{...}",
  "is_mock": true,
  "source": "MockProvider[web-research]"
}
```
*Note: Output is wrapped in `UntrustedExternalData` and treated purely as content to summarize.*
