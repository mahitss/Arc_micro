# AgentPay Flagship End-to-End Autonomous Economic Mission: Architecture Audit

**Document:** `docs/flagship-mission-audit.md`  
**Standard:** AgentPay Unified Financial Control Plane Specification  
**Objective:** End-to-End Architecture Audit for the Flagship Autonomous Economic Mission  
**Date:** October 2026  
**Status:** AUDIT COMPLETED — IMPLEMENTATION READY  

---

## 1. Executive Mandate & Objective

The objective of this audit is to inspect all existing subsystem implementations across AgentPay to prove that AgentPay operates as **one coherent financial control plane**.

### Core Story
A user provides AgentPay with an economic objective:
> *"Produce a market intelligence report using the best available autonomous research providers while staying within a fixed economic budget ($25.00 USDC), validating deliverables, and automatically recovering if a provider fails."*

The complete end-to-end lifecycle demonstrates:
```
OBJECTIVE CREATED
  → PLAN GENERATED (DAG)
  → PROVIDER DISCOVERY
  → QUOTE COLLECTION & BENCHMARKING
  → DETERMINISTIC PROVIDER SELECTION
  → POLICY EVALUATION (RUST ENGINE <10µs)
  → RISK EVALUATION
  → APPROVAL GATE
  → TREASURY LIQUIDITY RESERVATION
  → CLEARINGHOUSE OBLIGATION CREATED
  → EXECUTION GATE PRE-FLIGHT
  → SIMULATED DISPATCH
  → PROVIDER FAILURE / SECURITY BLOCK
  → ECONOMIC MEMORY RECORDED
  → REPLANNING ENGINE (BOUNDED VERSION INCREMENT)
  → REVALIDATION (POLICY + RISK + LIQUIDITY)
  → SECOND PROVIDER SELECTION & EXECUTION
  → RESULT VALIDATION (QUALITY & SCHEMA GATE)
  → CLEARINGHOUSE FINALIZATION & NETTING
  → SIMULATED ARC SETTLEMENT
  → OBJECTIVE SATISFIED (BUDGET RETURNED)
```

**Operating Mode:** `SIMULATION — NO FUNDS MOVED`  
- Zero cryptographic key access for AI models (INV-01)  
- Zero on-chain transaction broadcast or private key signing (INV-02)  
- Zero fake Arc hashes, fake blocks, or fake mainnet receipts (INV-92)  
- AgentVault truthfully reported as `NOT DEPLOYED ON MAINNET`  
- Real Arc settlements counter strictly `0`  

---

## 2. Exhaustive Audit of Existing Subsystem Flows

### 2.1 Objective Flow
- **Existing Implementation:** `services/gateway/internal/fabric/service.go`, `models.go`, and `apps/web/src/lib/api/fabric.ts`.
- **How It Works:**
  - `CreateObjective` accepts high-level natural language intent, budget ceiling (`EconomicBudgetUSDC: 25.00`), deadline, required capabilities (`market-intel`, `benchmarking`, `synthesis`), and risk tolerance (`LOW`).
  - Canonical identifier: `obj_market_intel_01`. Status initializes to `DRAFT`.
  - Stored in `FabricStore` (in-memory or persistent PostgreSQL).
  - Provenance tagged as `DEMO FIXTURE` under simulation mode.
- **Authority Boundary:** Creating an objective registers an intent and an upper budget ceiling; it conveys zero signing authority and moves zero funds.

### 2.2 Objective Compiler & Blueprint Flow
- **Existing Implementation:** `services/gateway/internal/fabric/compiler.go` and `validator.go`.
- **How It Works:**
  - `ObjectiveCompiler.Compile(ctx, obj)` decomposes the objective into an immutable `ExecutionBlueprint` (ID: `bp_market_intel_01`).
  - Constructs a 4-stage canonical DAG:
    1. `task_disc`: Discover & Evaluate Service Candidates (Budget: $0.00)
    2. `task_exec`: Primary Work Execution (Budget: $17.50 max single cost)
    3. `task_val`: Validate Deliverable Quality & Result Integrity (Budget: $0.00)
    4. `task_synth`: Synthesize Deliverables & Final Milestone Settlement (Budget: $7.50)
  - Establishes `EconomicEnvelope`: `MaxTotalCostUSDC: 25.00`, `MaxSingleCostUSDC: 17.50`, `MaxParallelExposureUSDC: 12.50`.
  - Computes and binds `PolicyHash`: `pol_hash_validated_v15`.
