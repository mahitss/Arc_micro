# Settlement Batches & Atomicity Control (Task 18, Sections 15–19)

## 1. Settlement Batches & Windows

Settlement batches coordinate multiple obligations into scheduled settlement windows:
- `IMMEDIATE`: Triggered upon milestone verification.
- `HOURLY`: Periodic aggregation window capturing cycle netting proposals.
- `DAILY`: End-of-day reconciliation and low-priority task clearing.
- `MILESTONE`: Triggered on multi-agent deliverable acceptance.
- `MANUAL`: Operator-supervised settlement window.

## 2. Settlement Router Flow

```
SettlementBatch
      │
      ▼
Validate Invariants
      │
      ▼
Policy Evaluation (Constitution)
      │
      ▼
Risk Engine Evaluation
      │
      ▼
Approval Engine (if required)
      │
      ▼
Treasury Reservation Check
      │
      ▼
PaymentIntent Generation
      │
      ▼
Authorized Execution (AgentVault / Arc)
      │
      ▼
Receipt Ingestion
      │
      ▼
Reconciliation Audit
```

> **EXECUTION INTEGRITY INVARIANT (INV-201 & INV-206)**:
> Batches **NEVER** interact directly with AgentVault or the blockchain. They route strictly through the canonical `PaymentIntent` pipeline and Treasury liquidity orchestrator.

## 3. Strict Partial Settlement Isolation (INV-208)

Batch state is aggregate; obligation state is independent.

If a batch contains 10 obligations:
- 7 settle successfully on Arc
- 3 encounter timeouts or execution errors

The system represents:
- Batch Status: `PARTIALLY_SETTLED`
- 7 obligations: `SETTLED`
- 3 obligations: `FAILED` or `RECONCILING`

**Batch outcomes never overwrite individual obligation states.** The 3 failed obligations retain full audit history and cannot be silently re-settled or treated as settled.
