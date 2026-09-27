# TASK 39 — AGENTPAY DEMO & MISSION REPLAY AUDIT
## Phase 0 Inspection of Existing Demo, Simulator, and Economic Systems

$$\text{AUDIT POSTURE: ZERO FINANCIAL AUTHORITY EXPANSION}$$
$$\text{MODE: SIMULATION — NO FUNDS MOVED}$$
$$\text{CORE THESIS: AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.}$$

---

## 1. Executive Summary

This audit inspects the current demo, simulation, mission orchestration, and audit infrastructure across the AgentPay codebase prior to implementing **Task 39: Autonomous Mission Replay Engine**.

The objective is to avoid creating parallel or conflicting simulation engines. We inspect:
- The Gateway Economic Fabric and Mission services (`services/gateway/internal/fabric`, `services/gateway/internal/economy`)
- Existing demo automation scripts (`scripts/demo_run_mission.ps1`)
- CLI demo runners (`packages/cli/src/index.ts`)
- TypeScript SDK resources (`packages/sdk-typescript/src/resources/`)
- Existing web demo pages (`apps/web/src/app/demo/`, `apps/web/src/app/missions/`, `apps/web/src/app/control/`)
- The Rust Policy Engine (`services/policy-engine/src/`)

---

## 2. Existing Demo & Simulation Implementations

### 2.1 Backend: Gateway Economic Fabric & Mission Architecture
- **Location:** [`services/gateway/internal/fabric/`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/fabric/)
- **Core Entities:**
  - `EconomicObjective`: High-level intent bound by immutable `ObjectiveConstraints` (25.00 USDC cap, deadline, low risk).
  - `ExecutionBlueprint`: Immutable DAG plan containing tasks, agent assignments, and 3 cryptographic envelopes (`EconomicEnvelope`, `RiskEnvelope`, `ResourceEnvelope`).
  - `UnifiedEconomicTrace`: 18-stage end-to-end trace from human intent to unbroadcast simulated settlement.
  - `WhyThisExplanation` & `WhyNotExplanation`: Deterministic justification engines separating selection criteria from hard-denial security barriers.
- **Invariants Enforced:**
  - `INV-141`: Fabric components cannot expand financial authority.
  - `INV-143`: Replan cost cannot exceed remaining budget envelope.
  - `INV-146`: Unauthorized recipient substitution triggers deterministic `HARD_DENY`.
  - `INV-148`: Economic envelope cannot self-escalate.
  - `INV-156`: Simulation cannot broadcast transactions or mutate on-chain state.

### 2.2 Automation Script: `scripts/demo_run_mission.ps1`
- **Location:** [`scripts/demo_run_mission.ps1`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/scripts/demo_run_mission.ps1)
- **Flow:** Executes a 20-step lifecycle against live Go Gateway (`:8080`) and Rust Policy Engine (`:8081`):
  1. `POST /v1/fabric/objectives` (Create 25 USDC Market Intel Objective)
  2. `POST /v1/fabric/objectives/{id}/plan` (DAG compilation)
  3. `POST /v1/fabric/objectives/{id}/simulate` (Digital twin risk check)
  4. `POST /v1/fabric/objectives/{id}/start` (Pre-flight gate)
  5. `POST /v1/fabric/objectives/{id}/replan` (Provider failure -> replacement)
  6. `GET /v1/fabric/objectives/{id}/trace` (18-node audit trace)
  7. `GET /v1/fabric/objectives/{id}/why` and `why-not` (Selection and denial rationale)

### 2.3 CLI Demo Command: `packages/cli/src/index.ts`
- **Location:** [`packages/cli/src/index.ts`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/packages/cli/src/index.ts)
- **Current Commands:**
  - `agentpay demo mission`: Outputs 20 canonical lifecycle steps with budget and simulation disclaimers.
  - `agentpay demo security`: Evaluates 8 deterministic attack vectors (Recipient Substitution, Budget Escalation, Policy Modification, Arbitrary Calldata, Payment Outside Quote, Replay Attack, Duplicate Settlement, Forged Completion Checksum).

### 2.4 Web Demo & Mission Pages
- **Location:** [`apps/web/src/app/demo/`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/apps/web/src/app/demo/), [`apps/web/src/app/missions/`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/apps/web/src/app/missions/)
- **Current State:**
  - `/demo`: Interactive step-by-step runner with `HAPPY_PATH`, `DENIAL_PATH`, and `UNAUTHORIZED_RECIPIENT`.
  - `/demo/economic-fabric`: Multi-step interactive flow with manual fault injection and security attack modal.
  - `/missions`: Mission list and creation form.
  - `/control`: Task 38 flagship Control Tower with system status, 14-step Live Economic Timeline, "WHY / WHY NOT" panel, and 8 blocked attack vector cards.

---

## 3. Reusable Assets & Capabilities

