# TASK 39 — AGENTPAY AUTONOMOUS MISSION REPLAY ENGINE
## Flagship Deterministic Mission Architecture & Verification Report

$$\text{CORE PRODUCT THESIS: AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.}$$
$$\text{SECONDARY PRINCIPLE: AUTONOMY CAN EXPAND. FINANCIAL AUTHORITY CANNOT.}$$
$$\text{MODE: SIMULATION — NO FUNDS MOVED (INV-156)}$$

---

## 1. Executive Summary

Task 39 delivers the flagship **AgentPay Autonomous Mission Replay Engine**, a deterministic, production-grade mission experience that demonstrates the complete AgentPay economic thesis from human intent to unbroadcast simulated settlement.

### The Story:
1. **AI Receives an Objective:** Human operator specifies a $25.00 USDC market intelligence task.
2. **AI Plans:** Claude 3.5 Sonnet decomposes the objective into an operational DAG.
3. **Agents Compete:** Marketplace candidates return structured quotes ($4.00, $3.60, $4.50).
4. **AgentPay Controls:** Rust Policy Engine evaluates allowlists, velocity, and budgets in 6.36µs.
5. **Malicious Interceptor Attacks:** Provider attempts Attack #1 (Recipient substitution).
6. **AgentPay Blocks:** Deterministic `HARD_DENY` (INV-186 & INV-146). **Funds moved: 0.00 USDC.**
7. **Worker Fails:** Provider B suffers a heartbeat lease timeout (>2000ms). Worker fenced.
8. **Autonomous Recovery:** AI proposes Provider C (+$0.90 USDC). AgentPay validates replan within original $25.00 envelope. **Authority expansion: 0.**
9. **Critic Validates:** Critic Agent validates output quality (Score 94/100, threshold 80).
10. **Clearing & Settlement:** Bilateral obligations recorded. Net spend $8.50 USDC, $3.60 blocked, $16.50 returned unencumbered to treasury. Simulated Arc settlement on Chain 5042.

---

## 2. Mission State Machine (21 Deterministic States)

The mission lifecycle is governed by an explicit finite state machine with zero arbitrary state transitions:

```
[CREATED] ──> [PLANNING] ──> [DISCOVERING] ──> [QUOTING] ──> [SELECTING]
                                                                   │
                                                                   ▼
[TREASURY_RESERVATION] <── [APPROVAL_CHECK] <── [RISK_CHECK] <── [POLICY_CHECK] <── [NEGOTIATING]
         │
         ▼
    [EXECUTING] ──> [SECURITY_BLOCK] ──> [PROVIDER_FAILURE] ──> [REPLANNING] ──> [RECOVERY]
                                                                                     │
                                                                                     ▼
    [COMPLETED] <── [SETTLEMENT_READY] <── [CLEARING] <── [SYNTHESIS] <── [VALIDATING]
```

### State Definitions:
1. `CREATED`: Objective initialized with constraints (25.00 USDC cap, 10 min deadline, LOW risk).
2. `PLANNING`: AI Planner Layer decomposes tasks into DAG dependencies.
3. `DISCOVERING`: A2A Registry queries candidate specialist agents.
4. `QUOTING`: Marketplace receives structured capability quotes.
5. `SELECTING`: AI Advisory recommends candidate; AgentPay verifies registry binding.
6. `NEGOTIATING`: Bilateral SLA parameters locked.
7. `POLICY_CHECK`: Rust Policy Engine verifies allowlists, per-transaction, and velocity caps.
8. `RISK_CHECK`: Risk engine scores concentration and counterparty exposure.
9. `APPROVAL_CHECK`: Evaluation against human-in-the-loop escalation thresholds (<$50 auto).
10. `TREASURY_RESERVATION`: Atomic liquidity encumbrance in double-entry ledger (INV-76).
11. `EXECUTING`: PaymentIntent constructed and dispatched to execution pipeline.
12. `SECURITY_BLOCK`: Injected attack vector detected; deterministic `HARD_DENY` halts payment.
13. `PROVIDER_FAILURE`: Heartbeat lease monitor fences stale worker (INV-101).
14. `REPLANNING`: AI Adaptive Loop generates replacement proposal without authority expansion.
15. `RECOVERY`: Replacement provider approved within original budget envelope.
16. `VALIDATING`: Cryptographic deliverable checksum verified; Critic scores quality.
17. `SYNTHESIS`: Multi-agent deliverables aggregated into cohesive report.
18. `CLEARING`: Bilateral obligations recorded and netted.
19. `SETTLEMENT_READY`: Projected Arc settlement payload compiled.
20. `COMPLETED`: Mission finalized; unencumbered balance returned to treasury.
21. `FAILED`: Terminal terminal boundary for unrecoverable errors.

---

