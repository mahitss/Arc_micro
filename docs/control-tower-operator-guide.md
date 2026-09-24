# AgentPay Autonomous Economic Control Tower — Operator Guide

> **Core Invariant**:  
> *The Control Tower can observe and orchestrate the entire autonomous economy, but it can never invent financial authority.*

---

## 1. Overview & Operational Philosophy

The **AgentPay Control Tower** (`/control`) is the unified mission control plane for autonomous economic systems. It provides real-time observability, executive telemetry, mission DAG visualization, treasury tracking, and human-in-the-loop oversight across swarms of AI agents transacting value.

### The Financial Control Separation
Every action visible in the Control Tower is governed by strict read/write boundaries:
- **Read Path**: The Control Tower consumes read-model aggregations from authoritative domain services (Missions, Clearinghouse, Treasury, Policy Engine, Risk Engine, and Arc Blockchain). The read model is **never** a source of financial truth (INV-86).
- **Command Path**: When an operator issues a command (such as approving a flagged payment or triggering emergency mitigation), the command is forwarded through authenticated APIs where policy and risk engines independently revalidate preconditions before AgentVault can move value (INV-87, INV-95).

---

## 2. Navigation & Interface Architecture

| Route | View Name | Operational Responsibility |
|---|---|---|
| `/control` | **Executive Overview** | Cross-economy health, state strip, KPI counters, and real-time activity stream |
| `/control/missions/[id]` | **Mission Command Center** | Objective tracking, task execution DAG, economic exposure, agent selections & rejected alternatives |
| `/control/approvals` | **Approval Center** | Human-in-the-loop gating for policy- or risk-escalated payment intents |
| `/control/security` | **Security & Policy Center** | Constitution v8 hierarchy, kill switches, KMS/local signer status, and cryptographic invariants |
| `/control/incidents` | **Incident Operations** | Root cause analysis, recovery sequence timeline, and anomaly alerts |
| `/control/intelligence` | **Economic Intelligence** | Autonomous recommendations, performance drift, and forecast calibration |
| `/control/simulator` | **Digital Twin Simulation** | Stress scenario modeling, failure injection, and counterfactual validation |

---

## 3. The Persistent State Strip

At the top of every Control Tower view, the **Economic State Strip** renders the live operational pulse of the five critical subsystems:

```
[TREASURY: HEALTHY]  [POLICY: v8 ACTIVE]  [RISK: NORMAL]  [EXECUTION: LIVE]  [ARC: VERIFIED]
```

1. **Treasury**: `HEALTHY` (ratio > 1.25), `CONSTRAINED` (buffer compressed), or `EMERGENCY` (halt).
2. **Policy**: Active constitution identifier (e.g., `v8 ACTIVE`) with SHA-256 policy hash.
3. **Risk**: Real-time risk composite (`NORMAL`, `ELEVATED`, `CRITICAL`).
4. **Execution**: `LIVE` (real funds and Arc settlement) vs `SIMULATION` (mock execution, zero real funds).
5. **Arc**: `VERIFIED` (blockchain RPC reachable and block height advancing) or `UNVERIFIED` (RPC offline).

---

## 4. Mission Command Center (`/control/missions/[id]`)

The operational heart of AgentPay. When managing an active autonomous mission:

### 4.1 Lifecycle States
- `PLANNING` → `DISCOVERING` → `QUOTING` → `SELECTING` → `EXECUTING` → `VERIFYING` → `WAITING_APPROVAL` → `COMPLETED` (or `RECOVERING` / `FAILED` / `CANCELLED`).

### 4.2 Current & Next Actions
The UI explicitly renders:
- **Current Action**: What the mission is doing right now (e.g., *"Waiting for milestone 2 deliverable checksum from Agent Beta"*).
- **Why & Evidence**: Authoritative backend explanation with cryptographic proof or hash.
- **Next Expected Action**: Deterministic next state (e.g., `RUNNING_VERIFICATION`, `AWAITING_APPROVAL`).

### 4.3 Agent Decision Explainability
Under **Active Providers**, inspect why specific peer agents were hired:
- Why selected: Lowest latency SLA, 99.4% trust score, verified capability match.
- Why alternatives rejected: Agent Gamma rejected due to quote price (+14% above median); Agent Delta rejected due to unverified reputation.

### 4.4 Financial Trace Inspector
Every payment intent inside a mission provides a direct link to the **Universal Financial Trace** (`/trace` or `/v1/control/financial-trace/:id`), showing all 13 contiguous stages:
`User Intent` → `Mission` → `Network` → `Contract` → `Obligation` → `Policy` → `Risk` → `Approval` → `Reservation` → `Payment Intent` → `AgentVault` → `Arc Blockchain` → `Reconciliation` → `Economic Learning`.

---

## 5. Approval Center Procedures

When payments exceed autonomous spending thresholds or trip anomaly detectors:
1. Navigate to `/control/approvals`.
2. Inspect the request: Agent identity, mission objective, requested amount, recipient address, and rule violation summary.
3. **Hard DENY vs Require Approval**:
   - If policy evaluated to `REQUIRE_APPROVAL`, the operator may click **Approve** or **Reject**.
   - If policy evaluated to a hard `DENY`, the **Approve action is strictly disabled** (INV-97). Human operators cannot override hard constitutional boundaries.
4. **Self-Approval Prohibition**: The user who initiated the mission cannot approve their own financial request (INV-48).

---

## 6. Incident Management & Failure Recovery

In the event of network disruption or provider failure:
1. Navigate to `/control/incidents`.
2. Review the incident status (`OPEN`, `INVESTIGATING`, `MITIGATED`, `RESOLVED`).
3. Inspect the automated recovery timeline:
   - Step 1: Provider timeout detected (>10,000ms).
   - Step 2: Intelligence engine flagged SLA degradation.
   - Step 3: Dynamic replanner triggered; secondary verified peer selected.
   - Step 4: Policy revalidated spending bounds.
   - Step 5: Replacement task executed and verified.

---

## 7. Emergency Controls & Kill Switches

Located in `/control/security`:
- **Agent Pause**: Immediately halts all payment reservations for a compromised or misbehaving agent.
- **Organization Pause**: Suspends all autonomous contract executions for the tenant.
- **Global Emergency Stop**: Triggers AgentVault emergency freeze, halting on-chain disbursements.

> [!CAUTION]
> Kill switch operations require secondary confirmation and generate immediate tamper-proof audit events sent via webhooks and persisted to the event log.
