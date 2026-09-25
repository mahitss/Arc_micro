# AgentPay — Final Screenshot Checklist

This checklist defines the 10 canonical submission screenshots. Each screenshot must communicate exactly **one clear idea**, be captured in a clean browser window (1920x1080 resolution, dark mode, no developer overlays, no console errors), and reflect 100% truthful system state.

---

### Screenshot 1: Control Tower Hero
- **Target URL:** `http://localhost:3000/control` (above the fold)
- **Visual Focus:** The prominent Hero banner displaying `AGENTPAY`, `Financial Control Plane for Autonomous AI Agents`, the core thesis (`AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.`), and the `SYSTEM STATUS` card:
  - `MODE: SIMULATION`
  - `ARC: CONNECTED`
  - `AGENTVAULT: NOT DEPLOYED`
  - `LIVE EXECUTION: DISABLED`
  - `TREASURY: SIMULATED ($100.00 USDC)`
- **Core Idea Communicated:** *AgentPay establishes a transparent, operator-gated financial control plane with zero hidden state.*

---

### Screenshot 2: Active Mission Timeline
- **Target URL:** `http://localhost:3000/control` (middle view)
- **Visual Focus:** The `HERO TRACE: DETERMINISTIC MISSION TIMELINE` displaying the sequential execution steps of the Autonomous Market Intelligence mission ($25.00 USDC budget), showing active events from planning through settlement.
- **Core Idea Communicated:** *Autonomous AI workflows execute along a deterministic, auditable economic trajectory.*

---

### Screenshot 3: Marketplace Discovery & Selection
- **Target URL:** `http://localhost:3000/marketplace`
- **Visual Focus:** Discovery panel showing 3 candidate agents:
  - `agent_fast_infer` ($12.50 USDC, selected)
  - `agent_budget_ai` ($14.00 USDC, eligible)
  - `agent_ultra_deep` ($28.00 USDC, rejected due to budget envelope violation)
- **Core Idea Communicated:** *Agent discovery automatically filters candidates violating task financial envelopes.*

---

### Screenshot 4: Sub-Microsecond Policy Decision
- **Target URL:** `http://localhost:3000/control` (event drawer opened on Step 8)
- **Visual Focus:** Inspected event drawer for `POLICY ALLOW`:
  - Decision: `ALLOW (Evaluated in 6.36 µs)`
  - Structured Why Panel: `Verified recipient on allowlist, velocity under limit, amount within constitution v8`
  - Structured Why Not Panel: `Human approval not required below $20.00 threshold`
- **Core Idea Communicated:** *Constitutional policy evaluation is deterministic, explainable, and lightning-fast (sub-10µs).*

---

### Screenshot 5: Heartbeat Failure & Lease Fencing
- **Target URL:** `http://localhost:3000/missions/msn_market_intel_01/replay` (Step 5 & 6)
- **Visual Focus:** Step 5 highlighted in Red (`FAILED`), Step 6 highlighted in Amber (`REPLANNING`):
  - Invariant indicator: `Lease Fenced (INV-101) & Blind Retry Prohibited (INV-103)`
  - Financial impact: `Budget remains 100% intact; worker isolated immediately`
- **Core Idea Communicated:** *Provider failures are fenced immediately, preventing double-spends and runaway retry costs.*

---

### Screenshot 6: Security Proving Ground (8 Attacks Defended)
- **Target URL:** `http://localhost:3000/control` (bottom section)
- **Visual Focus:** The `SECURITY PROVING GROUND (8 ATTACKS)` with all 8 attack buttons and active inspection of an attack:
  - 4-step pipeline: `1. ATTACK` &rarr; `2. DETECTION` &rarr; `3. DECISION (DENIED)` &rarr; `4. RESULT (BLOCKED)`
  - Badge: `8 / 8 DEFENDED`
- **Core Idea Communicated:** *All major agentic economic exploit vectors are blocked at the boundary by architectural invariants.*

---

### Screenshot 7: Bilateral Clearing & Milestone Settlement
- **Target URL:** `http://localhost:3000/economy/clearing`
- **Visual Focus:** The bilateral obligations ledger showing verified milestone completion, deliverable SHA-256 validation, unreserved budget release ($11.00 USDC returned to treasury), and zero fund leakage.
- **Core Idea Communicated:** *Settlement only occurs upon cryptographic deliverable proof, with automatic release of unused budget.*

---

### Screenshot 8: Autonomous Double-Entry Treasury
- **Target URL:** `http://localhost:3000/treasury`
- **Visual Focus:** Double-entry ledger breakdown:
  - Available Liquidity: `$81.50 USDC`
  - Reserved Liquidity: `$18.50 USDC`
  - Committed / Settled: `$18.50 USDC`
  - Mathematical balance verification: `Available + Reserved == Total Assets`
- **Core Idea Communicated:** *Every sub-agent payment requires an atomic double-entry reservation, preventing treasury insolvency.*

---

### Screenshot 9: Truthful Arc Mainnet Status
- **Target URL:** `http://localhost:3000/arc`
- **Visual Focus:** The Section 6 Truthful Arc Mainnet Status panel:
  - `Chain: 5042`
  - `RPC: CONNECTED (Block #22,572,770)`
  - `Native USDC: VERIFIED`
  - `AgentVault: NOT DEPLOYED (0x)`
  - `Live Execution: DISABLED`
  - `Real Settlements: 0 VERIFIED`
  - `Broadcasts: 0`
- **Core Idea Communicated:** *AgentPay maintains absolute truthfulness about blockchain connectivity with zero fabricated state.*

---

### Screenshot 10: Deterministic Failure Replay Controller
- **Target URL:** `http://localhost:3000/missions/msn_market_intel_01/replay`
- **Visual Focus:** The step-by-step scrubber showing full mission playback, provider failover transition from `FastInfer` to `BudgetAI`, and identical cryptographic trace hashes on every run.
- **Core Idea Communicated:** *Mission trajectories and recovery flows are 100% deterministic and reproducible on demand.*
