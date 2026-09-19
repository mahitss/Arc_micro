# AgentPay Security Threat Model & Trust Boundary Specification

> **Status**: Prototype Security Specification  
> **Disclaimer**: AgentPay is an unaudited hackathon / microgrant prototype. This document formalizes the threat model, trust boundaries, defense-in-depth architecture, and failure-recovery mechanisms.

---

## 1. System Architecture & Trust Boundaries

The AgentPay payment pipeline traverses seven distinct trust boundaries:

```
[USER / OPERATOR] (Untrusted Input)
       ↓ (1)
[WEB CONTROL CENTER] (Untrusted Client Environment)
       ↓ (2)
[GO GATEWAY] (Trusted Orchestration & Policy Enforcement)
       ↓ (3)
[AI AGENT / LLM] (Untrusted Reasoning Engine)
       ↓ (4)
[RUST POLICY ENGINE] (Authoritative Deterministic Risk Boundary)
       ↓ (5)
[EXECUTION SERVICE] (Guarded Signing & Nonce Management)
       ↓ (6)
[SOLIDITY AGENTVAULT] (On-Chain Smart Contract Security Boundary)
       ↓ (7)
[ARC MAINNET] (USDC Settlement Layer)
```

---

## 2. Trust Boundary Analysis

### Boundary 1 & 2: User / Web Frontend → Go Gateway
- **Trusted**: Gateway validation logic, server-side configurations.
- **Untrusted**: HTTP request bodies, headers, user prompts, client-side parameters.
- **Threats**: 
  - Malformed or oversized JSON payloads attempting DoS.
  - Client-side manipulation of recipient addresses or USDC amounts.
  - Client-side spoofing of chain configuration (`chain_id`, `rpc_url`).
  - Brute force and request flooding.
- **Mitigations & Enforcement**:
  - `http.MaxBytesReader` enforces strict request body limits (default 1MB).
  - Gateway middleware enforces per-IP token bucket rate limiting.
  - Client-provided recipient addresses and chain IDs are **NEVER trusted**.
  - All recipient addresses are resolved strictly through the server-side **Service Registry**.
  - Chain ID is locked to `5042` and verified at boot and runtime against the connected RPC.
- **Failure Behavior**: Request rejected with `400 Bad Request`, `429 Too Many Requests`, or `403 Forbidden`.

---

### Boundary 3 & 4: Go Gateway ↔ AI Agent Model
- **Trusted**: Gateway prompt wrapper, Service Registry catalog.
- **Untrusted**: Model reasoning, LLM output tokens, prompt injection payloads.
- **Threats**:
  - Prompt injection attacks attempting to force transfers to arbitrary attacker wallets.
  - Generation of arbitrary smart contract calldata.
  - Hallucinated or malformed JSON responses.
  - Attempts to request unauthorized assets (e.g. `ETH`, `BTC`) or unapproved services.
- **Mitigations & Enforcement**:
  - **No Private Keys**: The AI agent **never receives private keys, seed phrases, or signing capabilities**.
  - **Structured Intent Output Only**: The AI model is constrained to output structured JSON conforming to `AIIntentResponse`.
  - **Server-Side Recipient Resolution**: The AI model only selects a `service_id` (e.g., `web-research`). The Go Gateway maps this ID to the approved recipient address in the immutable Service Registry.
  - If the AI model attempts to output an explicit recipient address that differs from the registry, the gateway rejects the intent with `ErrRecipientManipulation`.
  - All amounts must parse into positive integer base units (micro-USDC).
- **Failure Behavior**: Intent generation is aborted; returns `NO_PAYMENT_REQUIRED` or an explicit validation error. No transaction is created.

---

### Boundary 4 & 5: Go Gateway → Rust Policy Engine
- **Trusted**: Gateway request transmission; Rust policy evaluation rules.
- **Untrusted**: Any assumption that an intent is safe prior to policy evaluation.
- **Threats**:
  - Policy bypass through non-deterministic evaluation.
  - Arithmetic overflow / underflow.
  - Floating-point precision loss.
  - Replay attacks or state confusion.
- **Mitigations & Enforcement**:
  - **Pure Deterministic Function**: Rust `authorize()` is a pure, side-effect-free function.
  - **Checked Integer Math**: All balance calculations use `checked_add` and integer base units (6 decimals). Zero floating-point arithmetic.
  - **Authorization Precedence**: Blockchain execution is **physically impossible** without prior explicit `ALLOW` from the Rust Policy Engine.
  - **Evaluation Order**:
    1. Request ID validation
    2. Agent & Policy enabled check
    3. Positive amount validation
    4. Allowed asset check (`USDC` only)
    5. Blocked recipient check (blacklist takes precedence)
    6. Allowed recipient check (whitelist enforcement)
    7. Per-transaction limit check
    8. Daily transaction count check
    9. Daily spending budget check (with overflow protection)
