# AgentPay Demonstration Screencast Script

> **Target Duration**: 3 to 5 minutes  
> **Target Audience**: Arc Microgrants Evaluators  
> **Route**: `http://localhost:3000/demo`  
> **Tone**: Professional, technical, evidence-driven, zero marketing fluff.

---

## 00:00 — Problem (30s)
- **Visual**: Open on architecture diagram in [`docs/architecture.md`](architecture.md).
- **Voiceover**:
  > "Autonomous AI agents can formulate multi-step plans, call external tools, and reason through complex tasks. But the moment an agent needs to perform an economic action—such as paying for GPU inference, indexing data, or querying a research API—it requires spending authority. Giving an AI agent direct, unconstrained access to a cryptocurrency wallet is dangerous: prompts can be hijacked, and recursive loops can drain an entire treasury in seconds. For agents to safely engage in commerce, economic authority must be separated from intelligence."

---

## 00:30 — Architecture (30s)
- **Visual**: Highlight the 3 trust boundaries in the architecture diagram: `UNTRUSTED`, `TRUSTED APPLICATION LOGIC`, and `ON-CHAIN ENFORCEMENT`.
- **Voiceover**:
  > "AgentPay decouples intelligence from spending authority. The AI reasoning layer is treated as untrusted. When an agent needs to pay for a service, it formulates a structured Payment Intent. An independent Rust Policy Engine evaluates spending rules in pure, deterministic integer math. Upon authorization, a Go Gateway orchestrates execution, and our Solidity contract, AgentVault, enforces hard on-chain limits and executes USDC settlement on the Arc blockchain."

---

## 01:00 — Create Agent & Payment Intent (45s)
- **Visual**: Switch browser to `http://localhost:3000/demo`. Click **"▶ Run Research Agent Demo (0.18 USDC)"**. Step 1 card animates and highlights.
- **Voiceover**:
  > "Here on our interactive demo route, we trigger our Research Agent with a task: 'Retrieve external research data'. Notice what happens: the agent does not sign a transaction and does not hold a private key. Instead, the Go Gateway resolves the approved 'web-research' service from a server-side catalog, locks the recipient address to prevent prompt injection, and generates a structured Payment Intent for 0.18 USDC, or 180,000 base units."

---

## 01:45 — Show Policy Authorization (30s)
- **Visual**: Step 2 and Step 3 cards animate to `ALLOW` and `APPROVED`.
- **Voiceover**:
  > "The intent is forwarded to our standalone Rust Policy Engine on port 8081. The engine checks four deterministic rules: per-transaction limit, remaining daily budget, frequency cap, and recipient allowlists. Because 0.18 USDC is well within the agent's 0.50 USDC per-transaction cap and 5.00 USDC daily budget, the policy engine returns an explicit ALLOW decision. The intent transitions to AUTHORIZED."

---

## 02:15 — Execute a Valid Payment (45s)
- **Visual**: Step 4 card highlights, showing `AgentVault.sol` execution preparation.
- **Voiceover**:
  > "With cryptographic authorization verified, the execution service prepares the transaction. To prevent race conditions and double-spending, the Go Gateway uses atomic Compare-And-Swap in the database to move the intent from AUTHORIZED to EXECUTING. In live mainnet mode, the transaction is signed and broadcast to AgentVault on Arc. In local review mode, our master safety gate keeps execution simulated, displaying DEMO / EXECUTION DISABLED without faking on-chain success."

---

## 03:00 — Show Arc Transaction (30s)
- **Visual**: Step 5 card and the verified settlement evidence box below highlight.
- **Voiceover**:
  > "Arc is our settlement layer. Why Arc? Because Arc is a stablecoin-native Layer 1 where gas is paid directly in USDC. Unlike other EVM networks where agents must juggle both ETH and USDC, on Arc an agent funded with USDC pays for both the service and the transaction fee from the same balance. When live, the transaction hash is verified directly on Arc Explorer."

---

## 03:30 — Demonstrate Denied Payment (45s)
- **Visual**: Click **"🛡 Test Policy Denial (Over-Limit Attempt)"**. Step 1 triggers with 6.00 USDC. Step 2 & 3 show immediate `DENY` with reason `DAILY_LIMIT_EXCEEDED`. Step 4 & 5 display **`Blockchain Transaction: NONE`**.
- **Voiceover**:
  > "Now let’s test the security model. Suppose an agent attempts to spend 6.00 USDC—exceeding its remaining daily budget. The intent is created, but the moment the Rust policy engine evaluates it, the request is denied with error code DAILY_LIMIT_EXCEEDED. Crucially, look at the execution and blockchain steps: zero transactions were broadcast to Arc. The vault was not called, zero gas was spent, and funds remained 100% protected."

---

## 04:15 — Explain Security Model (45s)
- **Visual**: Switch to [`docs/security.md`](security.md) or [`docs/payment-state-machine.md`](payment-state-machine.md).
- **Voiceover**:
  > "This denial proves that AgentPay is not merely a payment forwarder, but a deterministic security firewall. Our security model provides defense in depth: the AI is untrusted; the Rust policy engine enforces limits off-chain; atomic CAS prevents double-spending; and AgentVault enforces hard limits on-chain in immutable bytecode. Even if the off-chain gateway were fully compromised, an attacker cannot exceed the on-chain daily limit or transfer funds to unapproved recipients."

---

## 05:00 — Conclusion (30s)
- **Visual**: Return to `http://localhost:3000/dashboard` showing system health and metrics.
- **Voiceover**:
  > "AgentPay provides the programmable, auditable guardrails autonomous agents need to conduct safe commerce on Arc. The entire monorepo—Next.js frontend, Go Gateway, Rust Policy Engine, and Foundry contracts—is open source, fully tested, and ready for review on GitHub. Thank you."
