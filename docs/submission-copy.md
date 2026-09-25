# AgentPay — Official Submission Copy

---

### PROJECT NAME
AgentPay

---

### TAGLINE
The Financial Control Plane for Autonomous AI Agents

---

### ONE-LINE DESCRIPTION
Deterministic policy enforcement, risk fencing, and programmable USDC settlement for autonomous multi-agent systems on Arc.

---

### PROBLEM
As autonomous AI agents evolve from isolated chat assistants to collaborative multi-agent swarms, they need to purchase compute, APIs, datasets, and specialized intelligence from peer agents. However, providing autonomous LLMs with unconstrained cryptocurrency wallets or API credit cards introduces fatal economic vulnerabilities:
1. **Prompt Injection & Hijacking:** Malicious inputs can trick models into transferring treasury funds to arbitrary external addresses.
2. **Runaway Loops & Cost Explosion:** Recursive task delegation or bugged retry loops can drain thousands of dollars in minutes without bounds.
3. **Byzantine & Failing Counterparties:** If an agent hires a remote provider that crashes or returns corrupt data, naive systems either lose funds to unverified deliverables or double-spend on blind retries.
4. **Key Exfiltration:** Storing private keys in agent process memory or environment variables creates an immediate target for memory inspection and jailbreaks.

Enterprises cannot deploy autonomous agent swarms without strict financial guardrails.

---

### SOLUTION
AgentPay decouples intelligence from financial authority. The core product principle is:
**AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.**
*(Autonomy can expand. Financial authority cannot.)*

When an AI agent needs to perform paid work:
1. **Intent Generation (Keyless):** The agent produces a structured, typed intent rather than a signed transaction. The agent holds zero private keys.
2. **Deterministic Pre-Flight & Digital Twin:** Monte Carlo risk simulation evaluates worst-case financial exposure and task DAG feasibility before committing capital.
3. **Sub-Microsecond Policy Gate:** An independent, compiled Rust Policy Engine evaluates constitutional rules (daily allowances, transaction ceilings, recipient allowlists) in under 10 microseconds.
4. **Autonomous Treasury Encumbrance:** Double-entry journal reservations lock funds atomically, preventing cross-agent race conditions and unreserved spending.
5. **Execution Gate & Lease Fencing:** Payments are issued against bilateral contracts with milestone SHA-256 deliverable verification. If a provider fails, the execution lease is fenced, blind retries are prohibited, and the planner replaces the provider within the locked budget envelope.
6. **Arc Layer-1 Settlement:** Validated milestone payouts settle on the Arc blockchain in native USDC.

---

### HOW ARC IS USED
AgentPay leverages the Arc Layer-1 blockchain (Chain ID `5042`) as its authoritative settlement layer:
1. **Native USDC Gas Model:** On standard EVM chains, autonomous agents must hold both native gas tokens (e.g. ETH) and stablecoins (e.g. USDC), creating inventory imbalance, rebalancing overhead, and gas price volatility. Arc protocol-level native USDC gas enables single-token economic accounting where task budgets, gas fees, and payouts are denominated in USDC.
2. **Low-Latency Finality for Micro-Transactions:** Sub-second block times allow sub-agents to settle high-frequency micro-payments upon deliverable validation without stalling execution DAGs.
3. **Deterministic Smart Contract Anchors:** `AgentVault.sol` enforces immutable on-chain spending limits, emergency multi-sig circuit breakers, and programmatic settlement directly on Arc.

---

### TECH STACK
- **Policy Engine:** Rust 1.80 (Axum, Tokio, zero-allocation constitutional rule evaluation, sub-10µs latency).
- **Core Orchestrator & Gateway:** Go 1.22 (Gin, atomic Compare-And-Swap state machines, double-entry ledger, lease fencing).
- **Smart Contracts:** Solidity 0.8.24 (Foundry framework, EIP-712 typed intents, reentrancy guards, OpenZeppelin primitives).
- **Control Tower & Web Interface:** Next.js 14 (React, TypeScript, TailwindCSS, Server-Sent Events, real-time telemetry).
- **Developer Tooling:** TypeScript SDK (`@agentpay/sdk-typescript`), Python SDK (`agentpay-sdk-python`), and CLI (`@agentpay/cli`).
- **Settlement Network:** Arc Mainnet (EVM Chain ID `5042`, RPC `https://rpc.mainnet.arc.io`, Native USDC `0x3600000000000000000000000000000000000000`).

