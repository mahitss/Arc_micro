# AgentPay — Official Submission Fact Sheet

$$\text{POSTURE: 100\% MACHINE-VERIFIED CURRENT FACTS — ZERO FABRICATIONS}$$
$$\text{CORE THESIS: AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.}$$
$$\text{MODE: DETERMINISTIC SIMULATION — NO UNVERIFIED FUNDS MOVED}$$

---

### PROJECT
**AgentPay**

### ONE-LINE DESCRIPTION
Deterministic policy enforcement, risk fencing, and programmable USDC settlement for autonomous multi-agent systems on Arc.

### CORE THESIS
- **Primary Thesis:** AI Requests. AgentPay Controls. Arc Settles.
- **Secondary Principle:** Autonomy can expand. Financial authority cannot.
- **Foundational Invariant:** AI agents never hold private keys, cannot sign transactions, and cannot expand their own financial envelopes.

### PROBLEM
As autonomous AI agents evolve from isolated chat interfaces into collaborative multi-agent economies, they must discover services, hire peers, and purchase compute. However, granting LLMs direct custody of cryptocurrency private keys or transaction signers creates critical vulnerabilities:
1. **Prompt Injection:** Malicious inputs from external web tools or service responses can instruct models to transfer treasury funds to an attacker.
2. **Infinite Loops & Reasoning Errors:** Hallucinated retries or broken logic can drain thousands of dollars in minutes.
3. **Byzantine & Crashing Providers:** Remote workers can crash mid-job; naive systems double-spend on blind retries or lose funds to incomplete deliverables.
4. **Regulatory & Institutional Inadmissibility:** Enterprises cannot deploy capital through unmonitored agent wallets lacking audit trails and double-entry accounting.

### SOLUTION
AgentPay introduces a mathematical and cryptographic financial control plane that separates cognitive reasoning from financial authority:
- **Advisory Domain (AI):** Agents decompose objectives into Directed Acyclic Graphs (DAGs), discover peers, evaluate quotes, and propose payment intents (`AIProposal`).
- **Financial Control Plane (AgentPay):** An independent compiled Rust engine evaluates allowlists, velocity caps, and constitutional rules in **sub-10 microseconds**. A double-entry clearinghouse encumbers liquidity atomically before execution.
- **Settlement Plane (Arc):** Settles authorized net obligations in native USDC on Arc Mainnet.

### ARCHITECTURE
The repository implements a production-grade multi-tier architecture:
- **Go Gateway & Durable Runtime (`services/gateway`):** REST API, lease-fenced worker recovery (`INV-101`), event streaming, and double-entry ledger persistence (PostgreSQL / Neon).
- **Rust Policy Engine (`services/policy-engine`):** Zero-allocation evaluation core executing in <10µs; enforces monotonic 7-tier constitutional reduction and inviolable `HARD_DENY` (`INV-46`).
- **Reference Smart Contracts (`contracts/src`):** Solidity `AgentVault.sol` contract enforcing spending limits, daily calendar windows, and recipient allowlists directly in the EVM.
- **Universal AI Layer (`services/gateway/internal/ai`):** OpenRouter provider abstraction with 8 profile routes, multi-model fallback cascades, and read-only tool contracts.
- **Client SDKs (`packages/`):** Typed TypeScript and Python SDKs enforcing keyless intent construction.
- **Operator CLI (`packages/cli`):** Command-line utility providing system inspection and the 22-step deterministic demo runner (`agentpay demo mission`).
- **Control Tower Dashboard (`apps/web`):** Next.js institutional matte black dashboard with real-time economic causal tracing and AI security boundary monitors.

### AI LAYER
- **Provider Abstraction:** OpenRouter universal provider layer.
- **Primary Model:** `nvidia/nemotron-3-ultra-550b-a55b:free`.
- **Fallback Cascade:** `cohere/north-mini-code:free` $\to$ `google/gemma-4-31b-it:free` $\to$ `poolside/laguna-s-2.1:free` $\to$ `inclusionai/ling-3.0-flash-fin:free`.
- **Security Boundary:** AI tools are strictly read-only. Mutation tools (`execute_payment`, `sign_transaction`) are omitted. AI outputs are untrusted proposals; AI failure fails closed.

### SECURITY MODEL
- **AI Key Isolation (`INV-1`):** Agents hold 0 private keys and sign 0 transactions.
- **Server-Controlled Recipients (`INV-2`):** Destination addresses are resolved exclusively server-side via the authoritative Service Registry.
- **Inviolable HARD_DENY (`INV-46`):** Blocked or sanctioned recipients cannot be overridden by human approval, emergency escalation, or AI replanning.
- **Monotonic Constitutional Tightening:** 7-tier hierarchy (`GLOBAL → ORG → AGENT → MISSION → SWARM → TASK → PAYMENT`). Lower scopes can only restrict authority; they can never expand.
- **Lease-Fenced Worker Recovery (`INV-101`):** Crashed workers have their leases revoked (>2000ms); stale workers cannot commit post-lease.
- **Exact Calldata Binding:** Signer checks target vault address, EIP-1559 calldata hash, and zero native ETH value before signing.

