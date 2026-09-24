# AgentPay Control Tower Read Model Architecture

## Core Axiom: Read Model != Source of Truth (INV-86, INV-99)

The Autonomous Economic Control Tower operates strictly as an aggregation and observability surface over authoritative domain systems.

```
+-----------------------------------------------------------------------------------+
|                        CONTROL TOWER READ MODEL PROJECTION                        |
|                                                                                   |
|  +--------------------+   +--------------------+   +---------------------------+  |
|  | EconomicStateStrip |   | ExecutiveOverview  |   | UniversalFinancialTrace   |  |
|  +--------------------+   +--------------------+   +---------------------------+  |
|  | MissionCommandView |   | SecurityCenterView |   | ArcBlockchainStatusView   |  |
|  +--------------------+   +--------------------+   +---------------------------+  |
+-----------------------------------------------------------------------------------+
                                         |
                                         | Non-Authoritative Composed Queries
                                         v
+-----------------------------------------------------------------------------------+
|                           AUTHORITATIVE DOMAIN SUBSYSTEMS                         |
|                                                                                   |
|  [Repository]      [Treasury Engine]    [Rust Policy Engine]    [Arc Blockchain]  |
|  - Missions        - Balances           - Constitution v8       - AgentVault      |
|  - Agents          - Reservations       - Spending Limits       - USDC Balance    |
|  - Contracts       - Envelopes          - Risk Scores           - Block Consensus |
+-----------------------------------------------------------------------------------+
```

---

## 1. Composed Read Models

### 1.1 `EconomicStateStrip`
Provides a real-time operational status banner across 5 core dimensions:
- `treasury_status`: `HEALTHY` | `CONSTRAINED` | `DEFICIT` | `EMERGENCY_HALT`
- `policy_version`: Active Constitution version string (e.g. `v8 ACTIVE`)
- `risk_level`: Deterministic risk ceiling (`LOW` | `NORMAL` | `ELEVATED` | `CRITICAL`)
- `execution_mode`: `LIVE` vs `SIMULATION`
- `arc_status`: Verified RPC reachability and AgentVault deployment (`VERIFIED` vs `UNVERIFIED`)

### 1.2 `ExecutiveOverview`
Aggregates active ecosystem dimensions:
- Active Missions count
- Active Agents count
- Active Contracts count
- Available uncommitted liquidity
- Reserved liquidity headroom
- Outstanding obligations
- Pending settlements
- Active approvals requiring human intervention
- Data Freshness indicator (`LIVE`, `RECENT`, `STALE`, `UNAVAILABLE`)

### 1.3 `UniversalFinancialTrace`
Constructs the complete 13-to-15 step causal audit trail:
1. `MISSION`: Root autonomous objective
2. `TASK`: Granular sub-task node in DAG
3. `AGENT`: Counterparty selection via matchmaking
4. `CONTRACT`: Immutable service agreement
5. `OBLIGATION`: Double-entry clearinghouse obligation
6. `POLICY`: Rust deterministic rule evaluation
7. `RISK`: Deterministic risk calculation
8. `APPROVAL`: Human oversight threshold (if required)
9. `RESERVATION`: Atomic liquidity headroom lock (INV-75)
10. `INTENT`: Payment intent state transition
11. `VAULT`: AgentVault smart contract verification
12. `ARC`: Blockchain consensus block settlement
13. `RECONCILE`: 4-way balance verification
14. `LEARNING`: Economic observation & feedback memory

---

## 2. Freshness and Stale Data Guarantees (INV-93)

Read models display explicit freshness indicators:
- `< 10s`: Marked as `LIVE`
- `10s - 30s`: Marked as `RECENT`
- `> 30s`: Visibly marked as `STALE` with timestamp
- Unreachable/Unverified: Displayed as `UNAVAILABLE` or `UNVERIFIED`

**Zero Value Guarantee:** The UI will never render `$0.00` for an unavailable or unverified balance. If a live RPC call fails, the state displays `UNAVAILABLE`.

---

## 3. Read / Write Separation (INV-86, INV-95)

- **Read Path:** `UI -> Composed Read Model API -> Canonical Query APIs -> Domain Engines`. Read models cannot mutate financial state.
- **Command Path:** `UI -> Authenticated API -> Server-Side RBAC -> Domain Command Pipeline -> Policy Validation -> Risk -> Treasury Lock -> Arc Settlement`.
