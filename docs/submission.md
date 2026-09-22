# AgentPay: Arc Microgrant Submission Package

## 1. Project Overview

### Project Name
**AgentPay**

### One-Line Description
> Programmable financial infrastructure for autonomous AI agents, with deterministic policy controls and USDC settlement on Arc.

### Short Description
Autonomous AI agents are increasingly capable of reasoning, planning, and executing complex software workflows, but giving them direct access to crypto private keys presents catastrophic financial risk. A single hallucination, software bug, or adversarial prompt injection can instantly drain a funded wallet.

**AgentPay solves this by decoupling agent reasoning from financial settlement:**
- **Zero Key Custody:** AI agents never hold private keys or sign transactions.
- **Deterministic Policy Controls:** Every payment request is evaluated by an ultra-fast Rust policy engine enforcing integer limits on per-transaction amounts, daily velocity, daily spend, and recipient allowlists/blocklists.
- **Explainable Risk Scoring:** Computes risk levels without LLM nondeterminism.
- **Human-in-the-Loop Approvals:** High-value or anomalous transactions automatically pause for out-of-band operator approval.
- **Treasury Protection:** Synchronized liquidity reservations prevent over-spending and double-spending.
- **Native Arc Settlement:** Confirmed payments execute via non-custodial smart contracts (`AgentVault.sol`) and settle in native USDC on Arc.
- **Comprehensive Auditability:** Every lifecycle step produces immutable append-only audit logs and HMAC-signed webhooks.

---

## 2. Technical Description & Architecture Stack

AgentPay is engineered as a high-reliability, modular financial control plane:

- **Smart Contracts (`contracts/`):** Solidity 0.8.24 `AgentVault.sol` enforcing on-chain spending limits, daily budget resets at UTC midnight, recipient allowlists/blocklists, owner pauses, and withdrawals. Tested with Foundry across 42 test cases and 256 fuzz runs.
- **Policy Engine (`services/policy-engine/`):** High-performance Rust microservice built on Axum and Tokio. Evaluates spending limits in sub-millisecond time using integer arithmetic (zero floating-point money). 49 test cases passing.
- **API Gateway (`services/gateway/`):** Go 1.22+ control plane orchestrating authentication (hashed API keys), tenant isolation (anti-IDOR), payment intent state machines, treasury balance reservations, and pre-execution safety gates.
- **Settlement Executor (`services/gateway/internal/execution/`):** Go blockchain execution service wrapping `go-ethereum`. Manages nonces, transaction broadcasts, and ambiguous transaction reconciliation upon RPC timeouts.
- **Web Control Center (`apps/web/`):** Next.js 14, React 18, and Tailwind CSS operator dashboard for inspecting agent budgets, approving pending intents, viewing live Arc transactions, and configuring webhooks.
- **Developer SDKs (`packages/`):** Fully typed TypeScript (`@agentpay/sdk`) and Python (`agentpay`) SDKs for seamless integration into LangChain, AutoGen, CrewAI, and custom agent runtimes.

---

## 3. Arc Usage & Settlement Role

Arc serves as the **authoritative on-chain settlement anchor** for AgentPay:
1. **USDC-Native Settlement:** Settles agent microtransactions in native USDC (`0x3600000000000000000000000000000000000000`) on Arc Mainnet (Chain ID `5042`).
2. **On-Chain Policy Guardrails:** `AgentVault.sol` deployed on Arc provides cryptographic guarantee that even a compromised server cannot execute payments exceeding smart contract ceilings.
3. **Verifiable Auditability:** Transactions emit `PaymentExecuted` events on Arc, queryable directly on Arc Explorer (`https://explorer.arc.io`).
4. **Microtransaction Economics:** Arc's low fee structure enables sub-dollar agent transactions (e.g. $0.002 for an API query) to settle profitably without fee erosion.

---

## 4. Hero Demonstration: Autonomous Research Agent

AgentPay demonstrates end-to-end economic agency via the **Autonomous Research Agent** flow:
1. **Agent Task:** Operator requests a market research report.
2. **Discovery & Quote:** The agent discovers the pre-registered `Web Research & Intelligence API`, retrieves a 15-minute price quote of $0.18 USDC, and generates a structured payment intent.
3. **Policy Evaluation:** The Gateway invokes the Rust Policy Engine: limits are verified, risk is scored as `LOW`, and intent is authorized.
4. **Treasury Reservation:** $0.18 USDC is reserved from vault liquidity.
5. **Arc Settlement:** The Gateway signs and broadcasts the transfer to Arc (`AgentVault.executePayment`).
6. **Verification & Audit:** Receipt confirmation triggers an immutable audit log, delivers an HMAC-signed webhook, and returns the paid API data to the agent.
7. **Task Completion:** The agent synthesizes the research data and delivers the final report.

