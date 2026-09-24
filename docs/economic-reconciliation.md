# AgentPay Continuous Audit & Economic Reconciliation

## 1. Overview

Autonomous agent economies generate hundreds or thousands of high-velocity micro-transactions. Without deterministic cryptographic reconciliation, subtle discrepancies—such as gas slippage, dropped RPC packets, or out-of-order event replay—can corrupt the economic ledger.

The **Economic Reconciliation Engine** continuously audits:
$$\text{Internal Clearinghouse Ledger} \iff \text{AgentVault Event Logs on Arc Blockchain}$$

Any variance triggers **INV-65** violation protocols and halts affected settlement lanes.

```
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│       CLEARINGHOUSE LEDGER      │        │     ARC BLOCKCHAIN ON-CHAIN     │
│  - Obligation ID: ob_101        │        │  - Tx: 0x8f4c8038d17b489a...    │
│  - Debits: 5,000,000 base       │  VS    │  - Value: 5,000,000 base        │
│  - Credits: 5,000,000 base      │        │  - Token: USDC (0x3600...)      │
│  - Status: SETTLED              │        │  - Event: VaultSettlement       │
└────────────────┬────────────────┘        └────────────────┬────────────────┘
                 │                                          │
                 └────────────────────┬─────────────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │     RECONCILIATION ENGINE     │
                      │  Exact match?                 │
                      │   - YES -> RECONCILED         │
                      │   - NO  -> DISCREPANCY_FLAGGED│
                      └───────────────────────────────┘
```

---

## 2. Machine-Checked Invariants

### INV-63: Double-Entry Balance
For every completed settlement entry in the clearinghouse journal:
$$\sum_{i} \text{Debit}_i - \sum_{j} \text{Credit}_j \equiv 0$$
No single-sided entries or phantom balances can exist.

### INV-65: Reconciliation Determinism
Every obligation or milestone marked `SETTLED` in the clearinghouse must possess an associated Arc transaction hash whose on-chain settlement amount matches the ledger amount to the **exact base unit** ($10^{-6}$ USDC).

---

## 3. Discrepancy Detection & Alerting

When a discrepancy is detected (e.g., on-chain transfer was for $4.50 instead of $5.00 due to fee miscalculation):
1. **Status Flagged:** The record is immediately transitioned to `DISCREPANCY_FLAGGED`.
2. **Execution Lane Frozen:** The payer and payee agent accounts are temporarily restricted from automatic clearing until resolution.
3. **Audit Event Emitted:** Emits high-priority webhook `clearinghouse.reconciliation.discrepancy`.
4. **Mission Control Alert:** Prominently displayed in Mission Control Center under `/economy/clearing/reconciliation`.

---

## 4. Reconciliation REST API

### Trigger Full Reconciliation Sweep
```http
POST /v1/economy/reconciliation/run HTTP/1.1
Host: gateway.agentpay.network
Authorization: Bearer sk_live_...
Content-Type: application/json

{
  "mode": "REAL",
  "org_id": "org_enterprise_corp",
  "from_block": 14200000
}
```

### Sample Response
```json
{
  "summary": {
    "total_records_checked": 142,
    "reconciled_count": 142,
    "discrepancy_count": 0,
    "total_volume_base": "4500000000",
    "status": "HEALTHY",
    "verified_at": "2026-09-24T17:15:00Z"
  },
  "records": [
    {
      "id": "rec_01",
      "obligation_id": "ob_7a8b9c",
      "ledger_amount": "5000000",
      "onchain_amount": "5000000",
      "tx_hash": "0x8f4c8038d17b489a263cbeaaec774e1d17466c483bcf3bcffab45e317b9b1836",
      "block_number": 14205120,
      "status": "RECONCILED",
      "discrepancy_base": "0"
    }
  ]
}
```
