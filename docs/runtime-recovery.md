# AgentPay Runtime Crash Recovery & Deterministic Replay

## 1. Crash Recovery Philosophy

In a distributed autonomous economy, failure is an inevitability:
- Worker pods get killed by Kubernetes OOM or Spot instance preemption.
- Network timeouts occur during external LLM and data provider API calls.
- Blockchain nodes experience RPC latency or temporary mempool congestion.

**The Golden Invariant:**
> *Recovery must reconstruct state from durable facts, not memory (`INV-119`, `INV-120`). Reconstructing state can never synthesize or expand financial spending authority (`INV-102`).*

---

## 2. Recovery Engine Responsibilities

The `RuntimeRecoveryEngine` (`services/gateway/internal/runtime/recovery.go`) periodically scans for abandoned, expired, or ambiguous work:

```
[Crash / Partition Occurs]
          ↓
[Lease Expiration Threshold Passed: now > expires_at]
          ↓
[Recovery Engine Scans Execution Steps]
          ↓
+-------------------------------------------------------------------+
| Is Step State FINANCIAL or BLOCKCHAIN SUBMISSION?                 |
+-------------------------------------------------------------------+
       |                                              |
       | NO (Safe Computational / Discovery Step)     | YES (Value-Bearing)
       v                                              v
[Advance Fencing Token]                       [INV-106 Invariant Barrier]
[Resume from Latest Checkpoint]               [Mark Step AMBIGUOUS]
[Dispatch to Healthy Standby Worker]          [Route to Reconciliation Queue]
                                              [Do NOT Blindly Rebroadcast]
```

### Deterministic Recovery Steps

1. **Stale Lease Identification:** Identify steps in `CLAIMED` or `RUNNING` state where `now > lease_expires_at`.
2. **Monotonic Fencing Preemption:** When a new worker claims the abandoned step, increment the `fencing_token`. Any late commit from the crashed worker is rejected with `ErrStaleFencingToken`.
3. **Latest Checkpoint Loading:** Restore step inputs and verified state from the last valid `Checkpoint`.
4. **Side-Effect Verification:** For non-financial steps, evaluate retry policy and schedule next attempt with backoff. For financial steps, verify whether an on-chain intent exists before touching the payment pipeline.

---

## 3. Financial Crash Matrix & Ambiguous Transactions

| Crash Scenario | State at Crash Time | Recovery Classification | Action Taken |
|---|---|---|---|
| **Case A** | Crash before PaymentIntent creation | Safe Step Failure | Resume from pre-payment checkpoint; re-evaluate 12-point barrier. |
| **Case B** | Crash after PaymentIntent created, before broadcast | Intent Persisted | Recover existing Intent ID using idempotency key (`INV-113`). Zero second intent created. |
| **Case C** | Crash after Treasury Reservation | Reservation Persisted | Confirm reservation is active. Proceed with bound intent. |
| **Case D** | Crash during/after Blockchain Broadcast | `AMBIGUOUS` | Route to Reconciliation Queue. Query Arc RPC by transaction hash or idempotency key. Never rebroadcast blindly (`INV-106`). |
| **Case E** | Crash after Confirmed Receipt | Terminal Succeeded | Load verified on-chain receipt from storage. Advance step to `SUCCEEDED`. |
| **Case F** | Worker dies after payment settlement | Completed State | Step and ledger are already immutable. No duplicate payment occurs. |
| **Case G** | Duplicate callback or webhook received | Idempotency Check | Inbox table detects duplicate `idempotency_key` or `nonce`. Second payload ignored (`INV-112`). |

---

## 4. Exactly-Once Effect Semantics

AgentPay recognizes that true distributed exactly-once execution across heterogeneous external networks is impossible. We implement the proven production pattern:

$$\text{At-Least-Once Dispatch} + \text{Deterministic Idempotency Keys} + \text{Fenced Monotonic Leases} + \text{External Reconciliation} \implies \text{Exactly-Once Financial Effects}$$

### Idempotency Key Taxonomy

- **Workflows:** `tenant_id` + `aggregate_type` + `aggregate_id` + unique client seed.
- **Execution Steps:** `workflow_id` + `step_type` + `sequence`.
- **Payment Intents:** `sha256(workflow_id + step_id + amount + recipient + asset)`.
- **External Callbacks:** Enforced via `inbox_events.idempotency_key` and nonce verification.
