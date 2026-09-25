# AGENTPAY BUILD-FIRST DEMONSTRATION SUITE
## Deterministic Flagship Mission, Failure Recovery, and Malicious Agent Proving Ground

**Document Status:** Verified & Executable  
**Environment:** Simulation / Development Mode  
**Arc Mainnet Status:** UNDEPLOYED  
**Live Execution:** DISABLED (`ENABLE_LIVE_EXECUTION=false`)  
**Broadcast:** NONE  

---

## 1. Overview & Operating Principles

This document provides the canonical specification and verification evidence for AgentPay's deterministic flagship demonstration: the **"Autonomous Market Intelligence Mission"**.

### Non-Negotiable Axioms
1. **Simulation $\neq$ Live:** All outcomes in this demo operate on deterministic digital twin adapters. Zero transactions are broadcast to Arc, zero private keys are accessed, and zero real balances mutate.
2. **Failure Does Not Create Financial Authority:** A provider failure, worker crash, or replanning cycle **CANNOT** increase spending limits, mission budgets, agent authorities, recipient allowances, or constitutional policies.
3. **The Core Invariant:**
   $$\text{AUTONOMY CAN EXPAND. FINANCIAL AUTHORITY CANNOT.}$$

---

## 2. Flagship Scenario: "Autonomous Market Intelligence Mission"

### 2.1 The 20 Canonical Steps

```
[User Intent] 
     ↓
[Economic Objective] 
     ↓
[Planner DAG Blueprint] 
     ↓
[Marketplace Discovery] 
     ↓
[Structured Quotes] 
     ↓
[Deterministic Matching] 
     ↓
[Rust Policy Evaluation] 
     ↓
[Treasury Simulated Reservation] 
     ↓
[Mission Execution Begins] 
     ↓
[Provider Heartbeat Failure] 
     ↓
[Durable Runtime Detection & Fencing] 
     ↓
[Controlled Replanning & Substitution] 
     ↓
[Replacement Provider Execution] 
     ↓
[Critic SHA-256 Quality Evaluation] 
     ↓
[Clearinghouse Simulated Obligation] 
     ↓
[Multilateral Settlement Plan] 
     ↓
[Projected Arc Settlement] 
     ↓
[Mission Completed & Memory Updated] 
     ↓
[Control Tower Unified Trace] 
     ↓
[FINAL SCREEN: SIMULATION — NO FUNDS MOVED]
```

### 2.2 Step-by-Step Execution Trace

