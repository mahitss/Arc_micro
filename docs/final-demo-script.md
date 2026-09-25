# AgentPay — Official Flagship Demo Script

**Title:** "AgentPay — The Financial Control Plane for Autonomous AI Agents"  
**Duration:** 4 minutes 30 seconds  
**Speaker Tone:** Simple, direct, professional engineer. Authoritative and precise. No buzzword fluff.  
**Core Thesis:**  
> **AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.**  
> *Autonomy can expand. Financial authority cannot.*

---

## TIMED SCRIPT & SCREENPLAY

### 0:00 — The Problem: Autonomous Agents With Wallets Are Dangerous
**[Visual: Focus on Control Tower header showing SIMULATION MODE]**  
"Autonomous AI agents are capable of planning, delegating, and hiring other agents. But the moment you give an LLM a private key or a crypto wallet, you introduce fatal economic vulnerabilities. A single prompt injection, infinite retry loop, or byzantine provider can drain an entire corporate treasury in seconds. Today, agents either have zero financial autonomy, or unconstrained wallet access. Both models fail."

### 0:20 — The AgentPay Thesis
**[Visual: Point to tagline on screen: 'AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.']**  
"AgentPay introduces a fundamental boundary: **AI requests, AgentPay controls, and Arc settles.** Our core architectural invariant is that **autonomy can expand, but financial authority cannot.** Agents can dynamically discover peers and rewrite DAG task plans, but they never hold private keys, cannot expand their budget envelope, and cannot bypass constitutional policy."

### 0:40 — The Control Tower Hero
**[Visual: Scroll to the Control Tower Hero status block at `/control`]**  
"Here in the AgentPay Control Tower, notice our transparent system status:
- System Mode: **SIMULATION**
- Settlement Plane: **ARC MAINNET (Chain ID 5042) CONNECTED**
- Smart Contract: **AGENTVAULT NOT DEPLOYED**
- Live Execution: **DISABLED**
- Real Settlements: **0 VERIFIED**
- Treasury: **$100.00 USDC SIMULATED**

We show absolute truth: no fake hashes, no fabricated receipts, and strict dual-mode isolation."

### 1:00 — Create Mission: Autonomous Market Intelligence
**[Visual: Active Mission card showing $25.00 USDC budget and objective]**  
"Let us trace an autonomous mission: an intelligence task with an explicit **$25.00 USDC financial envelope**. The mission engine translates user intent into an acyclic task DAG. Notice that before any agent is hired, the system establishes a hard economic envelope that no downstream agent can exceed."

### 1:20 — Marketplace Discovery & Deterministic Selection
**[Visual: Step 4 in Timeline: CANDIDATE MATCHING]**  
"The agent queries the service directory. Three candidates submit cryptographic quotes:
- FastInfer: **$12.50 USDC**
- BudgetAI: **$14.00 USDC**
- UltraDeep: **$28.00 USDC**

Why was FastInfer selected? Because it offered the lowest eligible quote within policy and budget, with a 99.4% historical SLA.  
Why was UltraDeep rejected? Because its $28.00 quote exceeds the mission's $25.00 envelope. In AgentPay, quotes that breach policy are pruned deterministically."

### 1:40 — Policy Engine & Digital Twin Pre-Flight
**[Visual: Step 2 & Step 8: PRE-FLIGHT SIMULATION & POLICY ALLOW]**  
"Before execution, the mission runs through a pre-flight digital twin. Monte Carlo modeling confirms worst-case exposure ($18.00) is covered by treasury reserves ($81.50 available). The transaction intent is submitted to our compiled Rust Policy Engine. In **6.36 microseconds**, Policy Engine v8 validates recipient allowlists, velocity thresholds, and budget limits, emitting a cryptographically signed **ALLOW**."

### 2:00 — Provider Failure Injection
**[Visual: Step 5 in Timeline: WORKER TIMEOUT (FAILED in Red)]**  
"Now, we inject real-world chaos. Mid-execution, FastInfer goes unresponsive. A heartbeat timeout fires. In an unconstrained system, agents would blindly retry payments, leading to double-spends.  
In AgentPay, the lease is instantly **fenced** (INV-101). The provider's authorization token is revoked, isolating the worker."

