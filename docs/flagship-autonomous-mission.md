# Flagship End-to-End Autonomous Economic Mission: Autonomous Market Intelligence

> **Canonical Scenario Identifier:** `msn_market_intel_001`  
> **Deterministic Seed:** `agentpay-demo-001`  
> **Execution Mode:** `SIMULATION — NO FUNDS MOVED`  
> **Core Axiom:** *AI Requests. AgentPay Controls. Arc Settles.*  
> **Authority Principle:** *Autonomy can expand. Financial authority cannot.*

---

## 1. Executive Objective

A human or institutional operator provides AgentPay with a high-level economic objective:

```text
"Produce a high-confidence market intelligence report using the best available 
autonomous research providers while staying within a fixed economic budget of $25.00 USDC, 
validating deliverables prior to clearing, and recovering automatically if a provider fails."
```

### Strategic Objective Constraints
- **Economic Budget Envelope:** Maximum $25.00 USDC.
- **Risk Tolerance Envelope:** LOW (Maximum single-task concentration < 30%, zero unverified counterparties).
- **Required Capabilities:** `market-intel`, `benchmarking`, `critic-validation`, `synthesis`.
- **Operating Mode:** Strictly `DETERMINISTIC_SIMULATION`.
- **Settlement Plane Target:** Arc Chain ID `5042` (Simulated trace only; 0 on-chain funds disbursed).

---

## 2. End-to-End Architecture

AgentPay functions as the institutional financial control plane mediating between untrusted autonomous AI models, a decentralized Agent-to-Agent (A2A) marketplace, and the Arc settlement layer.

```mermaid
flowchart TD
    subgraph AI_Advisory_Plane [AI ADVISORY PLANE (Zero Authority)]
        A[Operator Intent] --> B[AI Planner / Claude 3.5 Sonnet]
        B --> C[DAG Task Compilation]
        C --> D[Marketplace Discovery]
        D --> E[Provider Quote Comparison]
        E --> F[AI Recommendation: Provider B]
    end

    subgraph AgentPay_Control_Plane [AGENTPAY CONTROL PLANE (Authoritative Gates)]
        F --> G{Policy Gate: Rust Engine}
        G -- ALLOW (<10µs) --> H{Risk Gate: Concentration}
        H -- PASS (Score 18/100) --> I{Approval Gate}
        I -- AUTO (<$50 Threshold) --> J[Treasury Liquidity Reservation]
        J --> K[Clearinghouse Obligation: $3.60]
        K --> L[Execution Gate Pre-Flight]
    end

    subgraph Adversarial_Interception [SECURITY PROVING GROUND]
        L --> M[Malicious Recipient Swap Attempt]
        M --> N{Gate: Recipient Check}
        N -- HARD DENY --> O[0xdead...beef Blocked / Fenced]
        O --> P[Runtime Timeout Detected]
    end

    subgraph Adaptive_Recovery [AUTONOMOUS RECOVERY & REPLANNING]
        P --> Q[Economic Observation Recorded]
        Q --> R[AI Adaptive Replan: Switch to Provider C]
        R --> S{Authority Revalidation Gate}
        S -- ALLOW ($8.50 <= $25.00 Cap) --> T[Treasury Re-Encumbrance: +$4.50]
        T --> U[Provider C Delivery]
        U --> V{Critic Quality Gate}
        V -- PASS (Score 94/100) --> W[Clearinghouse Bilateral Netting]
    end

    subgraph Settlement_Boundary [SETTLEMENT PLANE]
        W --> X[Simulated Arc Settlement: Chain 5042]
        X --> Y[Mission Complete: $16.50 Unencumbered Return]
    end
```

---

## 3. Canonical 22-Step Execution Flow

The canonical mission timeline executes 22 deterministic events chained by strict `causation_id` and `correlation_id` hashes:

