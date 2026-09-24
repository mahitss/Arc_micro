# AgentPay Autonomous Treasury & Liquidity Orchestrator: Architecture Specification

## 1. Executive Summary & Core Thesis

The **Autonomous Treasury & Liquidity Orchestrator** elevates AgentPay from a payment gateway into a financial operating system capable of understanding, forecasting, and constraining liquidity across autonomous multi-agent economic activity.

```
       AI AGENTS & SWARMS PROPOSE ACTIVITIES
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│     AUTONOMOUS TREASURY & LIQUIDITY ORCHESTRATOR       │
│  - Available vs Reserved vs Committed Liquidity        │
│  - Bounded Capacity & Hierarchical Buffer Envelopes    │
│  - Liquidity Forecasts (1h, 6h, 24h, 7d, 30d)          │
│  - Stress Testing Engine & Anomaly Detection           │
│  - Multi-Dimension Allocation & Starvation Prevention  │
│  - Real-Time Blockchain Balance Reconciler             │
└────────────────────────┬───────────────────────────────┘
                         │
        Gating: LIQUIDITY_AVAILABLE / CONSTRAINED
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│           EXISTING FINANCIAL CONTROL PLANE             │
│  - PaymentIntent & Clearinghouse Obligations           │
│  - Rust Deterministic Policy Engine (Constitution)     │
│  - Risk Engine & Human Multi-Sig Approvals             │
│  - Treasury Reservation Lock                           │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│                 EXECUTION & SETTLEMENT                 │
│  - Go Execution Gateway                                │
│  - AgentVault Keyless Smart Contract                   │
│  - Arc L1/L2 Finality (USDC Settlement)                │
└────────────────────────────────────────────────────────┘
```

### The Iron Rule of Autonomous Treasury
> **"TREASURY INTELLIGENCE CAN PLAN.**
> **TREASURY CONTROLS CAN CONSTRAIN.**
> **ONLY THE EXISTING EXECUTION PIPELINE CAN MOVE MONEY."**

The Autonomous Treasury Orchestrator has **zero independent authority to move funds or sign transactions**:
- It can compute available capacity, model future stress, and reject requests that exceed liquidity buffers.
- It can provide explainable allocation proposals and defer non-critical obligations.
- **It can never independently disburse funds, bypass policy checks, or alter AgentVault balances.**

---

## 2. Current vs Orchestrated Treasury Architecture

### Current Treasury (Day 1 - 10 Foundation)
- Provides simple atomic reservations (`ReserveFunds`, `ReleaseFunds`, `SettleFunds`) tied to `PaymentIntent` or Clearinghouse `EscrowID`.
- Tracks `OnChainBalance` vs `ReservedAmount`, deriving `AvailableAmount = OnChainBalance - ReservedAmount`.
- Queries balance from on-chain provider or defaults to mock in testing.

### Orchestrated Treasury (Task 11)
- **Multi-State Balance Taxonomy:** Distinguishes `TOTAL`, `AVAILABLE`, `RESERVED`, `COMMITTED`, `PENDING_SETTLEMENT`, and `DISPUTED` balances without double-counting.
- **Liquidity Buffer Hierarchy:** Enforces `GLOBAL` $\rightarrow$ `ORGANIZATION` $\rightarrow$ `AGENT` $\rightarrow$ `MISSION` $\rightarrow$ `SWARM` buffer constraints.
- **Safe Commitment Capacity:** Computes deterministic headroom:
  $$\text{Safe Capacity} = \text{Available Balance} - \text{Committed Balance} - \text{Minimum Buffer}$$
- **Liquidity Gating:** Returns `LIQUIDITY_AVAILABLE`, `LIQUIDITY_CONSTRAINED`, or `LIQUIDITY_UNAVAILABLE` before obligations or intents are created.
- **Stale Liquidity Protection:** Atomic compare-and-swap or transactional reservation validation against real-time state.
- **Predictive Forecasting & Stress Testing:** Generates stochastic and scenario-based forecasts over 1h to 30d horizons.
- **Four-Way Reconciliation Engine:** Automatically compares internal ledger state, database repository, AgentVault smart contract state, and verified Arc blockchain token balances.

---

## 3. Balance Model & Classification

To prevent double-counting and capital insolvency, the orchestrator classifies all treasury balances into mutually exclusive categories:

| Balance Category | Definition | Authority Impact |
| :--- | :--- | :--- |
| **TOTAL BALANCE** | Gross funds confirmed to belong to the AgentVault on Arc. | Upper bound of organizational assets. |
| **AVAILABLE BALANCE** | Funds not subject to active reservations, pending settlements, or buffer locks. | Capacity for immediate reservation. |
| **RESERVED BALANCE** | Funds explicitly locked for authorized in-flight intents or active clearinghouse escrows. | Encumbered; cannot be double-reserved. |
| **COMMITTED BALANCE** | Future financial obligations accepted (e.g. accepted milestones, recurring schedules) but not yet locked in escrow. | Reduces safe commitment capacity. |
| **PENDING SETTLEMENT** | Authorized intents currently in execution whose blockchain finality receipt is pending. | In-transit funds. |
| **DISPUTED BALANCE** | Encumbered funds tied to active disputes or SLA breaches under mediation. | Frozen until formal resolution. |

$$\text{Total Balance} \ge \text{Available} + \text{Reserved} + \text{Pending Settlement} + \text{Disputed}$$

