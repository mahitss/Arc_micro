# Resource Scheduling, Tenant Fairness & Durable Queues

## 1. Deterministic Priority Engine

AgentPay implements a deterministic, multi-factor operational priority engine (`PriorityEngine`). Priority dictates queue dispatch ordering; it **never** grants financial execution authority (`INV-122`).

### Priority Factors & Weighting (0 to 1000 scale)

```go
Score = Clamp(0, 1000,
    DeadlineProximityScore * 0.30 +
    DependencyCriticalityScore * 0.25 +
    FailureRecoveryBonus * 0.20 +
    TenantTierWeight * 0.15 +
    WorkflowAgeScore * 0.10
)
```

1. **Deadline Proximity**: Tasks with impending economic SLAs receive higher scheduling priority to prevent milestone forfeiture.
2. **Dependency Criticality**: Tasks that unblock downstream workflows are accelerated.
3. **Failure Recovery**: Self-healing recovery steps are scheduled ahead of new exploratory missions.
4. **Tenant Tier**: Configured contractual SLAs boost operational priority within predefined tenant bounds.
5. **Workflow Age**: Anti-starvation aging ensures older queued tasks monotonically gain priority.

> **CRITICAL INVARIANT (INV-122):** A workflow with priority 1000 is still strictly subject to deterministic policy checks, risk scoring, treasury reservation, and human approvals. High priority cannot override policy rejection.

---

## 2. Resource Scheduler & Bounded Tenant Fairness

The `ResourceScheduler` prevents "noisy neighbor" starvation through hierarchical quota enforcement:
- **Tenant Quotas**: Maximum concurrent workflow executions per tenant.
- **Workflow Budgets**: Operational bounds on task fan-out, memory, and API rate limits.
- **Worker Concurrency Slots**: Fenced capacity matching worker capabilities (`MISSION`, `FINANCIAL`, `SWARM`).

### Starvation Prevention Test Case
If **Tenant A** submits 10,000 workflows while **Tenant B** submits 10:
- Tenant A consumes up to its designated tenant concurrency quota.
- Tenant B is guaranteed its bounded quota immediately, preventing Tenant A from exhausting cluster capacity.
- Workflows are isolated by cryptographic tenant IDs; neither tenant can inspect or claim the other's tasks (`INV-126`, `INV-127`).

---

## 3. Durable Multi-Queue Architecture

The Operations OS maintains 8 specialized durable queues:

| Queue | Purpose | Default Lease Window | Retry Strategy |
|---|---|---|---|
| `mission` | High-level mission coordination and DAG orchestration. | 120s | Exponential backoff (max 5) |
| `swarm` | Multi-agent collaboration and sub-swarm synthesis. | 60s | Linear backoff (max 3) |
| `task` | Standard worker unit execution and tool calls. | 30s | Monotonic backoff (max 5) |
| `recovery` | Crash recovery, checkpoint restore, and fencing verification. | 15s | Priority recovery (max 3) |
| `reconciliation`| Authoritative ledger netting and unconfirmed tx reconciliation. | 30s | Guaranteed execution |
| `callback` | Asynchronous external agent or oracle callback ingestion. | 45s | Deduplicated idempotency |
| `scheduled` | Periodic cron jobs, heartbeat monitors, and refresh sweeps. | 60s | Periodic reschedule |
| `incident` | Automated mitigation routines and cluster drain protocols. | 15s | Immediate escalation |

---

## 4. Auditable Dead-Letter System (INV-128)

When work cannot safely continue due to permanent provider failures, schema mismatch, or retry exhaustion, the item is committed to `operations_dead_letters`.

Dead-lettering **never silently discards work**. Every dead-letter entry requires:
- `reason`: Machine-readable failure classification (`MAX_RETRIES_EXCEEDED`, `SCHEMA_MISMATCH`, `PERMANENT_DENIAL`).
- `evidence`: Complete error payload, HTTP status codes, or RPC exceptions.
- `attempt_history`: Timestamps and worker IDs for every preceding attempt.
- `original_event`: The immutable input payload for forensic replay.

---

## 5. Backpressure & Autonomous Load Shedding (INV-133)

When cluster capacity is saturated (e.g. database latency spikes or provider rate limits), the Operations OS sheds load gracefully:
- **Eligible for Shedding**: Counterfactual simulations, digital twin forecasting, speculative agent discovery.
- **NEVER Shed (INV-133)**: Financial ledger reconciliation, audit logging, security monitors, policy enforcement gates.
