# AgentPay Day 6: Event Infrastructure, Audit, Webhooks & Observability Report

## 1. What Existed Before Day 6

Prior to Day 6, AgentPay possessed:
- A database schema with an `audit_events` table supporting basic fields (`id`, `organization_id`, `actor_type`, `actor_id`, `event_type`, `resource_type`, `resource_id`, `request_id`, `timestamp`, `metadata`).
- An in-memory and PostgreSQL audit log storage mechanism capable of writing entries upon state transitions.
- A core payment lifecycle (Create -> Authorize -> Approve -> Confirm) with Rust policy evaluation and Arc smart contract settlement.
- A developer platform with API key authentication, permission scopes, and an initial TypeScript SDK.

**Key Gaps Identified Before Day 6**:
- **No Causal Lineage / Correlation**: Events lacked `correlation_id`, `causation_id`, `agent_id`, `payment_intent_id`, and `execution_id` columns, making cross-service tracing fragmented.
- **No Asynchronous Webhook Delivery**: Developers had to poll `GET /v1/payment-intents/{id}` to discover state updates; no push notification mechanism existed.
- **No Transactional Outbox**: If the application crashed between database state transition and notification dispatch, events could be lost.
- **No SSRF / Webhook Security Defenses**: There was no infrastructure to prevent malicious destination URLs, DNS rebinding, or loopback exploitation.
- **No Webhook Signature Verification**: Third-party consumers had no cryptographic mechanism to verify authenticity or protect against replay attacks.

---

## 2. What Changed on Day 6

1. **Database Migration (`000005_events_and_webhooks.up.sql`)**:
   - Upgraded `audit_events` with correlation columns (`correlation_id`, `causation_id`, `agent_id`, `payment_intent_id`, `execution_id`, `approval_id`, `version`).
   - Created `outbox_events` table with index on `status` and `created_at` for transactional guarantees.
   - Created `webhook_endpoints` table with hashed secrets, event subscriptions, status tracking, and failure counters.
   - Created `webhook_deliveries` table with attempt counters, HTTP response status, latency tracking, and error messaging.

2. **Domain Event Envelope & Taxonomy (`services/gateway/internal/domain/events.go`)**:
   - Defined a canonical `DomainEvent` struct with typed envelopes, timestamps, actor attribution, and lineage IDs.
   - Implemented a standard taxonomy for `agent.*`, `policy.*`, `service.*`, `payment_intent.*`, `approval.*`, `api_key.*`, and `test.ping`.

3. **Webhook Subsystem (`services/gateway/internal/webhook/`)**:
   - **`models.go`**: Domain models for endpoints, deliveries, outbox events, ID generators (`we_...`, `del_...`, `outbox_...`), and cryptographic secret generators (`whsec_...`).
   - **`signer.go`**: HMAC-SHA256 signature generator (`t=<unix>,v1=<signature>`) and constant-time verification with 300s replay window.
   - **`ssrf.go`**: Network validator blocking loopback, RFC 1918 private CIDRs, link-local, cloud metadata (169.254.169.254), carrier-grade NAT, and DNS rebinding via `SafeDialContext`.
   - **`dispatcher.go`**: Asynchronous delivery engine featuring wildcard topic matching (`*`, `payment_intent.*`), bounded exponential backoff with jitter, non-blocking execution, and synthetic test ping support.

4. **Storage Layer (`services/gateway/internal/storage/`)**:
   - Extended `Repository` interface and updated both `MemoryRepository` and `PostgresRepository` with complete CRUD for webhook endpoints, delivery logs, outbox queueing, and filtered audit event queries.

