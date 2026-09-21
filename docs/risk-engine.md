# AgentPay Deterministic Risk Engine Specification

## 1. Executive Summary

AgentPay introduces a **Deterministic Risk Scoring Layer** implemented in Rust (`services/policy-engine/src/engine/risk.rs`) and evaluated synchronously during authorization.

> **CRITICAL SECURITY INVARIANTS**:
> 1. The Risk Engine uses **strictly deterministic, rule-based integer heuristics**.
> 2. **No LLM, stochastic model, or external network call** is ever permitted in the risk evaluation pipeline.
> 3. Zero floating-point financial calculations (`f32`/`f64` are banned; all math is `u64`/`u32` integer base units).
> 4. Risk scoring can escalate an otherwise allowable payment to `APPROVAL_REQUIRED`, but can **never override a hard policy DENY**.

---

## 2. Risk Inputs & Evaluation Factors

The engine evaluates 6 objective historical and metadata signals provided in `RiskContext`:

| Factor | Metric Evaluated | Heuristic Thresholds | Points Added |
| :--- | :--- | :--- | :--- |
| **1. Budget Utilization** | Cumulative spending vs. daily limit | $< 50\%$ utilization<br>$50\% - 84\%$ utilization<br>$\ge 85\%$ utilization | 0 pts<br>15 pts<br>30 pts |
| **2. Policy Proximity** | Transaction amount vs. per-tx cap | $< 70\%$ of cap<br>$70\% - 89\%$ of cap<br>$\ge 90\%$ of cap | 0 pts<br>10 pts<br>25 pts |
| **3. Recipient Familiarity** | Prior settled payments to recipient | $\ge 5$ prior txs (Known)<br>$1 - 4$ prior txs (Recent)<br>0 prior txs (Novel) | 0 pts<br>5 pts<br>20 pts |
| **4. Spending Velocity** | Payments in trailing 15-minute window | $1 - 2$ txs<br>$3 - 4$ txs<br>$\ge 5$ txs (Burst) | 0 pts<br>10 pts<br>15 pts |
| **5. Failure Burst** | Denied or failed intents in trailing 1 hr | $0 - 1$ failures<br>$2$ failures<br>$\ge 3$ failures | 0 pts<br>5 pts<br>10 pts |
| **6. Service Familiarity & Novelty** | Prior settled payments to service ID | $\ge 5$ prior txs (Established)<br>$1 - 4$ prior txs (Exploring)<br>0 prior txs (Brand New Service) | 0 pts<br>5 pts<br>10 pts |

### Integer Ratio Safety

Budget utilization and policy proximity calculations strictly avoid floating point and division hazards:
- Proximity: $(Amount \times 100) \ge (PerTxLimit \times 90)$
- Utilization: $(DailySpent \times 100) \ge (DailyLimit \times 85)$

---

## 3. Risk Levels & Gateway Actions

Points from all factors are summed using `saturating_add` and capped at 100:

$$\text{Final Score} = \min\left(\sum_{i=1}^6 \text{Factor}_i, 100\right)$$

| Score Range | Risk Level | Gateway Action |
| :---: | :---: | :--- |
| **0 – 29** | **`LOW`** | **Automatic Execution**: If policy allows and amount $<$ approval threshold, payment is authorized immediately. |
| **30 – 59** | **`MEDIUM`** | **Enhanced Telemetry / Monitor**: Allowed if below approval threshold, but logged with explicit risk telemetry. |
| **60 – 100** | **`HIGH`** | **Mandatory Human Gate**: Escalated to `APPROVAL_REQUIRED`. Autonomous execution is halted until an authorized operator approves. |

---

## 4. Risk / Policy Composition Matrix

The policy and risk evaluations compose deterministically:

| Policy Check | Risk Score | Risk Level | Amount vs Approval Threshold | Final Decision | Human Override Permitted? |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **Hard DENY** | Any | Any | Any | **`DENY`** | **NO** (Terminal) |
| **Emergency Pause** | Any | Any | Any | **`DENY`** | **NO** (Terminal) |
| **ALLOW** | $\ge 60$ | **HIGH** | Any | **`APPROVAL_REQUIRED`** | **YES** |
| **ALLOW** | $30 - 59$ | **MEDIUM** | $\ge \text{threshold}$ | **`APPROVAL_REQUIRED`** | **YES** |
| **ALLOW** | $30 - 59$ | **MEDIUM** | $< \text{threshold}$ | **`ALLOW`** | N/A |
| **ALLOW** | $0 - 29$ | **LOW** | $\ge \text{threshold}$ | **`APPROVAL_REQUIRED`** | **YES** |
| **ALLOW** | $0 - 29$ | **LOW** | $< \text{threshold}$ | **`ALLOW`** | N/A |

---

## 5. Why Deterministic Heuristics Outperform LLMs for Financial Risk

1. **Zero Hallucination**: Evaluation results cannot be skewed by adversarial prompt injection in task prompts or justifications.
2. **Sub-Microsecond Latency**: Pure Rust integer evaluation executes in **$1.8 - 2.0\ \mu\text{s}$**, over 400,000x faster than LLM inference.
3. **Reproducibility**: Identical financial inputs always yield identical risk scores and reason codes.
4. **Audit Readiness**: Every point in the score corresponds to an inspectable RuleCheck entry for compliance verification.
