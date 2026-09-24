# AgentPay Control Tower — Technical Demonstration Script

**Duration:** 3–5 minutes  
**Target Audience:** Enterprise FinTech Operators, AI Infrastructure Architects, Security Auditors  
**Core Thesis:** AI REQUESTS -> AGENTPAY CONTROLS -> ARC SETTLES

---

## Act 1: The Executive Control Plane (Minute 0:00 - 1:00)

1. **Navigate to `/control`:**
   - Highlight the **Economic State Strip**: Treasury status (`HEALTHY`), Constitution (`v8 ACTIVE`), Risk (`NORMAL`), Execution (`LIVE`), and Arc Blockchain (`VERIFIED`).
   - Point to the **Executive Metrics Grid**: Active missions, real-time uncommitted liquidity buffer ($82,500.00 USDC), and reserved headroom.
   - Note the **Data Freshness Indicator**: Explicitly marked `LIVE`. Explain invariant **INV-86**: *"The Control Tower sees everything, but can never fabricate numbers or invent financial authority."*

2. **Realtime Economic Timeline:**
   - Show classified events streaming live.
   - Filter by `SECURITY + TREASURY` to show multi-system observability.

---

## Act 2: Mission Command Center & Explainability (Minute 1:00 - 2:30)

3. **Open Mission Command Center (`/control/missions/msn_global_macro`):**
   - Point to the **Current Action Panel**: Explains *WHAT* the economy is doing, *WHY* it is doing it, and the cryptographic *EVIDENCE*.
   - Point to the **Next Expected Transition**: State machine clarity (`RUNNING_VERIFICATION`).
   - Examine the **Task Graph (DAG)**: Click on nodes to display reserved costs, SLA latencies, and deliverable checksum rules.

4. **Agent Selection Explainability:**
   - Review selected provider `agent_lead_analyst`.
   - Show why `agent_alt_beta_01` was declined: *"+40% higher price; deliverable verification lower (94.1%)"*.
   - Highlight: *"This is an explanation surface, not a subjective ranking claim."*

---

## Act 3: Deterministic Failure Injection & Adaptive Recovery (Minute 2:30 - 3:45)

5. **Simulate Provider Failure (`/control/incidents`):**
   - External data provider throws HTTP 504 Timeout.
   - Show automated system response:
     `Provider Timeout -> SLA Breach -> Intelligence Detection -> Replan -> Secondary Peer Selected -> Policy Revalidated -> Replacement Executed -> Mission Recovered`.
   - Zero human intervention, zero budget overspend.

6. **Approval Gate & Hard DENY Inviolability (`/control/approvals`):**
   - Show pending request `app_req_01` (22.00 USDC exceeds 20.00 USDC threshold): Available to approve.
   - Show hard denial `app_req_02` (75.00 USDC exceeds mission budget): Approve button is strictly disabled with message: *"APPROVAL WILL NOT OVERRIDE HARD DENY (INV-97)"*.

---

## Act 4: Universal Financial Trace & Arc Consensus (Minute 3:45 - 5:00)

7. **Universal Financial Trace:**
   - Walk through the 13-stage chain from Mission initiation to Arc block confirmation.
   - Show deterministic Trace ID and SHA256 hashes linking Go Gateway, Rust Engine, AgentVault, and Arc consensus.

8. **Arc Blockchain State & 4-Way Reconciliation:**
   - Display verified AgentVault deployment `0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852`.
   - Point to the 4-way balance reconciliation: `Ledger == Repo == Vault == Arc (0 Discrepancy)`.
   - Close on the core principle:
     > *"ONE ECONOMIC SYSTEM. ONE FINANCIAL CONTROL PLANE. ONE AUDITABLE REALITY."*
