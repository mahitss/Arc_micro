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

## 5. Repository & Project Links

- **Source Code Repository:** [https://github.com/mahitss/Arc_micro](https://github.com/mahitss/Arc_micro)
- **Builder Profile:** [https://github.com/mahitss](https://github.com/mahitss)
- **Arc Network Chain ID:** `5042`
- **Arc Explorer:** [https://explorer.arc.io](https://explorer.arc.io)