---

## 4. Liquidity Buffer Hierarchy & Safety Envelopes

Buffers represent non-allocatable liquidity floors designed to absorb transaction gas spikes, settlement clustering, and provider failure costs.

```
┌────────────────────────────────────────────────────────┐
│ GLOBAL BUFFER (e.g., $100 USDC system-wide floor)      │
│  └─► ORGANIZATION BUFFER (e.g., 20% of org treasury)   │
│         └─► AGENT BUFFER (e.g., $10 USDC floor)        │
│                └─► MISSION BUFFER (e.g., $5 USDC)      │
│                       └─► SWARM BUFFER (e.g., $2 USDC) │
└────────────────────────────────────────────────────────┘
```

A child scope (e.g. Swarm) can never consume liquidity protected by a parent scope (e.g. Organization Buffer).

### Safe Commitment Capacity Formula
$$\text{Safe Capacity} = \max\left(0, \text{Available} - \text{Committed} - \max(\text{MinAbsoluteBuffer}, \text{Total} \times \text{MinPercentageBuffer})\right)$$

---

## 5. Liquidity Reservation Lifecycle

```
  [REQUESTED]
       │
       ▼ (Passes Liquidity Gating & Buffer Checks)
   [RESERVED] ────────────────────────────────────────┐
       │                                              │
       ├──────────────────────┐                       │
       ▼ (Intent Executing)   ▼ (Cancelled / Expired) ▼ (Dispute Raised)
  [CONSUMED]              [RELEASED]             [DISPUTED]
       │
       ▼ (On-Chain Confirmed)
   [SETTLED]
```

- **Atomic Reservation:** Evaluated under concurrency locks to guarantee parallel requests cannot oversubscribe the treasury.
- **Expiration Enforcement:** Expired reservations automatically release capacity provided no active payment intent is in-flight.

---

## 6. Exposure Integration & Worst-Case Modeling

Integrates directly with Task 10's `EconomicExposure`:
$$\text{Worst-Case Exposure} = \sum \text{Active Obligations} + \sum \text{Remaining Milestones} + \sum \text{Recurring Horizon} + \sum \text{Fallback Headroom}$$

This metric answers: *"If every authorized commitment settles simultaneously, does the treasury survive above the emergency buffer?"*

---

## 7. Predictive Forecasting & Stress Testing

### 7.1 Forecast Horizons
- **1 Hour:** High-confidence deterministic micro-flow based on pending intents and in-flight settlements.
- **6 Hours / 24 Hours:** Bounded scheduling horizon integrating milestone deadlines and recurring schedules.
- **7 Days / 30 Days:** Macro-economic projection incorporating empirical learning data (historical retry costs, failure rates, provider SLA timing).

### 7.2 Stress Scenarios
1. **SETTLEMENT_CLUSTER:** 100% of pending obligations and milestones settle concurrently.
2. **PROVIDER_FALLBACK:** Primary service fails; high-cost fallback adds 30-50% surcharge.
3. **HIGH_RETRY:** 20% of mission tasks fail and retry up to maximum policy limits.
4. **INFLOW_DELAY:** Expected customer deposits or contract payments are delayed by 72 hours.
5. **NETWORK_RPC_OUTAGE:** Arc settlement latency triples, holding reservations open.

---

## 8. Allocation & Starvation Prevention

The `LiquidityAllocator` balances competing agent demands without hardcoded favoritism:
- **Priority Dimensions:** Contractual deadline, mission critical path, verified deliverable milestone, risk score, age in queue.
- **Fairness Guarantee:** Tracks wait time and deferral count; low-priority tasks receive priority boosts to prevent starvation.

---

## 9. Four-Way Continuous Reconciliation

The `TreasuryReconciliationEngine` performs deterministic cross-verification:
1. **Internal Journal Ledger** (double-entry debits and credits)
2. **Gateway Repository Storage** (`treasury_reservations`, `intents`)
3. **AgentVault Smart Contract** (on-chain emitted event logs)
4. **Verified Arc Blockchain State** (real-time RPC balance query)

Statuses: `MATCHED`, `MISMATCH`, `PENDING`, `AMBIGUOUS`, `REQUIRES_REVIEW`.

---

## 10. Security Invariants (INV-71 to INV-85)

- **INV-71:** Expected inflows cannot be treated as available funds.
- **INV-72:** Reservations cannot exceed available liquidity.
- **INV-73:** Concurrent reservations cannot oversubscribe treasury.
- **INV-74:** Child liquidity envelopes cannot exceed parent authority.
- **INV-75:** Recurring obligations cannot reserve infinite funds.
- **INV-76:** Simulation liquidity cannot affect real treasury.
- **INV-77:** Treasury forecasts cannot authorize payments.
- **INV-78:** Treasury analytics cannot modify policy.
- **INV-79:** Only verified blockchain state can establish verified on-chain balance.
- **INV-80:** Internal treasury state cannot fabricate blockchain settlement.
- **INV-81:** Reconciliation mismatch cannot silently become MATCHED.
- **INV-82:** Expected inflows cannot increase authorization capacity until verified.
- **INV-83:** A refund cannot increase treasury beyond the actual verified refund.
- **INV-84:** No liquidity calculation can create funds.
- **INV-85:** Treasury intelligence cannot bypass approval.
