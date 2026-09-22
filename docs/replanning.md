# AgentPay Adaptive Replanning Engine

## 1. Overview
When an autonomous mission encounters an unrecoverable step failure, price surge, or counterparty degradation, the `ReplanningEngine` synthesizes an optimized, budget-constrained `ReplanProposal`.

A proposal is **informational only**; it does not grant financial execution authority. To execute, any proposed step must be submitted through the canonical deterministic policy and payment gateway pipeline.

---

## 2. Replan Proposal Schema

```json
{
  "mission_id": "msn_01hf8924jk",
  "reason": "SERVICE_TIMEOUT: Initial provider DataAgent Alpha exceeded 2000ms SLA",
  "strategy": "TRY_ALTERNATIVE_SERVICE",
  "proposed_steps": [
    {
      "step_number": 1,
      "capability": "data_analysis",
      "recommended_service_id": "srv_data_agent_b",
      "estimated_cost": "350000",
      "estimated_duration_ms": 380,
      "reason": "Highest contextual success rate (98.0%) within remaining budget"
    }
  ],
  "estimated_cost": "350000",
  "estimated_duration_ms": 380,
  "confidence": "HIGH",
  "human_approval_required": false,
  "explanation": "Discovered candidate DataAgent Beta with optimal utility score within remaining $0.80 budget margin"
}
```

---

## 3. Budget-Aware Replanning

The replanning engine computes the unencumbered balance remaining in the mission budget before evaluating candidates:

$$\text{RemainingBudget} = \text{InitialBudget} - \text{CumulativeSpent}$$

If the original service fails after spending partial funds:
1. The engine eliminates all candidate services where $\text{Price} > \text{RemainingBudget}$.
2. If remaining candidates exist, it selects the highest-utility candidate that fits within the balance.
3. If no candidate fits within the remaining budget, the engine deterministically transitions the mission to `BUDGET_EXHAUSTED` / `ABORT_MISSION` rather than escalating spend.

---

## 4. Deadline-Aware Replanning

Autonomous missions may define an optional execution deadline (e.g. $10$ minutes).
When replanning:
$$\text{RemainingDeadlineMs} = \text{DeadlineTimestamp} - \text{CurrentTimestamp}$$
The engine enforces a **$20\%$ safety margin**:
$$\text{MaxAllowedLatency} = \text{RemainingDeadlineMs} \times 0.80$$

Any service whose estimated execution latency exceeds $\text{MaxAllowedLatency}$ is automatically excluded from candidate selection.
If no service satisfies the deadline constraint, replanning suggests `REDUCE_SCOPE` or `REQUEST_HUMAN_APPROVAL`.

---

## 5. Termination Bounds & Fail-Closed Guards

To guarantee that mission execution loops never become unbounded:
- `MAX_MISSION_ITERATIONS = 10`
- `MAX_REPLAN_COUNT = 3`
- `MAX_RECOVERY_ATTEMPTS = 3`

If any limit is hit, execution terminates immediately with status `FAILED` and records an immutable audit log.
