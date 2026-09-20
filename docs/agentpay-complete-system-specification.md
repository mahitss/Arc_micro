# AgentPay: The Programmable Financial Control Plane for Autonomous AI Agents
## Complete Master Architecture, Feature Catalog, and System Specification

---

## 1. Executive Summary & Core Thesis

Autonomous AI agents can plan, reason, browse the web, write code, and coordinate complex multi-step workflows. However, **giving an AI agent direct access to a cryptocurrency private key or unconstrained corporate credit card presents catastrophic financial and security risk**. A single code hallucination, software loop bug, or adversarial prompt injection can instantly drain a funded wallet in seconds.

Existing approaches fall into two flawed extremes:
1. **Unconstrained Custody (High Risk):** The agent holds a raw private key in memory or environment variables. Adversarial inputs or runaway loops cause irreversible loss of capital.
2. **Manual Approval for Every Micro-Action (Zero Autonomy):** A human must sign every $0.05 web search or compute query, completely destroying the agent's autonomy and scalability.

### The AgentPay Thesis

$$\mathbf{AI\ Requests} \quad\longrightarrow\quad \mathbf{AgentPay\ Controls} \quad\longrightarrow\quad \mathbf{Arc\ Settles}$$

**AgentPay is the programmable financial control plane for autonomous AI agents.** It decouples untrusted agent reasoning from financial settlement:
- **Agents NEVER hold private keys** and never sign blockchain transactions.
- **Agents NEVER choose raw recipient addresses**; recipients are resolved server-side from a trusted Service Registry, completely neutralizing prompt injection.
- **Every payment intent must pass a deterministic Rust policy engine** in sub-millisecond time.
- **High-risk or abnormal requests trigger human-in-the-loop approval workflows.**
- **Settlement executes on Arc Network (Chain ID 5042) in native USDC** via the non-custodial smart contract `AgentVault.sol`.
- **All events are recorded in an append-only audit log** and broadcast via cryptographically signed webhooks.

---

## 2. System Architecture & Component Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             AUTONOMOUS AI AGENTS                            │
│  - Python / TypeScript Agents   - LangChain / CrewAI / AutoGen / OpenAI      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1. Discover Services / Obtain Quotes
                                       │ 2. Request Payment Intent (No Keys!)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENTPAY API GATEWAY (Go 1.22+)                      │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐ │
│  │   Tenant Isolation    │  │   Service Registry    │  │  Idempotency &  │ │
│  │  (Multi-Org Security) │  │  (Server-Side Binding)│  │ Rate Limiting   │ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬────────┘ │
│              │                          │                       │          │
│              ▼                          ▼                       ▼          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                 Payment Intent State Machine (FSM)                     │ │
│  │      CREATED → AUTHORIZED → RESERVED → EXECUTING → CONFIRMED          │ │
│  └──────────────────────────────────┬────────────────────────────────────┘ │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ Synchronous Policy Evaluation
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 DETERMINISTIC POLICY & RISK ENGINE (Rust)                   │
│                                                                             │
│  ┌────────────────────────┐  ┌──────────────────────┐  ┌────────────────┐  │
│  │ Spending & Velocity    │  │ Allow / Blocklists   │  │ Deterministic  │  │
│  │ Limits (Daily/Hourly)  │  │ (Exact Match)        │  │ Risk Scorer    │  │
│  └────────────────────────┘  └──────────────────────┘  └────────────────┘  │
│  Evaluation Time: < 0.5ms | Output: ALLOW / APPROVAL_REQUIRED / DENY        │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ Decision Returned
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TREASURY & EXECUTION GATE (Go)                        │
│                                                                             │
│  ┌────────────────────────┐  ┌──────────────────────┐  ┌────────────────┐  │
│  │   Atomic Reservation   │  │ 10-Point Pre-Flight  │  │ Multi-Tier     │  │
│  │   Accounting (Mutex)   │  │ Execution Gate       │  │ Kill Switches  │  │
│  └────────────────────────┘  └──────────────────────┘  └────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ Calldata Built & Signed Internally
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ARC SETTLEMENT LAYER (Chain ID 5042)                   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                     AgentVault.sol (Smart Contract)                   │ │
│  │  - On-Chain Daily Budget Cap          - Checks-Effects-Interactions   │ │
│  │  - On-Chain Allow/Blocklists          - Emergency Pause Mechanism     │ │
│  └──────────────────────────────────┬────────────────────────────────────┘ │
│                                     │ ERC-20 Transfer
│                                     ▼
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │              Native USDC (0x3600000000000000000000000000000000000000) │ │
│  └──────────────────────────────────┬────────────────────────────────────┘ │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ Transaction Receipt Confirmed
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   AUDIT, WEBHOOKS & DEVELOPER VISIBILITY                    │
│                                                                             │
│  ┌────────────────────────┐  ┌──────────────────────┐  ┌────────────────┐  │
│  │ Append-Only Audit Log  │  │ HMAC-SHA256 Signed   │  │ Next.js Web    │  │
│  │ (Domain Events Stream) │  │ Webhook Dispatcher   │  │ Control Center │  │
│  └────────────────────────┘  └──────────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. End-to-End Money Flow & Lifecycle Walkthrough

