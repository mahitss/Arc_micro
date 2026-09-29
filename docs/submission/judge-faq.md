# AgentPay — Technical Judge & Reviewer FAQ (Submission Reference)

$$\text{POSTURE: 100\% FACTUAL, EVIDENCE-BACKED DEFENSE}$$

---

### 1. WHY NOT GIVE THE AGENT A WALLET?
Giving an LLM direct custody over private keys or signing capabilities exposes funds to prompt injection, hallucinated retry loops, and unbounded reasoning errors. A single adversarial payload in an untrusted web page or tool response can command an agent to sign an on-chain transfer to an attacker. Additionally, enterprise capital cannot legally or compliantly flow through unvetted, unmonitored agent wallets without deterministic policy evaluation, granular limits, and double-entry accounting.

### 2. WHAT DOES AGENTPAY ACTUALLY CONTROL?
AgentPay controls all **financial authority**:
- Policy evaluation (sub-10µs Rust core enforcing allowlists, velocity ceilings, and 7 constitutional tiers).
- Composite risk scoring and counterparty exposure bounds (<30% concentration).
- Human-in-the-loop multi-sig escalation for high-value transactions.
- Atomic double-entry liquidity reservations in the treasury.
- Transaction calldata validation, target binding, and relayer signing.

### 3. WHAT HAPPENS IF THE AI IS COMPROMISED?
Even under 100% prompt injection hijacking:
1. The agent cannot sign a transaction (it holds zero private keys).
2. The agent cannot designate an arbitrary destination address (`INV-2`: recipients must be resolved server-side via the verified Service Registry).
3. The agent cannot increase its budget envelope (`INV-148`: replanning costs exceeding the initial allocation are rejected).
4. The agent cannot bypass blocked entities (`INV-46`: `HARD_DENY` is inviolable and cannot be overridden by AI, human approval, or emergency tools).

### 4. WHAT HAPPENS IF A SERVICE IS MALICIOUS?
If an external provider returns an attack payload (e.g., attempting recipient substitution to an attacker wallet), AgentPay’s execution gate verifies the recipient against the authoritative Service Registry. The unrecognized or modified recipient triggers an immediate, deterministic `HARD_DENY` (`INV-146`, `INV-186`). **$0.00 funds leave the treasury.**

### 5. CAN THE AI INCREASE ITS OWN BUDGET?
**No.** Budget ceilings are immutable constraints established at mission creation (`ObjectiveConstraints.BudgetCapUSDC`). Under the 7-tier constitutional hierarchy (`GLOBAL → ORG → AGENT → MISSION → SWARM → TASK → PAYMENT`), authority can only tighten at lower scopes; it can never expand. Any attempt to request an allocation larger than the parent envelope returns `ErrAuthorityEscalation`.

### 6. CAN THE AI CHANGE THE RECIPIENT?
**No.** Under invariant `INV-2`, payment requests must reference registered service IDs in the verified Service Registry. The execution gateway resolves the on-chain destination address server-side. Unregistered addresses or substituted addresses trigger an immediate `HARD_DENY`.

### 7. WHAT HAPPENS IF A PROVIDER FAILS?
If a provider crashes, drops connection, or suffers a heartbeat lease timeout (>2000ms), AgentPay’s runtime monitor fences the worker (`INV-101`). The AI adaptive planning loop is invoked to select a backup candidate. The replacement is authorized **only** if cumulative mission spend remains within the original budget envelope (`INV-143`).

### 8. WHAT HAPPENS IF A WORKER CRASHES?
When a worker crashes, its execution lease expires. The runtime supervisor recovers the workflow state from durable storage. Lease fencing ensures that stale or zombie workers cannot commit transactions post-expiry (`INV-101`), and recovery cannot synthesize new financial authority (`INV-102`).

### 9. WHAT HAPPENS IF ARC IS UNAVAILABLE?
If the Arc Mainnet RPC times out or becomes unreachable during execution, AgentPay marks the transaction as `AMBIGUOUS` (`INV-106`). The system **fails closed**: it strictly prohibits blind rebroadcast to prevent duplicate transactions on chain, escalating to the reconciliation queue.

