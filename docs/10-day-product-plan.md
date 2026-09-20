# AgentPay 10-Day Product Implementation Plan

## 1. Executive Summary: AgentPay MVP v1

> **One-Sentence Product Definition**:
> **AgentPay provides autonomous AI agents with programmable, policy-controlled USDC payment infrastructure on Arc through deterministic off-chain verification, trusted service registries, human approval workflows, and on-chain vault settlement.**

### The Recommended Vertical Slice
The 10-day MVP delivers one seamless, production-grade vertical flow:
```
Python / TypeScript Agent (SDK)
      ↓ (Payment Intent via API Key)
Go Gateway & Multi-Tenant Registry
      ↓ (Evaluate Rules)
Rust Policy Engine (Pure Deterministic Math)
      ↓ (If Amount >= Approval Threshold)
Human Approval Workflow (Web Control Center / Slack)
      ↓ (If Approved)
Go Executor (Signs EIP-1559)
      ↓ (executePayment)
AgentVault.sol (Arc Mainnet: 5042)
      ↓ (Transfer)
Canonical USDC (0x3600...0000)
      ↓ (Webhook & Event)
Reconciled & Audited in Database
```

---

## 2. Work Prioritization (P0 – P3)

### P0 — Absolutely Required (Core Infrastructure)
1. **Multi-Tenant Organization & API Key Authentication**: Secure header-based auth for external agent integration.
2. **Policy Engine V2 (Rust)**: Add approval thresholds, agent-specific limits, and emergency pause flags.
3. **Human Approval Workflow**: `APPROVAL_REQUIRED` state, approver role authorization, and timeout expiration.
4. **Arc Mainnet Live Deployment & Real Transaction**: Broadcast `AgentVault.sol` to Arc Mainnet with funded operator key and verify real on-chain transaction.
5. **Python & TypeScript SDKs**: `pip install agentpay` and `npm install @agentpay/sdk` with tool definitions for LangChain.
6. **Immutable Audit Trail**: Append-only PostgreSQL audit log.

### P1 — Important (Enterprise Reliability)
1. **Webhook Event Dispatcher**: HMAC-SHA256 signed event notifications with exponential backoff retries.
2. **Deterministic Risk Heuristics**: Budget proximity, velocity checks, and new recipient scoring.
3. **Interactive OpenAPI / Swagger Documentation**: Embedded in Next.js Web Control Center.
4. **Web Control Center Approval Queue**: Dedicated UI dashboard tab for financial controllers to approve/reject intents.

### P2 — Useful (Developer Ergonomics)
1. **Developer CLI (`agentpay`)**: Local simulation and policy testing tool.
2. **Slack / Discord Approval Notifications**: Bot notification when payment enters `APPROVAL_REQUIRED`.
3. **Service Registry Self-Service Form**: UI for registering custom organizational service endpoints.

### P3 — Later (Post-MVP Scale)
1. Multi-asset cross-chain bridges.
2. Decentralized on-chain registry governance.
3. Machine-learning anomaly detection for agent behavior.

---

## 3. Concrete 10-Day Execution Schedule

### DAY 1: Multi-Tenancy & API Key Security
- **Tasks**:
  - Run database migration `000002_multi_tenant.up.sql`: Add `organizations`, `users`, `api_keys`, and foreign keys.
  - Implement `services/gateway/internal/auth/apikey.go`: SHA-256 hashed API key validation.
  - Replace `AuthPlaceholder` middleware with active `APIKeyAuth` middleware.
  - Add API key generation endpoints (`POST /v1/api-keys`, `DELETE /v1/api-keys/{id}`).
- **Definition of Done**: Requests without a valid `Authorization: Bearer apk_...` receive HTTP 401; valid keys resolve `organization_id` in request context with 100% test pass rate.

### DAY 2: Policy Engine V2 (Rust Extension)
- **Tasks**:
  - Update `services/policy-engine/src/domain/policy.rs` with `approval_threshold`, `hourly_limit`, and `global_paused`.
  - Update `services/policy-engine/src/engine/authorize.rs` to return `PolicyDecision::ApprovalRequired`.
  - Extend Rust test suite with 10 new unit tests covering approval thresholds and velocity caps.
  - Update Go policy client to parse `APPROVAL_REQUIRED` decision.
- **Definition of Done**: `cargo test` passes 42+ tests; amounts $\ge$ approval threshold return `APPROVAL_REQUIRED` decision code.

