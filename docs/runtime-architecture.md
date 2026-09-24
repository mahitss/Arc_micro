# AgentPay Autonomous Operations & Durable Runtime Architecture

## 1. Executive Summary & Core Principles

The **AgentPay Autonomous Operations & Durable Runtime** provides a deterministic, crash-resilient, distributed workflow and execution layer for autonomous AI agents and multi-agent swarms. It ensures that complex, long-running economic workflows survive process crashes, network partitions, provider timeouts, and worker failures without ever expanding financial authority or creating duplicate payments.

### Fundamental Runtime Principles

1. **Principle of Non-Expansion:**
   > *Autonomy may continue through failures. Financial authority must never expand during recovery.*
2. **Principle of Durable Truth:**
   > *Crash recovery must reconstruct state from durable facts, not memory.*
3. **Principle of Non-Duplication:**
   > *Retrying a financial action must never become an uncontrolled second payment.*

---

## 2. Layering & Separation of Concerns

The runtime is an **orchestration layer**, strictly decoupled from domain logic, policy enforcement, risk scoring, treasury accounting, and blockchain execution:

```
+-------------------------------------------------------------------------+
|                              AI AGENTS                                  |
|     (Research Agents, Market Analysts, Synthesizers, Orchestrators)     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                          AUTONOMOUS MISSIONS                            |
|             (Missions, Swarm DAGs, Task Graphs, Deadlines)              |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                  DURABLE RUNTIME ORCHESTRATION LAYER                    |
|  - Coordinator & Worker Pool        - Checkpoint Engine (SHA-256)       |
|  - Distributed Lease & Fencing      - State Machine & Optimistic Locks  |
|  - Recovery & Replay Engine         - Transactional Outbox / Inbox      |
+-------------------------------------------------------------------------+
                                    |
                                    v [12-Point Financial Barrier]
+-------------------------------------------------------------------------+
|                     EXISTING DOMAIN ENGINES                             |
|  - Rust Deterministic Policy Engine (Constitution v8)                   |
|  - Risk Engine (0-100 Score & Thresholds)                               |
|  - Treasury & Liquidity Orchestrator (Mutex & Safety Buffer)            |
|  - Clearinghouse (Obligations, Milestones, Escrow, Invoices)            |
+-------------------------------------------------------------------------+
                                    |
                                    v [Authorized Payment Intent Pipeline]
+-------------------------------------------------------------------------+
|                     BLOCKCHAIN EXECUTION GATE                           |
|  - AgentVault Smart Contract (Solidity on Arc Testnet / Mainnet)        |
|  - Gas / Nonce / Settlement Verification Engine                         |
+-------------------------------------------------------------------------+
```

### Critical Negative Constraints

- The runtime **never holds private keys** or signer access (`INV-108`).
- The runtime **cannot alter policy or constitutional thresholds** (`INV-109`, `INV-110`).
- The runtime **cannot bypass human approval or treasury reservation** (`INV-104`, `INV-105`).
- The runtime **cannot blindly rebroadcast an ambiguous transaction** (`INV-106`).
- Simulation workflows **cannot broadcast live blockchain transactions** (`INV-107`).

---

## 3. Durable Domain Models

### 3.1 Durable Workflow (`Workflow`)

Workflows represent long-running aggregate processes with strict versioning and state validation.

| Field | Type | Description |
|---|---|---|
| `workflow_id` | `VARCHAR(64) PRIMARY KEY` | Unique deterministic identifier |
| `tenant_id` | `VARCHAR(64)` | Multi-tenant isolation boundary |
| `workflow_type` | `VARCHAR(64)` | e.g. `MISSION_EXECUTION`, `SWARM_ORCHESTRATION` |
| `aggregate_type` | `VARCHAR(64)` | Aggregate domain entity (`MISSION`, `SWARM`) |
| `aggregate_id` | `VARCHAR(64)` | Bound aggregate identifier |
| `state` | `WorkflowState` | FSM State (see state machine below) |
| `version` | `INT` | Monotonic optimistic concurrency counter |
| `priority` | `INT` | Scheduling priority (0-100) |
| `idempotency_key` | `VARCHAR(128) UNIQUE` | Enforces exact deduplication per tenant |
| `deadline` | `TIMESTAMPTZ` | Hard cutoff for mission execution |

