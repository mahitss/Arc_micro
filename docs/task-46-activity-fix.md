# Task 46 — Global Activity Feed Data Rendering & Event Inspector Fix Report

## 1. Executive Overview

This report documents the resolution of the schema mismatch and rendering failures on the AgentPay **Global Activity Feed** (`/activity`).

### Observed Defect
Prior to this fix, navigating to `/activity` loaded the page structure successfully, but the event feed rendered mostly blank event cards displaying only an unformatted timestamp and event ID. The primary event information—including event name/title, actor identity, category badge, amount, and structured payload—was missing. Furthermore, the **Event Inspector** displayed:
> *"Select an activity event from the feed to inspect structured audit metadata."*

When an event was clicked, the inspector displayed `undefined` or empty fields because the frontend was attempting to read nonexistent properties (`evt.type`, `evt.actor`, `evt.category`, and `evt.payload`), while the Go Gateway's authoritative event model emits `event_type`, `actor_id`/`actor_type`, and a JSON-serialized `metadata` string.

### Core Resolution
1. **Audited Authoritative Go Gateway Model:** Examined `services/gateway/internal/storage/repository.go` and `services/gateway/internal/http/handlers/event_handlers.go`.
2. **Built Robust Normalization Engine:** Created [`apps/web/src/lib/activity/normalizer.ts`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/apps/web/src/lib/activity/normalizer.ts) to parse JSON metadata strings, normalize event types into human-readable titles, assign deterministic category classifications, extract actor identities and amounts, and sanitize sensitive credentials.
3. **Synchronized Frontend API Client & Types:** Updated `apps/web/src/lib/api/types.ts` and `apps/web/src/lib/api/missions.ts` to map real backend data without falling back to hardcoded fake events when zero events exist.
4. **Enhanced Activity Feed UI & Event Inspector:** Rebuilt `apps/web/src/app/activity/page.tsx` with clear visual hierarchy, category filtering, formatted amount pill, simulation badges, structured inspector with key-value table and redacted raw JSON viewer, truthful polling controls (replacing misleading "Realtime Outbox" claims), and proper empty/error states.
5. **Verified with Comprehensive Tests:** Created 15 regression tests in `apps/web/src/__tests__/activity_feed_consistency.test.mjs`, verified all 305 frontend unit tests, and validated the static production build.

---

## 2. Root Cause Analysis

### Backend Contract (`AuditEvent`)
The Go Gateway stores audit events in SQLite/PostgreSQL with the following struct definition (`services/gateway/internal/storage/repository.go`):

```go
type AuditEvent struct {
    ID             string    `json:"id"`
    OrganizationID string    `json:"organization_id"`
    EventType      string    `json:"event_type"`
    ActorType      string    `json:"actor_type"`
    ActorID        string    `json:"actor_id"`
    ResourceType   string    `json:"resource_type"`
    ResourceID     string    `json:"resource_id"`
    RequestID      string    `json:"request_id"`
    CorrelationID  string    `json:"correlation_id"`
    AgentID        string    `json:"agent_id"`
    Version        int       `json:"version"`
    Timestamp      time.Time `json:"timestamp"`
    Metadata       string    `json:"metadata"` // Serialized JSON string
}
```

### Schema Mismatch Matrix

| Field Concept | Backend Go Field | Live Gateway Value | Frontend Expected Before | Result Before Fix | Post-Fix Normalization |
|---|---|---|---|---|---|
| **Event Name / Type** | `event_type` | `"mission.created"` | `evt.type` | Blank (`undefined`) | Normalized title: `"Mission Created"` + `evt.type = "mission.created"` |
| **Actor Identity** | `actor_id`, `actor_type`, `agent_id` | `"research-agent"`, `"AGENT"` | `evt.actor` | Blank (`undefined`) | `"research-agent (AGENT)"` |
| **Category** | None (derived from `event_type`) | `"mission.created"` | `evt.category` | Blank / filter fail | Deterministic category: `"MISSION"` |
| **Metadata / Payload** | `metadata` (JSON string) | `"{\"budget\":\"2000000\"...}"` | `evt.payload` (Object) | Inspector `undefined` | Safely parsed JSON object with sensitive key redaction |
| **Financial Amount** | In `metadata.budget` or `metadata.amount` | `"2000000"` (atomic units) | `evt.amount` | Not rendered | Extracted and formatted: `"$2.00"` |
| **Truthfulness Mode** | Derived from metadata / environment | `"SIMULATED"` | Not displayed | No simulation indicator | Explicit `[SIMULATED]` pill with amber badge |
| **Status Badge** | Derived from `event_type` or metadata | `"SUCCESS"` | `evt.status` | Not rendered | Computed: `"CONFIRMED"`, `"ACTIVE"`, `"DENIED"`, etc. |

---

## 3. Implementation Details

### A. Normalizer Module (`apps/web/src/lib/activity/normalizer.ts`)
The normalization layer handles the conversion of raw Gateway audit events into safe, fully-populated frontend view models:
- **`safeParseMetadata(raw)`**: Safely unpacks stringified JSON, handling double-encoded strings, empty strings, and object literals without throwing exceptions.
- **`categorizeEvent(eventType)`**: Maps event prefixes to standard categories:
  - `mission.*` $\rightarrow$ `MISSION`
  - `payment.*`, `transfer.*`, `intent.*`, `deposit.*` $\rightarrow$ `PAYMENT`
  - `policy.*` $\rightarrow$ `POLICY`
  - `risk.*` $\rightarrow$ `RISK`
  - `approval.*` $\rightarrow$ `APPROVAL`
  - `security.*`, `killswitch.*`, `emergency.*` $\rightarrow$ `SECURITY`
  - `arc.*`, `chain.*`, `contract.*` $\rightarrow$ `ARC`
  - Fallback $\rightarrow$ `GENERAL`
