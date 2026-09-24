# AgentPay Autonomous Economic Fabric v1.0 — Architecture Specification
**Document ID:** `docs/architecture-v1.md`  
**Classification:** Canonical Architecture Specification  
**Version:** v1.0  
**Authority:** Principal Engineer & CTO, AgentPay  
**Verification Date:** 2026-09-25  

---

## 1. System Vision & Product Thesis

AgentPay is the **Autonomous Economic Control Plane** designed to govern and settle autonomous economic operations between AI agents and service providers. 

The system operates under the single unifying product thesis:
```
AI REQUESTS
    ↓
AGENTPAY CONTROLS
    ↓
ARC SETTLES
```
And adheres to the ultimate invariant:
```
AUTONOMY MAY EXPAND.
FINANCIAL AUTHORITY MUST REMAIN BOUNDED.
```

---

## 2. Canonical Target Architecture

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

Supporting all layers:
    Event Bus | Audit Ledger | Observability | Durable Runtime |
    Operations OS | Control Tower | Simulation | Economic Memory
```

---

## 3. Layer-by-Layer Architectural Decomposition

### 3.1 External AI Agents & Protocol Layer
- **AgentPay Protocol v1**: Standards for capability discovery, quote requests, time-bound negotiation, SLA declaration, and cryptographic receipt verification.
- **Agent Network**: Registry of verified agents, public keys, domain scopes, and empirical trustworthiness scores.

### 3.2 Economic Fabric Layer
- **Autonomous Lifecycle**:
  `Objective → ObjectiveCompiler → ExecutionBlueprint → Simulation → Policy/Risk Evaluation → Execution Gate → Runtime → Observation → Outcome → Learning → Replanning`.
- **Marketplace**: Bounded discovery of competitive services and deterministic candidate selection.
- **Mission Engine**: Directed Acyclic Graph (DAG) task orchestration with bounded budgets and timeout limits.
- **Swarm Orchestrator**: Multi-agent collaborative swarms with specialized roles (Leader, Worker, Critic, Auditor) and consensus-driven output validation.

### 3.3 Economic Control Plane
- **Constitution**: Hierarchical authority tree: `GLOBAL → ORG → AGENT → MISSION → SWARM → TASK → PAYMENT`. Rules can only tighten, never loosen. `HARD_DENY` is absolute.
- **Policy Engine**: High-performance deterministic Rust engine evaluating limits, velocities, allowlists, and blocklists in <10 microseconds.
- **Risk Engine**: Multi-dimensional composite scoring evaluating anomaly deviation, counterparty concentration, and novel transaction patterns.
- **Approval Engine**: Escalation workflow generating two-person manual or multi-sig approval tickets with cryptographic TTL enforcement.
- **Clearinghouse**: Double-entry ledger calculating net multilateral obligations across complex multi-party trade cycles.
- **Treasury**: Multi-pool capital adequacy orchestrator preserving the non-negotiable safety buffer floor.

### 3.4 Financial Execution Gate
- **PaymentIntent**: The sole authorized financial state machine. Every movement of funds requires a PaymentIntent in state `AUTHORIZED` with an active `TreasuryReservation`.
- **Pre-Flight Barrier**: Re-validates current policy version, constitution hash, and recipient before signing.

### 3.5 Authorized Signer & Smart Contract Execution
- **Signer Boundary**: Isolated signer enforcing exact transaction bindings (Chain ID 5042, target AgentVault, exact USDC calldata, zero native gas currency value).
- **AgentVault.sol**: Arc L1/L2 smart contract enforcing on-chain spending limits, calendar-day spending windows, recipient allowlists, and reentrancy protection.
- **Arc Settlement**: Settlement in native USDC (`0x3600...0000`) on Arc Mainnet (Chain ID 5042).

---

## 4. Key Invariant Guarantees

1. **Zero Wallet Abstraction Bypass**: AI agents, missions, swarms, and marketplace algorithms never possess private keys or execute direct transactions (`INV-1`).
2. **Deterministic Precedence**: Server-controlled policies and constitutional hard denies always override model preferences or simulated outcomes (`INV-3`, `INV-46`).
3. **Idempotent Single Execution**: Financial effects cannot be duplicated across retries, worker restarts, or ambiguous blockchain confirmations (`INV-6`, `INV-113`).
4. **Strict Simulation Sandboxing**: Simulated executions operate under explicit simulation context and cannot broadcast on-chain (`INV-10`, `INV-107`).
5. **Fail-Closed Operations**: If database persistence, policy engines, or RPC endpoints are degraded, the system rejects payments rather than falling back to unverified defaults.
