# Economic Authority Boundary & Financial Safeguards

## 1. The Autonomous Authority Boundary

AgentPay establishes a non-bypassable architectural barrier between autonomous operational action and deterministic financial authority:

```
┌────────────────────────────────────────────────────────┐
│               AUTONOMOUS SYSTEM REALM                  │
│                                                        │
│  - Task DAG Generation                                │
│  - Provider Discovery & Negotiation                   │
│  - Worker Scheduling & Concurrency Scaling            │
│  - Self-Healing Retries & Checkpoint Recovery         │
│  - Bounded Replanning & Provider Substitution         │
│                                                        │
│               NON-FINANCIAL & PROPOSAL                 │
└──────────────────────────┬─────────────────────────────┘
                           │
             POLICY & RISK GATEWAY (Rust)
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             DETERMINISTIC FINANCIAL REALM              │
│                                                        │
│  - Policy Verification (PolicyEngine / Rust)          │
│  - Multi-Sig Approvals (Human Signature Required)     │
│  - Treasury Encumbrance (TreasuryLedger)              │
│  - Clearinghouse Netting & Settlement Batches         │
│  - Keyless On-Chain Execution (AgentVault / Arc)      │
│                                                        │
│            DETERMINISTIC FINANCIAL CONTROL            │
└────────────────────────────────────────────────────────┘
```

---

## 2. Action Classification Hierarchy

Every action across the fabric is classified into one of five distinct categories:

1. **`NON_FINANCIAL`**: Compute operations, workflow step scheduling, health checks, log aggregation.
2. **`FINANCIAL_READ`**: Inquiring account balances, reading quotes, inspecting treasury state, reviewing invoices.
3. **`FINANCIAL_PROPOSAL`**: Compiling a draft blueprint, requesting a quote, proposing an operational budget allocation.
4. **`FINANCIAL_AUTHORIZED`**: Cryptographically approved payment intent with locked treasury reservation.
5. **`FINANCIAL_EXECUTION`**: Transacting with AgentVault on Arc blockchain (Chain ID 5042).

### Enforced Rule:
The Autonomous Fabric can operate only in `NON_FINANCIAL`, `FINANCIAL_READ`, and `FINANCIAL_PROPOSAL`.
It can **never** elevate a proposal into `FINANCIAL_AUTHORIZED` or `FINANCIAL_EXECUTION` without the independent, deterministic approval of the Policy Engine and Treasury Ledger (`INV-141`).

---

## 3. Immutable Envelope Protections

- **`EconomicEnvelope`**: Bounded spending limit. Can never self-increase (`INV-148`).
- **`RiskEnvelope`**: Risk tolerance ceiling. Can never weaken constitutional thresholds (`INV-149`).
- **`ResourceEnvelope`**: Compute concurrency limit. Operational compute authority can never confer financial spending authority (`INV-150`).
- **Zero Private Key Access**: No agent, model, or fabric service holds private keys or calldata signing rights.
