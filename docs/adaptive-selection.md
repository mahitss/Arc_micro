# AgentPay Adaptive Selection Engine

## 1. Overview
The Adaptive Selection Engine extends the core AgentPay `EconomyEngine` to dynamically select the highest-utility counterparty for an autonomous mission step based on empirical historical observations, recent trends, contextual capability match, and risk bounds.

---

## 2. Multi-Objective Utility Formulation

Candidate services are evaluated using a deterministic multi-factor scoring function represented entirely in basis points ($0 - 10000$):

$$\text{Utility} = \sum_{k} w_k \cdot U_k - w_{\text{risk}} \cdot \text{RiskScore}$$

Where the weights $w_k$ sum to $10000$:

| Component | Weight | Mathematical Formulation |
| :--- | :--- | :--- |
| **Price** ($U_{\text{price}}$) | $2000$ bps ($20\%$) | $10000 \cdot \max\left(0, 1 - \frac{\text{Price}}{\text{MaxBudget}}\right)$ |
| **Quality** ($U_{\text{qual}}$) | $1500$ bps ($15\%$) | Historical evaluated quality score ($0 - 10000$) |
| **Reliability** ($U_{\text{rel}}$) | $1500$ bps ($15\%$) | All-time empirical success rate in bps |
| **Contextual** ($U_{\text{ctx}}$) | $2000$ bps ($20\%$) | Empirical success rate for requested capability |
| **Reputation** ($U_{\text{rep}}$) | $1000$ bps ($10\%$) | Historical transaction volume and tenure weight |
| **Latency** ($U_{\text{lat}}$) | $1000$ bps ($10\%$) | $10000 \cdot \max\left(0, 1 - \frac{\text{Latency}}{\text{MaxLatency}}\right)$ |
| **Recent Trend** ($U_{\text{rec}}$)| $1000$ bps ($10\%$) | Rolling `last_10_jobs` success rate in bps |
| **Risk Penalty** | Subtracted | $\text{RiskScore} \times 100$ |

---

## 3. Deterministic 5-Tier Tie-Breaking

To ensure repeatability under identical conditions, ties are broken via a strict hierarchy:
1. **Total Utility Score**: Highest total score wins.
2. **Normalized Price**: Lowest price wins.
3. **Recent Success Rate**: Highest `last_10_jobs` success rate wins.
4. **Average Latency**: Lowest round-trip latency wins.
5. **Lexicographical Service ID**: Deterministic string ordering (`strings.Compare(a.ID, b.ID) < 0`).

---

## 4. Confidence Modeling

To prevent overconfidence when evaluating new or seldom-used services, the recommendation engine computes a confidence tier based on sample volume:

| Level | Condition | Implication |
| :--- | :--- | :--- |
| **HIGH** | $> 20$ historical observations within window | Recommendation fully automated. |
| **MEDIUM** | $5 - 20$ historical observations | Recommendation automated with warning telemetry. |
| **LOW** | $1 - 4$ historical observations | Informational flag; requires human review if high-value. |
| **UNKNOWN**| $0$ historical observations | Fallback to hard policy checks and base quotes. |

Confidence is informational and **never** overrides hard organizational policy constraints.
