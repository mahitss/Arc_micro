# AgentPay Runtime Operations Runbook

## 1. Overview & Operational Responsibilities

This runbook guides Site Reliability Engineers (SREs), DevOps engineers, and Autonomous Economy Operators in operating, monitoring, diagnosing, and resolving incidents within the **AgentPay Autonomous Operations & Durable Runtime**.

---

## 2. Standard Operational Workflows

### 2.1 Inspecting Runtime Health & Status

Using the CLI:
```bash
# Check overall metrics and queue depth
agentpay runtime status

# List active workers and check heartbeats
agentpay runtime workers

# List workflows currently awaiting automated recovery
agentpay runtime recovery
```

Using HTTP API:
```bash
curl -H "Authorization: Bearer $AGENTPAY_API_KEY" http://localhost:8080/v1/runtime/metrics
curl -H "Authorization: Bearer $AGENTPAY_API_KEY" http://localhost:8080/v1/runtime/queues
```

Using Control Tower:
Navigate to `/control/runtime` to view the live execution pipeline and telemetry counters.

---

### 2.2 Pausing an In-Flight Workflow

When investigating abnormal agent behavior, operators can pause a workflow to halt downstream actions:
```bash
agentpay runtime pause <workflow_id> --reason "Investigating provider SLA breach"
```
*Effect:* Sets state to `PAUSED`. All execution steps in progress complete or timeout; no new steps or financial disbursements can be initiated.

### 2.3 Resuming a Paused Workflow

When ready to resume:
```bash
agentpay runtime resume <workflow_id>
```
*Invariant Check:* Preconditions, policy rules, and deadline remaining are re-evaluated before execution transitions back to `RUNNING`.

### 2.4 Cancelling a Workflow Safely

If a mission or swarm must be aborted:
```bash
agentpay runtime cancel <workflow_id> --reason "Operator cancelled mission"
```
*Financial Safety Guarantee:* Any encumbered treasury reservations are released back to unencumbered available liquidity. Completed milestones remain immutably settled in the ledger.

---

## 3. Incident Remediation Workflows

### 3.1 Incident: Stale Worker / Expired Lease (`LEASE_FAILURE`)
- **Symptoms:** Step remains in `RUNNING` state past timeout, worker heartbeat missing.
- **Automated Remediation:** Runtime Recovery Engine detects `now > lease_expires_at`, advances the step's fencing token, and returns the step to the queue.
- **Operator Action:** If persistent, inspect worker host telemetry and restart unresponsive worker pods:
  ```bash
  kubectl rollout restart deployment/agentpay-worker
  ```

### 3.2 Incident: Ambiguous Blockchain Settlement (`PAYMENT_AMBIGUITY`)
- **Symptoms:** Incident recorded in `/control/runtime/incidents` with category `PAYMENT_AMBIGUITY`.
- **Safety Rule:** Never execute another payment intent or rebroadcast the raw transaction (`INV-106`).
- **Remediation:**
  1. Inspect the incident details via CLI:
     ```bash
     agentpay runtime inspect <workflow_id>
     ```
  2. Trigger deterministic reconciliation:
     ```bash
     agentpay runtime reconcile <incident_id>
     ```
  3. The Gateway queries Arc RPC for the deterministic transaction hash and verifies block confirmations. If found, the step is updated to `SUCCEEDED`. If not found, the reservation is released or safely retried.