A payment undergoes 8 formal phases:

```
[Agent Task] ──> [Service Quote] ──> [Intent Created] ──> [Rust Policy Engine]
                                                                  │
      ┌───────────────────────────────────────────────────────────┴─────────────┐
      ▼                                                                         ▼
[Decision: ALLOW]                                                   [Decision: APPROVAL_REQUIRED]
      │                                                                         │
      │                                                             [Human Admin Approves via UI]
      ▼                                                                         │
[Treasury Reservation] <────────────────────────────────────────────────────────┘
      │
      ▼
[10-Point Execution Gate] ──> [AgentVault.sol on Arc] ──> [Native USDC Settled]
                                                                  │
                                                                  ▼
                                                   [Receipt & Event Recorded]
                                                                  │
                                                                  ▼
                                                   [HMAC Webhook Dispatched]
                                                                  │
                                                                  ▼
                                                   [Agent Resumes Work]
```

### Phase 1: Service Discovery & Quoting
1. The autonomous agent discovers registered services (`GET /v1/services`).
2. The agent requests a binding price quote for a service (`POST /v1/services/:id/quote`).
3. The platform generates a quote locked for 15 minutes with a cryptographic nonce and fixed base-unit USDC price.

### Phase 2: Intent Creation & Server-Side Binding
1. The agent submits a structured payment intent request (`POST /v1/payment-intents`) containing:
   - `service`: Name of registered service (e.g. `web-research`).
   - `amount`: Base units (e.g. `180000` = $0.18 USDC).
   - `asset`: `"USDC"`.
   - `purpose`: High-level explanation of task.
   - `Idempotency-Key`: Client-generated unique UUID.
2. **Critical Security Boundary:** The Gateway ignores any user-supplied recipient address. The actual recipient destination address is extracted server-side from the verified Service Registry. Prompt injection attacks attempting to redirect funds are discarded.

### Phase 3: Synchronous Deterministic Policy Evaluation
The Gateway calls the standalone Rust Policy Engine via HTTP (`POST /v1/payments/authorize`):
- Checks agent spending limits (per-transaction ceiling and daily budget cap).
- Checks daily transaction velocity counts.
- Verifies recipient allowlist and blocklist.
- Evaluates emergency pause states (agent-level, org-level, and global).
- Computes an explainable risk score (0-100) based on velocity, amount ratio, and historical volume.
- Returns decision in < 0.5ms:
  - `ALLOW`: Approved for automated execution.
  - `APPROVAL_REQUIRED`: Held pending human review.
  - `DENY`: Hard rejection.

### Phase 4: Human-in-the-Loop Approval Workflow
- If the policy decision is `APPROVAL_REQUIRED`, the intent enters status `APPROVAL_REQUIRED`.
- Organization operators review the intent in the Web Control Center or via API (`POST /v1/approvals/:id/approve`).
- **Mathematical Invariant:** A hard `DENY` decision can **never** be approved. Agents can **never** approve their own payment requests.

### Phase 5: Atomic Treasury Reservation
- Before any on-chain execution, the Treasury Service locks liquidity:
  $$\text{Available Balance} = \text{On-Chain Vault Balance} - \text{Total Active Reservations}$$
- If $\text{Available Balance} < \text{Requested Amount}$, execution is aborted with `ErrInsufficientFunds`.
- Reservations are locked atomically behind a concurrency mutex, preventing double-spend races.

### Phase 6: 10-Point Pre-Flight Execution Gate
Before signing calldata, the Execution Gate verifies:
1. Intent is in `AUTHORIZED` status.
2. Underlying policy decision is `ALLOW` (or approved).
3. Intent has not exceeded its 300-second TTL.
4. Agent is active (not paused).
5. Organization is active (not paused).
6. Global system execution is enabled.
7. Auto-execution flag is satisfied.
8. Treasury reservation is actively held.
9. Intent has not already been confirmed or submitted.
10. Target network parameters match Arc Chain ID `5042`.

