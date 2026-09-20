# AgentPay Financial Invariants Specification

This document formally defines the 16 core financial and state invariants enforced across AgentPay's control plane, policy engine, treasury service, and blockchain execution gateway.

Every invariant defined below is actively enforced by code and verified by automated regression tests in `services/gateway/tests/integration/day9_production_security_test.go`.

---

## 1. Zero Key Custody Invariant
> **AI agents never hold private keys, sign transactions, or directly access AgentVault.**

- **Enforcement:** Agent runtimes interact exclusively via high-level task and payment intent APIs. Private keys exist only in the execution gateway runtime or HSM/KMS.
- **Test Evidence:** `packages/sdk-typescript/src/tests/sdk.test.ts`, `services/gateway/tests/integration/agent_flow_test.go`.

---

## 2. Valid Intent Prerequisite Invariant
> **Every executable payment must reference a valid, non-expired, non-terminal PaymentIntent.**

- **Enforcement:** `execution.DefaultGate.CheckEligibility` requires `pi != nil` and status `AUTHORIZED`. Terminal states (`DENIED`, `CANCELLED`, `CONFIRMED`, `FAILED`, `EXPIRED`) immediately reject execution with `ErrExecutionNotPermitted`.
- **Test Evidence:** `services/gateway/internal/execution/gate_test.go`.

---

## 3. Mandatory Policy Passage Invariant
> **Every executable payment must pass the deterministic Rust policy engine before submission.**

- **Enforcement:** Execution gateway requires `PolicyDecision == "ALLOW"` or valid human approval for `APPROVAL_REQUIRED`. Un-evaluated intents fail with `ErrNotAuthorized`.
- **Test Evidence:** `services/gateway/tests/integration/gateway_policy_test.go`.

---

## 4. Hard Denial Inviolability Invariant
> **A policy HARD DENY can NEVER be overridden, bypassed, or approved by any human actor or API caller.**

- **Enforcement:** `domain_service.RecordApproval` checks if the underlying policy decision was `DENY`. If so, it immediately returns `ErrCannotApproveDenied`. The Execution Gate additionally verifies `if pi.PolicyDecision == "DENY" { return nil, ErrPolicyDenied }`.
- **Test Evidence:** `TestDay9_FinancialInvariants/HardDenyCannotBeOverriddenByApproval` in `day9_production_security_test.go`.

---

## 5. Authorization Boundary Invariant
> **Human approval cannot authorize a payment that was rejected or outside policy parameters.**

- **Enforcement:** Approval only activates payments that evaluated to `APPROVAL_REQUIRED`. It does not permit arbitrary spending or state transitions from unauthorized states.
- **Test Evidence:** `services/gateway/internal/service/approval_test.go`.

---

## 6. Amount Immutability Invariant
> **The payment amount cannot change after authorization or approval.**

- **Enforcement:** The authorization decision hashes and seals the exact integer base units (`Amount`). The execution gateway signs the calldata using the intent's verified amount, rejecting any divergence between authorization and execution payloads.
- **Test Evidence:** `services/gateway/internal/execution/service_test.go`.

---

## 7. Authoritative Recipient Invariant
> **Payment recipients are resolved strictly server-side from the verified Service Registry; user- or agent-supplied recipient addresses are rejected.**

- **Enforcement:** In `intent.Service.CreateIntent`, the `Recipient` field is populated exclusively from `registry.Service.Recipient`. Any user-supplied `recipient` field in the request payload is ignored.
- **Test Evidence:** `TestDay9_FinancialInvariants/TrustedServiceRecipientNeverUserControlled` in `day9_production_security_test.go`.

---

## 8. Single-Consumption Treasury Reservation Invariant
> **A treasury reservation can be consumed or released exactly once, preventing double-spending of reserved vault liquidity.**

