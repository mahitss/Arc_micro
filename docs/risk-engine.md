# AgentPay Deterministic Risk Engine

## 1. Executive Summary

AgentPay introduces a **Deterministic Risk Scoring Layer** operating in the Go Gateway prior to dispatching transactions.

> **CRITICAL SECURITY INVARIANT**:
> The Risk Engine uses strictly deterministic, rule-based heuristics. **No LLM or stochastic model is ever permitted to calculate risk scores or make financial authorization decisions.**

---

## 2. Risk Inputs & Evaluation Factors

The risk engine evaluates 6 objective signals derived from agent transaction history and intent metadata:

| Factor | Metric Evaluated | High Risk Condition |
| :--- | :--- | :--- |
| **1. Budget Utilization** | Cumulative spending vs. daily cap | $\ge 85\%$ of daily limit consumed. |
| **2. Policy Proximity** | Transaction amount vs. per-tx cap | $\ge 90\%$ of `per_transaction_limit`. |
| **3. Recipient Familiarity** | Previous successful settlements to this recipient | 0 prior transactions to this recipient in past 30 days. |
| **4. Spending Velocity** | Number of payments in trailing 15-minute window | $\ge 5$ transactions in 15 minutes. |
| **5. Recent Failure Rate** | Denied or failed intents in trailing 1 hour | $\ge 3$ consecutive failures/denials. |
| **6. Service Deviation** | Service ID vs. agent's historical service distribution | New service never before invoked by this agent. |

---

## 3. Deterministic Scoring Algorithm

Each factor contributes an integer point score (0 to 100 total):

```
Score Calculation:
- Budget Utilization:
    < 50%  -> 0 pts
    50-84% -> 15 pts
    >= 85% -> 30 pts

- Policy Proximity:
    < 70%  -> 0 pts
    70-89% -> 10 pts
    >= 90% -> 25 pts

- Recipient Familiarity:
    >= 5 prior txs -> 0 pts
    1-4 prior txs  -> 5 pts
    0 prior txs    -> 20 pts

- Spending Velocity (15-min window):
    1-2 txs -> 0 pts
    3-4 txs -> 10 pts
    >= 5 txs -> 15 pts

- Failure Burst (1-hour window):
    0-1 failures -> 0 pts
    2 failures   -> 5 pts
    >= 3 failures -> 10 pts
```

### Risk Classification & Actions

| Score Range | Risk Level | Gateway Action |
| :---: | :---: | :--- |
| **0 – 29** | **`LOW`** | **Automatic Execution**: If policy allows, payment proceeds directly to `AUTHORIZED` and execution. |
| **30 – 59** | **`MEDIUM`** | **Enhanced Telemetry & Step-Down**: Allowed, but flagged in audit log and triggers immediate webhook notification to operator. |
| **60 – 100** | **`HIGH`** | **Human Gate Required**: Transitioned to `APPROVAL_REQUIRED`. Execution is halted until an authorized human approver signs off. |

---

## 4. Why Heuristics Outperform LLMs for Financial Risk

1. **Explainability**: Every point in the risk score maps to a verifiable database query (e.g. "Score: 65 because Budget = 88% (+30), Proximity = 92% (+25), New Recipient = (+20)").
2. **Zero Hallucination**: Mathematical calculations cannot be influenced by prompt injection in the agent's task description.
3. **Sub-Millisecond Speed**: Computed in < 2ms via indexed SQL queries, compared to 800ms+ for LLM inference.
4. **Audit Compliance**: Financial auditors require reproducible deterministic criteria, not probabilistic token generation.
