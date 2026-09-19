# AgentPay

> **Programmable USDC infrastructure for autonomous AI agents.**

Built for the **Arc Microgrants program**.

---

## Overview

**AgentPay** is programmable, deterministic payment infrastructure designed for autonomous AI agents operating on the **Arc blockchain**. 

As autonomous agents increasingly purchase resources—such as LLM compute, external API subscriptions, data indexing, and specialized tools—they require programmatic access to financial rails. However, granting autonomous agents unrestricted access to private keys and treasury balances introduces immense security and financial risk.

AgentPay solves this by placing a deterministic risk/policy engine, an AI payment intent validation layer, and an on-chain vault between the agent's intent to pay and actual on-chain settlement.

---

## Architecture Summary

Every payment passes through a deterministic pipeline:

```
AI Model (Untrusted Reasoning)
   ↓ (POST /v1/agents/tasks)
Structured Payment Intent (JSON)
   ↓ (Schema Validation & Service Registry)
Go Gateway (:8080)
   ↓ (POST /v1/authorize or POST /v1/payment-intents/:id/authorize)
Rust Policy Engine (:8081)
   ↓ (ALLOW / DENY)
Go Gateway (:8080)
   ↓ (If ALLOW & Operator Confirmed)
Execution Service
   ↓ (EIP-1559 Transaction)
Solidity AgentVault (On-chain spending controls on Arc)
   ↓ (usdc.safeTransfer)
Arc Mainnet (USDC Settlement)
```

For full architectural details, see [`docs/architecture.md`](docs/architecture.md), [`docs/agent.md`](docs/agent.md), [`docs/frontend.md`](docs/frontend.md), [`docs/arc.md`](docs/arc.md), and [`services/gateway/README.md`](services/gateway/README.md).

---

## Technology Stack

| Layer | Technology | Primary Role |
|---|---|---|
| **Web Control Center** | TypeScript, Next.js (App Router), Tailwind CSS | Developer control center, agent telemetry, policy visualization, approval flow |
| **AI Orchestration** | Go 1.22+, `AgentModel`, OpenAI JSON mode | Task analysis, prompt injection defense, structured payment intent creation |
| **Gateway** | Go 1.22+, `go-ethereum` | High-throughput API gateway, service registry, state machine, Arc execution service |
| **Policy Engine** | Rust 2021 (Axum, Tokio, Serde) | Deterministic spending limits, recipient verification, risk rules |
| **Smart Contracts** | Solidity 0.8.24+, Foundry (`forge`) | `AgentVault` smart contracts, on-chain execution on Arc |
| **Shared Types** | TypeScript | Common interfaces, intent schemas, currency definitions |
| **Automation** | Bash (`set -euo pipefail`), Makefile | Environment setup, development orchestration, testing, builds |

---

## Web Control Center Routes

| Route | Description |
|---|---|
| `/` | Landing page explaining AgentPay product positioning and architecture pipeline. |
| `/dashboard` | Infrastructure console: agent totals, USDC controlled, spending KPI metrics, system health, and recent intents/transactions. |
| `/agents` | Directory of registered autonomous agents and their operating statuses. |
| `/agents/[agentId]` | Agent detail: vault address, USDC balance, spending policy visualization, and budget progress bar. |
| `/payment-intents` | Full lifecycle view of payment intents with status filtering (`ALL`, `CREATED`, `AUTHORIZED`, `CONFIRMED`, `DENIED`, `EXPIRED`). |
| `/payment-intents/[intentId]` | Detailed intent view with policy reasoning and explicit human confirmation approval flow. |
| `/transactions` | Settled on-chain transactions with verified Arc explorer links. |
| `/transactions/[txHash]` | Granular transaction execution metadata and block confirmations. |
| `/services` | Service Registry: authorized paid services (`web-research`, `compute-cluster`, `data-feed`) and price ceilings. |
| `/settings` | Read-only infrastructure configuration and security boundaries. |

### Demo Mode
When running locally or when backend services are offline, the Web Control Center includes a **Demo Mode** toggle (`● DEMO MODE ACTIVE`). This loads clearly labeled demo fixtures (`[DEMO]`) for visual review without fabricating on-chain data.

