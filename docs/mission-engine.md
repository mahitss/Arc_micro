# Mission Engine — Specification & Lifecycle Architecture

## 1. Overview & Objective

The **Mission Engine** is the orchestration heart of the AgentPay Autonomous Economy Engine. A *Mission* represents an autonomous economic objective undertaken by an AI agent on behalf of an organization (e.g. "Acquire real-time liquidity orderbook telemetry and verify settlement routes under a $5.00 budget ceiling").

Rather than issuing arbitrary RPC calls or interacting directly with blockchain smart contracts, the mission engine guides the agent through an explicit, auditable, and deterministic state machine where:
- Every step is strictly planned and capped before execution.
- Every payment proposal enters the canonical AgentPay security and policy gate.
- Every state transition is cryptographically logged to the domain event outbox.

---

## 2. Mission Domain Model

```go
type Mission struct {
    ID                 string            // Unique identifier (e.g. msn_5a72df9b418e)
    OrganizationID     string            // Owning organization for tenant isolation
    AgentID            string            // Authorized initiating agent
    Objective          string            // Human-readable economic objective
    Status             MissionStatus     // Explicit state from the 15-state FSM
    Budget             string            // Total financial ceiling in base units (e.g. 5000000 = 5 USDC)
    Spent              string            // Cumulative confirmed spend in base units
    RemainingBudget    string            // Unencumbered budget available for steps
    Currency           string            // Settlement currency (Default: "USDC")
    MaxExecutionAmount string            // Maximum single payment allowed within this mission
    CreatedAt          time.Time         // UTC creation timestamp
    StartedAt          *time.Time        // Execution start timestamp
    CompletedAt        *time.Time        // Terminal completion or failure timestamp
    Deadline           *time.Time        // Hard expiration deadline
    CurrentStep        string            // Pointer to the currently executing step
    FailureReason      string            // Explicit failure or rejection reason
    Metadata           map[string]string // Structured context
    CorrelationID      string            // Distributed tracing identifier
}
```

### Financial Precision Guarantee
All currency amounts (`Budget`, `Spent`, `RemainingBudget`, `MaxExecutionAmount`) are stored and computed as **base units** (e.g. USDC $10^{-6}$, where 1 USDC = `1000000`). Floating-point types (`float32`, `float64`) are strictly prohibited in the engine to eliminate rounding drift and architecture-specific discrepancies.

---

## 3. Strict 15-State Finite State Machine

The mission lifecycle is governed by an explicit transition matrix. Invalid transitions return `ErrInvalidTransition` and are rejected at the domain boundary:

| State | Description | Permitted Next States |
| :--- | :--- | :--- |
| `CREATED` | Initial state upon mission submission | `PLANNING`, `CANCELLED` |
| `PLANNING` | Decomposing objective into capability steps | `DISCOVERING`, `FAILED`, `CANCELLED` |
| `DISCOVERING` | Querying registry for candidate services | `EVALUATING`, `FAILED`, `CANCELLED` |
| `EVALUATING` | Generating quotes and calculating utility | `SELECTING`, `FAILED`, `CANCELLED` |
| `SELECTING` | Ranking and picking best candidate | `AWAITING_APPROVAL`, `EXECUTING`, `FAILED`, `CANCELLED` |
| `AWAITING_APPROVAL`| Paused waiting for human multisig | `EXECUTING`, `CANCELLED`, `FAILED` |
| `EXECUTING` | Running payment pipeline and service invocation | `WAITING_FOR_RESULT`, `FAILED`, `CANCELLED` |
| `WAITING_FOR_RESULT`| Awaiting external service result payload | `EVALUATING_RESULT`, `FAILED`, `CANCELLED` |
| `EVALUATING_RESULT` | Sanitizing result and checking objectives | `CONTINUING`, `COMPLETED`, `FAILED`, `BUDGET_EXHAUSTED` |
| `CONTINUING` | Looping to next planned capability step | `DISCOVERING`, `COMPLETED`, `BUDGET_EXHAUSTED` |
| `COMPLETED` | **Terminal**: Objective achieved | *None (Immutable)* |
| `FAILED` | **Terminal**: Step failed or policy rejected | *None (Immutable)* |
| `CANCELLED` | **Terminal**: Explicit human or agent abort | *None (Immutable)* |
| `BUDGET_EXHAUSTED` | **Terminal**: Remaining budget depleted | *None (Immutable)* |
| `EXPIRED` | **Terminal**: Mission deadline exceeded | *None (Immutable)* |

```go
func ValidateTransition(current, target MissionStatus) error {
    allowed, ok := validTransitions[current]
    if !ok {
        return fmt.Errorf("%w: unknown current status '%s'", ErrInvalidTransition, current)
    }
    for _, state := range allowed {
        if state == target {
            return nil
        }
    }
    return fmt.Errorf("%w: cannot transition mission from '%s' to '%s'", ErrInvalidTransition, current, target)
}
```

---

## 4. Capability Planner (`DeterministicPlanner`)

The planner translates an unstructured natural language objective into an ordered slice of `MissionStep` definitions.

1. **Capability Detection**: Keywords in the objective trigger required capability tags (e.g. "weather" / "satellite" $\to$ `web_search` and `data_feed`; "compute" / "inference" $\to$ `gpu_inference`).
2. **Budget Decomposition**: The mission budget ceiling is partitioned equally across the planned steps, ensuring that the sum of step budgets never exceeds the total mission budget:
   $$\text{StepMaxBudget} = \left\lfloor \frac{\text{MissionBudget}}{N} \right\rfloor$$
3. **Step Immutability**: Once planned, steps receive unique identifiers (`step_1_<hash>`, `step_2_<hash>`) and are persisted before execution begins.

---

## 5. Autonomous Step Execution Loop

When `StartMission` or `ExecuteStep` is invoked:
1. **Atomic Step Reservation**: The step status is checked inside a mutex lock. If already `EXECUTING` or `COMPLETED`, execution is aborted with an error to prevent race conditions. Status transitions to `EXECUTING` atomically.
2. **Capability Discovery**: `reg.ListByCapability(step.RequiredCapability)` locates candidate services in stable, deterministic order.
3. **Quote Solicitation**: Quotes are obtained with fixed or capped pricing.
4. **Economic Selection**: The `EconomyEngine` scores candidate quotes using the 6-factor utility model and breaks ties deterministically.
5. **12-Point Checklist**: The `BudgetController` verifies that the payment satisfies all mission, agent, and policy limits.
6. **PaymentIntent Submission**: A canonical `PaymentIntent` is submitted to the existing AgentPay payment engine.
7. **Execution & Settlement**: The payment is authorized, treasury balance locked, signed, and broadcast to the Arc network.
8. **Result Sanitization**: External output is sanitized and stripped of injection attacks (Phase 9).
9. **Reputation Update**: Outcome metrics are updated in economic memory.
10. **Budget Deduction**: Confirmed payment amount is atomically deducted from `RemainingBudget` and added to `Spent`.

---

## 6. Concurrency & Overrun Protection (INV-E1 & INV-E9)

To guarantee that concurrent callers cannot overrun the mission budget:
- `MissionService` utilizes a package-level mutex `sync.RWMutex` protecting in-flight step state and budget updates.
- Step transitions to `EXECUTING` are atomic, ensuring that duplicate step executions return an immediate error ("step already executing").
- The 12-point checklist verifies that $\text{Spent} + \text{ProposedAmount} \le \text{Budget}$. If concurrent transactions attempt to spend simultaneously, the budget controller rejects any proposal that would cause the remaining budget to drop below zero.