- **Failure Behavior**: Returns `DENY` with deterministic reason code. Gateway transitions intent to `DENIED` and terminates the flow.

---

### Boundary 5 & 6: Execution Service → Solidity AgentVault
- **Trusted**: Gateway executor key management, EIP-1559 transaction construction.
- **Untrusted**: Network transport, RPC node responses.
- **Threats**:
  - Concurrent double-spend attempts (race conditions).
  - Gas price manipulation or nonce desynchronization.
  - Execution on the wrong blockchain or testnet.
  - Private key leakage via logs, error responses, or Git.
- **Mitigations & Enforcement**:
  - **Atomic Compare-and-Swap (CAS)**: Intent confirmation transitions atomically from `AUTHORIZED` to `EXECUTING`. Concurrent confirmation attempts fail or return the existing execution.
  - **Startup Safety Gate**: Gateway fails closed on boot if `ENABLE_LIVE_EXECUTION=true` but `eth_chainId != 5042` or `EXECUTOR_PRIVATE_KEY` is missing/invalid.
  - **Zero Key Exposure**: Keys exist only in process memory loaded from environment variables. Never logged, never returned over HTTP.
  - **Reconciliation-Safe Nonce Handling**: Mined transactions are verified on-chain via `TransactionReceipt` and event unpacking before marking `CONFIRMED`.
- **Failure Behavior**: Transaction reverts or fails; intent marked `FAILED` or retried via idempotent receipt query.

---

### Boundary 6 & 7: AgentVault → Arc Mainnet
- **Trusted**: Solidity bytecode, OpenZeppelin primitives (`SafeERC20`, `ReentrancyGuard`, `Pausable`, `Ownable2Step`).
- **Untrusted**: Malicious callers, reentrancy attacks, front-running.
- **Threats**:
  - Unauthorized callers triggering payments.
  - Reentrancy attacks attempting drain.
  - Daily spending window manipulation.
  - Unauthorized withdrawals.
- **Mitigations & Enforcement**:
  - `executePayment` restricted strictly to `onlyOwner` (the secure executor).
  - OpenZeppelin `ReentrancyGuard` on all state-modifying entry points.
  - OpenZeppelin `SafeERC20` used for all USDC token transfers.
  - UTC daily window calculation resets at midnight UTC based on `block.timestamp / 86400`.
  - Emergency `pause()` function halts all payment executions instantly.
  - `withdraw()` requires `onlyOwner`, validates non-zero recipient, checks contract balance, and emits events.
- **Failure Behavior**: Transaction reverts on-chain; zero funds move.

---

## 3. Failure Modes & Recovery Matrix

| Scenario | System State | Recovery Action |
| :--- | :--- | :--- |
| **RPC unavailable before submission** | Intent remains `AUTHORIZED` | Gateway fails with RPC error; operator or retry executes cleanly. |
| **Submission rejected by node** | Intent transitions to `FAILED` | Error recorded with reason; no funds moved. |
| **Submission succeeds but network drops** | Intent remains `EXECUTING` | Recovery query checks `eth_getTransactionReceipt(txHash)`. If confirmed, marks `CONFIRMED`. Never re-broadcasts. |
| **Confirmation timeout** | Intent remains `EXECUTING` | Polling continues or operator checks explorer. Idempotency prevents duplicate submission. |
| **Transaction reverts on-chain** | Intent transitions to `FAILED` | Receipt status `0` detected; failure recorded. |
| **Gateway crashes during execution** | Intent in `EXECUTING` | On restart, gateway checks transaction status on-chain before taking any action. |

---

## 4. Security Rules & Invariants Summary

1. **AI Output Is Untrusted**: The LLM cannot authorize payments, select recipients, sign transactions, or specify contract calldata.
2. **Zero Floating-Point Arithmetic**: All monetary values are integer base units (`micro-USDC`).
3. **Fail-Closed by Default**: `ENABLE_LIVE_EXECUTION=false` by default. Any network or key error immediately halts execution.
4. **Idempotency Over Everything**: No intent can be executed more than once. Concurrent requests are serialized via atomic compare-and-swap.
