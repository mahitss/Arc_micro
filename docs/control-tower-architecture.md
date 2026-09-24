# AgentPay Autonomous Economic Control Tower Architecture

## 1. Executive Summary

AgentPay is the autonomous economic operating system for AI agents, governed by the core thesis:
```
AI REQUESTS → AGENTPAY CONTROLS → ARC SETTLES
```

The **Autonomous Economic Control Tower** (Task 12) is the flagship operational interface and unified observability plane across the entire AgentPay ecosystem. It synthesizes disparate subsystem streams into a single, cohesive operator experience:
- **WHAT THE ECONOMY IS DOING** (Active missions, swarms, agent hires, task graphs)
- **WHY IT IS DOING IT** (Agent selection explanations, capability matchmaking, trade-off analysis)
- **WHAT IT IS ALLOWED TO DO** (Constitution hierarchy, active policy version, rate limits, spending envelopes)
- **WHAT IT IS NOT ALLOWED TO DO** (Hard denies, blocked recipients, unapproved capabilities, safety buffers)
- **HOW MUCH MONEY IS COMMITTED** (Hierarchical liquidity reservations, escrows, pending settlements)
- **WHAT WILL HAPPEN NEXT** (Next expected FSM transition, predictive liquidity forecasts)
- **WHAT FAILED** (Provider timeouts, policy rejections, verification mismatches, network stress)
- **HOW THE SYSTEM RECOVERED** (Dynamic replanning, fallback provider routing, emergency mitigations)
- **WHAT POLICY GOVERNED IT** (Deterministic policy hash, rule-level explainability traces)
- **WHAT LIQUIDITY CONSTRAINTS EXIST** (Safety buffer floor `INV-72`, concentration anomalies `INV-84`)
- **WHAT ACTUALLY SETTLED ON ARC** (Cryptographically verified consensus proofs, transaction hashes, receipts)
- **WHAT THE SYSTEM LEARNED** (Performance drift, counterparty reputation scoring, economic memory)

> **CORE ARCHITECTURAL PRINCIPLE**:  
> *"ONE ECONOMIC SYSTEM. ONE FINANCIAL CONTROL PLANE. ONE AUDITABLE REALITY."*  
> **The Control Tower is NOT a second source of truth.** It contains **zero financial authority**, **zero duplicate ledgers**, and **zero wallet abstractions**. It is a composed read-model and authorized command orchestration plane over existing authoritative domain systems.

---

## 2. Authoritative Source-of-Truth Mapping

To eliminate duplicate state and ensure strict data integrity, every piece of information rendered by the Control Tower maps directly to a single authoritative backend subsystem:

| Domain Concept | Authoritative Subsystem | Storage / Execution Primitive | Invariant Guard |
| :--- | :--- | :--- | :--- |
| **Missions & Swarms** | `economy.MissionService` / `economy.SwarmEngine` | PostgreSQL `missions`, `swarm_tasks` | `INV-S1` - `INV-S8` |
| **Agent Registry & Discovery** | `network.AgentDiscoveryService` | PostgreSQL `agent_network_identities` | `INV-31` - `INV-45` |
| **Contracts & Agreements** | `network.ContractManager` | PostgreSQL `network_contracts` | `INV-33`, `INV-34` |
| **Clearinghouse & Obligations**| `clearinghouse.ClearinghouseService` | PostgreSQL `obligations`, `invoices`, `escrows` | `INV-55` - `INV-70` |
| **Treasury & Liquidity** | `treasury.DefaultTreasuryService` | In-Memory Mutex + PostgreSQL `treasury_states` | `INV-71` - `INV-85` |
| **Constitution & Governance** | `constitution.MemoryStore` | Cryptographic SHA-256 Ruleset Manifest | `INV-46` - `INV-54` |
| **Deterministic Policy** | `policy.Client` (Rust Policy Engine) | Compiled Rust WebAssembly / Native Microservice | Inviolable Hard Deny |
| **Risk & Approvals** | `intent.Service` / `service.DomainService` | PostgreSQL `approval_requests` | Self-Approval Invariant |
| **Payment Intents & Trace** | `intent.Service` / `trace.Service` | PostgreSQL `payment_intents`, `audit_events` | Idempotency Key Guard |
| **Settlement & Arc Consensus** | `execution.Service` / `blockchain.Client` | Arc Blockchain Consensus Layer & `AgentVault.sol` | Cryptographic Receipt |
| **Reconciliation Audit** | `treasury.TreasuryReconciliationEngine` | 4-Way Cross-Layer Audit | `INV-81`, `INV-82` |
| **Intelligence & Replanning** | `economy.IntelligenceService` | PostgreSQL `economic_observations` | Read-Only Inference |
| **Digital Twin Simulation** | `simulation.SimulationEngine` | Isolated Counterfactual Memory State | Strict Mode Isolation |

