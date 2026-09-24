# AgentPay Runtime Failure Classification Matrix

## 1. Deterministic Failure Taxonomy

All errors and exceptions encountered during autonomous workflow execution are deterministically classified into one of seven canonical categories (`RetryCategory` in `services/gateway/internal/runtime/models.go`):

| Category | Typical Causes | Action Taken | Backoff Applied | Invariant Enforcement |
|---|---|---|---|---|
| `RETRY_IMMEDIATELY` | Transient database connection blip, socket reset | Immediate re-execution (attempt < max) | None | Deduplicated step write |
| `RETRY_WITH_BACKOFF` | External provider HTTP 429 (rate limit), 503 (temporary unavailability) | Enqueue for delayed retry | Exponential: $T_{\text{wait}} = \min(B \times 2^{\text{attempt}-1}, T_{\max})$ with jitter | Pre-check deadline remaining |
| `WAIT_FOR_EXTERNAL_EVENT` | External agent result pending, asynchronous webhook required | Step transitions to `WAITING` | Wait until callback or TTL expiration | Cryptographic nonce verification (`INV-112`) |
| `RECONCILE` | Ambiguous blockchain transaction submission, RPC timeout after broadcast | Halt step; dispatch to Reconciliation Queue | No automatic rebroadcast | `INV-106`: Never blindly rebroadcast |
| `ESCALATE` | Quota exhausted, approval timeout, critical anomaly detected | Route incident to Control Tower Recovery Center | Suspended until operator intervention | Alerts emitted to outbox |
| `PERMANENT_FAILURE` | Invalid schema, missing mandatory parameters, malformed deliverable | Transition step to `PERMANENT_FAILURE`, workflow replans or fails | None (terminal) | Record decision reason in audit log |
| `DENY` | Policy rule violation, velocity limit exceeded, unallowlisted recipient | Transition step to `PERMANENT_FAILURE` | PROHIBITED | `INV-103`: Prohibits converting DENY to retry |

---

## 2. 30 Deterministic Adversarial Scenarios Matrix

All 30 adversarial scenarios are implemented and machine-verified in `services/gateway/internal/runtime/adversarial_test.go`:

| # | Adversarial Test Scenario | Expected System Defense | Result |
|---|---|---|---|
| 1 | Stale worker commits after lease expiry | Reject commit with `ErrStaleFencingToken` (`INV-101`) | **PASS** |
| 2 | Worker double-claims active step | Block second claim with `ErrLeaseAlreadyHeld` | **PASS** |
| 3 | Duplicate external agent callback | Second callback recognized as duplicate via nonce (`INV-112`) | **PASS** |
| 4 | Forged external callback (bad payload hash) | Reject with `ErrInvalidSignatureOrHash` | **PASS** |
| 5 | Callback from wrong tenant | Deny access with `ErrTenantMismatch` (`INV-116`) | **PASS** |
| 6 | Callback replay attack (stale timestamp) | Reject replay attempt due to timestamp tolerance window | **PASS** |
| 7 | Expired callback submission | Drop expired submission | **PASS** |
| 8 | Step retry attempt after Policy DENY | Fail-closed; reject retry conversion (`INV-103`) | **PASS** |
| 9 | Step retry after approval expired | Block payment execution (`INV-114`) | **PASS** |
| 10 | Step retry after treasury reservation expired | Block execution until reservation re-encumbered (`INV-105`) | **PASS** |
| 11 | Stale quote retry after expiry | Force replan / request fresh quote | **PASS** |
| 12 | Stale policy snapshot used after Constitution update | Detect hash mismatch; force policy re-evaluation | **PASS** |
| 13 | Stale risk decision retry | Require re-scoring if risk snapshot is older than 5m | **PASS** |
| 14 | Process crash after PaymentIntent creation | Recover existing intent ID; zero duplicate created (`INV-113`) | **PASS** |
| 15 | Process crash after Arc transaction broadcast | Transition to `AMBIGUOUS`; route to reconciliation (`INV-106`) | **PASS** |
| 16 | Fake blockchain receipt presented | Verify against on-chain block logs; reject fake receipt | **PASS** |
| 17 | Fake transaction hash presented | Reject unverified transaction hash (`INV-98`) | **PASS** |
| 18 | Duplicate webhook event delivered | Transactional outbox / inbox deduplication | **PASS** |
| 19 | Outbox message duplication | Consumer deduplication via unique event ID | **PASS** |
| 20 | Inbox replay attempt | Deduplication table blocks duplicate processing | **PASS** |
| 21 | Concurrent lease acquisition race | Database unique constraint ensures exactly one winner | **PASS** |
| 22 | Worker heartbeat spoofing | Authenticate worker identity; reject unauthorized heartbeat | **PASS** |
| 23 | Work queue flooding attempt | Enforce per-tenant queue depth limits | **PASS** |
| 24 | Retry storm from failing provider | Bounded exponential backoff with jitter and max attempts | **PASS** |
| 25 | Workflow explosion (unbounded sub-tasks) | Hard limit enforced by `ResourceBudget.MaxSteps` (default: 50) | **PASS** |
| 26 | Infinite replan loop | Limit enforced by `ResourceBudget.MaxReplans` (default: 3) | **PASS** |
| 27 | Task dependency cycle in DAG | Topological sort detects cycle and rejects execution | **PASS** |
| 28 | Cross-tenant workflow access breach | Strictly filter all queries by `tenant_id` (`INV-116`) | **PASS** |
| 29 | Operator privilege escalation | Non-operator denied execution of sensitive commands (`INV-117`) | **PASS** |
| 30 | Simulation-to-live confusion | Simulation workflow strictly prohibited from on-chain broadcast (`INV-107`) | **PASS** |
