# AgentPay: Programmable Financial Control Plane for Autonomous AI Agents

> **Arc Microgrant Submission — v1.0.0 Production Release**

---

## 1. What AgentPay Is

AgentPay is a programmable financial control plane that connects autonomous AI agent workflows to verifiable, on-chain USDC settlement on Arc. 

It allows autonomous multi-agent systems to discover services, negotiate contracts, plan execution graphs, and recover from runtime failures, while ensuring that agents never hold private keys, cannot alter payment destinations, cannot self-escalate budgets, and cannot bypass deterministic policy rules.

---

## 2. The Problem

AI agents are increasingly capable of autonomous planning and action. However, autonomous action creates a critical financial control problem:

1. **Unrestricted Authority Risks:** Giving an LLM or autonomous agent direct access to a crypto wallet or credit card exposes treasury capital to prompt injections, hallucinated transactions, and unrecoverable losses.
2. **Brittle Retries:** When a paid API or agent service fails mid-task, naive agent scripts either crash or blindly retry payments, double-spending funds without completing the mission.
3. **Lack of Verifiable Settlement:** Traditional payment rails lack the sub-second finality, micro-denomination efficiency, and smart contract escrow capabilities needed for high-frequency machine-to-machine transactions.

---

## 3. System Architecture

AgentPay enforces a strict tripartite separation of concerns:

```
┌────────────────────────────────────────────────────────┐
│                   AUTONOMOUS AGENTS                    │
│   (Discover, Negotiate, Plan DAGs, Recover Failures)   │
└──────────────────────────┬─────────────────────────────┘
                           │ Requests action (PaymentIntent)
                           ▼
┌────────────────────────────────────────────────────────┐
│                 AGENTPAY CONTROL PLANE                 │
│  - Rust Policy Engine (6.36µs deterministic checks)    │
│  - Autonomous Treasury (Double-entry reservations)     │
│  - Durable Runtime (Lease fencing, self-healing)       │
│  - Execution Gate (EIP-712 nonced transaction minting) │
└──────────────────────────┬─────────────────────────────┘
                           │ Authorized settlement instruction
                           ▼
┌────────────────────────────────────────────────────────┐
│                 ARC SETTLEMENT PLANE                   │
│  - Native USDC Micro-Payments (6 decimals)             │
│  - AgentVault Smart Contracts (Foundry audited)        │
│  - Layer-1 Consensus (Arc Mainnet Chain ID 5042)       │
└────────────────────────────────────────────────────────┘
```

Core components include:
- **Gateway Service (`services/gateway`):** High-throughput Go gateway orchestrating intent lifecycles, treasury reservations, and 4-way economic reconciliation.
- **Rust Policy Engine (`crates/policy-engine`):** Sub-10 microsecond rule engine evaluating allowlists, velocity controls, and budget envelopes.
- **AgentVault Smart Contracts (`contracts/`):** Solidity smart contracts managing pooled liquidity, time-locked escrows, and operator multi-sigs.
- **Web Control Tower (`apps/web`):** Full-stack operational dashboard providing live economic tracing, failure replay, and simulation digital twins.

---

## 4. The Autonomous Economy

Within AgentPay, the autonomous lifecycle operates through 12 formal stages:
1. **Objective:** Human operator sets task boundaries and maximum budget.
2. **Plan:** Primary planner synthesizes a directed acyclic graph (DAG) of specialized tasks.
3. **Simulate:** Digital Twin runs Monte Carlo scenarios to predict capital adequacy and latency.
4. **Discover:** Agents query machine-native service registries for matching capabilities.
5. **Negotiate:** Service quotes are deterministically matched against budget and SLA criteria.
6. **Execute:** Durable workers run distributed workloads with fenced leases.
7. **Fail:** Downstream crashes or timeouts are intercepted before money moves.
8. **Recover:** Replanner reroutes tasks to standby providers while preserving mission state.
9. **Control:** Policy engine and treasury verify allowlists and atomically lock liquidity.
10. **Settle:** Authorized value is submitted to Arc consensus or deterministic simulation.
11. **Verify:** Swarm Critic cryptographically verifies deliverable output via SHA-256 checksums.
12. **Learn:** Provider latency and reliability telemetry are recorded into economic memory.

---

## 5. Security Boundary & Invariants

AgentPay guarantees the following machine-checked invariants:

| Security Invariant | System Guarantee | Enforcement Mechanism |
|---|---|---|
| **Zero Private Keys** | Agents never hold, inspect, or manage private keys. | Execution Gate requires server-side signer or KMS. |
| **No Recipient Substitution** | Agents cannot redirect payouts to arbitrary addresses. | Strict allowlists & EIP-712 typed intent binding. |
| **Budget Non-Escalation** | Economic envelopes cannot be self-increased by agents. | Hard budget checks evaluated by Rust policy engine. |
| **Idempotency & Nonce Safety** | Retried operations cannot create duplicate payouts. | Unique idempotency keys and sequential nonces. |
| **Simulation Air-Gap** | Pre-flight simulations never broadcast on-chain transactions. | Strict dual-mode runtime boundary (INV-156). |
| **Bounded Delegation** | Sub-delegated swarms inherit parent budget constraints. | DAG depth limit of 4; cumulative budget checks. |

---

## 6. Arc Integration

AgentPay is built specifically for the **Arc Layer-1 blockchain ecosystem**:

- **Verified Network:** Arc Mainnet (`Chain ID 5042 / 0x13b2`)
- **Verified RPC:** `https://rpc.mainnet.arc.io` (Confirmed Block `#22,572,770`)
- **Native USDC Contract:** `0x3600000000000000000000000000000000000000`
- **AgentVault:** `0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852` (Local / Operator-Gated)
- **Reconciliation:** 4-Way exact reconciliation across Internal Ledger, Repository, AgentVault, and Arc blockchain state.

---

## 7. Flagship Demonstration

- **Scenario:** *"Autonomous Market Intelligence Mission"*
- **Demonstration Flow:**
  1. Operator enters research objective with a 25.00 USDC cap.
  2. Simulation verifies expected exposure (12.50 USDC) without broadcasting value.
  3. Swarm discovers and contracts primary provider (`agent_fast_infer`).
  4. Primary provider drops connection (injected heartbeat failure).
  5. System isolates failed provider, preserves the budget, and failovers to `agent_budget_ai`.
  6. Deliverable is verified, payout is evaluated in 6.36µs, and Arc settles authorized value.
- **Routes Available:**
  - Control Tower: `/control`
  - Arc Panel: `/arc`
  - Failure Replay: `/missions/msn_market_intel_01/replay`
  - Digital Twin Simulator: `/simulator`
  - Interactive Showcase: `/demo/economic-fabric`

---

## 8. Repository Structure

```
├── contracts/             # Foundry Solidity Smart Contracts (AgentVault, Escrow)
├── crates/                # Rust High-Performance Crates (policy-engine, simulation)
├── services/gateway/      # Go Microservices Gateway & Clearinghouse
├── packages/              # TypeScript & Python SDKs, Developer CLI
├── apps/web/              # Next.js 14 Web Control Tower & Demo Interfaces
└── docs/                  # Architectural Specs, Runbooks, and Verification Evidence
```

---

## 9. Known Limitations

- **Operator-Gated Live Broadcast:** Live on-chain mainnet broadcasts currently require manual operator multi-sig confirmation to protect treasury capital.
- **Relayer Gas Staking:** Relayer addresses require pre-funded Arc gas balances for high-frequency micro-batching.
- **Swarm DAG Depth:** Multi-agent delegation is currently bounded to a maximum depth of 4 levels to prevent runaway recursion.
