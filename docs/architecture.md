# AgentPay Architecture

## System Overview

AgentPay provides programmable, deterministic USDC payment infrastructure specifically tailored for autonomous AI agents on the Arc blockchain. Autonomous agents require low-latency, programmatic payment execution for compute, tools, APIs, and micro-services without risking catastrophic wallet drain or policy violations.

```
Client / AI Agent
    ↓ (POST /v1/payments/authorize or POST /v1/payments/execute)
Go Gateway (:8080)
    ↓ (POST /v1/authorize)
Rust Policy Engine (:8081)
    ↓ (ALLOW / DENY)
Go Gateway (:8080)
    ↓ (If ALLOW)
Execution Service
    ↓ (EIP-1559 Transaction)
AgentVault.sol (:on-chain)
    ↓ (usdc.safeTransfer)
Arc Mainnet (USDC Settlement)
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
- **Technology**: Go 1.22+, `go-ethereum` (v1.14.8).
- **Responsibilities**:
  - High-throughput API gateway exposing versioned REST endpoints (`/v1/...`).
  - Request validation (syntax, required fields, Ethereum recipient/vault format).
  - Context and timeout management (`POLICY_ENGINE_TIMEOUT_MS`, `ARC_RPC_TIMEOUT_MS`, `ARC_CONFIRMATION_TIMEOUT_MS`).
  - Request ID extraction, generation, propagation, and return header (`X-Request-ID`).
  - Typed HTTP client communicating with the upstream Rust Policy Engine.
  - Blockchain execution service: packs `AgentVault.executePayment(...)` calldata, manages transaction signing, broadcasts to Arc, and polls receipts.
  - Thread-safe idempotency store: prevents duplicate transaction submissions for identical `request_id`.
  - Response normalization: maps Rust decisions and blockchain states into clean HTTP responses.
  - Middleware pipeline: Panic Recovery, Request ID, CORS, Request Body Limiting, Structured Logging, Auth Placeholder.
  - Health & Readiness probes (`/health`, `/ready`).

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
- **Technology**: Arc Mainnet (Chain ID `5042`).
- **RPC Endpoint**: `https://rpc.mainnet.arc.io`
- **Block Explorer**: `https://explorer.arc.io`
- **USDC Contract**: `0x3600000000000000000000000000000000000000`
- **Responsibilities**:
  - Stablecoin-native Layer 1 network with USDC as native gas currency.
  - Dual USDC representation: native gas (18 decimals) and ERC-20 interface (6 decimals).
  - Fast finality EVM execution layer for micro-payments.

---

## Execution Layer Safety Invariants

1. **Deterministic Authorization Precedence**:
   Execution is never initiated without prior `ALLOW` from the Rust Policy Engine.
2. **Live Execution Gate (`ENABLE_LIVE_EXECUTION`)**:
   Production broadcast is disabled by default (`ENABLE_LIVE_EXECUTION=false`). Dry-run validation returns `EXECUTION_DISABLED` with the authorization decision.
3. **Chain ID Verification**:
   Before broadcast, the execution service queries `eth_chainId` from RPC and verifies it matches `5042`.
4. **Idempotency Guarantee**:
   Transactions are tracked by unique `request_id`. Re-submitting an already executed or confirmed request returns the recorded result without broadcasting another transaction.
5. **Zero Private Key Exposure**:
   `EXECUTOR_PRIVATE_KEY` is loaded only from environment variables / secrets and never exposed in logs, HTTP responses, or git.
