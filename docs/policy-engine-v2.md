# AgentPay Policy Engine V2

## 1. Current Policy Engine Capabilities (Rust)

In the current implementation (`services/policy-engine`):
- Pure deterministic, side-effect-free function: `authorize(payment, policy) -> Decision`.
- All monetary values are integer base units (`u64` micro-USDC).
- Evaluates:
  1. Valid Request ID
  2. Policy enabled
  3. Positive amount (`> 0`)
  4. Allowed assets (`USDC` canonical token)
  5. Blocked recipients (strict blacklist precedence)
  6. Allowed recipients (whitelist validation)
  7. Per-transaction limit (`amount <= per_transaction_limit`)
  8. Daily transaction count limit (`daily_transaction_count < max_transactions_per_day`)
  9. Daily spending limit (`daily_spent + amount <= daily_limit` with checked integer arithmetic)
- Zero floating-point math, zero external network calls during evaluation, sub-millisecond execution.

---

## 2. Policy Engine V2 Architecture & Classification

In V2, the Rust policy engine remains strictly deterministic and side-effect-free. LLMs never make financial authorization decisions. The engine is extended with organizational hierarchy, approval thresholds, and velocity controls.

### Candidate Controls Classification

| Control | Classification | Rationale |
| :--- | :---: | :--- |
| **Transaction Limit** | **MUST HAVE** | Core defense-in-depth against single high-value prompt injection or tool hallucination. |
| **Daily Spending Limit** | **MUST HAVE** | Prevents treasury drain over time; resets on UTC midnight. |
| **Daily Transaction Count** | **MUST HAVE** | Protects against runaway agent loops (high-frequency micro-payments). |
| **Allowed Assets** | **MUST HAVE** | Restricts all payments strictly to canonical USDC on Arc. |
| **Allowed Services / Recipients** | **MUST HAVE** | Binds agent to pre-approved Service Registry addresses. |
| **Blocked Recipients (Blacklist)** | **MUST HAVE** | Immediate emergency blocking of compromised or hostile addresses. |
| **Approval Thresholds** | **MUST HAVE** | Triggers `APPROVAL_REQUIRED` status when amount exceeds normal autonomous operating limits. |
| **Agent-Specific Policies** | **MUST HAVE** | Different agents have different budgets (e.g. Research Agent: $5/day; Compute Agent: $50/day). |
| **Emergency Global / Agent Pause** | **MUST HAVE** | Immediate off-chain halt of all authorization requests. |
| **Velocity Limits (Hourly / Sliding Window)** | **SHOULD HAVE** | Prevents spending the entire daily budget in the first 60 seconds of an attack. |
| **Organization-Level Spending Ceiling** | **SHOULD HAVE** | Hard cap across all agents in an enterprise (e.g. maximum $500/day for the entire org). |
| **Service-Specific Pricing Caps** | **SHOULD HAVE** | Validates that payment matches or is below the specific service's advertised maximum price. |
| **Dynamic Risk Scoring in Rust** | **LATER** | Risk heuristic evaluation is better placed in Go gateway before calling pure Rust policy. |
| **Multi-Asset FX Conversion** | **LATER** | Arc operates natively in USDC; multi-currency adds non-deterministic exchange rate risks. |
| **Complex Rule Scripting (CEL/Wasm)** | **LATER** | Adds execution overhead and non-deterministic recursion risks; fixed schema is safer for MVP. |

---

## 3. Proposed Rust Domain Model V2

```rust
// Proposed extended policy structure for services/policy-engine/src/domain/policy.rs

use super::address::Address;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PolicyV2 {
    pub organization_id: String,
    pub agent_id: String,
    pub enabled: bool,
    pub global_paused: bool,
    
    // Core Limits (Micro-USDC base units)
    pub per_transaction_limit: u64,
    pub daily_limit: u64,
    pub daily_spent: u64,
    pub approval_threshold: u64, // Amounts >= threshold return Decision::ApprovalRequired
    
    // Velocity Controls
    pub max_transactions_per_day: u32,
    pub daily_transaction_count: u32,
    pub hourly_limit: Option<u64>,
    pub hourly_spent: Option<u64>,
    
    // Target Constraints
    pub allowed_assets: HashSet<String>,
    pub allowed_recipients: Option<HashSet<Address>>,
    pub blocked_recipients: HashSet<Address>,
    pub allowed_services: Option<HashSet<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PolicyDecision {
    Allow,
    Deny { reason_code: String, reason: String },
    ApprovalRequired { reason_code: String, reason: String, threshold: u64 },
}
```

---

## 4. Deterministic Evaluation Order

The Rust engine evaluates rules in strict order of security precedence:

1. **Global / Agent Pause Check**: If `global_paused` or `!enabled`, immediately return `DENY(SYSTEM_PAUSED)`.
2. **Asset Check**: If `asset != "USDC"`, return `DENY(UNSUPPORTED_ASSET)`.
3. **Amount Sanity**: If `amount == 0`, return `DENY(INVALID_AMOUNT)`.
4. **Blacklist Check**: If `recipient` in `blocked_recipients`, return `DENY(RECIPIENT_BLOCKED)`. (Blacklist always supersedes allowlist).
5. **Whitelist Check**: If `allowed_recipients` is defined and `recipient` is not in it, return `DENY(RECIPIENT_NOT_ALLOWED)`.
6. **Service Whitelist**: If `allowed_services` is defined and `service_id` is not in it, return `DENY(SERVICE_NOT_ALLOWED)`.
7. **Per-Transaction Limit**: If `amount > per_transaction_limit`, return `DENY(PER_TRANSACTION_LIMIT_EXCEEDED)`.
8. **Daily Transaction Frequency**: If `daily_transaction_count >= max_transactions_per_day`, return `DENY(DAILY_TRANSACTION_LIMIT_EXCEEDED)`.
9. **Daily Budget Check**: Using `checked_add`: if `daily_spent + amount > daily_limit`, return `DENY(DAILY_LIMIT_EXCEEDED)`.
10. **Velocity Check (Hourly)**: If `hourly_limit` is set and `hourly_spent + amount > hourly_limit`, return `DENY(HOURLY_VELOCITY_EXCEEDED)`.
11. **Approval Threshold**: If `amount >= approval_threshold`, return `APPROVAL_REQUIRED(ABOVE_APPROVAL_THRESHOLD)`.
12. **Final Result**: All checks passed $\rightarrow$ return `ALLOW`.

---

## 5. Defense Against Non-Determinism

To preserve formal mathematical determinism:
- **No Floating Point**: All monetary values remain 6-decimal integers.
- **No System Clocks in Rust**: Timestamps and daily window rollovers (`current_day_utc`) are passed as explicit integer arguments by the caller.
- **No Network / I/O**: The evaluation function takes pure data structures and produces pure output without reading disk, database, or network sockets.
- **Side-Effect-Free**: The engine does not mutate state. Updated daily spent values are computed and returned for the caller to commit.
