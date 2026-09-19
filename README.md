# AgentPay

Programmable USDC payment infrastructure for autonomous AI agents on Arc.

---

## What it does

AgentPay is a programmable, policy-controlled payment infrastructure designed specifically for autonomous AI agents. It enables AI agents to formulate spending requests (such as paying for API calls, GPU compute, or data services) while placing a deterministic risk engine and on-chain smart contract guardrails between the agent's intent and actual on-chain settlement.

---

## The problem

Autonomous AI agents can formulate plans, reason through complex tasks, and invoke external software tools. However, granting an AI agent direct, unconstrained access to a cryptocurrency wallet introduces critical financial and operational risks:
- **Prompt Injection & Tool Hijacking**: Adversarial user inputs or malicious third-party content can trick an LLM into sending unauthorized transactions.
- **Runaway Spending Loops**: Recursive sub-agent execution or software bugs can deplete treasury balances in seconds.
- **Lack of Governance**: Traditional crypto wallets provide no programmatic spending limits, daily budget caps, or service-level allowlists.

For autonomous agents to conduct commerce safely, **economic authority must be separated from intelligence**.

---

## How it works

Every economic action passes through a deterministic pipeline where the AI never holds signing keys:

```
AI Agent
   ↓ (High-level reasoning & task evaluation)
Payment Intent
   ↓ (Structured JSON with service_id, amount, purpose)
Go Gateway
   ↓ (Schema validation & server-side recipient resolution)
Rust Policy Engine
   ↓ (Deterministic math: daily limits, per-tx limits, allowlists)
AgentVault
   ↓ (Solidity smart contract enforcing on-chain limits)
Arc / USDC
   ↓ (Finalized on-chain settlement with USDC gas)
```

---

## Why Arc

AgentPay specifically uses Arc as its native settlement layer for USDC-denominated agent payments:
- **USDC-Native Gas Economics**: On Arc, gas fees are paid directly in USDC at the protocol level (18 decimals), while contract state operates via the canonical ERC-20 interface (6 decimals). This unifies gas accounting and payment settlement into a single stable currency, eliminating the dual-asset friction of managing both ETH/MATIC and stablecoins.
- **EVM Compatibility (Chain ID `5042`)**: Arc provides standard EVM execution semantics, allowing AgentPay to deploy standard Solidity contracts (`AgentVault.sol`) and use established tooling (Foundry, `go-ethereum`).
- **Programmable On-Chain Settlement**: Arc provides deterministic block execution and finality, suitable for high-frequency machine-to-machine micropayments.

For detailed economic rationale, see [`docs/why-arc.md`](docs/why-arc.md).

---

## Live Demo

