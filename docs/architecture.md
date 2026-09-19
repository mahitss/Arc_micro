# AgentPay Architecture

## System Overview

AgentPay provides programmable, deterministic USDC payment infrastructure specifically tailored for autonomous AI agents on the Arc blockchain. Autonomous agents require low-latency, programmatic payment execution for compute, tools, APIs, and micro-services without risking catastrophic wallet drain or policy violations.

```
Client / AI Agent
    ↓ (POST /v1/payments/authorize)
Go Gateway (:8080)
    ↓ (POST /v1/authorize)
Rust Policy Engine (:8081)
    ↓ (ALLOW / DENY)
Go Gateway (:8080)
    ↓ (Decision response)
Client / AI Agent
    ↓
Future: Solidity AgentVault on Arc Mainnet
```

---

## Layer Responsibilities

### 1. Next.js Web Dashboard (`apps/web`)
- **Technology**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Responsibilities**:
  - Human-in-the-loop interface for operators to monitor agent spending in real time.
  - Configuration UI for policy limits (daily spending caps, whitelisted service providers, emergency freeze).
  - Visualization of payment intents, pending reviews, approvals, and transaction history.
  - Web3 wallet interaction (e.g., configuring contract parameters, initial vault funding).

### 2. Go Gateway (`services/gateway`)
- **Technology**: Go 1.22+.
- **Responsibilities**:
  - High-throughput API gateway exposing versioned REST endpoints (`/v1/...`).
  - Request validation (syntax, required fields, Ethereum recipient format).
  - Context and timeout management (`POLICY_ENGINE_TIMEOUT_MS`).
  - Request ID extraction, generation, propagation, and return header (`X-Request-ID`).
  - Typed HTTP client communicating with the upstream Rust Policy Engine.
  - Response normalization: maps Rust decisions to HTTP 200 (both `ALLOW` and `DENY`), Rust errors to 503/504.
  - Middleware pipeline: Panic Recovery, Request ID, CORS, Request Body Limiting, Structured Logging, Auth Placeholder.
  - Readiness probe (`GET /ready`) verifying Rust Policy Engine availability.
  - Future blockchain execution boundary: separates authorization from settlement.

### 3. Rust Policy Engine (`services/policy-engine`)
- **Technology**: Rust 2021, Axum, Tokio, Serde.
- **Responsibilities**:
  - Authoritative security and authorization boundary of AgentPay.
  - Exposes `POST /v1/authorize` receiving payment requests from the Go Gateway.
  - Executes purely deterministic, mathematically sound risk and policy evaluation.
  - Strictly integer-based arithmetic (`checked_add`); floating-point types (`f32`, `f64`) are prohibited.
  - Verification of agent spending limits (per-transaction limit, daily budget, transaction frequency).
  - Recipient address validation and normalization (case-insensitive hex address checks against allowlists and blocklists).
  - Explicit `ALLOW` or `DENY` decision responses with audit trail reason codes.
  - Zero side effects: the core `authorize(request, policy)` function has no network, database, filesystem, or clock dependencies.

### 4. Solidity AgentVault (`contracts/`)
- **Technology**: Solidity 0.8.24+, Foundry (`forge` 1.8.3), OpenZeppelin v5.
- **Responsibilities**:
  - Custodial vault smart contract holding agent operational funds in ERC-20 USDC.
  - Serves as the immutable on-chain enforcement layer following off-chain authorization.
  - Enforces hard on-chain spending limits (per-transaction limit, daily budget, transaction frequency).
  - Maintains recipient allowlists and blocked recipient blacklists (with blocked taking strict precedence).
  - Emits immutable on-chain events (`PaymentExecuted`, `PolicyUpdated`, `Withdrawal`, `VaultPaused`) for off-chain indexing.
  - Implements emergency controls: owner-only pause/unpause circuit breaker and administrative withdrawal.

#### Off-Chain Policy vs. On-Chain Enforcement