---

## 6. Core Evaluation Answers

### What is AgentPay?
AgentPay is programmable financial infrastructure for autonomous AI agents. It provides a deterministic, zero-trust control plane that allows AI agents to purchase resources (compute, datasets, APIs, storage) within strictly enforced budget boundaries, without ever giving the AI agent custody of blockchain private keys.

### Why does Arc matter?
Arc provides native, high-throughput, low-fee USDC settlement (Chain ID `5042`, native USDC `0x3600000000000000000000000000000000000000`). Autonomous AI agents transact in high-frequency, sub-dollar microtransactions (e.g., $0.005 for a single prompt query or $0.18 for a dataset lookup). Arc's predictable finality and minimal gas overhead enable agent micro-payments to settle on-chain without fee erosion. Furthermore, Arc smart contracts (`AgentVault.sol`) provide a trust-minimized, non-custodial anchor that enforces velocity and spending ceilings independently of server infrastructure.

### What is actually live?
- **Arc Mainnet Network & RPC:** Verified live on Chain ID `5042` via `https://rpc.mainnet.arc.io` (current block `22,185,584+`).
- **Arc Native USDC:** Contract code verified at `0x3600000000000000000000000000000000000000` (length 3,598 bytes).
- **Core Platform:** Rust Policy Engine (57 passing tests), Go Gateway & Treasury Controller (20 passing packages), Adversarial Security Lab (10/10 attacks defended), Next.js 14 Control Center (19 compiled routes), TypeScript SDK, Python SDK, and CLI.
- **On-Chain Settlement State:** `AgentVault.sol` is compiled and verified with 42 Foundry tests, but has not yet been broadcast to Arc Mainnet. `ENABLE_LIVE_EXECUTION=false` prevents unverified broadcasts.

### How does AgentPay control AI spending?
AgentPay implements a 5-stage deterministic defense pipeline:
1. **Zero Key Custody:** The agent receives only an unprivileged API token; it has no access to private keys or signing capabilities.
2. **Deterministic Rust Policy Engine:** Integer-only arithmetic validates per-transaction ceilings, daily velocity, daily spend, and recipient allowlists in sub-millisecond time without LLM nondeterminism.
3. **Registry Recipient Binding:** The destination address is resolved server-side from a verified service registry. Agents cannot redirect funds to arbitrary addresses even if prompt-injected.
4. **Synchronized Treasury Reserves:** Atomic mutex reservations guarantee that an agent cannot exceed allocated liquidity through concurrent requests.
5. **On-Chain Smart Contract Ceilings:** If live execution is enabled, `AgentVault.sol` enforces hard daily and per-transaction limits at the EVM level.

### What security boundary exists?
AgentPay treats the AI agent as completely untrusted DATA.
- The AI agent sits outside the trust boundary.
- The Gateway validates all inputs against strict JSON schemas (1MB limit).
- The Policy Engine independently scores risk and rejects unauthorized parameters.
- High-risk or over-threshold payments are routed to a human operator approval queue.
- Transactions are signed inside an isolated relayer service (`LocalSigner` with strict recipient and amount binding).
- Emergency kill switches exist at four granular levels (System, Organization, Agent, and On-Chain Vault Pause).

### What real transaction proves it?
- **Current Status:** Real Arc Mainnet settlement is documented as **`NOT VERIFIED`** (`PARTIAL` at network level).
- **Zero Fabrication Guarantee:** No mock hashes or synthetic blocks are claimed as live settlement.
- **Operator Runbook:** The complete script, gas requirement (5.0 ARC), microtransaction amount (0.01 USDC / 10,000 base units), and verification commands are codified in `docs/mainnet-operations-runbook.md` and `docs/arc-mainnet-evidence.md`, ready for operator execution.

---

## 7. Repository & Project Links

- **Source Code Repository:** [https://github.com/mahitss/Arc_micro](https://github.com/mahitss/Arc_micro)
- **Builder Profile:** [https://github.com/mahitss](https://github.com/mahitss)
- **Arc Network Chain ID:** `5042`
- **Arc Explorer:** [https://explorer.arc.io](https://explorer.arc.io)

