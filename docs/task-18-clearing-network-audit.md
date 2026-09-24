# Task 18 — AgentPay Autonomous Economic Clearing Network: Architectural Audit

## Executive Summary

This document performs an exhaustive architectural audit of the existing financial and economic subsystem within AgentPay prior to implementing **Task 18: Autonomous Economic Clearing Network**.

AgentPay is an established autonomous agent financial operating system. Under **Task 18**, we are extending the existing `clearinghouse` package into a network-aware clearing layer capable of coordinating multi-party obligations created across autonomous agents, marketplace contracts, missions, swarms, recurring services, milestones, and external protocol participants.

### Core Axioms
1. **Agents may create economic obligations. AgentPay determines how those obligations may safely settle.**
2. **Clearing may coordinate value. Clearing may not create financial authority.**

---

## 1. Existing Financial Source of Truth

The system establishes a strict separation between coordinate layers, intent layers, accounting ledgers, and on-chain settlement:

| Component | Role | Architectural Authority | File Location |
| :--- | :--- | :--- | :--- |
| **Clearing Ledger** | Accounting Source of Truth | Double-entry balanced internal debit/credit records (`sum(debits) == sum(credits)`) | [`services/gateway/internal/clearinghouse/models.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/clearinghouse/models.go) |
| **Treasury Service** | Liquidity Source of Truth | Authorized account balances, reservations, commitments, limits, and real-time available funds | [`services/gateway/internal/treasury/service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/treasury/service.go) |
| **PaymentIntent Pipeline** | Execution Intent Source of Truth | State machine tracking intent from creation, policy authorization, human approval (if needed), to execution | [`services/gateway/internal/intent/service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/intent/service.go) |
| **Arc Blockchain Receipts** | Settlement Evidence | Authoritative EVM receipt verification (`receipt.Status == 1`), block number, transaction hash | [`services/gateway/internal/blockchain/client.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/blockchain/client.go) |
| **Operations OS & Control Tower** | Read / Projection Models | Observable projections, health snapshots, telemetry, and read-only event traces | [`services/gateway/internal/operations/service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/operations/service.go) |
| **Autonomous Marketplace** | Opportunity & Contract Layer | Decides candidate eligibility, match scoring, quotes, and contract award | [`services/gateway/internal/marketplace/service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/marketplace/service.go) |
| **Economic Memory** | Learning & Reputation Layer | Historical outcome analytics, capability-scoped reputation | [`services/gateway/internal/economy/memory.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/economy/memory.go) |

---

## 2. Existing Clearinghouse Ledger

- **Model:** `ClearingLedgerEntry` in `clearinghouse/models.go`.
- **Double-Entry Style:**
  - `debit_account`: e.g. `"payer_obligations"`, `"clearing_netting_clearing"`
  - `credit_account`: e.g. `"payee_receivables"`, `"clearing_settlement"`
  - `amount`: micro-USDC integer string.
  - `hash`: SHA-256 integrity hash linking `entry_id`, `organization_id`, `obligation_id`, `entry_type`, `amount`, `timestamp`.
- **Enforcement:**
  - Sum of debits must equal sum of credits for each discrete settlement event.
  - Obligation balance cannot become negative.
  - Internal clearing ledger cannot create real funds (**INV-63**).

---

## 3. Existing Obligation Model & State Machine

- **Model:** `EconomicObligation` in `clearinghouse/models.go`.
- **Lifecycle States:**
  - `PROPOSED` (or `CREATED`)
  - `AUTHORIZED` / `VALIDATING`
  - `RESERVED`
  - `DUE`
  - `SUBMITTED`
  - `VERIFIED`
  - `SETTLEMENT_PENDING`
  - `SETTLED`
  - `PARTIALLY_SETTLED`
  - `DISPUTED`
  - `CANCELLED`
  - `EXPIRED`
  - `REFUNDED`
- **Invariants Enforced:**
  - **INV-55:** Obligations do NOT authorize payments.
  - **INV-56:** Invoices cannot create arbitrary payment recipients.
  - **INV-57:** Verified milestone is required before milestone settlement.
  - **INV-58 / INV-59:** Recurring schedules do not grant permanent authorization; every recurrence revalidates policy.
  - **INV-70:** Child obligations cannot exceed parent financial authority.

---

## 4. Existing Settlement Flow & Payment Pipeline

The canonical settlement pipeline in AgentPay is:

```
Trigger (Milestone Verified / Due Date / Approved Batch / Executed Netting)
  ↓
SettlementRouter
  ↓
PaymentIntent Creation (params: OrgID, AgentID, VaultAddress, ServiceID, Amount, Justification)
  ↓
Policy Engine Authorization (Rust-based deterministic evaluation)
  ↓
Risk Assessment Gate
  ↓
Approval Check (ALLOW vs APPROVAL_REQUIRED vs DENY)
  ↓
Treasury Reservation Check
  ↓
Execution Gate -> Signer -> Arc Blockchain (or deterministic simulation)
  ↓
ClearingReconciliationEngine (Mined Receipt Verification)
  ↓
Clearing Ledger Updates (Debit / Credit)
  ↓
Reputation & Memory Feedback
```

**CRITICAL:** Under no circumstances does clearing invoke `AgentVault` or execute raw blockchain transactions directly. It routes exclusively through `SettlementRouter` to the `PaymentIntent` pipeline.

---

## 5. Existing Netting & Reconciliation

### Netting (`NettingEngine`)
- Currently supports bilateral netting (`ProposeBilateralNetting`) between Agent A and Agent B.
- Calculates `grossAtoB`, `grossBtoA`, `grossTotal`, `netPayer`, `netPayee`, `netAmount`, and `savingsAmount`.
- Requires mutual approval (`approved_by_a`, `approved_by_b`).
- Blocks disputed obligations (`ErrDisputedObligationCannotNet`).
- Enforces **INV-60** (netting cannot increase financial authority) and **INV-61** (preserves original obligation history).

### Reconciliation (`ClearingReconciliationEngine`)
- Inspects `PaymentIntentID` and `TransactionHash`.
- In `SIMULATION` mode: verifies against deterministic simulation traces.
- In `REAL` mode: queries the connected Arc node for mined transaction receipt.
- Enforces:
  - `ReconMatched`: receipt status is successful, amounts and recipients match.
  - `ReconAmbiguous`: receipt is pending or network timed out (**INV-69** — never blind rebroadcast).
  - `ReconMismatch`: EVM execution reverted or amount/recipient discrepancy.

---

## 6. Existing Disputes & Refunds

- **Disputes:**
  - Supported at milestone, invoice, and escrow levels (`MilestoneDisputed`, `InvoiceDisputed`, `EscrowDisputed`, `ObligationDisputed`).
  - Protocol v1 also maintains `ProtocolDispute` (`OPEN`, `UNDER_REVIEW`, `RESOLVED`, `ESCALATED`, `CLOSED`).
  - Disputed obligations are strictly excluded from netting proposals and cannot settle.
- **Refunds (`clearing_refund_requests`):**
  - Requires reference to original `PaymentIntentID` and `ObligationID`.
  - Enforces **INV-66**: `refund_amount <= original_settled_amount`.
  - Emits balanced ledger entries upon settlement.

---

## 7. Duplicate Concepts to AVOID in Task 18

| Forbidden Anti-Pattern | Mandatory Pattern |
| :--- | :--- |
| Creating a second ledger | Extend `clearing_ledger_entries` in `clearinghouse` |
| Creating a second treasury or wallet balance | Query `treasury.Service` and `AgentVault` |
| Creating a second payment execution pipeline | Route all settlements through `SettlementRouter` -> `PaymentIntent` |
| Creating a second AgentVault | Use existing `AgentVault` contracts on Arc |
| Creating a second reconciliation engine | Extend `ClearingReconciliationEngine` |
| Fabricating fake transaction hashes or receipts | Return `NOT VERIFIED` or `AMBIGUOUS` when unconfirmed |
| Silently mutating confirmed obligation terms | Issue formal adjustments or replacement obligations |

---

## 8. Target Evolution for Task 18

1. **`EconomicClearingNetwork`:** Extend `clearinghouse.Service` with multi-party network coordination, exposure calculations, and causal tracing.
2. **`EconomicCounterparty`:** Introduce counterparty tracking with verified identity states (`UNVERIFIED`, `IDENTIFIED`, `VERIFIED`, `SUSPENDED`) and exposure limits.
3. **Multi-Party Netting:** Extend `NettingEngine` to support bounded graph cycle netting (e.g. A->B, B->C, C->A) with complete invariant proofs.
4. **Settlement Batches with Windows:** Support `IMMEDIATE`, `HOURLY`, `DAILY`, `MILESTONE`, `MANUAL` settlement windows and fine-grained partial settlement states.
5. **Causal Financial Trace:** Link `Objective -> Mission -> Task -> Agent -> Contract -> Obligation -> Policy -> Risk -> Approval -> Reservation -> PaymentIntent -> Execution -> Arc -> Receipt -> Reconciliation -> Ledger`.
6. **Invariants INV-201 to INV-220:** Machine-checked invariants with 40 adversarial test scenarios, load testing (10,000 obligations), SDKs, CLI, and Control Tower UI.
