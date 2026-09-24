# AgentPay Autonomous Economic Clearinghouse: Threat Model & Attack Matrix

## 1. Threat Actors & Capabilities

| Threat Actor | Description | Capabilities |
| :--- | :--- | :--- |
| **Malicious Peer Agent** | Compromised or adversarial AI agent in marketplace | Proposes bogus obligations, generates duplicate invoices, submits fake deliverables. |
| **Prompt Injector** | External user attempting to trick agent into spending | Alters agent objective to commit large deferred liabilities or siphon funds. |
| **Collusive Ring** | Group of coordinated rogue sub-agents | Creates circular obligation cycles to game netting algorithms or fake volume. |
| **Frontrunner / MEV Bot** | External network observer | Attempts to frontrun net settlements or submit stolen deliverable hashes. |
| **Rogue Internal Service** | Subverted gateway microservice | Attempts to bypass policy checks and invoke settlement directly. |

---

## 2. Adversarial Attack Scenarios & Mitigations

The clearinghouse has been subjected to a 30-scenario adversarial attack test suite (`services/gateway/internal/clearinghouse/adversarial_test.go`). All 30 scenarios have been machine-verified:

### Attack Vector 1: Unauthorized Direct Fund Movement
- **Attack:** Malicious agent attempts to invoke clearinghouse settlement without going through `intent.Service` and the Rust policy engine.
- **Result:** **BLOCKED (INV-55)**. Clearinghouse code has zero access to signing keys or direct contract execution. All value movement must be an authorized `PaymentIntent`.

### Attack Vector 2: Double Escrow Reservation
- **Attack:** Agent attempts to reserve multiple escrows against a single obligation to artificially lock counterparty budget.
- **Result:** **BLOCKED (INV-56)**. Second reservation attempt returns `ErrDoubleReservation`.

### Attack Vector 3: Duplicate Invoice Replay
- **Attack:** Payee submits identical invoice ID or identical invoice canonical payload hash twice.
- **Result:** **BLOCKED (INV-57)**. Rejected with `ErrDuplicateInvoice` and `ErrDuplicateInvoiceHash`.

### Attack Vector 4: Milestone Deliverable Tampering
- **Attack:** Payee submits an altered file whose SHA-256 hash does not match the milestone lock.
- **Result:** **BLOCKED (INV-59)**. Hash comparison fails; milestone cannot transition to `SETTLED`.

### Attack Vector 5: Terminal State Reversal
- **Attack:** Adversary attempts to re-activate a `SETTLED` or `VOIDED` obligation to double-claim funds.
- **Result:** **BLOCKED (INV-58)**. Monotonic state machine strictly rejects non-forward transitions.

### Attack Vector 6: Cross-Tenant Liability Injection
- **Attack:** Agent from `org_alpha` attempts to reference an obligation owned by `org_beta`.
- **Result:** **BLOCKED (INV-61)**. Cross-tenant references return `ErrTenantMismatch`.

### Attack Vector 7: Simulation to Real Contamination
- **Attack:** Adversary attempts to net simulated obligations against real mainnet obligations to extract real USDC.
- **Result:** **BLOCKED (INV-62)**. Mode comparison rejects mixing `REAL` and `SIMULATION`.

### Attack Vector 8: Runaway Liability Accumulation
- **Attack:** Rogue agent enters an infinite loop proposing new deferred obligations to deplete organizational credit.
- **Result:** **BLOCKED (INV-64)**. Real-time exposure engine halts proposals when cumulative exposure hits ceiling.

### Attack Vector 9: Payee Refund Hijacking
- **Attack:** Payee agent attempts to trigger an escrow refund to their own wallet address after contract expiry.
- **Result:** **BLOCKED (INV-67)**. Refund route verifies caller is strictly the original payer (`INV-67`).

### Attack Vector 10: Milestone Sum Inflation
- **Attack:** Agent creates milestones whose sum exceeds the parent obligation total.
- **Result:** **BLOCKED (INV-68)**. Validation checks $\sum \text{Milestones} \le \text{Obligation Total}$.

### Attack Vector 11: Netting Settlement Partial Failure
- **Attack:** An on-chain revert occurs during net settlement execution.
- **Result:** **RECOVERED (INV-69)**. Atomic rollback ensures no constituent obligations are marked settled prematurely.

### Attack Vector 12: Silent Gas / Fee Discrepancy
- **Attack:** An off-by-one micro-cent difference occurs between on-chain receipt and ledger.
- **Result:** **FLAGGED (INV-65)**. Reconciler flags `DISCREPANCY_FLAGGED` and halts automatic clearing for that lane.

---

## 3. Defense-in-Depth Summary

Through the layered isolation of:
1. **Coordination (Clearinghouse)**
2. **Deterministic Authorization (Rust Policy Engine)**
3. **Execution & Settlement (Go Gateway & AgentVault on Arc)**

AgentPay guarantees that no matter how sophisticated an AI prompt injection or agent hallucination becomes, **it cannot violate economic invariants or move unapproved funds.**
