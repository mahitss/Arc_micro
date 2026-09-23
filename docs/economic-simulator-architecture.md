# AgentPay Economic Simulator & Digital Twin: System Architecture

**Document Version:** 1.0.0  
**Status:** Canonical Reference Architecture  
**Author:** Principal Systems Architect, AgentPay  
**Domain:** Autonomous Agent Economy & Virtual Digital Twin  

---

## 1. Executive Summary & Vision

AgentPay answers a fundamental question in autonomous finance before money moves:

> **"What will happen if this autonomous mission or multi-agent swarm runs?"**

In real-world blockchain and enterprise autonomous systems, executing arbitrary autonomous agent plans blindly is reckless. Autonomous agents can negotiate quotes, spawn sub-tasks, encounter downstream service failures, breach daily velocity ceilings, or request excessive treasury liquidity. 

The **AgentPay Economic Simulator & Digital Twin** provides an authoritative, deterministic execution preview of autonomous missions and multi-agent swarms **prior to real financial commitment**.

### Core Architecture Invariant:
```
┌─────────────────────────────────────────────────────────────┐
│                       CORE PRINCIPLE                        │
│                                                             │
│       SIMULATION USES THE SAME DECISION LOGIC AS            │
│                       PRODUCTION.                           │
│                                                             │
│             THE SIMULATOR MAY MODEL EXECUTION.              │
│            IT MUST NEVER PERFORM REAL EXECUTION.            │
└─────────────────────────────────────────────────────────────┘
```

The simulator models missions, agents, services, quotes, task graphs, parallel swarm execution, budgets, policies, risk scores, approval triggers, failures, dynamic recovery, and replanning. Crucially, **all decision logic is 100% identical to production** (invoking the production Rust policy engine, Kahn DAG validator, and deterministic risk scorer), but runs inside a sealed, immutable **Digital Twin Snapshot** with **zero live financial authority**.

---

## 2. System Architecture & Components

```
                          ┌────────────────────────┐
                          │ User / Autonomous SDK  │
                          └───────────┬────────────┘
                                      │
                         POST /v1/simulations
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │            Simulation Suite Handler             │
             │           (REST Control Plane Router)           │
             └───────┬─────────────────┬─────────────────┬─────┘
                     │                 │                 │
         Create / Run│     Counterfactual│      Monte Carlo│
                     ▼                 ▼                 ▼
          ┌─────────────────────┐  ┌──────────────┐  ┌─────────────┐
          │  Simulation Engine  │  │Counterfactual│  │ Monte Carlo │
          │(Swarm & Mission DAG)│  │    Engine    │  │   Engine    │
          └──────────┬──────────┘  └──────────────┘  └─────────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  Snapshot Manager   │ ── SHA-256 Fingerprint
          │ (Immutable Digital  │ ── Deep-Copied Services & Agents
          │    Twin Snapshot)   │ ── Zero Mutation of Live State
          └──────────┬──────────┘
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌──────────┐   ┌───────────┐   ┌───────────┐
│Production│   │ Production│   │   Kahn    │
│  Rust    │   │   Risk    │   │  Swarm    │
│  Policy  │   │  Engine   │   │Validator  │
└──────────┘   └───────────┘   └───────────┘
```

### Component Inventory & Responsibilities

1. **`SimulationSnapshot` (Digital Twin):**
   - Captures an immutable snapshot of all registered services, agent roles, capabilities, reputations, latency models, and spending policies.
   - Computes a cryptographic SHA-256 fingerprint (`CalculateVersion`).
   - Deep-clones all entities; modifications in simulation can never mutate live production databases or registries.

2. **`SimulationEngine`:**
   - Coordinates single-mission pipelines and multi-agent swarm DAGs (Researcher, Data Provider, Analyst, Verifier, Critic, Synthesizer).
   - Simulates quote negotiation, economic candidate selection, duration modeling, and payment intent sequencing.
   - Computes `ProjectedEconomics` and `WorstCaseExposure` derived from policy ceilings.
   - Records an immutable, append-only `SimulationTrace` where every event is tagged `is_projected: true`.

3. **`CounterfactualEngine`:**
   - Enables "What-If" analysis without touching original baseline simulation runs.
   - Models perturbations: service price surges (2x, 3x), budget cuts ($2 vs $10), provider failures, or policy changes.
   - Produces side-by-side comparative telemetry (`DeltaSpend`, `DeltaApprovals`, `RiskChange`).

4. **`MonteCarloEngine`:**
   - Executes $N$ deterministic seeded runs ($N = 50$ to $500$).
   - Returns statistical distributions: average spend, minimum, maximum, P50, P90, P95 tail exposure, and completion rate.
   - Distinctly labeled: `"MODELLED ESTIMATE"`.

5. **`ExecutionGate` (Phases 23 & 24):**
   - Strictly enforces the boundary between `ExecutionModeSimulation` and `ExecutionModeLive`.
   - Protects against stale execution: validates snapshot version and prices against live reality.
   - Re-runs policy and risk checks before generating a verified live execution payload.

---

## 3. Strict Boundary Invariants

Simulation mode enforces hard structural guarantees:

| Action | Simulation Mode | Live Mode |
|---|---|---|
| Sign Cryptographic Payloads | **HARD FAIL** | Permitted via HSM/Signer |
| Broadcast to Blockchain | **HARD FAIL** | Permitted via RPC Client |
| Debit/Credit AgentVault | **HARD FAIL** | Permitted on Settlement |
| Reserve Treasury Liquidity | **HARD FAIL** | Permitted via Treasury Service |
| Mutate Production DB | **HARD FAIL** | Permitted via SQL Repositories |
| Emit Financial Webhooks | **HARD FAIL** | Permitted via Webhook Dispatcher |

---

## 4. Deterministic Execution Model

To ensure reproducibility across multi-agent swarms and Monte Carlo simulations:
- Every simulation run records an explicit `seed: int64`.
- Random number generators (`math/rand`) are seeded deterministically with `rand.New(rand.NewSource(run.Seed))`.
- Given identical `(scenario, snapshot, seed)`, the simulator produces the **exact same execution trace, spend, approval triggers, and recovery path**.
