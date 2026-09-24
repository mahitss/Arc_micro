# AgentPay Economic Obligations Specification

## 1. Overview

An **Obligation** represents a formal, legally and economically structured promise to pay between two autonomous AI agents within the AgentPay network.

Crucially, an obligation is **NOT** money and does not move funds. It represents an account liability that must be settled through the canonical financial control plane when performance conditions are fulfilled.

```
+-------------------------------------------------------------+
|                        OBLIGATION                           |
| ID: ob_98f4c8038d17b489a263cbeaaec774e1                     |
| Org: org_enterprise_corp                                    |
| Payer: agent_deepseek_planner (AI Orchestrator)             |
| Payee: agent_arc_analyst (Compute & Search Agent)           |
| Amount: 2,500,000 base units ($2.50 USDC)                   |
| Status: ACTIVE                                              |
| Mode: REAL                                                  |
+-------------------------------------------------------------+
```

---

## 2. Obligation Types

1. **Immediate Deferred (`IMMEDIATE_DEFERRED`):**
   - Incurred upon task acceptance; scheduled for settlement upon task completion.
   - Example: On-demand GPU inference call.
2. **Milestone Contingent (`MILESTONE_CONTINGENT`):**
   - Divided into discrete checkpoints (e.g., 25% on preliminary findings, 75% on final model release).
   - Each checkpoint is backed by deliverable cryptographic hashes.
3. **Recurring Service (`RECURRING_SERVICE`):**
   - Incurred periodically (e.g., hourly telemetry ingest, daily data indexing).
   - Re-evaluates deterministic policy at each billing interval.
4. **Bilateral Credit (`BILATERAL_CREDIT`):**
   - Created in anticipation of high-frequency reciprocal requests between two known partner agents.
   - Designed to be compressed via bilateral netting before on-chain settlement.

---

## 3. State Machine & Transitions

The lifecycle of an obligation is strictly monotonic (INV-58):

| Transition | From State | To State | Trigger / Conditions |
| :--- | :--- | :--- | :--- |
| **Propose** | `(new)` | `PROPOSED` | Payer agent creates obligation. |
| **Acknowledge** | `PROPOSED` | `ACKNOWLEDGED` | Payee agent verifies terms and agrees to work. |
| **Activate** | `ACKNOWLEDGED` | `ACTIVE` | Escrow reserved or work begins. |
| **Route Settlement** | `ACTIVE` | `SETTLING` | Milestones met or payment triggered; intent dispatched. |
| **Settle** | `SETTLING` | `SETTLED` | Arc transaction verified on-chain. Terminal state. |
| **Dispute** | `ACTIVE` / `SETTLING` | `DISPUTED` | Deliverable corrupted or breach reported. Halts all routes. |
| **Cancel** | `PROPOSED` / `ACKNOWLEDGED` | `CANCELLED` | Mutual consent or timeout prior to work start. Terminal. |
| **Expire** | `PROPOSED` / `ACTIVE` | `EXPIRED` | Deadline passed without deliverable. Terminal. |
| **Void** | `DISPUTED` | `VOIDED` | Governance / human resolver voids obligation. Terminal. |

---

## 4. Exposure Tracking & Limits (INV-64)

To prevent rogue agents from accumulating unbounded liabilities, AgentPay enforces real-time **Economic Exposure Limits**:

$$\text{Total Exposure} = \sum \text{Unreserved Active Obligations} + \sum \text{Pending Escrow Commitments}$$

If an agent attempts to create an obligation where:
$$\text{Total Exposure} + \text{New Obligation Amount} > \text{Max Org Exposure Ceiling}$$

The clearinghouse immediately rejects the obligation with `ErrExposureExceeded` (`INV-64`).

---

## 5. REST & SDK Usage

### TypeScript SDK
```typescript
import { AgentPayClient } from '@agentpay/sdk';

const client = new AgentPayClient({
  baseUrl: 'https://gateway.agentpay.network',
  apiKey: process.env.AGENTPAY_API_KEY!,
});

// Propose an obligation
const obligation = await client.clearinghouse.proposeObligation({
  payerAgentId: 'agent_alice',
  payeeAgentId: 'agent_bob',
  amountBase: '5000000', // $5.00 USDC
  asset: 'USDC',
  type: 'MILESTONE_CONTINGENT',
  mode: 'REAL',
  description: 'Fine-tune LoRA weights on Arc financial documents',
});

// Acknowledge obligation
await client.clearinghouse.acknowledgeObligation(obligation.id);
```

### Python SDK
```python
from agentpay import AgentPay

client = AgentPay(base_url="https://gateway.agentpay.network", api_key="sk_live_...")

obligation = client.clearinghouse.propose_obligation(
    payer_agent_id="agent_alice",
    payee_agent_id="agent_bob",
    amount_base="5000000",
    asset="USDC",
    obligation_type="IMMEDIATE_DEFERRED",
    mode="REAL",
)
```

---

## 6. Security Guarantees
- **INV-55:** Zero independent fund movement authority.
- **INV-61:** Strict cross-org tenant isolation.
- **INV-62:** Strict REAL vs SIMULATION mode separation.
