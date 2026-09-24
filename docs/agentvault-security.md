# AgentVault Smart Contract Security Audit & Role Separation Analysis
**Document ID:** `docs/agentvault-security.md`  
**Contract:** `contracts/src/AgentVault.sol`  
**Target Network:** Arc Mainnet (Chain ID 5042)  
**Native USDC Contract:** `0x3600000000000000000000000000000000000000`  
**Solidity Version:** `0.8.24` (via OpenZeppelin Contracts v5.0)  
**Auditor:** Release Engineer & Security Lead, AgentPay  
**Verification Date:** 2026-09-25  

---

## 1. Executive Summary

`AgentVault.sol` is the programmable on-chain settlement gateway for autonomous AI agents on the Arc network. It enforces spending limits, daily calendar allowances, recipient allowlists, and emergency pausing directly in EVM bytecode before transferring native USDC tokens.

### Security Invariants & Verification Status

| Invariant / Mechanism | Implementation Details | Test Coverage | Status |
|---|---|---|---|
| **Zero Trust** | Re-validates all limits and allowlists on-chain regardless of off-chain policy engine claims. | 40 unit + 3 fuzz tests | `VERIFIED` |
| **Checks-Effects-Interactions** | State variables (`dailySpent`, `dailyTransactionCount`) incremented BEFORE token transfer. | `test_18`, `test_19`, fuzz | `VERIFIED` |
| **Reentrancy Protection** | OpenZeppelin `ReentrancyGuard` applied to `executePayment` and `withdraw`. | Bytecode & static analysis | `VERIFIED` |
| **Integer Arithmetic Safety** | Native checked arithmetic in Solidity 0.8.24 halts on overflow (`INV-47`). | `test_30`, fuzz suites | `VERIFIED` |
| **Blocked Precedence** | Blocked recipients can NEVER receive funds even if allowlisted (`INV-46`). | `test_09`, `test_28` | `VERIFIED` |
| **Safe Token Transfers** | OpenZeppelin `SafeERC20` used for all USDC token interactions. | `test_22`, `test_24` | `VERIFIED` |
| **Emergency Extraction** | `withdraw` can execute while paused to allow emergency capital extraction. | `test_24`, `test_26` | `VERIFIED` |

---

## 2. Comprehensive Function-by-Function Security Review

### 2.1 `executePayment(address recipient, uint256 amount, bytes32 purpose)`
- **Modifiers**: `external nonReentrant onlyOwner whenNotPaused`
- **Execution Flow**:
  1. `policy.enabled`: Reverts with `PolicyDisabled()` if disabled.
  2. `recipient != address(0)`: Reverts with `ZeroAddress()`.
  3. `amount > 0`: Reverts with `InvalidAmount()`.
  4. `blockedRecipients[recipient]`: Strict precedence; reverts with `RecipientIsBlocked()`.
  5. `allowlistEnabled`: If true and recipient not allowed, reverts with `RecipientNotAllowed()`.
  6. `amount <= policy.perTransactionLimit`: Reverts with `TransactionLimitExceeded()`.
  7. `_refreshDailyWindow()`: Resets `dailySpent` and `dailyTransactionCount` if UTC calendar day rolled over.
  8. `policy.dailyTransactionCount < policy.maxTransactionsPerDay`: Reverts with `DailyTransactionLimitExceeded()`.
  9. `policy.dailySpent + amount <= policy.dailyLimit`: Reverts with `DailyLimitExceeded()`.
  10. `usdc.balanceOf(address(this)) >= amount`: Reverts with `InsufficientBalance()`.
  11. State update: `policy.dailySpent += amount`, `policy.dailyTransactionCount += 1`.
  12. External call: `usdc.safeTransfer(recipient, amount)`.
  13. Event: `emit PaymentExecuted(recipient, amount, purpose, policy.currentDay)`.

### 2.2 `withdraw(address recipient, uint256 amount)`
- **Modifiers**: `external nonReentrant onlyOwner`
- **Security Purpose**: Emergency or administrative liquidity extraction. Operates even when the vault is paused.
- **Safety Boundary**: Only callable by `owner`.

### 2.3 `setPolicy(...)`, `setRecipientAllowed(...)`, `setRecipientBlocked(...)`, `pause()`, `unpause()`
- All administrative functions are restricted to `onlyOwner`.

---

## 3. Critical Production Finding: Owner / Relayer Separation

### The Architecture Risk
In `AgentVault.sol` line 104, `executePayment` requires `onlyOwner`.
```solidity
    function executePayment(address recipient, uint256 amount, bytes32 purpose)
        external
        nonReentrant
        onlyOwner
        whenNotPaused
```
Because `onlyOwner` also guards `withdraw`, `setPolicy`, and `pause`:
- If the Gateway server holds the `owner` private key as a hot relayer, a compromise of the Gateway server allows an attacker to call `withdraw()` and drain all vault funds.
- Conversely, if the `owner` key is held in a cold multi-sig Safe, automated payments cannot be executed without human multi-sig approvals.

### Release Decision: PRODUCTION BLOCKED FOR UNRESTRICTED CAPITAL
Live mainnet release for unrestricted funds is **PRODUCTION_BLOCKED** until `AgentVaultV2` is deployed.

**Target Architecture (`AgentVaultV2` via OpenZeppelin `AccessControl`)**:
```
DEFAULT_ADMIN_ROLE (Cold Multi-Sig Safe)
  ├── setPolicy()
  ├── setRecipientAllowed() / setRecipientBlocked()
  ├── pause() / unpause()
  └── withdraw() (Emergency Extraction)

RELAYER_ROLE (Restricted Hot Signer on Gateway)
  └── executePayment() (Bounded by on-chain limits)
```

**Canary Deployment Exception**:
Canary deployments with strictly bounded capital (<50 USDC) are permitted under `LocalSigner` with continuous operational monitoring.
