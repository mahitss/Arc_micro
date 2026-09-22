# AgentPay Phase 25: Adaptive Autonomous Mission Demo

## 1. Demo Narrative & Overview

The Phase 25 demo tells the complete story of how AgentPay adapts when an autonomous economic step fails, without elevating the agent's financial authority.

```
USER OBJECTIVE:
"Produce a verified AI infrastructure market report under $5.00."

Agent: ResearchAgent
Initial Budget: $5.00 USDC
```

---

## 2. Step-by-Step Chronological Execution

### Step 1: Initial Candidate Discovery & Selection
- AgentPay queries service registry for capability `data_analysis`.
- Candidate selected: **DataAgent Alpha** (`srv_data_agent_a`).
- Quoted Price: `$0.40 USDC`.
- Policy: Rust Policy Engine returns `ALLOW`.
- Payment: `$0.40 USDC` PaymentIntent executed.

### Step 2: Simulated Service Failure
- **DataAgent Alpha** experiences a network timeout ($2150\text{ms} > 2000\text{ms}$ SLA).
- Payment succeeded, but service result failed to deliver.

### Step 3: Economic Observation & Evaluation
- `OutcomeEvaluator` records `EconomicObservation` with `event_type = SERVICE_FAILURE` and `outcome = TIMEOUT`.
- Failure is classified as `TIMEOUT`.
- `AnomalyDetector` notes latency surge and marks DataAgent Alpha as `DEGRADED`.

### Step 4: Adaptive Replanning & Discovery
- `ReplanningEngine` inspects mission state:
  - Budget: `$5.00`
  - Spent: `$0.40`
  - Remaining: `$4.60`
- Replanning strategy: `TRY_ALTERNATIVE_SERVICE`.
- Evaluates candidate alternatives from registry:
  - **DataAgent Beta** (`srv_data_agent_b`): Price `$0.35`, Contextual Success $98.0\%$, Latency $380\text{ms}$.
  - **ValidatorAgent Prime** (`srv_validator_prime`): Price `$0.42`, Contextual Success $97.2\%$, Latency $450\text{ms}$.
- Highest utility candidate selected: **DataAgent Beta**.
- Generates `ReplanProposal` with `estimated_cost = $0.35`, `confidence = HIGH`.

### Step 5: Canonical Security Gate Re-Entry
- The proposal does **NOT** disburse funds automatically.
- Enters canonical payment gateway:
  $$\text{PaymentIntent (\$0.35)} \longrightarrow \text{Policy Engine (ALLOW)} \longrightarrow \text{Treasury Check} \longrightarrow \text{Settlement}$$

### Step 6: Step Execution & Verification
- **DataAgent Beta** executes job in $380\text{ms}$.
- Result payload returned with cryptographic SHA-256 checksum.
- `OutcomeEvaluator` verifies payload structure and checksum match: `RESULT_VALIDATED`.
- Observation recorded: `SERVICE_SUCCESS`.

### Step 7: Mission Completion
- Verification step completes via ValidatorAgent Prime ($0.30).
- Mission state transitions to `COMPLETED`.

---

## 3. Final Economic Outcome Summary

| Metric | Result |
| :--- | :--- |
| **Initial Budget** | `$5.00 USDC` |
| **Cumulative Spent** | `$1.05 USDC` |
| **Remaining Budget** | `$3.95 USDC` |
| **Recovery Cycles** | `1` |
| **Failed Attempts** | `1` (DataAgent Alpha Timeout) |
| **Successful Attempts**| `2` (DataAgent Beta + ValidatorAgent) |
| **Objective Satisfied**| **YES** |
| **Security Proof** | **The agent never gained financial power. AgentPay adapted the decision.** |