- **Authority Boundary:** The blueprint defines structural limits and task sequence. Tasks requiring payment cannot execute without subsequent policy and treasury clearances.

### 2.3 Marketplace & Agent Discovery Flow
- **Existing Implementation:** `services/gateway/internal/marketplace/matching.go`, `service.go`, `storage.go`, and `apps/web/src/lib/api/marketplace.ts`.
- **How It Works:**
  - Capability-based lookup discovers verified candidate providers from the service registry:
    - **Provider A (High SLA / CloudGuard):** $4.00 USDC, 2.1s latency, `HIGH` reliability.
    - **Provider B (Cost-Optimized / VigilSec):** $3.60 USDC, 1.8s latency, `MEDIUM` reliability.
    - **Provider C (Ultra Low Latency / Sentinel):** $4.50 USDC, 1.4s latency, `HIGH` reliability.
    - **Malicious Candidate (Adversarial Infiltrator):** Attempted recipient swap or budget escalation ($28.00 USDC).
  - `DeterministicMatching`: Ranks candidates by capability match, price score, and verification method (`FORMAL_PROOF` / `REPRODUCIBLE_CONTAINER`).
  - Initial selection recommends Provider B ($3.60 USDC) as lowest cost satisfying the SLA envelope.
- **Authority Boundary:** Marketplace ranking decides operational eligibility only. It cannot authorize disbursements or execute payments (INV-181).

### 2.4 Constitution & Policy Evaluation Flow
- **Existing Implementation:** `services/policy-engine` (Rust, sub-10 microsecond evaluation), `services/gateway/internal/constitution/evaluator.go`, and `internal/policy/client.go`.
- **How It Works:**
  - Rust engine compiles Genesis Constitution v8 and evaluates 5 core invariant rules:
    1. `ALLOWLIST`: Recipient resolved from trusted service directory.
    2. `PER_TX_LIMIT`: Single-tx cap (<$50.00 USDC; proposed $3.60 passes).
    3. `DAILY_LIMIT`: Organization velocity envelope (<$500.00/day).
    4. `SERVICE_ALLOWED`: Merchant registered with verified capability.
    5. `RECIPIENT_ALLOWED`: Target address is not blacklisted and matches merchant identity.
  - Evaluation latency: 6.36 µs. Emits deterministic decision: `ALLOW`.
- **Authority Boundary:** Policy decisions are authoritative and non-bypassable (INV-89). AI prompts or advisory planner outputs cannot override policy rules.

### 2.5 Risk Engine Flow
- **Existing Implementation:** `services/gateway/internal/clearinghouse/exposure.go`, `services/gateway/internal/treasury/anomalies.go`, and `services/gateway/internal/fabric/execution_gate.go`.
- **How It Works:**
  - Evaluates counterparty concentration, provider credit history, and treasury buffer headroom.
  - Scores Provider B: Composite Risk `18 / 100` (`LOW`), Capital Adequacy Ratio `4.8x` (well above 1.5x minimum floor).
  - Determines whether human approval is required: risk tier `LOW` and transaction $3.60 (< $20.00 human escalation threshold).
- **Authority Boundary:** High risk scores (>40) automatically mandate human-in-the-loop co-signatures or trigger hard stops.

### 2.6 Human Approval Gate Flow
- **Existing Implementation:** `services/gateway/internal/service/domain_service.go`, `services/gateway/internal/execution/gate.go`, and `apps/web/src/app/approvals/page.tsx`.
- **How It Works:**
  - Dual-custody approval thresholds:
    - Tier-1: Auto-approved under constitutional policy (<$20.00 USDC).
    - Tier-2: Requires operator co-signature ($20.00 – $100.00 USDC).
    - Tier-3: Requires dual executive approval (>$100.00 USDC).
  - In the flagship mission, initial sub-task ($3.60) is Tier-1 automated. If escalated, the gate emits `APPROVAL_REQUIRED` and pauses execution until signed.
