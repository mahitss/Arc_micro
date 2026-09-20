# AgentPay Policy Engine V2 (Implemented)

## 1. Executive Summary

The **AgentPay Policy Engine V2** is the deterministic financial control plane for autonomous AI agents on Arc. It evaluates payment requests using strictly deterministic, side-effect-free integer mathematics in Rust (`services/policy-engine`), augmented with deterministic risk heuristics, velocity controls, policy composition, and a policy simulator.

> **CRITICAL SECURITY INVARIANT**:
> AI is **never** the final authority over money. No LLM or stochastic model is ever permitted in authorization or risk calculation.
> Human approvers can authorize payments flagged as `APPROVAL_REQUIRED`, but can **never** override a hard deterministic policy `DENY`.

---

## 2. Implemented Capabilities

- **Pure Deterministic Function**: `authorize_with_context(request, policy, risk_context) -> AuthorizationDecision`.
- **All Monetary Values in Base Units**: Unsigned 64-bit integers (`u64` micro-USDC). Floating-point math is strictly forbidden.
- **Rule Hierarchy & Precedence**:
  1. Request ID validation
  2. Agent match validation
  3. Pause checks (`global_paused`, `organization_paused`, `agent_paused`, `!enabled`)
  4. Amount sanity (`amount > 0`)
  5. Asset validation (`allowed_assets`)
  6. Recipient blacklist (`blocked_recipients` - blacklist takes strict precedence over allowlist)
  7. Recipient allowlist (`allowed_recipients`)
  8. Service allowlist (`allowed_services`)
  9. Per-transaction limit (`amount <= per_transaction_limit`)
  10. Daily transaction frequency (`daily_transaction_count < max_transactions_per_day`)
  11. Daily budget cap (`daily_spent + amount <= daily_limit`)
  12. Hourly velocity limits (`hourly_spent + amount <= hourly_limit`, `hourly_transaction_count < max_transactions_per_hour`)
  13. Deterministic risk evaluation (Risk `HIGH` $\ge 60 \rightarrow$ `APPROVAL_REQUIRED`)
  14. Approval threshold check (`amount >= approval_threshold \rightarrow` `APPROVAL_REQUIRED`)
  15. All checks passed $\rightarrow$ `ALLOW(APPROVED)`.

---

## 3. Rust Domain Model

```rust
// services/policy-engine/src/domain/policy.rs

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Policy {
    pub policy_id: Option<String>,
    pub organization_id: Option<String>,
    pub agent_id: String,
    pub enabled: bool,

    // Pauses
    pub global_paused: bool,
    pub agent_paused: bool,
    pub organization_paused: bool,

    // Core Limits (Micro-USDC base units)
    pub per_transaction_limit: u64,
    pub daily_limit: u64,
    pub daily_spent: u64,
    pub approval_threshold: Option<u64>,

    // Velocity Controls
    pub max_transactions_per_day: u32,
    pub daily_transaction_count: u32,
    pub hourly_limit: Option<u64>,
    pub hourly_spent: Option<u64>,
    pub max_transactions_per_hour: Option<u32>,
    pub hourly_transaction_count: Option<u32>,

    // Allow/Block Lists
    pub allowed_assets: HashSet<String>,
    pub allowed_recipients: Option<HashSet<Address>>,
    pub blocked_recipients: HashSet<Address>,
    pub allowed_services: Option<HashSet<String>>,
}

// services/policy-engine/src/domain/decision.rs

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Decision {
    Allow,
    Deny,
    #[serde(rename = "APPROVAL_REQUIRED")]
    ApprovalRequired,
}
```

---

## 4. Policy Composition

Hierarchical composition via `compose_policies(org_policy, agent_policy)` enforces strict rule monotonicity:
- **Limits**: `min(org.limit, agent.limit)`
- **Approval Threshold**: `min(org.threshold, agent.threshold)`
- **Pauses**: `org.paused || agent.paused`
- **Blocklists**: Union of blocklists (strictest blacklist wins)
- **Allowlists**: Intersection of allowlists (must be approved by both)

---

## 5. Policy Simulator

Endpoint: `POST /v1/simulate`
- Evaluates hypothetical payments without mutating state or moving money.
- Always returns `"simulation": true`.