| # | Event ID | Canonical State | Actor | Action | Decision / Status | Financial Impact |
|---|---|---|---|---|---|---|
| 01 | `evt_01_created` | `CREATED` | Operator | Initialize Autonomous Objective | SUCCESS | $25.00 USDC Cap |
| 02 | `evt_02_plan` | `PLANNING` | AI Planner | Decompose Objective into Task Graph DAG | SUCCESS | $0.00 (Unchanged) |
| 03 | `evt_03_discovery` | `DISCOVERING` | A2A Registry | Discover 4 Specialist Agent Candidates | SUCCESS | $0.00 |
| 04 | `evt_04_quotes` | `QUOTING` | Marketplace | Ingest Quotes (Alpha $4, Beta $3.60, Gamma $4.50) | SUCCESS | $0.00 |
| 05 | `evt_05_compare` | `SELECTING` | AI Advisory | Compare Quotes & Propose Provider B | PROPOSED | $3.60 Advisory |
| 06 | `evt_06_select` | `SELECTING` | AgentPay Gate | Authorize Candidate Provider B Selection | AUTHORIZED | $3.60 Bound |
| 07 | `evt_07_negotiate` | `NEGOTIATING` | A2A Protocol | Finalize Bilateral SLA Terms | SUCCESS | $3.60 Bound |
| 08 | `evt_08_policy` | `POLICY_CHECK` | Rust Policy Engine | Evaluate Rule #1 Allowlist & Rule #2 Budget | ALLOW (6.36µs) | $0.00 Moved |
| 09 | `evt_09_risk` | `RISK_CHECK` | Risk Engine | Assess Counterparty & 14.4% Concentration | PASS (Score 18) | $0.00 Moved |
| 10 | `evt_10_treasury` | `TREASURY_RESERVATION` | Treasury Ledger | Encumber Simulated Liquidity Buffer | RESERVED | $3.60 Encumbered |
| 11 | `evt_11_payment_req` | `EXECUTING` | Execution Gate | Construct PaymentIntent for Provider B | PENDING | $3.60 Pending |
| 12 | `evt_12_sec_violation` | `SECURITY_BLOCK` | Security Guard | Detect Recipient Substitution Attempt | ATTACK DETECTED | $0.00 Moved |
| 13 | `evt_13_pay_blocked` | `SECURITY_BLOCK` | Security Guardrail | HARD DENY: Intercept Attacker Wallet | HARD DENY | $0.00 Moved |
| 14 | `evt_14_prov_fail` | `PROVIDER_FAILURE` | Runtime Monitor | Detect Provider B Lease Timeout (>2000ms) | TIMEOUT DETECTED | $0.00 Moved |
| 15 | `evt_15_replan_req` | `REPLANNING` | AI Adaptive Loop | Propose Replan: Switch to Provider C | PROPOSAL | $4.50 Proposed |
| 16 | `evt_16_alt_select` | `RECOVERY` | AgentPay Gate | Authorize Replacement Provider C | AUTHORIZED | $4.50 Authorized |
| 17 | `evt_17_pay_reauth` | `EXECUTING` | Treasury Engine | Re-Encumber Liquidity (Total $8.50 <= $25 Cap) | AUTHORIZED | $8.50 Encumbered |
| 18 | `evt_18_result_rec` | `VALIDATING` | Provider C Service | Deliver Institutional Research Report | DELIVERED | $0.00 Moved |
| 19 | `evt_19_result_val` | `VALIDATING` | Critic Agent | Validate Deliverable Quality & Schema | PASS (Score 94) | $0.00 Moved |
| 20 | `evt_20_clearing` | `CLEARING` | Clearinghouse | Record Bilateral Obligations & Netting | RECORDED | $8.50 Net |
| 21 | `evt_21_settlement` | `SETTLEMENT_READY` | Arc Simulator | Generate Projected Settlement Trace | SIMULATED | $0.00 Disbursed |
| 22 | `evt_22_complete` | `COMPLETED` | Economic Fabric | Finalize Mission & Return Unencumbered | SUCCESS | $16.50 Returned |

---

## 4. Key Failure Scenario & Deterministic Interception

A key requirement of the flagship demonstration is proving that AgentPay detects and intercepts failures and malicious behavior deterministically.

### A. The Attack Vector: Unauthorized Recipient Substitution
- **Attack Moment:** At Event 12 (`evt_12_sec_violation`), an adversarial actor attempts to alter the payment intent destination from `service_registry:provider-b` to an unallowlisted external address:
  `0xdead00000000000000000000000000000000beef`.
- **Interception:** The Execution Gate intercepts the raw hex recipient before signing.
- **Enforced Rules:** 
  - `INV-186`: Raw hex destinations are prohibited; destinations must resolve to verified service registry records.
  - `INV-146`: Dynamic recipient substitution mid-flight triggers immediate hard denial.
- **Outcome:** **`HARD DENY`**. Zero funds moved. Reservation immediately revoked. Override impossible.