| Dimension | Rust Policy Engine (Off-Chain) | Solidity AgentVault (On-Chain) |
|---|---|---|
| **Role** | Pre-flight policy & risk evaluation | Final fund custody & payment execution |
| **Trust Model** | Fast, deterministic off-chain security filter | Zero-trust immutable EVM bytecode enforcement |
| **Failure Mode** | Returns `DENY` decision with auditable `reason_code` | Reverts transaction on-chain (`revert`) |
| **Gas Cost** | Zero gas (sub-millisecond evaluation) | Gas consumed on Arc network upon state change |
| **State Storage** | Application memory / future PostgreSQL | On-chain contract storage slots |

### 5. Arc Blockchain & USDC Settlement
- **Technology**: Arc Network.
- **Responsibilities**:
  - Fast-finality EVM-compatible execution layer.
  - Gas-efficient, deterministic settlement in native/canonical USDC.
  - Note: Mainnet deployment and live contract interactions will be executed in a dedicated future task.

---

## Go ↔ Rust JSON Contract Specification

### Internal Endpoint: `POST /v1/authorize`

#### Request Payload
```json
{
  "request_id": "req_123",
  "agent_id": "research-agent",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "180000",
  "asset": "USDC",
  "purpose": "api_usage"
}
```

#### Response Payload
```json
{
  "request_id": "req_123",
  "decision": "ALLOW",
  "reason_code": "APPROVED",
  "reason": "Payment satisfies the configured policy."
}
```

### Deterministic Reason Codes

| Reason Code | Meaning |
|---|---|
| `APPROVED` | Payment satisfies the configured policy. |
| `POLICY_DISABLED` | The policy for this agent is currently disabled. |
| `INVALID_AMOUNT` | Payment amount must be greater than zero. |
| `AMOUNT_EXCEEDS_TRANSACTION_LIMIT` | Payment exceeds the single-transaction spending limit. |
| `DAILY_LIMIT_EXCEEDED` | Payment would exceed the agent daily spending limit. |
| `RECIPIENT_NOT_ALLOWED` | Recipient address is not on the allowed recipient list. |
| `RECIPIENT_BLOCKED` | Recipient address is on the blocked recipient list. |
| `ASSET_NOT_ALLOWED` | Asset is not supported or authorized by this policy. |
| `DAILY_TRANSACTION_LIMIT_EXCEEDED` | Agent has reached its maximum authorized transactions for today. |
| `INVALID_REQUEST` | Payment request is invalid or missing required parameters. |

---

## HTTP Status Semantics

- **ALLOW → HTTP 200**: Decision is `ALLOW`.
- **DENY → HTTP 200**: Decision is `DENY`. Business policy denial is a successful evaluation, not an HTTP transport error.
- **Malformed Request → HTTP 400**: Missing fields, non-integer amount, invalid hex address, or invalid JSON syntax.
- **Oversized Request → HTTP 413**: Request body exceeds `MAX_REQUEST_BODY_BYTES` (default 1MB).
- **Rust Engine Unavailable → HTTP 503**: Connection refused, 502, or 503 from Rust service.
- **Rust Engine Timeout → HTTP 504**: Policy evaluation exceeded `POLICY_ENGINE_TIMEOUT_MS` (default 2000ms).
- **Internal Server Failure → HTTP 500**: Panic recovered safely without leaking stack traces or secrets.

---

## Security Invariants & Principles

1. **Deterministic Execution**:
   The policy engine produces identical decisions given identical intent parameters and state. No probabilistic or heuristic approvals.

2. **Zero Floating-Point Arithmetic**:
   All monetary amounts are represented as strings at the HTTP boundary and converted to integer units (e.g., micro-USDC with 6 decimals: 1 USDC = `1000000`).

3. **Separation of Authorization and Settlement**:
   Authorization is strictly side-effect-free. An `ALLOW` decision does NOT claim a payment occurred on the blockchain.

4. **Resource Exhaustion Defense**:
   All incoming request bodies are capped (1MB limit via `http.MaxBytesReader`). Downstream response reading is bounded via `io.LimitReader(resp.Body, 1<<20)`.

5. **Safe Observability**:
   Logs capture `request_id`, `agent_id`, `decision`, `reason_code`, and `duration_ms`. Private keys, full request bodies, and authorization headers are never logged.
