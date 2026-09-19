# AgentPay Demonstration Screencast Script

> **Target Duration**: 3 to 5 minutes  
> **Target Audience**: Arc Microgrants Evaluators  
> **Route**: `http://localhost:3000/demo`  
> **Format**: Screencast with voiceover (evidence-driven, zero hype)

---

## 11-Step Demonstration Flow

### 1. Open Live Application (00:00 — 00:20)
- **Visual**: Browser opens to `http://localhost:3000` (or `/demo`).
- **Voiceover**:
  > "Welcome to AgentPay. This is the developer control center for programmable USDC payments for autonomous AI agents on Arc."

### 2. Show AgentPay Purpose (00:20 — 00:45)
- **Visual**: Highlight the pipeline banner on `/demo`: *AI Intent $\rightarrow$ Policy $\rightarrow$ Decision $\rightarrow$ AgentVault $\rightarrow$ Arc Settlement*.
- **Voiceover**:
  > "Autonomous agents can reason and call tools, but autonomous economic actions require controlled spending authority. Giving an LLM direct wallet access introduces severe risks of prompt injection and runaway spending loops. AgentPay solves this by separating intelligence from economic authority."

### 3. Show Configured Agent & Service (00:45 — 01:15)
- **Visual**: Show the Research Agent configuration card and the registered service `web-research` (Web Research & Intelligence API).
- **Voiceover**:
  > "Here we have a configured Research Agent with a daily spending cap of 5.00 USDC and a per-transaction cap of 0.50 USDC. The agent can only request payments to registered services in our server-side registry."

### 4. Create Payment Intent (01:15 — 01:45)
- **Visual**: Click **"▶ Run Research Agent Demo (0.18 USDC)"**. Step 1 card highlights.
- **Voiceover**:
  > "We trigger the agent with the task: 'Retrieve external research data.' Notice that the agent does not sign a transaction or hold private keys. Instead, the Go Gateway maps the request to the approved service and creates a structured Payment Intent for 0.18 USDC (180,000 base units)."

### 5. Show Deterministic Authorization (01:45 — 02:15)
- **Visual**: Step 2 and Step 3 cards animate to `ALLOW` and `APPROVED`.
- **Voiceover**:
  > "The intent is forwarded to our standalone Rust Policy Engine on port 8081. The engine checks daily limits, per-transaction caps, and allowlists in checked integer math. Because 0.18 USDC is within budget, it returns an immediate ALLOW decision."

### 6. Execute Valid Payment (02:15 — 02:45)
- **Visual**: Step 4 card shows execution preparation.
- **Voiceover**:
  > "With authorization verified, the execution service prepares the transaction. To prevent race conditions and double-spending, the Go Gateway uses atomic Compare-And-Swap in the database to transition the intent from AUTHORIZED to EXECUTING. In live mainnet mode, this is submitted to AgentVault on Arc. In local review mode, our master safety gate keeps execution simulated, displaying DEMO / EXECUTION DISABLED without faking on-chain success."

### 7. Show Verified Arc Transaction (02:45 — 03:15)
- **Visual**: Step 5 card displays settlement status.
- **Voiceover**:
  > "Arc is our settlement layer. Because Arc is a stablecoin-native Layer 1 with gas paid in USDC, both gas fees and payment settlement occur in the same predictable currency. When live on mainnet, the transaction hash is verified directly on Arc Explorer."

### 8. Create an Intentionally Invalid Payment (03:15 — 03:45)
- **Visual**: Click **"🛡 Test Policy Denial (Over-Limit Attempt)"**. Step 1 triggers with 6.00 USDC.
- **Voiceover**:
  > "Now let's test the security boundary. Suppose an agent attempts to spend 6.00 USDC—exceeding its remaining daily budget. The agent creates the intent, and the request is forwarded to policy evaluation."

### 9. Show Rust DENY (03:45 — 04:15)
- **Visual**: Step 2 and Step 3 highlight `DENY` with reason `DAILY_LIMIT_EXCEEDED`.
- **Voiceover**:
  > "The Rust Policy Engine evaluates the spending limit and immediately returns DENY with reason code DAILY_LIMIT_EXCEEDED. The intent transitions to the terminal status DENIED."

### 10. Show That No Blockchain Transaction Occurs (04:15 — 04:45)
- **Visual**: Step 4 & 5 cards and the evidence box explicitly show **`Blockchain Transaction: NONE`**, **`Gas Incurred: 0 USDC`**, **`Vault State: UNTOUCHED`**.
- **Voiceover**:
  > "Crucially, look at the execution and settlement layers: zero transactions were broadcast to Arc. The vault was not called, zero gas was spent, and funds remained 100% protected. AgentPay is a deterministic firewall that halts unauthorized spending off-chain."

### 11. Explain the Security Boundary (04:45 — 05:15)
- **Visual**: Show the architecture trust boundaries in [`docs/architecture.md`](architecture.md).
- **Voiceover**:
  > "This proves our defense in depth: the AI is untrusted; the Rust policy engine enforces limits off-chain; atomic CAS prevents double-spending; and AgentVault enforces hard limits on-chain in immutable bytecode. AgentPay provides the programmable, auditable guardrails autonomous agents need to conduct safe commerce on Arc. Thank you."
