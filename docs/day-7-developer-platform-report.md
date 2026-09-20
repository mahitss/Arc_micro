# AgentPay Day 7: Developer Platform, SDK, CLI & Integration Experience Report

## 1. Developer Experience Before Day 7

Prior to Day 7, AgentPay had established:
- A high-performance Go API gateway with Rust policy evaluation and Arc smart contract settlement.
- Database models for agents, services, policies, intents, executions, approvals, and emergency controls.
- API key authentication with permission scopes.
- Transactional outbox, domain events, and HMAC-SHA256 webhook delivery.

**Key Developer Friction Points Identified Before Day 7**:
- **Incomplete SDK Error Hierarchy**: Developers had limited error differentiation, needing to inspect raw JSON error strings rather than catching typed exceptions like `ValidationError`, `ConflictError`, or `InsufficientTreasuryError`.
- **No Polling Helper**: Developers building async flows had to write manual polling loops to wait for payment settlement on Arc.
- **No Developer CLI**: Developers had to use raw `curl` commands to inspect agents, services, payment intents, approvals, and webhooks.
- **Unformalized Agent Tool Contract**: AI agents lacked a standardized tool contract returning structured decisions with actionable next steps (`CONTINUE`, `WAIT_FOR_APPROVAL`, `WAIT_FOR_EXECUTION`, `HANDLE_DENIAL`).
- **No Python SDK**: Python AI agent developers (LangChain, CrewAI, AutoGen) had no native SDK.

---

## 2. Developer Experience After Day 7

Day 7 establishes AgentPay as an intuitive, production-grade developer platform:
- **TypeScript SDK (`@agentpay/sdk`)**:
  - Full typed error hierarchy (`AuthenticationError`, `AuthorizationError`, `ValidationError`, `NotFoundError`, `ConflictError`, `RateLimitedError`, `PolicyDeniedError`, `ApprovalRequiredError`, `InsufficientTreasuryError`, `ExecutionError`, `NetworkError`).
  - Bounded polling helper `paymentIntents.waitForCompletion(id, options)` respecting terminal states (`CONFIRMED`, `DENIED`, `FAILED`, `CANCELLED`, `EXPIRED`).
  - Dual-overload webhook signature verification helper (`agentpay.webhooks.verifySignature`).
  - Documented base-unit monetary amounts (6 decimals for USDC: `"2500000"` = 2.50 USDC).
- **Developer CLI (`@agentpay/cli`)**:
  - Standalone `agentpay` executable with secure config management (`agentpay config set api-key ...`).
  - Human-readable tables/cards and `--json` machine-readable output across agents, services, payments, approvals, transactions, events, and webhooks.
- **Python SDK (`agentpay`)**:
  - Native Python client in `packages/sdk-python` providing parity for Python AI agents.
- **Formalized Agent Tool Contract**:
  - `request_payment` tool returning structured `RequestPaymentResult` with `next_action` guidance.
- **Comprehensive Documentation**:
  - 5-minute quickstart (`docs/developer-quickstart.md`) and complete public API reference (`docs/api-reference.md`).

---

## 3. SDK Architecture

### TypeScript SDK (`packages/sdk-typescript`)
```
AgentPay
├── agents (list, get)
├── services (list)
├── paymentIntents (create, get, list, confirm, waitForCompletion)
├── approvals (list, get, approve, reject)
├── transactions (list)
├── events (list, get)
└── webhooks (create, list, get, update, delete, listDeliveries, test, verifySignature)
```

### Python SDK (`packages/sdk-python`)
```
AgentPay
├── agents (list, get)
├── services (list)
├── payment_intents (create, get, list, confirm, wait_for_completion)
├── approvals (list, get, approve, reject)
├── transactions (list)
├── events (list, get)
└── webhooks (create, list, get, update, delete, deliveries, test, verify_signature)
```

---

## 4. API Architecture

