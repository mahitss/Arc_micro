# Task 13 — AgentPay Autonomous Operations & Durable Runtime Architecture Audit

> **Core Principle**:  
> *Autonomy may continue through failures.*  
> *Financial authority must never expand during recovery.*  
> *Crash recovery must reconstruct state from durable facts, not memory.*  
> *Retrying a financial action must never become an uncontrolled second payment.*

---

## 1. Executive Summary

This architecture audit evaluates AgentPay's existing state management, concurrency boundaries, storage mechanisms, event emission pipelines, and failure recovery primitives to establish the blueprint for **Task 13: Autonomous Operations & Durable Runtime**.

AgentPay is currently composed of:
1. **Deterministic Rust Policy & Risk Engine** (`services/policy-engine`)
2. **Go Gateway & Execution Core** (`services/gateway`)
3. **Solidity AgentVault Smart Contract** (`contracts/src/AgentVault.sol`)
4. **Autonomous Clearinghouse & Netting Engine** (`internal/clearinghouse`)
5. **Autonomous Treasury & Liquidity Orchestrator** (`internal/treasury`)
6. **Unified Control Tower & Web Operations** (`internal/control`, `apps/web/src/app/control`)
7. **Developer Platform & Multi-language SDKs** (`packages/cli`, `packages/sdk-typescript`, `packages/sdk-python`)

---

## 2. Existing System Inspection

### 2.1 Missions & Swarm Orchestration
- **Missions** (`internal/economy/service.go`, `models.go`): Missions represent macro business objectives (e.g. security research, data analysis). They maintain step-level status (`PLANNING`, `DISCOVERING`, `QUOTING`, `SELECTING`, `EXECUTING`, `VERIFYING`, `WAITING_APPROVAL`, `COMPLETED`, `FAILED`, `CANCELLED`).
  - *Current Reality*: Mission persistence uses `MissionRepository` (supported in both Postgres and Memory). However, in-flight execution coordination is handled via Go mutexes (`sync.Mutex` in `MissionService`) and in-memory slices/maps for `learningTraces`, `recoveryAttempts`, and `replanProposals`. If a process terminates during execution, in-flight step execution state is not durably leased or resumed.
- **Swarms** (`internal/economy/swarm_engine.go`): Coordinates multi-agent DAG execution with Kahn's topological sort and parallel task execution.
  - *Current Reality*: Swarm state is maintained in-memory (`swarms map[string]*Swarm`, `tasks map[string]map[string]*TaskNode`). While swarm budgets are concurrency-safe via in-memory atomics, a server restart loses in-flight task execution graphs unless reconstructed from durable records.

### 2.2 PaymentIntent & Execution State Machine
- **PaymentIntent Pipeline** (`internal/intent/service.go`, `internal/execution/service.go`):
  - Strictly transitions through states: `CREATED` → `EVALUATING` → `AUTHORIZED` / `DENIED` / `REQUIRE_APPROVAL` → `RESERVING` → `EXECUTING` → `CONFIRMED` / `FAILED` / `AMBIGUOUS`.
  - **Ambiguous Transaction Handling**: When blockchain RPC times out or receipt queries are unresolved, the execution service preserves `AMBIGUOUS` state instead of falsely marking `FAILED`.
  - *Current Reality*: This critical invariant (`INV-106`) is already honored at the gateway level. The runtime must respect this boundary and route any ambiguous execution to reconciliation rather than blind rebroadcasting.

### 2.3 Storage & Database Architecture
- **Repository Abstraction** (`internal/storage/factory.go`, `postgres.go`, `memory.go`):
  - `InitializeRepository` enforces:
    - In `production` mode or when `ENABLE_LIVE_EXECUTION=true`, `DATABASE_URL` is mandatory. The server fails closed (`ErrDatabaseURLRequiredInProduction`) rather than silently falling back to in-memory storage.
    - In `development` mode without `DATABASE_URL`, `MemoryRepository` is allowed with clear warnings.
    - If `DATABASE_URL` is provided, PostgreSQL is connected, connection pool tuned, and migrations 1–10 executed.
  - *Current Reality*: Clean fail-closed behavior is established. Task 13 will add migration `000011_durable_runtime.up.sql` to provide durable tables for workflows, execution steps, leases, checkpoints, workers, decisions, outbox, inbox, and scheduled jobs.

### 2.4 Event & Audit Logging
- **Audit Events** (`internal/storage/repository.go`):
  - `AuditEvent` records immutable actions with `id`, `event_type`, `resource_id`, `organization_id`, `actor`, `timestamp`, `details`.
  - Stored in Postgres table `audit_events` with SHA-256 event hashing.
  - *Current Reality*: Suitable as an append-only audit trail, but lacks transactional Outbox guarantees (i.e. atomic write of state change + event in the same DB transaction).

