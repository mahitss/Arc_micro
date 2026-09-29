# AgentPay — Final Hackathon Submission Form

This document contains standardized, copy-paste ready responses for hackathon submission portals. All responses are derived strictly from verified repository facts.

---

### Project Name
AgentPay

### Tagline
AI requests. AgentPay controls. Arc settles.

### Problem
Autonomous AI agents are capable of reasoning, discovering services, negotiating, and delegating complex multi-agent workflows. However, granting autonomous agents unrestricted financial authority creates an intolerable corporate risk surface:
- **Prompt Injection:** Adversarial prompts or tainted web content can hijack agent reasoning and divert funds.
- **Runaway Loops & Retries:** Erroneous retry loops can deplete entire operational budgets in minutes.
- **Autonomous Sybil Exploitation:** Collusive machine counterparties can exploit unverified payment requests.
Existing wallet systems either force humans to click "Approve" on every micropayment (destroying autonomy) or give the AI raw private key access (destroying security).

### Solution
AgentPay is the programmable financial control plane for autonomous AI agents. It strictly decouples cognitive intelligence from financial authority.

Agents retain complete autonomy to discover services, negotiate quotes, delegate tasks to sub-agents, and dynamically replan when workers fail. However, every financial action must pass through an out-of-band, deterministic control plane:
- **Policy Enforcement:** Sub-10µs Rust policy engine evaluating 7-tier constitutional rules.
- **Risk Assessment:** Off-LLM counterparty scoring, velocity caps, and anomaly detection.
- **Treasury Management:** Atomic double-entry balance reservations preventing double-spending.
- **Settlement:** Deterministic calldata-bound execution ready for settlement on Arc.

### Innovation
AgentPay introduces three foundational innovations:
1. **The Intelligence / Authority Decoupling:** Cognitive reasoning proposes; compiled deterministic rules decide. AI never touches private keys or changes financial policy.
2. **Autonomous Replanning with Invariant Bounds:** When an external worker fails, the AI dynamically selects an alternative provider from the marketplace while AgentPay re-evaluates the entire envelope against constitutional spending invariants.
3. **Multilateral Machine Netting:** A double-entry clearinghouse computes cyclic debt netting across multi-agent swarms, compressing gross bilateral claims before settlement.

### Technical Architecture
The AgentPay architecture enforces a unidirectional authority flow:
```
AI / Agents (Advisory Intelligence)
    │
    ▼
AI Provider Layer (Universal model abstraction, read-only tools)
    │
    ▼
Mission / Fabric (Task DAG orchestrator, lifecycle state machine)
    │
    ▼
Marketplace / Protocol / A2A (Service discovery, quote bidding)
    │
    ▼
Policy / Constitution (Compiled Rust engine, sub-10µs invariant evaluation)
    │
    ▼
Risk Engine (Composite risk scoring, anomaly detection)
    │
    ▼
Approval Engine (Deterministic policy gate, human quorum tiering)
    │
    ▼
Treasury (Go double-entry ledger, atomic encumbrance locks)
    │
    ▼
Execution Gate (Preflight validation, simulation vs live switch)
    │
    ▼
Signer (Calldata-bound signature generation)
    │
    ▼
AgentVault (Solidity smart contract escrow on Arc)
    │
    ▼
Arc (High-throughput, deterministic USDC settlement layer)
```

### AI Architecture
- **Cognitive Boundary:** AI components (Python/TypeScript) are strictly advisory. The AI can reason about task decomposition, provider selection, and error recovery, but possesses zero financial authority.
- **Model Agnostic:** Integrates via OpenRouter and native provider clients (Anthropic Claude 3.5, OpenAI GPT-4o) with fallback routing.
- **Tool Sandbox:** AI interacts only with read-only query tools (`searchMarketplace`, `requestQuote`, `proposePlan`). Financial tools (`authorizePayment`, `withdrawVault`) do not exist in the AI's tool manifest.