### DAY 3: Human Approval State Machine & API
- **Tasks**:
  - Extend Go intent state machine in `services/gateway/internal/intent/statemachine.go` with `APPROVAL_REQUIRED`, `APPROVED`, `REJECTED`, and `CANCELLED`.
  - Implement approval handlers: `POST /v1/approvals/{id}/approve` and `POST /v1/approvals/{id}/reject`.
  - Implement atomic CAS lock preventing duplicate approvals.
  - Implement approval TTL background sweeper for `EXPIRED` status.
- **Definition of Done**: Concurrent approval requests cleanly serialize (1 succeeds, 1 receives HTTP 409); rejected intents abort with zero blockchain interaction.

### DAY 4: TypeScript SDK (`@agentpay/sdk`)
- **Tasks**:
  - Initialize `packages/sdk-ts` with TypeScript 5, Axios/fetch, and full type definitions.
  - Implement `AgentPay` client with `.payments.createIntent()`, `.payments.getIntent()`, and `.services.list()`.
  - Export LangChain / Vercel AI SDK compatible tool definitions.
  - Write SDK integration tests mocking gateway responses.
- **Definition of Done**: An external Node.js script can import `@agentpay/sdk`, emit an intent, and inspect status with full type completion.

### DAY 5: Python SDK (`agentpay-python`)
- **Tasks**:
  - Initialize `packages/sdk-py` with Pydantic v2 and `httpx`.
  - Implement synchronous and asynchronous `AgentPay` clients.
  - Build `@tool` decorator compatible with LangChain, CrewAI, and AutoGen.
  - Publish package build via `pyproject.toml` / `flit`.
- **Definition of Done**: A Python 3.10+ script can run `from agentpay import AgentPay; client.payments.create_intent(...)` successfully.

### DAY 6: Webhooks & Event Dispatch Engine
- **Tasks**:
  - Implement `services/gateway/internal/webhook/dispatcher.go` with worker pool.
  - Generate HMAC-SHA256 signatures with timestamped headers (`X-AgentPay-Signature`).
  - Implement exponential backoff retry queue for HTTP 5xx / timeouts.
  - Add webhook management APIs: `GET/POST/DELETE /v1/webhooks`.
- **Definition of Done**: State transitions to `CONFIRMED` or `APPROVAL_REQUIRED` automatically trigger signed webhook deliveries verified by test receiver.

### DAY 7: Immutable Audit Trail & Telemetry
- **Tasks**:
  - Create `audit_events` PostgreSQL table with append-only permissions.
  - Instrument Go gateway handlers to record all state changes with correlation `request_id`.
  - Implement `GET /v1/audit/events` with filtering by actor, event type, and date.
  - Add Audit Trail view in the Next.js Web Control Center.
- **Definition of Done**: Every intent creation, policy denial, human approval, and on-chain settlement produces a queryable audit record.

### DAY 8: Web Control Center Approval Dashboard
- **Tasks**:
  - Build `/approvals` dashboard in Next.js showing pending intents with risk scores.
  - Add 1-click "Approve" and "Reject" buttons with confirmation modals.
  - Add real-time polling / SSE connection for incoming approval requests.
  - Add API key management settings UI (`/settings/api-keys`).
- **Definition of Done**: Financial controller can view pending agent requests in the browser, review justification, and approve/reject with instant UI updates.

### DAY 9: Arc Mainnet Live Deployment & First Real Transaction
- **Tasks**:
  - Fund operator deployment wallet with native Arc USDC for gas.
  - Execute `scripts/deploy_mainnet.sh` to broadcast `AgentVault.sol` to Arc Mainnet.
  - Verify contract bytecode and ownership on `https://explorer.arc.io`.
  - Execute a live 0.05 USDC payment from the deployed vault to a verified recipient.
  - Update `docs/deployed-resources.md` and `docs/submission-manifest.md` with verified transaction hash and block number.
- **Definition of Done**: Real Arc Mainnet transaction hash documented and verifiable on `explorer.arc.io`.

### DAY 10: End-to-End Validation, Security Audit & Launch Freeze
- **Tasks**:
  - Run clean-clone installation from fresh directory.
  - Execute end-to-end Python LangChain agent test against live gateway and Arc Mainnet.
  - Execute automated penetration tests: Prompt injection, double-spend replay, invalid signatures, rate-limit bursts.
  - Record polished 3–5 minute video demonstration following `docs/demo-script.md`.
  - Tag release `v1.0.0-mvp` on GitHub.
