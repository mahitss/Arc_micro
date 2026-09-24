# AgentPay Autonomous Economic Clearinghouse: Architecture & System Design

## 1. Executive Summary & Core Thesis

The **Autonomous Economic Clearinghouse** extends AgentPay into a coordination engine for agent-to-agent deferred obligations, milestone-based performance escrows, deliverable-verified invoices, and multilateral obligation netting.

```
       AI AGENTS PROPOSE & COORDINATE
                     │
                     ▼
┌───────────────────────────────────────────┐
│     AUTONOMOUS ECONOMIC CLEARINGHOUSE     │
│  - Deferred Obligations                   │
│  - Deliverable-Backed Milestones          │
│  - Cryptographic Escrows (Reservations)   │
│  - Bilateral & Multilateral Netting       │
│  - Double-Entry Continuous Audit Ledger   │
└───────────────────────────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────┐
│     EXISTING FINANCIAL CONTROL PLANE      │
│  - PaymentIntents                         │
│  - Rust Deterministic Policy Engine       │
│  - Risk Engine & Velocity Counters        │
│  - Treasury & Multi-Sig Approvals         │
└───────────────────────────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────┐
│          EXECUTION & SETTLEMENT           │
│  - Go Execution Gateway                   │
│  - AgentVault Keyless Smart Contract      │
│  - Arc L1/L2 Finality (USDC Settlement)   │
└───────────────────────────────────────────┘
```

### The Iron Rule of Financial Authority
> **"The clearinghouse coordinates value. The existing financial control plane authorizes value. Arc settles value."**

The clearinghouse possesses **zero autonomous fund movement authority**:
- An **Obligation** is a recorded promise to pay, NOT an authorization or reservation.
- An **Escrow** is a policy reservation against agent spending ceilings, NOT an on-chain transfer.
- A **Milestone** is a conditional trigger that requires verified cryptographic deliverable hashes.
- A **Settlement Route** passes strictly through `intent.Service` → Rust Policy → Risk Engine → Approvals → Execution Gateway → AgentVault Solidity → Arc Blockchain.

---

## 2. Invariant Separation Matrix

| Phase | State Entity | System Owner | Financial Impact |
| :--- | :--- | :--- | :--- |
| **Coordination** | `Obligation` | Clearinghouse | Zero funds moved. Tracks liability between agents. |
| **Reservation** | `Escrow` | Clearinghouse + Treasury | Budget headroom reserved against agent limit. |
| **Verification** | `Milestone` | Deliverable Verifier | Computes SHA-256 match; zero fund movement. |
| **Authorization**| `PaymentIntent` | Rust Policy Engine | Evaluates deterministic organizational rules. |
| **Settlement** | `Arc Transaction` | AgentVault Contract | Atomic on-chain USDC transfer. |

---

## 3. Core Subsystems

### 3.1 Obligation State Machine
Manages the lifecycle of peer-to-peer economic promises:
```
PROPOSED ───► ACKNOWLEDGED ───► ACTIVE ───► SETTLING ───► SETTLED
    │                │            │             │
    ▼                ▼            ▼             ▼
 CANCELLED        EXPIRED     DISPUTED      VOIDED
```

### 3.2 Escrow & Reservation Manager
Locks agent budget capacity to prevent double-spending or insolvent commitments before an agent performs compute work. Escrows can be settled directly upon milestone verification or refunded upon mutual cancellation or expiration.

### 3.3 Deliverable Verification Engine
Validates deliverable integrity before milestones can transition to settlement:
- Expected SHA-256 hash matching
- Timeout and expiry validation
- Contract address and signature verification

### 3.4 Bilateral & Multilateral Netting Engine
Identifies mutual offsetting obligations across participant agent graphs:
- Eliminates circular dependencies (e.g., $A \rightarrow B \rightarrow A$)
- Compresses gross obligations into single net settlements
- Reduces on-chain transaction fees and saves up to 80%+ liquidity

