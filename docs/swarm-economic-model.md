# AgentPay Multi-Agent Swarm Economic Model

## 1. Capital Allocation & Concurrency Lifecycle

Autonomous swarms require rigorous financial accounting because multiple agent tasks run simultaneously in parallel. Without atomic reservation gates, two tasks could easily overspend the swarm's remaining budget.

```
       [ Swarm Total Budget: $5.00 (5,000,000 micro-USDC) ]
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
  Active Reservations                    Unallocated Budget
  ($1.20 locked for Task 1)               ($3.80 available)
        │
        ▼ (Task 1 Completes at $1.05)
  Committed Spend: $1.05
  Refunded to Unallocated: $0.15
```

## 2. Core Economic Operations

### 2.1 `ReserveTaskBudget(swarmID, taskID, amount)`
- Verifies that $\text{CommittedSpend} + \text{TotalReserved} + \text{amount} \le \text{MaxBudget}$.
- Increments `TotalReserved` by `amount`.
- Records an active reservation record.
- Thread-safe and atomic under Mutex locks.

### 2.2 `CommitTaskSpend(swarmID, taskID, actualSpend)`
- Releases the original reservation of the task.
- Increments `TotalSpent` by `actualSpend`.
- Any unspent delta between reserved and actual spend automatically returns to unallocated capital.

### 2.3 `ReleaseTaskReservation(swarmID, taskID)`
- Called if a task fails, times out, or is cancelled.
- Immediately restores the entire reserved amount to unallocated capital.

## 3. Cost Intelligence Metrics

AgentPay computes real-time predictive cost intelligence for active swarms:
- **Budget Utilization Pct**: $\frac{\text{TotalSpent} + \text{TotalReserved}}{\text{MaxBudget}} \times 100$
- **Projected Final Cost**: Historical task average extrapolate across remaining pending tasks.
- **Cost Variance**: Projected cost minus original allocation.
- **Budget Overrun Risk**: Boolean flag triggered if projected cost exceeds max budget ceiling.
