# Task 45 — Missions Page API Failure & Simulation Flow Fix Report

## Executive Summary
This document provides the resolution and verification report for **TASK 45 — MISSIONS PAGE API FAILURE + SIMULATION FLOW FIX**.

The issue where `/missions` displayed `Error: Failed to fetch` while Gateway was running has been completely identified, resolved, and verified across all layers: Gateway CORS headers, Next.js reverse proxy rewrite, frontend client error handling, telemetry unavailable detection, and simulation result property alignment.

---

## 1. Root Cause Analysis

### Original Failing Request
- **Method**: `GET`
- **Path**: `/v1/missions`
- **Origin**: `http://localhost:3001`
- **Target URL**: `http://localhost:8080/v1/missions`

### Failure Reason
1. **CORS Origin Omission**: The Go Gateway's `config.go` defaulted `CORSAllowedOrigins` strictly to `[]string{"http://localhost:3000"}`. Because port `3000` was previously occupied, the frontend dev server ran on port `3001`. Gateway's CORS middleware checked `originsMap["http://localhost:3001"]`, which evaluated to `false`. Consequently, Gateway omitted the `Access-Control-Allow-Origin` header in its HTTP responses.
2. **Browser CORS Blocking**: When the browser saw the response without `Access-Control-Allow-Origin: http://localhost:3001`, the browser security sandbox blocked JavaScript from accessing the payload and threw `TypeError: Failed to fetch`.
3. **Frontend Presentation**: The frontend caught the error, extracted `err.message` (`Failed to fetch`), and displayed `Error: Failed to fetch` with zeroed-out telemetry cards.
4. **Field Mapping Discrepancy**: The simulator endpoint `POST /v1/missions/simulate` returned `projected_spend`, `approval_required`, and `selected_quote_price`, while the page was reading `total_projected_spend`, `requires_human_approval`, and `quoted_price`, causing evaluated simulation figures to render as `$0.00`.

---

## 2. Changes Made

### A. Go Gateway Backend
1. **`services/gateway/internal/config/config.go`**:
   - Expanded default CORS allowed origins to include all standard local development ports:
     - `http://localhost:3000`
     - `http://localhost:3001`
     - `http://127.0.0.1:3000`
     - `http://127.0.0.1:3001`
2. **`services/gateway/internal/http/middleware/cors.go`**:
   - Added dynamic localhost origin detection (`isLocalhost`) so developer port shifts never fail CORS in development.
   - Added `Idempotency-Key` and `Accept` to `Access-Control-Allow-Headers`.
   - Added `PUT` and `DELETE` to `Access-Control-Allow-Methods`.

### B. Next.js Web Frontend & Proxy
1. **`apps/web/next.config.mjs`**:
   - Added reverse proxy rewrite: `{ source: '/v1/:path*', destination: 'http://localhost:8080/v1/:path*' }`.
   - Enables both direct CORS-enabled access and same-origin proxy access.
2. **`apps/web/src/lib/api/client.ts`**:
   - Formatted actionable network error message when Gateway is unreachable:
     `Unable to connect to AgentPay Gateway at http://localhost:8080. Ensure backend service is reachable.`
3. **`apps/web/src/lib/api/types.ts`**:
   - Aligned `SimulatedMissionStep` and `MissionSimulationResponse` to support both backend properties (`projected_spend`, `approval_required`, `selected_quote_price`, `candidates_found`) and legacy frontend properties.
4. **`apps/web/src/app/missions/page.tsx`**:
   - **Professional Error State**: Replaced raw `Error: Failed to fetch` with the `MISSION SERVICE UNAVAILABLE` panel featuring safe endpoint information, simulation status, and a `Retry Connection` button.
   - **Telemetry Provenance**: Displays `—` and `DATA UNAVAILABLE` when backend data is unreachable, instead of ambiguous hardcoded zeros.
   - **Form Actions & States**: Separated `isCreating` and `isSimulating` loading states, preventing double clicks and displaying `CREATING...` / `SIMULATING...`.
   - **Simulation Preview**: Accurately computes and formats projected spend, approval requirement, candidate count, and evaluated steps with explicit `SIMULATION — NO FUNDS MOVED` badge.
   - **Creation Success**: Displays success notification linking directly to the canonical `/missions/${createdMission.id}` route.
5. **`apps/web/src/__tests__/missions_api_consistency.test.mjs`**:
   - Created 14 automated unit tests covering base URL resolution, empty roster, network errors, HTTP 500 handling, validation, simulation mappings, and zero-broadcast safety.

---

## 3. Subsystem Status & Verification

| Subsystem | Status | Verification Detail |
| :--- | :--- | :--- |
| **Frontend** | `HEALTHY` | Renders on `http://localhost:3001/missions` with 200 OK |
| **Gateway** | `HEALTHY` | Running on port `8080`, verified via `/health` (200 OK) |
| **CORS Preflight** | `VERIFIED` | `OPTIONS /v1/missions` with Origin `3001` returns `Access-Control-Allow-Origin: http://localhost:3001` |
| **Same-Origin Proxy** | `VERIFIED` | `GET http://localhost:3001/v1/missions` returns `200 OK` |
| **Simulation Endpoint** | `VERIFIED` | `POST /v1/missions/simulate` returns `200 OK` (`simulation_only: true`) |
| **Create Mission Endpoint** | `VERIFIED` | `POST /v1/missions` returns `201 Created` with full plan |
| **Mission Roster** | `VERIFIED` | Correctly lists active and created missions |
| **Zero-Broadcast Guard** | `ENFORCED` | Simulation never signs, broadcasts, or moves funds |

---

## 4. Test & Build Results

### Web Unit Test Suite
```
ℹ tests 289
ℹ suites 103
ℹ pass 289
ℹ fail 0
ℹ duration_ms 1529.80ms
```
- Includes 14/14 tests in `missions_api_consistency.test.mjs`.

### Go Test Suite
```
ok github.com/arc-agentpay/agentpay/services/gateway/...
All package tests passed.
```

### Next.js Production Build
```
✓ Compiled successfully
✓ Generating static pages (79/79)
✓ Finalizing page optimization
All 79 routes statically compiled without errors.
```