### 2.5 Locking, Leases & Concurrency
- *Current Reality*: Existing locking is in-process (`sync.Mutex` / `sync.RWMutex`). There is currently **no durable distributed lease mechanism**, **no worker fencing tokens**, and **no heartbeat-based worker crash recovery**.

---

## 3. Gap Analysis: Missing Runtime Capabilities

| Capability | Current State | Required Runtime State (Task 13) |
|---|---|---|
| **Durable Workflow FSM** | In-process mission loops | Database-persisted `Workflow` with optimistic version concurrency (`expected_version`) |
| **Execution Steps** | Steps in memory / ad-hoc | First-class `ExecutionStep` with discrete states, inputs hash, outputs hash, and attempt tracking |
| **Worker Identity & Leases** | Anonymous threads | Explicit `Worker` model (`worker_id`, `hostname`, `heartbeat`) with fencing tokens (`INV-101`) |
| **Crash Recovery** | Manual restart or lost state | `RuntimeRecoveryEngine`: Reconstruct state from durable checkpoints and facts, resuming safe work |
| **Financial Barrier** | Checked inside execution service | Runtime-level barrier revalidating policy, risk, approvals, and reservations prior to side-effects |
| **Retry Classification** | Ad-hoc error checks | Deterministic classification (`RETRY_WITH_BACKOFF`, `RECONCILE`, `DENY`, `PERMANENT_FAILURE`) |
| **Deadlines & Budgets** | In-memory timer / sleep | Durable deadline management; abort retry when time/resource budget would be exceeded |
| **Outbox / Inbox** | Synchronous or fire-and-forget | Transactional Outbox for atomic event publishing; Inbox for deduplicated external callbacks |
| **Durable Scheduling** | `time.Sleep` / Go timers | Database-backed scheduled jobs for retries, lease expiration, and recurring obligations |

---

## 4. Systems to Reuse vs. What NOT to Introduce

### A. Reusable Systems (DO NOT REBUILD)
- **Policy Engine Client** (`internal/policy/client.go`): Keep calling Rust policy engine for deterministic validation.
- **Treasury & Liquidity Orchestrator** (`internal/treasury`): Keep delegating liquidity checks and headroom reservations.
- **Clearinghouse & Netting** (`internal/clearinghouse`): Keep delegating obligation tracking and batch settlement.
- **Execution Gateway & AgentVault Signer** (`internal/execution`, `internal/signer`): Keep delegating all smart contract interactions.
- **Control Tower Read Models** (`internal/control`): Extend the Control Tower with `/control/runtime` without creating competing dashboards.

### B. What Must NOT Be Introduced (CRITICAL BOUNDARIES)
- **NO duplicate domain engines**: Do not build a second treasury, second policy engine, or second payment pipeline.
- **NO direct AgentVault calls from Runtime**: The runtime orchestrator must NEVER hold private keys or call `ethclient.SendTransaction`.
- **NO policy bypass**: Runtime recovery must never convert a `DENY` into a `RETRY` (`INV-103`).
- **NO blind transaction rebroadcast**: Any ambiguous blockchain state must transition to `RECONCILE` (`INV-106`).
- **NO in-memory truth**: The runtime must derive reality from durable database records (`INV-119`, `INV-120`).

---

## 5. Production Risks & Mitigation Strategy

1. **Stale Worker Committing Results After Lease Loss**:
   - *Risk*: Worker A encounters a GC pause; lease expires; Worker B claims step; Worker A wakes up and commits outdated result.
   - *Mitigation*: Monotonically increasing fencing tokens on leases. Database updates verify `fencing_token == current_token`. If token differs, commit is rejected (`INV-101`).

2. **Duplicate Payment Intents on Workflow Step Retry**:
   - *Risk*: Network failure occurs right after payment intent creation; worker retries step and creates a second payment intent.
   - *Mitigation*: Deterministic idempotency keys based on `workflow_id:step_id:attempt`. The intent service deduplicates identical keys (`INV-113`).

3. **Policy Drift Between Checkpoint and Recovery**:
   - *Risk*: A workflow pauses; the organization updates its Constitution from v8 to v9; on resume, old authorization is blindly executed.
   - *Mitigation*: Financial execution steps carry `policy_snapshot_id` and `policy_hash`. The financial barrier re-evaluates policy if the governing hash has changed (`INV-111`).

4. **Resource Exhaustion via Retry Storms**:
   - *Risk*: A downstream agent is offline; thousands of workflows enter tight retry loops.
   - *Mitigation*: Exponential backoff with jitter, maximum attempt limits, and deadline budgets.
