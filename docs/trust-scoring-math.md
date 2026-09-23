# Deterministic Trust Scoring Mathematics

## 1. Overview

AgentPay calculates counterparty trust deterministically using verified historical flight recorder telemetry. The trust score $T \in [0, 10000]$ (basis points) replaces subjective rating systems with mathematical guarantees.

---

## 2. Mathematical Formulation

Let an agent have historical observations:
- $N_{\text{total}}$: Total number of contracts initiated.
- $N_{\text{completed}}$: Contracts completed within deadline with verified deliverables.
- $N_{\text{verified}}$: Deliverables passing SHA-256 checksum and schema checks without dispute.
- $N_{\text{disputes}}$: Disputes resolved against the agent.
- $\Delta P$: Price accuracy ratio $\frac{P_{\text{settled}}}{P_{\text{quoted}}}$.

### 2.1 Component Signals

Each component signal $S_i \in [0, 100]$:

1. **Job Completion Rate ($S_{\text{completion}}$):**
   $$S_{\text{completion}} = \min\left(100, \frac{N_{\text{completed}}}{N_{\text{total}}} \times 100\right)$$
   *(Weight $w_1 = 35\%$)*

2. **Deliverable Verification Rate ($S_{\text{verification}}$):**
   $$S_{\text{verification}} = \min\left(100, \frac{N_{\text{verified}}}{N_{\text{completed}}} \times 100\right)$$
   *(Weight $w_2 = 30\%$)*

3. **Pricing Reliability ($S_{\text{price}}$):**
   $$S_{\text{price}} = \max\left(0, 100 - |\Delta P - 1.0| \times 100\right)$$
   *(Weight $w_3 = 20\%$)*

4. **Dispute Penalty ($S_{\text{dispute}}$):**
   $$S_{\text{dispute}} = \max\left(0, 100 - \frac{N_{\text{disputes}}}{N_{\text{total}}} \times 500\right)$$
   *(Weight $w_4 = 15\%$)*

### 2.2 Raw Composite Trust Score

$$T_{\text{raw}} = \sum_{i=1}^4 w_i S_i \times 100$$

### 2.3 Confidence Scaling

For agents with limited historical data ($N_{\text{total}} < 50$), a Bayesian prior $T_0 = 5000$ (neutral trust) is applied:

$$C = \min\left(1.0, \frac{N_{\text{total}}}{50}\right)$$
$$T_{\text{final}} = \text{round}\left(C \cdot T_{\text{raw}} + (1 - C) \cdot T_0\right)$$

---

## 3. Threshold Classifications

| Score Range (bps) | Percentage | Classification | Network Privileges |
| :--- | :--- | :--- | :--- |
| $9500 - 10000$ | $95.0\% - 100.0\%$ | **Tier 1 (Enterprise Trusted)** | Zero escrow required, priority routing |
| $8500 - 9499$ | $85.0\% - 94.9\%$ | **Tier 2 (Standard Verified)** | Standard escrow reservation |
| $7000 - 8499$ | $70.0\% - 84.9\%$ | **Tier 3 (Elevated Risk)** | Human approval required above 10 USDC |
| $< 7000$ | $< 70.0\%$ | **Tier 4 (Restricted)** | Excluded from automated discovery |
