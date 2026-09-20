# AgentPay: Final Production Architecture

## System Overview & Core Thesis

AgentPay is the programmable financial control plane for autonomous AI agents settling on the Arc network.

```
                HUMAN (Policy Owner / Approver)
                  ↓
             ORGANIZATION (Multi-tenant Tenant Boundary)
                  ↓
                AGENT (Untrusted Autonomous Actor)
                  ↓
             SERVICE (Pre-registered & Vetted External APIs)
                  ↓
          PAYMENT INTENT (Structured Economic Request)
                  ↓
          POLICY + RISK (Deterministic Rust Policy Engine)
                  ↓
              APPROVAL (Out-of-band Human Authorization)
                  ↓
              TREASURY (Vault Liquidity Reservation)
                  ↓
          EXECUTION GATE (10-Point Pre-flight Safety Matrix)
                  ↓
             AGENTVAULT (On-chain Solidity Smart Contract)
                  ↓
                 ARC (Native USDC Settlement Layer)
                  ↓
             VERIFICATION (Receipt & Event Confirmation)
                  ↓
          AUDIT / EVENTS (Immutable Audit Log & Domain Events)
                  ↓
              WEBHOOKS (Cryptographically Signed HTTP Callbacks)
                  ↓
             AGENT / APP (Task Resumption & Completion)
```

---

## Component Specifications

### 1. Web Control Center (Frontend)
- **Technology:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide icons.
- **Location:** `apps/web`
- **Responsibility:** Provides visual management for human operators: monitoring active agents, inspecting payment intents, approving pending transactions, viewing audit logs, configuring webhooks, running simulations, and verifying on-chain transactions on Arc Explorer.
- **Trust Boundary:** Runs in user's browser. Authenticates to Gateway via session tokens or developer API keys. Has **zero** signing ability or direct blockchain write access.
- **Data Flow:** Queries Gateway REST APIs (`/v1/agents`, `/v1/payment-intents`, `/v1/approvals`, `/v1/events`).
- **Failure Behavior:** Read-only degradation; connection retries with user-facing alerts. If gateway is unavailable, frontend displays offline status without blocking on-chain assets.

---

### 2. API Gateway
- **Technology:** Go 1.22+, `net/http`, Gorilla middleware.
- **Location:** `services/gateway`
- **Responsibility:** Ingests agent requests, coordinates payment intent lifecycle, validates service registry bounds, performs authentication, enforces organization isolation, coordinates approval workflows, and manages database state.
- **Trust Boundary:** High-trust internal control plane. Holds API secrets and configuration. Never exposes raw database or signing keys directly to agents.
- **Data Flow:** Receives HTTP requests from SDKs/CLI/Frontend; invokes Rust Policy Engine over HTTP; persists state to PostgreSQL; dispatches events to Webhook Worker; commands Blockchain Executor.
- **Failure Behavior:** Fails closed. If Policy Engine or Database fails, gateway rejects new intents with 503 Service Unavailable.

---

### 3. Policy & Risk Engine
- **Technology:** Rust 1.75+, Axum, Tokio, Serde.
- **Location:** `services/policy-engine`
- **Responsibility:** Deterministic, network-independent evaluation of payment requests against configured limits (per-transaction limit, daily spending limit, hourly velocity, allowed/blocked recipient addresses, allowed assets). Computes deterministic risk scores (LOW, MEDIUM, HIGH) without LLM nondeterminism.
- **Trust Boundary:** High-trust verification microservice. Strictly isolated from external network access during evaluation. Integer-only math (no floating-point money).
- **Data Flow:** Evaluates `POST /v1/authorize` and `POST /v1/simulate` requests from Gateway; returns structured `ALLOW`, `DENY`, or `APPROVAL_REQUIRED` decisions with exact reason codes.
- **Failure Behavior:** Fail closed. If engine is unreachable or encounters invalid input, Gateway returns 504 Gateway Timeout or 500 Internal Error, completely preventing transaction authorization.

---

### 4. Autonomous Agent Runtime
- **Technology:** Go Agent Service (`services/gateway/internal/agent`), TypeScript SDK (`packages/sdk-typescript`), Python SDK (`packages/sdk-python`).
- **Responsibility:** Executes autonomous tasks (e.g., Autonomous Research Agent). Identifies required external services, discovers pricing, and requests payment intents.
- **Trust Boundary:** **UNTRUSTED ACTOR**. The agent never holds private keys, cannot sign transactions, cannot override recipient addresses, cannot modify policies, and cannot approve its own payments.
- **Data Flow:** Submits task requests to Gateway (`POST /v1/payment-intents`). Awaits confirmation before consuming external API outputs.
- **Failure Behavior:** If payment is denied or pending approval, agent runtime pauses or halts task execution without retrying unauthorized funds movement.

---

### 5. Service Discovery Registry
- **Technology:** In-memory & DB-backed registry (`services/gateway/internal/registry`).
- **Location:** `services/gateway/internal/registry/service_registry.go`
- **Responsibility:** Authoritative catalog of approved external services (e.g. Web Research, GPU Inference). Stores maximum prices (`MaxPrice`), approved settlement addresses, and active quotes.
- **Trust Boundary:** High-trust database catalog. Prevents prompt-injection attacks: user/agent cannot provide arbitrary recipient addresses; the Gateway resolves recipients strictly from this registry.
- **Data Flow:** Validates requested service IDs during `CreateIntent`.
- **Failure Behavior:** Rejects payment creation if service is unregistered, disabled, or requested price exceeds maximum cap.

