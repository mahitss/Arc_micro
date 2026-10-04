# AGENTPAY
### THE FINANCIAL CONTROL PLANE FOR AUTONOMOUS AI AGENTS

> **AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.**  
> *Autonomy may expand. Financial authority must remain bounded.*

[![Build](https://img.shields.io/badge/Build-Passing%20(80%20routes)-emerald)](#)
[![Tests](https://img.shields.io/badge/Tests-510%20Web%20%2B%20Full%20Suite%20Passing-emerald)](#)
[![Invariants](https://img.shields.io/badge/Invariants-30%20Flagship%20Verified-blue)](#)
[![Arc Network](https://img.shields.io/badge/Arc%20Network-Chain%20ID%205042-purple)](#)
[![Execution Mode](https://img.shields.io/badge/Mode-Deterministic%20Simulation-amber)](#)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](#)

AgentPay decouples autonomous agent reasoning from financial authority. Agents can discover services, negotiate quotes, delegate work, and dynamically replan when workers fail. However, every financial action passes through an out-of-band, deterministic control plane: compiled Rust policy, composite risk scoring, atomic double-entry treasury locks, and calldata-bound execution ready for settlement on Arc.

---

## 1. System Architecture

```
                 AI / AGENTS  (Advisory Intelligence)
                      │
                      ▼
              AI PROVIDER LAYER  (Model Agnostic, Read-Only Tools)
                      │
                      ▼
              MISSION / FABRIC  (Task DAG Orchestrator)
                      │
                      ▼
        MARKETPLACE / PROTOCOL / A2A  (Discovery & Quoting)
                      │
                      ▼
             POLICY / CONSTITUTION  (Compiled Rust Core, Sub-10µs)
                      │
                      ▼
                 RISK ENGINE  (Off-LLM Exposure & Anomaly Scoring)
                      │
                      ▼
              APPROVAL ENGINE  (Deterministic Invariants & Quorum)
                      │
                      ▼
                 TREASURY  (Go Double-Entry Ledger, Atomic Locks)
                      │
                      ▼
             EXECUTION GATE  (Simulation vs. Live Switch)
                      │
                      ▼
                  SIGNER  (Calldata-Bound keccak256 Signatures)
                      │
                      ▼
               AGENTVAULT  (Solidity Escrow & Spending Caps)
                      │
                      ▼
                     ARC  (High-Throughput USDC L1 Settlement)
```

---

## 2. The Security Boundary

$$\text{AI CAN CHANGE THE PLAN. AGENTPAY CONTROLS THE MONEY.}$$

| Domain | Entity | Permitted Actions | Prohibited Actions |
| :--- | :--- | :--- | :--- |
| **Cognitive** | AI Agents & Swarms | Reason, decompose tasks, query marketplace, request quotes, propose plans, detect worker failure. | Hold private keys, sign transactions, modify policy, increase budget envelopes, self-authorize payments. |
| **Authority** | AgentPay Engine | Evaluate 7-tier constitutional rules, enforce velocity caps, reserve treasury balances, bind calldata. | Reason heuristically, ignore policy violations, permit unapproved recipient substitution. |
| **Consensus** | Arc Blockchain | Settle finalized USDC transfers, enforce on-chain timelocks, maintain irreversible state. | Execute unverified signatures, bypass contract spending limits. |

---

## 3. Flagship Demo: Autonomous Market Intelligence

The flagship demonstration executes a 22-step autonomous Market Intelligence Mission (`msn_market_intel_001`):
1. **Control Tower:** Real-time visibility into treasury liquidity, active policy guardrails, and Arc network consensus.
2. **Autonomous Swarm:** Research, Market Data, Analysis, and Critic agents coordinate to satisfy a high-level brief.
3. **Adversarial Block (HARD_DENY):** A malicious provider attempts an unapproved recipient substitution. The engine instantly aborts the payment with zero funds moved (`$0.00 USDC`).
4. **Autonomous Worker Recovery:** When a legitimate provider drops connection, the runtime isolates the failed worker, provisions an alternative provider from the marketplace, revalidates budget invariants, and completes the mission.
5. **Multilateral Clearing:** The clearinghouse nets gross counterparty claims, reducing on-chain settlement footprints.

---

## 4. Arc Integration & Verified Status

| Component | Status | Reality & Evidence |
| :--- | :--- | :--- |
| **Arc Mainnet RPC** | **CONNECTED** | Active at `https://rpc.mainnet.arc.io`, Chain ID `5042` (`0x13b2`), Block `#23,401,027+`. |
| **Native Arc USDC** | **VERIFIED** | Verified contract bytecode (3,598 bytes) at `0x3600000000000000000000000000000000000000`. |
| **AgentVault Contract** | **UNDEPLOYED ON MAINNET** | Compiled and 100% verified locally via Foundry (44/44 tests pass). Target address returns `0x` bytecode. |
| **Live Mainnet Settlement** | **SIMULATED (GATED)** | `ENABLE_LIVE_EXECUTION=false`. Exactly 0 transactions broadcast to mainnet. Exactly $0.00 moved. |
| **Cloud KMS Signing** | **UNVERIFIED (STUB)** | Enterprise KMS fails closed with `ErrKMSSignerUnavailable`. Local calldata-bound signing used for simulation. |

---

## 5. Repository Structure

```
├── apps/               # User-facing applications
│   └── web/            # Control Tower & Mission Command dashboard (Next.js 14, 80 routes)
├── services/           # Backend runtime engines
│   ├── gateway/        # High-throughput API gateway, event bus, and AI provider layer (Go)
│   ├── policy-engine/  # Sub-10µs deterministic constitutional policy engine (Rust)
│   ├── treasury/       # Double-entry ledger and atomic reservation service (Go)
│   └── ai-engine/      # Cognitive task planning, decomposition, and eval (Python)
├── contracts/          # Smart contract infrastructure
│   ├── src/            # AgentVault.sol, interfaces, and timelocked escrow (Solidity)
│   └── test/           # Invariant and property-based contract test suites (Foundry)
├── packages/           # Shared libraries and tooling
│   ├── cli/            # Operator and demo CLI binary (agentpay)
│   ├── shared/         # Zod schemas, state machines, and cryptographic utilities (TypeScript)
│   ├── policy/         # TypeScript bindings to Rust deterministic policy core
│   ├── agent-mesh/     # Multi-agent registry, capability matcher, and quote protocol
│   ├── sdk-typescript/ # Client SDK for TypeScript agent integrations
│   └── sdk-python/     # Client SDK for Python agent integrations
├── scripts/            # Build, test, deployment preflight, and integrity verifiers
└── docs/               # Engineering guides, specifications, runbooks, and submission package
    └── submission/     # Canonical hackathon evaluation package
```

---

## 6. Quickstart

### A. Run Flagship Demo (Deterministic Replay)
Requires Node.js 20+:
```bash
# Clone repository
git clone https://github.com/mahitss/Arc_micro.git
cd Arc_micro

# Build packages and run CLI replay
npm install
npm run build --workspace=packages/cli
node packages/cli/dist/src/index.js demo mission
```
Or start the web dashboard to inspect the interactive visual replay:
```bash
cd apps/web
npm install
npm run dev
# Open http://localhost:3000/missions/demo/replay
```

### B. Development Environment
Start local runtime services:
```bash
# 1. Start Rust Policy Core
cd services/policy-engine
cargo run --release  # Listens on http://localhost:8081

# 2. Start Go Gateway
cd ../gateway
go run cmd/server/main.go  # Listens on http://localhost:8080

# 3. Start Control Tower
cd ../../apps/web
npm run dev  # Listens on http://localhost:3000
```

### C. Live Operations (OPERATOR ACTION REQUIRED)
> [!CAUTION]
> Live settlement on Arc Mainnet requires explicit operator intervention, cold storage multi-sig deployment, and gas funding.

1. Review the mandatory operator runbook: [`docs/arc-mainnet-operator-runbook.md`](docs/arc-mainnet-operator-runbook.md).
2. Deploy `AgentVault.sol` to Arc Mainnet using Foundry and configure cold multi-sig governance.
3. Fund the relayer address with native Arc gas tokens and the vault with operational USDC.
4. Set `ENABLE_LIVE_EXECUTION=true` and provide verified contract coordinates in the production environment.

---

## 7. Machine-Checked Test Suite (Full Stack Verified)

Every commit is verified across multiple language environments with zero failures:
```bash
# Frontend Web Suite & Data Authority Audit (510 tests across 154 suites + 80 routes)
cd apps/web && npm test
npx tsc --noEmit && npm run build

# Go Gateway & 30 Flagship E2E Invariants (25+ packages)
cd services/gateway && go test -count=1 ./...

# TypeScript Client SDK (33 tests)
cd packages/sdk-typescript && npm run build; npm test

# Developer CLI (14 tests)
cd packages/cli && npm run build; npm test

# Python AI Engine SDK (26 tests)
cd packages/sdk-python && python -m pytest
```

---

## 8. Official Submission Package

For complete hackathon evaluation materials, visit [`docs/submission/`](docs/submission/):
- **Submission Form Answers:** [`docs/submission/final-form.md`](docs/submission/final-form.md)
- **60-Second Pitch:** [`docs/submission/60-second-pitch.md`](docs/submission/60-second-pitch.md)
- **Timed Demo Script:** [`docs/submission/demo-script.md`](docs/submission/demo-script.md)
- **Technical Architecture:** [`docs/submission/architecture.md`](docs/submission/architecture.md)
- **Security Model & Invariants:** [`docs/submission/security.md`](docs/submission/security.md)
- **Why Arc:** [`docs/submission/why-arc.md`](docs/submission/why-arc.md)
- **Judge FAQ (18 Questions):** [`docs/submission/judge-faq.md`](docs/submission/judge-faq.md)
- **Competitive Differentiation:** [`docs/submission/differentiation.md`](docs/submission/differentiation.md)
- **Verified Deployment Status:** [`docs/submission/deployment-status.md`](docs/submission/deployment-status.md)
- **Full Release Report:** [`docs/submission/final-release-report.md`](docs/submission/final-release-report.md)

---

## License

Apache-2.0. See [LICENSE](LICENSE) for details.
