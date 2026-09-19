# AgentPay

> **Programmable USDC infrastructure for autonomous AI agents.**

Built for the **Arc Microgrants program**.

---

## Overview

**AgentPay** is programmable, deterministic payment infrastructure designed for autonomous AI agents operating on the **Arc blockchain**. 

As autonomous agents increasingly purchase resources—such as LLM compute, external API subscriptions, data indexing, and specialized tools—they require programmatic access to financial rails. However, granting autonomous agents unrestricted access to private keys and treasury balances introduces immense security and financial risk.

AgentPay solves this by placing a deterministic risk/policy engine and an on-chain vault between the agent's intent to pay and actual on-chain settlement.

---

## Architecture Summary

Every payment passes through a deterministic pipeline:

```
Client / AI Agent
   ↓
Go Gateway (:8080)
   ↓ (POST /v1/authorize)
Rust Policy Engine (:8081)
   ↓ (ALLOW / DENY)
Go Gateway (:8080)
   ↓
Solidity AgentVault (On-chain spending controls on Arc)
   ↓
USDC Settlement (Arc Network)
```

For full architectural details and design invariants, see [`docs/architecture.md`](docs/architecture.md) and [`services/gateway/README.md`](services/gateway/README.md).

---

## Technology Stack

| Layer | Technology | Primary Role |
|---|---|---|
| **Web Dashboard** | TypeScript, Next.js (App Router), Tailwind CSS | Human-in-the-loop dashboard, telemetry, wallet configuration |
| **Gateway** | Go 1.22+ | High-throughput API gateway, RPC connection pooling, policy client orchestration |
| **Policy Engine** | Rust 2021 (Axum, Tokio, Serde) | Deterministic spending limits, recipient verification, risk rules |
| **Smart Contracts** | Solidity 0.8.24+, Foundry (`forge`) | `AgentVault` smart contracts, on-chain execution on Arc |
| **Shared Types** | TypeScript | Common interfaces, intent schemas, currency definitions |
| **Automation** | Bash (`set -euo pipefail`), Makefile | Environment setup, development orchestration, testing, builds |

---

## Repository Structure

```
agentpay/
├── apps/
│   └── web/                   # Next.js web dashboard shell
│
├── services/
│   ├── gateway/               # Go API gateway & Rust policy integration
│   │   ├── cmd/server/        # Gateway entrypoint
│   │   ├── internal/          # Config, domain, health, HTTP handlers, middleware, policy client
│   │   └── tests/             # Unit and integration tests
│   └── policy-engine/         # Rust deterministic policy/risk engine
│       ├── src/domain/        # Domain types (Money, Address, Policy, Decision)
│       ├── src/engine/        # Pure deterministic evaluation engine
│       └── src/http/          # Axum HTTP handlers (POST /v1/authorize)
│
├── contracts/                 # Foundry project for Solidity AgentVault
│   ├── src/                   # AgentVault.sol, interfaces
│   ├── test/                  # Unit, fuzz, and invariant tests
│   └── script/                # Deployment scripts
│
├── packages/
│   └── shared/                # Shared TypeScript schemas & types
│
├── scripts/                   # Production-grade automation scripts
│   ├── setup.sh               # Environment check & dependency setup
│   ├── dev.sh                 # Local multi-service runner
│   ├── test.sh                # Test runner across all components
│   └── build.sh               # Build runner across all components
│
├── docs/
│   ├── architecture.md        # Comprehensive system architecture & specs
│   └── policy-engine-contract.md # Policy engine contract documentation
│
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI matrix
│
├── .env.example               # Template environment configuration
├── .gitignore                 # Comprehensive ignore rules
├── Makefile                   # Developer convenience targets
├── docker-compose.yml         # Local service orchestration
└── README.md                  # Project documentation
```

---

## Prerequisites

Before running the project locally, ensure the following tools are installed:

- **Node.js**: v18.0.0+ (v20+ recommended) and **npm** v9+
- **Go**: 1.22+
- **Rust & Cargo**: 1.75+ (stable toolchain)
- **Foundry (`forge`, `cast`)**: Required for contract compilation and testing ([Installation Guide](https://getfoundry.sh))
- **Bash**: Standard Bash environment (on Windows, use Git Bash or WSL)

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
   - **Web Dashboard**: `http://localhost:3000`
   - **Go Gateway**: `http://localhost:8080` (Readiness: `GET /ready`, Health: `GET /health`)
   - **Rust Policy Engine**: `http://localhost:8081` (Health: `GET /health`)

---

## Example API Usage

### 1. Payment Authorization Request (Go Gateway)

Send a payment authorization request to the Go Gateway:

```bash
curl -X POST http://localhost:8080/v1/payments/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "research-agent",
    "recipient": "0x1111111111111111111111111111111111111111",
    "amount": "180000",
    "asset": "USDC",
    "purpose": "api_usage"
  }'
```

**Expected Response (ALLOW - HTTP 200):**
```json
{
  "request_id": "req_8a3f9e21",
  "decision": "ALLOW",
  "reason_code": "APPROVED",
  "reason": "Payment satisfies the configured policy."
}
```

**Expected Response (DENY - HTTP 200):**
```json
{
  "request_id": "req_8a3f9e22",
  "decision": "DENY",
  "reason_code": "DAILY_LIMIT_EXCEEDED",
  "reason": "Payment would exceed the agent daily spending limit."
}
```

> [!NOTE]
> Authorization is currently side-effect-free policy evaluation. Blockchain settlement remains disabled for this task.

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
- **Go Gateway Unit Tests**: `cd services/gateway && go test -v ./...`
- **Go Gateway Integration Tests**: `cd services/gateway && go test -v ./tests/integration/...`
- **Rust Policy Engine**: `cd services/policy-engine && cargo test`
- **Solidity Contracts**: `cd contracts && forge test -vvv`
- **Web**: `cd apps/web && npm run lint`

---

## Build Commands

Build all production artifacts:

```bash
# Using Makefile:
make build

# Or directly:
bash scripts/build.sh
```

---

## Security Invariants & Warnings

> [!CAUTION]
> **CRITICAL SECURITY RULES**:
> 1. **NEVER commit private keys, mnemonics, or `.env` files** to this repository. All secret-bearing files are explicitly ignored via `.gitignore`.
> 2. **NO floating-point arithmetic** for currency calculations. All token amounts MUST be represented as integer units (e.g., micro-USDC `6 decimals`).
> 3. **Deterministic evaluation**: All policy decisions are auditable, deterministic, and fail-closed (`DENY` by default on unexpected inputs).
> 4. **Rust is authoritative**: The Go Gateway validates basic request shape and coordinates transport, but never duplicates or overrides policy rules.

---

## Project Status

- **Task 1: Monorepo Foundation**: Initial monorepo, web shell, gateway shell, policy engine shell, contract layout, CI. [COMPLETED]
- **Task 2: Deterministic Policy Engine**: Rust policy engine with domain models, pure `authorize()` evaluation, demo policy, HTTP API (`POST /v1/authorize`), 29 tests. [COMPLETED]
- **Task 3: AgentVault Smart Contract**: Solidity 0.8.24 `AgentVault.sol` on Arc with reentrancy protection, spending limits, blocklists, 38 Foundry tests. [COMPLETED]
- **Task 4: Go Gateway + Rust Policy Engine Integration**: Go Gateway orchestration layer, typed policy client, HTTP handlers, middleware, comprehensive error handling, unit and integration tests. [COMPLETED]
- **Task 5: Arc Mainnet Transaction Execution**: Scheduled for next phase.