### Phase 7: On-Chain Arc Settlement (`AgentVault.sol`)
1. The Go blockchain executor builds the ABI payload for `executePayment(recipient, amount, intentId)`.
2. The executor signs and broadcasts the transaction to Arc RPC (`https://rpc.mainnet.arc.io`).
3. The on-chain `AgentVault` contract verifies:
   - Caller is the authorized vault owner/executor.
   - Recipient is not on the on-chain blocklist.
   - Recipient is on the allowlist (if allowlist is enforced).
   - Amount is within on-chain per-transaction limit.
   - Payment does not exceed on-chain daily cap (which resets every 24 hours UTC).
   - Vault is not paused on-chain.
4. `AgentVault` transfers native USDC directly to the service provider's address and emits `PaymentExecuted(intentId, recipient, amount, fee)`.

### Phase 8: Verification, Audit, and Webhooks
1. The gateway waits for on-chain receipt confirmation.
2. The treasury updates reservation state to `SETTLED`.
3. An immutable domain event (`payment.confirmed`) is written to the audit log.
4. An out-of-band worker computes an HMAC-SHA256 signature (`X-AgentPay-Signature: t=...,v1=...`) and dispatches a webhook to the agent's callback URL.
5. The autonomous agent receives the webhook, confirms payment settlement, and consumes the purchased service.

---

## 4. Complete Feature Catalog by Subsystem

### 4.1. Core API Gateway & Control Plane (Go)
- **Multi-Tenant Organization Isolation:** Strict tenant separation enforced at database and API layers. Cross-organization IDOR queries return 404 or 403.
- **Agent Lifecycle Management:** Register, configure, pause, resume, and inspect autonomous agents.
- **Service Registry & Marketplace:** Pre-configured and custom service registration with strict recipient address anchoring, category tagging, and pricing models (fixed, dynamic, per-token).
- **Service Quotes:** 15-minute cryptographically locked pricing quotes.
- **Payment Intent State Machine:** Finite State Machine enforcing forward-only transitions (`CREATED` $\rightarrow$ `AUTHORIZED` $\rightarrow$ `RESERVED` $\rightarrow$ `EXECUTING` $\rightarrow$ `CONFIRMED` / `FAILED` / `DENIED` / `EXPIRED`).
- **Idempotency Engine:** `Idempotency-Key` header with database unique indexes on `(org_id, request_id)` preventing duplicate charges on network retries.
- **Multi-Tier Kill Switches:** Independent emergency stop controls at 4 levels:
  1. Agent Pause (`POST /v1/agents/:id/pause`)
  2. Organization Pause (`POST /v1/organizations/:id/pause`)
  3. Global Gateway Halt
  4. Smart Contract Pause (`AgentVault.pause()`)
- **Ambiguous Transaction Lifecycle:** If RPC confirmation times out, the transaction transitions to `AMBIGUOUS`. The gateway never re-broadcasts blindly; it invokes receipt reconciliation workers to verify on-chain state before updating terminal status.
- **Isolated Financial Simulations:** `POST /v1/simulations` allows dry-running payment intents against policies without touching real balances or broadcasting transactions.

### 4.2. Deterministic Policy & Risk Engine (Rust)
- **Ultra-Low Latency:** Sub-millisecond evaluation written in idiomatic, memory-safe Rust with zero allocations on hot evaluation paths.
- **Deterministic Spending Limits:** Integer arithmetic enforcement of per-transaction ceilings and daily spending limits.
- **Hourly Velocity Controls:** Protects against runaway micro-transaction loops by limiting transactions per hour and volume per hour.
- **Allowlist & Blocklist Evaluation:** Sub-millisecond address matching with case-insensitive normalization.
- **Policy Composition:** Hierarchical composition (Organization Policy $\otimes$ Agent Policy) where the composed policy strictly preserves the most restrictive blocklists and smallest budget caps.
- **Explainable Deterministic Risk Engine:** Scores every intent from 0 to 100 with clear human-readable trigger reasons:
  - `LOW` (0-30): Automated execution allowed.
  - `MEDIUM` (31-70): Flagged for elevated audit.
  - `HIGH` (71-100): Automatically forces `APPROVAL_REQUIRED`.

