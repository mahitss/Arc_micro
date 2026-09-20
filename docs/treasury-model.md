# AgentPay Treasury & Accounting Model (Day 3 Update)

## 1. Overview & Core Proposition

AgentPay governs autonomous agent spending using a zero-trust treasury architecture.

**Core Principle**:
- **On-chain balance is authoritative** for the actual USDC held by `AgentVault.sol` on Arc.
- The off-chain database tracks **reservations**, **pending intents**, and **accounting metadata**, but does **not** pretend to be the blockchain balance.

```
+-------------------------------------------------------------+
|                      ON-CHAIN BALANCE                       |
|           Authoritative USDC balance on Arc Mainnet         |
|               (e.g., $100.00 / 100,000,000 base units)       |
+-------------------------------------------------------------+
                               |
                +--------------+--------------+
                |                             |
                v                             v
+-------------------------------+ +---------------------------+
|       RESERVED BALANCE        | |     AVAILABLE BALANCE     |
|   In-flight intents locked    | |   Funds legally spendable |
|   by approval or execution    | |   by active agents        |
|    (e.g., $60.00 reserved)    | |    (e.g., $40.00 spendable|
+-------------------------------+ +---------------------------+
```

---

## 2. Balances & Accounting Invariants

1. **Integer Base Units Only**:
   - All financial values in AgentPay are represented as integer strings representing **micro-USDC** (6 decimals).
   - $1.00 \text{ USDC} = 1{,}000{,}000 \text{ base units}$.
   - No floating-point types (`float64`, `f64`) are permitted anywhere in the accounting or policy pipeline.
2. **Formula**:
   $$\text{Available Amount} = \max(0, \text{On-Chain Balance} - \text{Total Active Reservations})$$
3. **Safety Invariant**:
   If on-chain balance is unavailable (e.g. RPC timeout or node sync delay), the system fails closed for execution. It **never** treats an unavailable balance as `$0.00`.

---

## 3. Treasury Reservation Lifecycle

Reservations prevent race conditions and over-allocation when multiple agents or payments attempt to spend the same funds concurrently.

```
       Payment Initiated / Approval Required
                        |
                        v
                    RESERVED  (Application-level lock)
                     /     \
   Execution Confirmed     Execution Failed / Rejected / Expired
                   /         \
                  v           v
              SETTLED       RELEASED
```

1. **Reservation Phase (`RESERVED`)**:
   - When an intent enters `APPROVAL_REQUIRED` or is submitted for execution, the treasury service creates an atomic `TreasuryReservation`.
   - Before reserving, the system checks:
     $$\text{Requested Amount} \le \text{Available Balance}$$
     If insufficient, the reservation is blocked with `ErrInsufficientAvailableFunds`.
   - Reservation does **not** move funds on-chain; it is an application-level lock.
2. **Settlement Phase (`SETTLED`)**:
   - Upon confirmed on-chain transaction receipt (`StatusConfirmed`), the reservation transitions to `SETTLED`.
3. **Release Phase (`RELEASED`)**:
   - If an intent is rejected by a human approver, expires via TTL, or reverts on-chain, the reservation transitions to `RELEASED`, immediately restoring available balance.
   - **Ambiguous Executions**: If transaction broadcast state is unknown or timed out, funds remain locked until the receipt is definitively resolved.

---

## 4. Treasury Summary API

Endpoint: `GET /v1/treasury/summary?organization_id=...&vault=...`

Sample Response:
```json
{
  "organization_id": "org_default",
  "vault_address": "0x1111111111111111111111111111111111111111",
  "on_chain_balance": "100000000",
  "reserved_amount": "60000000",
  "available_amount": "40000000",
  "asset": "USDC",
  "decimals": 6
}
```

---

## 5. Audit Events

Every treasury state change records an immutable audit event:
- `treasury.reserved` — Locked funds for intent.
- `treasury.released` — Released held funds.
- `treasury.settled` — Finalized on-chain settlement.
