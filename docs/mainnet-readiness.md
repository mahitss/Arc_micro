# Arc Mainnet Readiness Checklist & Audit Verification

This checklist tracks the production-readiness verification of AgentPay prior to mainnet capital allocation.
Items are marked `[X]` only when verified with reproducible code or test evidence in the repository.

---

## 1. NETWORK CONFIGURATION
- [X] **Correct Arc Mainnet Chain ID:** Verified as `5042` across contracts, gateway config, and deploy script.
- [X] **Correct RPC Endpoint Configuration:** Configured to `https://rpc.mainnet.arc.io` with fallback client dialer.
- [X] **Authoritative USDC Contract Address:** Standardized as `0x3600000000000000000000000000000000000000` on Arc network.
- [X] **Block Explorer Integration:** Verified link generation to `https://explorer.arc.io/tx/{txHash}`.

---

## 2. SMART CONTRACT (AgentVault)
- [X] **AgentVault Compilation & Tests:** 42 Foundry test cases passing (`forge test`), including 256 fuzz runs on daily limit invariants.
- [X] **Ownership & Access Control:** `onlyOwner` restricts policy configuration, recipient management, pauses, and emergency withdrawals.
- [X] **On-Chain Policy Limits:** Enforces per-transaction limits, daily spending limit, and daily transaction count.
- [X] **Recipient Allowlist & Blocklist:** Tested and verified; blocked recipients revert even if allowlisted (`test_28_blocked_recipient_cannot_receive_funds_even_if_allowlisted`).
- [X] **Contract Emergency Pause:** `pause()` and `unpause()` verified (`test_26_pause_prevents_payment`, `test_27_unpause_restores_payment_functionality`).
- [ ] **Mainnet Production Deployment:** Pending formal deployment execution via `scripts/deploy_mainnet.sh --confirm`.

---

## 3. BACKEND & GATEWAY INFRASTRUCTURE
- [X] **Production Environment Defaults:** Fails closed if missing critical configuration; live execution disabled by default (`ENABLE_LIVE_EXECUTION=false`).
- [X] **Database Schema & Migrations:** 8 numbered migrations with constraints, foreign keys, and indexes for agents, payment intents, and executions.
- [X] **Deterministic Policy Engine:** Rust microservice passes 49 unit and invariant tests (`cargo test`), integer arithmetic only (no floating point money).
- [X] **Execution Worker & Nonce Management:** Serialized transaction dispatching with receipt verification.
- [X] **Readiness & Liveness Separation:** `GET /health` reports process liveness; `GET /ready` verifies Policy Engine, Arc RPC, and Database connectivity.
- [X] **Structured Logging & Correlation IDs:** Standardized `req_id` logging on all HTTP routes and internal lifecycle transitions.

---

## 4. SECURITY & THREAT MITIGATION
- [X] **API Key Authentication:** SHA-256 hashed storage, masked keys, secret revealed once, constant-time validation (`internal/auth/apikey.go`).
- [X] **Server-Side Authorization & IDOR Protection:** Enforced across agents, budgets, payment intents, approvals, and webhooks; verified in `TestDay9_IDOR_CrossOrganizationIsolation`.
- [X] **SSRF Protection on Webhooks:** `SSRFValidator` blocks loopback, private ranges, link-local, and cloud metadata (`169.254.169.254`).
- [X] **Adversarial Prompt Injection Defense:** External LLM inputs treated as untrusted data; recipients resolved strictly from database registry.
- [X] **Resource Bounding & Abuse Protection:** 1MB global body limit (`MaxRequestBodyBytes`), 10s HTTP read/write timeouts.
- [X] **Zero Secret Hardcoding:** Repository scanned for secrets; only placeholders in documentation and tests.

---

## 5. FINANCIAL INVARIANTS & INTEGRITY
- [X] **Zero Agent Private Key Invariant:** Verified in TS SDK, Python SDK, and Gateway architecture.
- [X] **Hard Denial Inviolability:** Verified: Human approval cannot override policy `DENY` (`TestDay9_FinancialInvariants/HardDenyCannotBeOverriddenByApproval`).
- [X] **Agent Self-Approval Prohibited:** Verified: `approver_id == agent_id` returns 403 `SELF_APPROVAL_PROHIBITED`.
- [X] **Server-Side Recipient Resolution:** Verified: User-supplied recipient data is discarded (`TestDay9_FinancialInvariants/TrustedServiceRecipientNeverUserControlled`).
- [X] **Treasury Concurrency Safety:** Verified: Concurrency mutex prevents double-reservation across concurrent requests (`TestDay9_ConcurrencyAndRaceConditions/TreasuryConcurrentReservationRace`).
- [X] **Idempotency Protection:** Verified: Duplicate requests return identical intent without duplicate charges (`TestDay9_FinancialInvariants/IdempotencyPreventsDuplicatePaymentCreation`).
- [X] **Ambiguous Transaction Lifecycle:** Verified: Confirmation timeouts transition to `StateAmbiguous` and recover via `ReconcileTransaction`.

---

## 6. OBSERVABILITY & AUDITABILITY
- [X] **Immutable Audit Trail:** Append-only audit logs recorded on every policy evaluation, approval, pause, and API key generation.
- [X] **Domain Event Publishing:** Event dispatcher emits `payment_intent.created`, `authorized`, `executing`, `confirmed`, `denied`.
- [X] **Webhook Signature Verification:** HMAC-SHA256 signature header (`X-AgentPay-Signature`) with per-endpoint secret and timestamp verification.
- [X] **Prometheus Metrics:** Default metrics endpoint `/metrics` tracking latencies, payment volumes, and decision distributions.

---

## 7. OPERATIONS & INCIDENT RESPONSE
- [X] **Incident Response Runbook:** Created `docs/incident-response.md` covering 10 operational scenarios.
- [X] **Multi-Tier Kill Switches:** Tested and operational (Agent Pause, Organization Pause, Global System Pause).
- [X] **Secure Mainnet Deployment Script:** `scripts/deploy_mainnet.sh` hardened with explicit `DEPLOY-ARC-MAINNET` confirmation and pre-flight RPC chain verification.
- [ ] **Continuous Production Telemetry Integration:** Sentry/Datadog agent integration for production cloud deployment.
