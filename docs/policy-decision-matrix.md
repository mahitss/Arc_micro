# AgentPay Policy Decision Matrix

## 1. Overview

The AgentPay Policy Engine is a deterministic, side-effect-free financial control plane written in Rust. It evaluates incoming payment requests against organizational, agent, and service-level policies, augmented with deterministic risk scoring.

> **CRITICAL SECURITY INVARIANT**:
> AI models (LLMs) are **never** permitted to make financial authorization decisions or override risk scores.
> Human approvals can authorize payments flagged as `APPROVAL_REQUIRED`, but can **never** override a hard deterministic policy `DENY`.

---

## 2. Policy Evaluation Precedence

The engine evaluates rules in strict order of security precedence:

| Order | Rule | Condition | Outcome | Reason Code |
| :---: | :--- | :--- | :---: | :--- |
| **1** | Request ID Validation | `request_id.is_empty()` | `DENY` | `INVALID_REQUEST` |
| **2** | Agent Match | `request.agent_id != policy.agent_id` | `DENY` | `INVALID_REQUEST` |
| **3a** | Global Emergency Pause | `policy.global_paused == true` | `DENY` | `GLOBAL_PAUSED` |
| **3b** | Organization Pause | `policy.organization_paused == true` | `DENY` | `ORGANIZATION_PAUSED` |
| **3c** | Agent Pause | `policy.agent_paused == true` | `DENY` | `AGENT_PAUSED` |
| **3d** | Policy Enabled | `policy.enabled == false` | `DENY` | `POLICY_DISABLED` |
| **4** | Amount Sanity | `request.amount == 0` | `DENY` | `INVALID_AMOUNT` |
| **5** | Asset Allowlist | `request.asset` not in `allowed_assets` | `DENY` | `ASSET_NOT_ALLOWED` |
| **6** | Recipient Blacklist | `request.recipient` in `blocked_recipients` | `DENY` | `RECIPIENT_BLOCKED` |
| **7** | Recipient Allowlist | `allowed_recipients` set & `recipient` not in it | `DENY` | `RECIPIENT_NOT_ALLOWED` |
| **8** | Service Allowlist | `allowed_services` set & `service_id` not in it | `DENY` | `SERVICE_NOT_ALLOWED` |
| **9** | Per-Transaction Limit | `request.amount > per_transaction_limit` | `DENY` | `AMOUNT_EXCEEDS_TRANSACTION_LIMIT` |
| **10** | Daily Tx Frequency | `daily_transaction_count >= max_transactions_per_day` | `DENY` | `DAILY_TRANSACTION_LIMIT_EXCEEDED` |
| **11** | Daily Budget Cap | `daily_spent + amount > daily_limit` | `DENY` | `DAILY_LIMIT_EXCEEDED` |
| **12a** | Hourly Velocity Limit | `hourly_spent + amount > hourly_limit` | `DENY` | `HOURLY_VELOCITY_EXCEEDED` |
| **12b** | Hourly Tx Frequency | `hourly_transaction_count >= max_transactions_per_hour` | `DENY` | `HOURLY_VELOCITY_EXCEEDED` |
| **13** | Deterministic Risk Gate | `risk_score >= 60` (Risk Level `HIGH`) | `APPROVAL_REQUIRED` | `RISK_HIGH` |
| **14** | Approval Threshold | `amount >= approval_threshold` | `APPROVAL_REQUIRED` | `ABOVE_APPROVAL_THRESHOLD` |
| **15** | All Checks Passed | All rules satisfied, risk is `LOW` or `MEDIUM` | `ALLOW` | `APPROVED` |

---

## 3. Decision Matrix Summary

| Policy Status | Risk Level | Amount vs Approval Threshold | Final Decision | Human Override Permitted? |
| :---: | :---: | :---: | :---: | :---: |
| **DENY** (Any rule 1–12b) | Any | Any | **`DENY`** | **NO** (Hard boundary) |
| **ALLOW** | **HIGH** ($\ge 60$) | Any | **`APPROVAL_REQUIRED`** | **YES** (Via human controller) |
| **ALLOW** | **MEDIUM** (30–59) | $\ge \text{threshold}$ | **`APPROVAL_REQUIRED`** | **YES** (Via human controller) |
| **ALLOW** | **MEDIUM** (30–59) | $< \text{threshold}$ | **`ALLOW`** (Telemetry flagged) | N/A (Auto-approved) |
| **ALLOW** | **LOW** (0–29) | $\ge \text{threshold}$ | **`APPROVAL_REQUIRED`** | **YES** (Via human controller) |
| **ALLOW** | **LOW** (0–29) | $< \text{threshold}$ | **`ALLOW`** | N/A (Auto-approved) |

---

## 4. Reason Codes Reference

| Reason Code | Category | Meaning |
| :--- | :--- | :--- |
| `APPROVED` | Success | Payment passed all checks and risk heuristics. |
| `APPROVAL_REQUIRED` | Human Gate | Payment requires operator approval before execution. |
| `ABOVE_APPROVAL_THRESHOLD` | Human Gate | Payment amount meets or exceeds autonomous threshold. |
| `RISK_HIGH` | Human Gate | Deterministic risk score is $\ge 60$. |
| `RISK_MEDIUM` | Telemetry | Deterministic risk score is between 30 and 59. |
| `RISK_LOW` | Success | Deterministic risk score is $< 30$. |
| `GLOBAL_PAUSED` | Emergency | System-wide pause active. |
| `ORGANIZATION_PAUSED` | Admin | Tenant organization paused. |
| `AGENT_PAUSED` | Admin | Individual agent paused. |
| `POLICY_DISABLED` | Config | Agent policy is explicitly disabled. |
| `INVALID_AMOUNT` | Validation | Amount is 0 or negative. |
| `AMOUNT_EXCEEDS_TRANSACTION_LIMIT` | Policy Limit | Single payment exceeds per-transaction cap. |
| `DAILY_LIMIT_EXCEEDED` | Budget | Payment exceeds remaining daily allowance. |
| `DAILY_TRANSACTION_LIMIT_EXCEEDED` | Frequency | Agent reached daily transaction cap. |
| `HOURLY_VELOCITY_EXCEEDED` | Velocity | Payment exceeds hourly spending or transaction limit. |
| `RECIPIENT_BLOCKED` | Blacklist | Recipient address is explicitly blacklisted. |
| `RECIPIENT_NOT_ALLOWED` | Whitelist | Recipient address not in allowlist. |
| `SERVICE_NOT_ALLOWED` | Registry | Service ID not in authorized services list. |
| `ASSET_NOT_ALLOWED` | Asset | Asset is not canonical USDC. |
| `INVALID_REQUEST` | Syntax | Missing or malformed request parameters. |
