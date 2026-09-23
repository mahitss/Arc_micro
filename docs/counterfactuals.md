# AgentPay Counterfactuals & Economic Monte Carlo

## 1. The Power of "What-If" Analysis

Autonomous agent missions operate in non-deterministic, adversarial, and shifting market environments. A mission that succeeds under normal conditions might fail catastrophically if:
- Primary data providers experience an outage
- Compute prices surge 3x due to datacenter congestion
- Treasury allocations are tightened from $10.00 to $2.00
- A provider delivers low-quality or corrupt payloads

The **Counterfactual Engine** enables risk engineers, developers, and autonomous systems to ask:

> *"What happens if service prices double?"*  
> *"What happens if DataAgent times out?"*  
> *"What happens if we lower our human approval threshold to $1.00?"*

---

## 2. Baseline vs. Counterfactual Architecture

A Counterfactual perturbation **never mutates the baseline simulation run**.

```
[ Baseline Simulation Run ] (ID: sim_base_01)
     │
     ├── Economics: Projected Spend $1.90, Approvals: 0, Risk: 16/100
     │
     ▼
[ Apply Perturbation: 2.0x Price Multiplier ]
     │
     ├── Clones Snapshot & Overlays Modifiers
     ├── Executes Isolated Comparative Run (ID: sim_cf_02)
     │
     ▼
[ Side-by-Side Counterfactual Comparison ]
     ├── Delta Spend:     +$1.90 USDC
     ├── Delta Approvals: +1 (Approval required due to step cost > threshold)
     ├── Risk Change:     INCREASED (+15 pts)
     └── Duration Delta:  +50ms
```

---

## 3. Stochastic Multi-Run Monte Carlo (Phase 16)

While a single counterfactual evaluates one specific hypothetical change, real-world uncertainty requires statistical outcome distributions.

The **Monte Carlo Engine** executes $N$ deterministic seeded iterations ($N=50$ or $100$):
- Each iteration uses `seed = baseSeed + i * 1009`.
- Latency models and quote variances are deterministically perturbed.
- Outputs statistical quantiles:
  - **Completion Rate:** e.g., 98.0% of missions succeed without exceeding budget ceilings.
  - **Average Spend:** e.g., $1.85 USDC
  - **P50 Median Spend:** e.g., $1.80 USDC
  - **P90 Tail Exposure:** e.g., $2.15 USDC
  - **P95 Worst-Case Tail:** e.g., $2.30 USDC

### Required Regulatory & Developer Notice
All Monte Carlo summaries are explicitly stamped:
> **`MODELLED ESTIMATE: Deterministic simulation projection only, not actual financial history.`**