- **`formatEventTitle(eventType)`**: Converts dot-delimited machine keys into human-readable titles (e.g. `mission.step.completed` $\rightarrow$ `Mission Step Completed`).
- **`extractActor(event, metadata)`**: Combines `actor_id` and `actor_type` with fallbacks to `agent_id` or metadata actors.
- **`extractAmount(event, metadata)`**: Extracts atomic or standard numerical amounts from `budget`, `amount`, `max_spend`, or `fee`.
- **`sanitizeObject(obj)`**: Recursively masks sensitive fields (`private_key`, `secret`, `token`, `password`, `authorization`, `signature`, `api_key`) to prevent accidental leaks in the Event Inspector.

### B. API Client Updates (`apps/web/src/lib/api/missions.ts`)
- Replaced unadapted raw event passthrough with `(data.events || []).map(normalizeActivityEvent)`.
- Eliminated automatic fallback to fake mock data when the database genuinely returns 0 events.
- Added explicit error propagation with user-friendly error banners and retry actions.

### C. Page & Inspector Enhancements (`apps/web/src/app/activity/page.tsx`)
- **Event Card Visual Hierarchy:**
  1. Top Row: Status badge (`CONFIRMED`, `PENDING`, `FAILED`), Category pill (`[MISSION]`), Simulation pill (`[SIMULATED]`), Relative/Exact timestamp.
  2. Middle Row: Human-readable title (`Mission Created`), optional amount pill (`$2.00`).
  3. Context Row: Objective or description extracted from parsed metadata.
  4. Bottom Row: Actor badge (`Actor: research-agent (AGENT)`), event ID, and correlation ID link.
- **Event Inspector Panel:**
  - Fast stats cards: `Status`, `Category`, `Actor`, `Correlation ID`.
  - Structured Metadata Grid: Displays all parsed metadata fields in clean key-value rows.
  - Safe JSON Stringification: Recursively formats arrays and nested objects cleanly; nulls/empty values render as `—` rather than `[object Object]`.
  - Redacted Raw Payload Viewer: Collapsible code viewer showing sanitized JSON with a one-click copy button.
- **Truthful System Mode & Polling:**
  - Replaced misleading static "Realtime Outbox" label with an interactive **"AUDIT EVENT STREAM"** header.
  - Included a toggleable **"LIVE POLLING (10s)"** indicator and an instant **"Refresh"** button.
  - Retained strict banner: `SIMULATION — NO FUNDS MOVED (ARC TESTNET & SANDBOX ONLY)`.
- **State Handling:**
  - **Loading State:** Clean pulsating skeleton with `LOADING AUDIT STREAM...`.
  - **Authentic Empty State:** When 0 events exist, renders `NO ACTIVITY RECORDED` with a direct call-to-action button to `/missions` ("Launch Mission").
  - **Error State:** In case of network/gateway failure, displays an amber `ACTIVITY SERVICE UNAVAILABLE` banner with a `Retry Connection` button.
- **URL Synchronization:**
  - Reading `?event=<id>` from `window.location.search` client-side allows deep-linking to specific events without triggering Next.js dynamic server usage warnings during static builds.

---

## 4. Verification & Testing

### Regression Test Suite (`apps/web/src/__tests__/activity_feed_consistency.test.mjs`)
Implemented 15 unit and integration tests verifying all edge cases:
1. Normalizes raw Gateway `AuditEvent` into valid `GlobalActivityEvent`.
2. Categorizes mission, payment, policy, risk, security, and arc events correctly.
3. Formats machine `event_type` strings into human titles.
4. Safely parses stringified JSON metadata.
5. Handles corrupted/malformed metadata without crashing.
6. Extracts actor from `actor_id` and `actor_type`.
7. Falls back to `agent_id` when `actor_id` is missing.
8. Extracts and formats monetary amounts from atomic units.
9. Redacts sensitive keys in raw metadata.
10. Preserves correlation and causation tracking IDs.
11. Filters events correctly across categories.
12. Marks events with simulation indicators truthfully.
13. Renders empty feed state truthfully without generating fake events.
14. Guarantees safe key-value display without `[object Object]`.
15. Validates contract integrity between normalizer and UI renderer.

**Result:** `15 passed, 15 total`.

### Overall Frontend Test Matrix
Ran full frontend test suite:
- **Test Suites:** 119 passed, 119 total
- **Tests:** 305 passed, 305 total
- **Snapshots:** 0 total
- **Time:** 8.448 s

---

## 5. Summary of Modified Files

| File | Change Description |
|---|---|
| [`apps/web/src/lib/activity/normalizer.ts`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/apps/web/src/lib/activity/normalizer.ts) | Created normalization engine for audit events, metadata parsing, and secret sanitization |
| [`apps/web/src/lib/api/types.ts`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/apps/web/src/lib/api/types.ts) | Enriched `GlobalActivityEvent` type with canonical Gateway properties and normalized fields |
| [`apps/web/src/lib/api/missions.ts`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/apps/web/src/lib/api/missions.ts) | Updated `fetchGlobalActivity` to map events through normalizer and return authentic empty state |
| [`apps/web/src/app/activity/page.tsx`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/apps/web/src/app/activity/page.tsx) | Complete UI rebuild of event feed, category filtering, inspector, polling, and empty/error states |
| [`apps/web/src/__tests__/activity_feed_consistency.test.mjs`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/apps/web/src/__tests__/activity_feed_consistency.test.mjs) | Created 15 regression tests covering normalizer and UI rendering rules |
| [`docs/task-46-activity-audit.md`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/docs/task-46-activity-audit.md) | Technical audit document contrasting backend and frontend event representations |
