# AgentPay: Product Truth Specification

This document provides a factual description of AgentPay based strictly on the authoritative codebase.

---

### 1. WHAT IS AGENTPAY?
AgentPay is a programmable, off-chain/on-chain financial control plane that arbitrates, constrains, and executes payments requested by autonomous AI agents, with native USDC settlement on the Arc blockchain.

---

### 2. WHAT PROBLEM DOES IT SOLVE?
Autonomous AI agents can formulate multi-step plans and invoke tools, but they cannot safely hold private keys or make autonomous financial decisions from unrestricted crypto wallets. Giving an LLM access to a funded wallet creates severe risk:
- **Adversarial Prompt Injection:** Web scraping or third-party API outputs can instruct the agent to transfer funds to an attacker's address.
- **Hallucinations & Tool Loops:** An agent caught in an automated retry loop can rapidly drain a treasury.
- **Regulatory & Organizational Non-Compliance:** Unchecked corporate spending violates accounting controls and budget caps.

AgentPay decouples **agent reasoning** from **financial settlement**: the agent requests structured payment intents; AgentPay validates policies off-chain and executes payments non-custodially on-chain.

---

### 3. WHO IS THE USER?
1. **AI Agent Developers & Operators:** Software engineers building autonomous agents with frameworks such as LangChain, AutoGen, CrewAI, or custom LLM loops who need their agents to pay for data, compute, or API services safely.
2. **Organization Administrators:** Financial officers and engineering managers who define spending limits, daily budgets, recipient allowlists/blocklists, and approve high-value payments.
3. **Autonomous AI Agents (Actors):** Software agents interacting programmatically via SDKs or HTTP APIs as untrusted requestors.

---

### 4. WHAT DOES THE AGENT CONTROL?
- The agent controls **when** to request a payment.
- The agent chooses **which pre-registered service** it wishes to consume (`service_id`).
- The agent specifies the **amount** (within the service's allowable maximum price).
- The agent provides an **operational justification** and task metadata.

---

### 5. WHAT DOES THE AGENT NOT CONTROL?
- The agent **NEVER controls a private key** or transaction signing credential.
- The agent **NEVER chooses an arbitrary recipient address**; recipient addresses are resolved strictly server-side by AgentPay from the verified Service Registry.
- The agent **NEVER specifies arbitrary transaction calldata**.
- The agent **CANNOT modify spending policies**, limits, or velocity rules.
- The agent **CANNOT approve its own payment intents**.
- The agent **CANNOT bypass policy denials**, risk checks, or emergency pauses.

---

### 6. WHAT DOES AGENTPAY CONTROL?
- **Authentication & Tenant Isolation:** Verifies hashed API keys and isolates data across organizations.
- **Service Verification:** Resolves pre-vetted destination addresses and validates price ceilings.
- **Policy Enforcement:** Off-chain, sub-millisecond evaluation of spending limits, velocity, and allowlists.
- **Risk Scoring:** Deterministic calculation of transaction risk levels.
- **Approval Lifecycle:** Routing payments exceeding thresholds to human operators.
- **Treasury Accounting:** Atomic off-chain fund reservations against on-chain vault balances.
- **Execution Gate:** 10-point pre-flight checklist before transaction signing.
- **Blockchain Execution:** Nonce management, calldata encoding, signing, and broadcasting to Arc.
- **Ambiguity & Failure Handling:** Marking unconfirmed transactions as `AMBIGUOUS` and reconciling on-chain receipts upon recovery.
- **Audit & Egress:** Immutable event logging and HMAC-signed webhook dispatching.

---

### 7. WHERE DOES POLICY RUN?
Policy runs in the **Rust Policy Engine** (`services/policy-engine`), an isolated microservice communicating over HTTP with the Gateway. It performs pure integer arithmetic (no floating-point money) with zero network calls during evaluation.

---

### 8. WHERE DOES RISK RUN?
Risk runs inside the **Rust Policy Engine** (`services/policy-engine/src/engine/risk.rs`). It deterministically computes a bounded risk score (0–100) based on amount relative to transaction limits, daily velocity, asset type, and recipient status, categorizing the intent into `LOW`, `MEDIUM`, or `HIGH` risk.

---

### 9. WHERE DOES APPROVAL RUN?
Approval runs in the **Go API Gateway** (`services/gateway/internal/service/domain_service.go`). It persists approval records in PostgreSQL, checks for expiration TTLs, ensures conflict-free state transitions, blocks agent self-approval, and enforces the invariant that a hard policy `DENY` can never be overridden by human approval.

---

### 10. WHERE IS TREASURY ACCOUNTING?
Treasury accounting runs in the **Go Gateway Treasury Service** (`services/gateway/internal/treasury/service.go`). It tracks authoritative on-chain balance, active reserved amounts, and available balance. An in-memory mutex serializes concurrent requests, preventing double-reservations.

---

### 11. WHERE DOES THE ACTUAL PAYMENT EXECUTE?
The payment executes on-chain within the **`AgentVault.sol` smart contract** on Arc (`contracts/src/AgentVault.sol`). The Gateway Blockchain Executor signs and broadcasts an `executePayment(address recipient, uint256 amount, string purpose)` transaction, transferring USDC from the vault to the recipient.

---

### 12. WHERE DOES ARC ENTER THE SYSTEM?
Arc enters at the **settlement and custody layer**:
- `AgentVault.sol` is deployed on the **Arc Network (Chain ID: 5042)**.
- Funds are deposited and held in **native Arc USDC (`0x3600000000000000000000000000000000000000`)**.
- The Gateway connects to Arc JSON-RPC at `https://rpc.mainnet.arc.io`.
- Settlements emit on-chain events and produce receipts queryable on Arc Explorer.

---

### 13. HOW IS THE TRANSACTION VERIFIED?
The Gateway queries Arc via `eth_getTransactionReceipt`:
- Verifies block number, status code (`status == 1`), gas consumed, and transaction hash.
- Checks for the on-chain `PaymentExecuted` event.
- If the RPC times out, the transaction transitions to `AMBIGUOUS` and is later reconciled by `ReconcileTransaction`, ensuring no payment is prematurely marked failed or re-submitted.

---

### 14. HOW IS THE PAYMENT AUDITED?
1. **Application Level:** Append-only records in PostgreSQL `audit_events` table capturing actor, action, timestamp, and request correlation IDs (`req_id`).
2. **On-Chain Level:** Immutable `PaymentExecuted` events emitted by `AgentVault` on Arc.
3. **Webhook Egress:** Cryptographically signed HMAC-SHA256 payloads dispatched to external endpoints with delivery status logs.

---

### 15. HOW DOES A DEVELOPER INTEGRATE?
Developers integrate via the **TypeScript SDK** (`@agentpay/sdk`), **Python SDK** (`agentpay`), **Go CLI**, or directly through the **REST API**:
```typescript
import { AgentPay } from '@agentpay/sdk';

const agentpay = new AgentPay({ apiKey: process.env.AGENTPAY_API_KEY });
const intent = await agentpay.paymentIntents.create({
  service: 'web-research',
  amount: '180000', // 0.18 USDC
  asset: 'USDC',
  purpose: 'Real-time research'
});
```
The developer never handles private keys or transaction signing logic in agent application code.
