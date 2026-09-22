# AgentPay Autonomous Economy Engine — Architecture & Specification

## 1. Executive Summary & Vision

AgentPay was originally conceived and hardened as a programmable financial control plane for autonomous AI agents ("AI requests → AgentPay controls → Arc settles"). Under this paradigm, agents could request single payments subject to strict deterministic policy, risk limits, and approval workflows.

The **AgentPay Autonomous Economy Engine** transforms AgentPay from a payment gateway into a complete **autonomous economic operating system**. In this expanded paradigm, autonomous agents do not simply submit one-off payment requests—they autonomously:
1. **Receive High-Level Economic Objectives**: Formulated as structured *Missions* (e.g. "Acquire real-time orderbook depth and verify satellite weather telemetry under a $5.00 budget ceiling").
2. **Decompose Objectives into Capability Steps**: Deterministic planning translates abstract intent into ordered, budget-capped capability requirements.
3. **Discover Service Providers**: Query the central `ServiceRegistry` for vetted external APIs and peer autonomous agents.
4. **Solicit Binding Cryptographic Quotes**: Request time-bound pricing commitments with authoritative server-resolved settlement recipients.
5. **Score & Rank Candidates Deterministically**: The `EconomyEngine` evaluates candidates using a multi-factor mathematical utility model without floating-point arithmetic.
6. **Execute Payments Exclusively via AgentPay**: Every payment proposal enters the canonical `PaymentIntent` pipeline (`Policy Engine` → `Risk Engine` → `Approval Gate` → `Treasury` → `Signer` → `AgentVault` → `Arc Settlement`).
7. **Defend Against Adversarial Payloads**: External service outputs are treated as completely untrusted data, preventing prompt injections from modifying budgets, policies, or recipients.
8. **Record Economic Memory**: Historical outcomes calibrate provider reputation without ever granting reputation the authority to bypass policy.

---

## 2. Core Invariants & Security Boundaries

The fundamental tenet of AgentPay is that **an LLM is never given financial authority**. The agent proposes; the deterministic engine authorizes; Arc settles.

```
       +---------------------------------------------+
       |           Autonomous AI Agent               |
       |  (Formulates intent, proposes step actions) |
       +---------------------------------------------+
                              |
                     [PROPOSAL ONLY]
                              v
       +---------------------------------------------+
       |         AgentPay Economy Engine             |
       |   * Mission State Machine (15 states)       |
       |   * Deterministic Capability Planner        |
       |   * Mathematical Utility Scoring (BPS)      |
       |   * 12-Point Pre-Payment Checklist          |
       +---------------------------------------------+
                              |
                 [CANONICAL PAYMENT PROPOSAL]
                              v
======================= TRUSTED SECURITY BOUNDARY =======================
       +---------------------------------------------+
       |            PaymentIntent Pipeline           |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |      Deterministic Rust Policy Engine       |
       |    (Per-tx limits, daily spend, whitelist)  |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |             Risk Engine & Scoring           |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |        Human Approval Gate (if required)    |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |           Treasury Balance Lock             |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |          Signer & Execution Gate            |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |           AgentVault Smart Contract         |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |             Arc Network Settlement          |
       |           (Native USDC, Chain ID 5042)      |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |         Domain Events & Audit Outbox        |
       +---------------------------------------------+
```

### Security Invariants Table

| Invariant ID | Name | Description |
| :--- | :--- | :--- |
| **INV-E1** | Mission Budget Cap | Mission total spend can never exceed the mission budget ceiling. |
| **INV-E2** | Agent Daily Limit | Agent cumulative spend across missions can never exceed daily configured policy limit. |
| **INV-E3** | Zero LLM Financial Authority | LLM reasoning cannot directly sign, authorize, or broadcast transactions. |
| **INV-E4** | Untrusted Service Boundary | External service output cannot modify policies, budgets, recipients, or authorizations. |
| **INV-E5** | Authoritative Recipient Binding | Service recipients are server-resolved from the registry and cannot be injected. |
| **INV-E6** | Absolute Policy DENY | A hard DENY from the Rust policy engine cannot be overridden by score, reputation, or agent. |
| **INV-E7** | Approval Subordination | Human approval can approve `APPROVAL_REQUIRED`, but can never override a hard `DENY`. |
| **INV-E8** | Zero Simulation Broadcast | Dry-run simulations strictly set `SIMULATION_ONLY: true` and execute zero transactions. |
| **INV-E9** | Step Idempotency | Concurrent or duplicate step execution calls cannot result in duplicate payments. |
| **INV-E10** | Cross-Org Isolation | An organization can never access, query, or leak another organization's economic data. |
| **INV-E11** | Direct Vault Immunity | Agents possess no private keys and cannot directly call `AgentVault` contracts. |
| **INV-E12** | Single Payment Pipeline | All payments without exception must traverse the canonical AgentPay authorization pipeline. |

---

## 3. Mission State Machine Lifecycle

Missions adhere to a strict 15-state deterministic finite state machine. Invalid transitions are rejected at the domain boundary:

