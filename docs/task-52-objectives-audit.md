# TASK 52 — ARCHITECTURE AUDIT: AUTONOMOUS ECONOMIC OBJECTIVES REGISTRY

**Date:** 2026-10-01  
**Target Routes:** `/control/objectives` & `/control/objectives/[id]`  
**System:** AgentPay Autonomous Economic Fabric  

---

## 1. OBJECTIVE DOMAIN SOURCE

The canonical Economic Objective domain model is defined in the Go backend at:
`services/gateway/internal/fabric/models.go`

Key domain entities:
- **`EconomicObjective`**:
  ```go
  type EconomicObjective struct {
      ObjectiveID          string               `json:"objective_id"`
      TenantID             string               `json:"tenant_id"`
      Description          string               `json:"description"`
      Owner                string               `json:"owner"`
      Status               ObjectiveStatus      `json:"status"`
      Constraints          ObjectiveConstraints `json:"constraints"`
      EconomicBudgetUSDC   float64              `json:"economic_budget_usdc"`
      RiskTolerance        string               `json:"risk_tolerance"` // "LOW", "MEDIUM", "HIGH"
      RequiredCapabilities []string             `json:"required_capabilities"`
      ActiveBlueprintID    string               `json:"active_blueprint_id,omitempty"`
      ActiveMissionID      string               `json:"active_mission_id,omitempty"`
      ActiveWorkflowID     string               `json:"active_workflow_id,omitempty"`
      CreatedAt            time.Time            `json:"created_at"`
      UpdatedAt            time.Time            `json:"updated_at"`
  }
  ```
- **Canonical Lifecycle (`ObjectiveStatus`)**:
  - `DRAFT`: Newly created economic intent without compiled plan.
  - `PLANNED`: Compiled by `ObjectiveCompiler` into an `ExecutionBlueprint`.
  - `SIMULATED`: Evaluated through deterministic digital twin simulation.
  - `APPROVED`: Validated through policy and approval governance.
  - `RUNNING`: Pre-flight execution gate passed; active workflow dispatched.
  - `WAITING`: Frozen / paused by operator or awaiting external conditions.
  - `DEGRADED`: Task failure encountered; bounded replanning initiated.
  - `RECOVERING`: Replanned task substitution active.
  - `COMPLETED`: All deliverables verified by quality gate.
  - `FAILED`: Unrecoverable error or policy hard deny.
  - `CANCELLED`: Operator abort.
  - `EXPIRED`: Deadline SLA exceeded.

The frontend domain types in `apps/web/src/lib/api/fabric.ts` map to these canonical definitions.

---

## 2. OBJECTIVE API

The gateway router (`services/gateway/internal/http/router.go` lines 618–651) routes the following endpoints handled by `FabricHandler` (`services/gateway/internal/http/handlers/fabric_handlers.go`):
- `POST /v1/fabric/objectives` & `POST /api/fabric/objectives`: Create new economic objective (supports `?dry_run=true`).
- `GET /v1/fabric/objectives` & `GET /api/fabric/objectives`: List objectives (filtered by `tenant_id`).
- `GET /v1/fabric/objectives/{id}` & `GET /api/fabric/objectives/{id}`: Fetch single objective by ID.
- `POST /v1/fabric/objectives/{id}/plan`: Compile objective into an immutable `ExecutionBlueprint`.
- `POST /v1/fabric/objectives/{id}/simulate`: Run digital twin simulation comparison.
- `POST /v1/fabric/objectives/{id}/start`: Pre-flight gate check and mission dispatch.
- `POST /v1/fabric/objectives/{id}/pause`: Pause active objective (`WAITING`).
- `POST /v1/fabric/objectives/{id}/resume`: Resume paused objective.
- `POST /v1/fabric/objectives/{id}/replan`: Controlled replan under `INV-143` (max 3 replans).
- `POST /v1/fabric/objectives/{id}/cancel`: Abort objective.
- `GET /v1/fabric/objectives/{id}/trace`: Return 18-stage end-to-end causal trace.
- `GET /v1/fabric/objectives/{id}/why`: "Why This" causal explanation.
- `GET /v1/fabric/objectives/{id}/why-not`: "Why Not" rejection explanation.
- `GET /v1/fabric/metrics`: Aggregated autonomy and recovery metrics.