- **Authority Boundary:** AI agents are strictly prohibited from approving their own payment requests (INV-90).

### 2.7 Treasury & Liquidity Reservation Flow
- **Existing Implementation:** `services/gateway/internal/treasury/orchestrator.go`, `service.go`, and `apps/web/src/lib/api/treasury.ts`.
- **How It Works:**
  - Prior to dispatch, `TreasuryOrchestrator.EncumberLiquidity` atomic mutex locks $3.60 USDC from available buffer into `res_sim_001_b`.
  - Journal entry:
    - `DEBIT`: Uncommitted Available Liquidity (-$3.60 USDC)
    - `CREDIT`: Encumbered Mission Escrow (+$3.60 USDC)
  - Enforces INV-71 (non-negative liquidity), INV-72 (safety buffer preserved), and INV-91 (every execution requires active treasury reservation).
- **Authority Boundary:** Zero execution without active reservation. Money cannot move from unreserved funds.

### 2.8 Clearinghouse & Obligation Flow
- **Existing Implementation:** `services/gateway/internal/clearinghouse/service.go`, `exposure.go`, `netting.go`, and `apps/web/src/lib/api/clearinghouse.ts`.
- **How It Works:**
  - Creates bilateral `EconomicObligation`:
    - Payer: `org_default`
    - Payee: `service_registry:provider-b`
    - Amount: $3.60 USDC
    - Status: `AUTHORIZED`
  - Verifies double-entry ledger balance: Total Debits = Total Credits.
- **Authority Boundary:** Clearinghouse creates obligations and calculates net balances. It does not release funds without verified deliverable quality evidence.

### 2.9 Execution Gate Flow
- **Existing Implementation:** `services/gateway/internal/execution/gate.go` and `services/gateway/internal/fabric/execution_gate.go`.
- **How It Works:**
  - Evaluates 10-point execution safety matrix in deterministic order:
    1. PaymentIntent exists and is valid
    2. Terminal/duplicate check (already confirmed or already executing)
    3. Hard policy denial check (`DENY` is non-executable)
    4. Expiration check
    5. Global emergency pause check
    6. Organization pause check
    7. Agent and Service active status
    8. Human approval check
    9. Treasury reservation lock confirmed
    10. Execution mode check: Mode is `SIMULATION` -> routes to local deterministic simulation driver; blocks live RPC broadcast.
- **Authority Boundary:** In `SIMULATION` mode, execution gate emits `AUTHORIZED (SIMULATION)` with `FUNDS_MOVED: 0.00 USDC`.

### 2.10 Runtime Failure & Security Invariant Enforcement
- **Existing Implementation:** `services/gateway/internal/runtime/lease.go`, `retry.go`, `services/gateway/internal/demo/engine.go`, and `services/gateway/internal/fabric/adaptive.go`.
- **How It Works (The Key Demo Moment):**
  1. **Security Attack Scenario (Recipient Substitution):**
     - Provider B attempts to substitute recipient address with unauthorized external address `0xdead00000000000000000000000000000000beef`.
     - Execution gate detects recipient mismatch against trusted directory allowlist (POL-003, INV-186).
     - Guardrail emits `HARD DENY`: payment blocked, $0.00 moved, reservation revoked.
  2. **Operational Failure Scenario (Heartbeat Timeout / Result Validation Failure):**
     - Provider B fails to deliver valid deliverable within lease window (>2000ms heartbeat timeout).
     - Runtime supervisor fences stale worker (INV-101).
     - Prohibits blind auto-retry on ambiguous worker state (INV-103). Budget remains 100% intact.