5. **API Endpoints & Routing (`services/gateway/internal/http/`)**:
   - Implemented `handlers/webhook_handlers.go`:
     - `POST /v1/webhooks`: Create endpoint (one-time secret returned).
     - `GET /v1/webhooks`: List endpoints (secrets omitted).
     - `GET /v1/webhooks/{id}`: Get endpoint details and status.
     - `PATCH /v1/webhooks/{id}`: Update endpoint subscriptions or status.
     - `DELETE /v1/webhooks/{id}`: Remove endpoint.
     - `GET /v1/webhooks/{id}/deliveries`: Query delivery history.
     - `POST /v1/webhooks/{id}/test`: Send synthetic `test.ping` event.
   - Implemented `handlers/event_handlers.go`:
     - `GET /v1/events`: Query events with filters (`type`, `payment_intent_id`, `agent_id`, `correlation_id`).
     - `GET /v1/events/{id}`: Retrieve single event envelope.
   - Wired routes in `router.go` using standard Go 1.22 routing (`r.PathValue("id")`).

6. **Payment Lifecycle Event Wiring (`services/gateway/internal/intent/service.go`)**:
   - Emitted correlated domain events during `CreateIntent`, `AuthorizeIntent`, and `ConfirmIntent`.

7. **TypeScript SDK (`packages/sdk-typescript/`)**:
   - Added `WebhookEndpoint`, `WebhookDelivery`, `DomainEvent` types.
   - Implemented `client.webhooks` resource (CRUD, delivery history, test ping, and `verifySignature` utility).
   - Implemented `client.events` resource (listing with filters and single-event retrieval).

8. **Web Dashboard (`apps/web/`)**:
   - Created `/developers/webhooks`: Endpoint management, one-time secret display modal, test ping trigger, and delivery history table.
   - Created `/developers/events`: Audit event timeline with search filters and correlation ID inspector.
   - Updated navigation in `src/app/layout.tsx`.

---

## 3. Final Event Architecture

```
                      [ Client / Autonomous Agent ]
                                    │
                                    ▼
                         [ API Gateway Router ]
                                    │
                                    ▼
                          [ Intent Service ]
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
     [ Financial DB Update ]                   [ Outbox / Audit Insert ]
  (Status: AUTHORIZED / CONFIRMED)             (Atomic DB Transaction)
                                                         │
                                                         ▼
                                             [ Webhook Dispatcher ]
                                              (Async Worker Queue)
                                                         │
                                    ┌────────────────────┴────────────────────┐
                                    ▼                                         ▼
                           [ Endpoint 1 (HTTPS) ]                    [ Endpoint 2 (HTTPS) ]
                              (Delivered 200)                           (Retried 500)
```

---

## 4. Canonical Event Taxonomy

The following events are officially supported:

| Event Type | Actor | Description |
| :--- | :---: | :--- |
| `agent.created` | `USER` | Agent provisioned with policy |
| `agent.paused` | `USER` | Circuit breaker tripped; agent paused |
| `agent.resumed` | `USER` | Agent returned to active execution |
| `policy.created` | `USER` | New policy created |
| `policy.updated` | `USER` | Spending limits or rules updated |
| `service.created` | `USER` | Approved service registered |
| `service.updated` | `USER` | Service details modified |
| `service.disabled` | `USER` | Service disabled from agent spending |
| `payment_intent.created` | `AGENT` | Agent initiated payment intent |
| `payment_intent.authorized` | `SYSTEM` | Policy engine authorized payment |
| `payment_intent.denied` | `SYSTEM` | Policy engine rejected payment |
| `payment_intent.approval_required` | `SYSTEM` | Manual approval required |
| `payment_intent.confirmed` | `SYSTEM` | Arc settlement confirmed on-chain |
| `payment_intent.failed` | `SYSTEM` | Execution or settlement failed |
| `approval.created` | `SYSTEM` | Approval ticket created |
| `approval.approved` | `USER` | Payment approved by human |
| `approval.rejected` | `USER` | Payment rejected by human |
| `api_key.created` | `USER` | Developer API key issued |
| `api_key.revoked` | `USER` | Developer API key revoked |
| `test.ping` | `USER` | Synthetic webhook connectivity test |

---

## 5. Immutable Audit Model