### 4.3. Arc Settlement & Smart Contract Layer (`AgentVault.sol`)
- **Arc Network Native Integration:** Configured for Arc Mainnet (Chain ID `5042`).
- **Native USDC Settlement:** Operates directly with Arc's native USDC contract (`0x3600000000000000000000000000000000000000`).
- **Dual-Layer Defense In-Depth:** Even if the off-chain gateway were fully compromised, the on-chain smart contract independently validates:
  - Per-transaction limit.
  - Daily cumulative spending cap.
  - Recipient allowlists and blocklists.
  - Emergency pause state.
- **Checks-Effects-Interactions Pattern:** Daily spending and counters increment *before* external token transfers, eliminating re-entrancy risks.
- **Fuzzing & Invariant Proven:** 42 Foundry tests including 3 fuzz tests running 256 runs each.

### 4.4. Audit & Event Infrastructure
- **Immutable Domain Events:** Every state transition emits a structured event:
  - `agent.created`, `agent.paused`, `agent.resumed`
  - `payment.created`, `payment.authorized`, `payment.denied`, `payment.approval_required`
  - `payment.approved`, `payment.rejected`
  - `payment.executing`, `payment.settled`, `payment.failed`, `payment.expired`
- **Audit Log API:** Queryable with pagination, filtering by agent, service, event type, and date range (`GET /v1/events`).
- **Cryptographic Webhooks:** Asynchronous HTTP callbacks signed with HMAC-SHA256 (`X-AgentPay-Signature`). Supports automatic retries with exponential backoff. Settlement is decoupled from webhook delivery failures.

### 4.5. Developer SDKs & CLI
- **TypeScript / Node.js SDK (`@agentpay/sdk`):**
  - Fully typed client with zero private key handling.
  - Supports payment intent creation, polling, service quotes, simulation, and HMAC signature verification.
- **Python SDK (`agentpay`):**
  - Pythonic interface tailored for AI frameworks (LangChain, CrewAI, AutoGen, LlamaIndex).
- **Developer CLI (`@agentpay/cli`):**
  - Command-line tool to inspect agent balances, view recent transactions, query pending approvals, and manage API keys.

### 4.6. Web Control Center (Next.js 14 Dashboard)
- **Real-Time Dashboard:** Overview of total volume, active agents, pending approvals, and 24h spend metrics.
- **Agent Manager:** View agent spending policies, live daily budgets, and toggle emergency pauses.
- **Approval Queue:** Single-click approval/rejection interface for transactions flagged by policy or risk.
- **Interactive Autonomous Agent Demo (`/demo`):**
  - Live simulation of an autonomous research agent executing market analysis.
  - Visualizes real-time service discovery, pricing quote negotiation, policy evaluation, treasury reservation, Arc settlement, and webhook completion.
  - Prominently labeled with clear simulation safeguards.
- **Event Stream & Webhook Inspector:** Live stream of domain events and webhook delivery logs with raw payload inspection.

---

## 5. Security Model & Mathematical Boundary Proofs

AgentPay enforces 16 formal invariants verified by automated regression test suites:

| Invariant | Security Boundary Guaranteed | Test Verification |
| :--- | :--- | :--- |
| **Zero Key Custody** | Agents never hold private keys or sign blockchain transactions. | `sdk.test.ts`, `agent_flow_test.go` |
| **Prompt Injection Immunity** | Recipients are resolved server-side from Service Registry; user/agent-supplied recipient fields are ignored. | `TestDay9_FinancialInvariants/TrustedServiceRecipientNeverUserControlled` |
| **Hard Deny Inviolability** | A policy `DENY` decision can NEVER be approved or overridden by any actor. | `TestDay9_FinancialInvariants/HardDenyCannotBeOverriddenByApproval` |
| **No Agent Self-Approval** | An agent cannot approve its own payment intent. | `TestDay9_FinancialInvariants/AgentCannotApproveItsOwnPayment` |
| **Atomic Liquidity Reservation** | Concurrency mutex prevents multi-request balance exhaustion races. | `TestDay9_ConcurrencyAndRaceConditions/TreasuryConcurrentReservationRace` |
| **Idempotency Uniqueness** | One idempotency key cannot create duplicate payments or blockchain transfers. | `TestDay9_FinancialInvariants/IdempotencyPreventsDuplicatePaymentCreation` |
| **Cross-Tenant Isolation (IDOR)** | Organization resources are strictly partitioned; cross-org queries return 404/403. | `TestDay9_IDOR_CrossOrganizationIsolation` |
| **Forward-Only Terminal FSM** | Confirmed transactions can never transition back to pending or executing. | `gate_test.go` |
| **Webhook Decoupling** | Webhook delivery failure never rolls back or corrupts on-chain settlement. | `TestIntegration_Day6EventsAndWebhooks` |
| **Simulation Isolation** | Simulations never touch treasury balances or broadcast transactions. | `TestDay8_SimulationMode` |
| **Multi-Tier Kill Switch** | Emergency pause halts payment creation and execution immediately. | `TestDay9_FinancialInvariants/EmergencyPausePreventsExecution` |
| **Deterministic Policy** | Identical inputs always produce identical decisions; no LLM randomness. | `test_15_determinism_identical_inputs_produce_identical_decisions` |
| **Integer USDC Representation** | All currency math uses base units (6 decimals) to prevent float rounding errors. | `AmountFormatted` in CLI and Web tests |
| **Ambiguous Tx Recovery** | Timeout transactions enter `AMBIGUOUS` state and reconcile via receipt checks. | `TestDay9_AmbiguousTransactionLifecycle` |

