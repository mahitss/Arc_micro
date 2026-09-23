# AgentPay Economic Simulation: Concept, Philosophy & Lifecycle

## 1. What is Economic Simulation?

In classical software systems, a "dry run" validates schema formats or syntax. In AgentPay, an **Economic Simulation** answers a higher-order strategic and fiduciary question:

> **"If this autonomous agent or swarm executes its mission right now, how much USDC will it consume, which counterparties will it engage, what policies will be triggered, will human approval be required, and what is our maximum financial liability if everything goes wrong?"**

An autonomous mission is not a static script. It is an evolving graph of economic commitments:
1. An Orchestrator requests quotes from multiple service providers.
2. It negotiates prices and selects candidate counterparties.
3. It spawns parallel sub-tasks across research, data parsing, and consensus validation.
4. Downstream services may timeout or fail, triggering dynamic recovery to higher-cost alternatives.
5. Spend accumulates toward daily organization limits and transaction ceilings.

**The Economic Simulator models this entire dynamic journey deterministically, with zero financial exposure.**

---

## 2. Core Lifecycle: From Creation to Forecast

```
[ POST /v1/simulations ]
           │
           ▼
┌───────────────────────┐
│     STATE: CREATED    │ ── Snapshot captured & cryptographically fingerprinted
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│    STATE: PLANNING    │ ── Kahn DAG validated, tasks sequenced, dependencies mapped
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│    STATE: RUNNING     │ ── Policy evaluated, risk scored, failure injected, recovery modeled
└──────────┬────────────┘
           │
     ┌─────┴──────────────┐
     ▼                    ▼
┌──────────────┐   ┌──────────────┐
│  COMPLETED   │   │    FAILED    │
│  (Forecast   │   │ (Budget/hard │
│    Ready)    │   │policy breach)│
└──────────────┘   └──────────────┘
```

### Lifecycle Phases:
1. **Creation:** A client submits a `SimulationScenario` specifying budget, deadlines, and optional failure injection profiles. A Digital Twin snapshot is frozen.
2. **Planning:** Single-agent pipelines or multi-agent swarms are mapped into deterministic task DAGs.
3. **Evaluation:** Every planned payment step is submitted to the **production Rust policy client** and risk assessment engine.
4. **Failure & Recovery:** Injected or stochastic failures trigger the replanning engine, discovering alternative candidate counterparties and computing variance in latency and cost.
5. **Outcome:** A comprehensive `SimulationRun` is generated containing `ProjectedEconomics`, `WorstCaseExposure`, `SimulationExecutionPlan`, and `SimulationTrace`.

---

## 3. Projected Economics vs. Historical Fact

All data produced by the simulation engine is strictly labeled:
- `is_projected: true`
- `model_notice: "MODELLED ESTIMATE: Deterministic simulation projection only, not actual financial history."`
- Telemetry tags: `SIMULATION` / `PROJECTED`.

Under no circumstances does AgentPay present simulated figures as historical accounting ledger records.
