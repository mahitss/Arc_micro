# Task 45 — Missions Page API Failure & Simulation Flow Audit

## Executive Summary
This document provides the complete root cause analysis and request-flow audit for the `/missions` page failure in AgentPay.

### Observed Issue
When navigating to `http://localhost:3001/missions`:
- The page renders correctly, but displays: `Error: Failed to fetch`
- Total Missions = `0`
- Active Missions = `0`
- Total Spent = `$0.00`
- Mission Roster = `No missions found. Launch an objective above.`
- Simulate Dry-Run and Create Mission buttons are disabled when objective is empty, and fail if submitted.

---

## 1. Request Flow Architecture

```
[ Browser: http://localhost:3001/missions ]
      │
      ▼
1. useEffect() on mount triggers loadMissions()
      │
      ▼
2. loadMissions() calls fetchMissions() [apps/web/src/lib/api/missions.ts]
      │
      ▼
3. fetchMissions() calls apiRequest('/v1/missions') [apps/web/src/lib/api/client.ts]
      │
      ▼
4. apiRequest() resolves base URL via getBaseApiUrl():
   - process.env.NEXT_PUBLIC_GATEWAY_URL = "http://localhost:8080"
   - Target URL: "http://localhost:8080/v1/missions"
      │
      ▼
5. Browser issues cross-origin fetch():
   - Method: GET
   - URL: http://localhost:8080/v1/missions
   - Header: Origin: http://localhost:3001
      │
      ▼
6. Go Gateway HTTP router [services/gateway/internal/http/router.go:732]
   - Evaluates middleware.CORS(cfg.CORSAllowedOrigins)
      │
      ▼
7. CORS Evaluation [services/gateway/internal/http/middleware/cors.go]:
   - cfg.CORSAllowedOrigins loaded from config.go:
     corsOrigins = []string{"http://localhost:3000"}
   - Origin "http://localhost:3001" is NOT in originsMap!
   - Result: Access-Control-Allow-Origin header is OMITTED!
      │
      ▼
8. Browser Cross-Origin Security Enforcement:
   - Browser detects missing Access-Control-Allow-Origin header.
   - Browser security blocks JavaScript from reading HTTP 200 JSON payload.
   - Browser throws TypeError: "Failed to fetch".
      │
      ▼
9. Frontend Error Handling:
   - apiRequest() catches TypeError, rethrows ApiError(503, 'NETWORK_UNAVAILABLE', 'Failed to fetch').
   - loadMissions() catches ApiError, sets error state to "Failed to fetch".
   - UI renders: "Error: Failed to fetch".
   - missions array remains empty: metrics show 0, 0, $0.00.
```

---

## 2. Root Cause Analysis

### Primary Root Cause: CORS Port Mismatch in Gateway Default Configuration
1. **Config Hardcoding**: `services/gateway/internal/config/config.go` defaulted `CORSAllowedOrigins` strictly to `[]string{"http://localhost:3000"}` when `CORS_ALLOWED_ORIGINS` was not set in the environment.
2. **Dynamic Frontend Port**: Next.js automatically shifted to port `3001` when port `3000` was busy (`npm run dev -- -p 3001`).
3. **Strict Origin Match**: `services/gateway/internal/http/middleware/cors.go` only emitted `Access-Control-Allow-Origin` if `originsMap[origin]` was exactly true. Since `http://localhost:3001` was absent, no CORS headers were set, causing browser rejection.

### Secondary Root Cause: Telemetry Provenance Ambiguity
- When the backend is unreachable or throws a network error, the metric cards currently display `0`, `0`, and `$0.00` based on `missions.length`, giving the false impression that zero missions genuinely exist on the backend rather than indicating `UNAVAILABLE`.

### Tertiary Root Cause: Simulation Response Field Mapping
- Gateway's `POST /v1/missions/simulate` returns:
  - `projected_spend` (string base units)
  - `approval_required` (boolean)
  - `simulated_steps[].selected_quote_price` (string base units)
  - `simulated_steps[].candidates_found` (integer)
- Frontend `apps/web/src/app/missions/page.tsx` was reading:
  - `simulationResult.total_projected_spend`
  - `simulationResult.requires_human_approval`
  - `st.quoted_price`
  - `simulationResult.candidate_count`
- This field discrepancy caused simulated monetary outcomes to render as `$0.00` instead of their actual evaluated projection.

---

## 3. Existing Backend Route Verification

The Go Gateway already provides the complete canonical mission lifecycle:

| Method | Route | Handler | Status Verified via Curl |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | `healthHandler.Health` | `200 OK` (Gateway healthy) |
| `GET` | `/v1/missions` | `MissionsHandler.HandleList` | `200 OK` (`{"count":1,"missions":[...]}`) |
| `POST` | `/v1/missions` | `MissionsHandler.HandleCreate` | `201 Created` (Creates mission & plan) |
| `GET` | `/v1/missions/{id}` | `MissionsHandler.HandleGet` | `200 OK` (Fetches mission) |
| `POST` | `/v1/missions/{id}/start` | `MissionsHandler.HandleStart` | `200 OK` (Begins execution loop) |
| `POST` | `/v1/missions/{id}/cancel` | `MissionsHandler.HandleCancel` | `200 OK` (Cancels mission) |
| `POST` | `/v1/missions/simulate` | `MissionsHandler.HandleSimulate`| `200 OK` (Dry-run zero broadcast) |
| `GET` | `/v1/missions/{id}/trace` | `MissionsHandler.HandleGetTrace` | `200 OK` (Trace steps and events) |

---

## 4. Remediation Plan

1. **Gateway CORS Configuration**:
   - Update `services/gateway/internal/config/config.go` to include `http://localhost:3001`, `http://127.0.0.1:3000`, and `http://127.0.0.1:3001` in the default development origins.
   - Update `services/gateway/internal/http/middleware/cors.go` to dynamically permit localhost origins in non-production development environments, and include `Idempotency-Key` in allowed headers.
2. **Next.js Reverse Proxy Rewrite**:
   - Add a rewrite rule in `apps/web/next.config.mjs` forwarding `/v1/:path*` to `http://localhost:8080/v1/:path*` for same-origin robustness.
3. **Frontend Error Handling & Telemetry**:
   - In `apps/web/src/app/missions/page.tsx`:
     - Distinguish backend error/unavailable states from genuine empty roster states.
     - Display professional `MISSION SERVICE UNAVAILABLE` panel with Retry button instead of raw `Error: Failed to fetch`.
     - In telemetry ribbon, display `—` / `DATA UNAVAILABLE` when loading failed.
4. **Field Mapping Alignment**:
   - Update `apps/web/src/lib/api/types.ts` and `apps/web/src/app/missions/page.tsx` to handle both `projected_spend` / `total_projected_spend`, `approval_required` / `requires_human_approval`, and `selected_quote_price` / `quoted_price`.
5. **Simulate Dry-Run & Create Mission Enhancements**:
   - Ensure `SIMULATE DRY-RUN` enables once an objective is entered.
   - Prevent duplicate submission while requests are inflight (`isSubmitting`).
   - On successful mission creation, refresh the roster and provide a direct link to the canonical detail page `/missions/${mission.id}`.
6. **Tests & Verification**:
   - Add comprehensive unit tests verifying error recovery, empty roster, successful creation, simulation flow, and field mappings.