### 2.11 Economic Memory & Controlled Replanning Flow
- **Existing Implementation:** `services/gateway/internal/fabric/replanning.go`, `adaptive.go`, and `quality.go`.
- **How It Works:**
  - Failure is logged to isolated simulation memory (Provider B marked `FAILED_TIMEOUT`).
  - Adaptive loop triggers `ControlledReplanner.Replan`:
    - Reason: "Provider B heartbeat timeout; recipient substitution blocked"
    - Increments blueprint version from `v1` to `v2`.
    - Proposes replacement: **Provider C ($4.50 USDC)**.
    - Preserves budget ceiling: Total cost ($4.00 Provider A + $4.50 Provider C = $8.50) is well below $25.00 USDC cap.
    - Sets `PolicyRevalidationRequired: true` and `SimulationStale: true`.
  - **Revalidation Check:** Re-runs Policy (ALLOW), Risk (LOW), and Treasury ($4.50 encumbered in `res_sim_002_c`).
- **Authority Boundary:** Replanning cannot self-increase budget limits (INV-143, INV-148) or bypass approvals (INV-145).

### 2.12 Result Validation & Final Settlement Flow
- **Existing Implementation:** `services/gateway/internal/fabric/quality.go`, `services/gateway/internal/demo/engine.go`, and `apps/web/src/app/control/page.tsx`.
- **How It Works:**
  - Provider C completes research and delivers market intelligence payload.
  - `ResultQualityGate.ValidateDeliverable` performs:
    1. Deliverable completeness check
    2. Cryptographic SHA-256 hash verification (`0x3f8a912e...`)
    3. Critic Agent score validation: `94 / 100` (exceeds 80 threshold)
    4. Required schema fields verified
  - Clearinghouse updates obligation status to `SIMULATED_SETTLED`.
  - Unencumbered budget headroom ($25.00 - $8.50 = $16.50 USDC) is atomically unlocked and returned to treasury available balance.
  - Simulated Arc consensus confirmation on Chain 5042 recorded with `0 REAL FUNDS MOVED`.
  - Objective status transitions to `COMPLETED`.

---

## 3. Identification of Missing Links & Gaps

| Component Area | Current Implementation Status | Gap / Missing Link | Remediation Required |
|---|---|---|---|
| **Control Tower Timeline** | `apps/web/src/app/control/page.tsx` has a static 14-item timeline array. | The canonical flagship mission defined in `services/gateway/internal/demo/engine.go` contains **22 explicit events** capturing discovery, quotes comparison, recipient substitution attack, provider failure, replan proposal, revalidation, and deliverable validation. | Synchronize the Control Tower timeline and deep-dive cards with the full canonical 22-event sequence so `/control` tells the exact complete story. |
| **Demo Replay Page** | `apps/web/src/app/missions/demo/replay/page.tsx` has interactive playback controls. | Interactive stepping on `/missions/demo/replay` does not update the global state or link directly back to `/control` deep-dive inspector. | Connect step state, Why/Why Not reasoning, and ensure bidirectional navigation between `/control` and `/missions/demo/replay`. |
| **Reset Determinism** | Backend has `POST /api/demo/mission/reset` and frontend has `handleResetDemo`. | Reset in some views only reset local state variables without hitting the backend reset endpoint or re-synchronizing cache. | Unify `resetDemoMission()` across both `/control` and `/missions/demo/replay` to guarantee deterministic replay from Step 1. |
| **End-to-End Verification Test** | Unit tests exist in Go (`engine_test.go`) and frontend (`frontend_data_authority.test.mjs`). | No single, unified end-to-end test suite validates all 30 flagship mission assertions from objective creation through replanning and simulated settlement. | Create dedicated flagship mission test suite verifying all 30 invariants. |

---

## 4. Implementation Blueprint (No Duplication)

We will NOT create parallel subsystems, alternate database tables, or redundant state machines. All work will leverage:
1. `services/gateway/internal/demo/engine.go` (authoritative 22-event engine)
2. `services/gateway/internal/fabric` (compiler, gate, replanner, quality gate)
3. `apps/web/src/lib/api/demo.ts` (canonical TypeScript client)
4. `apps/web/src/app/control/page.tsx` (primary executive control tower)
5. `apps/web/src/app/missions/demo/replay/page.tsx` (interactive step-by-step playback)

**Audit Certification:** Architecture audit complete. All 12 subsystem flows mapped. Proceeding to canonical mission execution.