| Subsystem | File / Component | Reusable Capability |
| :--- | :--- | :--- |
| **Design System** | `apps/web/src/components/ui/` | `AgentPayCard`, `AgentPayBadge`, `AgentPayMetric`, `AgentPayPanel`, `AgentPayInspector`, `AgentPayFeedback` |
| **Global Shell** | `apps/web/src/components/GlobalTopBar.tsx`, `AgentPaySidebar.tsx` | Mode banner (`SIMULATION — NO FUNDS MOVED`), command palette, persistent navigation |
| **Fabric Engine** | `services/gateway/internal/fabric/` | DAG compilation, simulation, replanning without authority expansion, unified traces |
| **Policy Engine** | `services/policy-engine/src/` | Sub-millisecond deterministic policy evaluation, allowlist check, velocity check |
| **Security Proving Ground** | `packages/cli/src/index.ts`, `demo/economic-fabric/page.tsx` | 8 canonical attack vectors and formal invariant proofs (`INV-146`, `INV-148`, etc.) |

---

## 4. Missing Capabilities Required for Task 39

1. **Deterministic 21-State Mission State Machine:**
   Need formal enforcement of:
   `CREATED` $\to$ `PLANNING` $\to$ `DISCOVERING` $\to$ `QUOTING` $\to$ `SELECTING` $\to$ `NEGOTIATING` $\to$ `POLICY_CHECK` $\to$ `RISK_CHECK` $\to$ `APPROVAL_CHECK` $\to$ `TREASURY_RESERVATION` $\to$ `EXECUTING` $\to$ `PROVIDER_FAILURE` $\to$ `SECURITY_BLOCK` $\to$ `REPLANNING` $\to$ `RECOVERY` $\to$ `VALIDATING` $\to$ `SYNTHESIS` $\to$ `CLEARING` $\to$ `SETTLEMENT_READY` $\to$ `COMPLETED` $\to$ `FAILED`.

2. **Canonical 22-Event Timeline Model:**
   Events with standardized schema:
   `event_id`, `mission_id`, `timestamp`, `state`, `actor`, `action`, `status`, `amount`, `currency`, `correlation_id`, `causation_id`, `source`, `simulation/live`, `metadata`.

3. **Flagship Scenario Coherence:**
   - Single canonical scenario: `AUTONOMOUS MARKET INTELLIGENCE`
   - Fixed budget: `25.00 USDC`
   - Deterministic seed: `agentpay-demo-001`
   - Agents: `Research Agent`, `Market Data Agent`, `Analysis Agent`, `Critic Agent`, `Synthesis Agent`
   - Providers: `Provider A ($4.00)`, `Provider B ($3.60)`, `Provider C ($4.50)`, `Malicious Provider`
   - Malicious attack: Recipient substitution (`attacker-wallet` vs `registry:provider-b`) $\to$ `HARD_DENY` (0 funds moved).
   - Provider failure: Provider B timeout $\to$ replan to Provider C (+$0.90) with 0 authority expansion.
   - Clearing: Obligations (Provider A $4.00, Provider B $3.60 BLOCKED/NOT SETTLED, Provider C $4.50).
   - Final totals: Authorized $8.50, Blocked $3.60, Remaining $16.50.

4. **Dedicated Interactive Replay Interface (`/missions/demo/replay`):**
   - Transport controls: `PLAY`, `PAUSE`, `STEP`, `RESTART`, `SPEED` (0.5x, 1x, 2x), `SKIP TO EVENT`.
   - Synchronized right-side contextual inspector with "WHY?" and "WHY NOT?" sections.
   - Three dedicated traces: Economic Trace, AI Trace, Financial Authority Trace.
   - JSON export for auditability.

5. **Shared Scenario Engine between Gateway API, CLI, and Web UI:**
   - Gateway endpoints: `/api/demo/mission`, `/api/demo/mission/reset`, `/api/demo/mission/start`, `/api/demo/mission/pause`, `/api/demo/mission/step`, `/api/demo/mission/events`, `/api/demo/mission/trace`.
   - CLI flags: `agentpay demo mission [--reset|--json|--step|--replay]`.
   - Web UI consumes the exact same data structures.

6. **Control Tower Flagship Integration:**
   - Active Demo widget on `/control` displaying real-time phase, current event, and direct link to `/missions/demo/replay`.

---

## 5. Implementation Roadmap

1. **Shared Scenario Model (`packages/cli`, `services/gateway`, `apps/web`):**
   Implement the canonical scenario definition with seed `agentpay-demo-001`.
2. **Gateway API Handler (`services/gateway/internal/http/handlers/demo_handlers.go`):**
   Provide `/api/demo/mission` state machine, step controller, events, and trace endpoints.
3. **CLI Enhancement (`packages/cli/src/index.ts`):**
   Add `--reset`, `--step`, `--replay`, `--json` flags to `agentpay demo mission` using the canonical scenario.
4. **Web UI Replay Engine (`apps/web/src/app/missions/demo/replay/page.tsx`):**
   Build the flagship 60fps replay UI with transport controls, timeline scrubber, synchronized inspector, traces, and demo banner.
5. **Control Tower Demo Component:**
   Embed active demo status card in `/control`.
6. **Tests & Invariants:**
   - 100-run determinism test
   - 15 security invariant tests
   - Chaos fault injection test
   - Full regression test across Go, Rust, TypeScript SDK, and Web.