The public API is organized under `/v1` and protected by API key authentication:
- `POST /v1/payment-intents`: Create intent with idempotency key and policy evaluation.
- `GET /v1/payment-intents/{id}`: Inspect intent status, decision, and transaction hash.
- `POST /v1/payment-intents/{id}/confirm`: Trigger settlement on Arc.
- `GET /v1/agents` & `GET /v1/agents/{id}`: Query agent profiles and spending limits.
- `GET /v1/services`: List approved services.
- `GET /v1/approvals`: List pending human approvals.
- `POST /v1/approvals/{id}/approve` & `POST /v1/approvals/{id}/reject`: Human approval actions.
- `GET /v1/transactions`: Query Arc execution records.
- `GET /v1/events` & `GET /v1/events/{id}`: Query immutable audit events.
- `POST /v1/webhooks`: Register HTTPS endpoints (secret shown once).

---

## 5. CLI Architecture

Built in `packages/cli`, the `agentpay` tool offers:
- **Configuration Store**: Saved in `~/.agentpay/config.json` with restricted permissions (0o600). Secrets are masked (`ap_liv...3456`) in human displays.
- **Command Set**:
  - `agentpay config get / set`
  - `agentpay agents list / get`
  - `agentpay services list`
  - `agentpay payments create / get / list`
  - `agentpay approvals list`
  - `agentpay transactions list`
  - `agentpay events list`
  - `agentpay webhooks list`
- **Output Formats**:
  - Formatted human-readable tables/cards.
  - `--json` flag for integration into CI/CD pipelines and shell scripts.

---

## 6. Agent Integration Model (Formalized Tool Contract)

The agent tool contract standardizes how untrusted AI agents request financial transactions:

### Input Contract (`RequestPaymentInput`)
- `service_id`: Approved service provider identifier.
- `amount`: String in base units (e.g. `"1500000"` for 1.50 USDC).
- `asset`: Currency asset (default: `USDC`).
- `purpose`: High-level explanation of the procurement.
- `justification`: Detailed task rationale.
- `idempotency_key`: Client-generated idempotency key.

### Output Contract (`RequestPaymentResult`)
- `payment_intent_id`: Generated intent ID.
- `status`: Lifecycle status (`AUTHORIZED`, `APPROVAL_REQUIRED`, `DENIED`, etc.).
- `decision`: `ALLOW` | `APPROVAL_REQUIRED` | `DENY`.
- `risk`: `LOW` | `MEDIUM` | `HIGH`.
- `next_action`: Actionable guidance for the agent loop:
  - `CONTINUE`: Payment authorized/confirmed; proceed to retrieve paid payload.
  - `WAIT_FOR_APPROVAL`: Manual approval required; report ticket to human operator.
  - `WAIT_FOR_EXECUTION`: In-flight; await on-chain mining.
  - `HANDLE_DENIAL`: Policy rejected; pivot to alternative resource.
  - `HANDLE_FAILURE`: System or network error.

---

## 7. Webhook Integration

- **HMAC-SHA256 Signature**: Computed over `<timestamp>.<raw_body>` using the endpoint secret.
- **Replay Protection**: Rejects payloads older or newer than 300 seconds.
- **Dual Overloads**: Supports both positional arguments and options objects:
  ```typescript
  agentpay.webhooks.verifySignature({ payload, signature, secret, toleranceSeconds: 300 });
  ```
- **Consumer Idempotency**: Consumers are guided to record `event.id` in a unique-constrained database to ignore duplicate deliveries safely.

---

## 8. Authentication

- **API Keys**: Issued with format `ap_live_...` or `apk_live_...`.
- **Transmission**: Sent via HTTP header `Authorization: Bearer <api_key>`.
- **Zero Secrets Logged**: Gateway and client loggers strictly redact authentication headers and API keys.

---

## 9. Idempotency

- **Header**: `Idempotency-Key` passed in `paymentIntents.create()`.
- **Backend Behavior**: Retries with the same idempotency key return the existing payment intent without re-evaluating velocity or creating duplicate on-chain transactions.

---

## 10. Security Boundaries

1. **Zero Private Keys**: Neither SDKs nor AI agents hold private keys or sign transactions.
2. **No Direct Vault Interaction**: Smart contract calls to `AgentVault` are executed exclusively by AgentPay's backend execution gate.
3. **No Arbitrary Recipients**: Recipients are strictly resolved by AgentPay from the approved service registry.
4. **No Policy Bypasses**: All payments must evaluate spending rules and risk checks before authorization.

---

## 11. Examples

