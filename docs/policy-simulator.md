# AgentPay Policy Simulator

## 1. Overview

The **Policy Simulator** allows developers, financial controllers, and autonomous agents to test hypothetical payment requests against deterministic policies and risk models **without executing transactions, mutating budgets, or moving funds**.

### Key Invariants
- **Side-Effect-Free**: Zero database writes, zero counter mutation (`daily_spent` remains unchanged), zero blockchain transactions.
- **Explicit Flag**: All simulator responses return `"simulation": true`.
- **Identical Evaluation**: The simulation pipeline executes the identical deterministic authorization and risk checks as the live pipeline.

---

## 2. HTTP API Endpoint

### `POST /v1/simulate`

Evaluates a hypothetical payment request.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "request_id": "sim_req_001",
  "agent_id": "research-agent",
  "service_id": "web-research",
  "recipient": "0x71c678d311516474809e39842c12f44b20a32508",
  "amount": "150000",
  "asset": "USDC",
  "purpose": "Simulate web search payment",
  "risk_context": {
    "recipient_prior_tx_count": 10,
    "service_prior_tx_count": 5,
    "recent_failures_count": 0,
    "recent_15m_tx_count": 1
  }
}
```

#### Response Body (HTTP 200 OK)
```json
{
  "request_id": "sim_req_001",
  "decision": "ALLOW",
  "reason_code": "APPROVED",
  "reason": "Payment satisfies the configured policy.",
  "policy_id": "pol_demo_research",
  "risk_level": "LOW",
  "risk_score": 0,
  "checks": [
    {
      "rule": "policy_enabled",
      "passed": true,
      "message": "Policy is active and unpaused."
    },
    {
      "rule": "valid_amount",
      "passed": true,
      "message": "Amount 150000 is positive base units."
    },
    {
      "rule": "allowed_asset",
      "passed": true,
      "message": "Asset 'USDC' is authorized."
    },
    {
      "rule": "recipient_blocked",
      "passed": true,
      "message": "Recipient is not blacklisted."
    },
    {
      "rule": "recipient_allowed",
      "passed": true,
      "message": "Recipient is permitted by policy."
    },
    {
      "rule": "per_transaction_limit",
      "passed": true,
      "message": "Amount 150000 is within per-transaction limit."
    },
    {
      "rule": "daily_spending_limit",
      "passed": true,
      "message": "Daily spending 150000/5000000 within budget."
    },
    {
      "rule": "risk_budget_utilization",
      "passed": true,
      "message": "Budget utilization risk score: +0 pts"
    },
    {
      "rule": "approval_threshold",
      "passed": true,
      "message": "Amount is below approval threshold."
    }
  ],
  "remaining_daily_limit": 4850000,
  "simulation": true
}
```

---

## 3. Developer & Agent Integration

Autonomous agents can use the simulator before initiating expensive multi-step workflows:
1. **Pre-Flight Validation**: Test whether a sequence of planned micro-payments fits within the agent's remaining daily allowance.
2. **Step-Down Mitigation**: If a simulation returns `APPROVAL_REQUIRED` due to amount proximity or risk heuristics, the agent can adjust its batch size or request human approval upfront.