---

## 3. Composed Read-Model vs Command-Write Architecture

```
                                  CONTROL TOWER UI (Web / SDK / CLI)
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 │                                                                 │
                 ▼ READ PATH                                                       ▼ COMMAND PATH
      [ Control Tower API ]                                             [ Authenticated API Guard ]
      GET /v1/control/*                                                 (RBAC, Idempotency, Session)
                 │                                                                 │
                 ▼                                                                 ▼
      ┌─────────────────────────┐                                       ┌─────────────────────────┐
      │  Composed Read Models   │                                       │   Domain Command Bus    │
      │  (Zero Domain State)    │                                       │  (Rust Policy Checked)  │
      └──────────┬──────────────┘                                       └──────────┬──────────────┘
                 │ Queries                                                         │ Dispatches
                 ▼                                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CANONICAL DOMAIN SERVICES                                           │
│  MissionSvc │ ClearingSvc │ TreasurySvc │ PolicyClient │ IntentSvc │ ExecutionSvc │ BlockchainClient  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### The Read Path
1. The Control Tower requests a composed view (e.g. `GET /v1/control/overview` or `GET /v1/control/missions/:id`).
2. The Control Tower Service executes parallel non-blocking queries against canonical domain services.
3. If an individual service (e.g., Arc RPC) is unreachable, the response returns partial verified data with `UNAVAILABLE` or `UNVERIFIED` tags. **It never fabricates zeros or assumptions**.
4. Read models are strictly read-only and immutable.

### The Command Path
1. Operator triggers an action (e.g. `Pause Agent`, `Approve Request`, `Execute Simulation Plan`).
2. The request enters the authenticated command endpoint.
3. Server-side RBAC verifies that the operator possesses the required role (`OPERATOR`, `APPROVER`, `SECURITY_ADMIN`, `ORG_ADMIN`).
4. Commands re-enter the canonical `PaymentIntent → Policy → Risk → Approval → Treasury → Signer → AgentVault → Arc` pipeline.
5. The UI cannot bypass policy, cannot bypass approvals, and cannot directly call `AgentVault`.

---

## 4. Universal Financial Trace Model

The Universal Financial Trace binds together the entire lifecycle of an autonomous transaction across all layers of the stack:

```
[ USER INTENT / OBJECTIVE ]
            │
            ▼
   [ AUTONOMOUS MISSION ]
            │
            ▼
      [ TASK NODE ]
            │
            ▼
    [ AGENT SELECTION ]  (Why selected vs rejected alternatives)
            │
            ▼
   [ NETWORK CONTRACT ]  (Service terms, price, deadline)
            │
            ▼
 [ CLEARING OBLIGATION ]  (Escrow reservation, milestones)
            │
            ▼
  [ POLICY EVALUATION ]  (Rust policy engine decision: ALLOW / REQUIRE_APPROVAL / DENY)
            │
            ▼
    [ RISK ASSESSMENT ]  (Novelty score, counterparty drift, anomaly check)
            │
            ▼
 [ HUMAN APPROVAL GATE ] (Optional: required only if approval threshold breached)
            │
            ▼