| Step | Lifecycle Stage | System Action | Financial & Invariant State |
| :---: | :--- | :--- | :--- |
| **1** | **User Mission Request** | User specifies: *"Research the current market landscape for a specified technology within 50.00 USDC cap."* | Authority: Restricted to authenticated user. |
| **2** | **Objective Creation** | Fabric mints `obj_market_intel_01` with hard budget cap `25.00 USDC` and deadline SLA `300s`. | Invariant `INV-142`: Envelope bounded by objective. |
| **3** | **Planner Decomposition** | ObjectiveCompiler parses objective into an acyclic DAG with 3 tasks: `task_scan`, `task_analyze`, `task_report`. | Immutable `ExecutionBlueprint` compiled (`v1`). |
| **4** | **Provider Discovery** | Marketplace queries active directory for `market-intel` capability. Discovers 3 candidate agents: `agent_fast_infer`, `agent_budget_ai`, `agent_ultra_deep`. | Tenant boundary strictly preserved (`INV-189`). |
| **5** | **Structured Quotes** | Candidates return signed quotes: `agent_fast_infer` ($12.50), `agent_budget_ai` ($14.00), `agent_ultra_deep` ($28.00). | Quote validity and expiration verified (`INV-187`). |
| **6** | **Deterministic Matching** | Matcher scores candidates. `agent_ultra_deep` is disqualified ($28.00 > $25.00 cap). `agent_fast_infer` selected (#1 rank, 99.4% historical completion). | Invariant `INV-181`: Matching cannot authorize payment. |
| **7** | **Policy Evaluation** | Rust Policy Engine evaluates proposed spending against organization and agent policy limits. | Evaluated in **6.36 µs** $\rightarrow$ `ALLOW`. `INV-182` preserved. |
| **8** | **Treasury Reservation** | Treasury ledger creates simulated reservation for 14.00 USDC. | Invariant `INV-76`: Simulated funds isolated from real funds. |
| **9** | **Mission Launch** | Durable runtime spawns worker and initiates workflow execution. | Task status transitions to `RUNNING`. |
| **10** | **Provider Failure** | `agent_fast_infer` experiences simulated worker failure (lease timeout $>2000\text{ ms}$ heartbeat missing). | Incident injected deterministically. |
| **11** | **Failure Detection** | Runtime heartbeat monitor detects missed lease. Worker lease fencing token revoked (`INV-101`). | Payment is **NOT** blindly retried (`INV-103`). Budget 100% preserved. |
| **12** | **Controlled Replanning** | ControlledReplanner isolates failed task and selects fallback `agent_budget_ai` (Quote: 14.00 USDC). | Invariants `INV-143`, `INV-148`: Replanned cost $\le$ original envelope. |
| **13** | **Task Completion** | Replacement provider `agent_budget_ai` executes and delivers market intelligence report. | Task duration: 850 ms. Status: `COMPLETED`. |
| **14** | **Critic Evaluation** | Critic Agent cryptographically verifies deliverable SHA-256 checksum and scores quality (94/100). | Quality Gate S4 passed; deliverable accepted. |
| **15** | **Clearinghouse Obligation** | Bilateral clearing obligation generated for 14.00 USDC. | Invariant `INV-195`: Single non-duplicate obligation. |
| **16** | **Settlement Plan** | Bilateral netting calculated. Unused 11.00 USDC returned to available treasury liquidity. | Invariant `INV-84`: Zero fund creation; exact ledger balance. |
| **17** | **Projected Settlement** | Simulator generates projected settlement payload for Arc Mainnet (Chain ID 5042, Native USDC). | Unbroadcast trace ID: `sim_trace_intel_01`. |
| **18** | **Mission Completion** | Objective marked `COMPLETED`. Empirical reliability score updated in `EconomicMemory`. | Invariant `INV-191`: Contextual metrics updated. |
| **19** | **Control Tower Display** | Unified 18-stage end-to-end causal trace rendered on operator dashboard. | Operator inspects why decisions were made. |
| **20** | **Final State Declaration** | Final screen explicitly renders: **`SIMULATION — NO FUNDS MOVED`** | Invariant `INV-156`: Real Arc state remains completely unmutated. |

---

## 3. Failure & Recovery Demo: Authority Invariance

The flagship simulation visibly proves that **failure never expands financial authority**.

### 3.1 Failure Invariant Matrix

| System Event | What an Adversary Might Attempt | How AgentPay Enforces Authority Invariance | Result |
| :--- | :--- | :--- | :--- |
| **Provider Crash** | Request extra budget to retry on expensive provider | `ValidateINV143` checks new blueprint cost $\le$ original envelope | **BLOCKED** |
| **Worker Lease Expiry** | Stale worker attempts to commit result and claim payment | `CheckLeaseFencing` revokes expired worker token (`INV-101`) | **BLOCKED** |
| **Policy Rejection** | Workflow engine converts policy `DENY` into a silent retry | `CheckPolicyDenyRetry` halts on hard deny (`INV-103`) | **BLOCKED** |
| **Recovery Escalation** | Recovery queue asks for elevated spending authority | `CheckZeroRecoveryAuthority` strictly enforces zero authority (`INV-102`) | **BLOCKED** |
| **Provider Substitution** | Swap in an unvetted or blacklisted third-party agent | `ValidateINV146` requires replacement provider on policy allowlist | **BLOCKED** |

---

## 4. Malicious Agent / Provider Demo: 8 Attack Vectors

AgentPay includes an automated proving ground demonstrating that 8 distinct adversarial attack vectors fail closed:

### 4.1 Attack Vector 1: Recipient Substitution
- **Attack Scenario:** A compromised provider attempts to redirect its milestone payment to an arbitrary external address: `0xdead00000000000000000000000000000000beef`.
- **Enforced Rules:**
  - `INV-186`: Marketplace cannot award to raw hex address; recipient must resolve to an approved directory agent identifier.
  - `INV-146`: Provider substitution without policy revalidation is strictly prohibited.
- **Outcome:** **`BLOCKED (HARD DENY)`** — Recipient remains locked to original contract party; zero funds moved.

### 4.2 Attack Vector 2: Budget Escalation
- **Attack Scenario:** An autonomous agent attempts to self-increase its economic envelope budget mid-execution from 18.50 USDC to 100.00 USDC.
- **Enforced Rules:**
  - `INV-148`: `EconomicEnvelope` cannot self-increase under any circumstances.
  - `INV-185`: Proposed price exceeds authorized budget cap.
  - `INV-141`: `EconomicFabric` cannot authorize payment or increase spending limits.
- **Outcome:** **`BLOCKED (HARD DENY)`** — Budget remains locked at 18.50 USDC.

### 4.3 Attack Vector 3: Policy Modification
- **Attack Scenario:** A malicious workflow script attempts to alter policy rules at runtime, setting `max_spend_limit = UNLIMITED`.
- **Enforced Rules:**
  - `INV-109`: Runtime orchestrator cannot modify deterministic policy rules.
  - `INV-110`: Constitutional authority cannot be modified without cold multisig governance.
  - `INV-149`: Risk envelope cannot weaken Constitution.
- **Outcome:** **`BLOCKED (HARD DENY)`** — Policy Constitution remains immutable; hash verification fails.

### 4.4 Attack Vector 4: Arbitrary Calldata Injection
- **Attack Scenario:** A compromised node attempts to invoke arbitrary smart contract functions directly on `AgentVault`.
- **Enforced Rules:**
  - `INV-21`: Authorized signer is cryptographically bound to canonical `PaymentIntent` ABI schema.
  - `INV-108`: Runtime components cannot hold private keys or directly invoke `AgentVault`.
- **Outcome:** **`BLOCKED (HARD DENY)`** — Agent holds 0 private keys; calldata rejected at boundary gate.

### 4.5 Attack Vector 5: Payment Outside Quote
- **Attack Scenario:** A provider completes a task and submits an invoice claiming 35.00 USDC against an agreed quote of 18.50 USDC.
- **Enforced Rules:**
  - `INV-164`: Settlement payout must strictly equal agreed quote value.
  - `INV-142`: Compiler output cannot exceed objective constraints.
- **Outcome:** **`BLOCKED (HARD DENY)`** — Over-budget claim rejected; payout locked to contract value (18.50 USDC).

### 4.6 Attack Vector 6: Replay Attack
- **Attack Scenario:** An attacker captures a settled payment intent and attempts to replay the transaction hash and idempotency token to double-claim funds.
- **Enforced Rules:**
  - `INV-6`: Idempotency keys are globally unique and permanently recorded.
  - `INV-112`: Duplicate external callbacks must be idempotent.
  - `INV-118`: Dangerous operator commands require fresh idempotency validation.
- **Outcome:** **`BLOCKED (HARD DENY)`** — Idempotency hit returns existing transaction record; zero duplicate funds released.

### 4.7 Attack Vector 7: Duplicate Settlement
- **Attack Scenario:** Concurrent threads trigger simultaneous settlement batches against the same clearing obligation.
- **Enforced Rules:**
  - `INV-113`: Duplicate financial commands cannot create duplicate payment intents.
  - `INV-194`: Duplicate award cannot create duplicate contract.
  - `INV-77`: Double release or double consumption is physically impossible in the ledger FSM.
- **Outcome:** **`BLOCKED (HARD DENY)`** — Mutex lock and obligation state machine reject second settlement.

### 4.8 Attack Vector 8: Forged Completion Checksum
- **Attack Scenario:** A provider submits a task completion claim with a fabricated deliverable hash (`0x0000...fake`).
- **Enforced Rules:**
  - `INV-162`: Milestone settlement requires valid SHA-256 cryptographic verification from Critic Agent.
  - Quality Gate S4: Evaluator score must exceed acceptance threshold before funds unlock.
- **Outcome:** **`BLOCKED (HARD DENY)`** — Critic rejects deliverable; obligation remains unsettled; zero funds released.

---

## 5. How to Run the Demos

### 5.1 CLI Execution

```bash
# Run the 20-step Flagship Mission Demo
agentpay demo mission

# Run the Flagship Mission Demo with machine-readable JSON
agentpay demo mission --json

# Run the 8 Malicious Provider Security Scenarios
agentpay demo security

# Run Security Scenarios in JSON format
agentpay demo security --json
```

### 5.2 Web Control Tower Execution

1. Navigate to: `http://localhost:3000/demo/economic-fabric`
2. **Step 1:** Enter or accept the natural language objective. Click **`SIMULATE OBJECTIVE →`**.
3. **Step 2:** Review the Pre-Flight Digital Twin simulation. Verify the `SIMULATION ONLY (INV-156: NO REAL MONEY)` badge. Click **`START AUTONOMOUS EXECUTION →`**.
4. **Step 3:** Watch real-time execution DAG. Click **`Simulate Worker Crash`** to inject an intentional failure.
5. **Step 4:** Observe the Durable Runtime isolate the failure and click **`AUTONOMOUS RECOVER & REPLAN (INV-145) →`**.
6. **Step 5:** Review the final completion screen verifying:
   - `SIMULATION — NO FUNDS MOVED`
   - `Arc Mainnet (5042): UNDEPLOYED`
   - `Deterministic Trace: sim_trace_intel_01`
7. **Step 6:** Click each of the 8 buttons under **ATTACK VECTOR PROVING GROUND** to verify that all 8 malicious attempts result in **`BLOCKED (HARD DENY)`**.
8. **Reset:** Click **`Reset Demo`** to restart the deterministic loop.