### 10. HOW ARE DUPLICATE PAYMENTS PREVENTED?
Duplicate payments are prevented at four distinct layers:
1. **Atomic Compare-And-Swap (CAS):** State transitions enforce version correctness (`INV-111`).
2. **Double-Entry Encumbrance:** Available liquidity = Total balance - Active reservations - Safety floor (`INV-71`).
3. **Cryptographic Idempotency Keys:** Every payment request enforces idempotency based on request hash (`INV-112`).
4. **On-Chain Vault Enclosure:** `AgentVault.sol` enforces nonces and daily calendar spending limits directly in EVM storage.

### 11. WHAT IS DETERMINISTIC?
- Rust Policy Engine rule evaluation (<10µs).
- 7-tier constitutional hierarchy checks.
- Risk scoring and allowlist lookups.
- Double-entry ledger math and balance conservation.
- Multilateral netting cycle calculations.
- Transaction calldata generation and signature verification.
- Mission Replay 21-state machine transitions.

### 12. WHAT IS AI-DRIVEN?
- High-level objective interpretation.
- Task decomposition into execution DAGs.
- Natural language service discovery queries.
- Provider quote evaluation and ranking advice.
- Quality score assessment of deliverables (Critic Agent).
- Adaptive replanning proposals upon provider failure.

### 13. WHAT IS SIMULATION?
Simulation mode (`is_simulation = true`) runs complete end-to-end mission lifecycles, Monte Carlo risk analysis, digital twin stress tests, and policy evaluations without broadcasting on-chain transactions or risking real capital. The transaction signer strictly refuses to sign simulation intents (`INV-10`, `INV-107`).

### 14. WHAT IS ACTUALLY VERIFIED ON ARC?
- **Arc Mainnet (Chain ID 5042):** Connected and operational via `https://rpc.mainnet.arc.io` (Block #23,401,027+).
- **Native USDC Contract:** Verified on-chain at `0x3600000000000000000000000000000000000000`.
- **AgentVault (`AgentVault.sol`):** The reference smart contract is **NOT DEPLOYED ON MAINNET** (`0x` bytecode).
- **Real Settlements:** **0**. Live broadcasts are currently disabled (`ENABLE_LIVE_EXECUTION=false`).

### 15. WHY IS THIS NOT JUST A PAYMENT API?
Traditional payment APIs (e.g., Stripe) assume human-in-the-loop authorization or static API keys. AgentPay is built specifically for **autonomous agent-to-agent economies**:
- It decouples cognitive planning from financial authority.
- It operates an in-memory Rust policy engine evaluating multi-layered constraints in **<10 microseconds**.
- It provides atomic double-entry treasury reservations (`INV-76`), preventing over-allocation across parallel agents.
- It executes multilateral debt netting cycles to conserve on-chain liquidity before settlement.
- It settles in native USDC on Arc with strict transaction and calldata bindings.

### 16. WHY IS THIS NOT JUST AN AI AGENT FRAMEWORK?
Agent frameworks (e.g., LangChain, CrewAI, AutoGen) focus on LLM prompt chaining, tool invocation, and multi-agent dialogue. They do not manage capital, enforce financial policies, provide double-entry accounting, or guarantee that prompt injection cannot drain a bank account. AgentPay sits underneath agent frameworks as the financial control plane.

### 17. HOW DOES AGENTPAY BECOME A BUSINESS?
- **Enterprise Control Plane Subscriptions:** SaaS fees for institutional compliance rules, private Rust policy engines, and multi-cloud audit retention.
- **Volume Fee on Settled Value:** Micro-basis points (0.05% - 0.15%) on netted on-chain settlement batches executed through `AgentVault`.
- **Service Marketplace Clearing:** Clearinghouse fees on agent-to-agent contract settlements and dispute arbitration.

### 18. WHAT IS THE LONG-TERM VISION?
AgentPay aims to be the universal financial operating system for the autonomous economy—the institutional standard through which millions of AI agents discover services, enter enforceable contracts, and settle micro-transactions globally while enterprise capital remains protected by mathematical and cryptographic guarantees.
