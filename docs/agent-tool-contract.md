# AgentPay Agent Framework Tool Contract

> **Core Security Invariant**: *The agent operates strictly through high-level economic abstractions. The agent is untrusted and must NEVER possess blockchain private keys, signing authority, or arbitrary execution tools.*

---

## 1. Allowed vs. Forbidden Tool Matrix

| Concept | Status | Rationale |
|---|---|---|
| `discover_services` | **ALLOWED** | Read-only discovery of verified services from the organization registry. |
| `get_quote` | **ALLOWED** | Fetches time-bound pricing terms and bound quote IDs. |
| `get_budget` | **ALLOWED** | Read-only check of the agent's remaining daily spending limit. |
| `request_payment` | **ALLOWED** | Submits a structured payment intent to the AgentPay policy engine. |
| `get_payment_status` | **ALLOWED** | Observes authorization, human approval, and settlement status. |
| `get_payment_trace` | **ALLOWED** | Inspects immutable Flight Recorder decision and audit trail. |
| `send_raw_transaction` | **FORBIDDEN** | Bypasses the financial control plane. |
| `sign_transaction` | **FORBIDDEN** | Private keys must remain strictly air-gapped from LLM runtimes. |
| `set_recipient` | **FORBIDDEN** | Prevents prompt injection attacks that alter payment destinations. |
| `set_policy` | **FORBIDDEN** | Financial governance rules are owned by organization controllers. |
| `approve_payment_as_self`| **FORBIDDEN** | Prevents compromised agents from circumventing human-in-the-loop limits. |
| `execute_contract` | **FORBIDDEN** | Arbitrary calldata execution is strictly prohibited. |
| `withdraw_vault` | **FORBIDDEN** | Vault treasury withdrawals require multi-sig corporate controllers. |

---

## 2. Tool Specifications for Agent Frameworks

These schemas are designed for direct inclusion in OpenAI Tools, Anthropic Claude Tool Calling, LangChain, and Model Context Protocol (MCP) servers.

### 1. `discover_services`
```json
{
  "name": "discover_services",
  "description": "Discover approved external commercial services that this agent is authorized to pay for.",
  "parameters": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "enum": ["RESEARCH", "DATA", "COMPUTE", "ORACLE", "AI_MODELS"],
        "description": "Optional category filter."
      }
    }
  }
}
```

### 2. `get_quote`
```json
{
  "name": "get_quote",
  "description": "Obtain a time-bound price quote from an approved service provider before requesting payment.",
  "parameters": {
    "type": "object",
    "properties": {
      "service_id": {
        "type": "string",
        "description": "Unique identifier of the registered service (e.g. 'web-research')."
      },
      "amount": {
        "type": "string",
        "description": "Requested amount in micro-USDC base units (e.g. '180000' for 0.18 USDC)."
      },
      "asset": {
        "type": "string",
        "default": "USDC",
        "description": "Payment currency asset."
      }
    },
    "required": ["service_id"]
  }
}
```

### 3. `get_budget`
```json
{
  "name": "get_budget",
  "description": "Check the agent's current spending limits, daily budget, and remaining allowance.",
  "parameters": {
    "type": "object",
    "properties": {
      "agent_id": {
        "type": "string",
        "description": "Agent identifier."
      }
    },
    "required": ["agent_id"]
  }
}
```

### 4. `request_payment`
```json
{
  "name": "request_payment",
  "description": "Request authorization and execution of an approved commercial payment.",
  "parameters": {
    "type": "object",
    "properties": {
      "service_id": {
        "type": "string",
        "description": "Approved service identifier."
      },
      "quote_id": {
        "type": "string",
        "description": "Active quote identifier received from get_quote."
      },
      "amount": {
        "type": "string",
        "description": "Amount in integer base units (micro-USDC: 6 decimals). Never use floating point."
      },
      "asset": {
        "type": "string",
        "default": "USDC",
        "description": "Currency asset."
      },
      "purpose": {
        "type": "string",
        "description": "Clear justification for why this payment is required for the agent's task."
      },
      "idempotency_key": {
        "type": "string",
        "description": "Unique idempotency key to prevent double charging on retry."
      }
    },
    "required": ["service_id", "amount", "purpose", "idempotency_key"]
  }
}
```

### 5. `get_payment_status`
```json
{
  "name": "get_payment_status",
  "description": "Query the current status of a payment intent.",
  "parameters": {
    "type": "object",
    "properties": {
      "payment_id": {
        "type": "string",
        "description": "Payment intent ID returned by request_payment."
      }
    },
    "required": ["payment_id"]
  }
}
```

### 6. `get_payment_trace`
```json
{
  "name": "get_payment_trace",
  "description": "Retrieve the deterministic Financial Flight Recorder audit trail for a payment.",
  "parameters": {
    "type": "object",
    "properties": {
      "payment_id": {
        "type": "string",
        "description": "Payment intent ID."
      }
    },
    "required": ["payment_id"]
  }
}
```

---

## 3. Defense Against Autonomous Prompt Injection

Even if an autonomous LLM agent is completely compromised via prompt injection or jailbreaking:
1. **Recipient Integrity**: The agent *cannot* specify a recipient address. AgentPay strictly resolves the recipient from the verified service registry.
2. **Deterministic Limits**: The Policy Engine rejects any payment exceeding transaction or daily velocity caps regardless of agent persuasion.
3. **Air-Gapped Vault**: The agent possesses zero capability to sign transactions or withdraw from `AgentVault.sol`.
