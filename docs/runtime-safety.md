# AgentPay Runtime Safety Boundaries & Invariant System

## 1. Safety Architecture Overview

The Autonomous Operations & Durable Runtime is built with deterministic, machine-checked security invariants that safeguard the AgentVault smart contract and the treasury from autonomous over-reach, replay attacks, concurrent race conditions, and corrupted recovery states.

---

## 2. Definitive Runtime Security Invariants (INV-101 through INV-120)

| Invariant | Name | Guarantee & Enforcement Mechanism |
|---|---|---|
| **INV-101** | Stale Worker Fencing | A stale worker cannot commit state or results after lease preemption. Enforced via monotonic fencing tokens checked on every database mutation. |
| **INV-102** | Non-Expansion of Authority | Workflow crash recovery cannot create new financial authority or increase spending allowances. |
| **INV-103** | Hard Deny Non-Convertibility | Policy engine `DENY` decisions are terminal for that execution step. The runtime is strictly prohibited from converting a `DENY` into a retryable failure. |
| **INV-104** | Approval Non-Bypassability | Steps marked as requiring human approval cannot proceed to payment without an active, verified approval token signed by an authorized approver. |
| **INV-105** | Treasury Non-Bypassability | No payment intent can be executed without an atomically acquired, unexpired liquidity reservation in the treasury. |
| **INV-106** | Ambiguous Blockchain Barrier | Ambiguous blockchain transaction states (e.g., timeout after broadcast) must transition to `RECONCILE`. Blind rebroadcasting is permanently blocked. |
| **INV-107** | Simulation Isolation | Workflows tagged as `SIMULATION` can never acquire real on-chain treasury reservations, invoke KMS signers, or broadcast transactions. |
| **INV-108** | Zero Direct AgentVault Authority | The runtime orchestrates workflows but has zero authority to directly call or invoke `AgentVault.sol`. It must invoke the authorized Gateway payment pipeline. |
| **INV-109** | Policy Immutability | The runtime cannot modify spending rules, velocity limits, or policy parameters. |
| **INV-110** | Constitutional Preservation | The runtime cannot alter constitutional invariants or governance rules. |
| **INV-111** | Optimistic Version Integrity | Workflow state mutations require strict version matching (`WHERE version = expected_version`). Stale concurrent writes fail immediately. |
| **INV-112** | Callback Idempotency | External agent callbacks and webhooks must provide cryptographic nonces and idempotency keys; duplicate submissions are discarded. |
| **INV-113** | Payment Deduplication | Duplicate payment requests derived from identical workflow step context cannot create duplicate payment intents. |
| **INV-114** | Expiration of Stale Approvals | Financial approvals have an enforced TTL. An approval past its expiration timestamp cannot authorize payment execution. |
| **INV-115** | Expiration of Stale Leases | A worker whose lease timestamp has expired loses write authority immediately. |
| **INV-116** | Strict Multi-Tenant Isolation | Every database query and memory lookup filters by `tenant_id`. Cross-tenant workflow inspection or mutation is impossible. |
| **INV-117** | Operator Authorization Gate | Sensitive operator commands (pause, resume, cancel, force reconcile) require verified RBAC authentication and audit logging. |
| **INV-118** | Operator Idempotency | Replaying dangerous operator actions (such as `cancel_workflow`) produces idempotent, safe responses without side effects. |
| **INV-119** | Durable Fact Precedence | Financial state is derived exclusively from durable PostgreSQL records, never ephemeral process memory. |
| **INV-120** | In-Memory Ephemerality | In-memory runtime state is never authoritative financial truth. In the event of a conflict, durable database state prevails. |

---

## 3. Human Operations & RBAC Role Boundaries

| Role | Permitted Actions | Prohibited Actions |
|---|---|---|
| **VIEWER** | Inspect workflows, workers, queues, incidents, telemetry | Cannot pause, resume, retry, or cancel work |
| **OPERATOR** | Pause/resume workflows, retry safe computational steps, view recovery queue | Cannot bypass policy, approve financial overrides, or directly execute payments |
| **APPROVER** | Grant financial approvals within established constitutional thresholds | Cannot alter policy rules or grant approvals beyond daily limits |
| **SECURITY_OPERATOR** | Activate global and organization kill switches, inspect security lab | Cannot directly transfer funds or bypass AgentVault constraints |
| **ADMIN** | Manage tenant configurations, register worker nodes | Cannot arbitrarily mint liquidity or bypass deterministic risk engine |