---

## 3. OBJECTIVE STORAGE

- **Persistence Interface:** `FabricStore` (`services/gateway/internal/fabric/storage.go`).
- **Active Implementation:** `MemoryFabricStore` (thread-safe with `sync.RWMutex`).
- **Production Storage Note:** For production persistence, `PostgresFabricStore` maps to Lakebase/Postgres when `DATABASE_URL` is configured. In simulation and development mode, `MemoryFabricStore` satisfies all in-process lifecycle tests.
- **Initial State:** On startup, `MemoryFabricStore` initialized with empty maps, containing 0 initial objectives.

---

## 4. OBJECTIVE COMPILER

- **Implementation:** `ObjectiveCompiler` (`services/gateway/internal/fabric/compiler.go`).
- **Role:** Compiles high-level goals into a deterministic task DAG (`ExecutionBlueprint`):
  1. `task_disc_*`: Discover & evaluate service candidates (`RequiresPayment: false`).
  2. `task_exec_*`: Execute primary objective work (`RequiresPayment: true`, up to 70% budget).
  3. `task_val_*`: Validate deliverable quality & integrity (`RequiresPayment: false`).
  4. `task_synth_*`: Synthesize deliverables & final milestone settlement (`RequiresPayment: true`, up to 30% budget).
- **Hard Boundaries Generated:**
  - `EconomicEnvelope`: `MaxTotalCostUSDC` <= `obj.EconomicBudgetUSDC` (INV-142).
  - `RiskEnvelope`: `MaxRiskScore` constrained by `RiskTolerance` (INV-149).
  - `ResourceEnvelope`: Max workers and timeouts (INV-150).

---

## 5. EXECUTION BLUEPRINT

- Defined in `models.go` as `ExecutionBlueprint`.
- Represents the immutable execution plan compiled from the objective.
- Contains cryptographic hashes (`PolicyHash`, `InputsHash`) ensuring tamper evidence.
- Versioned: starts at `v1`, increments during controlled replanning (`INV-143`).

---

## 6. SIMULATION PATH

- Evaluated via `SimulateObjective` in `services/gateway/internal/fabric/service.go`.
- Auto-compiles if not yet planned.
- Generates deterministic metrics: `ExpectedDuration: 180s`, `ExpectedCostUSDC: budget * 0.75`, `PolicyDecision: ALLOW`, `RiskScore: 24`.
- Marks blueprint and objective as `SIMULATED`.
- **Absolute Safety Invariant:** Zero on-chain transactions broadcast, zero private keys accessed, zero real funds moved (`INV-156`).

---

## 7. MISSION INTEGRATION

- Starting an objective links it to `ActiveMissionID` (`msn_<id>`) and `ActiveWorkflowID` (`wf_<id>`).
- Flagship Mission: `msn_demo_flagship` (the canonical "Autonomous Market Intelligence Mission" specified in `docs/build-first-demo.md` and `apps/web/src/app/control/page.tsx`).
- Bidirectional link preserves traceability between Objective and Mission execution.

---

## 8. RUNTIME INTEGRATION

- Executed by Durable Runtime / Operations OS.
- Enforced by `EconomicExecutionGate` (`services/gateway/internal/fabric/execution_gate.go`):
  - 11-point validation matrix (policy decision `ALLOW`, risk score within envelope, simulation fresh, no stale blueprint).
  - `INV-141`: Objective start leaves financial authority `UNCHANGED`.

---

## 9. CONTROL TOWER INTEGRATION

