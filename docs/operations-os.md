# AgentPay Autonomous Operations OS Specification

## 1. Overview & Architectural Vision

The **AgentPay Autonomous Operations OS** is the supervisory and orchestration layer positioned directly above the durable workflow runtime. As AgentPay scales from dozens to thousands of concurrently executing autonomous economic agents, swarms, and multi-step missions, the Operations OS coordinates the entire distributed execution fleet as a single, deterministic, observable, and self-healing system.

### Core Principle
> **THE OPERATIONS OS MAY ORCHESTRATE COMPLEXITY. IT MUST NEVER ORCHESTRATE AROUND FINANCIAL CONTROLS.**

The Operations OS answers continuously and deterministically:
- What should execute now?
- What is blocked by policy, approvals, or treasury liquidity?
- What is waiting for external events or callbacks?
- What failed, and what can safely self-heal?
- What resources (workers, slots, API rate limits) are available?
- What policies and economic constraints govern the current action?
- What changed, and why was every operational decision made?

---

## 2. System Architecture & Domain Model

```
                CONTROL TOWER
                      │
             OPERATIONS OS
                      │
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
   WORKFLOWS       MISSIONS        SWARMS
       ↓              ↓              ↓
     AGENTS         TASKS         AGENTS
       └──────────────┼──────────────┘
                      ↓
               ECONOMIC SYSTEM
                      ↓
          POLICY / RISK / TREASURY
                      ↓
              PAYMENT PIPELINE
                      ↓
                   ARC
```

### The Operations Domain Boundary
The Operations OS strictly supervises operational scheduling. It **never** replaces authoritative domain engines:
1. **Financial Authority**: Stored solely in authoritative domain systems (`PaymentIntent`, `Treasury`, `PolicyEngine`, `Clearinghouse`, `AgentVault`).
2. **Untrusted AI / Agents**: No autonomous agent or LLM supervisor receives private keys, signer access, arbitrary calldata generation authority, or limit mutation authority.
3. **Derived Read Models**: Operational projections (`OperationsSnapshot`, `OperationalGraph`, `OperationsHealth`) are derived views; they cannot authorize money movement.

---

## 3. Machine-Checked Security Invariants (INV-121 - INV-140)

The Operations OS enforces twenty formal, machine-checked invariants:

| Invariant | Name | Guarantee |
|---|---|---|
| **INV-121** | Zero Financial Authority | The operations supervisor and decision engine cannot authorize money movement or override domain state. |
| **INV-122** | Priority Subservience | Operational priority cannot override policy or bypass denial. |
| **INV-123** | Approval Integrity | Operational recovery cannot bypass human authorization or approval requirements. |
| **INV-124** | Treasury Reservation Gate | Operational recovery cannot bypass treasury reservation locks. |
| **INV-125** | Hard Deny Non-Recoverability | Hard policy denial (`DENY`) cannot be recovered, retried, or bypassed. |
| **INV-126** | Tenant Queue Isolation | Multi-tenant queue items remain strictly segregated; cross-tenant claiming is rejected. |
| **INV-127** | Tenant Capacity Isolation | Worker allocations for one tenant can never inspect, bleed into, or expose another tenant's workload. |
| **INV-128** | Auditable Dead-Lettering | Dead-letter items must record complete attempt history, failure evidence, and original payloads. |
| **INV-129** | Read-Only Replay | Workflow replay is strictly read-only; execution side-effects during replay are physically impossible. |
| **INV-130** | Immutable Time-Travel | Historical state reconstruction at timestamp $T$ freezes financial states and prohibits mutation. |
| **INV-131** | Policy Immutability | Operational plans and supervisor decisions cannot mutate constitutional policy rules. |
| **INV-132** | Circuit Breaker Invariance | Circuit breaker state trips (`OPEN`) can stop new work but cannot invent financial authority. |
| **INV-133** | Immutable Core Controls | Load shedding cannot shed financial reconciliation, audit logs, or security invariants. |
| **INV-134** | Visible Freshness | Stale operational projections must be visibly flagged (`STALE`, `DEGRADED`, `UNKNOWN`). |
| **INV-135** | Zero Arc Fabrication | Arc RPC connectivity does not equal verified on-chain contract deployment (`NOT VERIFIED / NOT DEPLOYED`). |
| **INV-136** | Cryptographic Causal Integrity | Causal traces cannot fabricate evidence; every causal edge requires authoritative parent event references. |
| **INV-137** | Operator Authorization | Operator commands (pause, resume, retry, reconcile) require authenticated credentials and audit trails. |
| **INV-138** | Bounded Retry Storms | Retry attempts are strictly capped; retry storms cannot trigger cascading DDoS against providers. |
| **INV-139** | Bounded Recovery Loops | Workflow self-healing cycles are finite; failure to recover escalates to dead-letter storage. |
| **INV-140** | Budget Isolation | Operational budgets (CPU, concurrency slots) cannot increase financial spending budgets. |

---

## 4. Subsystem Coordination

- **Supervisor Loop**: Periodically scans active workflows, reconciles lease expiries, probes health, and updates operational read projections.
- **Deterministic Decision Engine**: Classifies pending steps into `RUN`, `WAIT`, `RETRY`, `RECOVER`, `REPLAN`, `ESCALATE`, `PAUSE`, `CANCEL`, or `RECONCILE`.
- **Durable Multi-Queue System**: 8 specialized queues (`mission`, `swarm`, `task`, `recovery`, `reconciliation`, `callback`, `scheduled`, `incident`) with visibility leases and exponential backoff.
- **Circuit Breaker Registry**: Tracks provider and agent failure ratios across sliding windows, safely tripping `OPEN` to prevent cascading failures.
- **Incident Correlation Engine**: Groups concurrent downstream failures from a single root-cause into a unified operational incident.
- **Time-Travel & Causal Graph**: Enables forensic analysis of workflow history with parent event links (`caused_by_event_id`).
