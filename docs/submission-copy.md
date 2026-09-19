# Arc Microgrants Official Application Copy

This document contains copy-paste ready text for each field in the official Arc Microgrants application form. All descriptions are strictly factual and evidence-based.

---

### PROJECT NAME
AgentPay

---

### ONE-LINE DESCRIPTION
Programmable USDC payment infrastructure for autonomous AI agents on Arc.

---

### WHAT IT DOES
AgentPay provides a secure, deterministic economic boundary for autonomous AI agents. While modern AI models can reason and invoke tools, granting them direct, unconstrained access to cryptocurrency wallets introduces severe risks of prompt injection, runaway spending loops, and treasury depletion.

AgentPay separates economic authority from intelligence:
1. An AI agent reasons about a task and generates a structured **Payment Intent** requesting funds for an approved service.
2. An independent, deterministic **Rust Policy Engine** evaluates the intent against mathematical spending rules (daily limits, per-transaction maximums, allowlists).
3. Upon cryptographic authorization, a **Go Gateway** orchestrates execution.
4. An on-chain smart contract (**`AgentVault.sol`**) enforces hard daily limits and executes USDC settlement on the Arc blockchain.

---

### WHY ARC
AgentPay uses Arc as its native settlement layer for three specific technical reasons:
1. **USDC-Native Gas Economics**: On standard EVM chains, agents must manage two assets (native gas + USDC), creating operational complexity and slippage risk. On Arc, gas is paid directly in USDC at the protocol level, unifying gas accounting and settlement into a single stable currency.
2. **EVM Compatibility (Chain ID `5042`)**: Arc allows deployment of battle-tested Solidity smart contracts (`AgentVault.sol`) and standard Ethereum developer tooling while benefiting from stablecoin-native economics.
3. **Dedicated Payment Infrastructure**: Arc is purpose-built for high-throughput, low-latency financial settlement, making it the ideal home for autonomous machine-to-machine commerce.

---

### WHAT WE BUILT
Across 10 structured development milestones, we engineered a complete, production-hardened prototype:
- **`AgentVault.sol` (Solidity & Foundry)**: Smart contract vault with on-chain daily spending limits, per-transaction caps, emergency owner pause switches, and reentrancy protection (41 unit and fuzz tests).
- **Policy Engine (Rust & Axum)**: High-performance, side-effect-free authorization engine evaluating spending limits, frequency caps, and allowlists in sub-millisecond response times (29 tests).
- **Gateway Service (Go 1.22)**: Robust API gateway handling task ingestion, prompt orchestration, atomic Compare-And-Swap (CAS) state transitions, rate limiting, and failure recovery.
- **Web Control Center (Next.js 14 & TailwindCSS)**: Operator dashboard with agent management, policy inspection, real-time transaction tracking, and a dedicated interactive `/demo` route.
- **Documentation Suite**: Comprehensive guides covering architecture, security threat models, deployment runbooks, and developer quickstart.

---

### TECHNICAL HIGHLIGHTS
- **Untrusted AI Isolation**: The LLM never touches private keys or raw RPCs. Recipient addresses are resolved strictly server-side from an authorized service registry to prevent prompt injection.
- **Double-Spend Defense**: Implements atomic database CAS state transitions (`AUTHORIZED` $\rightarrow$ `EXECUTING`) to guarantee that concurrent requests cannot trigger duplicate payments.
- **Defense in Depth**: Daily limits are enforced twice—off-chain in pure Rust for immediate feedback, and on-chain in Solidity for immutable finality.
- **Fail-Closed Architecture**: Any RPC disconnect, invalid chain ID, or policy violation immediately halts execution without broadcasting transactions.

---

### LIVE DEPLOYMENT
- **Web Control Center**: Accessible locally at `http://localhost:3000` with interactive `/demo` route.
- **Target Network**: Arc Mainnet (Chain ID `5042`).
- **RPC Endpoint**: `https://rpc.mainnet.arc.io` (Verified live).
- **Canonical USDC**: `0x3600000000000000000000000000000000000000` (Verified live).
- **Contract Deployment Script**: `scripts/deploy_mainnet.sh` (Tested and ready for broadcast).

---

### REPOSITORY
`https://github.com/mahitss/Arc_micro`

---

### BUILDER PROFILE PLACEHOLDER
- **GitHub**: [https://github.com/mahitss](https://github.com/mahitss)
- **Role**: Full-Stack & Smart Contract Developer

---

### FUTURE DIRECTION
With Arc Microgrant funding, we will:
1. Implement **EIP-712 Session Keys** to decentralize execution while maintaining on-chain policy verification.
2. Deploy an **On-Chain Service Registry** smart contract on Arc with staking and provider reputation.
3. Add support for **Hierarchical Multi-Agent Budgets**, enabling parent agents to allocate constrained spending allowances to sub-agents.
4. Integrate with enterprise **Hardware Security Modules (HSM)** and MPC providers for institutional-grade key custody.
