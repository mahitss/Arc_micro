# AgentPay — Security Model & Invariant Specification

$$\text{SECURITY PHILOSOPHY: ZERO TRUST IN PROBABILISTIC MODELS}$$
$$\text{INVARIANT FOUNDATION: MATHEMATICALLY BOUNDED FINANCIAL AUTHORITY}$$

---

## 1. Core Security Invariants

The AgentPay platform enforces a defense-in-depth security model across 12 fundamental invariants:

### 1. Zero Private Key Custody (`INV-1`)
AI agents and task planners operate strictly without private keys. Neither seed phrases, private keys, nor signing credentials ever enter agent memory, environment variables, or client bundles. Signing authority resides exclusively in the compiled Go Gateway execution signer (`services/gateway/internal/signer`).

### 2. Zero Direct Smart Contract Invocation (`INV-108`)
AI agents cannot directly invoke EVM JSON-RPC methods (`eth_sendTransaction`, `eth_sendRawTransaction`) or interact directly with `AgentVault.sol`. Value movement occurs exclusively through the gateway's authorized relayer pipeline.

### 3. Server-Controlled Recipient Binding (`INV-2`)
AI agents submit payment intents referencing registered service identifiers (e.g. `service_registry:provider-b`). The gateway resolves the on-chain destination address server-side from the verified Service Registry. Arbitrary or injected hexadecimal recipient addresses are rejected.

### 4. Inviolable `HARD_DENY` (`INV-46`)
Sanctioned entities, blocked recipients, or disabled policies trigger an immediate, deterministic `HARD_DENY` evaluated in the Rust policy core. `HARD_DENY` is inviolable: it cannot be bypassed by human operators, AI replanning, or emergency override tools.

### 5. Monotonic Budget Envelope Reduction (`INV-148`)
Mission objectives define an immutable financial ceiling (`ObjectiveConstraints.BudgetCapUSDC`). Authority follows a 7-tier hierarchy (`GLOBAL → ORG → AGENT → MISSION → SWARM → TASK → PAYMENT`). Lower scopes can only tighten limits; they can never expand. Any attempt to request funds exceeding the remaining budget envelope returns `ErrAuthorityEscalation`.

### 6. Simulation Isolation Boundary (`INV-10`, `INV-107`)
Workflows flagged with `is_simulation = true` are strictly rejected by the execution signer. Zero simulated intents can trigger on-chain RPC broadcasts, mutate the database production state, or encumber unverified funds.

### 7. Lease-Fenced Worker Recovery (`INV-101`)
Worker processes operate under short-lived execution leases. If a worker crashes or drops connection, its lease expires (>2000ms). Stale workers attempting to commit post-expiry return `ErrLeaseExpired`. Crash recovery cannot synthesize new financial authority (`INV-102`).

### 8. Provider Substitution Containment (`INV-143`, `INV-146`)
When a service provider fails mid-mission, the autonomous replanning loop can select an alternative candidate. However, the replacement must strictly satisfy:
- Recipient verified in the Service Registry (`INV-146`).
- Total cumulative mission spend $\le$ original objective budget envelope (`INV-143`).
- SLA and risk parameters within constitutional limits.

### 9. Atomic Revalidation of Stale State (`INV-114`)
Execution requests cannot execute against stale policy snapshots, outdated quotes, or expired treasury reservations (`INV-76`). The gateway performs atomic pre-flight revalidation immediately before calldata construction.

### 10. Cryptographic Idempotency & Replay Protection (`INV-112`)
Payment requests require unique client-generated or server-hashed idempotency keys. Replayed requests return cached execution receipts without creating duplicate treasury reservations, ledger debits, or settlement batches.

### 11. Exact Calldata Binding (`INV-21`)
Before signing an EIP-1559 transaction, the execution signer validates that:
- The target address exactly matches the configured `AgentVault` address.
- The ABI-encoded calldata hash matches the approved `PaymentIntent`.
- The native Arc gas value is strictly zero (`msg.value == 0`).
- The destination chain ID matches Arc Mainnet (`5042`).

### 12. Double-Entry Balance Conservation (`INV-71`, `INV-201`)
The clearinghouse and treasury maintain strict double-entry ledger bookkeeping. Every credit has an equal debit. Available spendable liquidity is calculated as:
$$\text{Available Liquidity} = \text{Total Balance} - \text{Active Encumbered Reservations} - \text{Safety Buffer Floor}$$
Unverified blockchain inflows cannot become spendable liquidity (`INV-81`).
