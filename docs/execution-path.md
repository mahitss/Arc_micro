# AgentPay Autonomous Economic Fabric v1.0 — Canonical Financial Execution Path
**Document ID:** `docs/execution-path.md`  
**Classification:** Canonical Pipeline Specification  
**Authority:** Principal Engineer & CTO, AgentPay  
**Version:** v1.0  
**Verification Date:** 2026-09-25  

---

## 1. The Single Authoritative Execution Path

There is exactly **ONE authoritative path** for moving money in AgentPay:

```
                      1. Request Formulated
                               │
                               ▼
                      2. Financial Intent
                               │
                               ▼
                      3. Constitution
                               │
                               ▼
                      4. Policy Engine
                               │
                               ▼
                      5. Risk Engine
                               │
                               ▼
                      6. Approval Engine (if required)
                               │
                               ▼
                      7. Liquidity Check
                               │
                               ▼
                      8. Treasury Reservation
                               │
                               ▼
                      9. PaymentIntent (State = AUTHORIZED)
                               │
                               ▼
                     10. Execution Gate
                               │
                               ▼
                     11. Authorized Signer
                               │
                               ▼
                     12. AgentVault.sol (Arc Mainnet)
                               │
                               ▼
                     13. Arc USDC Settlement & Receipt
                               │
                               ▼
                     14. Reconciliation & Audit Ledger
```

Any subsystem attempting to bypass this pipeline to move money will fail immediately and trigger an operational security alert.

---

## 2. Step-by-Step Pipeline Mechanics

### 1. Request Formulated
An external agent, mission task, or clearing batch submits a request for payment. The request declares `agent_id`, `recipient`, `amount`, and `purpose`.

### 2. Financial Intent Instantiation
`intent.Service` assigns a unique `intent_id` and records the intent in `CREATED` status. Idempotency is enforced using `request_id`.

### 3. Constitution Evaluation
`constitution.Service` evaluates the 7-tier hierarchy (`GLOBAL → ORG → AGENT → MISSION → SWARM → TASK → PAYMENT`).
- If any tier returns `HARD_DENY`: Immediate termination with status `DENIED`.

### 4. Deterministic Policy Engine
The Rust Policy Engine (`services/policy-engine`) evaluates limits off-chain in <10 µs:
- Per-transaction limit
- Daily cumulative budget
- Hourly velocity limit
- Active recipient allowlist
- Global and tenant blocklists

### 5. Risk Engine
Computes a multi-factor risk score.
- If `RiskScore >= 80`: Intent transitions to `APPROVAL_REQUIRED`.
- If `RiskScore < 80`: Intent proceeds directly.

### 6. Approval Engine (Escalation)
If `APPROVAL_REQUIRED`:
- A two-person or multi-sig approval ticket is created with a strict cryptographic TTL.
- The intent remains blocked until valid human/governance signatures are recorded.
- If the ticket expires, status transitions to `EXPIRED`.

### 7. Liquidity Check & Treasury Reservation
`treasury.Service` inspects the vault's pool balance:
- Verifies that `Available - Amount >= SafetyBufferFloor`.
- Creates a `TreasuryReservation` locking the specific amount for this `intent_id`.

### 8. PaymentIntent Authorized
The PaymentIntent state transitions atomically to `AUTHORIZED` via Compare-And-Swap (CAS).

### 9. Pre-Flight Execution Gate Barrier
Before any cryptographic signature is requested, `execution.Service` performs mandatory real-time re-validation:
1. Current policy version matches evaluation version.
2. Current constitution hash matches evaluation hash.
3. Treasury reservation is still valid and unexpired.
4. Recipient address matches resolved service address.
5. System is not paused (`is_paused == false`).

### 10. Authorized Signer
The isolated signer (`LocalSigner` or `KMSSigner`) inspects the transaction binding:
- Chain ID == 5042 (Arc Mainnet).
- Target address == AgentVault contract address.
- Calldata matches `executePayment(recipient, amount, purpose)`.
- Native transaction value == 0 (all payments are in ERC-20 USDC).
- Signer address matches authorized relayer.

### 11. Smart Contract Execution (`AgentVault.sol`)
The signed transaction is broadcast to Arc RPC. The contract executes on-chain checks:
- Reentrancy guard activated.
- On-chain policy limits checked.
- Daily spending counter incremented.
- SafeERC20 transfer of USDC base units executed.
- `PaymentExecuted` event emitted.

### 12. Receipt & Polling
Gateway polls for the mined transaction receipt within `ARC_CONFIRMATION_TIMEOUT_MS`.
- If mined successfully: status transitions to `CONFIRMED`.
- If timeout: status transitions to `SUBMITTED_AMBIGUOUS` and routes to the Recovery Center. Never blindly rebroadcasts.

### 13. Clearing & Reconciliation
- Obligation is marked `SETTLED`.
- Encumbered liquidity is consumed in Treasury.
- Netting proposals updated.

### 14. Audit Ledger Entry
Append-only cryptographic record written to `audit_events` with full causal tracking (`causation_id`, `correlation_id`, `aggregate_id`).

---

## 3. Explicit Prohibitions

| Subsystem | Prohibited Action | Reason |
|---|---|---|
| **Marketplace** | Direct money movement | Marketplace only matches supply & demand. |
| **Missions** | Direct smart contract calls | Missions plan workflows; cannot control keys. |
| **Swarms** | Private key ownership | Swarms orchestrate tasks; zero authority. |
| **Simulation** | Transaction broadcast | Digital twin must remain strictly isolated. |
| **Learning** | Limit expansion | Historical performance cannot override security caps. |
| **Clearing** | Direct Arc execution | Clearing calculates debts; settlement flows via PaymentIntent. |
| **Treasury** | Direct token transfers | Treasury tracks liquidity; cannot sign arbitrary txs. |
