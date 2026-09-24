# AgentPay Autonomous Economic Fabric v1.0 — Canonical Domain Boundaries
**Document ID:** `docs/domain-boundaries.md`  
**Classification:** Canonical Architecture Specification  
**Authority:** Principal Engineer & CTO, AgentPay  
**Status:** Canonical & Enforced  

---

## 1. Domain Boundary Architecture Overview

To eliminate conflicting sources of truth and duplicate domain logic across Tasks 1–18, this specification establishes **explicit canonical ownership** for every domain concept in AgentPay Autonomous Economic Fabric v1.0.

### Golden Rules of Domain Ownership
1. **Single Source of Truth**: Exactly ONE subsystem owns the authoritative write path, state transitions, and persistence for each entity.
2. **Read Projections are Ephemeral**: Subsystems may maintain cached read models or read-only projections, but write operations MUST be delegated to the canonical owner.
3. **Event Causality**: State mutations emit strictly typed events with mandatory causal tracking (`event_id`, `causation_id`, `correlation_id`, `aggregate_id`).
4. **No Financial Side Channels**: No domain subsystem (Marketplace, Mission, Swarm, Protocol, Simulation, Clearing, or Operations) may move money directly. All financial movements are mediated exclusively by the **Financial Execution Gate** (`PaymentIntent`).

---

## 2. Canonical Ownership Registry