- **Definition of Done**: 100% tests passing across Rust, Go, Solidity, TypeScript, and Python; live Arc transaction verifiable on explorer; video demo uploaded.

---

## 4. Feature Specification Matrix

| Feature | Why It Matters | Dependencies | Affected Services | Tests Required | Security Implications | DoD | Priority | Day |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **Multi-Tenant API Keys** | Allows external agents to authenticate safely | PostgreSQL | Go Gateway | Unit & middleware auth tests | Prevents cross-tenant access | Auth required on all non-health routes | P0 | Day 1 |
| **Policy Engine V2** | Adds human approval threshold & velocity | Rust engine | Rust, Go | 10 new Rust unit tests | Deterministic containment | Pure integer math passes 42+ tests | P0 | Day 2 |
| **Human Approval FSM** | Financial backstop for high-value agent actions | Policy V2 | Go Gateway, DB | Concurrency & CAS tests | Prevents agent self-approval | Double approvals impossible via CAS | P0 | Day 3 |
| **TypeScript SDK** | Enables JS/TS agent framework integration | API V2 | `packages/sdk-ts` | SDK unit & mock tests | No private keys in client code | Published local npm package | P0 | Day 4 |
| **Python SDK** | Enables LangChain, CrewAI, AutoGen integration | API V2 | `packages/sdk-py` | Pytest suite | Clean tool schemas | Pip-installable package | P0 | Day 5 |
| **Webhook Dispatcher** | Asynchronous notifications for agent runtimes | Audit events | Go Gateway | Webhook signature tests | HMAC prevents forgery | Signed deliveries with retries | P1 | Day 6 |
| **Immutable Audit Log** | Regulatory and compliance auditability | PostgreSQL | Go Gateway, DB | DB permissions test | Read-only historical data | Append-only table verified | P0 | Day 7 |
| **Approval UI Queue** | Human controller web interface | Approval API | Next.js (`apps/web`) | Component & E2E tests | Strict RBAC session check | Approvals processed in browser | P1 | Day 8 |
| **Arc Mainnet Vault** | Real settlement substrate | Funded key | Contracts, Go | Foundry, Arc RPC test | Real funds at stake | Verified contract & live tx on explorer | P0 | Day 9 |
| **E2E Agent Demo & Freeze**| Demonstrates real utility to customers/reviewers | All components | Full stack | End-to-end integration | Zero vulnerabilities | Video recorded, repo frozen | P0 | Day 10 |

---

## 5. Product Moat & Defensibility

1. **Deterministic Off-Chain Policy Engine**: While competitors use slow, non-deterministic LLM evaluators or basic multisigs, AgentPay's Rust policy engine provides sub-millisecond mathematical guarantees with zero prompt injection vulnerability.
2. **Service Trust Registry**: The curated service catalog abstracts away raw blockchain calldata and recipient addresses, turning crypto payments into structured API procurement.
3. **Dual-Layer Enforcement (Rust + Solidity)**: Defense-in-depth where a compromise of off-chain servers is still stopped cold by immutable on-chain smart contract limits on Arc.
4. **Agent-Native SDK Ecosystem**: First-class tooling for LangChain and CrewAI establishing AgentPay as the default payment primitive for AI agents.

---

## 6. Competitive Landscape Analysis

| Category | Representative Players | Overlap with AgentPay | Key Differences & AgentPay Advantage |
| :--- | :--- | :--- | :--- |
| **Agent Wallets** | Turnkey, Privy, Coinbase AgentKit | Provides wallets/signers for agents | Agent wallets give agents signing keys. AgentPay **never** gives agents keys; enforces deterministic policy and service registries before any transaction can exist. |
| **Crypto Payment APIs** | Stripe Crypto, BVNK, Helio | Programmatic crypto checkout | Designed for human-to-merchant checkouts, not machine-to-machine micropayments with automated spending limits. |
| **Stablecoin Infrastructure** | Bridge, ZeroDev, Safe | Account abstraction and smart accounts | Multisigs require manual human signatures for every transaction; AgentPay automates micro-payments under threshold and routes only high-risk actions to humans. |
| **AI Agent Frameworks** | LangChain, AutoGen, CrewAI | Agent orchestration and tool calling | Frameworks have reasoning loops but lack compliant financial guardrails, payment settlement, and accounting controls. |
| **Enterprise Spend Management** | Brex, Ramp, Mercury | Corporate cards and spend limits | Designed for human employees and fiat rails, incapable of programmatic sub-second settlement on blockchains. |
