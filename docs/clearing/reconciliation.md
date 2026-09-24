# Settlement Reconciliation & Blockchain Verification (Task 18, Sections 20–22, 57)

## 1. Authoritative Reconciliation Model

For every blockchain settlement attempt, AgentPay records:
- `PaymentIntent ID`
- Transaction hash (only if authoritatively returned by Arc node)
- Chain ID
- Target recipient address
- Verified amount
- Block number & confirmation depth
- Timestamp

## 2. Discrepancy Classification & Safe Actions

| Discrepancy Case | Classification | System Response | Safe Next Action |
|------------------|----------------|-----------------|------------------|
| $\text{Expected} = \text{Observed}$ | `MATCHED` | Transition obligation to `SETTLED`. Update Ledger. | None (`NO_ACTION_REQUIRED`) |
| Expected, but observed is missing / network timeout | `AMBIGUOUS` | Flag obligation as `RECONCILING`. | `AWAIT_CHAIN_CONFIRMATION_DO_NOT_RETRY` |
| Observed on-chain but no expected payment intent | `UNMATCHED_RECEIPT` | Quarantine receipt. Alert Control Tower. | `INVESTIGATE_ANOMALOUS_RECEIPT` |
| Amount mismatch | `AMOUNT_MISMATCH` | Freeze settlement. Flag reconciliation backlog. | `RECONCILE_DISCREPANCY` |
| Recipient mismatch | `RECIPIENT_MISMATCH` | Immediate security escalation. | `SECURITY_INCIDENT_ESCALATION` |
| Chain mismatch | `CHAIN_MISMATCH` | Immediate security escalation. | `SECURITY_INCIDENT_ESCALATION` |
| Duplicate tx hash detected | `DUPLICATE_TX` | Block duplicate accounting update. | `INVESTIGATE_DUPLICATE` |

## 3. Zero Blind Rebroadcast Invariant (INV-209)

> **SAFETY INVARIANT (INV-209)**:
> An ambiguous transaction outcome must **NEVER** be blindly rebroadcast or re-submitted.
> The reconciler must query the blockchain node to verify whether the transaction was mined before any compensatory action is taken.

## 4. Arc Evidence Verification (INV-219)

If an AgentVault transaction hash has not been confirmed on-chain or the vault is not deployed, the Control Tower displays `NOT VERIFIED`. No fabricated hashes, contract addresses, or balances are ever displayed.