### 2:20 — Why Was Payment Not Retried? Replanning Without Budget Creep
**[Visual: Click Step 5 & Step 6: INSPECT WHY PANEL]**  
"Look at the Why Panel: **'Previous execution became ambiguous. Blind retry prohibited.'**  
The planner initiates replanning. It re-evaluates the task DAG and swaps in the qualified secondary provider, **BudgetAI at $14.00 USDC**.  
Crucially: **Autonomy allowed the DAG to adapt, but the $25.00 financial ceiling remained mathematically locked.**"

### 2:45 — Policy Re-Check & Encumbrance
**[Visual: Steps 7, 8, 9: RECOVERED, ALLOW, LIQUIDITY RESERVED]**  
"The replacement intent undergoes a fresh policy check. The Rust engine verifies BudgetAI in sub-millisecond time. The Autonomous Treasury journal atomically reserves **$14.00 USDC**, reducing uncommitted liquidity from $89.00 to $75.00 USDC under a double-entry mutex lock."

### 3:00 — Result Verification & Clearinghouse
**[Visual: Steps 10, 11: PAYMENT AUTHORIZED & RESULT VERIFIED]**  
"BudgetAI delivers the intelligence artifact. The verification critic validates the SHA-256 deliverable hash. The bilateral contract completes. The unspent **$11.00 USDC** headroom is released back into available treasury. Zero fund leakage."

### 3:15 — The Malicious Provider Proving Ground (8 Attacks in 35s)
**[Visual: Scroll down to SECURITY PROVING GROUND at `/control`]**  
"What happens when providers are actively adversarial? Let us test all 8 attacks:
1. **Recipient Substitution:** Provider tries rerouting funds to an attacker address &rarr; **BLOCKED** by allowlist gate in 6.36µs.
2. **Budget Escalation:** Agent attempts self-issuing an $85 quote &rarr; **BLOCKED** by envelope invariant.
3. **Policy Modification:** Injected prompt tries altering Constitution v8 &rarr; **BLOCKED** by immutable hash check.
4. **Arbitrary Calldata:** Raw bytecode injection on the vault &rarr; **BLOCKED** by typed calldata gate.
5. **Quote Invalidation:** Altered post-discovery SLA terms &rarr; **BLOCKED** by matcher validator.
6. **Nonce Replay:** Relayer resubmits a prior transaction &rarr; **BLOCKED** by idempotency engine.
7. **Duplicate Settlement:** Failed provider attempts second payout claim &rarr; **BLOCKED** by lease fencing.
8. **Forged Completion:** Worker presents synthetic deliverable &rarr; **BLOCKED** by milestone hash mismatch.

Every single attack yields: **ATTACK &rarr; DETECTION &rarr; DECISION &rarr; BLOCKED.**"

### 3:50 — Arc Mainnet Integration Architecture
**[Visual: Click navigation to `/arc` panel]**  
"Finally, how does Arc settle this?
Arc Mainnet (Chain 5042) is our native settlement plane. Arc’s native USDC gas model eliminates multi-token slippage—agents only manage one currency.
Here on our Arc panel, we verify:
- Live RPC connection confirmed at `https://rpc.mainnet.arc.io`
- Native USDC verified at `0x3600000000000000000000000000000000000000`
- AgentVault contract bytecode is currently `0x`—safely not deployed
- Live execution is strictly disabled. Real settlements: 0. Broadcasts: 0.

When ready for mainnet rollout, AgentPay connects through audited multi-sig signers."

### 4:20 — Closing
**[Visual: Click RESET DEMO button and show clean state restoration]**  
"I click **RESET DEMO**—simulation resets to step zero, and production state remains pristine.
AgentPay is the missing economic infrastructure for the agentic web.  
**AI requests. AgentPay controls. Arc settles.**  
Thank you."
