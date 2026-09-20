# AgentPay Human Approval Workflow Model (Day 3 Update)

## 1. Overview & Purpose

The **Human Approval Workflow** is AgentPay's financial control plane and human-in-the-loop mechanism. While autonomous AI agents operate freely for routine micro-payments within policy caps, payments that trigger elevated risk or exceed threshold caps are routed to human financial controllers before treasury funds can be disbursed on the Arc network.

```
                  AI AGENT
                     |
                     v
               PAYMENT INTENT
                     |
                     v
           RUST POLICY EVALUATION
                     |
               POLICY ALLOWED?
                /           \
             NO              YES
              |               |
              v               v
        HARD POLICY DENY    RISK ENGINE
      (Permanently Blocked)    |
                     RISK OR THRESHOLD HIGH?
                      /                 \
                   NO                     YES
                    |                      |
                    v                      v
                AUTHORIZED         APPROVAL_REQUIRED
                    |                      |
                    |              NOTIFY HUMAN APPROVER
                    |                      |
                    |             APPROVE  /  REJECT
                    |             /              \
                    |            v                v
                    +--->    APPROVED          REJECTED
                                 |                |
                                 v                v
                          EXECUTION GATE      HALTED (0 TX)
                                 |
                                 v
                            AGENTVAULT
                                 |
                                 v
                            ARC SETTLEMENT
```

---

## 2. Hard Denial Inviolability (Critical Boundary)

A hard deterministic policy `DENY` can **never** become executable through human approval.

Human approval is **not a policy override**. It is a mandatory secondary gate for requests that policy has allowed or flagged as requiring review.

$$\text{Execution Eligible} = (\text{Policy ALLOW} \lor \text{Policy APPROVAL\_REQUIRED}) \land \text{Human APPROVED} \land \text{Execution Gate Satisfied}$$

If an intent is marked `DENIED` by the Rust Policy Engine (e.g. `DAILY_LIMIT_EXCEEDED` or `RECIPIENT_BLOCKED`), any attempt to call `/v1/approvals/:id/approve` returns `HTTP 403 Forbidden` (`HARD_DENIAL_INVIOLABLE`).

---

## 3. Approval Rules & Trigger Conditions

Human approval is required when:
1. Intent amount $\ge$ `approval_threshold` configured in the Agent Policy.
2. Deterministic Risk Engine flags intent with `MEDIUM` or `HIGH` risk level.
3. Service or recipient requires explicit human confirmation.

The approval service strictly **consumes** the policy/risk decision; it does not duplicate policy evaluation logic.

---

## 4. Approval Authorization & Actor Identity

1. **AI Agent Self-Approval Prohibited**:
   - The approver identity (`approver_id`) cannot match the agent's ID (`pi.AgentID`).
   - If `strings.EqualFold(approverID, pi.AgentID)` is detected, the gateway rejects the request with `ErrAgentSelfApprovalProhibited` (`HTTP 403 Forbidden`).
2. **Recorded Fields**:
   - `approved_by` / `approved_at`
   - `rejected_by` / `rejected_at`
   - Approver identity is validated by the gateway control plane and never trusted blindly from arbitrary frontend payloads.

---

## 5. Expiration Semantics

- Every approval has an `expires_at` timestamp (default: 1 hour, or bound to the PaymentIntent TTL).
- If `now.After(approval.ExpiresAt)` or `now.After(pi.ExpiresAt)`:
  - The approval transitions to `EXPIRED`.
  - The payment intent transitions to `EXPIRED`.
  - The intent is permanently non-executable.
  - Audit event `payment.approval_expired` is emitted.
  - Any held treasury reservations are released.

---

## 6. Concurrency Safety & Atomic CAS

To protect against concurrent race conditions (e.g. Approver A clicking Approve while Approver B clicks Reject, or duplicate Approves):
- **Database CAS**:
  ```sql
  UPDATE approvals
  SET status = $1, approved_by = $2, rejection_reason = $3, resolved_at = $4
  WHERE id = $5 AND status = 'PENDING';
  ```
- **Intent Status CAS**:
  ```sql
  UPDATE payment_intents
  SET status = $1, updated_at = $2
  WHERE id = $3 AND status = 'APPROVAL_REQUIRED';
  ```
- If the CAS operation fails (`rows_affected == 0`), the loser receives `HTTP 409 Conflict` (`CONCURRENT_MODIFICATION`). Exactly one state transition occurs.

---

## 7. Approval REST API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/approvals` | List approvals for an organization |
| `GET` | `/v1/approvals/:id` | Get approval details by ID |
| `POST` | `/v1/approvals/:id/approve` | Approve payment intent (`approver_id`, optional `reason`) |
| `POST` | `/v1/approvals/:id/reject` | Reject payment intent (`approver_id`, optional `reason`) |

Approving an intent **never** directly submits a blockchain transaction. It solely updates domain state to `APPROVED`, making it eligible for the execution layer.

---

## 8. Audit Events

Every lifecycle transition emits append-only, tamper-evident audit records:
- `payment.approval_required`
- `payment.approved`
- `payment.rejected`
- `payment.approval_expired`
