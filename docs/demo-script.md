# AgentPay Autonomous Economic Fabric v1.0 — Flagship Demo Script
**Document ID:** `docs/demo-script.md`  
**Flagship Demo:** "Autonomous Market Mission"  
**Scenario:** Resilient Multi-Agent Autonomous Sourcing & Settlement  
**Target Duration:** ~5 minutes  
**Target URL:** `/demo/economic-fabric` or CLI: `agentpay demo mission`  

---

## 1. Scenario Overview

An enterprise user tasks AgentPay with an autonomous objective:
> *"Research the cheapest reliable AI inference provider, analyze three benchmark sources, hire a summarization agent, and complete the report within a fixed budget of $5.00 USDC."*

This demonstration showcases the complete autonomous loop:
```
Objective → Blueprint → Simulation → Marketplace Discovery → Quotes & Matching
→ Hiring → Mission Execution → Runtime Failure Detection → Automatic Replanning
→ Policy Check → Treasury Reservation → PaymentIntent → Execution Gate
→ Settlement (Live Arc Canary or Simulation) → Result Verification
→ Double-Entry Clearing → Learning Feedback → Control Tower Live Trace
```

---

## 2. Minute-by-Minute Step Walkthrough

### [0:00 — 0:30] Step 1: User Objective Formulation
- **Action**: In the Control Tower UI (`/demo/economic-fabric`), the operator enters the natural language objective.
- **System Action**: `fabric.Compiler` creates an `EconomicObjective` (ID `obj_market_01`) and produces an `ExecutionBlueprint`.
- **UI Display**: The Objective card displays objective parameters:
  - Max Budget: $5.00 USDC (5,000,000 base units)
  - SLA: Latency < 2500ms, Accuracy > 95%
  - Required Roles: Inference Researcher, Summarizer, Critic.

### [0:30 — 1:00] Step 2: Digital Twin Economic Simulation
- **Action**: Before committing funds, the operator triggers *Simulate Blueprint*.
- **System Action**: `simulation.Engine` runs 100 Monte Carlo runs predicting:
  - Expected Cost: $0.85 USDC
  - Worst-Case Exposure: $1.40 USDC (well within $5.00 budget)
  - Projected Latency: 1450ms
  - Capital Adequacy Ratio: 4.8x
- **Safety Invariant**: Marked `SIMULATION` mode. Zero transactions broadcast.

### [1:00 — 1:40] Step 3: Marketplace Discovery & Negotiation
- **Action**: AgentPay queries the `marketplace` and `network` for candidate providers matching `ai.inference`.
- **System Action**:
  - Provider A (`agent_fast_infer`): Quotes $0.20 USDC, Latency 400ms, Trust 94%
  - Provider B (`agent_budget_ai`): Quotes $0.12 USDC, Latency 1100ms, Trust 91%
  - Provider C (`agent_ultra_deep`): Quotes $0.45 USDC, Latency 2200ms, Trust 99%
- **Deterministic Matcher**: Selects Provider B (`agent_budget_ai`) based on the lowest price cap within SLA. Contract `ctr_infer_01` and Obligation `ob_infer_01` created.

### [1:40 — 2:20] Step 4: Mission Begins & Provider Failure Injection
- **Action**: Mission begins. Task 1 initiates data query to Provider B.
- **Failure Injection**: Provider B times out / drops connection.
- **Runtime Reaction**:
  - `runtime.Service` detects lease timeout and missing heartbeat (`INV-101`).
  - Task transitions to `FAILED`.
  - Mission Engine triggers **Automatic Replanning** (`economy.Replanner`).
  - Replanner switches to Provider A (`agent_fast_infer`) without exceeding the budget.

### [2:20 — 3:00] Step 5: Deliverable Completion & Verification
- **Action**: Provider A delivers the inference analysis report.
- **Critic Verification**: Swarm Critic agent runs cryptographic hash check on deliverable output (`verification_hash == hash(deliverable)`).
- **Result**: SLA verified. Task marked `COMPLETED`.

### [3:00 — 3:45] Step 6: The Financial Execution Gate
- **Action**: Payment requested for Provider A ($0.20 USDC).
- **Policy Check**: Evaluated by Rust engine in 6.3 µs:
  - Within $5.00 daily budget (Current: $0.20 / $5.00)
  - Within $0.50 transaction limit
  - Recipient allowlisted (`0x7099...79C8`)
  - Decision: **ALLOW** (Risk Score: 12 - LOW).
- **Treasury Reservation**: Liquidity reserved in `AgentVault` pool ($0.20 encumbered).
- **Execution Gate**: `PaymentIntent` ID `pi_demo_01` transitions to `AUTHORIZED` then `SUBMITTED`.

### [3:45 — 4:15] Step 7: Settlement & Clearing
- **On-Chain Settlement**:
  - *If Live Arc is configured*: Gateway signer submits EIP-1559 transaction to Arc Mainnet (Chain ID 5042). Mined receipt confirmed.
  - *If in Test/Local Environment*: Clearly displayed as **DETERMINISTIC SIMULATION / TEST ENVIRONMENT** with zero fake hashes or mock balances.
- **Clearinghouse**: Obligation `ob_infer_01` marked `SETTLED`. Treasury encumbrance consumed.

### [4:15 — 4:45] Step 8: Economic Memory & Learning Update
- **Action**: System logs telemetry into `service_telemetry`.
- **System Action**:
  - Provider B reliability score reduced (penalty for timeout).
  - Provider A trust score increased to 96%.
  - Future missions automatically factor in Provider B's reduced reliability.

### [4:45 — 5:00] Step 9: The Live Economic Trace
- **Action**: Operator opens the Live Economic Trace in the Control Tower (`/control` or `/trace`).
- **Inspection**: Complete causal graph rendered:
  `Objective (obj_market_01) → Mission (mis_01) → Task (tsk_01) → Provider (agent_fast_infer) → Contract (ctr_infer_01) → Obligation (ob_infer_01) → Policy (ALLOW) → Treasury (res_01) → PaymentIntent (pi_demo_01) → Arc Transaction → Reconciliation`.
- Operator can inspect exact timestamps, causation IDs, policy rules, and cryptographic proofs at every step.