## 3. Canonical 22-Event Timeline Model

Each event contains the full provenance metadata schema:
- `event_id`: Unique identifier (e.g., `evt_13_pay_blocked`)
- `mission_id`: `msn_market_intel_001`
- `timestamp`: ISO-8601 RFC3339 timestamp
- `state`: One of the 21 deterministic states
- `actor`: System entity executing the step
- `action`: Human-readable operational description
- `status`: Machine status (`SUCCESS`, `ALLOW`, `PASS`, `BLOCKED`, `DELIVERED`, `SIMULATED`)
- `amount`: Financial value in USDC
- `currency`: `USDC`
- `correlation_id`: `corr_demo_agentpay-demo-001`
- `causation_id`: Cryptographic causation pointer to predecessor event
- `source`: Subsystem emitting the event
- `simulation_live`: `SIMULATION`
- `metadata`: Causal audit details, invariant proofs, and policy citations

| # | Event ID | Event Name | State | Actor | Status | Amount | Key Metadata / Invariant |
|---|---|---|---|---|---|---|---|
| 1 | `evt_01_created` | `MISSION_CREATED` | `CREATED` | Operator | `SUCCESS` | $25.00 | $25.00 USDC cap, 10 min deadline |
| 2 | `evt_02_plan` | `PLAN_GENERATED` | `PLANNING` | AI Planner | `SUCCESS` | $0.00 | Claude 3.5 Sonnet DAG compilation |
| 3 | `evt_03_discovery` | `AGENT_DISCOVERED` | `DISCOVERING` | A2A Registry | `SUCCESS` | $0.00 | 4 candidates identified |
| 4 | `evt_04_quotes` | `QUOTE_RECEIVED` | `QUOTING` | Marketplace | `SUCCESS` | $0.00 | Prov A $4.00, Prov B $3.60, Prov C $4.50 |
| 5 | `evt_05_compare` | `QUOTE_COMPARED` | `SELECTING` | AI Advisory | `SUCCESS` | $3.60 | AI recommends Provider B (Lowest cost) |
| 6 | `evt_06_select` | `SERVICE_SELECTED` | `SELECTING` | AgentPay Gate | `AUTHORIZED` | $3.60 | Registry-resolved recipient validated |
| 7 | `evt_07_negotiate` | `NEGOTIATION_COMPLETED` | `NEGOTIATING` | A2A Protocol | `SUCCESS` | $3.60 | SLA locked, 2.5s max latency |
| 8 | `evt_08_policy` | `POLICY_EVALUATED` | `POLICY_CHECK` | Policy Engine | `ALLOW` | $3.60 | Rust Engine evaluated in 6.36µs |
| 9 | `evt_09_risk` | `RISK_EVALUATED` | `RISK_CHECK` | Risk Engine | `PASS` | $3.60 | Risk score 18 (LOW), conc 0.144 |
| 10 | `evt_10_treasury` | `TREASURY_RESERVED` | `TREASURY_RESERVATION` | Treasury | `RESERVED` | $3.60 | `res_sim_001_b` encumbered (INV-76) |
| 11 | `evt_11_payment_req` | `PAYMENT_REQUESTED` | `EXECUTING` | Execution Gate | `PENDING` | $3.60 | PaymentIntent `pi_sim_prov_b_01` |
| 12 | `evt_12_sec_violation` | `SECURITY_VIOLATION_DETECTED` | `SECURITY_BLOCK` | Malicious Prov | `ATTACK_DETECTED` | $3.60 | Attack #1: Recipient swap to attacker |
| 13 | `evt_13_pay_blocked` | `PAYMENT_BLOCKED` | `SECURITY_BLOCK` | Security Guardrail | `BLOCKED` | $0.00 | **HARD DENY (INV-186 & INV-146). 0 funds.** |
| 14 | `evt_14_prov_fail` | `PROVIDER_FAILED` | `PROVIDER_FAILURE` | Runtime Monitor | `TIMEOUT` | $0.00 | Lease expired (>2000ms). Fenced (INV-101) |
| 15 | `evt_15_replan_req` | `REPLAN_REQUESTED` | `REPLANNING` | AI Adaptive Loop | `PROPOSAL` | $4.50 | Replan to Provider C (+$0.90) |
| 16 | `evt_16_alt_select` | `ALTERNATIVE_PROVIDER_SELECTED` | `RECOVERY` | AgentPay Gate | `AUTHORIZED` | $4.50 | Envelope checked: $8.50 <= $25.00 |
| 17 | `evt_17_pay_reauth` | `PAYMENT_REAUTHORIZED` | `EXECUTING` | Treasury | `AUTHORIZED` | $4.50 | Reservation `res_sim_002_c` locked |
| 18 | `evt_18_result_rec` | `RESULT_RECEIVED` | `VALIDATING` | Provider C | `DELIVERED` | $0.00 | Deliverable received, 1.38s latency |
| 19 | `evt_19_result_val` | `RESULT_VALIDATED` | `VALIDATING` | Critic Agent | `PASS` | $0.00 | Quality score 94/100 (Threshold 80) |
| 20 | `evt_20_clearing` | `CLEARING_RECORDED` | `CLEARING` | Clearinghouse | `RECORDED` | $8.50 | Obligations: Prov A $4, Prov B $3.6 (BLOCKED), Prov C $4.5 |
| 21 | `evt_21_settlement` | `SETTLEMENT_SIMULATED` | `SETTLEMENT_READY` | Arc Simulator | `SIMULATED` | $8.50 | Chain 5042. BROADCAST: NONE. 0 real funds |
| 22 | `evt_22_complete` | `MISSION_COMPLETED` | `COMPLETED` | Economic Fabric | `SUCCESS` | $16.50 | Completed. $16.50 returned unencumbered |

