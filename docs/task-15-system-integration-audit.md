# Task 15 System Integration Audit: Architectural Freeze & Subsystem Map

## Executive Summary & Non-Duplication Mandate

AgentPay already possesses a hardened, multi-language autonomous financial platform spanning 14 prior implementation tasks:
- **Go Gateway**: Distributed orchestrator, event bus, storage abstraction, and API gateway.
- **Rust Deterministic Policy Engine**: Sub-microsecond policy and risk verification core.
- **Solidity AgentVault**: Keyless smart contract with multi-sig velocity gates on Arc L1/L2.
- **PaymentIntent Pipeline**: Strict finite-state-machine authorizing all fund movements.
- **Autonomous Treasury & Clearinghouse**: Double-entry ledger, reservations, obligations, and multilateral netting.
- **Durable Runtime & Operations OS**: Fenced leases, checkpoints, dead-letters, 8 durable queues, and supervisory control.

> **CRITICAL ARCHITECTURAL MANDATE:**  
> **TASK 15 IS AN INTEGRATION AND SYSTEM-LEVEL INTELLIGENCE LAYER.**  
> It does NOT own domain state. It does NOT duplicate engines.  
> It coordinates the existing domain engines into **ONE coherent Autonomous Economic Fabric**.

---

## 1. Complete Component Mapping (Tasks 1–14)

```
MISSION ──► WORKFLOW ──► OPERATIONS ──► AGENTS ──► NETWORK ──► POLICY ──► RISK
   │                                                                        │
   ▼                                                                        ▼
APPROVAL ◄── TREASURY ◄── CLEARING ◄── PAYMENT ◄── EXECUTION ◄── ARC ◄── RECONCILIATION
   │
   ▼
INTELLIGENCE ──► MEMORY ──► CONTROL TOWER ──► NEXT OBJECTIVE
```

### 1. MISSION
- **Source of Truth**: `storage.Repository` (`missions` and `mission_tasks` tables).
- **API**: `economy.MissionService` (`/v1/missions`).
- **Event Interface**: `MISSION_CREATED`, `MISSION_STARTED`, `MISSION_COMPLETED`, `MISSION_FAILED`.
- **Persistence**: PostgreSQL relational store (`MemoryMissionStore` in testing).
- **Ownership**: `internal/economy`.
- **Dependencies**: `registry.Registry`, `policy.Client`, `intent.Service`, `economy.Planner`.
- **Failure Modes**: Task timeout, budget exhaustion, counterparty rejection.
- **Security Boundary**: Missions cannot move money directly; they must request `PaymentIntent` via registered services.

### 2. WORKFLOW (Durable Runtime)
- **Source of Truth**: `storage.RuntimeStore` (`durable_workflows`, `execution_steps`, `step_checkpoints`).
- **API**: `runtime.Service` (`/v1/runtime/workflows`).
- **Event Interface**: `WORKFLOW_STATE_CHANGED`, `STEP_STARTED`, `STEP_COMPLETED`, `LEASE_EXPIRED`.
- **Persistence**: Durable append-only event log with optimistic concurrency tokens.
- **Ownership**: `internal/runtime`.
- **Dependencies**: Fenced leases, worker heartbeats, monotonic fencing tokens.
- **Failure Modes**: Worker process crash, lease contention, zombie split-brain.
- **Security Boundary**: Pre-flight Financial Barrier (`INV-102`, `INV-108`). Runtime cannot directly call AgentVault.

### 3. OPERATIONS OS
- **Source of Truth**: Read models derived from domain state (`operations_snapshots`, `operations_decidents`, `operations_queues`, `operations_incidents`).
- **API**: `operations.OperationsService` (`/v1/operations`).
- **Event Interface**: Causal operational events with `caused_by_event_id`.
- **Persistence**: PostgreSQL read projection tables.
- **Ownership**: `internal/operations`.
- **Dependencies**: Subsystem health probes, durable queue leases.
- **Failure Modes**: Stale telemetry, queue starvation, provider circuit breaker trips.
- **Security Boundary**: Zero financial authority (`INV-121`). Supervisor output is strictly operational decisions (`RUN`, `WAIT`, `PAUSE`).

### 4. AGENTS
- **Source of Truth**: `storage.Repository` (`agents` table).
- **API**: `agent.Service` (`/v1/agents`).
- **Event Interface**: Agent lifecycle events, quote requests.
- **Persistence**: PostgreSQL `agents` table.
- **Ownership**: `internal/agent`.
- **Dependencies**: Registered LLM prompt configurations, service registry.
- **Failure Modes**: LLM hallucination, unparseable output, rate limit exhaustion.
- **Security Boundary**: AI agents are untrusted actors. They receive zero private keys, zero signer access, and zero policy override privileges.