- **`examples/payment-agent/`**: Demonstrates the complete flow from user prompt to service lookup, formalized tool invocation, policy evaluation, and Arc settlement.
- **`examples/payment-agent/src/webhook-listener.ts`**: Express/Node.js webhook server demonstrating signature verification and idempotent event processing.
- **`examples/research-agent/`**: Reference autonomous agent conducting market analysis.

---

## 12. Tests Executed

1. **TypeScript SDK Tests (`packages/sdk-typescript/tests/sdk.test.ts`)**:
   - Initialization & defaults
   - Header propagation & authentication
   - Idempotency key header transmission
   - Typed error mapping (`AuthenticationError`, `NotFoundError`, `RateLimitedError`, `ValidationError`, `InsufficientTreasuryError`, `PolicyDeniedError`)
   - Zero-private-key invariant
   - Webhook signature verification (valid, invalid, stale, object overload)
   - Events resource querying
   - Polling helper (`waitForCompletion`)
   - **Result: 9/9 PASS (100%)**

2. **CLI Tests (`packages/cli/tests/cli.test.ts`)**:
   - Config set, get, and mask
   - USDC amount formatting
   - **Result: 2/2 PASS (100%)**

3. **Python SDK Tests (`packages/sdk-python/tests/test_sdk.py`)**:
   - Client initialization
   - Webhook signature verification (valid, invalid, stale)
   - Idempotency key propagation
   - Typed error mapping
   - **Result: 4/4 PASS (100%)**

4. **Web Control Center Tests (`apps/web`)**:
   - **Result: 14/14 PASS (100%)**

5. **Go Gateway Test Suite (`services/gateway/...`)**:
   - **Result: PASS (100%)**

---

## 13. Known Limitations

1. **Local CLI Config Store**: The CLI stores configuration in `~/.agentpay/config.json`. On multi-user systems, users must ensure their home directories are not world-readable.
2. **Polling Latency vs Push**: `waitForCompletion()` polls every 1s by default. For production enterprise applications, receiving webhook push notifications is strongly recommended over polling.

---

## 14. Deferred Work

1. **Streaming Responses**: Support Server-Sent Events (SSE) for streaming policy evaluation progress.
2. **CLI Interactive Setup**: Add an interactive `agentpay init` wizard that guides developers through provisioning an agent and creating their first API key.
3. **Language SDK Expansions**: Consider Go and Rust client libraries for embedded microservices in Day 8+.

---

## 15. Files Changed

### TypeScript SDK
- `packages/sdk-typescript/src/errors.ts` (MODIFIED)
- `packages/sdk-typescript/src/types.ts` (MODIFIED)
- `packages/sdk-typescript/src/resources/payment-intents.ts` (MODIFIED)
- `packages/sdk-typescript/src/resources/webhooks.ts` (MODIFIED)
- `packages/sdk-typescript/src/client.ts` (MODIFIED)
- `packages/sdk-typescript/src/index.ts` (MODIFIED)
- `packages/sdk-typescript/tests/sdk.test.ts` (MODIFIED)

### Developer CLI
- `packages/cli/package.json` (NEW)
- `packages/cli/tsconfig.json` (NEW)
- `packages/cli/src/config.ts` (NEW)
- `packages/cli/src/output.ts` (NEW)
- `packages/cli/src/index.ts` (NEW)
- `packages/cli/tests/cli.test.ts` (NEW)

### Example Payment Agent
- `examples/payment-agent/package.json` (NEW)
- `examples/payment-agent/tsconfig.json` (NEW)
- `examples/payment-agent/README.md` (NEW)
- `examples/payment-agent/.env.example` (NEW)
- `examples/payment-agent/src/agent-tool.ts` (NEW)
- `examples/payment-agent/src/index.ts` (NEW)
- `examples/payment-agent/src/webhook-listener.ts` (NEW)

### Python SDK
- `packages/sdk-python/pyproject.toml` (NEW)
- `packages/sdk-python/agentpay/__init__.py` (NEW)
- `packages/sdk-python/agentpay/client.py` (NEW)
- `packages/sdk-python/agentpay/errors.py` (NEW)
- `packages/sdk-python/agentpay/webhook.py` (NEW)
- `packages/sdk-python/tests/test_sdk.py` (NEW)

### Documentation
- `docs/developer-quickstart.md` (NEW)
- `docs/api-reference.md` (NEW)
- `docs/day-7-developer-platform-report.md` (NEW)
