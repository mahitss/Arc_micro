# AgentPay API Architecture V2

## 1. Current API Surface Audit

In the current Go Gateway (`services/gateway/internal/http/router.go`):

| Endpoint | Method | Status | Description |
| :--- | :---: | :---: | :--- |
| `/health` | `GET` | Active | Liveness check returning HTTP 200. |
| `/ready` | `GET` | Active | Readiness probe checking Rust policy client and DB storage. |
| `/metrics` | `GET` | Active | In-memory Prometheus-style operational metrics. |
| `/v1/payments/authorize` | `POST` | Active | Direct proxy to Rust Policy Engine. |
| `/v1/payments/execute` | `POST` | Active | Direct authorization + execution composite. |
| `/v1/agents/tasks` | `POST` | Active | Agent task prompt $\rightarrow$ payment intent generation. |
| `/v1/payment-intents` | `GET` | Active | List payment intents. |
| `/v1/payment-intents/{id}` | `GET` | Active | Get specific payment intent details. |
| `/v1/payment-intents/{id}/authorize` | `POST` | Active | Transition intent from `CREATED` $\rightarrow$ `AUTHORIZED` / `DENIED`. |
| `/v1/payment-intents/{id}/confirm` | `POST` | Active | Atomic CAS transition $\rightarrow$ `EXECUTING` $\rightarrow$ broadcast. |
| `/v1/agents` | `GET` | Active | List registered agents. |
| `/v1/agents/{id}` | `GET` | Active | Get agent details and policy summary. |
| `/v1/services` | `GET` | Active | List approved services from registry catalog. |
| `/v1/transactions` | `GET` | Active | List transaction execution history. |

---

## 2. Proposed API Surface V2

The V2 API standardizes RESTful patterns, introduces multi-tenant organization scoping via API keys, and adds endpoints for Approvals, Webhooks, and Audit Trails.

### 1. Authentication & Scoping
- All requests (except `/health` and `/ready`) require:
  `Authorization: Bearer apk_live_...`
- Resolves to `organization_id` and optional `agent_id` scope.

---

### 2. Complete Endpoint Specification

#### A. Organizations & API Keys
- `GET /v1/organization` — View current organization details and spending limits.
- `GET /v1/api-keys` — List active API keys.
- `POST /v1/api-keys` — Create a new API key (returns plaintext key once).
- `DELETE /v1/api-keys/{id}` — Revoke an API key immediately.

#### B. Agents & Policies
- `GET /v1/agents` — List agents in the organization.
- `POST /v1/agents` — Provision a new agent.
- `GET /v1/agents/{id}` — Get agent profile, assigned vault, and current policy.
- `PUT /v1/agents/{id}` — Update agent metadata or toggle `ACTIVE` / `PAUSED`.
- `GET /v1/agents/{id}/policy` — Retrieve the active spending policy.
- `PUT /v1/agents/{id}/policy` — Update spending limits, approval thresholds, and allowlists.

#### C. Services (Service Registry)
- `GET /v1/services` — List all services available to the organization (system + custom).
- `POST /v1/services` — Create a custom private service destination.
- `GET /v1/services/{id}` — Retrieve service metadata, price ceiling, and recipient address.
- `PUT /v1/services/{id}` — Update service status (`ACTIVE`, `SUSPENDED`) or pricing.

#### D. Payment Intents & Lifecycle
- `POST /v1/payment-intents` — **Primary Agent Endpoint**: Emits a new payment intent. Evaluates policy immediately. Returns status (`AUTHORIZED`, `APPROVAL_REQUIRED`, or `DENIED`).
- `GET /v1/payment-intents` — Query intents with pagination and filters (`?status=...&agent_id=...`).
- `GET /v1/payment-intents/{id}` — Retrieve full intent details, risk score, and execution status.
- `POST /v1/payment-intents/{id}/cancel` — Cancel an authorized intent before execution.

#### E. Human Approvals
- `GET /v1/approvals` — List pending approval requests (`status=PENDING`).
- `POST /v1/approvals/{id}/approve` — Approve an intent (requires `APPROVER` role). Transitions intent $\rightarrow$ `APPROVED`.
- `POST /v1/approvals/{id}/reject` — Reject an intent with optional reason. Transitions intent $\rightarrow$ `REJECTED`.

#### F. Execution & Transactions
- `POST /v1/payment-intents/{id}/execute` — Trigger execution for an `AUTHORIZED` or `APPROVED` intent.
- `GET /v1/transactions` — Query on-chain settlements with filters (`?agent_id=...&from=...`).
- `GET /v1/transactions/{hash}` — Get verified Arc transaction receipt and `PaymentExecuted` event.

#### G. Treasury & Balances
- `GET /v1/treasury/summary` — Organization-wide pooled vault balance and allocated budgets.
- `GET /v1/treasury/vaults/{id}` — On-chain `AgentVault` balance, daily limits, and pause state.
- `POST /v1/treasury/vaults/{id}/pause` — Emergency pause on-chain smart contract.
- `POST /v1/treasury/vaults/{id}/withdraw` — Emergency sweep of USDC to cold storage.

#### H. Audit Trail & Webhooks
- `GET /v1/audit/events` — Query immutable audit event log (`?event_type=...&resource_id=...`).
- `GET /v1/webhooks` — List configured webhook endpoints.
- `POST /v1/webhooks` — Register a webhook endpoint with subscribed event types.
- `DELETE /v1/webhooks/{id}` — Remove a webhook endpoint.
- `GET /v1/webhooks/{id}/deliveries` — View delivery attempt history and retry status.