---

## Arc Mainnet Configuration

| Parameter | Value |
|---|---|
| **Chain ID** | `5042` |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` |
| **Block Explorer** | `https://explorer.arc.io` |
| **USDC Contract** | `0x3600000000000000000000000000000000000000` |
| **Gas Asset** | Native USDC (18 decimals protocol / 6 decimals ERC-20) |

---

## Quickstart & Local Development

1. **Clone the repository**:
   ```bash
   git clone <repo-url> agentpay
   cd agentpay
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Run all services simultaneously**:
   ```bash
   bash scripts/dev.sh
   # Or using Makefile:
   make dev
   ```
   This launches:
   - **Web Control Center**: `http://localhost:3000`
   - **Go Gateway**: `http://localhost:8080` (Readiness: `GET /ready`, Health: `GET /health`)
   - **Rust Policy Engine**: `http://localhost:8081` (Health: `GET /health`)

4. **Web-Only Development**:
   ```bash
   cd apps/web
   npm run dev       # Starts dev server on http://localhost:3000
   npm run test      # Runs frontend unit test suite
   npm run lint      # Runs Next.js ESLint
   npm run build     # Compiles production Next.js application
   ```

---

## Testing Commands

Run automated tests across all components:

```bash
# Using Makefile:
make test

# Or directly:
bash scripts/test.sh
```

Individual component tests:
- **Frontend Web Suite**: `cd apps/web && npm run test`
- **Go Gateway Unit & Integration**: `cd services/gateway && go test -v ./...`
- **Rust Policy Engine**: `cd services/policy-engine && cargo test`
- **Solidity Contracts**: `cd contracts && forge test -vvv`

---

## Security Invariants & Warnings

> [!CAUTION]
> **CRITICAL SECURITY RULES**:
> 1. **NEVER commit private keys, mnemonics, or `.env` files** to this repository. All secret-bearing files are explicitly ignored via `.gitignore`.
> 2. **NO floating-point arithmetic** for currency calculations. All token amounts MUST be represented as integer base units (e.g., micro-USDC `6 decimals`).
> 3. **Deterministic evaluation**: All policy decisions are auditable, deterministic, and fail-closed (`DENY` by default on unexpected inputs).
> 4. **Live Execution Gate**: `ENABLE_LIVE_EXECUTION` defaults to `false`. Real Arc mainnet execution requires explicit opt-in and verified network constants.
> 5. **Authorization Precedence**: Blockchain execution is NEVER initiated without prior explicit `ALLOW` from the authoritative Rust Policy Engine.
> 6. **Zero Browser Secrets**: The web frontend NEVER stores or handles private keys. Real-world execution is guarded by server-side execution boundaries and human-in-the-loop approval.

---

## Project Status

- **Task 1: Monorepo Foundation**: Initial monorepo, web shell, gateway shell, policy engine shell, contract layout, CI. [COMPLETED]
- **Task 2: Deterministic Policy Engine**: Rust policy engine with domain models, pure `authorize()` evaluation, demo policy, HTTP API (`POST /v1/authorize`), 29 tests. [COMPLETED]
- **Task 3: AgentVault Smart Contract**: Solidity 0.8.24 `AgentVault.sol` on Arc with reentrancy protection, spending limits, blocklists, 38 Foundry tests. [COMPLETED]
- **Task 4: Go Gateway + Rust Policy Engine Integration**: Go Gateway orchestration layer, typed policy client, HTTP handlers, middleware, comprehensive error handling, unit and integration tests. [COMPLETED]
- **Task 5: Arc Mainnet USDC Execution Layer**: Blockchain client, execution service, AgentVault ABI packing, idempotency mechanism, safety gates, `POST /v1/payments/execute`, unit and integration tests. [COMPLETED]
- **Task 6: AI Agent + Payment Intent System**: AI model abstraction, prompt injection defense, server-side service registry, state machine, PostgreSQL migrations, auto-execution mode, 30 tests. [COMPLETED]
- **Task 7: AgentPay Web Control Center**: Developer-grade control center, 10 application routes, API client, reusable components, confirmation dialog, demo mode, 14 frontend tests. [COMPLETED]
