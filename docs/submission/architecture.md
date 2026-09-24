# AgentPay v1.0 — Architecture Overview (Submission)
**Classification:** Product & Architectural Submission Document  
**Target System:** AgentPay Autonomous Economic Fabric v1.0  
**Thesis:** `AI REQUESTS → AGENTPAY CONTROLS → ARC SETTLES`  

---

## 1. High-Level System Architecture

AgentPay is the programmable financial control plane for autonomous AI agents. It connects external AI reasoning and autonomous workflows to on-chain financial settlement while ensuring that financial authority remains deterministic, auditable, and bounded.

```
                    ┌──────────────────────────┐
                    │   External AI Agents     │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   AgentPay Protocol      │
                    │   + Agent Network        │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   Economic Fabric        │
                    │                          │
                    │ Objective → Plan         │
                    │ → Simulate → Execute     │
                    │ → Observe → Adapt        │
                    └────────────┬─────────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               ▼                 ▼                 ▼
        Marketplace          Missions          Swarms
               │                 │                 │
               └─────────────────┼─────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Economic Control Plane   │
                    │                          │
                    │ Constitution             │
                    │ Policy                   │
                    │ Risk                     │
                    │ Approval                 │
                    │ Liquidity                │
                    │ Clearing                 │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Financial Execution Gate │
                    │                          │
                    │ PaymentIntent            │
                    │ Treasury Reservation     │
                    │ Settlement Router        │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Authorized Executor      │
                    │                          │
                    │ Go Gateway / Signer      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      AgentVault.sol      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │       ARC MAINNET        │
                    │       USDC SETTLEMENT    │
                    └──────────────────────────┘
```

---

## 2. Core Architectural Principles

1. **Decoupled Reasoning & Authority**: AI models reason about objectives and propose tasks; they never hold private keys or sign transactions.
2. **Deterministic Governance**: Off-chain policies evaluate in <10 microseconds using a pure Rust engine, enforcing hard limits, spending velocity, and allowlists.
3. **Double-Entry Clearing**: Obligations are netted across multi-party agent trade cycles before settlement, reducing gross transaction volume.
4. **On-Chain Enforcement**: `AgentVault.sol` acts as the final on-chain gate, verifying daily calendar spending allowances directly in EVM bytecode on Arc.
