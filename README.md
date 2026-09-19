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
AI Agent
   ↓
Payment Intent
   ↓
Go Gateway (API, RPC infra, event streaming)
   ↓
Rust Policy Engine (Deterministic policy limits, ALLOW / DENY)
   ↓
Solidity AgentVault (On-chain spending controls)
   ↓
USDC Settlement (Arc Network)
```

For full architectural details and design invariants, see [`docs/architecture.md`](docs/architecture.md).

---

## Technology Stack

| Layer | Technology | Primary Role |
|---|---|---|
| **Web Dashboard** | TypeScript, Next.js (App Router), Tailwind CSS | Human-in-the-loop dashboard, telemetry, wallet configuration |
| **Gateway** | Go 1.22+ | High-throughput API gateway, RPC connection pooling, WebSocket streaming |
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
│   ├── gateway/               # Go API gateway & RPC infrastructure
│   └── policy-engine/         # Rust deterministic policy/risk engine
│
├── contracts/                 # Foundry project for Solidity AgentVault
│   ├── src/
│   ├── test/
│   ├── script/
│   └── foundry.toml
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
│   └── architecture.md        # Comprehensive system architecture & specs
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

## Local Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url> agentpay
   cd agentpay
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Run setup script**:
   ```bash
   # Using Makefile:
   make setup

   # Or directly:
   bash scripts/setup.sh
   ```
   The setup script verifies all required tools and installs dependencies for all initialized components.

---

## Development Commands

Run all local services simultaneously with clean child-process management:

```bash
# Using Makefile:
make dev

# Or directly:
bash scripts/dev.sh
```

This launches:
- Next.js Web: `http://localhost:3000`
- Go Gateway: `http://localhost:8080` (Health: `GET /health`)
- Rust Policy Engine: `http://localhost:8081` (Health: `GET /health`)

Press `Ctrl+C` to terminate all services cleanly.

---

## Testing Commands

Run automated tests across all initialized components:

```bash
# Using Makefile:
make test

# Or directly:
bash scripts/test.sh
```

Individual component tests:
- **Web**: `cd apps/web && npm run lint`
- **Go Gateway**: `cd services/gateway && go test -v ./...`
- **Rust Policy Engine**: `cd services/policy-engine && cargo test`
- **Solidity Contracts**: `cd contracts && forge test`

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

## Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `ARC_RPC_URL` | Arc Blockchain RPC endpoint | *(Configured during deployment)* |
| `ARC_CHAIN_ID` | Arc Network Chain ID | *(Configured during deployment)* |
| `ARC_USDC_ADDRESS` | USDC ERC-20 contract address on Arc | *(Configured during deployment)* |
| `DATABASE_URL` | PostgreSQL connection string | *(Future persistence)* |
| `GATEWAY_PORT` | Port for Go Gateway HTTP server | `8080` |
| `POLICY_ENGINE_URL` | Upstream URL to Rust Policy Engine | `http://localhost:8081` |
| `POLICY_ENGINE_PORT` | Port for Rust Policy Engine server | `8081` |

---

## Security Invariants & Warnings

> [!CAUTION]
> **CRITICAL SECURITY RULES**:
> 1. **NEVER commit private keys, mnemonics, or `.env` files** to this repository. All secret-bearing files are explicitly ignored via `.gitignore`.
> 2. **NO floating-point arithmetic** for currency calculations. All token amounts MUST be represented as integer units (e.g., micro-USDC `6 decimals`).
> 3. **Deterministic evaluation**: All policy decisions are auditable, deterministic, and fail-closed (`DENY` by default on unexpected inputs).

---

## Project Status

- **Current Task (Task 1)**: Initial production-quality monorepo foundation completed.
  - Next.js web application shell initialized (`/` and `/dashboard`).
  - Go Gateway initialized with `GET /health`.
  - Rust Policy Engine initialized with `GET /health`.
  - Foundry project structure and configuration initialized.
  - Shared TypeScript schemas created.
  - Shell automation scripts and CI workflows established.
- **Arc Mainnet Deployment**: Contract implementation (`AgentVault`), live RPC connectivity, and Arc mainnet deployment will occur in dedicated subsequent tasks.
