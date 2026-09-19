# AgentPay Security Architecture & Threat Model

> **Status**: Prototype Security Specification & Final Submission Freeze  
> **Target Network**: Arc Mainnet (Chain ID `5042`)  
> **Audience**: Technical Reviewers, Security Auditors, Grant Evaluators

---

## 1. Core Security Model: AI is Untrusted

In AgentPay, the artificial intelligence reasoning layer is treated as completely **untrusted**.

### What the AI CAN Do:
- Ingest high-level user tasks and reason about external tool dependencies.
- Create a structured **Payment Intent** requesting funds for an approved service.

### What the AI CANNOT Do:
1. **Cannot Directly Sign Transactions**: The AI never possesses signing authority, private keys, or seed phrases.
2. **Cannot Access Private Keys**: Keys are isolated in server-side environment variables loaded exclusively by the Go Gateway execution service at runtime.
3. **Cannot Choose Arbitrary Calldata**: The AI outputs structured JSON (`service_id`, `amount`, `purpose`). Transaction calldata is packed deterministically server-side.
4. **Cannot Bypass Policy**: The Go Gateway mandates explicit `ALLOW` authorization from the Rust Policy Engine before any execution call can be dispatched.
5. **Cannot Bypass Service Registry**: The AI cannot specify an arbitrary recipient wallet address. The Go Gateway resolves recipient addresses strictly through the server-side Service Registry.
6. **Cannot Bypass AgentVault Controls**: On-chain smart contracts independently enforce daily spending limits, per-transaction maximums, and emergency pause switches directly in EVM bytecode.

---

## 2. Deterministic Policy Layer Evaluation

The standalone **Rust Policy Engine** (`services/policy-engine`) acts as the authoritative off-chain gatekeeper. It evaluates:

- **Amount**: Must be a positive integer base unit (micro-USDC). Evaluated with checked arithmetic (`checked_add`) to prevent overflow. Zero amounts and negative amounts are rejected.
- **Recipient**: Normalized case-insensitive address check. Blocklists take strict precedence over allowlists.
- **Asset**: Constrained strictly to authorized assets (`USDC` only).
- **Daily Spending**: Aggregated daily expenditure cannot exceed `daily_limit`.
- **Transaction Limits**: Single transaction amount cannot exceed `per_transaction_limit`.
- **Service Constraints**: Daily transaction count cannot exceed `max_transactions_per_day`.

If any check fails, the policy engine returns `DENY` with an explicit reason code (e.g., `DAILY_LIMIT_EXCEEDED`).

---

## 3. Separation of Controls

AgentPay enforces defense-in-depth by strictly separating **Application-Level Controls** from **On-Chain Controls**:

### APPLICATION-LEVEL CONTROLS (Off-Chain)
1. **Prompt Injection Defense**: Task inputs are wrapped in `<user_task>` delimiters with strict length bounds (4,096 bytes).
2. **Server-Side Service Registry**: Curated mapping of service IDs (`web-research`, `compute-cluster`, `data-feed`) to verified recipient addresses and price ceilings (`max_price`).
3. **Pure Rust Policy Evaluation**: Deterministic authorization executed in sub-millisecond latency with zero clock, network, or filesystem side effects.
4. **Atomic Compare-And-Swap (CAS)**: State transition from `AUTHORIZED` to `EXECUTING` is executed atomically in SQL (`UPDATE ... WHERE status = 'AUTHORIZED'`), preventing double-click execution and race conditions.
5. **Fail-Closed Execution Gate**: `ENABLE_LIVE_EXECUTION` defaults to `false`. Pre-flight boot validation terminates if RPC is unreachable or Chain ID does not match `5042`.
6. **Zero Browser Secrets**: Frontend bundles and client logs contain zero private keys or signing credentials.

### ON-CHAIN CONTROLS (Arc Smart Contract: `AgentVault.sol`)
1. **Independent On-Chain Daily Limits**: `AgentVault.sol` tracks daily spending (`dailySpent`) and resets automatically across UTC days. Even if the off-chain gateway is compromised, an attacker cannot withdraw or spend beyond the on-chain limit.
2. **Per-Transaction Caps**: On-chain validation `require(amount <= policy.perTxLimit, "Exceeds per-tx limit")`.
3. **On-Chain Recipient Allowlist/Blocklist**: The vault maintains its own mapping of allowed and blocked recipients.
4. **Emergency Pause Switch (`pause()`)**: The vault owner can instantly freeze the vault on-chain, immediately reverting any subsequent `executePayment` calls.
5. **Emergency Sweep (`withdraw()`)**: The vault owner can sweep remaining USDC back to the treasury wallet at any time.
6. **Reentrancy Protection**: All payment and withdrawal functions use OpenZeppelin's `ReentrancyGuard`.
7. **Immutable Audit Events**: Every successful settlement emits `PaymentExecuted(bytes32 indexed intentId, address indexed recipient, uint256 amount, uint256 fee)` on Arc.