- Control Tower at `/control` (`apps/web/src/app/control/page.tsx`) renders the canonical 20-step economic lifecycle.
- Step 1 explicitly references:
  `actor: 'Enterprise Operator', domain: 'OBJECTIVES', action: 'OBJECTIVE CREATED', correlationId: 'obj_market_intel_01', details: 'Autonomous Market Intelligence Mission'`.
- The Objectives Registry (`/control/objectives`) must align with this flagship mission.

---

## 10. CURRENT DATA SOURCE

- The frontend calls `fetchObjectives()` (`apps/web/src/lib/api/fabric.ts` line 300).
- The gateway handler `HandleListObjectives` returns `{"objectives": []}` from `MemoryFabricStore`.

---

## 11. ROOT CAUSE OF 0/0

1. **Unseeded Backend Memory Store:**
   `fabric.NewMemoryFabricStore()` starts with an empty map. Neither the gateway bootstrap nor the store pre-seeds the canonical flagship demo objective (`obj_market_intel_01`).
2. **Truthy Fallback Bug in Frontend Client:**
   In `apps/web/src/lib/api/fabric.ts`:
   ```ts
   const res = await apiRequest<{ objectives: EconomicObjective[] }>(`/v1/fabric/objectives${query}`);
   return res.objectives || FALLBACK_OBJECTIVES;
   ```
   When the API responds successfully with `{"objectives": []}`, `res.objectives` is `[]`. In JavaScript, `[]` is truthy, so `[] || FALLBACK_OBJECTIVES` evaluates to `[]`. The fallback array is never used when the backend returns an empty list.
3. **Missing Empty State & Actions on Page:**
   In `apps/web/src/app/control/objectives/page.tsx`:
   When `filtered.length === 0`, it simply renders `Showing 0 of 0 objectives` and an empty `<div>`, providing neither an informative empty state ("NO OBJECTIVES YET") nor an explicit "RUN DEMO OBJECTIVE" launcher.
4. **Field Name Discrepancy:**
   Go backend outputs `economic_budget_usdc` (float) while TypeScript interface expected `economic_budget` (string). Without normalization, budget amounts could render as `undefined USDC`.

---

## 12. REMEDIATION PLAN

1. **Pre-seed Deterministic Flagship Objective in Gateway Memory Store:**
   Seed `obj_market_intel_01` ("Autonomous Market Intelligence", 25.00 USDC cap, SIMULATED status, compiled blueprint, mission reference) into `NewMemoryFabricStore()`.
2. **Normalize API Adapter (`fabric.ts`):**
   - Handle both `res.objectives` and fallback gracefully.
   - Normalize `economic_budget_usdc` / `economic_budget` so values display consistently.
3. **Enhance Objectives Page (`apps/web/src/app/control/objectives/page.tsx`):**
   - When 0 objectives exist: display "NO OBJECTIVES YET" empty state with "+ NEW OBJECTIVE" and "RUN DEMO OBJECTIVE" actions.
   - Add summary metrics bar: `TOTAL OBJECTIVES`, `ACTIVE / RUNNING`, `SIMULATED`, `COMPLETED`, `BUDGET CEILING`.
   - Add clear provenance badge on cards: `DEMO FIXTURE · SIMULATION (NO FUNDS MOVED)`.
   - Wire "RUN DEMO OBJECTIVE" to deterministically trigger/load the flagship objective lifecycle.
   - Wire "+ NEW OBJECTIVE" modal to submit cleanly to the API.
   - Add loading/disabled states to prevent double submission.
4. **Verify Detail View (`apps/web/src/app/control/objectives/[id]/page.tsx`):**
   - Ensure the detail page loads without crashing, displaying execution blueprint, simulation results, risk envelope, and trace.
5. **Cross-Page Consistency & Tests:**
   - Confirm consistency between `/control`, `/control/objectives`, `/missions`, `/activity`, `/marketplace`, and `/economy`.
   - Add automated test suite verifying all invariants.
