# AgentPay Treasury & Accounting Model

## 1. Current AgentVault Model Analysis

In the current prototype (`contracts/src/AgentVault.sol`):
- **1:1 Custody**: An `AgentVault` contract is deployed per agent and holds native Arc USDC directly.
- **Enforcement**: The vault owner (the backend executor) calls `executePayment(recipient, amount, purpose)`.
- **Limits**: The contract tracks `dailySpent`, `dailyTransactionCount`, `perTransactionLimit`, and `currentDay`.
- **Emergency Sweep**: The owner can call `withdraw(recipient, amount)` to sweep USDC out of the vault.
- **Emergency Pause**: The owner can call `pause()` to freeze all payments.

### Limitations of the 1:1 Prototype
1. **Gas Inefficiency on Funding**: Funding 10 agents requires 10 separate ERC-20 transfers across 10 individual vault contracts.
2. **Capital Fragmentation**: If Agent A needs $2.00 and has $1.00, while Agent B has $50.00 idle, funds cannot be dynamically shared without manual rebalancing.
3. **Accounting Ambiguity**: Offline RPC nodes can lead to confusing "balance unavailable" with "$0.00 balance".

---

## 2. V2 Treasury Accounting Model

AgentPay V2 introduces a dual-tier treasury architecture: **Organization Treasury** (Master Vault) and **Virtual Agent Budgets** (Allocated Balances).

```
          ORGANIZATION MASTER TREASURY
          (Holds Pooled USDC on Arc)
                      |
        +-------------+-------------+
        |                           |
        v                           v
  AGENT A BUDGET              AGENT B BUDGET
  (e.g., $10.00 Allocated)    (e.g., $50.00 Allocated)
        |                           |
  - Reserved: $0.18           - Reserved: $0.00
  - Available: $9.82          - Available: $50.00
```

### Balances & Accounting Invariants

1. **Vault Total Balance ($B_{\text{vault}}$)**: Real on-chain USDC balance held by the smart contract on Arc Mainnet.
2. **Allocated Balance ($B_{\text{allocated}}$)**: Sum of all active agent budgets configured in the organization:
   $$\sum B_{\text{agent}} \le B_{\text{vault}}$$
3. **Reserved Balance ($B_{\text{reserved}}$)**: Funds temporarily locked for in-flight intents currently in `EXECUTING` or `APPROVAL_REQUIRED` states:
   $$B_{\text{available}} = B_{\text{agent}} - B_{\text{spent\_today}} - B_{\text{reserved}}$$
4. **Available Balance ($B_{\text{available}}$)**: Maximum amount the agent can legally spend right now.

---

## 3. Strict Safety Rule: Unavailable $\ne$ Zero

> **CRITICAL REPOSITORY INVARIANT**:
> **Never confuse `Balance Unavailable` with `Balance = $0.00`.**

- If an Arc RPC node is unreachable, the gateway or UI must return:
  ```json
  {
    "usdc_balance": null,
    "status": "UNAVAILABLE",
    "error": "RPC_CONNECTION_TIMEOUT"
  }
  ```
- Rendering `0.00 USDC` during network outages causes false alarms, incorrect liquidations, and severe accounting desynchronization.
- The UI must render a skeleton or explicit "Network Disconnected" pill rather than $0.00.

---

## 4. Treasury Operations

### 1. Funding (Deposit)
- Any authorized company wallet can transfer canonical USDC (`0x3600000000000000000000000000000000000000`) directly to the `AgentVault` address on Arc.
- The smart contract does not require deposit callbacks, as native Arc USDC is standard ERC-20.
- The gateway's blockchain listener detects `Transfer(from, vault, amount)` and increments the organization's unallocated pool.

### 2. Allocation & Budgeting
- An Organization Admin assigns daily limits and allocated spending caps to each agent via the Control Center.
- Allocations are enforced off-chain in Rust and synchronized to the on-chain vault policy.

### 3. In-Flight Reservation
- When an intent enters `APPROVAL_REQUIRED` or `EXECUTING`, the gateway increments `reserved_balance`.
- If the payment succeeds (`CONFIRMED`), `reserved_balance` is decremented and `daily_spent` is incremented.
- If the payment fails (`FAILED`) or is rejected (`REJECTED`), `reserved_balance` is released back to `available_balance`.

### 4. Emergency Sweep (Withdrawal)
- Organization Admins can sweep funds back to a corporate cold wallet at any time by calling `AgentVault.withdraw(cold_wallet, amount)`.
- Enforces `onlyOwner` (the secure backend executor or admin key).

### 5. Multi-Level Pause Switch
- **Level 1 (Global/Org)**: Gateway drops all intent creation and returns `SYSTEM_PAUSED`.
- **Level 2 (Agent)**: Individual agent status toggled to `PAUSED`.
- **Level 3 (On-Chain Vault)**: Smart contract `pause()` invoked on Arc, immediately reverting any transaction regardless of backend state.
