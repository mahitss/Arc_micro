# AgentPay Autonomous Agent Payment Flow & Lifecycle (Day 4)

## 1. Overview

This document details the end-to-end payment lifecycle for an autonomous AI agent operating within the AgentPay control plane on the Arc blockchain.

---

## 2. End-to-End Sequence Diagram

```
User               ResearchAgent       AgentPay Gateway     Rust Policy/Risk     Human Approver      Arc / AgentVault     External Service
 │                       │                    │                    │                   │                     │                    │
 │ 1. Assign Task        │                    │                    │                   │                     │                    │
 ├──────────────────────>│                    │                    │                   │                     │                    │
 │                       │ 2. search_service  │                    │                   │                     │                    │
 │                       ├───────────────────>│                    │                   │                     │                    │
 │                       │    [Service List]  │                    │                   │                     │                    │
 │                       │<───────────────────┤                    │                   │                     │                    │
 │                       │                    │                    │                   │                     │                    │
 │                       │ 3. request_payment │                    │                   │                     │                    │
 │                       ├───────────────────>│                    │                   │                     │                    │
 │                       │                    │ 4. Evaluate Policy │                   │                     │                    │
 │                       │                    ├───────────────────>│                   │                     │                    │
 │                       │                    │    & Risk Scores   │                   │                     │                    │
 │                       │                    │<───────────────────┤                   │                     │                    │
 │                       │                    │                                        │                     │                    │
 │                       │                    ├─── [IF APPROVAL REQUIRED] ────────────>│                     │                    │
 │                       │                    │    Notify Approver                     │                     │                    │
 │                       │<───────────────────┤                                        │                     │                    │
 │                       │ WAITING_FOR_APPROVAL                                        │                     │                    │
 │                       │                    │                                        │                     │                    │
 │                       │ 5. check_payment   │                                        │                     │                    │
 │                       ├───────────────────>│                                        │                     │                    │
 │                       │                    │    6. Approve Intent                   │                     │                    │
 │                       │                    │<───────────────────────────────────────┤                     │                    │
 │                       │                    │                                                              │                    │
 │                       │                    │ 7. Pre-Execution Gate Safety Matrix                          │                    │
 │                       │                    │ 8. Broadcast EIP-1559 Transaction                            │                    │
 │                       │                    ├─────────────────────────────────────────────────────────────>│                    │
 │                       │                    │    [Transaction Mined: txHash]                               │                    │
 │                       │                    │<─────────────────────────────────────────────────────────────┤                    │
 │                       │                    │                                                              │                    │
 │                       │    [CONFIRMED]     │                                                              │                    │
 │                       │<───────────────────┤                                                              │                    │
 │                       │                                                                                   │                    │
 │                       │ 9. continue_task (Pass intent_id)                                                 │                    │
 │                       ├───────────────────────────────────────────────────────────────────────────────────┼───────────────────>│
 │                       │    [Commercial Data Payload]                                                      │                    │
 │                       │<───────────────────────────────────────────────────────────────────────────────────┼───────────────────┤
 │                       │                                                                                   │                    │
 │                       │ 10. Synthesize findings into final report                                         │                    │
 │ 11. Return Final Report                                                                                   │                    │
 │<──────────────────────┤                                                                                   │                    │
```

---

## 3. Decision Branches

### Branch A: Automatic Execution (`ALLOW`)
- **Condition**: Policy passes, amount < `approval_threshold`, and deterministic risk score is `LOW` (< 30).
- **Flow**:
  1. `AuthorizeIntent` transitions status to `AUTHORIZED`.
  2. Execution gate evaluates all 10 safety checks.
  3. `ConfirmIntent` acquires atomic CAS lock (`EXECUTING`) and broadcasts to Arc Mainnet.
  4. Intent transitions to `CONFIRMED`.
  5. Agent receives receipt and proceeds to data procurement.

### Branch B: Human-in-the-Loop Approval (`APPROVAL_REQUIRED`)
- **Condition**: Amount $\ge$ `approval_threshold` (e.g. $\ge 0.50$ USDC) OR deterministic risk score is `HIGH` ($\ge 60$).
- **Flow**:
  1. `AuthorizeIntent` transitions status to `APPROVAL_REQUIRED`.
  2. Gateway creates pending `storage.Approval` record.
  3. Agent enters `WAITING_FOR_APPROVAL` state with bounded polling and backoff.
  4. Human financial controller reviews intent in Web Control Center.
  5. **If Approved**: Status transitions to `APPROVED` $\rightarrow$ Execution gate passes $\rightarrow$ Broadcasts on Arc $\rightarrow$ `CONFIRMED`.
  6. **If Rejected**: Status transitions to `REJECTED` $\rightarrow$ Agent halts task with zero blockchain transactions.

### Branch C: Hard Policy Denial (`DENY`)
- **Condition**: Per-transaction limit exceeded, daily budget cap exceeded, velocity exceeded, or recipient blocked.
- **Flow**:
  1. `AuthorizeIntent` transitions status to `DENIED`.
  2. Gateway permanently blocks execution.
  3. Human approval **cannot** override policy `DENY`.
  4. Agent receives failure reason and continues without payment or reports inability to proceed.

---

## 4. Idempotency & Concurrency Safety

1. **Task Idempotency**:
   - Every task has a unique `task_id` (or `request_id`).
   - If an agent or client repeats the same task request, the gateway returns the existing `AgentTaskExecutionResult` without re-creating payment intents.
2. **Intent Execution CAS**:
   - `CompareAndSwapIntentStatus(id, StatusAuthorized, StatusExecuting)` guarantees that exactly one execution thread acquires the right to broadcast to Arc.
   - Concurrent confirmation attempts receive HTTP 409 Conflict.