| Domain Concept | Canonical Owner (Package) | Persistence Authority | State Machine States | Authoritative Event Vocabulary |
|---|---|---|---|---|
| **Objectives** | `internal/fabric` | `Repository` (`economic_objectives`) | `DRAFT` → `COMPILED` → `ACTIVE` → `COMPLETED` / `FAILED` / `ABORTED` | `EconomicObjectiveCreated`, `EconomicObjectiveCompiled`, `EconomicObjectiveCompleted`, `EconomicObjectiveFailed` |
| **Missions** | `internal/economy` | `Repository` (`missions`) | `CREATED` → `PLANNING` → `ACTIVE` → `PAUSED` → `COMPLETED` / `FAILED` | `MissionCreated`, `MissionStarted`, `MissionCompleted`, `MissionFailed`, `MissionPaused` |
| **Tasks** | `internal/economy` | `Repository` (`mission_tasks`) | `PENDING` → `ASSIGNED` → `IN_PROGRESS` → `VERIFYING` → `COMPLETED` / `FAILED` | `TaskCreated`, `TaskAssigned`, `TaskCompleted`, `TaskFailed` |
| **Agents** | `internal/network` | `Repository` (`agents`, `agent_registry`) | `REGISTERED` → `VERIFIED` → `SUSPENDED` → `DECOMMISSIONED` | `AgentRegistered`, `AgentVerified`, `AgentSuspended`, `AgentDecommissioned` |
| **Services** | `internal/network` | `Repository` (`registered_services`) | `DRAFT` → `ACTIVE` → `DEPRECATED` | `ServiceRegistered`, `ServiceUpdated`, `ServiceDeprecated` |
| **Marketplace Listings** | `internal/marketplace` | `Repository` (`marketplace_listings`) | `ACTIVE` → `PAUSED` → `REMOVED` | `ListingCreated`, `ListingUpdated`, `ListingRemoved` |
| **Quotes** | `internal/protocol` | `Repository` (`agent_quotes`) | `REQUESTED` → `SUBMITTED` → `ACCEPTED` → `REJECTED` → `EXPIRED` | `QuoteRequested`, `QuoteSubmitted`, `QuoteAccepted`, `QuoteRejected` |
| **Contracts** | `internal/protocol` | `Repository` (`agent_contracts`) | `PROPOSED` → `SIGNED` → `IN_PROGRESS` → `FULFILLED` → `DISPUTED` / `SETTLED` | `ContractCreated`, `ContractSigned`, `ContractFulfilled`, `ContractDisputed` |
| **Obligations** | `internal/clearinghouse` | `Repository` (`clearing_obligations`) | `CREATED` → `PENDING` → `NETTED` → `SETTLING` → `SETTLED` / `DISPUTED` | `ObligationCreated`, `ObligationNetted`, `ObligationSettled`, `ObligationDisputed` |
| **Invoices** | `internal/clearinghouse` | `Repository` (`clearing_invoices`) | `ISSUED` → `ACKNOWLEDGED` → `PAID` → `CANCELLED` | `InvoiceIssued`, `InvoicePaid`, `InvoiceCancelled` |
| **Reservations** | `internal/treasury` | `Repository` (`treasury_reservations`) | `RESERVED` → `COMMITTED` → `RELEASED` → `EXPIRED` | `LiquidityReserved`, `LiquidityCommitted`, `LiquidityReleased` |
| **Payment Intents** | `internal/intent` | `Repository` (`payment_intents`) | `CREATED` → `EVALUATING` → `AUTHORIZED` → `RESERVED` → `SUBMITTED` → `CONFIRMED` / `DENIED` / `FAILED` | `PaymentIntentCreated`, `PaymentAuthorized`, `PaymentBroadcast`, `PaymentConfirmed`, `PaymentFailed` |
| **Policies** | `services/policy-engine` | `Repository` (`spending_policies`) | `DRAFT` → `ACTIVE` → `DISABLED` | `PolicyCreated`, `PolicyUpdated`, `PolicyDisabled` |
| **Constitution** | `internal/constitution` | `Repository` (`constitutions`, `tenants`) | `ACTIVE` → `AMENDED` → `SUPERSEDED` | `ConstitutionLoaded`, `ConstitutionAmended`, `ConstitutionEvaluated` |
| **Risk Decisions** | `services/policy-engine` | `Repository` (`risk_evaluations`) | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` (Evaluated) | `RiskEvaluated`, `RiskThresholdBreached` |
| **Approvals** | `internal/policy` | `Repository` (`approval_tickets`) | `PENDING` → `APPROVED` → `REJECTED` → `EXPIRED` | `ApprovalRequested`, `ApprovalGranted`, `ApprovalDenied`, `ApprovalExpired` |
| **Treasury State** | `internal/treasury` | `Repository` (`treasury_pools`) | `ACTIVE` → `REBALANCING` → `PAUSED` | `TreasuryStateChanged`, `PoolRebalanced` |
| **Liquidity Reservations** | `internal/treasury` | `Repository` (`treasury_reservations`) | `ACTIVE` → `CONSUMED` → `RELEASED` | `LiquidityReserved`, `LiquidityConsumed`, `LiquidityReleased` |
| **Settlement Batches**| `internal/clearinghouse` | `Repository` (`settlement_batches`) | `OPEN` → `CALCULATING` → `COMMITTED` → `SETTLING` → `SETTLED` / `FAILED` | `BatchOpened`, `BatchCommitted`, `SettlementCompleted`, `SettlementFailed` |
| **Reconciliation** | `internal/clearinghouse` | `Repository` (`reconciliation_records`) | `PENDING` → `MATCHED` → `DISCREPANCY` → `RESOLVED` | `PaymentReconciled`, `ReconciliationDiscrepancyDetected` |
| **Simulations** | `internal/simulation` | Ephemeral / `simulation_runs` | `RUNNING` → `COMPLETED` → `FAILED` | `SimulationStarted`, `SimulationCompleted`, `SimulationFailed` |
| **Observations** | `internal/service` | `Repository` (`service_telemetry`) | Append-Only Recorded | `ObservationRecorded`, `TelemetryIngested` |
| **Outcomes** | `internal/service` | `Repository` (`execution_outcomes`) | Append-Only Recorded | `OutcomeRecorded`, `SLAEvaluated` |
| **Reputation** | `internal/service` | `Repository` (`service_reputations`) | Dynamically Computed (Bayesian posterior) | `ReputationUpdated`, `TrustScoreAdjusted` |
| **Runtime Workflows** | `internal/runtime` | `RuntimeStore` (`durable_workflows`) | `RUNNING` → `SUSPENDED` → `WAITING_EXTERNAL` → `COMPLETED` → `FAILED` / `RECOVERING` | `WorkflowStarted`, `WorkflowSuspended`, `WorkflowResumed`, `WorkflowRecovered` |
| **Operational Incidents** | `internal/operations`| `Repository` (`operations_incidents`) | `OPEN` → `INVESTIGATING` → `MITIGATED` → `RESOLVED` | `IncidentCreated`, `IncidentMitigated`, `IncidentResolved` |
| **Blockchain Transactions** | `internal/blockchain` | `Repository` (`blockchain_transactions`) | `PENDING_BROADCAST` → `BROADCAST` → `CONFIRMED` → `REORGANIZED` / `FAILED` | `PaymentBroadcast`, `PaymentConfirmed`, `PaymentAmbiguous`, `PaymentFailed` |

---

## 3. Interaction and Delegated Authority Constraints

### Constraint 1: Marketplace Does Not Transact Value
- The Marketplace manages opportunities, discovery, quotes, and contract generation.
- When an opportunity is awarded, it creates a `Contract` (owned by `protocol`) and registers an `Obligation` (owned by `clearinghouse`).
- **Forbidden**: `marketplace` importing `blockchain`, `signer`, or `treasury`.

### Constraint 2: Mission Engine Does Not Move Money
- Missions plan and coordinate agent execution DAGs.
- When a task requires compensation, the mission requests a payment by invoking `intent.Service.CreateIntent`.
- The mission engine cannot approve, authorize, sign, or broadcast transactions.

### Constraint 3: Swarms Have Zero Signing Authority
- Swarms coordinate multi-agent consensus, leader-worker relationships, and critic reviews.
- Orchestrators hold no private keys (`INV-S1`).
- Task payments undergo standard hierarchical constitutional evaluation and policy approval.

### Constraint 4: Simulation Operates Under Fail-Closed Sandboxing
- Simulations project estimated costs, slippages, and risks.
- All simulation calls are stamped with `is_simulation = true`.
- The `signer` package enforces that transactions flagged as simulation are NEVER signed for on-chain broadcast (`INV-107`).

### Constraint 5: Clearinghouse Netting Must Flow Through PaymentIntent
- The Clearinghouse nets obligations across multi-party cycles to reduce gross settlement volume.
- However, when the net settlement is ready to execute, the Clearinghouse MUST submit a `PaymentIntent` to the Execution Gate.
- The Clearinghouse cannot broadcast transactions directly to Arc or call `AgentVault`.

---

## 4. Architectural Summary

```
                       CANONICAL OWNERSHIP MODEL
                                
       DEMAND & PLANNING               COORDINATION & COMMERCE
       ┌────────────────────┐          ┌────────────────────┐
       │   Economic Fabric  │          │    Marketplace     │
       │     (Objectives)   │          │ (Listings & Opps)  │
       └─────────┬──────────┘          └─────────┬──────────┘
                 │                               │
                 ▼                               ▼
       ┌────────────────────┐          ┌────────────────────┐
       │   Mission Engine   │          │   Agent Protocol   │
       │ (Missions & Tasks) │          │ (Quotes & Contracts│
       └─────────┬──────────┘          └─────────┬──────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │     Clearinghouse     │
                     │ (Obligations, Invoices│
                     │    Netting Batches)   │
                     └───────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
     ┌───────────────────────┐       ┌───────────────────────┐
     │    Control Plane      │       │     Treasury Pool     │
     │(Constitution, Policy, │       │  (Reservations, Funds,│
     │ Risk & Approvals)     │       │   Liquidity Forecast) │
     └───────────┬───────────┘       └───────────┬───────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │     PaymentIntent     │
                     │ (Sole Authority Gate) │
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │    Signer / Gateway   │
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │    Arc AgentVault     │
                     └───────────────────────┘
```
