# AgentPay Economic Settlement Architecture

## 1. The Settlement Pipeline

The clearinghouse coordinates economic agreements between AI agents, but it **never executes direct balance transfers or moves private keys**.

When an obligation, milestone, or netting batch is cleared for settlement, it enters the **Canonical Settlement Pipeline**:

```
┌──────────────────────────────────────────────────────────┐
│                   CLEARINGHOUSE ENGINE                   │
│  - Verifies milestone deliverable SHA-256 (INV-59)       │
│  - Checks obligation state is ACTIVE / SETTLING          │
│  - Deduplicates invoices & binds hashes (INV-57)         │
│  - Dispatches to SettlementRouter                        │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                 PAYMENT INTENT SERVICE                   │
│  - Creates canonical PaymentIntent                       │
│  - Sets idempotency key, source agent, recipient address │
│  - Attaches audit metadata & clearinghouse references    │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│             RUST DETERMINISTIC POLICY ENGINE             │
│  - Evaluates per-agent spending limits                   │
│  - Evaluates cumulative organizational budget            │
│  - Evaluates merchant/recipient whitelists               │
│  - Evaluates time-of-day & velocity constraints          │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│             RISK ENGINE & MULTI-SIG APPROVALS            │
│  - Scores transaction anomaly risk                       │
│  - Requires human/board multi-sig if above threshold     │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                  GO EXECUTION GATEWAY                    │
│  - Validates cryptographic signatures                    │
│  - Submits transaction to AgentVault Solidity contract   │
│  - Monitors Arc L1/L2 blockchain confirmation            │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                     ARC BLOCKCHAIN                       │
│  - Transfers native USDC tokens                          │
│  - Emits VaultSettlementExecuted event log               │
│  - Finality achieved                                     │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Settlement Modalities

### 2.1 Direct Obligation Settlement
Triggered when an immediate deferred obligation matures or when all deliverable milestones are verified:
- Obligation transitions: `ACTIVE` $\rightarrow$ `SETTLING` $\rightarrow$ `SETTLED`.
- Emits double-entry ledger credit and debit entries.

### 2.2 Milestone Settlement
Allows incremental payment for complex, multi-phase research or compute tasks:
- Payer deposits or reserves funds.
- Payee submits proof of work for Milestone $i$.
- Deliverable hash is verified.
- Milestone settlement intent is routed.
- Once confirmed, Milestone $i$ is `SETTLED`.
- When $\sum \text{Settled Milestones} == \text{Total Obligation Amount}$, the entire obligation transitions to `SETTLED`.

### 2.3 Batch & Net Settlement
Netting batches aggregate multiple bilateral or multilateral obligations into a single compressed settlement:
- Reduces on-chain transaction fees by up to 80%+.
- Invariant **INV-69 (Netting Atomicity)**: If the net settlement fails at the execution layer or on-chain, all constituent obligations remain unfulfilled and uncorrupted.

---

## 3. Failure Handling & Invariant Enforcement

| Failure Scenario | State Action | Ledger Impact | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Policy Engine Denies** | Obligation rolls back to `ACTIVE`; intent recorded as `REJECTED`. | Zero balance impact. | **INV-55** (No unauthorized movements) |
| **Risk Multi-Sig Rejection** | Obligation halts in `SETTLING`; operator notified. | Zero balance impact. | **INV-66** (Dispute & control freeze) |
| **On-Chain Gas Spike / Revert** | Gateway marks intent `FAILED`; obligation remains open for retry. | Reconciler flags state. | **INV-65** (Reconciliation determinism) |
| **Deliverable Hash Mismatch** | Intent creation rejected immediately. | Zero balance impact. | **INV-59** (Cryptographic deliverable proof) |

---

## 4. Double-Entry Audit Trail (INV-63)

Every settlement updates the internal clearinghouse double-entry audit ledger:
$$\sum \text{Debits} \equiv \sum \text{Credits}$$

Each entry records:
- Payer account debited
- Payee account credited
- On-chain Arc transaction hash
- Precise block number and timestamp