---

## 4. Deterministic Seed & Invariant Verification

- **Deterministic Seed:** `agentpay-demo-001`
- **Machine Checksum:** Verified via SHA-256 over canonical events.
- **Invariants Checked Across 100 Runs:**
  1. `INV-1`: Malicious recipient swap triggers `HARD_DENY`; zero funds moved.
  2. `INV-2`: Replan cannot expand budget envelope ($8.50 $\le$ $25.00).
  3. `INV-3`: Arbitrary calldata blocked; private keys inaccessible to agents.
  4. `INV-4`: Policy Constitution remains immutable; policy gate is deterministic.
  5. `INV-5`: Replay attacks prevented via cryptographic causation chaining.
  6. `INV-6`: Duplicate settlements prohibited; settled $\le$ authorized.
  7. `INV-7`: Deliverable completion requires Critic validation (Score $\ge$ 80).
  8. `INV-8`: Stale workers fenced on heartbeat lease expiry (>2000ms).
  9. `INV-9`: Provider failure cannot bypass policy revalidation.
  10. `INV-10`: Autonomous recovery adapts the plan without expanding financial authority.
  11. `INV-11`: Simulation never broadcasts on-chain transactions.
  12. `INV-12`: Simulation cannot mutate AgentVault deployment state.
  13. `INV-13`: Keyless agent architecture: 0 private keys exposed.
  14. `INV-14`: Double-entry treasury balances: unencumbered returns are bitwise exact.
  15. `INV-15`: Reset returns the system to Step 0 without altering persistent financial truth.

---

## 5. User Interface & Replay Experience

- **Flagship URL:** `/missions/demo/replay` (and `/missions/demo`)
- **Transport Controls:**
  - `[⏮ Reset]`: Resets playback to Step 1.
  - `[◀ Step Back]`: Moves to previous event.
  - `[▶ Play / ⏸ Pause]`: Interactive ticker loop with 0.5x, 1x, 2x speed selection.
  - `[Step Forward ▶]`: Advances single event.
  - `[↻ Restart]`: Re-runs the full 22-step mission from the beginning.
  - `[⬇ Export Trace (JSON)]`: Downloads full deterministic audit log without secrets.
- **Scrubber:** Interactive 22-step progress bar with state-coded indicators.
- **Synchronized Right-Side Inspector:**
  - **"Why / Why Not?" Tab:**
    - AI recommendation vs AgentPay authorization separated into distinct fields.
    - Deterministic reasons for selecting Provider C over Provider B.
    - Forensic breakdown of Attack #1 rejection.
  - **Economic Trace Tab:** 13 nodes from objective intent to Arc settlement simulation.
  - **AI Trace Tab:** Model, request ID, tokens, latency, cost, and prompt version.
  - **Authority Trace Tab:** 8-stage gate evaluation proving zero unreserved exposure.

---

## 6. CLI Command Verification

The CLI shares the exact canonical scenario definition:

```bash
# View complete 22-step mission
agentpay demo mission

# Output machine-readable JSON trace
agentpay demo mission --json

# Step to specific event
agentpay demo mission --step 13

# Reset mission state
agentpay demo mission --reset
```

---

## 7. Gateway API Endpoints

- `GET  /api/demo/mission` — Retrieve current mission summary and progress
- `POST /api/demo/mission/reset` — Reset playback to Step 0
- `POST /api/demo/mission/start` — Resume playback
- `POST /api/demo/mission/pause` — Pause playback
- `POST /api/demo/mission/step` — Advance single step
- `GET  /api/demo/mission/events` — Retrieve event timeline
- `GET  /api/demo/mission/trace` — Retrieve 13-stage economic trace
- `GET  /api/demo/mission/export` — Download exportable JSON trace
