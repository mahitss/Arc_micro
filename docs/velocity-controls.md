# AgentPay Velocity Controls & Spending Invariants

## 1. Overview

Velocity controls protect AgentPay organizations from **runaway agent loops, high-frequency exploitation, and treasury exhaustion attacks**.

Even if an agent has a generous daily budget (e.g. $50/day), velocity controls ensure that an attacker or misbehaving agent cannot spend the entire budget within seconds or minutes.

---

## 2. Velocity Limit Types

AgentPay supports dual-layer velocity enforcement:

### 1. Hourly Spending Limit (`hourly_limit`)
- **Metric**: Cumulative base units spent in the current rolling or discrete hourly window.
- **Rule**: `hourly_spent + amount <= hourly_limit`.
- **Violation Result**: `DENY(HOURLY_VELOCITY_EXCEEDED)`.

### 2. Hourly Transaction Frequency (`max_transactions_per_hour`)
- **Metric**: Number of authorized/settled payments in the current hourly window.
- **Rule**: `hourly_transaction_count < max_transactions_per_hour`.
- **Violation Result**: `DENY(HOURLY_VELOCITY_EXCEEDED)`.

### 3. Trailing 15-Minute Risk Velocity (`recent_15m_tx_count`)
- **Metric**: Number of payment attempts in trailing 15 minutes.
- **Risk Impact**:
  - 1–2 transactions: +0 pts
  - 3–4 transactions: +10 pts
  - $\ge 5$ transactions: +15 pts
- **Violation Result**: Contributes to overall risk score. If total score $\ge 60$, escalates to `APPROVAL_REQUIRED(RISK_HIGH)`.

---

## 3. Concurrency & Spending Reservation Semantics

### The Race Condition
Consider an agent with:
- Daily Limit: $50.00
- Remaining Budget: $10.00
- Two simultaneous requests:
  - Request A: $8.00
  - Request B: $8.00

Without concurrency synchronization:
- Request A reads `daily_spent = $40.00` $\rightarrow$ $40 + 8 \le 50$ $\rightarrow$ ALLOW
- Request B reads `daily_spent = $40.00` $\rightarrow$ $40 + 8 \le 50$ $\rightarrow$ ALLOW
- Total spent becomes **$56.00** (a $6.00 budget violation!).

### AgentPay Defense Mechanism
1. **Off-Chain Atomic Compare-and-Swap**:
   - In Go Gateway, `CompareAndSwapIntentStatus` serializes payment transitions.
   - For budget accounting, the gateway and policy engine utilize mutex-locked or transactionally isolated updates:
     ```sql
     UPDATE policies 
     SET daily_spent = daily_spent + $amount 
     WHERE id = $policy_id AND daily_spent + $amount <= daily_limit;
     ```
2. **On-Chain Double-Spend Protection**:
   - `AgentVault.sol` tracks `dailySpent` and `dailyLimit` on-chain with `revert DailyLimitExceeded()`.
   - Even if an off-chain race condition were to occur, the smart contract strictly enforces `dailySpent + amount <= dailyLimit` at the EVM level.

---

## 4. Deterministic Time & Clock Invariants

- **Zero System Clocks in Rust**: All timestamps are supplied as explicit integers (`timestamp: Option<i64>`).
- **UTC Midnight Daily Rollover**: Daily budgets reset precisely at `00:00:00 UTC`.
- **Integer Arithmetic Only**: No floating point numbers are used in limit comparisons or velocity calculations.