### Security Architecture
- **Invariants:** 12 core mathematical invariants (`INV-1` through `INV-12`) enforced across Rust and Solidity.
- **Zero Key Access:** Agents, swarms, and LLMs never hold, view, or sign with private keys.
- **Calldata Binding:** Signatures commit deterministically to the exact target recipient, amount, nonce, and deadline (`keccak256(calldata)`).
- **Hard Deny Guarantee:** Rejections (e.g. attempted recipient swap, budget overrun) immediately abort execution with zero funds moved (`$0.00 USDC`).
- **Fail-Closed Design:** Any unparseable response, missing field, or worker crash defaults to a hard freeze.

### Why Arc
Arc serves as the natural financial settlement foundation for AgentPay:
- **USDC-Native Economy:** Single-token denomination for both business capital and gas fees eliminates token volatility risk.
- **Deterministic Throughput:** Sub-second block finality aligns with high-frequency machine-to-machine micropayments.
- **Predictable Cost Model:** Machine agents can forecast exact execution costs without volatile gas spikes.
- **Truthful Status:** Arc Mainnet RPC (`https://rpc.mainnet.arc.io`, Chain ID `5042`) and native USDC (`0x3600...0000`) are verified. The AgentVault contract is compiled and locally tested; live broadcasting remains operator-gated in simulation mode.

### What is Autonomous
- **Task Decomposition:** Translating high-level natural language user objectives into executable multi-step DAGs.
- **Service Discovery & Negotiation:** Querying the agent marketplace and obtaining quotes from candidate worker agents.
- **Replanning on Failure:** Detecting worker timeout or malformed output, isolating the failed agent, and autonomously provisioning an alternative provider without human intervention.
- **Clearing & Netting:** Computing bilateral and multilateral debt offset cycles across completed agent tasks.

### What is Deterministic
- **Policy Evaluation:** 100% deterministic Rust rule engine. Given the same inputs, the decision (`ALLOW`, `WARN`, `HARD_DENY`) is bit-for-bit identical.
- **Budget & Velocity Accounting:** Mathematical subtraction and window aggregation; zero probabilistic reasoning.
- **Treasury Ledger:** Strict double-entry accounting with atomic debit/credit balance conservation.
- **Cryptographic Signing:** EIP-712 / calldata-bound signatures derived strictly from approved parameters.
- **Smart Contract Execution:** Solidity bytecode enforcing timelocks, single-use nonces, and owner-gated execution.

### Demo Description
The flagship demo showcases the autonomous execution of a 22-step Market Intelligence Mission (`msn_market_intel_01`):
1. **Control Tower:** Overview of operational state, healthy treasury, and active policy guardrails.
2. **Mission Launch:** Multi-agent swarm (Research, Market Data, Analysis, Critic) collaborates to fulfill a strategic brief.
3. **Adversarial Attack Denial:** A rogue provider attempts a recipient substitution attack. AgentPay instantly issues a `HARD_DENY`, demonstrating that funds moved equals `$0.00`.
4. **Autonomous Worker Recovery:** When a legitimate worker fails mid-mission, the orchestrator autonomously provisions a backup provider, re-validates the budget envelope, and successfully completes the brief.
5. **Clearinghouse & Settlement:** Displays gross bilateral obligations compressed into netted clearing proposals.

### Current Deployment Status
- **Deterministic Control Plane:** VERIFIED (386/386 machine-checked tests pass).
- **Web UI & CLI Replay:** VERIFIED (79 Next.js routes compile, 22-step CLI demo verified).
- **Arc RPC Connectivity:** VERIFIED (Connected to `https://rpc.mainnet.arc.io`, Chain ID 5042, Block #23.4M+).
- **Native USDC Contract:** VERIFIED on Arc Mainnet at `0x3600000000000000000000000000000000000000`.
- **Mainnet AgentVault:** UNVERIFIED / UNDEPLOYED (returns `0x` bytecode; tested locally in Foundry).
- **Live Settlement:** SIMULATED (gated by `ENABLE_LIVE_EXECUTION=false`, 0 real funds moved).

### Repository
`https://github.com/mahitss/Arc_micro`

### Demo URL
[Operator / Host URL Placeholder: e.g. http://localhost:3000 or hosted deployment URL]

### Team / Builder Information
[Builder Name / GitHub Handle / Contact Placeholder]
