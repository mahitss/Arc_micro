# Continuous 4-Way Treasury Reconciliation Engine

## 1. Overview

Decentralized payment systems often fall victim to state desynchronization between off-chain database records and on-chain blockchain reality. Stale caching, re-orgs, and missed event listeners can create dangerous "phantom balances" where the software believes it has funds that do not exist on-chain.

The **Treasury Reconciliation Engine** enforces a rigorous **4-Way Continuous Balance Audit**:
1. **Internal Memory Ledger**: Fast-path concurrent state tracked in the gateway runtime.
2. **Persistent Repository**: Transactional persistence layer in Postgres.
3. **AgentVault Smart Contract**: On-chain smart contract balance and pause status.
4. **Arc Blockchain Truth**: Native RPC balance query against the Arc consensus layer.

---

## 2. Four-Way Balance Verification Matrix

```
[ Internal Memory Ledger ]  <==== Verified ====>  [ PostgreSQL Repository ]
            ▲                                                 ▲
            │                                                 │
      Reconciled                                        Reconciled
            │                                                 │
            ▼                                                 ▼
[ AgentVault Smart Contract ] <==== Verified ====> [ Arc Blockchain Consensus ]
```

### Reconciliation Statuses
- **`MATCHED`**: All 4 balance sources match exactly to the base unit (0 discrepancy).
- **`MISMATCH`**: Discrepancy detected between database and on-chain balance.
- **`OVER_COLLATERALIZED`**: On-chain balance exceeds off-chain recorded obligations (safe, but flagged for rebalancing).
- **`UNDER_COLLATERALIZED`**: On-chain balance is less than required obligations (critical alarm).
- **`UNVERIFIED`** (`INV-81`): Emitted when no active Arc RPC connection or blockchain client is configured. **The system NEVER fabricates a match when verification cannot be performed**.

---

## 3. Strict Truth Verification Invariant (`INV-81`)

Under invariant **`INV-81`**:
```go
if !hasProvider {
    return &TreasuryReconciliationReport{
        ReconciliationStatus: StatusUnverified,
        Evidence: "Arc blockchain RPC provider not configured; balance unverified",
    }, nil
}
```
Fabricating or assuming a matched status without active cryptographic RPC proof is strictly prohibited by machine invariant checks.

---

## 4. AgentVault Pause & Emergency Circuit Breaker (`INV-83`)

During every reconciliation pass, the engine queries the `isPaused()` status of the `AgentVault.sol` contract on Arc:
```solidity
function isPaused() external view returns (bool);
```
- If the vault owner or automated circuit breaker triggers a pause, the treasury engine immediately transitions to **`EMERGENCY_HALT`**.
- All pending and future reservations are halted instantly.
- Invariant **`INV-83`** guarantees that off-chain agents cannot continue generating payment intents while the on-chain vault is paused.

---

## 5. Audit Evidence & Forensic Telemetry

Every reconciliation run produces a cryptographically sealed report stored with:
- `ledger_balance`
- `repository_balance`
- `vault_balance`
- `blockchain_balance`
- `discrepancy_amount`
- `chain_id`
- `vault_address`
- `evidence` (deterministic hash of the verification payload)
- `verified_at` (UTC timestamp)