```
[CREATED] ──> [PLANNING] ──> [DISCOVERING] ──> [EVALUATING] ──> [SELECTING]
                                                                     │
  ┌──────────────────────────────────────────────────────────────────┘
  │
  ├─> [AWAITING_APPROVAL] ──> [EXECUTING]
  │                                │
  └────────────────────────────────┼─> [WAITING_FOR_RESULT] ──> [EVALUATING_RESULT]
                                                                        │
  ┌─────────────────────────────────────────────────────────────────────┘
  │
  ├─> [CONTINUING] ──> [DISCOVERING] (next step)
  │
  ├─> [COMPLETED]           (terminal)
  ├─> [FAILED]              (terminal)
  ├─> [CANCELLED]           (terminal)
  ├─> [BUDGET_EXHAUSTED]    (terminal)
  └─> [EXPIRED]             (terminal)
```

Transitions are verified by `statemachine.ValidateTransition(from, to)`. Any attempt to skip states (such as jumping directly from `CREATED` to `EXECUTING` or modifying a terminal state) returns `ErrInvalidTransition`.

---

## 4. Multi-Factor Economic Selection Engine

Candidate services are ranked using scaled integer arithmetic (basis points $0 \le x \le 10,000$). Floating-point arithmetic is strictly prohibited to guarantee mathematical determinism across heterogeneous host architectures.

### Utility Scoring Formula
$$\text{Utility Score} = C_{\text{qual}} + C_{\text{rel}} + C_{\text{rep}} + C_{\text{lat}} - C_{\text{price}} - C_{\text{risk}}$$

Where each contribution is calculated as:
* $C_{\text{qual}} = \frac{\text{QualityBps} \times W_{\text{qual}}}{10000}$
* $C_{\text{rel}} = \frac{\text{ReliabilityBps} \times W_{\text{rel}}}{10000}$
* $C_{\text{rep}} = \frac{\text{ReputationBps} \times W_{\text{rep}}}{10000}$
* $C_{\text{lat}} = \frac{\text{LatencyScoreBps} \times W_{\text{lat}}}{10000}$
* $C_{\text{price}} = \frac{\text{PriceScoreBps} \times W_{\text{price}}}{10000}$
* $C_{\text{risk}} = \frac{\text{RiskScoreBps} \times W_{\text{risk}}}{10000}$

### 5-Stage Deterministic Tie-Breaking
If two candidate quotes produce identical utility scores, the tie is broken strictly in the following order:
1. **Utility Score** (higher is better)
2. **Quoted Price** (lower is better)
3. **Historical Reliability** (higher basis points is better)
4. **Estimated Latency** (lower milliseconds is better)
5. **Lexicographical Service ID** (stable alphabetical order)

Randomness is never used. Identical inputs will produce the exact same ranking on any machine at any time.

---

## 5. Twelve-Point Pre-Payment Verification Checklist

Before any payment proposal is submitted to the canonical `PaymentIntent` pipeline, the `BudgetController` evaluates the 12-point checklist:

1. **Mission Exists**: Mission ID exists in the database.
2. **Mission Active**: Mission status is non-terminal (`PLANNING`, `DISCOVERING`, `EVALUATING`, `SELECTING`, `EXECUTING`).
3. **Agent Active**: Initiating agent is marked `ACTIVE`.
4. **Organization Active**: Enclosing organization is in `ACTIVE` state.
5. **Budget Available**: Total mission spend + requested amount $\le$ mission budget (INV-E1).
6. **Transaction Limit**: Requested amount $\le$ agent's per-transaction limit.
7. **Step Budget Ceiling**: Requested amount $\le$ step's planned budget cap.
8. **Service Whitelist**: Service category and ID are permitted by policy.
9. **Authoritative Recipient**: Recipient address matches the server-resolved registry record (INV-E5).
10. **Deterministic Policy Approval**: Rust policy engine returns `ALLOW` or `APPROVAL_REQUIRED` (INV-E6).
11. **Risk Scoring Threshold**: Risk score does not exceed organization safety thresholds.
12. **Treasury Reservation**: Vault treasury has sufficient unencumbered balance.

---

## 6. Architecture Directory & Component Mapping

| Subsystem | Location | Description |
| :--- | :--- | :--- |
| **Domain Models & FSM** | `services/gateway/internal/economy/models.go`, `statemachine.go` | 15-state machine, mission, step, quote, and reputation structures |
| **Capability Planner** | `services/gateway/internal/economy/planner.go` | Decomposes objective into budget-capped capability steps |
| **Selection Engine** | `services/gateway/internal/economy/engine.go` | Pure integer multi-factor utility scoring and 5-stage tie-breaking |
| **Budget Controller** | `services/gateway/internal/economy/budget.go` | Enforces the 12-point pre-payment verification checklist |
| **Economic Memory** | `services/gateway/internal/economy/reputation.go` | Org-isolated tracking of volume, latency, and success rates |
| **Untrusted Boundary** | `services/gateway/internal/economy/untrusted.go` | 1MB payload cap, sanitization, and prompt injection defense |
| **Peer Agent Commerce** | `services/gateway/internal/economy/agent_service.go` | Agent-to-agent capability discovery and enforced payment routing |
| **Dry-Run Simulator** | `services/gateway/internal/economy/simulator.go` | Projections with zero signing, broadcasting, or state mutation |
| **Mission Service** | `services/gateway/internal/economy/service.go` | 24-step autonomous orchestrator, idempotency, and audit logging |
| **Web Console** | `apps/web/src/app/missions/`, `/marketplace/`, `/economy/`, `/trace/` | Modern dark-mode interface for monitoring and flight recording |
