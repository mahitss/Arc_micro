# AgentPay Human Approval Workflow Model

## 1. Overview & Purpose

The **Human Approval Workflow** is AgentPay's human-in-the-loop mechanism. While autonomous agents operate autonomously for routine micro-payments (e.g. $0.05 – $0.50), high-value or elevated-risk transactions are routed to human financial controllers before treasury funds can move on Arc.

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
            DENIED       RISK ENGINE
                              |
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
                            GO EXECUTOR       HALTED (0 TX)
                                 |
                                 v
                             AGENTVAULT
                                 |
                                 v
                            ARC MAINNET
```

---

## 2. Core Workflow Mechanics

### 1. Approval Thresholds
- Each Agent Policy defines an `approval_threshold` (e.g., $1.00 USDC / 1,000,000 base units).
- Any intent where `amount >= approval_threshold` is automatically routed to `APPROVAL_REQUIRED`, even if within the daily spending cap.
- Any intent with Risk Score $\ge 60$ (`HIGH`) is routed to `APPROVAL_REQUIRED`.

### 2. Approver Identity & RBAC
- Only users with the `APPROVER` or `ADMIN` role in the Organization can approve or reject intents.
- **Agent Self-Approval Prohibited**: Agent API keys and agent identity tokens are explicitly prohibited from calling approval endpoints.

### 3. Expiration Window
- Approval requests have a configurable TTL (Default: 30 minutes).
- If no approver acts within the TTL, the state transitions automatically to `EXPIRED`.
- Expired intents cannot be revived; the agent must generate a fresh intent.

### 4. Concurrency & Duplicate Approvals
- To prevent double-approvals or race conditions between multiple finance admins:
  ```sql
  UPDATE approval_requests
  SET status = 'APPROVED', approver_user_id = $1, decided_at = NOW()
  WHERE intent_id = $2 AND status = 'PENDING'
  RETURNING id;
  ```
- If two managers click "Approve" simultaneously, only the first request succeeds; the second receives HTTP 409 Conflict.

### 5. Rejection Flow
- Approvers can reject an intent with an optional reason string (`rejection_reason`).
- The intent transitions to `REJECTED`.
- Zero calls are dispatched to `AgentVault.sol`. Zero gas is consumed.
- Webhook `payment.rejected` is sent back to the agent runtime so the agent can adjust its strategy.

---

## 6. Audit Events Generated

Every step in the approval lifecycle emits immutable audit records:
1. `payment.approval_required` — Emitted when intent enters approval gate; records threshold and risk factors.
2. `payment.approved` — Emitted when human signs off; records `approver_user_id`, timestamp, and signature.
3. `payment.rejected` — Emitted upon human rejection; records `approver_user_id` and `rejection_reason`.
4. `payment.approval_expired` — Emitted when TTL expires without action.

---

## 7. MVP Priority Recommendation

- **Status**: **P1 (High Priority MVP Component)**.
- **Rationale**: For enterprise pilots, autonomous AI agents cannot be given direct access to company funds without a human backstop for high-value requests. Implementing a clean approval flow is a critical differentiator between a hackathon toy and enterprise financial infrastructure.