### 3.5 Double-Entry Audit & Reconciliation Engine
Maintains an immutable internal ledger:
- Invariant: `Total Debits == Total Credits` across all entries
- Invariant: Every completed clearinghouse settlement maps 1:1 to an AgentVault transaction hash on Arc
- Continually cross-references on-chain event logs to detect and flag any discrepancy (`DISCREPANCY_FLAGGED`)

---

## 4. Formal Security Invariants (INV-55 to INV-70)

1. **INV-55 (Zero Independent Authority):** The clearinghouse cannot mint, transfer, or release funds without passing through canonical `PaymentIntent` and policy evaluation.
2. **INV-56 (Double Reservation Prevention):** An obligation cannot have more than one active escrow reservation simultaneously.
3. **INV-57 (Invoice Deduplication & Hash Binding):** Invoices must be cryptographically bound to an obligation or milestone; duplicate IDs or duplicate canonical hashes are rejected.
4. **INV-58 (Strict State Monotonicity):** Terminal states (`SETTLED`, `VOIDED`, `CANCELLED`, `EXPIRED`) cannot be reverted or overwritten.
5. **INV-59 (Deliverable Hash Verification):** A milestone cannot transition to `SETTLED` without a verified deliverable matching the expected SHA-256 hash.
6. **INV-60 (Gross Liquidity Conservation):** Bilateral netting cannot reduce gross liabilities without executing the corresponding net settlement.
7. **INV-61 (Cross-Org Isolation):** Obligations, escrows, and netting cycles are strictly isolated within organizational boundaries.
8. **INV-62 (Mode Isolation):** `REAL` and `SIMULATION` economic entities cannot interact, net against each other, or co-exist in the same settlement batch.
9. **INV-63 (Ledger Double-Entry Balance):** In the clearinghouse audit ledger, the sum of debits must equal the sum of credits for every transaction.
10. **INV-64 (Exposure Ceiling Enforcement):** Aggregate unreserved obligations cannot exceed the payer agent's configured organizational exposure ceiling.
11. **INV-65 (Reconciliation Determinism):** On-chain transaction receipts must match clearinghouse internal amounts to the exact base unit; any deviation triggers an immediate invariant fault.
12. **INV-66 (Dispute Freeze):** Once an obligation or escrow is marked `DISPUTED`, all automatic settlement routes are halted until manual human resolution.
13. **INV-67 (Payer-Only Refund):** Only the original payer agent can receive refunds from unfulfilled escrows.
14. **INV-68 (Milestone Sum Boundary):** The sum of milestone amounts cannot exceed the parent obligation's total `amount_base`.
15. **INV-69 (Netting Atomicity):** If a net settlement fails at the execution layer, all constituent obligations remain unfulfilled and uncorrupted.
16. **INV-70 (Audit Trail Completeness):** Every state transition emits a structured, immutable audit log event containing actor ID, timestamp, and previous state.

---

## 5. Directory & Package Layout

- `services/gateway/internal/clearinghouse/`:
  - `models.go`: Core data models and invariant definitions.
  - `statemachine.go`: Strict state transition validation.
  - `verifier.go`: Deliverable cryptographic verification.
  - `exposure.go`: Real-time exposure calculations and health snapshots.
  - `netting.go`: Bilateral cycle compression engine.
  - `reconciliation.go`: On-chain receipt audit reconciler.
  - `router.go`: Intent pipeline routing bridge.
  - `service.go`: Thread-safe clearinghouse coordination service.
  - `clearinghouse_test.go`: Core lifecycle, invoice, netting, and demo tests.
  - `adversarial_test.go`: 30 machine-checked adversarial attack scenarios.
- `services/gateway/internal/http/handlers/clearinghouse.go`: HTTP REST endpoints.
- `packages/sdk-typescript/src/resources/clearinghouse.ts`: Full TypeScript SDK.
- `packages/sdk-python/agentpay/clearinghouse.py`: Python SDK.
- `packages/cli/src/index.ts`: Developer CLI `economy` / `clearing` commands.
- `apps/web/src/app/economy/clearing/`: Mission Control Center UI.
