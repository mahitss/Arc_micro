# Day 1 Implementation: AgentPay Domain Foundation

## 1. Entities Implemented

In Day 1 of the 10-day build, AgentPay's core domain model was transitioned from an unauthenticated prototype into a typed, persistent, multi-tenant financial domain foundation:

1. **Organization (`domain.Organization` / `organizations`)**:
   - Multi-tenant root isolation boundary.
   - Fields: `id`, `name`, `status` (`ACTIVE`, `SUSPENDED`), `created_at`, `updated_at`.
   - Seeded with `org_default` for backward compatibility.
2. **Agent (`domain.Agent` / `agents`)**:
   - Extended with `organization_id`, `description`, `status` (`ACTIVE`, `PAUSED`, `DISABLED`), `policy_id`, `vault_address`, and `updated_at`.
   - Persistent across PostgreSQL and Memory repositories.
3. **Service (`domain.Service` / `services`)**:
   - Extended with `organization_id`, `description`, `status` (`ACTIVE`, `SUSPENDED`, `DEPRECATED`), `max_price`, `fixed_price`, and `updated_at`.
   - Server-side recipient resolution: AI agents reference `service_id`, preventing arbitrary recipient calldata.
4. **Policy (`domain.Policy` / `policies`)**:
   - Persistent representation of Rust policy rules: `per_transaction_limit`, `daily_limit`, `max_transactions_per_day`, `approval_threshold`, `allowed_assets`, `allowed_recipients`, `blocked_recipients`.
   - All amounts in integer base units (micro-USDC).
5. **PaymentIntent (`intent.PaymentIntent` / `payment_intents`)**:
   - Extended with `organization_id`, `request_id` (idempotency key), `policy_decision`, `policy_reason`, and `requires_approval`.
   - Extended state machine supporting `APPROVAL_REQUIRED`, `APPROVED`, `REJECTED`, and `CANCELLED`.
6. **PaymentExecution (`intent.PaymentExecutionRecord` / `payment_executions`)**:
   - Cleanly separated from intent: `intent_id`, `transaction_hash`, `status`, `submitted_at`, `confirmed_at`, `error_code`.
7. **Approval (`domain.Approval` / `approvals`)**:
   - Foundational human-in-the-loop approval record: `id`, `organization_id`, `payment_intent_id`, `required`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`), `requested_at`, `resolved_at`, `approved_by`, `rejection_reason`.
   - Invariant: **Approval can NEVER turn a DENIED policy outcome into an executable payment.**
8. **AuditEvent (`domain.AuditEvent` / `audit_events`)**:
   - Append-only audit record: `id`, `organization_id`, `event_type`, `actor_type`, `actor_id`, `resource_type`, `resource_id`, `request_id`, `timestamp`, `metadata`.

---

## 2. Relationships & Entity-Relationship Architecture

```
Organization (1)
 ├── Agents (N)
 │    ├── Policy (1)
 │    ├── Vault Reference (1)
 │    └── Payment Intents (N)
 ├── Services (N)
 ├── Policies (N)
 ├── Approvals (N)
 └── Audit Events (N)
```

- **Agent $\rightarrow$ Policy**: Every agent is bound to a spending policy defining per-tx caps, daily budgets, and approval thresholds.
- **PaymentIntent $\rightarrow$ Service**: The intent's recipient is populated directly from the trusted Service Registry, preventing prompt injection recipient substitution.
- **PaymentIntent $\rightarrow$ Approval**: When an intent's amount $\ge \text{approval\_threshold}$, it transitions to `APPROVAL_REQUIRED` and creates an `Approval` record.

---

## 3. Migrations

Two new migration files were created in `services/gateway/migrations/`:

1. **`000002_domain_foundation.up.sql`**:
   - Creates `organizations`, `policies`, `approvals`, and `audit_events` tables.
   - Adds `organization_id`, `description`, `status`, and timestamps to `agents`, `services`, and `payment_intents`.
   - Seeds `org_default` and `pol_research_default` to ensure zero disruption to existing environments.
   - Creates unique index `idx_payment_intents_org_req_id` on `(organization_id, request_id)` for idempotency.
2. **`000002_domain_foundation.down.sql`**:
   - Drops `audit_events`, `approvals`, `policies`, and `organizations`.
   - Reverts newly added columns cleanly without data corruption.

---

## 4. Security Boundaries

1. **Cross-Organization Isolation**:
   - The domain service layer enforces `WHERE organization_id = $1` checks across all entity mutations.
   - Attempting to pause or modify an agent or service belonging to a different organization returns `ErrOrganizationMismatch`.
2. **Deterministic Precedence over Human Approvals**:
   - If an intent's policy decision is `DENY`, calling `RecordApproval()` strictly fails with `ErrCannotApproveDenied`.
   - Human approvers cannot override mathematical policy violations.
3. **Server-Side Recipient Lock**:
   - Agents never specify raw addresses. The domain service validates that the requested service exists and is active, and pulls the recipient address directly from the verified catalog.

---

## 5. Idempotency & Money Safety

1. **Idempotency**:
   - Intent creation checks for an existing `(organization_id, request_id)`. If present, the existing intent is returned without duplicating database records or re-evaluating policies.
2. **Integer Base Units**:
   - All amounts are validated with `validateAmount()`: must be positive integers parsed with `math/big.Int`.
   - Floating-point representations (e.g. `"0.18"`) are strictly rejected; base units (`"180000"`) are mandatory.

---

## 6. Tests & Validation

All tests were executed and passed with 100% success:

1. **Domain Service Tests (`services/gateway/internal/service/domain_service_test.go`)**:
   - `TestDomain_Organization`: Creation and retrieval.
   - `TestDomain_AgentLifecycle`: Creation, pausing, and cross-organization access rejection.
   - `TestDomain_ServiceLifecycle`: Creation, invalid recipient rejection, and pausing.
   - `TestDomain_Policy`: Spending limits and approval threshold persistence.
   - `TestDomain_PaymentIntent`: Creation, duplicate request ID idempotency, invalid agent rejection, float amount rejection.
   - `TestDomain_ApprovalInvariants`: Approval flow, critical denial protection (cannot approve denied intents).
   - `TestDomain_AuditEvent`: Append-only recording and querying.
2. **State Machine Tests (`services/gateway/internal/intent/statemachine_test.go`)**:
   - Tested 19 valid transitions and 9 invalid transitions.
   - Verified `CanExecute()` returns true only for `AUTHORIZED` and `APPROVED`.
3. **Repository Tests (`services/gateway/internal/storage/repository_test.go`)**:
   - All existing tests pass with zero regressions.
4. **Rust Policy Engine**: 32/32 tests passing (`cargo test`).
5. **Solidity Smart Contracts**: 42/42 tests passing (`forge test`).
6. **Frontend**: 14/14 tests passing (`npm test`), 0 ESLint warnings (`next lint`).

---

## 7. Known Limitations & Next Day Dependencies

1. **API Key Authentication**: The domain models and schema are established, but HTTP handlers currently use the default organization context until Day 2's API Key middleware is connected.
2. **Rust Policy Engine Approval Integration**: In Day 2, the Rust engine will be updated to natively emit `PolicyDecision::ApprovalRequired` when `amount >= approval_threshold`.
