# AgentPay Execution Eligibility Gate & Safety Matrix (Day 3)

## 1. Overview

The **Execution Eligibility Gate** (`ExecutionGate`) is the mandatory checkpoint that sits immediately before any transaction is submitted to the blockchain execution layer.

No payment intent can transition to `EXECUTING` or be broadcast to Arc without satisfying all 10 checks of the Execution Safety Matrix in strict precedence order.

---

## 2. Deterministic Execution Safety Matrix & Precedence

Before blockchain execution, the gate evaluates the following rules in exact order:

| Step | Rule / Check | Condition | Action on Failure |
|---|---|---|---|
| **1** | **PaymentIntent Exists** | Record must exist in database | `ErrIntentNotFound` (404) |
| **2** | **Terminal & Duplicate Check** | `Status == CONFIRMED` | `ErrAlreadyConfirmed` (Idempotent return) |
| | | `Status == EXECUTING` or `SUBMITTED` | `ErrAlreadyExecuting` (409 Conflict) |
| | | `Status in [DENIED, REJECTED, CANCELLED, FAILED]` | `ErrExecutionNotPermitted` (400) |
| **3** | **Hard Policy Denial Invariant** | `PolicyDecision == "DENY"` | `ErrPolicyDenied` (403 Forbidden - Inviolable) |
| **4** | **Intent Expiration Check** | `now.After(intent.ExpiresAt)` | `ErrIntentExpired` (410 Gone) |
| **5** | **Global Kill Switch** | `system_state.global_execution == "PAUSED"` | `ErrGlobalExecutionPaused` (503 Unavailable) |
| **6** | **Organization Status** | `organization.Status != "ACTIVE"` | `ErrOrganizationPaused` (403 Forbidden) |
| **7** | **Agent Status** | `agent.Status != "ACTIVE"` | `ErrAgentNotActive` (403 Forbidden) |
| **8** | **Target Service Status** | `!service.Enabled` | `ErrServiceNotActive` (400 Bad Request) |
| **9** | **Human Approval Check** | If `RequiresApproval == true`: | |
| | | a. Approval record exists | `ErrApprovalRequired` (400) |
| | | b. `approval.Status == "APPROVED"` | `ErrApprovalRequired` (400) |
| | | c. `!now.After(approval.ExpiresAt)` | `ErrApprovalExpired` (410 Gone) |
| | | d. `approval.ApprovedBy != intent.AgentID` | `ErrAgentSelfApprovalProhibited` (403) |
| **10**| **State Machine Execution State** | `status in [AUTHORIZED, APPROVED]` | `ErrExecutionNotPermitted` (400) |

---

## 3. Security Boundaries & Invariants

1. **AI is Never Final Authority**:
   - The AI agent cannot approve its own intent (`approval.ApprovedBy != intent.AgentID`).
   - The AI agent cannot modify its policy or treasury reservations.
2. **Hard Policy Denial is Inviolable**:
   - Even if an approver attempts to sign off on an intent that the policy engine marked `DENY`, the gate strictly rejects execution.
   - Human approval can only make `ALLOW` (with threshold/risk flags) executable.
3. **Fail-Closed on Infrastructure Failure**:
   - If the database, emergency controller, or policy engine is unreachable during eligibility evaluation, the gate fails closed and blocks execution.