---

### SECURITY MODEL
AgentPay operates under a zero-trust financial architecture:
- **Key Isolation (INV-141):** Autonomous agents generate intent requests only; they never hold, see, or touch private keys or seeds.
- **Envelope Immutability (INV-148):** Replanners and autonomous sub-agents cannot expand an approved mission budget envelope.
- **Fail-Closed Policy (POL-003):** If any policy check is ambiguous or fails, the engine defaults to a hard `DENY`.
- **Lease Fencing (INV-101 / INV-103):** Stalled or unresponsive providers have their authorization tokens revoked immediately. Blind automatic retries are mathematically prohibited to prevent double-spending.
- **Arbitrary Calldata Filtering (GATE-001):** Execution Gate strictly rejects raw unparsed EVM bytecode. Only EIP-712 structured payloads are signable.
- **Idempotency & Replay Defense (INV-13):** Cryptographic nonces and idempotency keys ensure no transaction can be replayed by rogue nodes or network relayers.

---

### WHAT IS LIVE
- **Arc Mainnet RPC Connectivity:** Live HTTP JSON-RPC 2.0 communication with `https://rpc.mainnet.arc.io` (Chain ID `5042`) verifying network liveliness, block height tracking, and gas estimation.
- **Native USDC Verification:** Cryptographic verification of Arc canonical Native USDC contract address `0x3600000000000000000000000000000000000000`.
- **Full-Stack Autonomous Runtime:** Live Rust Policy Engine (port 8081), Go Gateway (port 8080), and Next.js Web Control Tower (port 3000) actively processing deterministic missions and adversarial security attacks.
- **Automated Test Matrix:** 817/817 passing unit, integration, invariant, and fuzz tests across Rust, Go, Foundry, TypeScript, Python, and CLI suites.

---

### WHAT IS SIMULATED
- **Mission Execution & Treasury Balance:** The flagship $25.00 USDC Autonomous Market Intelligence mission operates within our deterministic simulation environment backed by a simulated $100.00 USDC treasury.
- **Settlement Broadcast Barrier (INV-156):** Live transaction broadcast to the Arc network is operator-gated (`ENABLE_LIVE_EXECUTION=false`). Zero real mainnet funds are moved during demonstrations.
- **Provider Delays & Failures:** Worker heartbeats, timeouts, and fallback agent transitions are deterministically orchestrated for reproducible demonstrations.

---

### CURRENT MAINNET STATUS
- **Arc Network:** CONNECTED (Chain ID `5042`).
- **RPC Status:** HEALTHY / VERIFIED (`https://rpc.mainnet.arc.io`).
- **Native USDC Contract:** VERIFIED (`0x3600000000000000000000000000000000000000`).
- **AgentVault Contract:** NOT DEPLOYED (Mainnet bytecode is `0x`; pre-deployment candidate address configured for audit verification).
- **Live Execution:** DISABLED (`ENABLE_LIVE_EXECUTION=false`).
- **Real Settlements:** 0 VERIFIED.
- **Production Broadcasts:** 0.

---

### FUTURE ROADMAP
1. **Production Multi-Sig Deployment:** Deploy audited `AgentVault.sol` onto Arc Mainnet using institutional multi-sig governance.
2. **ERC-4337 / EIP-712 Session Account Abstraction:** Enable ephemeral, policy-constrained session keys anchored directly in Arc smart contracts.
3. **Decentralized Agent Service Directory:** Transition off-chain agent discovery into an on-chain staking and slashing registry on Arc.
4. **Cross-Chain Clearing & Netting:** Extend bilateral netting and clearinghouse protocols to support high-volume, multi-agent settlement batches on Arc.