- **Interactive Reviewer Route**: Available at **[`/demo`](http://localhost:3000/demo)** when running the Web Control Center locally.
- **Single-Screen Experience**: Demonstrates the full 5-step pipeline in one interface:
  1. **Research Agent Intent**: Agent requests 0.18 USDC for the registered `web-research` service.
  2. **Policy Evaluation**: Evaluates spending limit rules in pure Rust and returns `ALLOW`.
  3. **Execution & Settlement**: Submits transaction to `AgentVault` (or clearly displays `DEMO / EXECUTION DISABLED` when running without live mainnet gas).
  4. **Safety Denial Demonstration**: Demonstrates an over-limit payment attempt (e.g. 6.00 USDC exceeding daily budget), resulting in an immediate `DAILY_LIMIT_EXCEEDED` denial and **`Blockchain Transaction: NONE`**.

---

## Contract

- **Contract Name**: `AgentVault.sol`
- **Target Network**: Arc Mainnet (Chain ID `5042`)
- **Canonical USDC Address**: `0x3600000000000000000000000000000000000000`
- **Deployment Script**: `contracts/script/DeployAgentVault.s.sol` (tested via Foundry, ready for broadcast with `scripts/deploy_mainnet.sh`).
- **Verified Deployment Records**: See [`docs/deployed-resources.md`](docs/deployed-resources.md).

---

## Architecture

AgentPay is divided into five distinct architectural layers:

1. **Untrusted Client Layer (`apps/web`)**: Next.js 14 Web Control Center for operator monitoring, policy inspection, and interactive demonstration.
2. **Gateway Orchestration Layer (`services/gateway`)**: Go 1.22 API gateway handling task ingestion, prompt orchestration, server-side recipient resolution from the `Service Registry`, rate limiting, and atomic Compare-And-Swap (CAS) state transitions.
3. **Deterministic Policy Boundary (`services/policy-engine`)**: Standalone Rust service evaluating spending requests against daily budget limits, per-transaction maximums, frequency caps, and recipient allowlists in sub-millisecond response times.
4. **Execution & Signer Boundary (`services/gateway/internal/execution`)**: Manages nonce allocation, EIP-1559 gas calculation, idempotency checks, and transaction submission to Arc.
5. **On-Chain Settlement Layer (`contracts/AgentVault.sol`)**: Solidity smart contract on Arc holding USDC reserves, enforcing hard on-chain daily limits, and executing transfers via `usdc.safeTransfer`.

For complete architectural details and Mermaid diagrams, see [`docs/architecture-final.md`](docs/architecture-final.md).

---

## Security model

- **AI is Untrusted**: The LLM never holds private keys, never signs transactions, and cannot specify arbitrary recipient addresses. All recipients are resolved server-side from an approved registry.
- **Rust Policy Controls Authorization**: Off-chain authorization is pure, deterministic, and side-effect-free. No transaction is broadcast without an explicit `ALLOW`.
- **Solidity Enforces On-Chain Rules**: `AgentVault.sol` enforces independent daily spending limits and owner-controlled emergency `pause()` and `withdraw()` mechanisms.
- **Double-Spend Defense**: Concurrency and replay protection are enforced via database CAS state transitions (`AUTHORIZED` $\rightarrow$ `EXECUTING`).

For the full security specification and threat model, see [`docs/security.md`](docs/security.md).

---

## Tech Stack

- **TypeScript**: Next.js 14 (App Router), React, TailwindCSS.
- **Go**: Go 1.22, `go-ethereum`, standard library HTTP routing.
- **Rust**: Rust 1.78, Axum, Tokio, Serde.
- **Solidity**: Solidity 0.8.24, OpenZeppelin Contracts, Foundry (`forge`, `cast`).
- **Bash**: Production deployment scripts (`scripts/deploy_mainnet.sh`, `scripts/dev.sh`).
- **PostgreSQL**: Optional relational persistence for intents and transaction records (in-memory fallback for local dev).

---

## Running locally

### 1. Prerequisites
- Go `1.22+`
- Rust & Cargo `1.78+`
- Node.js `18+` & `npm`
- Foundry (`forge`, `cast`)

### 2. Quickstart
```bash
# Clone repository
git clone https://github.com/mahitss/Arc_micro.git
cd Arc_micro

# Copy environment template
cp .env.example .env

# Run all services (Web on :3000, Gateway on :8080, Policy Engine on :8081)
./scripts/dev.sh
```

For step-by-step developer onboarding, see [`docs/quickstart.md`](docs/quickstart.md).

---

## Testing

Every layer contains comprehensive automated test suites:

```bash
# 1. Smart Contract Tests (Solidity)
cd contracts && forge test
# Status: 41/41 passing (unit, edge case, and fuzz tests)

# 2. Policy Engine Tests (Rust)
cd services/policy-engine && cargo test
# Status: 29/29 passing (limits, allowlists, frequency caps)

# 3. Gateway & Integration Tests (Go)
cd services/gateway && go test -v ./...
# Status: 100% passing (task parsing, negative paths, concurrency, recovery)

# 4. Frontend Unit Tests & Linter (TypeScript)
cd apps/web && npm test && npm run lint
# Status: 14/14 passing, zero ESLint errors
```

---

## Deployment

To deploy `AgentVault.sol` to Arc Mainnet:

```bash
# Export deployer credentials securely in shell session (never write to disk)
export DEPLOYER_PRIVATE_KEY="<your_hex_private_key>"
export ARC_RPC_URL="https://rpc.mainnet.arc.io"
export ARC_CHAIN_ID="5042"
export ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"
export AGENT_ID="research-agent"

# Run the deployment script
./scripts/deploy_mainnet.sh
```

For complete operations runbooks, see [`docs/deployment.md`](docs/deployment.md).

---

## Limitations

> [!WARNING]
> **Prototype Status**: AgentPay is an experimental prototype built for the Arc Microgrants program. It is **NOT** audited and **NOT** production-ready. Do not use AgentPay to custody substantial financial capital.

For full disclosure of known architectural limitations and assumptions, see [`docs/limitations.md`](docs/limitations.md).

---

## Microgrant status

| Requirement | Status | Notes |
|---|---|---|
| **Arc Mainnet Compatibility** | **VERIFIED** | Chain ID `5042` and USDC contract verified live via RPC. |
| **Smart Contracts** | **VERIFIED** | 41 Foundry tests passing. Deployment script ready. |
| **Policy Engine** | **VERIFIED** | 29 Rust tests passing. Sub-millisecond evaluation. |
| **Gateway Orchestrator** | **VERIFIED** | Go 1.22, concurrency protected, CAS state transitions. |
| **Control Center & Demo** | **VERIFIED** | Next.js 14 dashboard and interactive `/demo` route. |
| **Mainnet Broadcast** | **PENDING EVALUATION** | Ready for funded broadcast with `scripts/deploy_mainnet.sh`. |

For the full Arc Microgrants checklist, see [`docs/microgrant-checklist.md`](docs/microgrant-checklist.md).