- **Enforcement:** `treasury.Service.ReserveFunds` atomically checks available balance (`onChainBalance - totalReserved >= requestedAmount`) behind a concurrency mutex. Transitions from `RESERVED` to `SETTLED` or `RELEASED` are protected by CAS status checks.
- **Test Evidence:** `TestDay9_ConcurrencyAndRaceConditions/TreasuryConcurrentReservationRace` in `day9_production_security_test.go`.

---

## 9. Single-Payment Idempotency Invariant
> **One idempotency key cannot create multiple independent payment intents or multiple blockchain transactions.**

- **Enforcement:** Database unique constraint on `(organization_id, request_id)` in `payment_intents` and memory CAS storage. Retries return the original intent record without duplicate reservation or fee deduction.
- **Test Evidence:** `TestDay9_FinancialInvariants/IdempotencyPreventsDuplicatePaymentCreation` in `day9_production_security_test.go`.

---

## 10. Forward-Only Terminal Settlement Invariant
> **A confirmed transaction can never transition back to pending, executing, or created.**

- **Enforcement:** State machine transitions are unidirectional. Once `Status == CONFIRMED`, all subsequent state mutation attempts return `ErrAlreadyConfirmed`.
- **Test Evidence:** `services/gateway/internal/execution/gate_test.go`.

---

## 11. Decoupled Webhook Side-Effect Invariant
> **Webhook delivery failure, retry, or timeout cannot alter, roll back, or corrupt underlying financial or transaction states.**

- **Enforcement:** Webhook dispatching runs asynchronously out-of-band via background worker. Failures increment endpoint failure counters and retry queues without impacting intent records or balances.
- **Test Evidence:** `services/gateway/tests/integration/day6_events_webhooks_test.go`.

---

## 12. Simulation Isolation Invariant
> **Financial simulations (`POST /v1/simulations`) can never create real blockchain transactions, reserve vault liquidity, or mutate balances.**

- **Enforcement:** Simulation endpoints call policy simulation methods with `simulation: true` flags, creating ephemeral decisions without database persistence or on-chain execution requests.
- **Test Evidence:** `services/gateway/tests/integration/day8_economy_simulation_test.go`.

---

## 13. Policy Self-Modification Prevention Invariant
> **An AI agent cannot modify, relax, or disable its own spending policy or budget ceilings.**

- **Enforcement:** Agent tasks and SDK interfaces expose zero policy update endpoints. Policy configuration is restricted to authenticated human administrators via organization-scoped policy management routes.
- **Test Evidence:** `packages/sdk-typescript/src/tests/sdk.test.ts`.

---

## 14. Agent Self-Approval Prohibition Invariant
> **An AI agent cannot approve its own payment intent.**

- **Enforcement:** In `domain_service.RecordApproval`, if `approverID == pi.AgentID`, the request is immediately rejected with `ErrAgentSelfApprovalProhibited`.
- **Test Evidence:** `TestDay9_FinancialInvariants/AgentCannotApproveItsOwnPayment` in `day9_production_security_test.go`.

---

## 15. Immediate Emergency Halting Invariant
> **Activating an emergency kill switch (Agent, Organization, or Global) instantly prevents new payment creation and execution.**

- **Enforcement:** `CreateIntent` rejects creation for paused agents (`ErrAgentPaused`). The Execution Gate blocks execution with `ErrAgentNotActive`, `ErrOrganizationPaused`, or `ErrGlobalExecutionPaused`.
- **Test Evidence:** `TestDay9_FinancialInvariants/EmergencyPausePreventsExecution` in `day9_production_security_test.go`.

---

## 16. Multi-Tenant Organization Isolation Invariant
> **Organization boundaries can never be crossed; resources belonging to Organization A are inaccessible and un-modifiable by Organization B.**

- **Enforcement:** Every API request verifies authenticated `orgID` matching the target resource's `organization_id`. Cross-tenant queries return 404 `NOT_FOUND` (preventing ID enumeration) or 403 `FORBIDDEN`.
- **Test Evidence:** `TestDay9_IDOR_CrossOrganizationIsolation` in `day9_production_security_test.go`.
