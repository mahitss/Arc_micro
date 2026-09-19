# AgentPay: Known Limitations & Prototype Assumptions

> **Notice**: AgentPay is an experimental prototype built for the Arc Microgrants program. It is designed to demonstrate programmable, deterministic micro-payments for autonomous AI agents. It is **NOT** audited and **NOT** production-ready.

---

## 1. Smart Contract Architecture
- **Unaudited Smart Contracts**: `AgentVault.sol` has been tested extensively with Foundry unit and fuzz suites, but has not undergone a formal third-party security audit.
- **Centralized Executor**: In this prototype, `AgentVault.executePayment` is callable only by the contract `owner` (the Go Gateway executor key). Production architectures should explore multi-signature schemes (e.g. Safe), MPC (Multi-Party Computation), or EIP-712 session keys with on-chain policy verification.
- **Single Token Constraint**: The current vault implementation is tailored exclusively to USDC (`6 decimals`). Multi-token or native gas handling in vaults is out of scope.

---

## 2. Authorization & Identity
- **Operator Authentication**: The current prototype isolates privileged administrative operations (policy updates, withdrawals, service registry edits) behind an architectural boundary. Production deployments require enterprise-grade RBAC, API key rotation, or mTLS.
- **AI Agent Identity**: Agents are identified by string IDs (`agent_id`). Future iterations should bind agents to cryptographic keypairs or decentralized identifiers (DIDs).

---

## 3. Service Registry
- **Curated Server-Side Registry**: The service registry is maintained in-process and via PostgreSQL. While this prevents prompt injection and recipient spoofing, it represents a centralized catalog. A production decentralized system could leverage an on-chain registry with staking and reputation.

---

## 4. Infrastructure & Scaling
- **In-Process Rate Limiting**: The gateway includes an in-memory token-bucket rate limiter suitable for single-instance deployments. Horizontal scaling across multiple gateway nodes would require distributed rate limiting (e.g. Redis).
- **PostgreSQL vs. Memory Storage**: The gateway defaults to an in-memory store for lightweight local development and supports PostgreSQL for persistence. Distributed coordination across multiple instances requires PostgreSQL row locking or distributed locks.
- **RPC Single Point of Failure**: The gateway connects to a single primary Arc RPC endpoint (`https://rpc.mainnet.arc.io`). Production infrastructure should employ failover RPC pools with automatic circuit breakers.

---

## 5. Transaction Confirmation & Re-Org Risks
- **Finality Assumptions**: The execution service waits for transaction receipt confirmation (`status == 1`) with a configurable timeout. Deep blockchain reorganizations are not explicitly guarded against beyond standard EVM confirmation blocks.
- **Gas Strategy**: Gas fee estimation uses `SuggestGasTipCap` with a conservative fallback. Extreme network congestion could require dynamic gas repricing (EIP-1559 speedup/cancel transactions).

---

## 6. AI Model Integration
- **Model Non-Determinism**: While the gateway and Rust policy engine are 100% deterministic, LLM outputs are inherently probabilistic. Malformed outputs or unhelpful intents are safely rejected, but may require task retries.
- **Prompt Size Bounds**: Agent tasks are strictly capped at 4,096 bytes to prevent denial-of-service and context-window exhaustion.
