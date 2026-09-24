# Canonical Financial Causal Traceability (Task 18, Section 54)

## 1. Canonical 14-Stage Financial Trace

Every cleared economic settlement supports complete causal reconstruction from high-level objective to blockchain receipt reconciliation:

```
Objective
   │
   ▼
Mission
   │
   ▼
Task
   │
   ▼
Agent
   │
   ▼
Contract
   │
   ▼
Obligation
   │
   ▼
Policy Check
   │
   ▼
Risk Check
   │
   ▼
Approval
   │
   ▼
Treasury Reservation
   │
   ▼
PaymentIntent
   │
   ▼
Authorized Execution (AgentVault / Arc)
   │
   ▼
Blockchain Receipt
   │
   ▼
Reconciliation Audit
```

## 2. API & CLI Verification

### Via REST API
```http
GET /api/economy/trace/ob_live_101
Authorization: Bearer ap_live_...
```

### Via Developer CLI
```bash
agentpay economy trace ob_live_101
```

### Output Format
```
============================================================
FINANCIAL CAUSAL TRACE: trace_ob_live_101
============================================================
Target ID:       ob_live_101
Canonical Path:  objective -> mission -> contract -> obligation -> clearing -> settlement -> reconciliation

LIFECYCLE NODES:
  - [1] OBJECTIVE: obj_sec_audit (ACTIVE)
  - [2] CONTRACT: ctr_audit_901 (ACTIVE)
  - [3] OBLIGATION: ob_live_101 (CONFIRMED)
  - [4] CLEARING: net_mp_cycle_88 (NETTED)
  - [5] SETTLEMENT: batch_net_2026_09 (SETTLED)
  - [6] RECONCILIATION: rec_audit_01 (CONFIRMED)
============================================================
```
