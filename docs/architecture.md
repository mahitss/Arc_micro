# AgentPay Architecture

## System Overview

AgentPay provides programmable, deterministic USDC payment infrastructure specifically tailored for autonomous AI agents on the Arc blockchain. Autonomous agents require low-latency, programmatic payment execution for compute, tools, APIs, and micro-services without risking catastrophic wallet drain or policy violations.

```
+-------------------------------------------------------------+
|                        AI Agent                             |
|         (Requests API / compute / tool payment)             |
+-------------------------------------------------------------+
                              |
                              | Payment Intent (Signed/Raw)
                              v
+-------------------------------------------------------------+
|                      Next.js Web                            |
|             (Dashboard, Telemetry, Controls)                |
+-------------------------------------------------------------+
                              |
                              | HTTP / WebSocket
                              v
+-------------------------------------------------------------+
|                      Go Gateway                             |
|   (Auth, RPC Infra, Event Streaming, Transaction Monitor)   |
+-------------------------------------------------------------+
                              |
                              | HTTP RPC (Internal)
                              v
+-------------------------------------------------------------+
|                  Rust Policy Engine                         |
|   (Deterministic Policy, Spending Limits, Recipient Rules)  |
|                       ALLOW / DENY                          |
+-------------------------------------------------------------+
                              |
                              | Approved Intent Execution
                              v
+-------------------------------------------------------------+
|                  Solidity AgentVault                        |
|       (On-chain Smart Contract Vault on Arc Network)        |
+-------------------------------------------------------------+
                              |
                              | USDC Settlement
                              v
+-------------------------------------------------------------+
|                     Arc Mainnet                             |
|          (Finality & Native USDC Asset Settlement)          |
+-------------------------------------------------------------+
```

---

## Layer Responsibilities

### 1. Next.js Web Dashboard (`apps/web`)
- **Technology**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Responsibilities**:
  - Provides a human-in-the-loop interface for human operators to monitor agent spending in real time.
  - Configuration UI for policy limits (daily spending caps, whitelisted service providers, emergency freeze).
  - Visualization of payment intents, pending reviews, approvals, and transaction history.
  - Web3 wallet interaction (e.g., configuring contract parameters, initial vault funding).

### 2. Go Gateway (`services/gateway`)
- **Technology**: Go 1.22+.
- **Responsibilities**:
  - High-throughput API gateway receiving payment intents from AI agents.
  - Blockchain RPC infrastructure and node connection pool management.
  - Real-time transaction monitoring and event streaming over WebSockets/SSE.
  - Orchestration between agent intents, policy evaluation, and contract dispatch.
  - Resilience, rate-limiting, and telemetry ingestion.

### 3. Rust Policy Engine (`services/policy-engine`)
- **Technology**: Rust 2021, Axum, Tokio, Serde.
- **Responsibilities**:
  - Acts as the primary security and authorization boundary of AgentPay.
  - Exposes `POST /v1/authorize` receiving payment intents from the Go Gateway.
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

## Core Engineering Invariants

1. **Deterministic Execution**:
   The policy engine produces identical decisions given identical intent parameters and state. No probabilistic or heuristic approvals for funds transfer.

2. **Zero Floating-Point Arithmetic**:
   All monetary amounts are represented as integers in the smallest token denomination (e.g., 6 decimals for USDC = $1.00 is `1_000_000` micro-units).
   - TypeScript: `BigInt` / string
   - Go: `*big.Int` / `uint64`
   - Rust: `u64` / `u128`
   - Solidity: `uint256`

3. **Explicit Failure & Auditable Denials**:
   Every policy denial produces a machine-readable reason code and audit payload. Failures are never silent.

4. **Principle of Least Privilege**:
   AI agents never possess raw private keys holding total treasury balances. They submit signed intents against strictly capped allowances in the AgentVault.