[ TREASURY RESERVATION ] (Atomic pre-encumbrance, safety buffer preservation INV-72)
            │
            ▼
    [ PAYMENT INTENT ]   (Idempotent financial record)
            │
            ▼
 [ EXECUTION DISPATCH ]  (Signer authorization check)
            │
            ▼
  [ AGENTVAULT ON ARC ]  (Smart contract daily limit and paused check)
            │
            ▼
  [ ARC CONSENSUS LAYER] (Cryptographic block confirmation, gas receipt, event logs)
            │
            ▼
   [ 4-WAY RECONCILE ]   (Ledger == Repository == Vault == Blockchain)
            │
            ▼
[ ECONOMIC OBSERVATION ] (Reputation update, latency metric, market learning)
```

Every trace is uniquely identified by a deterministic `trace_id` propagated across HTTP headers, logs, and database records.

---

## 5. Security & Invariant Hierarchy (INV-86 — INV-100)

Task 12 establishes 15 formal machine-checked security invariants:

| Invariant ID | Security Invariant Definition |
| :--- | :--- |
| **`INV-86`** | **Non-Authoritative Control Plane:** Control Tower is never the source of financial truth. |
| **`INV-87`** | **Zero UI Financial Authority:** The frontend cannot directly authorize payment or transfer funds. |
| **`INV-88`** | **Zero Recipient Arbitrary Override:** Frontend cannot alter payment recipients or bypass whitelist. |
| **`INV-89`** | **Inviolable Policy Boundary:** Frontend cannot bypass or disable Rust policy engine rules. |
| **`INV-90`** | **Strict Approval Inviolability:** Frontend cannot bypass required approval gates. |
| **`INV-91`** | **Strict Treasury Reservation:** No execution may proceed without confirmed liquidity reservation. |
| **`INV-92`** | **Strict Simulation Separation:** Simulated transactions cannot be rendered as live Arc settlements. |
| **`INV-93`** | **Visible Stale Indicator:** Financial telemetry with latency $> 30\text{s}$ must be visibly marked `STALE`. |
| **`INV-94`** | **Strict Tenant Isolation:** Cross-organization data leakage is strictly prohibited across all endpoints. |
| **`INV-95`** | **Server-Side Command Authorization:** Operator actions must be cryptographically authenticated server-side. |
| **`INV-96`** | **Command Idempotency:** Destructive actions must supply an idempotency key preventing duplicate execution. |
| **`INV-97`** | **Hard Deny Non-Overridable:** Financial actions rejected with `DENY` cannot expose an `APPROVE` action. |
| **`INV-98`** | **Cryptographic Settlement Truth:** Displayed transaction hashes must link to verified on-chain receipts. |
| **`INV-99`** | **Pure Read Models:** Read-model generation endpoints cannot mutate transactional database state. |
| **`INV-100`**| **Zero Authority Aggregation:** Synthesizing multiple subsystems cannot grant new spending privileges. |

---

## 6. Realtime Architecture & Event Classification

The Control Tower consumes events emitted by the existing `dispatcher.go` and `events.go` infrastructure. Events are classified into 9 operational categories:

1. **`MISSION`**: Mission started, task assigned, task completed, mission failed.
2. **`AGENT`**: Agent registered, manifest updated, capability added, agent suspended.
3. **`ECONOMY`**: Quote requested, quote countered, quote accepted, contract created.
4. **`SECURITY`**: Policy denial, anomaly spike detected, kill switch engaged.
5. **`POLICY`**: Constitution proposed, evaluated, activated, or rolled back.
6. **`TREASURY`**: Headroom reserved, headroom released, reservation consumed, buffer breach risk.
7. **`EXECUTION`**: Payment authorized, transaction broadcast, confirmation received.
8. **`ARC`**: On-chain block confirmed, AgentVault event emitted, RPC re-org detected.
9. **`INTELLIGENCE`**: Performance observation logged, recommendation generated, replan triggered.

Events contain sequence identifiers, aggregate IDs, and timestamps, guaranteeing that arrival order does not corrupt causal state.
