# Economic Objective Lifecycle

## 1. Objective Finite State Machine (FSM)

An `EconomicObjective` models a high-level economic goal (e.g., *"Produce a verified security report for provider X"*).

```
                      ┌──────────────────────────────────────┐
                      ▼                                      │
  DRAFT ──> PLANNED ──> SIMULATED ──> APPROVED ──> RUNNING ──┴──> RECOVERING
    │          │            │           │             │               │
    │          │            │           │             ▼               │
    │          │            │           │          WAITING ───────────┘
    │          │            │           │             │
    ▼          ▼            ▼           ▼             ▼
CANCELLED  CANCELLED    CANCELLED   CANCELLED     COMPLETED / FAILED / EXPIRED
```

### Lifecycle States:
- **`DRAFT`**: Objective created with initial description, constraints, and proposed envelope bounds.
- **`PLANNED`**: `ObjectiveCompiler` has compiled a validated execution blueprint and task DAG.
- **`SIMULATED`**: Deterministic simulation has run pre-flight Monte Carlo, liquidity stress, and policy checks.
- **`APPROVED`**: Multi-sig approval (if required by policy or budget threshold) has been granted.
- **`RUNNING`**: Dispatched into durable workflow runtime; workers execute tasks with fenced leases.
- **`WAITING`**: Execution paused by operator or awaiting external deliverable.
- **`DEGRADED`**: Non-critical provider or worker outage detected; operating in fallback mode.
- **`RECOVERING`**: Durable runtime checkpoint restoration or bounded replanning in progress.
- **`COMPLETED`**: Deliverable verified, quality gate passed, and milestone payment released.
- **`FAILED`**: Unrecoverable error or budget/deadline exhaustion; escalated to operator.
- **`CANCELLED`**: Cancelled by authorized operator; unspent liquidity reservations released.
- **`EXPIRED`**: SLA deadline passed before completion.

---

## 2. Objective Constraints

All constraints are machine-readable and strictly validated:

```json
{
  "deadline": "2026-10-01T18:00:00Z",
  "max_budget": "100.00",
  "max_parallel_tasks": 4,
  "required_capability": "security-audit",
  "minimum_confidence": 0.95,
  "required_policy": "policy_hash_v15_standard"
}
```

Constraints are immutable once execution begins. If a plan requires change, a new versioned blueprint must be compiled and validated (`INV-143`).
