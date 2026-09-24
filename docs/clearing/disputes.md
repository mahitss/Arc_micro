# Clearinghouse Disputes & Escalations (Task 18, Section 23)

## 1. Dispute Lifecycle & State Machine

```
   OPEN
    │
    ▼
UNDER_REVIEW
    │
    ├─────────────┐
    ▼             ▼
RESOLVED      ESCALATED
                  │
                  ▼
                CLOSED
```

## 2. Invariant: Disputed Obligations Cannot Settle (INV-210)

> **SAFETY INVARIANT (INV-210)**:
> An obligation flagged as `DISPUTED` cannot silently settle, participate in netting proposals, or consume Treasury liquidity until the dispute is authoritatively resolved by governance approval.

Attempting to route a disputed obligation through the `SettlementRouter` immediately fails with:
`clearing invariant violation (INV-210): disputed obligations cannot silently settle`

## 3. Refunds & Adjustments (Sections 24 & 25)

When a dispute is resolved in favor of the requester or claimant:
- The refund must reference the original payment intent and obligation.
- The double-entry ledger creates compensatory reversing credit/debit entries.
- The original obligation record and financial history are **NEVER deleted or mutated in-place**.
- Credit adjustments cannot create unbacked Treasury funds.