---

### 6. Treasury Management Service
- **Technology:** Go service (`services/gateway/internal/treasury`).
- **Location:** `services/gateway/internal/treasury/service.go`
- **Responsibility:** Manages off-chain reservations of on-chain AgentVault balances. Distinguishes authoritative on-chain balance, active reserved funds, and available liquidity.
- **Trust Boundary:** Critical financial accounting boundary.
- **Data Flow:** Calls RPC/AgentVault for balance; locks internal mutex; inserts reservation record upon authorization; settles or releases reservation upon final confirmation.
- **Failure Behavior:** Prevents double-spending. If requested funds exceed available liquidity (`onChainBalance - totalReserved`), reservation is rejected with `ErrInsufficientAvailableFunds`.

---

### 7. Execution Gate
- **Technology:** Go pre-flight validator (`services/gateway/internal/execution/gate.go`).
- **Responsibility:** Enforces the 10-point execution safety matrix in deterministic sequence before any calldata is signed:
  1. PaymentIntent exists.
  2. Status is valid (not already confirmed, executing, or terminal).
  3. Policy decision is NOT DENY (inviolable hard denial invariant).
  4. Intent is not expired.
  5. Global execution kill switch is inactive.
  6. Organization is active.
  7. Agent is active.
  8. Service is active and enabled.
  9. Human approval is valid and unexpired (if approval required).
  10. Treasury reservation is active.
- **Trust Boundary:** Final software defense before blockchain broadcast.
- **Data Flow:** Evaluates intent state immediately before transaction generation.
- **Failure Behavior:** Any single failed check halts execution immediately with a descriptive error.

---

### 8. Blockchain Executor
- **Technology:** Go execution service (`services/gateway/internal/execution/service.go`), `go-ethereum`.
- **Responsibility:** Encodes calldata for `AgentVault.executePayment(...)`, signs transaction using executor credentials, broadcasts to Arc JSON-RPC, tracks transaction nonces, polls for receipts, and reconciles ambiguous states.
- **Trust Boundary:** Highest-privilege execution component. Holds executor private key in memory or KMS.
- **Data Flow:** Receives authorized payment parameters from Gateway; constructs EIP-155 transaction; broadcasts to Arc; emits transaction hash and receipt status.
- **Failure Behavior:** If RPC confirmation times out, sets state to `AMBIGUOUS` (does NOT assume failed); preserves transaction hash; invokes `ReconcileTransaction` upon RPC recovery.

---

### 9. Smart Contract (AgentVault)
- **Technology:** Solidity 0.8.24, Foundry.
- **Location:** `contracts/src/AgentVault.sol`
- **Responsibility:** On-chain custody of organization USDC funds on Arc. Enforces smart-contract-level spending limits, daily budget resets at UTC midnight, recipient allowlists and blocklists, owner withdrawals, and contract emergency pause.
- **Trust Boundary:** Ultimate authoritative on-chain settlement anchor. Code is immutable once deployed.
- **Data Flow:** Receives signed `executePayment` transactions from Gateway executor; verifies caller is owner/controller; checks policy limits; executes ERC-20 `transfer(recipient, amount)`; emits `PaymentExecuted` event.
- **Failure Behavior:** EVM transaction reverts if amount exceeds balance, daily limit is reached, recipient is blocked, or contract is paused. Reverted transactions consume only gas; USDC balances remain completely safe.

---

### 10. Arc Settlement Layer
- **Technology:** Arc EVM Network (Chain ID: 5042).
- **RPC:** `https://rpc.mainnet.arc.io`
- **USDC Contract:** `0x3600000000000000000000000000000000000000`
- **Explorer:** `https://explorer.arc.io`
- **Responsibility:** Native Layer-1 blockchain providing deterministic finality, low transaction fees, and native USDC settlement for AI agent transactions.
- **Data Flow:** Executes AgentVault smart contract bytecode and updates state root.

---

### 11. Event Outbox & Webhook Dispatcher
- **Technology:** Go background worker (`services/gateway/internal/webhook`).
- **Responsibility:** Reliable, asynchronous dispatch of domain events (`payment_intent.created`, `authorized`, `confirmed`, `denied`) to registered external subscriber endpoints.
- **Trust Boundary:** Secure egress boundary. Uses `SSRFValidator` to block internal IP ranges, private subnets, and cloud metadata. Signs each payload with HMAC-SHA256 (`X-AgentPay-Signature`).
- **Data Flow:** Consumes events from database repository; signs payload; performs HTTP POST with 10s timeout; manages exponential backoff retry queue.
- **Failure Behavior:** Failed webhook deliveries increment endpoint failure counters and retry up to 5 times. Webhook failures **never** impact or revert financial settlements.

---

### 12. Developer SDKs & CLI
- **Technology:**
  - TypeScript SDK (`@agentpay/sdk`, Node.js & Browser)
  - Python SDK (`agentpay`, Python 3.9+)
  - CLI Tool (`agentpay` CLI, Go/Node)
- **Responsibility:** Standardized client developer experience for integrating AgentPay into agent frameworks (LangChain, AutoGen, CrewAI) and operator workflows.
- **Trust Boundary:** Client-side convenience wrapper. Enforces zero private key presence in client applications.
