# Task 46 — Global Activity Feed Data Rendering & Event Inspector Audit

## 1. Executive Summary

An audit of `/activity` (`apps/web/src/app/activity/page.tsx`) identified a complete schema disconnect between the Go Gateway's authoritative audit/event persistence layer (`services/gateway/internal/storage/repository.go` & `internal/http/handlers/event_handlers.go`) and the frontend client (`apps/web/src/lib/api/missions.ts` & `apps/web/src/lib/api/types.ts`).

When the Gateway returns real audit events from `GET /v1/events`, the frontend received valid event objects but displayed a mostly blank event card. Only `timestamp` and `id` were visible because property names in the Go Gateway JSON did not match the property names expected by the Next.js renderer.

---

## 2. API Endpoint & Actual Backend Response

### Endpoint Details
- **Method:** `GET`
- **Route:** `/v1/events`
- **Query Parameters:** `limit` (default 50), `event_type`, `payment_intent_id`, `agent_id`
- **Controller:** `services/gateway/internal/http/handlers/event_handlers.go:HandleList`
- **Storage Layer:** `services/gateway/internal/storage/repository.go:ListAuditEventsWithFilter`

### Actual Gateway JSON Response (Live Verified from `http://localhost:8080/v1/events`)
```json
{
  "events": [
    {
      "id": "evt_4c3bdc9bafab636f4f43bc7d",
      "organization_id": "org_default",
      "event_type": "mission.created",
      "actor_type": "AGENT",
      "actor_id": "research-agent",
      "resource_type": "DOMAIN_EVENT",
      "resource_id": "evt_4c3bdc9bafab636f4f43bc7d",
      "request_id": "corr_msn_9e8e023d4dbd5bc94ab4fa66",
      "correlation_id": "corr_msn_9e8e023d4dbd5bc94ab4fa66",
      "agent_id": "research-agent",
      "version": 1,
      "timestamp": "2026-09-29T18:39:53.319354Z",
      "metadata": "{\"budget\":\"2000000\",\"objective\":\"Find_weather_data\",\"steps_count\":2}"
    }
  ],
  "limit": 50,
  "total": 1
}
```

---

## 3. Detailed Schema Mismatch Matrix

| Backend Field (`AuditEvent`) | Live Example Value | Frontend Expected (`GlobalActivityEvent`) | Renderer Property (`page.tsx`) | Render Result Before Fix |
|---|---|---|---|---|
| `event_type` | `"mission.created"` | `type` | `evt.type` | **BLANK** (`undefined`) |
| `actor_id` & `actor_type` | `"research-agent"`, `"AGENT"` | `actor` | `evt.actor` | **BLANK** (shows `Actor: ` with no value) |
| `resource_type` / `event_type` | `"DOMAIN_EVENT"` | `category` | `evt.category` | **BLANK / DEFAULT** (Category filters fail) |
| `metadata` (JSON string) | `"{\"budget\":\"2000000\"...}"` | `payload` (Object) | `evt.payload` | **BLANK** (Inspector shows `undefined`) |
| `correlation_id` | `"corr_msn_9e8e023d..."` | `correlation_id` | `evt.correlation_id` | Rendered only if present |
| `payment_intent_id` | `""` or `"pi_..."` | `payment_id` | `evt.payment_id` | Missing |
| `agent_id` | `"research-agent"` | N/A | N/A | Ignored by frontend |
| `metadata.budget` / `amount` | `"2000000"` | `amount` | `evt.amount` | Missing |
| Status | Derived from event type | `status` | `evt.status` | Missing |

---

## 4. Architectural Findings

1. **Unadapted API Client Passing:**
   `fetchGlobalActivity()` in `apps/web/src/lib/api/missions.ts` invoked `apiRequest('/v1/events')` and directly returned the raw backend events without transforming backend `AuditEvent` properties (`event_type`, `actor_id`, `metadata`) into the normalized frontend representation (`type`, `title`, `actor`, `category`, `payload`, `status`).

2. **Metadata Serialized as JSON String:**
   The Gateway stores and serializes `Metadata` as a JSON string (`string` type in Go struct). The frontend expected `payload: Record<string, any>`, causing `JSON.stringify(evt.payload)` in the inspector to evaluate to `undefined`.

3. **Labeling Inconsistency ("Realtime Outbox"):**
   The page header presented a glowing amber dot labeled "Realtime Outbox", but only performed a single initial fetch on component mount (`useEffect(..., [])`). There was no live polling, no WebSocket, and no SSE subscription. This violated system truthfulness standards.

4. **Missing UI States:**
   - **Error State:** If the Gateway failed or was unreachable, `catch {}` in `fetchGlobalActivity` swallowed the error and fell back to demo fixtures, preventing user notification of network unavailability.
   - **Empty State:** If the database genuinely contained 0 events, `resp.events.length > 0` evaluated to false and forced demo fixtures, making an authentic empty state impossible to view.

5. **Security & Redaction:**
   The Event Inspector displayed raw JSON without checking for sensitive keys (e.g. private keys, credentials, tokens).
