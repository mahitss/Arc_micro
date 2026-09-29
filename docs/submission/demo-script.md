# AgentPay — Official Flagship Demo Script

**Target Duration:** 4 minutes 45 seconds  
**Speaker Tone:** Simple, direct, professional engineer. Authoritative and precise. No buzzword fluff.  
**Core Thesis:**  
> **AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.**  
> *Autonomy can expand. Financial authority cannot.*

---

## Screenplay & Narration

### 0:00 — PROBLEM
**[Visual: Focus on Control Tower header showing SIMULATION MODE]**  
"Autonomous agents can think and act, but giving them unrestricted wallets is dangerous. A single prompt injection, infinite retry loop, or byzantine provider can drain an entire corporate treasury in seconds. Today, agents either have zero financial autonomy, or unconstrained wallet access. Both models fail."

### 0:20 — SOLUTION
**[Visual: Point to tagline: 'AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.']**  
"AgentPay separates intelligence from financial authority. Our core principle is: autonomy can expand, but financial authority cannot. Agents can discover services, negotiate contracts, and replan tasks, but they never hold private keys, cannot expand their budget envelope, and cannot bypass constitutional policy."

### 0:40 — CONTROL TOWER
**[Visual: Overview of Control Tower at `/control` showing system status card]**  
"Here in the Control Tower, we see the complete economic operating system:
- Mode: **SIMULATION — NO FUNDS MOVED**
- Settlement: **ARC MAINNET (Chain ID 5042) CONNECTED**
- Smart Contract: **AGENTVAULT NOT DEPLOYED**
- Live Execution: **DISABLED**
- Real Settlements: **0 VERIFIED**
Everything is transparent and truthful."

### 1:00 — MISSION
**[Visual: Click into `/missions/demo/replay`]**  
"We initialize an autonomous mission: **Autonomous Market Intelligence** with an explicit **$25.00 USDC cap** and a 10-minute deadline. The planner decomposes the natural language goal into an operational DAG."

### 1:20 — AGENTS
**[Visual: Show DAG visualization in replay inspector]**  
"The mission coordinates specialized agent roles:
- **Research Agent:** Information gathering
- **Market Data Agent:** Quantitative metrics
- **Analysis Agent:** Synthesis and modeling
- **Critic Agent:** Deliverable quality validation"

### 1:40 — MARKETPLACE
**[Visual: Step 4: QUOTE_RECEIVED]**  
"The agent network queries candidate providers:
- Provider A: **$4.00 USDC** (2.1s latency)
- Provider B: **$3.60 USDC** (1.8s latency)
- Provider C: **$4.50 USDC** (1.4s latency)"

### 2:00 — DECISION
**[Visual: Step 5: QUOTE_COMPARED and Step 6: SERVICE_SELECTED]**  
"AI Advisory recommends Provider B as the lowest cost within SLA. Then AgentPay’s financial gate takes over: the Rust Policy Engine evaluates allowlists and budgets in **6.36 microseconds**, issuing an **ALLOW**. The treasury reserves $3.60 atomically in the double-entry ledger."

### 2:20 — ATTACK
**[Visual: Step 12 & Step 13: SECURITY_VIOLATION_DETECTED & PAYMENT_BLOCKED]**  
"Now, an adversary attacks. Malicious Interceptor attempts **Recipient Substitution**—swapping the payout address to an attacker's wallet.  
Watch AgentPay respond:
- **Decision:** `HARD_DENY` (INV-146 & INV-186)
- **Result:** Payment blocked immediately.
- **FUNDS MOVED:** **$0.00 USDC.**  
Zero funds leave the treasury."

### 2:40 — FAILURE
**[Visual: Step 14: PROVIDER_FAILED]**  
"Next, real-world chaos: Provider B suffers a heartbeat lease timeout (>2000ms). The runtime monitor fences the worker immediately (`INV-101`). Blind retries are strictly prohibited."

### 3:00 — REPLAN
**[Visual: Step 15: REPLAN_REQUESTED]**  
"The AI adaptive loop replans. It proposes switching to backup Provider C at **$4.50 USDC** (+$0.90 delta)."

### 3:20 — REVALIDATION
**[Visual: Step 16 & Step 17: ALTERNATIVE_PROVIDER_SELECTED & PAYMENT_REAUTHORIZED]**  
"AgentPay revalidates the entire plan:
- Policy: **PASS**
- Risk: **PASS**
- Budget Envelope: **$8.50 cumulative spend $\le$ $25.00 cap (PASS)**
- Recipient: **VERIFIED IN REGISTRY**
Authority expansion: **0**. The replan is authorized."

### 3:40 — RESULT
**[Visual: Step 18 & Step 19: RESULT_RECEIVED & RESULT_VALIDATED]**  
"Provider C delivers 142 analyzed records. The Critic Agent verifies the cryptographic deliverable checksum and scores quality: **94/100** (exceeding the 80 threshold)."

### 4:00 — CLEARING
**[Visual: Step 20: CLEARING_RECORDED]**  
"The Clearinghouse records bilateral obligations:
- Provider A: $4.00
- Provider B: $3.60 (BLOCKED / UNSETTLED)
- Provider C: $4.50  
Total authorized spend: **$8.50 USDC**. Unencumbered return: **$16.50 USDC** returned to treasury."

### 4:15 — ARC
**[Visual: Step 21: SETTLEMENT_SIMULATED and `/arc` panel]**  
"The Arc settlement payload is compiled for Chain ID 5042. Because we are in simulation mode:
- Live Broadcasts: **0**
- Real Funds Moved: **0.00 USDC**
- AgentVault Status: **NOT DEPLOYED ON MAINNET**  
Truthful and uncompromised."

### 4:30 — SECURITY
**[Visual: Inspector Authority Trace Tab]**  
"Look at the authority trace: throughout the mission, AI made suggestions, but **AgentPay controlled the money**. At no point did an AI model hold a private key or expand its budget."

### 4:45 — CLOSE
**[Visual: Final summary screen]**  
"AI can change the plan.  
AgentPay controls the power.  
Arc settles authorized value.  
This is AgentPay."