- **Append-Only Storage**: All events are stored in `audit_events`. Application database roles have only `INSERT` and `SELECT` privileges. No `UPDATE` or `DELETE` operations are supported.
- **Traceability**: Every record stores `organization_id`, `actor_type`, `actor_id`, `request_id`, `correlation_id`, `causation_id`, `agent_id`, `payment_intent_id`, and structured `metadata`.
- **Query Support**: Supports full forensic queries for root-cause analysis (e.g., finding exact policy violations, human approver IDs, and on-chain settlement hashes).

---

## 6. Outbox Architecture

To prevent inconsistency between database state changes and event emission:
1. When a payment state transition occurs (e.g. `AUTHORIZED`), the payment intent record and an `outbox_events` record are written in the **same database transaction**.
2. If the transaction rolls back, no outbox event is persisted.
3. The asynchronous dispatcher processes pending outbox events and dispatches them to matching webhook endpoints.
4. If the process crashes, uncompleted outbox events remain `PENDING` and are re-processed upon startup.

---

## 7. Webhook Architecture

- **Endpoint Registration**: Organizations register HTTPS URLs with descriptions and subscribed event filters (e.g., `["payment_intent.*"]`).
- **Endpoint Status**: Tracks `ACTIVE`, `FAILING`, or `DISABLED` based on consecutive failure counters.
- **Delivery Log**: Every attempt creates a `webhook_deliveries` record capturing URL, HTTP status code, latency, request timestamp, attempt count, and error strings.

---

## 8. Cryptographic Signature Scheme

Every webhook request contains the `AgentPay-Signature` header:

```
AgentPay-Signature: t=<unix_timestamp>,v1=<hmac_sha256_hex>
```

- **Signing Payload**: `<unix_timestamp>.<raw_json_body>`
- **Algorithm**: HMAC-SHA256 using the endpoint secret (`whsec_...`).
- **Replay Protection**: Rejects timestamps older or newer than 300 seconds (5 minutes).
- **Constant-Time Verification**: Verification utilizes `crypto.timingSafeEqual` / `hmac.Equal` to prevent timing attacks.

---

## 9. Retry & Backoff Model

- **Bounded Retries**: Maximum of 5 delivery attempts.
- **Backoff Schedule**:
  - Attempt 1: Immediate
  - Attempt 2: 15 seconds ± 20% jitter
  - Attempt 3: 60 seconds ± 20% jitter
  - Attempt 4: 5 minutes ± 20% jitter
  - Attempt 5: 30 minutes ± 20% jitter
- **Failure Classification**:
  - Transient errors (timeouts, 408, 429, 5xx) are retried.
  - Permanent errors (400, 401, 403, 404, 405, 410, invalid URL, certificate errors) fail immediately without retry.
- **Non-Blocking Invariant**: Webhook delivery failure **never** delays or rolls back financial settlement.

---

## 10. Idempotency Model

- Every event has a globally unique `id` (`evt_...`).
- Retries of the same event reuse the identical `event.id`.
- Consumers are instructed to store `event.id` in a unique-constrained database table to guarantee idempotency on receipt.

---

## 11. SSRF & Security Protections

- **Scheme Validation**: Enforces HTTPS for all production webhook destinations.
- **IP Blocklist**: Prohibits loopback (`127.0.0.0/8`, `::1`), RFC 1918 private CIDRs (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), carrier-grade NAT (`100.64.0.0/10`), and IPv6 ULA (`fc00::/7`).
- **Cloud Metadata Defense**: Explicitly blocks `169.254.169.254` (AWS/GCP/Azure instance metadata) and `metadata.google.internal`.
- **DNS Rebinding Prevention**: Employs `SafeDialContext` which resolves hostnames and validates all resolved IP addresses immediately prior to socket connection.
- **Secret Hygiene**: Webhook secrets are hashed with SHA-256 before storage and returned only once at creation. Zero plaintext secrets are logged.