### 5. NETWORK (Open Agent Network & A2A)
- **Source of Truth**: `network.ContractManager`, `storage.Repository` (`contracts`, `disputes`).
- **API**: `network.AgentDiscoveryService`, `network.EconomicRouter` (`/v1/agent-network`).
- **Event Interface**: `AGENT_REGISTERED`, `CONTRACT_OFFERED`, `CONTRACT_ACCEPTED`, `DISPUTE_OPENED`.
- **Persistence**: PostgreSQL contract and trust tables.
- **Ownership**: `internal/network`.
- **Dependencies**: Capability registry, trust evaluator, payment bridge.
- **Failure Modes**: Unresponsive peer agent, fraudulent deliverable, SLA violation.
- **Security Boundary**: Deliverables verified with cryptographic hashes before milestone settlement.

### 6. POLICY ENGINE
- **Source of Truth**: Rust Deterministic Engine (`services/policy-engine/src/engine.rs`).
- **API**: HTTP microservice `/authorize`, `/simulate`, `/health`.
- **Event Interface**: Policy evaluation audit logs.
- **Persistence**: In-memory microsecond ruleset loaded from signed configuration.
- **Ownership**: `services/policy-engine` (Rust).
- **Dependencies**: Sub-microsecond SIMD/B-Tree policy evaluation.
- **Failure Modes**: Engine crash (causes fail-closed DENY).
- **Security Boundary**: Machine-checked invariants INV-1 through INV-20. Hard DENY is inviolable.

### 7. RISK ENGINE
- **Source of Truth**: Rust risk scoring module (`domain/risk.rs`).
- **API**: Internal Go gateway integration via policy client.
- **Event Interface**: Risk score calculation logs.
- **Persistence**: Velocity counter cache.
- **Ownership**: `services/policy-engine`.
- **Dependencies**: Historical transaction velocity, novel service flags.
- **Failure Modes**: Anomaly threshold spikes.
- **Security Boundary**: High risk scores automatically escalate to mandatory human approval.

### 8. APPROVAL (Human-in-the-Loop)
- **Source of Truth**: `storage.Repository` (`approvals` table).
- **API**: `service.DomainService` (`/v1/approvals`).
- **Event Interface**: `APPROVAL_CREATED`, `APPROVAL_GRANTED`, `APPROVAL_REJECTED`.
- **Persistence**: PostgreSQL approvals store.
- **Ownership**: `internal/service`.
- **Dependencies**: Operator multi-factor authentication, approval expiration timers.
- **Failure Modes**: Approval expiration (`INV-114`).
- **Security Boundary**: Expired approvals cannot authorize execution (`INV-114`, `INV-123`).

### 9. TREASURY (Autonomous Treasury & Liquidity)
- **Source of Truth**: Double-entry ledger balances (`treasury.TreasuryService`).
- **API**: `treasury.TreasuryService` (`/v1/treasury`).
- **Event Interface**: `LIQUIDITY_RESERVED`, `LIQUIDITY_RELEASED`, `RECONCILIATION_COMPLETED`.
- **Persistence**: Relational double-entry reservation and commitment tables.
- **Ownership**: `internal/treasury`.
- **Dependencies**: Safety buffer thresholds, liquidity forecasting models.
- **Failure Modes**: Liquidity depletion, stress shock.
- **Security Boundary**: Available liquidity cannot go negative (`INV-71`). Safety buffer is mathematically preserved (`INV-72`).

### 10. CLEARINGHOUSE
- **Source of Truth**: Multilateral obligations and netting batches (`clearinghouse.ClearinghouseService`).
- **API**: `/v1/economy/obligations`, `/v1/economy/clearing`.
- **Event Interface**: `OBLIGATION_PROPOSED`, `NETTING_BATCH_EXECUTED`.
- **Persistence**: PostgreSQL clearinghouse tables.
- **Ownership**: `internal/clearinghouse`.
- **Dependencies**: Settlement router, treasury reservations.
- **Failure Modes**: Counterparty default, batch execution failure.
- **Security Boundary**: Zero private keys (`INV-55`). Zero direct transfer authority; routes to PaymentIntent pipeline.

### 11. PAYMENT INTENT
- **Source of Truth**: `storage.Repository` (`payment_intents` table).
- **API**: `intent.Service` (`/v1/payment-intents`).
- **Event Interface**: `PAYMENT_INTENT_CREATED`, `PAYMENT_INTENT_AUTHORIZED`, `PAYMENT_INTENT_CONFIRMED`.
- **Persistence**: PostgreSQL state machine records.
- **Ownership**: `internal/intent`.
- **Dependencies**: Policy engine, execution service, execution gate, treasury service.
- **Failure Modes**: TTL expiration, policy denial, on-chain revert.
- **Security Boundary**: Sole canonical gateway path for funds transfer.

### 12. EXECUTION
- **Source of Truth**: Signer audit logs and execution receipts.
- **API**: `execution.ExecutionServiceWithSigner`.
- **Event Interface**: `TX_SIGNED`, `TX_BROADCAST`, `TX_CONFIRMED`.
- **Persistence**: Signer audit recorder and transaction store.
- **Ownership**: `internal/execution`.
- **Dependencies**: Transaction signer boundary (`internal/signer`), 10-point execution gate.
- **Failure Modes**: Gas spike, RPC timeout, nonce mismatch.
- **Security Boundary**: Signer executes only authorized payment intents passing the pre-flight gate.