### B. The Runtime Fault: Provider Heartbeat Lease Expiry
- **Fault Moment:** Concurrently, Provider B fails to report a heartbeat within the 2000ms SLA lease.
- **Detection:** The Durable Runtime Monitor marks Event 14 (`evt_14_prov_fail`) with status `TIMEOUT_DETECTED`.
- **Enforced Invariants:**
  - `INV-101`: Stale worker is fenced from committing deliverables or claiming funds.
  - `INV-103`: Blind retry to the same failing worker is strictly prohibited.

---

## 5. Autonomous Replanning & Revalidation

When Provider B fails, AgentPay triggers an autonomous adaptive recovery cycle:

1. **AI Adaptive Proposal:** The AI model (Claude 3.5 Sonnet) analyzes the task graph failure and proposes a revised plan substituting Provider B ($3.60) with Provider C ($4.50).
2. **Budget Verification:** The marginal cost is `+$0.90 USDC`. The new total mission expenditure ($4.00 Provider A + $4.50 Provider C = $8.50 USDC) is checked against the $25.00 budget ceiling.
3. **Immutable Authority Boundary:** While the AI is allowed to adapt the operational graph, it has **zero authority** to expand the $25.00 financial envelope.
4. **Revalidation Gates (No Stale Pass-Through):**
   - **Policy Gate:** Evaluated afresh for Provider C (`POL-001`, `ALLOW`).
   - **Risk Gate:** Evaluated afresh for Provider C (Score 22/100, `LOW_RISK`).
   - **Liquidity Gate:** Evaluated afresh in Treasury Mutex ($8.50 encumbered, `HEALTHY`).
   - **Recipient Gate:** Verified against `service_registry:provider-c`.

---

## 6. Financial Authority Boundary vs. Simulation Boundary

AgentPay enforces two non-negotiable architectural boundaries:

### Boundary 1: AI vs. Financial Control
```text
┌──────────────────────────────────────────────────────────┐
│                   AI ADVISORY PLANE                      │
│ - Claude 3.5 Sonnet / Llama 3.3 70B                      │
│ - OpenRouter Proxy Layer                                 │
│ - Generates structured JSON recommendations              │
│ - CANNOT authorize funds                                 │
│ - CANNOT sign transactions                               │
│ - CANNOT modify constitutional policies                  │
└────────────────────────────┬─────────────────────────────┘
                             │ ADVISORY PROPOSALS ONLY
                             ▼
┌──────────────────────────────────────────────────────────┐
│                AGENTPAY CONTROL PLANE                    │
│ - Rust Policy Engine (<10µs allowlist / budget)          │
│ - Quantitative Risk Engine                               │
│ - Treasury Ledger Mutex (Zero unreserved spend)          │
│ - Execution Gate (Pre-flight validation)                 │
│ - Clearinghouse (Bilateral double-entry balance)         │
└──────────────────────────────────────────────────────────┘
```

