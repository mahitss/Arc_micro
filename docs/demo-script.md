# AgentPay Demonstration Video Script

> **Target Duration**: 2 minutes 30 seconds  
> **Route**: `http://localhost:3000/demo`  
> **Format**: Screencast with voiceover  
> **Presenter Tone**: Clear, technical, factual, zero hype.

---

## Script Breakdown

### 0:00 — The Problem (20s)
- **Visual**: Title slide or high-level architecture diagram (`docs/architecture-final.md`).
- **Voiceover**:
  > "Autonomous AI agents can formulate plans, call external tools, and reason about complex tasks. But the moment an agent needs to perform an economic action—like purchasing research data or renting GPU compute—it needs spending authority. Giving an AI direct access to a crypto wallet is dangerous: prompts can be hijacked, and recursive loops can drain an entire treasury in seconds."

---

### 0:20 — AgentPay Dashboard (20s)
- **Visual**: Screen recording opens on `http://localhost:3000/dashboard`.
- **Voiceover**:
  > "This is AgentPay: programmable USDC payment infrastructure for autonomous AI agents on Arc. AgentPay decouples economic authority from intelligence. The AI creates a structured payment intent, a deterministic policy engine evaluates the request, and on-chain smart contracts execute settlement on Arc."

---

### 0:40 — Create Payment Intent (20s)
- **Visual**: Switch to `http://localhost:3000/demo`. Click **"Run Research Agent Demo"**. Step 1 highlights.
- **Voiceover**:
  > "Here we trigger our Research Agent with a task: 'Retrieve external research data'. Notice that the agent does not sign a transaction. Instead, it submits a structured payment intent requesting 0.18 USDC for the registered 'web-research' service. The recipient address is resolved strictly server-side to prevent prompt injection."

---

### 1:00 — Policy Evaluation (20s)
- **Visual**: Step 2 & 3 animate and show `ALLOW`.
- **Voiceover**:
  > "The Go Gateway forwards this intent to our Rust Policy Engine. The policy engine evaluates deterministic mathematical rules: daily spending limit, per-transaction maximum, and recipient allowlists. Because 0.18 USDC is well within the remaining daily budget, the policy engine returns an explicit ALLOW decision."

---

### 1:20 — Execution & On-Chain Settlement (20s)
- **Visual**: Step 4 & 5 highlight. Execution status shows `CONFIRMED` or `DEMO / EXECUTION DISABLED` depending on live network mode.
- **Voiceover**:
  > "With authorization verified, the execution service submits the transaction to the AgentVault smart contract on Arc. In live mode, the vault transfers the 6-decimal USDC base units directly to the service provider. In local demo mode, safety guards keep execution simulated."

---

### 1:40 — Arc Settlement & Explorer (20s)
- **Visual**: Highlight the settlement receipt box with transaction parameters (amount, recipient, vault address, network chain ID `5042`).
- **Voiceover**:
  > "Arc is our settlement layer. Because Arc is a stablecoin-native Layer 1 with gas paid in USDC, both gas accounting and payment settlement occur in the same predictable currency without slippage or multi-token management."

---

### 2:00 — Safety Model: Over-Limit Spending Attempt (20s)
- **Visual**: Click **"Test Policy Denial"** button. Step 1 shows an agent requesting 6.00 USDC (exceeding the daily budget).
- **Voiceover**:
  > "Now let’s test the security boundary. Suppose an agent attempts to spend 6.00 USDC—exceeding its remaining daily limit. The agent creates the intent, but when the Rust policy engine evaluates it, the result is an immediate DENY with error code DAILY_LIMIT_EXCEEDED."

---

### 2:20 — Verification: Zero Transactions (10s)
- **Visual**: Step 3 displays `PAYMENT DENIED: DAILY_LIMIT_EXCEEDED`. Step 4 & 5 explicitly display `Blockchain Transaction: NONE`.
- **Voiceover**:
  > "Crucially, look at the execution layer: zero blockchain transactions were created, signed, or broadcast. The request was blocked before touching the chain. AgentPay is not merely a payment sender; it is a deterministic firewall for autonomous spending."

---

### 2:30 — Close (10s)
- **Visual**: Switch back to `/dashboard` or `docs/quickstart.md`.
- **Voiceover**:
  > "AgentPay provides the programmable, auditable guardrails autonomous agents need to conduct safe commerce on Arc. The complete repository, test suites, and documentation are available on GitHub. Thank you."