---

## 6. How to Run Locally

### Prerequisites
- Docker & Docker Compose
- Go 1.22+ (for local backend development)
- Rust 1.75+ (for policy engine)
- Node.js 18+ (for SDK and Web UI)
- Foundry (for Solidity smart contract tests)

### Quickstart (Docker Compose)
```bash
# 1. Clone repository
git clone https://github.com/mahitss/Arc_micro.git
cd Arc_micro

# 2. Configure environment
cp .env.example .env

# 3. Spin up all services
docker-compose up -d

# 4. Verify system health
curl http://localhost:8080/ready
```

- **Web Dashboard:** `http://localhost:3000`
- **Interactive Demo:** `http://localhost:3000/demo`
- **Gateway API:** `http://localhost:8080`
- **Rust Policy Engine:** `http://localhost:8081`

### Running the Complete Automated Test Suite
```bash
# Go Gateway & Integration Tests (48 tests)
cd services/gateway && go test -count=1 ./...

# Rust Policy Engine Tests (49 tests)
cd services/policy-engine && cargo test

# Foundry Solidity Contract Tests & Fuzzing (42 tests)
cd contracts && forge test

# TypeScript SDK Tests (12 tests)
cd packages/sdk-typescript && npm test

# Python SDK Tests (7 tests)
cd packages/sdk-python && python -m unittest discover tests

# Developer CLI Tests (2 tests)
cd packages/cli && npm test

# Next.js Web Control Center Tests (14 test suites) & Build
cd apps/web && npm test && npm run build
```

---

## 7. Developer Integration Guide

### TypeScript Integration Example
```typescript
import { AgentPay } from '@agentpay/sdk';

const agentpay = new AgentPay({
  apiKey: process.env.AGENTPAY_API_KEY,
  baseUrl: 'http://localhost:8080'
});

// 1. Discover available services
const services = await agentpay.services.list({ category: 'data' });

// 2. Request a payment intent (Zero private keys involved!)
const intent = await agentpay.paymentIntents.create({
  service: 'web-research',
  amount: '180000', // $0.18 USDC (6 decimals)
  asset: 'USDC',
  purpose: 'Query market data on Arc DeFi protocols',
  idempotencyKey: 'req_' + crypto.randomUUID()
});

// 3. Await settlement confirmation
const confirmedIntent = await agentpay.paymentIntents.waitForCompletion(intent.id, {
  timeoutMs: 30000,
  pollIntervalMs: 1000
});

console.log('Payment Settled on Arc! Tx Hash:', confirmedIntent.transaction_hash);
```

### Python Integration Example
```python
from agentpay import AgentPayClient

client = AgentPayClient(
    api_key="agp_live_secret_key",
    base_url="http://localhost:8080"
)

# Request payment intent
intent = client.payment_intents.create(
    service="web-research",
    amount=180000,
    asset="USDC",
    purpose="Autonomous research synthesis",
    idempotency_key="py_req_9921"
)

print(f"Intent created: {intent.id}, Status: {intent.status}")
```

---

## 8. Conclusion

AgentPay is the first complete, mathematically proven, and test-verified programmable financial control plane built specifically for autonomous AI agents. By combining **zero-key custody**, **server-side recipient binding**, **sub-millisecond Rust policy enforcement**, **atomic treasury accounting**, and **non-custodial smart contract settlement on Arc in native USDC**, AgentPay provides the critical economic infrastructure that allows AI agents to be truly autonomous without ever being financially reckless.
