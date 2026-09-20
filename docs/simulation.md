# AgentPay — Simulation Mode & Dry-Run Engine

## 1. Overview

**Simulation Mode** allows developers, risk officers, and autonomous AI agents to test and evaluate economic behaviors without moving real USDC or broadcasting blockchain transactions to the Arc network.

Simulation answers the critical question:
> *"What WOULD happen if this agent attempted this payment right now?"*

---

## 2. Architectural Invariants

### 1. Zero On-Chain Execution
Simulations strictly **never sign or broadcast transactions** to the Arc network. No gas is consumed.

### 2. Zero Balance & State Mutation
Simulations strictly **never debit or reserve treasury balances**, never update daily spend counters, and never persist active payment intents to the database.

### 3. Authoritative Deterministic Evaluation
Simulations run through the **actual production Rust Policy Engine** (`POST /v1/simulate`), evaluate deterministic risk scoring rules, inspect real treasury balances, and calculate human approval thresholds.

---

## 3. Simulation Workflow

```
Developer / Agent Request
         ↓
POST /v1/simulations
         ↓
1. Service Registry Lookup (Validate service, pricing model, enabled status)
         ↓
2. Rust Policy Engine Simulation (/v1/simulate)
         ↓
3. Deterministic Risk Assessment (LOW / MEDIUM / HIGH)
         ↓
4. Approval Threshold Check (Auto-execution vs Human Approval)
         ↓
5. Treasury Feasibility Check (Compare on-chain balance to requested amount)
         ↓
Synthesized Simulation Response (Predicted Outcome)
```

---

## 4. Predicted Outcomes

| Outcome | Meaning | Conditions |
| :--- | :--- | :--- |
| **`WOULD_EXECUTE`** | Payment would automatically execute on Arc | Policy allows, risk is acceptable, within auto-execution limit, treasury has sufficient funds |
| **`APPROVAL_REQUIRED`** | Payment would pause for human approval | Amount exceeds agent auto-execution limit, or risk score requires secondary review |
| **`WOULD_DENY`** | Payment would be rejected immediately | Spending limit exceeded, unapproved service, blocked recipient, or agent paused |
| **`INSUFFICIENT_TREASURY`** | Payment cannot proceed due to treasury balance | Requested amount exceeds available vault liquidity |

---

## 5. Simulation API & SDK Usage

### HTTP API
```http
POST /v1/simulations
Content-Type: application/json

{
  "agent_id": "agent_research_01",
  "service_id": "research-api",
  "amount": "2500000",
  "asset": "USDC",
  "purpose": "Dry-run market telemetry check"
}
```

**Response**:
```json
{
  "simulation_id": "sim_7d8e9f0a",
  "predicted_outcome": "WOULD_EXECUTE",
  "policy_decision": "ALLOW",
  "risk_level": "LOW",
  "approval_required": false,
  "treasury_sufficient": true,
  "evaluated_at": "2026-09-20T23:15:00Z"
}
```

### TypeScript SDK
```typescript
const sim = await client.simulations.create({
  agent_id: 'agent_research_01',
  service_id: 'research-api',
  amount: '2500000',
  purpose: 'Dry-run market telemetry check',
});

console.log(`Predicted Outcome: ${sim.predicted_outcome}`);
console.log(`Policy Decision:   ${sim.policy_decision}`);
console.log(`Approval Required: ${sim.approval_required}`);
```

### Python SDK
```python
sim = client.simulations.create(
    agent_id="agent_research_01",
    service_id="research-api",
    amount="2500000",
    purpose="Dry-run market telemetry check",
)

print(f"Predicted Outcome: {sim['predicted_outcome']}")
```

### Developer CLI
```bash
agentpay simulate --agent agent_research_01 --service research-api --amount 2500000
```
