# AgentPay Verification Screenshot Checklist
## Submission Evidence & Screen Capture Guide

**Document ID:** `docs/submission/screenshot-checklist.md`  
**Standard:** All screenshots must capture actual, running application states. Zero mock frames or synthetic graphics.

---

### Screenshot 1: Autonomous Economic Control Tower
- **Target Route:** `/control`
- **Required Elements:**
  - Executive economic state strip (`TREASURY: HEALTHY`, `POLICY: v8 ACTIVE`, `EXECUTION: SIMULATION`).
  - Four executive metric cards: Economic State, Operations, Settlement & Arc, Intelligence.
  - Global causal search bar.
  - Flagship live economic trace preview.

---

### Screenshot 2: Autonomous Mission Command
- **Target Route:** `/missions/msn_market_intel_01`
- **Required Elements:**
  - Mission header with ID `msn_market_intel_01` and status badge `COMPLETED / RUNNING`.
  - Multi-agent coordination pipeline (`Discovered` &rarr; `Quoted` &rarr; `Selected` &rarr; `Running`).
  - Active Economic Envelope breakdown (Budget 25.00 USDC, Committed 14.00 USDC, Remaining 11.00 USDC).

---

### Screenshot 3: Machine-Native Marketplace
- **Target Route:** `/marketplace`
- **Required Elements:**
  - Discovered service listings with capability identifiers (`ai.inference`, `sec-audit`).
  - Measurable comparison dimensions (latency in ms, reliability percentage, quote in USDC).
  - Provider selection rationale panel.

---

### Screenshot 4: Multi-Agent Network & Swarm Graph
- **Target Route:** `/swarms` or `/network`
- **Required Elements:**
  - Swarm topology visualizer showing directed acyclic graph (DAG).
  - Role specialization nodes (Planner, Market Researcher, Data Analyst, Verifier).
  - Bounded delegation indicator (Max DAG depth: 4).

---

### Screenshot 5: Digital Twin Economic Simulation
- **Target Route:** `/simulator`
- **Required Elements:**
  - Monte Carlo simulation run with 100 iterations.
  - Pre-flight risk heatmap and Capital Adequacy Ratio gauge.
  - Mandatory disclaimer badge: `SIMULATION ONLY — DOES NOT AUTHORIZE PAYMENT (INV-156)`.

---

### Screenshot 6: Failure & Recovery Replay
- **Target Route:** `/missions/msn_market_intel_01/replay`
- **Required Elements:**
  - VCR playback controller (Play, Pause, Step Forward, Speed 1x/2x/5x).
  - Stage 4 (FAILURE): Flashing indicator showing isolated worker and preserved budget.
  - Stage 5 (RECOVERY): Visual plan diff demonstrating autonomous failover to `agent_budget_ai`.

---

### Screenshot 7: Rust Policy Engine Decision
- **Target Route:** `/control` (Event 8 in Live Economic Trace) or `/demo`
- **Required Elements:**
  - Policy evaluation result: `ALLOW`.
  - Rust microsecond execution latency metric (`6.36 µs`).
  - Rule evaluation checklist: Recipient Allowlist `PASS`, Budget Cap `PASS`, Velocity Limit `PASS`.

---

### Screenshot 8: Financial Authority Panel
- **Target Route:** `/control` (Financial Authority Guardrails Card)
- **Required Elements:**
  - Active guardrails list:
    - Agent Private Keys: `NEVER HELD`
    - Arbitrary Recipient: `BLOCKED`
    - Arbitrary Calldata: `BLOCKED`
    - Budget Self-Increase: `BLOCKED`
    - Simulation Broadcast: `BLOCKED`

---

### Screenshot 9: Economic Clearinghouse & Netting
- **Target Route:** `/economy/clearing`
- **Required Elements:**
  - Bilateral clearing obligations table (`ctr_intel_01`, `ob_intel_01`).
  - Netting compression metrics showing reduced on-chain transaction footprint.
  - Obligation settlement status badge (`SETTLED`).

---

### Screenshot 10: Autonomous Treasury & Liquidity Pool
- **Target Route:** `/treasury`
- **Required Elements:**
  - Real-time liquidity headroom breakdown (Available, Reserved, Encumbered, Buffer Floor).
  - Double-entry ledger journal entries.
  - Atomic reserve lock confirmation (`INV-75`).

---

### Screenshot 11: Arc Settlement & Consensus Plane
- **Target Route:** `/arc`
- **Required Elements:**
  - Verified system parameters: Arc Mainnet Chain ID `5042`, RPC `https://rpc.mainnet.arc.io`, Native USDC `0x3600...0000`.
  - Realistic state badges (`VERIFIED`, `OPERATOR ACTION REQUIRED`).
  - Transparent audit notice: `"No live settlement verified. Production broadcast remains operator-gated."`
  - 4-Way Economic Reconciliation (0 Discrepancy across Ledger, Repo, Vault, and Arc).

---

### Screenshot 12: Cryptographic Audit & Universal Financial Trace
- **Target Route:** `/control` or `/trace`
- **Required Elements:**
  - 13-stage end-to-end universal financial trace.
  - Cryptographic causation graph linking User Objective &rarr; Mission &rarr; Policy &rarr; Treasury Hold &rarr; Arc Consensus &rarr; SHA-256 Deliverable Hash.
