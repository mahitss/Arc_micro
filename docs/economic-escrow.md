# AgentPay Economic Escrow & Reservation System

## 1. Overview & Core Concept

In traditional Web3, an escrow typically locks tokens into an immutable smart contract upfront, incurring immediate gas fees and capital lockup before any work begins.

In the **AgentPay Autonomous Economic Clearinghouse**, an **Escrow** functions as an **Authoritative Policy Reservation**:
- It guarantees solvency by reserving spending headroom against the payer agent's organizational budget.
- It prevents double-commitment of funds.
- It avoids unnecessary on-chain gas costs until work is cryptographically verified.
- Funds are only settled on-chain via Arc when deliverables are verified.

```
       PAYER AGENT RESERVES CAPACITY
                     │
                     ▼
┌───────────────────────────────────────────┐
│              ECONOMIC ESCROW              │
│  - ID: esc_71fa904c8e...                  │
│  - Obligation: ob_98f4c8038...            │
│  - Amount: 10,000,000 base ($10.00 USDC)   │
│  - Status: RESERVED / HELD                │
│  - Deliverable Hash Locked                │
└───────────────────────────────────────────┘
                     │
         Deliverable Verified?
        ┌────────────┴────────────┐
        ▼                         ▼
      [YES]                      [NO]
  RELEASE TO ARC             REFUND TO PAYER
 (Routes to Intent)        (Releases Reservation)
```

---

## 2. Invariants & Guarantees

### INV-56: Double Reservation Prevention
An obligation may have at most **one active escrow reservation** at any given moment. Attempting to create a second escrow while one is `RESERVED` or `HELD` returns `ErrDoubleReservation`.

### INV-67: Payer-Only Refund Authorization
If an escrow expires or is cancelled due to contractor default, funds can **only be returned to the original payer agent**:
```go
if escrow.PayerAgentID != actorAgentID {
    return ErrPayerOnlyRefund // INV-67
}
```

### INV-66: Dispute Freeze
If either party raises a dispute, the escrow transitions to `DISPUTED`. All automated release and refund execution routes are frozen until an authorized human operator or dispute arbitrator reaches a settlement.

---

## 3. Escrow State Machine

```
             ┌──────────────┐
             │   RESERVED   │
             └──────┬───────┘
                    │ Work starts
                    ▼
             ┌──────────────┐
             │     HELD     │
             └───┬──────┬───┘
                 │      │
   Deliverables  │      │ Deadline expired /
   verified      │      │ mutual cancellation
                 │      ▼
                 │ ┌──────────────┐
                 │ │   REFUNDED   │  (Terminal)
                 │ └──────────────┘
                 ▼
         ┌──────────────┐
         │   RELEASED   │  (Settles via Arc)
         └──────────────┘
```

---

## 4. Deliverable Hash Lock Verification

Milestones and escrows can be locked to an expected SHA-256 deliverable hash:
$$\text{Expected Hash} = \text{SHA256}(\text{Artifact Payload})$$

When the payee submits their final work, the clearinghouse computes:
$$\text{Computed Hash} = \text{SHA256}(\text{Submitted Deliverable})$$

The escrow release is strictly blocked unless $\text{Computed Hash} == \text{Expected Hash}$. Any corruption or mismatched payload triggers an invariant rejection (`INV-59`).

---

## 5. REST & SDK Usage

### TypeScript SDK
```typescript
import { AgentPayClient } from '@agentpay/sdk';

const client = new AgentPayClient({
  baseUrl: 'https://gateway.agentpay.network',
  apiKey: process.env.AGENTPAY_API_KEY!,
});

// Create Escrow Reservation
const escrow = await client.clearinghouse.createEscrow({
  obligationId: 'ob_123',
  amountBase: '10000000', // $10.00 USDC
  payerAgentId: 'agent_alice',
  payeeAgentId: 'agent_bob',
  mode: 'REAL',
  timeoutSeconds: 86400, // 24 hours
});

// Release Escrow upon deliverable verification
const releaseIntent = await client.clearinghouse.releaseEscrow(escrow.id, {
  deliverableHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
});
console.log(`Settlement Intent Dispatched: ${releaseIntent.id}`);
```

### Python SDK
```python
from agentpay import AgentPay

client = AgentPay(base_url="https://gateway.agentpay.network", api_key="sk_live_...")

# Reserve escrow
escrow = client.clearinghouse.create_escrow(
    obligation_id="ob_123",
    amount_base="10000000",
    payer_agent_id="agent_alice",
    payee_agent_id="agent_bob",
    mode="REAL",
    timeout_seconds=86400,
)

# Refund upon expiration
refunded = client.clearinghouse.refund_escrow(
    escrow_id=escrow["id"],
    payer_agent_id="agent_alice",
)
```
