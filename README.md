# AgentPay

Programmable USDC payment infrastructure for autonomous AI agents on Arc.

---

## What It Does

AgentPay provides programmable, deterministic payment infrastructure for autonomous AI agents operating on the Arc blockchain. 

When an autonomous agent needs to purchase computational resources, external APIs, or data services, it does not hold a private key or directly broadcast transactions. Instead, every transaction follows a controlled pipeline:

```
AI agent requests a payment
  ↓
trusted service is selected (Service Registry)
  ↓
deterministic policy evaluates it (Rust Policy Engine)
  ↓
authorized payment reaches execution layer (Go Gateway)
  ↓
AgentVault executes USDC payment (Solidity Smart Contract)
  ↓
Arc settles it (USDC native gas settlement)
  ↓
backend verifies the result (Event & Receipt Verification)
```

> **Core Principle**: AI can request a payment, but AI does not receive unrestricted authority to move funds.

---

## Why Arc

AgentPay specifically uses Arc as its native settlement network for five technical reasons:

1. **USDC-Denominated Payments**: Agent operations (API calls, inference, data feeds) are priced in dollar equivalents. Arc eliminates currency volatility by natively operating in USDC.
2. **Programmable Payment Infrastructure**: Arc provides high-throughput, low-latency EVM smart contract execution tailored for automated commerce.
3. **Agentic Economic Activity**: On standard networks, agents must manage two assets (native gas + stablecoin). On Arc, gas is paid directly in USDC at the protocol layer, allowing an agent funded with USDC to cover both service payments and network fees from a single balance.
4. **Deterministic Settlement**: Arc provides fast transaction finality, enabling autonomous agents to execute multi-step tool calls without waiting for extended block confirmations.
5. **On-Chain Verification**: Every payment emits an immutable `PaymentExecuted` event on Arc, providing cryptographic proof of settlement for automated accounting and reconciliation.

---

## Architecture

```mermaid
flowchart TD
    subgraph Untrusted_Layer["Untrusted Client & Model Layer"]
        User["Operator"] --> UI["Next.js Control Center (/demo)"]
        AI["AI Agent (LLM)"] -->|Payment Intent| Registry["Service Registry"]
    end

    subgraph Trusted_Logic["Trusted Application Logic Boundary"]
        Registry -->|Validated Intent| Gateway["Go Gateway (:8080)"]
        Gateway -->|Authorize Request| Rust["Rust Policy Engine (:8081)"]
        Rust -->|ALLOW / DENY| Gateway
        Gateway -->|Atomic CAS / Sign| Executor["Execution Service"]
    end

    subgraph OnChain_Enforcement["On-Chain Settlement Layer (Arc Mainnet)"]
        Executor -->|executePayment()| Vault["AgentVault.sol"]
        Vault -->|Transfer USDC| Provider["Service Provider"]
        Vault -->|Emit Event| Arc["Arc Blockchain (Chain ID 5042)"]
    end

    classDef untrusted fill:#4a154b,stroke:#e01e5a,stroke-width:1px,color:#fff;
    classDef trusted fill:#1e3a5f,stroke:#3b82f6,stroke-width:1px,color:#fff;
    classDef onchain fill:#1a3a2a,stroke:#10b981,stroke-width:1px,color:#fff;

    class User,UI,AI untrusted;
    class Registry,Gateway,Rust,Executor trusted;
    class Vault,Provider,Arc onchain;
```

---

## Tech Stack

- **Next.js / TypeScript**: Developer Control Center and interactive reviewer demo (`/demo`).
- **Go**: High-throughput gateway, prompt orchestration, service registry, and blockchain execution client.
- **Rust**: Deterministic, side-effect-free policy engine evaluating spending rules in sub-millisecond latency.
- **Solidity**: `AgentVault.sol` smart contracts enforcing on-chain daily limits, emergency pause, and fund custody.
- **PostgreSQL**: Relational persistence for payment intents and transaction receipts (with thread-safe in-memory fallback).
- **Arc**: Stablecoin-native Layer 1 settlement network (Chain ID `5042`).
- **USDC**: Canonical settlement asset (`0x3600000000000000000000000000000000000000`) and native gas asset.

---

## Security Model

AgentPay enforces defense-in-depth across six distinct boundaries:

1. **AI is Untrusted**: The LLM never touches private keys, never signs transactions, and cannot specify arbitrary recipient addresses.
2. **Rust Policy Engine is Deterministic**: Evaluates spending limits, daily budget caps, transaction frequency, and allowlists using pure integer arithmetic without network or clock side effects.
3. **Service Registry Constrains Recipients**: Recipient addresses are resolved strictly server-side from an approved catalog, neutralizing prompt injection attacks.
4. **Go Execution Layer is Controlled**: Enforces atomic Compare-And-Swap (CAS) state transitions (`AUTHORIZED` $\rightarrow$ `EXECUTING`) to eliminate race conditions and double-spending.
5. **AgentVault Enforces On-Chain Limits**: Hard daily spending caps and owner emergency pause switches (`pause()`) are enforced directly in immutable EVM bytecode.
6. **Secrets Stay Server-Side**: Signing keys and API secrets are loaded strictly from environment variables at runtime and never reach frontend bundles or client logs.

---

## Demo

- **Production Hosted URL**: `LIVE DEMO: NOT YET DEPLOYED`
- **Interactive Local Demo**: Available at **[`http://localhost:3000/demo`](http://localhost:3000/demo)** when running the Web Control Center locally.
- **Demo Features**:
  - **Happy Path**: Research Agent creates an intent for 0.18 USDC, Rust policy evaluates and approves, execution prepared, settlement displayed.
  - **Safety Denial**: Over-limit payment (6.00 USDC > daily budget) is denied off-chain with `DAILY_LIMIT_EXCEEDED` and explicitly proves **`Blockchain Transaction: NONE`**.

---

## Quick Start
To set up and run the complete system locally in under 5 minutes, see [`docs/quickstart.md`](docs/quickstart.md) or the concise [`docs/reviewer-quickstart.md`](docs/reviewer-quickstart.md).

## Deployment
For verified Arc Mainnet parameters, RPC endpoints, and smart contract configuration, see [`docs/deployed-resources.md`](docs/deployed-resources.md).

## Security
For the comprehensive security architecture, threat model, and failure recovery protocols, see [`docs/security.md`](docs/security.md).

## Limitations
For complete disclosure of prototype assumptions and known architectural constraints, see [`docs/limitations.md`](docs/limitations.md).

## Submission
For the Arc Microgrants requirements matrix and verification evidence, see [`docs/submission-checklist.md`](docs/submission-checklist.md) and [`docs/submission-evidence.md`](docs/submission-evidence.md).
