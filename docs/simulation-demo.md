# Canonical Simulation Scenarios & Demonstration Guide

This guide walks through the **7 Canonical Simulation Scenarios** implemented in the AgentPay Economic Simulator & Digital Twin. Each scenario demonstrates specific capabilities: autonomous DAG execution, adversary resilience, policy what-if comparisons, Monte Carlo risk analysis, and safe live conversion.

---

## Scenario 1: Multi-Step Agent Research Mission (Happy Path)

- **Objective:** Execute a standard 3-step research mission (Web Search &rarr; Document Synthesis &rarr; Executive Summary Generation).
- **Projected Spend:** $1.50 USDC
- **Worst-Case Exposure:** $1.65 USDC (includes 10% network volatility reserve)
- **Key Verification:** All 3 steps execute in topological order (Step 1 &rarr; Step 2 &rarr; Step 3). Zero failures injected. All policy rules pass with `ALLOW`.

### CLI Execution
```bash
agentpay simulate --scenario research_happy_path --seed 42
```

---

## Scenario 2: Service Outage with Automatic Fallback

- **Objective:** Verify autonomous economic recovery when a primary service provider fails.
- **Setup:** A `SERVICE_FAILURE` fault is injected into Step 2 (Primary Vision/OCR Service).
- **Observed Behavior:**
  1. Primary OCR service returns HTTP 500 equivalent.
  2. Simulator engages autonomous replanning logic.
  3. Simulator queries registry for secondary OCR provider meeting quality and price thresholds.
  4. Step 2 re-routes to `fallback-ocr-v2` at +$0.15 USDC price differential.
  5. Mission successfully reaches `COMPLETED` state.
- **Trace Event:** `simulation.recovery_projected` recorded with fallback service ID.

### CLI Execution
```bash
agentpay simulate --scenario ocr_fallback --inject-failure "step_2:SERVICE_FAILURE"
```

---

## Scenario 3: Malicious Price Hike Detection & Rejection

- **Objective:** Protect agent treasury against sudden adversarial price spikes.
- **Setup:** A rogue service provider attempts to increase its price 5x above historical moving average.
- **Observed Behavior:**
  1. Economic selection engine flags anomaly score: `98/100` (PRICE_SPIKE_ANOMALY).
  2. Policy engine triggers `HARD_DENY` on the step quote.
  3. Alternative reputable provider is selected without agent operator intervention.
  4. Final execution cost remains within initial budget bounds ($2.10 USDC).

---

## Scenario 4: Counterfactual Policy Comparison

- **Objective:** Compare the financial outcome of a mission under two different constitutional policies:
  - **Baseline:** Permissive Policy ($25.00 single payment ceiling, no external agent approval).
  - **Counterfactual:** Conservative Policy ($1.00 single payment ceiling, human approval required for external agents).
- **Result:**
  - Baseline: Completes autonomously with 0 approval pauses.
  - Counterfactual: Flags 2 steps requiring human-in-the-loop approval, projects +45 minute delay in completion time, prevents unauthorized external spend.

### CLI Execution
```bash
agentpay simulate counterfactual --baseline baseline_policy.json --candidate conservative_policy.json
```

---

## Scenario 5: Monte Carlo Latency & Price Volatility

- **Objective:** Run $N = 1,000$ deterministic seeded simulations across variable network latencies, quote drift, and probabilistic failure rates.
- **Output:**
  - **P50 Cost:** $1.42 USDC
  - **P90 Cost:** $1.78 USDC
  - **P95 Tail Exposure:** $1.94 USDC
  - **Completion Rate:** 99.4%
  - **Notice:** Explicitly marked `MODELLED ESTIMATE - NOT FINANCIAL ADVICE`.

---

## Scenario 6: Stale Simulation Revalidation Failure

- **Objective:** Demonstrate safety guarantees when live reality diverges from simulated snapshot.
- **Setup:**
  1. Simulation is executed against Digital Twin snapshot with $100.00 USDC treasury balance.
  2. An external transaction spends $95.00 USDC from the live vault.
  3. Operator attempts to trigger `ExecutePlan` for a $10.00 USDC mission plan.
- **Observed Behavior:**
  - `ExecutionGate` performs real-time reality check.
  - Detects that live balance ($5.00 USDC) is insufficient for worst-case exposure ($11.00 USDC).
  - Rejects execution with `409 Conflict: SIMULATION OUTDATED`.
  - Zero on-chain transactions or partial state changes occur.

---

## Scenario 7: Full 6-Agent Swarm Orchestration

- **Objective:** Model the entire Kahn DAG lifecycle for a 6-agent collaborative swarm:
  1. **Coordinator:** Decomposes objective and reserves task budgets.
  2. **Researcher:** Collects market data from external APIs.
  3. **Auditor:** Verifies computational integrity and price quotes.
  4. **Synthesizer:** Merges sub-agent outputs into unified deliverable.
  5. **Verifier:** Runs adversarial checks and invariant evaluations.
  6. **Publisher:** Prepares final artifact for on-chain settlement.
- **Projected Metrics:** Total spend $4.85 USDC, duration 1.4s (simulated), 6 concurrent nodes, zero deadlocks.
