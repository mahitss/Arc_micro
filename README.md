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
   ↓ (POST /v1/payments/execute)
Go Gateway (:8080)
   ↓ (POST /v1/authorize)
Rust Policy Engine (:8081)
   ↓ (ALLOW / DENY)
Go Gateway (:8080)
   ↓ (If ALLOW)
Execution Service
   ↓ (EIP-1559 Transaction)
Solidity AgentVault (On-chain spending controls on Arc)
   ↓ (usdc.safeTransfer)
Arc Mainnet (USDC Settlement)
```

For full architectural details, see [`docs/architecture.md`](docs/architecture.md), [`docs/arc.md`](docs/arc.md), and [`services/gateway/README.md`](services/gateway/README.md).

---

## Technology Stack

| Layer | Technology | Primary Role |
|---|---|---|
| **Web Dashboard** | TypeScript, Next.js (App Router), Tailwind CSS | Human-in-the-loop dashboard, telemetry, wallet configuration |
| **Gateway** | Go 1.22+, `go-ethereum` | High-throughput API gateway, policy orchestration, Arc execution service |
| **Policy Engine** | Rust 2021 (Axum, Tokio, Serde) | Deterministic spending limits, recipient verification, risk rules |
| **Smart Contracts** | Solidity 0.8.24+, Foundry (`forge`) | `AgentVault` smart contracts, on-chain execution on Arc |
| **Shared Types** | TypeScript | Common interfaces, intent schemas, currency definitions |
| **Automation** | Bash (`set -euo pipefail`), Makefile | Environment setup, development orchestration, testing, builds |

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
   - **Web Dashboard**: `http://localhost:3000`
   - **Go Gateway**: `http://localhost:8080` (Readiness: `GET /ready`, Health: `GET /health`)
   - **Rust Policy Engine**: `http://localhost:8081` (Health: `GET /health`)

---

## Example API Usage

### 1. Payment Execution Request (Go Gateway)

Send a payment execution request to the Go Gateway:

```bash
curl -X POST http://localhost:8080/v1/payments/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "research-agent",
    "vault_address": "0x2222222222222222222222222222222222222222",
    "recipient": "0x1111111111111111111111111111111111111111",
    "amount": "180000",
    "purpose": "api_usage"
  }'
```

**Expected Response (Execution Disabled / Dry Run - HTTP 200):**
```json
{
  "request_id": "req_8a3f9e21",
  "status": "EXECUTION_DISABLED",
  "vault": "0x2222222222222222222222222222222222222222",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "180000",
  "authorization": {
    "request_id": "req_8a3f9e21",
    "decision": "ALLOW",
    "reason_code": "APPROVED",
    "reason": "Payment satisfies the configured policy."
  }
}
```

**Expected Response (Policy Denied - HTTP 200, No Blockchain Transaction Sent):**
```json
{
  "request_id": "req_8a3f9e22",
  "status": "DENIED",
  "vault": "0x2222222222222222222222222222222222222222",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "180000",
  "authorization": {
    "request_id": "req_8a3f9e22",
    "decision": "DENY",
    "reason_code": "DAILY_LIMIT_EXCEEDED",
    "reason": "Payment would exceed the agent daily spending limit."
  }
}
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
- **Go Gateway Unit Tests**: `cd services/gateway && go test -v ./...`
- **Rust Policy Engine**: `cd services/policy-engine && cargo test`
- **Solidity Contracts**: `cd contracts && forge test -vvv`
- **Web**: `cd apps/web && npm run lint`

---

## Security Invariants & Warnings

> [!CAUTION]
> **CRITICAL SECURITY RULES**:
> 1. **NEVER commit private keys, mnemonics, or `.env` files** to this repository. All secret-bearing files are explicitly ignored via `.gitignore`.
> 2. **NO floating-point arithmetic** for currency calculations. All token amounts MUST be represented as integer base units (e.g., micro-USDC `6 decimals`).
> 3. **Deterministic evaluation**: All policy decisions are auditable, deterministic, and fail-closed (`DENY` by default on unexpected inputs).
> 4. **Live Execution Gate**: `ENABLE_LIVE_EXECUTION` defaults to `false`. Real Arc mainnet execution requires explicit opt-in and verified network constants.
> 5. **Authorization Precedence**: Blockchain execution is NEVER initiated without prior explicit `ALLOW` from the authoritative Rust Policy Engine.

---

## Project Status

- **Task 1: Monorepo Foundation**: Initial monorepo, web shell, gateway shell, policy engine shell, contract layout, CI. [COMPLETED]
- **Task 2: Deterministic Policy Engine**: Rust policy engine with domain models, pure `authorize()` evaluation, demo policy, HTTP API (`POST /v1/authorize`), 29 tests. [COMPLETED]
- **Task 3: AgentVault Smart Contract**: Solidity 0.8.24 `AgentVault.sol` on Arc with reentrancy protection, spending limits, blocklists, 38 Foundry tests. [COMPLETED]
- **Task 4: Go Gateway + Rust Policy Engine Integration**: Go Gateway orchestration layer, typed policy client, HTTP handlers, middleware, comprehensive error handling, unit and integration tests. [COMPLETED]
- **Task 5: Arc Mainnet USDC Execution Layer**: Blockchain client, execution service, AgentVault ABI packing, idempotency mechanism, safety gates, `POST /v1/payments/execute`, unit and integration tests. [COMPLETED]
- **Task 6: AI Agent + Payment Intent System**: Scheduled for next phase.