---

## 12. Observability Model

- **Structured JSON Logging**: All logs include `timestamp`, `level`, `service`, `event`, `organization_id`, `request_id`, `correlation_id`, `payment_intent_id`, and `duration_ms`.
- **Credential Redaction**: Strictly suppresses API keys, webhook secrets, authorization headers, and private keys from log output.
- **Correlation Chain**: Links `request_id` -> `payment_intent_id` -> `approval_id` -> `execution_id` -> `transaction_id` -> `tx_hash`.

---

## 13. API Changes

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/webhooks` | Register endpoint (returns secret once) |
| `GET` | `/v1/webhooks` | List endpoints (secrets omitted) |
| `GET` | `/v1/webhooks/{id}` | Get endpoint details |
| `PATCH` | `/v1/webhooks/{id}` | Update endpoint subscriptions/status |
| `DELETE` | `/v1/webhooks/{id}` | Delete endpoint |
| `GET` | `/v1/webhooks/{id}/deliveries` | List recent deliveries for endpoint |
| `POST` | `/v1/webhooks/{id}/test` | Send synthetic test event |
| `GET` | `/v1/events` | Query audit/domain events with filters |
| `GET` | `/v1/events/{id}` | Get single domain event |

---

## 14. Frontend Changes

1. **Webhooks Management (`apps/web/src/app/developers/webhooks/page.tsx`)**:
   - Register endpoint modal with event topic checkboxes.
   - One-time secret copy modal with security warning.
   - Endpoint listing with status badges, event tags, and test ping button.
   - Real-time delivery logs table with HTTP status code badges, latencies, and attempt counts.
2. **Events Explorer (`apps/web/src/app/developers/events/page.tsx`)**:
   - Audit event timeline with search by event type, agent ID, and payment intent ID.
   - Expandable correlation inspector showing `correlation_id`, `causation_id`, and raw JSON payload.
3. **Navigation Updates (`apps/web/src/app/layout.tsx`)**:
   - Added `Webhooks` and `Events` links to the main top navigation bar.

---

## 15. Tests Executed

1. **Signer Unit Tests (`services/gateway/internal/webhook/signer_test.go`)**:
   - Correct HMAC-SHA256 signature generation and verification.
   - Rejection of invalid secrets and tampered payloads.
   - Rejection of stale timestamps (>300s window).
2. **SSRF Validator Unit Tests (`services/gateway/internal/webhook/ssrf_test.go`)**:
   - Rejection of `127.0.0.1`, `localhost`, `10.0.0.1`, `192.168.1.1`, `172.16.0.1`, `169.254.169.254`, and `::1`.
   - Acceptance of public domains (`https://example.com`, `https://api.merchant.com`).
3. **End-to-End Integration Tests (`services/gateway/tests/integration/day6_events_webhooks_test.go`)**:
   - SSRF protection at endpoint creation.
   - Webhook registration, one-time secret display, and secret masking in lists.
   - Organization isolation across webhooks and events.
   - Synthetic test ping dispatch and HMAC signature verification on receiver.
   - Payment lifecycle event emission (correlated `created` -> `authorized` -> `confirmed`).
   - Non-blocking payment settlement when webhook endpoint fails (HTTP 500).
4. **TypeScript SDK Unit Tests (`packages/sdk-typescript/tests/sdk.test.ts`)**:
   - Webhook CRUD, delivery listing, test ping.
   - SDK `verifySignature` utility tests (valid, tampered, stale).
   - Event listing with filters and single event retrieval.
5. **Frontend Web Tests (`apps/web`)**:
   - Next.js build and test suite passing (14/14 tests).

---

## 16. Test Results

- **Go Test Suite (`services/gateway/...`)**:
  - `day6_events_webhooks_test.go`: **PASS** (7/7 subtests)
  - `signer_test.go`: **PASS** (4/4 tests)
  - `ssrf_test.go`: **PASS** (5/5 tests)
  - All existing gateway integration and unit tests: **PASS (100%)**