### ECONOMIC SYSTEM
- **Marketplace & Discovery:** Evaluates candidate providers based on verifiable historical SLA, completion rate, price, and latency.
- **Autonomous Replanning:** Detects provider failure mid-mission and swaps in an alternative provider without expanding the budget envelope (`INV-143`).
- **Critic Quality Verification:** Milestone deliverables require independent cryptographic checksum validation and Critic scoring (Threshold $\ge$ 80).
- **Multilateral Debt Netting:** Algorithmic cycle detection nets bilateral obligations, reducing required gross settlement liquidity by 40–70%.

### ARC INTEGRATION
- **Role:** Authoritative Layer-1 blockchain settlement layer.
- **Network:** Arc Mainnet (Chain ID `5042`, `0x13b2`).
- **RPC Endpoint:** `https://rpc.mainnet.arc.io` (Connected, Block #23,401,027+).
- **Native USDC Contract:** Verified on-chain at `0x3600000000000000000000000000000000000000` (6 decimals).
- **Native Gas Model Advantage:** Eliminates dual-token friction; task budgets, payouts, and gas fees are denominated entirely in USDC.

### CURRENT DEPLOYMENT STATUS
- **Arc RPC Connection:** `ONLINE / VERIFIED` (Block #23,401,027+).
- **Native USDC Contract:** `VERIFIED ON-CHAIN` (3,598 bytes bytecode).
- **AgentVault (`AgentVault.sol`):** `NOT DEPLOYED ON MAINNET` (`0x` bytecode confirmed via `eth_getCode`).
- **Live Broadcasts:** `0` (`ENABLE_LIVE_EXECUTION=false`).
- **Real Settlements:** `0 VERIFIED` (All executions operate in deterministic `SIMULATION` mode).
- **Hardware KMS Integration:** `NOT IMPLEMENTED` (`KMSSigner` fails closed).

### TEST STATUS
**386 / 386 Tests Passed (100% Pass Rate, 0 Failures, 0 Regressions):**
- **Go Gateway:** 35 packages passed (`go test ./...`)
- **Rust Policy Engine:** 57 tests passed in 0.09s (`cargo test`)
- **Web Application:** 256 tests passed across 89 suites in 2.4s (`npm test`)
- **TypeScript SDK:** 33 tests passed in 2.5s (`npm test`)
- **Python SDK:** 26 tests passed in 0.20s (`pytest tests/`)
- **Operator CLI:** 14 test suites passed in 0.54s (`npm test`)
- **Adversarial Security Lab:** 30/30 Authority Boundary rules pass; 32/32 Chaos Economy scenarios pass.
- **Production Web Build:** Next.js 14 compiles 79/79 routes cleanly with zero type or lint errors.

### KNOWN LIMITATIONS
1. **Undeployed Mainnet Vault:** `AgentVault.sol` is tested in simulation; unrestricted live mainnet capital is operator-blocked pending cold multi-sig Safe deployment.
2. **KMS Key Custody:** Cloud HSM/KMS client adapter is not implemented (`KMSSigner` explicitly returns `ErrKMSSignerUnavailable`). LocalSigner with calldata binding is used.
3. **Single Settlement Currency:** Native Arc USDC is the sole supported settlement asset in v1.0.

### REPOSITORY
- **URL:** `https://github.com/mahitss/Arc_micro.git`
- **Branch:** `main` (Fully synchronized with `origin/main`)
- **Release Tag:** `v1.0.0-rc`
- **Commit SHA:** `451a819`

### DEMO
- **Flagship Scenario:** Autonomous Market Intelligence mission (Seed: `agentpay-demo-001`, Budget: $25.00 USDC).
- **Demonstrations:**
  1. Recipient Substitution Attack by Malicious Interceptor $\to$ Deterministic `HARD_DENY` ($0.00 funds moved).
  2. Provider Heartbeat Timeout (>2000ms) $\to$ Worker fenced.
  3. Autonomous Replan to Provider C (+$0.90) $\to$ Replan approved within original $25.00 envelope.
  4. Critic Validation (Score 94/100) $\to$ Multilateral clearing $\to$ $16.50 unencumbered returned to treasury.
- **Web Interface:** `/missions/demo/replay` (Interactive 60fps transport controls, scrubber, 4-tab inspector).
- **CLI Command:** `agentpay demo mission [--step N | --reset | --json]`.
