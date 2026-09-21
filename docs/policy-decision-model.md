# AgentPay Policy Decision Model & Reason Codes

## 1. Explicit Decision Types

The AgentPay authorization engine defines exactly three canonical decision outcomes:

| Decision | Semantics | Next State in Pipeline |
| :--- | :--- | :--- |
| **`ALLOW`** | Payment fully satisfies all policy dimensions and risk thresholds. | Transition to `AUTHORIZED` $\rightarrow$ Treasury Reservation $\rightarrow$ Arc Settlement. |
| **`DENY`** | Payment violates a hard policy constraint, tenant pause, or safety boundary. | Transition to `DENIED` (Terminal). No execution. No human override. |
| **`APPROVAL_REQUIRED`** | Payment is allowable by policy, but exceeds human approval threshold or triggered high risk. | Transition to `APPROVAL_REQUIRED`. Autonomous execution halted awaiting human operator signature. |

> Ambiguous decisions such as `MAYBE`, `PROBABLY_ALLOW`, or `AI_APPROVED` are strictly prohibited.

---

## 2. Policy Hierarchy & Precedence Rules

Precedence is strictly deterministic and ordered from broadest scope to narrowest scope:

$$\text{GLOBAL} \longrightarrow \text{ORGANIZATION} \longrightarrow \text{AGENT} \longrightarrow \text{SERVICE}$$

### Terminal Hard DENY Rules

1. **Terminal Boundary**: If any rule at any level evaluates to `DENY`, the evaluation terminates immediately with `DENY`.
2. **No Lower-Level Override**: An Agent or Service allowlist can NEVER override an Organization or Global pause or blocklist.
3. **No Human Override**: Human approval can ONLY promote `APPROVAL_REQUIRED` to `APPROVED`. Human approval can **NEVER** promote `DENY` to `ALLOW`.
4. **No Agent Self-Approval**: AI agents are cryptographically and logically barred from approving payments (`approver_id != agent_id`).

---

## 3. Reason Codes Reference Catalog

All decisions carry stable, machine-readable reason codes:

### Administrative & Emergency Pauses
- `GLOBAL_PAUSED`: Global emergency circuit breaker is engaged.
- `ORGANIZATION_PAUSED`: Organization tenant has been suspended by an administrator.
- `AGENT_PAUSED`: Specific agent has been suspended.
- `POLICY_DISABLED`: Policy active flag is set to `false`.

### Financial Bounds & Limits
- `INVALID_AMOUNT`: Amount is 0, negative, or invalid format.
- `AMOUNT_EXCEEDS_TRANSACTION_LIMIT`: Amount exceeds single transaction limit (`per_transaction_limit`).
- `DAILY_LIMIT_EXCEEDED`: Transaction would exceed remaining daily spending allowance.
- `DAILY_TRANSACTION_LIMIT_EXCEEDED`: Agent has reached maximum daily transaction count.
- `HOURLY_VELOCITY_EXCEEDED`: Transaction exceeds hourly spending limit or hourly count cap.
- `BUDGET_UTILIZATION_HIGH`: Agent budget is near exhaustion.
- `TREASURY_LIMIT_EXCEEDED`: Requested amount exceeds vault or treasury reservation limit.

### Allowlist & Blocklist Boundaries
- `RECIPIENT_BLOCKED`: Recipient address is explicitly on the blocklist.
- `RECIPIENT_NOT_ALLOWED`: Recipient address is not present on configured allowlist.
- `SERVICE_BLOCKED`: Service identifier is explicitly on the service blocklist.
- `SERVICE_NOT_ALLOWED`: Service identifier is not in the authorized services set.
- `ASSET_BLOCKED`: Asset symbol is explicitly on the asset blocklist.
- `ASSET_NOT_ALLOWED`: Asset is not on the allowed asset list (canonical USDC only).

### Risk & Approval Escalations
- `ABOVE_APPROVAL_THRESHOLD`: Amount meets or exceeds autonomous approval threshold.
- `APPROVAL_REQUIRED`: High risk or approval rule halted execution for operator sign-off.
- `RISK_HIGH`: Deterministic risk score is $\ge 60$.
- `RISK_MEDIUM`: Deterministic risk score is between $30$ and $59$.
- `RISK_LOW`: Deterministic risk score is $< 30$.
- `APPROVED`: All policy checks and risk evaluations passed without escalation.

### System & Idempotency
- `DUPLICATE_REQUEST`: Request ID was previously processed.
- `INVALID_REQUEST`: Malformed payload, invalid Ethereum address syntax, or missing fields.

---

## 4. Policy Versioning & Decision Snapshot

### Policy Versioning
Each policy carries an optional or explicit immutable version tag (`policy_version`, e.g. `"v1.0.0"` or timestamped `"pol_ver_2026_09_22"`).
When an authorization decision is evaluated, this version string is passed into `AuthorizationDecision.policy_version`.

### Decision Snapshot
To guarantee post-settlement auditability and flight recorder compliance (Day 6 readiness), each authorized payment intent captures an immutable snapshot:
- **Request**: `intent_id`, `request_id`, `correlation_id`
- **Identity**: `agent_id`, `organization_id`
- **Service**: `service_id`
- **Amount & Asset**: `amount` (integer base units), `asset` ("USDC"), `recipient`
- **Policy Snapshot**: `policy_version`, `policy_decision`, `reason_code`, `reason`, `checks`
- **Risk Snapshot**: `risk_level`, `risk_score`
- **Treasury State**: `remaining_daily_limit`
- **Timestamps**: `created_at`, `expires_at`, `updated_at`