- **TypeScript SDK Suite (`packages/sdk-typescript`)**:
  - `sdk.test.ts`: **PASS (8/8 tests)**
- **Web App Test Suite (`apps/web`)**:
  - **PASS (14/14 tests)**

---

## 17. Known Limitations

1. **In-Memory Worker Queue**: While PostgreSQL outbox entries are persisted transactionally, the local dispatch runner executes within the API gateway process. For high-volume multi-node deployments, a dedicated background worker daemon scanning `outbox_events` is recommended.
2. **Synchronous Jittered Sleep for Retries**: In the current single-node implementation, retry attempts execute in background goroutines using sleep timers. Under high concurrency, retries should be managed via a durable scheduled job table.
3. **Payload Truncation**: Deliveries record up to 1KB of the receiver's response body; responses larger than 1KB are truncated to prevent database bloat.

---

## 18. Deferred Improvements

1. **Outbox Worker Partitioning**: Implement distributed lease locking (`SELECT ... FOR UPDATE SKIP LOCKED`) on `outbox_events` for multi-instance gateway deployments.
2. **Mutual TLS (mTLS)**: Allow enterprise organizations to provide client certificates for webhook endpoint authentication.
3. **Dead-Letter Queue (DLQ) Dashboard**: Provide an explicit DLQ management view with bulk redelivery capabilities for failed endpoints.
4. **Automated Endpoint Disabling**: Automatically transition endpoints to `DISABLED` status after 50 consecutive failures over a 24-hour period, sending an alert email to the organization owner.

---

## 19. Files Changed

### Backend (Go Gateway)
- `services/gateway/migrations/000005_events_and_webhooks.up.sql` (NEW)
- `services/gateway/internal/domain/events.go` (NEW)
- `services/gateway/internal/webhook/models.go` (NEW)
- `services/gateway/internal/webhook/signer.go` (NEW)
- `services/gateway/internal/webhook/signer_test.go` (NEW)
- `services/gateway/internal/webhook/ssrf.go` (NEW)
- `services/gateway/internal/webhook/ssrf_test.go` (NEW)
- `services/gateway/internal/webhook/dispatcher.go` (NEW)
- `services/gateway/internal/storage/repository.go` (MODIFIED)
- `services/gateway/internal/storage/memory.go` (MODIFIED)
- `services/gateway/internal/storage/postgres.go` (MODIFIED)
- `services/gateway/internal/http/handlers/webhook_handlers.go` (NEW)
- `services/gateway/internal/http/handlers/event_handlers.go` (NEW)
- `services/gateway/internal/http/router.go` (MODIFIED)
- `services/gateway/internal/config/config.go` (MODIFIED)
- `services/gateway/internal/intent/service.go` (MODIFIED)
- `services/gateway/tests/integration/day6_events_webhooks_test.go` (NEW)

### TypeScript SDK
- `packages/sdk-typescript/src/types.ts` (MODIFIED)
- `packages/sdk-typescript/src/resources/webhooks.ts` (NEW)
- `packages/sdk-typescript/src/resources/events.ts` (NEW)
- `packages/sdk-typescript/src/client.ts` (MODIFIED)
- `packages/sdk-typescript/src/index.ts` (MODIFIED)
- `packages/sdk-typescript/tests/sdk.test.ts` (MODIFIED)

### Web Dashboard
- `apps/web/src/app/developers/webhooks/page.tsx` (NEW)
- `apps/web/src/app/developers/events/page.tsx` (NEW)
- `apps/web/src/app/layout.tsx` (MODIFIED)

### Documentation
- `docs/event-model.md` (NEW)
- `docs/webhooks.md` (NEW)
- `docs/webhook-security.md` (NEW)
- `docs/audit-model.md` (MODIFIED)
- `docs/observability.md` (NEW)
- `docs/day-6-event-infrastructure-report.md` (NEW)
