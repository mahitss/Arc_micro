# Multi-Horizon Liquidity Forecasting Engine

## 1. Overview

Autonomous agent economies do not operate on human 30-day billing cycles. Swarms execute thousands of micro-transactions per second, interspersed with massive batch settlements and irregular contract completions.

The **Predictive Liquidity Forecasting Engine** generates forward-looking temporal liquidity curves across five configurable horizons:
- **`1h`**: Micro-horizon for high-frequency swarm task scheduling.
- **`6h`**: Intra-day mission window for complex multi-agent DAGs.
- **`24h`**: Daily liquidity rebalancing and settlement batch planning.
- **`7d`**: Weekly operational float and milestone escrow settlement.
- **`30d`**: Macro capital adequacy and treasury replenishment planning.

---

## 2. Inflow Reliability Discounting (`INV-80`)

A core vulnerability in naive treasury systems is treating future receivables as cash. If an upstream invoice is disputed or an agent fails to deliver, the treasury faces an immediate overdraft.

AgentPay enforces invariant **`INV-80`**:
```
Discounted Inflow = Nominal Inflow * Confidence Score * Horizon Haircut Factor
```
- **Inflow Haircuts**:
  - `1h` - `6h`: 10% discount (0.90x reliability).
  - `24h`: 15% discount (0.85x reliability).
  - `7d`: 25% discount (0.75x reliability).
  - `30d`: 40% discount (0.60x reliability).
- Speculative, uncommitted, or disputed receivables have a confidence score of 0 and are completely excluded from closing balance projections.

---

## 3. Outflow & Worst-Case Shock Modeling (`INV-79`)

Outflow forecasting does not merely track historical averages. It calculates the **Worst-Case Outflow Shock**:
$$
\text{Worst Case Outflow} = \text{Base Committed Spend} + \text{Active Reservations} + \text{Pending Settlements} + \text{Tail Risk Multiplier}
$$
Under invariant **`INV-79`**, the engine simulates a scenario where 100% of active reservations and pending obligations mature simultaneously at the earliest allowable timestamp.

---

## 4. Eight Stress Scenario Presets

1. **`BASELINE`**: Mean historical outflow velocity and expected scheduled receipts.
2. **`OUTFLOW_SPIKE`**: Sudden +50% surge in agent demand and settlement velocity.
3. **`INFLOW_DROUGHT`**: 100% of scheduled future receivables fail to arrive or are delayed.
4. **`SETTLEMENT_CLUSTER`**: Highly concentrated simultaneous batch execution on Arc.
5. **`CORRELATED_AGENT_SURGE`**: Multi-agent swarms simultaneous burst capacity demand.
6. **`CASCADE_FAILURE`**: Counterparty defaults triggering fallback re-routing costs.
7. **`HIGH_VOLATILITY`**: Maximum historical standard deviation applied across all parameters.
8. **`BLACK_SWAN`**: Simultaneous combination of maximum outflow spike + complete inflow drought.

---

## 5. Automated Gating Decisions

Based on the projected post-shock buffer headroom, the forecaster emits deterministic gating decisions:
- **`SAFE`** $\implies$ Gating: `LIQUIDITY_AVAILABLE` (Normal execution).
- **`CONSTRAINED`** $\implies$ Gating: `LIQUIDITY_CONSTRAINED` (Throttles non-essential background tasks).
- **`CRITICAL`** $\implies$ Gating: `LIQUIDITY_CONSTRAINED` / `LIQUIDITY_UNAVAILABLE` (Blocks all new commitments).
- **`UNAVAILABLE`** $\implies$ Gating: `LIQUIDITY_UNAVAILABLE` (Emergency halt on all outgoing reservations).
