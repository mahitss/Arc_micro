# AgentPay — Final Screenshot Submission Checklist

This checklist defines the 12 canonical submission screenshots required for the hackathon evaluation package. Each screenshot must be captured in a clean browser window (1920x1080 resolution, dark matte black theme, no console errors, no developer overlays) reflecting 100% verified system state.

---

### Screenshot 1: Control Tower Hero
- **Target URL:** `http://localhost:3000/control` (above the fold)
- **Visual Focus:** System status banner showing `SIMULATION — NO FUNDS MOVED`, `ARC: CONNECTED (Block #23.4M+)`, `AGENTVAULT: NOT DEPLOYED`, `REAL SETTLEMENTS: 0 VERIFIED`.
- **Core Concept:** Transparent, truthful operator status with zero fake deployment claims.

### Screenshot 2: Mission Command Center
- **Target URL:** `http://localhost:3000/missions/demo/replay`
- **Visual Focus:** 22-step progress scrubber, active transport playback bar (`PLAY`, `PAUSE`, `STEP`, `RESET`), and real-time state machine badge (`PLANNING`, `EXECUTING`, `COMPLETED`).
- **Core Concept:** Deterministic autonomous mission lifecycle execution.

### Screenshot 3: AI vs. Authority Boundary
- **Target URL:** `http://localhost:3000/missions/demo/replay` (Synchronized Inspector → "Why / Why Not?" Tab)
- **Visual Focus:** The visual boundary separating AI recommendation (Advisory) from AgentPay authorization (Deterministic Policy).
- **Core Concept:** Cognitive advice is untrusted; financial authority is strictly deterministic.

### Screenshot 4: Malicious Provider Blocked (HARD_DENY)
- **Target URL:** `http://localhost:3000/missions/demo/replay` (Step 13 highlighted in Red)
- **Visual Focus:** The `PAYMENT_BLOCKED` inspector card showing `HARD_DENY (INV-146 / INV-186)`, attempted recipient substitution, and `FUNDS MOVED: $0.00 USDC`.
- **Core Concept:** Adversarial recipient swap is completely blocked by architectural invariants.

### Screenshot 5: Service Marketplace
- **Target URL:** `http://localhost:3000/marketplace`
- **Visual Focus:** Candidate listings showing specialist agents, verified capability tags, SLA latencies, and base unit pricing.
- **Core Concept:** Open discovery and competitive quoting for autonomous machine-to-machine commerce.

### Screenshot 6: Agent Network Graph
- **Target URL:** `http://localhost:3000/network`
- **Visual Focus:** Directed topological graph showing multi-agent swarm relationships and communication channels.
- **Core Concept:** Multi-agent coordination with bounded acyclic dependencies.

### Screenshot 7: Treasury Orchestrator & Liquidity Reserves
- **Target URL:** `http://localhost:3000/treasury`
- **Visual Focus:** Double-entry ledger balances, active encumbered reservations, and capital adequacy ratio.
- **Core Concept:** Atomic treasury encumbrance preventing cross-agent liquidity race conditions.

### Screenshot 8: Autonomous Clearinghouse & Debt Netting
- **Target Route:** `http://localhost:3000/economy/clearing`
- **Visual Focus:** Multilateral debt netting cycles showing gross bilateral obligations compressed into single net settlement proposals.
- **Core Concept:** 40–70% liquidity savings through graph netting cycles before on-chain settlement.

### Screenshot 9: Economic Simulator & Digital Twin
- **Target URL:** `http://localhost:3000/simulator`
- **Visual Focus:** Monte Carlo cost distribution curve, worst-case exposure bounds, and pre-execution feasibility check.
- **Core Concept:** Digital twin modeling protecting capital before execution begins.

### Screenshot 10: Security & Constitutional Governance
- **Target URL:** `http://localhost:3000/constitution` (or `/security`)
- **Visual Focus:** 7-tier constitutional policy hierarchy tree showing monotonic authority tightening (`GLOBAL → PAYMENT`).
- **Core Concept:** Invariant rules that cannot be weakened by downstream tasks or human overrides.

### Screenshot 11: Arc Settlement & Consensus Panel
- **Target URL:** `http://localhost:3000/arc`
- **Visual Focus:** Settlement infrastructure status cards: Chain ID 5042, Native USDC contract, 0x bytecode on AgentVault, 0 real settlements.
- **Core Concept:** Authoritative Layer-1 consensus and truthful simulation status.

### Screenshot 12: Universal AI Provider Layer
- **Target URL:** `http://localhost:3000/settings/ai`
- **Visual Focus:** OpenRouter provider configuration, 8 task routing profiles, fallback cascade array, and read-only tool contracts.
- **Core Concept:** Model-agnostic AI intelligence isolated behind read-only tool boundaries.