#### Workflow Finite State Machine

```
CREATED
   ↓
 READY
   ↓
RUNNING ⇄ WAITING
   ↓         ↓
RETRYING   PAUSED
   ↓
COMPLETED | FAILED | CANCELLED | EXPIRED | ABORTED
```

- **Optimistic Concurrency:** State updates require `WHERE version = expected_version`, updating `version = version + 1`. Stale writers receive `ErrStaleWorkflowVersion` and are rejected (`INV-111`).

### 3.2 Execution Step (`ExecutionStep`)

Discrete execution units within a workflow.

| Field | Type | Description |
|---|---|---|
| `step_id` | `VARCHAR(64) PRIMARY KEY` | Atomic step identifier |
| `workflow_id` | `VARCHAR(64)` | Parent workflow foreign key |
| `sequence` | `INT` | Total ordering within the workflow DAG |
| `state` | `StepState` | `PENDING`, `CLAIMED`, `RUNNING`, `WAITING`, `SUCCEEDED`, etc. |
| `attempt` | `INT` | Number of execution attempts |
| `lease_owner` | `VARCHAR(64)` | Identifier of worker holding active lease |
| `lease_expires_at` | `TIMESTAMPTZ` | Leased expiration boundary |
| `timeout_seconds` | `INT` | Maximum step execution duration |
| `next_retry_at` | `TIMESTAMPTZ` | Bounded exponential backoff target |

### 3.3 Distributed Lease & Fencing Token (`Lease`)

Guarantees mutual exclusion across distributed workers and mitigates split-brain or GC pause issues:

- `lease_id`: UUID
- `resource_type`: e.g. `STEP`
- `resource_id`: Step ID
- `worker_id`: Claiming worker
- `fencing_token`: Monotonically increasing `BIGINT`
- `expires_at`: Heartbeat expiration timestamp

**Fencing Invariant (`INV-101`):** A step write or completion result is only accepted if the worker's fencing token matches or exceeds the current authoritative fencing token in durable storage. Stale workers whose leases were preempted cannot commit results.

### 3.4 Recovery Checkpoint (`Checkpoint`)

Immutable point-in-time state snapshots:
- SHA-256 state hash of step inputs, verified outputs, and domain context.
- Enables the recovery engine to resume execution from the last validated boundary without replaying unsafe external side effects.

---

## 4. Financial Side-Effect Barrier

Before the runtime invokes any financial execution (such as creating a PaymentIntent, acquiring a treasury reservation, or triggering settlement), it must pass the **12-Point Financial Barrier** (`services/gateway/internal/runtime/barrier.go`):

1. **Workflow State Validity:** Workflow must be active (`RUNNING` or `RETRYING`).
2. **Step Version & Fencing:** Fencing token matches authoritative lease; step is `RUNNING` or `CLAIMED`.
3. **Policy Snapshot & Hash:** Current policy snapshot matches governing Constitution version.
4. **Current Risk Decision:** Risk evaluation is fresh and acceptable.
5. **Human Approval:** If transaction exceeds threshold, approval must exist and not be expired (`INV-114`).
6. **Treasury Reservation:** Valid active liquidity reservation exists; funds pre-encumbered (`INV-105`).
7. **Payment Intent Validation:** Valid parameters, zero floating-point representation.
8. **Execution Gate Clearance:** Execution gate affirms all preconditions.
9. **Idempotency Key Uniqueness:** Idempotency key verified against prior intents (`INV-113`).
10. **Mode Verification:** Explicit `REAL` vs `SIMULATION` separation (`INV-107`).
11. **Recipient Allowlist Verification:** Recipient verified against policy allowlist.
12. **Signer Boundary Enforcement:** Zero runtime signer authority; calls authorized domain pipeline only (`INV-108`).

---

## 5. Storage Durability & Fail-Closed Semantics

- **Production Guarantee:** When `DATABASE_URL` is set or `ENABLE_LIVE_EXECUTION=true`, the runtime initializes `PostgresRuntimeStore`. If PostgreSQL is unavailable, startup fails immediately (`storage.ErrDatabaseURLRequiredInProduction`).
- **Memory Store:** Permitted only for isolated unit tests and local mock development when explicitly configured.
- **Atomic Operations:** Workflow state updates, version increments, outbox event insertions, and incident registrations occur in transactional boundaries.
