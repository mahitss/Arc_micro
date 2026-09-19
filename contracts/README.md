# AgentPay Smart Contracts (AgentVault)

> **On-Chain Enforcement Layer for Programmable USDC Payments on Arc Network.**

---

## 1. Overview

**AgentVault** (`contracts/src/AgentVault.sol`) is the on-chain execution and custody contract of AgentPay.

While the **Rust Policy Engine** acts as an off-chain deterministic risk filter, **AgentVault** serves as the immutable on-chain security boundary. It enforces spending controls, daily budgets, transaction frequency caps, and recipient blacklists directly in EVM bytecode before transferring USDC.

```
AI Agent
   ↓
Payment Intent
   ↓
Go Gateway
   ↓
Rust Policy Engine (Off-Chain Deterministic Policy Layer)
   ↓
Solidity AgentVault (On-Chain Final Enforcement Layer)
   ↓
USDC Settlement (Arc Network)
```

---

## 2. Off-Chain Policy vs. On-Chain Enforcement

| Feature | Rust Policy Engine (Off-Chain) | Solidity AgentVault (On-Chain) |
|---|---|---|
| **Role** | Evaluates payment intents before submitting on-chain transactions | Custodies funds and executes final settlement |
| **Trust Model** | Trust-minimized off-chain security boundary | Zero-trust immutable EVM execution |
| **Enforcement** | Returns `ALLOW` or `DENY` decision with reason code | Reverts transaction if limits or rules are violated |
| **Cost** | Sub-millisecond, zero gas cost | Consumes gas on Arc network upon state change |
| **State** | In-memory / PostgreSQL policy state | On-chain storage (`policy`, `allowedRecipients`, `blockedRecipients`) |

---

## 3. Contract Architecture & Security Primitives

- **Solidity Version**: `0.8.24` (EVM target)
- **Framework**: Foundry (`forge` 1.8.3)
- **OpenZeppelin Contracts**:
  - `Ownable`: Restricts administrative configuration, pause controls, and payment execution to the vault owner/controller.
  - `Pausable`: Emergency circuit breaker allowing the owner to freeze payment execution instantly.
  - `ReentrancyGuard`: Guard on all value-transferring entrypoints (`executePayment`, `withdraw`).
  - `SafeERC20`: Safe wrappers around ERC-20 operations protecting against non-standard transfer implementations.

---

## 4. Policy Model & Daily Window Accounting

### Policy Struct
```solidity
struct Policy {
    bool enabled;
    uint256 perTransactionLimit;
    uint256 dailyLimit;
    uint256 dailySpent;
    uint256 dailyTransactionCount;
    uint256 maxTransactionsPerDay;
    uint256 currentDay;
}
```

### Deterministic Daily Window
- Accounting operates on UTC epoch days: `day = block.timestamp / 1 days`.
- When a payment is initiated on a new UTC day (`block.timestamp / 1 days > policy.currentDay`):
  - `dailySpent` is reset to `0`
  - `dailyTransactionCount` is reset to `0`
  - `currentDay` is updated to the current epoch day
- No dependence on off-chain clocks or centralized oracles.

### Recipient Rules & Precedence
- **Blocked Precedence**: A blocked recipient (`blockedRecipients[recipient] == true`) can **NEVER** receive funds under any circumstances.
- If `allowlistEnabled == true`, the recipient must be explicitly allowlisted in `allowedRecipients`.
- Setting a recipient as blocked automatically clears any allowed status, preventing contradictory state.

---

## 5. Payment Flow (`executePayment`)

1. **Pause Check**: `whenNotPaused` (reverts if paused).
2. **Policy Enabled Check**: `if (!policy.enabled) revert PolicyDisabled()`.
3. **Recipient Validation**: Reverts if `recipient == address(0)`.
4. **Amount Validation**: Reverts if `amount == 0`.
5. **Blocked Check**: Reverts with `RecipientIsBlocked` if recipient is blocked.
6. **Allowlist Check**: Reverts with `RecipientNotAllowed` if allowlist is active and recipient is not allowlisted.
7. **Per-Transaction Limit**: Reverts with `TransactionLimitExceeded` if `amount > policy.perTransactionLimit`.
8. **Daily Window Refresh**: Resets counters if rolling into a new UTC day.
9. **Transaction Frequency**: Reverts with `DailyTransactionLimitExceeded` if `dailyTransactionCount >= maxTransactionsPerDay`.
10. **Daily Spending Budget**: Reverts with `DailyLimitExceeded` if `dailySpent + amount > dailyLimit`.
11. **Balance Check**: Reverts with `InsufficientBalance` if `usdc.balanceOf(vault) < amount`.
12. **Checks-Effects**: Increments `policy.dailySpent` and `policy.dailyTransactionCount`.
13. **Interaction**: `usdc.safeTransfer(recipient, amount)`.
14. **Audit Event**: Emits `PaymentExecuted(recipient, amount, purpose, currentDay)`.

---

## 6. Events & Custom Errors

### Events
- `AgentVaultInitialized(address indexed owner, address indexed usdc, string agentId)`
- `PolicyUpdated(bool enabled, uint256 perTransactionLimit, uint256 dailyLimit, uint256 maxTransactionsPerDay)`
- `RecipientAllowed(address indexed recipient, bool allowed)`
- `RecipientBlocked(address indexed recipient, bool blocked)`
- `AllowlistToggled(bool enabled)`
- `PaymentExecuted(address indexed recipient, uint256 amount, bytes32 indexed purpose, uint256 indexed day)`
- `Withdrawal(address indexed recipient, uint256 amount)`
- `VaultPaused(address indexed account)`
- `VaultUnpaused(address indexed account)`

### Custom Errors
- `PolicyDisabled()`, `InvalidAmount()`, `TransactionLimitExceeded(amount, limit)`, `DailyLimitExceeded(attempted, limit)`, `DailyTransactionLimitExceeded(count, maxCount)`, `RecipientIsBlocked(recipient)`, `RecipientNotAllowed(recipient)`, `InsufficientBalance(required, available)`, `ZeroAddress()`, `InvalidConfiguration(reason)`

---

## 7. Testing & Validation

```bash
# Build contracts
forge build

# Run comprehensive test suite (38 tests: unit, fuzz, invariant)
forge test -vvv

# Run with gas report
forge test --gas-report

# Verify formatting
forge fmt --check
```

---

## 8. Arc Deployment Status & Security Warning

> [!CAUTION]
> **UNAUDITED PROTOTYPE**:
> - This contract is an MVP implementation for the **Arc Microgrants program** and has **NOT** undergone a formal security audit.
> - Do not deploy with real production treasury balances without a full professional audit.
> - Arc mainnet network parameters (`ARC_RPC_URL`, `ARC_CHAIN_ID`, `ARC_USDC_ADDRESS`) remain configuration placeholders until official network constants are verified.
