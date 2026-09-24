# Digital Twin Liquidity Stress Testing Lab

## 1. Overview

AgentPay connects directly to its internal **Digital Twin Simulator** to stress test the financial resilience of the treasury prior to real-world capital commitments.

Rather than waiting for market shocks or agent swarm runaways to exhaust capital on-chain, the Stress Testing Lab simulates extreme adversarial scenarios off-chain and validates that the safety buffer floor (`INV-72`) remains intact under all plausible conditions.

---

## 2. Mathematical Simulation Framework

Given an organization state $S = \{ B_{\text{total}}, B_{\text{avail}}, B_{\text{res}}, B_{\text{buf}} \}$ and a scenario $\sigma$:
1. **Simulated Outflow Shock ($O_{\text{shock}}$)**:
   $$
   O_{\text{shock}} = (B_{\text{res}} + \text{PendingSettlements}) \times \text{ClusterFactor} + (N_{\text{sim}} \times \text{ShockPerSettlement})
   $$
2. **Simulated Inflow Haircut ($I_{\text{haircut}}$)**:
   $$
   I_{\text{haircut}} = \text{ScheduledInflows} \times (1 - \text{InflowReliabilityFactor})
   $$
3. **Post-Stress Buffer Headroom ($H_{\text{post}}$)**:
   $$
   H_{\text{post}} = B_{\text{total}} - O_{\text{shock}} - B_{\text{buf}}
   $$
4. **Capital Adequacy Ratio (CAR)**:
   $$
   \text{CAR} = \frac{B_{\text{total}} - O_{\text{shock}}}{B_{\text{buf}}}
   $$

---

## 3. Survival State Classification

| Capital Adequacy Ratio | Post-Stress Headroom | Survival State | Action Required |
| :--- | :--- | :--- | :--- |
| $\text{CAR} \ge 1.50$ | $H_{\text{post}} > 0$ | **`SAFE`** | Full clearance. Safe to grant all requested reservations. |
| $1.00 \le \text{CAR} < 1.50$ | $H_{\text{post}} \ge 0$ | **`CONSTRAINED`** | Throttle non-critical reservations; prioritize starved tasks. |
| $0.50 \le \text{CAR} < 1.00$ | $H_{\text{post}} < 0$ | **`CRITICAL`** | Halt new reservations. Immediate liquidity replenishment required. |
| $\text{CAR} < 0.50$ | Severe Deficit | **`UNAVAILABLE`** | Complete liquidity freeze. Enforce emergency circuit breaker. |

---

## 4. Digital Twin Perturbation Scenarios

- **Outflow Spike**: Multiplies baseline outflow rate by 1.5x - 3.0x to emulate simultaneous demand spikes across hundreds of parallel agent micro-tasks.
- **Settlement Shock**: If `simultaneous_settlements > 0`, the simulation applies an immediate flat shock ($25 USDC base equivalent per call) to model sudden gas-spike or multi-contract settlement clusters.
- **Network Stress**: Simulates elevated network latency and re-submission retries, inflating in-flight transaction exposure.

---

## 5. Strategic AI Recommendations

The orchestrator generates machine-readable and explainable recommendations returned in API responses:
- *"Liquidity buffer sufficient for peak volume; zero throttling required."*
- *"Buffer headroom constrained under 2.5x cluster shock; recommend deferring batch settlements."*
- *"Worst-case drawdown breaches minimum safety floor; mission creation disabled until inflows confirm."*
