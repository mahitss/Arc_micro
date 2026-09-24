# Operations Chaos Lab & Multi-Workflow Financial Safety

## 1. Overview & Chaos Lab Methodology

The **Operations Chaos Lab** is a deterministic fault-injection framework designed to test the resilience, self-healing, and financial barrier enforcement of the AgentPay Autonomous Operations OS under severe production failure conditions.

```
┌─────────────────────────────────────────────────────────────┐
│                 OPERATIONS CHAOS INJECTOR                   │
│                                                             │
│  [Worker Crash]      [Queue Overload]     [Database Lag]    │
│  [Provider 504]      [Retry Storm]        [Lease Race]      │
│  [Stale Policy]      [Treasury Drain]     [Arc Outage]      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                AGENTPAY AUTONOMOUS OPERATIONS OS            │
│                                                             │
│   DETECT ──► ISOLATE ──► RECOVER ──► REPLAN ──► REVALIDATE  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              FINANCIAL INVARIANTS PRESERVED                 │
│         No double spends • No unauthorized execution        │
│          Hard DENY unbypassable • Arc truth enforced        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. The 15 Deterministic Chaos Scenarios

| # | Scenario | Injected Failure | Automatic Response | Invariant Enforced |
|---|---|---|---|---|
| **1** | Worker Crash | Worker process killed during execution. | Lease expires; supervisor fences worker; task re-assigned. | `INV-101`, `INV-127` |
| **2** | Queue Overload | 10,000 tasks queued instantaneously. | Dynamic throttling; tenant quotas enforced; priority sorting. | `INV-126` |
| **3** | Database Latency | PostgreSQL query latency artificially delayed by 2000ms. | Concurrency scaled down; non-critical simulations paused. | `INV-133` |
| **4** | Provider Outage | External API provider returns HTTP 504. | Circuit breaker trips `OPEN`; task replans with fallback provider. | `INV-132` |
| **5** | Callback Storm | 500 identical external callback events fired. | Deduplicated via idempotency keys; duplicate executions rejected. | `INV-112` |
| **6** | Retry Storm | Rapid consecutive failures on a single task. | Bounded backoff caps at 5 attempts; routes to dead-letter queue. | `INV-138`, `INV-128` |
| **7** | Lease Race | Two workers attempt to commit to the same task simultaneously. | Fencing token monotonicity ensures stale commit is rejected. | `INV-101` |
| **8** | Stale Policy | Constitution policy modified while workflow in flight. | Financial step pauses; flags `POLICY_REVALIDATION_REQUIRED`. | `INV-131` |
| **9** | Treasury Shortage | Account balance insufficient for reservation. | Financial step transitions to `WAITING_FOR_LIQUIDITY`. | `INV-124` |
| **10**| Clearing Backlog | Multilateral netting queue depth exceeds threshold. | Prioritizes reconciliation queue over new speculative work. | `INV-133` |
| **11**| Arc RPC Outage | RPC node unreachable. | State marked `DEGRADED`; live broadcast disabled; no fake hashes. | `INV-135` |
| **12**| Webhook Outage | External merchant notification endpoint times out. | Exponential retry backoff with auditable delivery tracking. | `INV-128` |
| **13**| Partial Worker Outage | 50% of worker pool killed. | Workload redistributed across remaining workers within tenant quotas. | `INV-127` |
| **14**| Tenant Spike | Tenant A submits 10,000 tasks; Tenant B submits 5. | Bounded fairness ensures Tenant B receives capacity within SLA. | `INV-126` |
| **15**| Dependency Starvation| Upstream agent fails to provide quote within 300s. | Workflow marks starvation; supervisor triggers replan with alternate agent. | `INV-122` |

---

## 3. Five-Mission Concurrent Orchestration Demo

The live demonstration simultaneously executes five heterogeneous autonomous missions:

```
  MISSION A: Security Research         (Provider Discovery ──► Quote ──► Escrow Payment)
  MISSION B: Market Intelligence       (Web Scrape ──► Synthesis ──► Agent Micropayment)
  MISSION C: Infrastructure Monitor    (Health Probes ──► Alert Dispatch ──► Auto-Remediate)
  MISSION D: Agent Hiring Pipeline     (Capabilities Audit ──► SLA Negotiation ──► Retainer)
  MISSION E: Economic Settlement       (Obligations Due ──► Multilateral Netting ──► Arc Tx)
```

### Chaos Injections During Five-Mission Demo
1. **Worker Crash on Mission A**: Alpha worker process terminated during research. Recovery engine reclaims lease via monotonic fencing token and assigns to Beta worker without duplicate payment.
2. **Provider Timeout on Mission B**: Primary market provider returns 504; circuit breaker trips to `OPEN`; next action resolver seamlessly replans to secondary provider.
3. **Temporary Arc RPC Delay on Mission E**: Arc settlement RPC latency spikes; transaction marked `RECONCILIATION_REQUIRED`; no speculative broadcast or invented confirmations.

All five missions execute to completion within isolated tenant and financial boundaries.

---

## 4. Financial Safety Verification Under Chaos

During live adversarial testing, three deliberate attacks on the financial pipeline are launched:

1. **Attempted HARD_DENY Payment**:
   - Attack: Submitting a payment exceeding constitutional single-transaction velocity limits.
   - Outcome: Rust policy engine rejects with `HARD_DENY`.
   - Operations OS Behavior: Step marked `PAUSED`. Bounded retry engine **refuses to retry** (`INV-125`).

2. **Attempted Execution with Expired Approval**:
   - Attack: Replaying an authorization token after human approval window expired.
   - Outcome: Decision engine outputs `ESCALATE` with reason `APPROVAL_EXPIRED`.
   - Operations OS Behavior: Money movement **strictly blocked** (`INV-123`).

3. **Ambiguous Arc Blockchain State**:
   - Attack: Simulating a dropped RPC response after submitting a raw transaction.
   - Outcome: Marked `AMBIGUOUS`.
   - Operations OS Behavior: The system **never rebroadcasts**; routes directly to the reconciliation queue (`INV-106`).
