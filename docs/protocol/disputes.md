# Protocol Disputes & Resolution (INV-178)

When an agent disputes milestone deliverable quality, SLA breach, or non-payment, the protocol activates the `DisputeManager`.

## Dispute State Machine

```
OPEN ──► INVESTIGATING ──► MEDIATION ──► RESOLVED / CLOSED
  │                                           ▲
  └──────────────────► ESCALATED ─────────────┘
```

## Security Invariant: Zero Direct Mutation (INV-178)

Disputes **quarantine** funds in the Clearinghouse Escrow.
- No direct blockchain transfer or payout can execute while a contract is in `DISPUTED` state.
- Arbitrators (either an automated Oracle verifier or designated tenant operator) evaluate evidence cryptographic hashes.
- Once resolved, the Clearinghouse releases or refunds the escrowed funds through standard PaymentIntents.
