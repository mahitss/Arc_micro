# AgentPay Autonomous Economic Clearinghouse: Security Specification

## 1. Security Architecture & Threat Boundary

The **Autonomous Economic Clearinghouse** is architected under a **Zero-Authority Trust Boundary**:
AI agents are considered untrusted economic participants capable of hallucination, prompt injection, collusive self-dealing, and runaway loops.

```
+-------------------------------------------------------------------------+
|                  UNTRUSTED AGENT EXECUTION ZONE                         |
|  - AI Agents propose obligations                                        |
|  - Sub-agents generate invoices                                         |
|  - LLMs negotiate terms                                                 |
+-------------------------------------------------------------------------+
                                    │
                                    ▼ (Proposals Only)
+-------------------------------------------------------------------------+
|              SECURITY BOUNDARY: ZERO-AUTHORITY CLEARINGHOUSE            |
|  - INV-55: Zero direct fund movement authority                          |
|  - INV-56: Single active escrow lock                                    |
|  - INV-57: Invoice deduplication & SHA-256 deliverable binding          |
|  - INV-58: Strict monotonic state machines                              |
|  - INV-61: Org boundary cryptographic isolation                         |
|  - INV-62: REAL vs SIMULATION physical isolation                        |
|  - INV-64: Hard economic exposure ceiling                               |
+-------------------------------------------------------------------------+
                                    │
                                    ▼ (Canonical PaymentIntents Only)
+-------------------------------------------------------------------------+
|                     FINANCIAL CONTROL PLANE                             |
|  - Rust Deterministic Policy Engine                                     |
|  - Treasury & Multi-Sig Controls                                        |
|  - Arc Blockchain (AgentVault Keyless Smart Contract)                   |
+-------------------------------------------------------------------------+
```

---

## 2. Invariant Enforcement Matrix (INV-55 to INV-70)

| Invariant | Name | Threat Mitigated | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **INV-55** | Zero Fund Movement Authority | Rogue clearinghouse code moving money | Clearinghouse possesses zero private keys; all settlement must route through `intent.Service`. |
| **INV-56** | Double Reservation Prevention | Double-locking budget for same obligation | Rejects escrow creation if active reservation exists for obligation ID. |
| **INV-57** | Invoice Deduplication & Hash Binding | Duplicate billing & phantom invoices | Rejects existing invoice IDs and identical canonical payload hashes. |
| **INV-58** | State Monotonicity | State rollbacks / retroactive changes | Enforces directed acyclic state transitions; terminal states cannot be exited. |
| **INV-59** | Deliverable Hash Verification | Fake or unverified milestone completion | Compares SHA-256 of deliverable payload against locked hash. |
| **INV-60** | Gross Liquidity Conservation | Forgetting un-netted obligations | Netting does not erase gross liabilities until net Arc settlement is verified. |
| **INV-61** | Cross-Org Isolation | Multi-tenant data or liability leakage | Every entity strictly scoped by `org_id`; cross-tenant references fail. |
| **INV-62** | Mode Separation | Simulated transactions draining real funds | `REAL` and `SIMULATION` cannot interact, net together, or share batches. |
| **INV-63** | Ledger Double-Entry Balance | Accounting leaks or balance inflation | Double-entry journal checks $\sum \text{Debits} == \sum \text{Credits}$ on every entry. |
| **INV-64** | Exposure Ceiling Enforcement | Runaway agent spending sprees | Prevents obligation creation if cumulative unreserved exposure exceeds cap. |
| **INV-65** | Reconciliation Determinism | Gas fee deviations or dropped transactions | Compares internal ledger amounts to exact Arc on-chain event base units. |
| **INV-66** | Dispute Control Freeze | Settling disputed or breached contracts | Marking `DISPUTED` freezes all automated release and settlement routes. |
| **INV-67** | Payer-Only Refund | Payee stealing refunded escrow deposits | Only `escrow.PayerAgentID` can receive refunded escrow balance. |
| **INV-68** | Milestone Sum Boundary | Over-allocating obligation milestone payments | Sum of milestone amounts cannot exceed parent obligation total. |
| **INV-69** | Netting Batch Atomicity | Partial netting failures corrupting state | Failed net settlements leave all constituent obligations intact and uncorrupted. |
| **INV-70** | Audit Trail Completeness | Untracked modifications / non-repudiation | Every state transition records actor ID, timestamp, and immutable audit event. |

---

## 3. Concurrency & Race Condition Defense

All state-modifying operations in the clearinghouse service are protected by fine-grained thread-safe locks (`sync.RWMutex`).
To eliminate settlement race conditions:
1. When a milestone or obligation settlement is requested, the record is immediately transitioned to `SETTLING` under write-lock.
2. The service releases the lock while routing the request asynchronously to `intent.Service`.
3. If intent creation fails or is denied by policy, the record rolls back to `ACTIVE` under write-lock.
4. Concurrent settlement requests on the same entity fail immediately with `ErrInvalidStateTransition`.