### Boundary 2: Simulation vs. Live Execution
```text
┌──────────────────────────────────────────────────────────┐
│                  SIMULATION BOUNDARY                     │
│ - Mode: DETERMINISTIC_SIMULATION                         │
│ - Label: SIMULATION — NO FUNDS MOVED                     │
│ - Private Keys Loaded: 0                                 │
│ - Signatures Generated: 0                                │
│ - Broadcast Status: NONE                                 │
│ - AgentVault Deployment: UNDEPLOYED                      │
│ - Real Arc Settlements: 0                                │
│ - Treasury Impact: Isolated simulated ledger             │
│ - Reputation Impact: Isolated simulation memory          │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Automated Test Suite (30 Canonical Invariants)

The test suite explicitly asserts all 30 invariants across the Go gateway engine and the TypeScript web client:

| Test # | Invariant Verified | Gateway Test (Go) | Frontend Test (Node) | Status |
|---|---|---|---|---|
| 01 | Objective Creation ($25.00 USDC cap) | `TestFlagshipE2E_01_ObjectiveCreation` | `01. Objective Creation` | **PASS** |
| 02 | Blueprint Compilation (AI advisory DAG) | `TestFlagshipE2E_02_BlueprintCompilation` | `02. Blueprint Compilation` | **PASS** |
| 03 | Agent Discovery (4 candidates) | `TestFlagshipE2E_03_AgentDiscovery` | `03. Agent Discovery` | **PASS** |
| 04 | Quote Generation (Supported fields) | `TestFlagshipE2E_04_QuoteGeneration` | `04. Quote Generation` | **PASS** |
| 05 | Deterministic Selection (Provider B lowest) | `TestFlagshipE2E_05_DeterministicSelection` | `05. Deterministic Selection` | **PASS** |
| 06 | Policy Evaluation (Rust Engine <10µs) | `TestFlagshipE2E_06_PolicyEvaluation` | `06. Policy Evaluation` | **PASS** |
| 07 | Risk Evaluation (Score 18/100 LOW) | `TestFlagshipE2E_07_RiskEvaluation` | `07. Risk Evaluation` | **PASS** |
| 08 | Approval Boundary (<$50 auto-threshold) | `TestFlagshipE2E_08_Approval` | `08. Approval` | **PASS** |
| 09 | Liquidity Encumbrance ($3.60 reserved) | `TestFlagshipE2E_09_Liquidity` | `09. Liquidity` | **PASS** |
| 10 | Clearinghouse Obligation Registration | `TestFlagshipE2E_10_Obligation` | `10. Obligation` | **PASS** |
| 11 | Clearing Double-Entry Balance (Debits = Credits) | `TestFlagshipE2E_11_Clearing` | `11. Clearing` | **PASS** |
| 12 | Execution Gate Pre-Flight Check | `TestFlagshipE2E_12_ExecutionGate` | `12. Execution Gate` | **PASS** |
| 13 | Simulation Settlement (0 funds moved) | `TestFlagshipE2E_13_SimulationSettlement` | `13. Simulation Settlement` | **PASS** |
| 14 | Result Failure (Timeout & recipient swap) | `TestFlagshipE2E_14_ResultFailure` | `14. Result Failure` | **PASS** |
| 15 | Economic Memory (Isolated failure record) | `TestFlagshipE2E_15_EconomicMemory` | `15. Economic Memory` | **PASS** |
| 16 | Replanning (AI adaptive proposal) | `TestFlagshipE2E_16_Replanning` | `16. Replanning` | **PASS** |
| 17 | Provider Substitution (Provider C authorized) | `TestFlagshipE2E_17_ProviderSubstitution` | `17. Provider Substitution` | **PASS** |
| 18 | Policy Revalidation (Fresh evaluation) | `TestFlagshipE2E_18_PolicyRevalidation` | `18. Policy Revalidation` | **PASS** |
| 19 | Risk Revalidation (Fresh risk score) | `TestFlagshipE2E_19_RiskRevalidation` | `19. Risk Revalidation` | **PASS** |
| 20 | Liquidity Revalidation ($8.50 <= $25 cap) | `TestFlagshipE2E_20_LiquidityRevalidation` | `20. Liquidity Revalidation` | **PASS** |
| 21 | Successful Second Provider (Deliverable received) | `TestFlagshipE2E_21_SuccessfulSecondProvider` | `21. Successful Second Provider` | **PASS** |
| 22 | Final Objective Completion ($16.50 returned) | `TestFlagshipE2E_22_FinalObjectiveCompletion` | `22. Final Objective Completion` | **PASS** |
| 23 | Simulation Isolation (Provenance labeling) | `TestFlagshipE2E_23_SimulationIsolation` | `23. Simulation Isolation` | **PASS** |
| 24 | No Signing (Zero private keys/signatures) | `TestFlagshipE2E_24_NoSigning` | `24. No Signing` | **PASS** |
| 25 | No Broadcasting (Broadcast == NONE) | `TestFlagshipE2E_25_NoBroadcasting` | `25. No Broadcasting` | **PASS** |
| 26 | No AgentVault Mutation (Undeployed state) | `TestFlagshipE2E_26_NoAgentVaultMutation` | `26. No AgentVault Mutation` | **PASS** |
| 27 | Deterministic Replay (Bitwise checksum match) | `TestFlagshipE2E_27_DeterministicReplay` | `27. Deterministic Replay` | **PASS** |
| 28 | Reset Functionality (Step 0 restoration) | `TestFlagshipE2E_28_Reset` | `28. Reset` | **PASS** |
| 29 | Duplicate Execution Protection (Causation chain) | `TestFlagshipE2E_29_DuplicateExecutionProtection` | `29. Duplicate Execution Protection` | **PASS** |
| 30 | HARD_DENY Cannot Be Overridden | `TestFlagshipE2E_30_HardDenyCannotBeOverridden` | `30. HARD_DENY Cannot Be Overridden` | **PASS** |

---

## 8. Build & Verification Results

All tests across every subsystem in the repository were executed and passed cleanly:

- **Frontend Tests (`apps/web`):**
  - Command: `npm test`
  - Result: **510 passed / 510 total** (154 test suites)
  - Duration: 1.89 seconds
- **TypeScript Static Verification:**
  - Command: `npx tsc --noEmit`
  - Result: **0 errors**
- **Next.js Production Build:**
  - Command: `npm run build`
  - Result: **80/80 routes statically and dynamically compiled**
- **Go Gateway Backend Tests:**
  - Command: `go test -count=1 ./...`
  - Result: **All 25+ packages passed** including all 30 flagship E2E tests
- **TypeScript SDK (`@agentpay/sdk`):**
  - Command: `npm run build && npm test`
  - Result: **33/33 tests passed**
- **Developer CLI (`@agentpay/cli`):**
  - Command: `npm run build && npm test`
  - Result: **14/14 tests passed**
- **Python SDK (`agentpay`):**
  - Command: `python -m pytest`
  - Result: **26/26 tests passed**

---

## 9. Manual Demonstration Walkthrough

To verify the flagship workflow in the browser:

1. **Navigate to `/control`:**
   - Confirm hero banner proclaims: *AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.*
   - Note the active simulation notice: `SIMULATION — NO FUNDS MOVED`.
   - Click `Reset Demo` to establish clean Step 0 state.
2. **Launch Mission Replay:**
   - Click `▶ Open Mission Replay` (or navigate to `/missions/demo/replay`).
   - The interactive step-by-step player loads with the canonical 22-event timeline.
3. **Execute Event Sequence:**
   - **Step 1–5:** Watch Objective Creation ($25 cap), Task DAG Compilation, Discovery of 4 agents, Quote Ingestion, and Selection of Provider B ($3.60).
   - **Step 6–10:** Observe AgentPay Policy check (ALLOW in 6.36µs), Risk check (Score 18 LOW), Approval check (Auto-approved under threshold), Treasury encumbrance ($3.60), and PaymentIntent construction.
   - **Step 11–13 (Security Proving Ground):** Observe the malicious recipient substitution attempt to `0xdead...beef` intercepted by the security gate with an irreversible **`HARD DENY`**.
   - **Step 14 (Failure Event):** Provider B heartbeat times out (>2000ms). Worker is fenced (`INV-101`).
   - **Step 15–17 (Adaptive Recovery):** AI proposes Provider C ($4.50). AgentPay revalidates policy and risk afresh, encumbering total $8.50 <= $25.00 cap.
   - **Step 18–19 (Validation):** Provider C delivers report; Critic Agent validates deliverable with a 94/100 quality score.
   - **Step 20–22 (Final Settlement):** Bilateral clearing nets obligations ($8.50), simulated settlement executes on Chain 5042 with **0 funds moved**, and $16.50 of unencumbered budget is returned to the treasury.
4. **Inspect Decision Rationales:**
   - Toggle the **WHY** tab to view deterministic system reasoning for selecting Provider C.
   - Toggle the **WHY NOT** tab to review why the malicious recipient was hard-denied under `INV-186`.
   - Toggle **AUTHORITY TRACE** to confirm all 9 gateway checkpoints.
5. **Inspect Arc Layer (`/arc`):**
   - Confirm `AgentVault Contract` is explicitly labeled `UNDEPLOYED ON MAINNET`.
   - Confirm `Execution Mode` is strictly `SIMULATION ONLY`.
   - Confirm `Real Settlements` counter is exactly `0`.

---

## 10. Known Limitations & Production Readiness Checklist

1. **Smart Contract Deployment:** AgentVault contract is compiled and verified in test fixtures, but remains intentionally undeployed on Arc Mainnet pending multi-sig key ceremony.
2. **KMS / HSM Signing Pipeline:** Local development uses mock signer primitives; AWS KMS / HashiCorp Vault signer plugins are specified in `services/gateway/internal/signer` and await hardware enclave provisioning.
3. **OpenRouter AI Gateway:** Live AI execution requires operator-provided API keys in `.env.local`; when offline, deterministic fixtures supply bitwise reproducible proposals.
4. **Simulation Isolation:** All flagship demonstration artifacts reside in strictly isolated memory; running the simulation does not alter production reputation records or broadcast RPC transactions.
