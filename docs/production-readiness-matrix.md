# AgentPay Production Readiness Matrix

**Date:** September 22, 2026  
**Status Authority:** Principal CTO, Security Engineer, SRE, and Release Engineer  
**Security Freeze:** Day 9 Final Freeze  
**Allowed Statuses:** `VERIFIED`, `PARTIAL`, `SIMULATED`, `UNVERIFIED`, `BLOCKED`

---

## Production Readiness Matrix by Domain

| Domain | Status | Evidence | Residual Risk | Recommended Action |
|---|---|---|---|---|
| **Architecture** | `VERIFIED` | Decoupled 3-tier architecture: Untrusted Agent → AgentPay Gateway/Policy Controls → Arc Mainnet Settlement. Agents never possess private keys. | Single point of failure if Gateway goes down without HA clustering. | Deploy redundant Gateway replicas behind a high-availability load balancer with sticky sessions or shared database. |
| **Database** | `VERIFIED` | PostgreSQL repository (`storage/postgres_repository.go`), idempotent migrations (`migrations/`), fail-closed production gate (`ErrDatabaseURLRequiredInProduction`). All queries enforce `org_id`. | Unindexed high-volume audit event queries under extreme load. | Monitor query execution plans; add composite indexes on `(organization_id, timestamp)` as audit table scales. |
| **Policy** | `VERIFIED` | Rust Policy Engine with 57 automated tests (`cargo test`), Criterion microsecond benchmarks (`cargo bench`), mathematical base-unit limits, and velocity counters. | Policy engine restart clears ephemeral in-memory velocity window if not backed by Redis/DB. | Back policy velocity counters with persistent Redis or PostgreSQL cache for multi-instance horizontal scaling. |
| **Risk** | `VERIFIED` | Explainable scoring engine in Rust (`src/engine/risk.rs`). Classifies LOW/MEDIUM/HIGH without non-deterministic LLM evaluation. Evaluated in unit tests. | Static risk weight heuristics may not catch evolving multi-vector fraud patterns. | Incorporate historical service dispute rate and dynamic agent reputation scoring. |
| **Approval** | `VERIFIED` | Multi-tenant human-in-the-loop approval workflows (`services/gateway/internal/service/domain_service.go`). Invariant 3 (cannot override DENY) and Invariant 4 (agent cannot self-approve) verified in tests. | Approval expiration window requires active human monitoring or notification webhooks. | Configure automated Slack/PagerDuty webhook alerts for pending high-risk approvals. |
| **Treasury** | `VERIFIED` | `DefaultTreasuryService` enforces mutex-synchronized reservation calculations (`ReserveFunds`). Tested under concurrent race condition (`TestDay9_ConcurrencyAndRaceConditions`). | If on-chain balance query to Arc fails, treasury relies on last known cached balance or fails closed. | Maintain dedicated fallback RPC providers (e.g. Infura/Alchemy or secondary Arc nodes). |
| **Signer** | `PARTIAL` | `LocalSigner` with EIP-1559 support, transaction binding verification (`TransactionBinding`), and address recovery. KMS/HSM is `NOT IMPLEMENTED` and strictly fails closed (`ErrKMSSignerUnavailable`). | Hot relayer private key stored in memory on the Gateway host. | Integrate AWS KMS / GCP Cloud HSM adapter for production mainnet key isolation before large capital flows. |
| **AgentVault** | `VERIFIED` | Solidity contract `AgentVault.sol` passed all 42 Foundry tests including 3 fuzz suites (`forge test`). Enforces per-tx limit, daily spend cap, daily tx count, allowlist/blocklist, and reentrancy guard. | Contract `owner` possesses `withdraw()` emergency privilege. If relayer key is owner, relayer compromise exposes vault funds. | Transfer contract ownership to an institutional multi-signature cold wallet (e.g. Gnosis Safe); grant hot relayer only payment execution role. |
| **Arc Mainnet** | `PARTIAL` | Arc RPC (`https://rpc.mainnet.arc.io`) reachable, Chain ID `5042` (`0x13b2`) verified, native USDC bytecode verified at `0x3600000000000000000000000000000000000000`. AgentVault not yet deployed to live mainnet. | Real mainnet settlement has not occurred on-chain. | Operator must execute `./scripts/deploy_mainnet.sh --confirm` with funded relayer to establish live contract deployment. |
| **Payment FSM** | `VERIFIED` | Explicit transition matrix in `services/gateway/internal/intent/statemachine.go`. Terminal states (`CONFIRMED`, `DENIED`, `FAILED`, `CANCELLED`) have zero outgoing transitions. Atomic CAS database transitions prevent double execution. | Long-running ambiguous state requires reconciliation daemon. | Run transaction reconciliation worker as a background cron daemon. |
| **Concurrency** | `VERIFIED` | Atomic database CAS transitions (`CompareAndSwapIntentStatus`), mutex-guarded treasury reservations, and synchronized approval resolution tested under concurrent requests. | High-concurrency Postgres transaction contention under thousands of requests per second. | Evaluate optimistic locking with retry loops or distributed Redis redlock if horizontal scaling is required. |
| **API Security** | `VERIFIED` | SHA-256 API key hashing, tenant isolation enforced on every route, IDOR defended (`TestDay9_IDOR_CrossOrganizationIsolation`), input size limit (1MB), and rate limiting middleware. | Public IP rate limiting can affect users behind shared corporate NAT. | Support authenticated API key token bucket rate limiting alongside IP-based limits. |
| **SDKs** | `VERIFIED` | TypeScript SDK (14/14 tests pass), Python SDK (9/9 tests pass), Developer CLI (3/3 tests pass). All enforce zero private key handling, typed errors, and float-safe integer base units. | Community wrappers in other languages (Go SDK, Rust SDK) not yet published. | Publish official Go and Rust client libraries following initial launch. |
| **Webhooks** | `VERIFIED` | HMAC-SHA256 signatures (`t=<unix>,v1=<sig>`), constant-time comparison (`hmac.Equal`), SSRF protection (`SSRFValidator` blocks loopback, private RFC 1918, metadata 169.254.x.x), delivery retry with exponential backoff. | Malicious subscriber endpoints could delay worker pool if timeout is too long. | Webhook timeouts are bounded to 5 seconds with asynchronous non-blocking worker pool. |
| **Observability** | `VERIFIED` | Structured logging with `req_id`, `payment_id`, `trace_id`. Health (`/health`) and Readiness (`/ready`) probes inspect Policy Engine, Storage, and Arc RPC. Sensitive secrets redacted from logs. | Centralized log aggregator (ELK/Datadog) pipeline not bundled in default docker-compose. | Ingest structured JSON stdout into cloud log aggregators via standard Docker log drivers. |
| **Frontend** | `VERIFIED` | Next.js 14 Web Dashboard builds cleanly (`19/19` static routes). Visualizes Flight Recorder traces, live vs simulation badges, interactive Security Lab, and service discovery. | Dashboard connects to local gateway URL by default (`NEXT_PUBLIC_GATEWAY_URL`). | Configure production CDN/DNS and environment-specific gateway URLs for deployment. |
| **Adversarial Security** | `VERIFIED` | Automated Security Lab (`services/gateway/internal/adversarial/runner.go`) executes 10 attack scenarios (Hard Deny Bypass, Recipient Override, Budget Bypass, Replay, IDOR, SSRF). 100% pass rate. | Novel zero-day evasion techniques in prompt-driven tool interactions. | Maintain continuous red-team fuzzing and prompt injection benchmarking suite. |
| **CI/CD** | `VERIFIED` | GitHub Actions workflow (`.github/workflows/ci.yml`) validates Web, Gateway, Policy Engine, Solidity Contracts, TS SDK, Python SDK, and CLI on every push and pull request. | Live mainnet credentials cannot be tested in CI. | Utilize simulated Arc local node (Anvil/Hardhat) for end-to-end integration tests in CI. |
| **Docker** | `VERIFIED` | Multi-stage minimal Dockerfiles (`alpine:3.20`, `node:20-alpine`), unprivileged execution, container healthchecks, and isolated bridge network in `docker-compose.yml`. | Database credentials use default development values if `.env` is unconfigured. | Enforce secret injection from production secret managers during orchestration. |
| **Documentation** | `VERIFIED` | Complete runbooks, formal invariants, threat model, API references, architecture diagrams, and reviewer quickstart. Unverified claims removed or clarified. | Documentation updates must be maintained in sync with protocol updates. | Enforce documentation verification in release checklists. |
| **Incident Response** | `VERIFIED` | Comprehensive Incident Response Runbook (`docs/incident-response.md`) covering SEV-0 through SEV-3, 4-tier emergency pauses, key compromise recovery, ambiguous tx handling, and database outages. | Response procedures rely on operator operational discipline and key custody. | Conduct periodic incident simulation drills and tabletop exercises. |

---

## Domain Status Summary

- **VERIFIED:** 19 Domains
- **PARTIAL:** 2 Domains (Signer: local key verified, KMS/HSM not implemented; Arc Mainnet: RPC/USDC verified, AgentVault contract not yet deployed to live mainnet)
- **SIMULATED:** 0 Domains
- **UNVERIFIED:** 0 Domains
- **BLOCKED:** 0 Domains

---

## Release Blocker Evaluation

1. **P0 Blockers:** **0**
2. **P1 Accepted Production Risks:**
   - **KMS/HSM Implementation:** Status is `NOT IMPLEMENTED`. Gateway uses `LocalSigner`. Production deployment with significant capital must use HSM key custody.
   - **Live Mainnet Deployment:** Status is `NOT VERIFIED`. Arc RPC and USDC bytecode are live, but `AgentVault` deployment on Arc Mainnet requires operator execution of `./scripts/deploy_mainnet.sh --confirm`.
   - **Vault Single-Role Ownership:** `AgentVault.sol` ownership should be assigned to a Gnosis Safe multisig with separate execution roles.