### 13. ARC BLOCKCHAIN & AGENTVAULT
- **Source of Truth**: Arc L1/L2 blockchain state (Chain ID 5042) & `AgentVault.sol`.
- **API**: Arc RPC node client (`internal/blockchain`).
- **Event Interface**: On-chain transfer events, block receipts.
- **Persistence**: Blockchain state.
- **Ownership**: `contracts/src/AgentVault.sol`.
- **Dependencies**: Arc RPC availability.
- **Failure Modes**: Chain reorg, network partition.
- **Security Boundary**: Non-custodial vault with velocity limits; unverified contracts are never presented as verified (`INV-135`).

### 14. RECONCILIATION
- **Source of Truth**: Ledger vs on-chain cryptographic comparison proofs.
- **API**: `clearinghouse.ClearingReconciliationEngine`, `treasury.Reconciler`.
- **Event Interface**: `RECONCILIATION_FLAGGED`, `RECONCILIATION_RESOLVED`.
- **Persistence**: Reconciliation records.
- **Ownership**: `internal/clearinghouse`, `internal/treasury`.
- **Dependencies**: Arc event logs, internal ledger entries.
- **Failure Modes**: Unmatched tx hash.
- **Security Boundary**: Ambiguous on-chain state routes to reconciliation; blind rebroadcast is prohibited (`INV-106`).

### 15. INTELLIGENCE
- **Source of Truth**: Observation logs and reliability profiles (`economy.EconomicIntelligence`).
- **API**: `/v1/services/{id}/performance`, `/v1/missions/{id}/recommendations`.
- **Event Interface**: `OBSERVATION_RECORDED`, `ANOMALY_DETECTED`.
- **Persistence**: PostgreSQL intelligence tables.
- **Ownership**: `internal/economy`.
- **Dependencies**: Service telemetry, failure patterns.
- **Failure Modes**: Telemetry drift.
- **Security Boundary**: Intelligence produces recommendations, NOT financial authority (`INV-151`).

### 16. MEMORY
- **Source of Truth**: Historical execution episodes and performance graphs (`economy.EconomicMemory`).
- **API**: Internal memory retrieval methods.
- **Event Interface**: Contextual memory updates.
- **Persistence**: JSON serialized episodes and graph adjacency edges.
- **Ownership**: `internal/economy`.
- **Dependencies**: Mission outcomes, contract deliverables.
- **Failure Modes**: None (read-only historical store).
- **Security Boundary**: Memory is an informational store; it cannot elevate agent permissions.

### 17. CONTROL TOWER
- **Source of Truth**: Aggregated read projections from all authoritative domains.
- **API**: `/v1/control/...`, `/v1/operations/...`.
- **Event Interface**: Live SSE/WebSocket streaming.
- **Persistence**: Derived view models.
- **Ownership**: `internal/control`, `internal/operations`.
- **Dependencies**: Domain services.
- **Failure Modes**: Telemetry lag.
- **Security Boundary**: Display projection only; cannot authorize money movement (`INV-99`, `INV-100`).

---

## 2. Duplicate Abstraction Audit & Strict Reuse Rules

To prevent code bloat, architectural confusion, and security holes, Task 15 establishes strict non-duplication rules:

1. **NO SECOND MissionEngine**: We reuse `economy.MissionService` and `economy.EconomyEngine`.
2. **NO SECOND WorkflowEngine / Runtime**: We reuse `runtime.Service` and `runtime.DurableWorkflow`.
3. **NO SECOND PolicyEngine**: All policy decisions route exclusively to the Rust policy microservice.
4. **NO SECOND RiskEngine**: We reuse the Rust risk engine and gateway velocity controls.
5. **NO SECOND TreasuryEngine**: We reuse `treasury.TreasuryService` double-entry ledger and reservations.
6. **NO SECOND Clearinghouse**: We reuse `clearinghouse.ClearinghouseService` obligations and netting.
7. **NO SECOND PaymentEngine**: All money movement passes through `intent.Service`.
8. **NO SECOND EventEngine**: We reuse `webhook.Dispatcher` and the central audit store.

---

## 3. The Role of EconomicFabric

The **EconomicFabric** is a thin coordination and synthesis layer. It:
1. Translates high-level human objectives into an `ExecutionBlueprint`.
2. Gathers simulations and counterfactuals from the existing `SimulationEngine`.
3. Allocates tasks to `runtime.DurableWorkflow` and `economy.MissionService`.
4. Observes failures, triggers self-healing through the `OperationsSupervisor`, and initiates bounded replanning.
5. Verifies deliverable quality through `ResultQualityGate` before delegating to `clearinghouse` and `intent.Service` for settlement.
6. Enforces **INV-141 through INV-160**: Under no circumstances does the fabric hold keys, bypass policy, or authorize payments autonomously.
