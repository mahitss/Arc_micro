# Operations Supervisor & Deterministic Decision Engine

## 1. Architectural Role

The **Operations Supervisor** (`OperationsSupervisor`) is the autonomous heartbeat of the operations layer. It operates on a continuous, deterministic control loop, observing system telemetry, scheduling safe work, identifying blocked pipelines, triggering bounded recovery, and propagating operational state projections to Control Tower.

```
┌─────────────────────────────────────────────────────────────┐
│                    OPERATIONS SUPERVISOR                    │
│                                                             │
│   1. Observe System Telemetry & Workflow States            │
│   2. Reclaim Expired Worker Leases                          │
│   3. Evaluate Deterministic Decision Matrix                 │
│   4. Calculate Priority & Schedule Safe Tasks               │
│   5. Detect Failures & Escalate Outliers                    │
│   6. Group Correlated Failures into Incidents               │
│   7. Update Aggregated Operations Snapshot Read Model       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                OPERATIONAL DECISION ONLY
               (INV-121: No Financial Authority)
                               │
                               ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  WORKER FENCE    │  │  DOMAIN ENGINE   │  │ EXECUTION LAYER  │
│  Claims tasks &  │  │  Authoritative   │  │ On-chain Arc &   │
│  executes within │  │  policy, risk,   │  │ AgentVault       │
│  assigned lease  │  │  treasury truth  │  │ settlement       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. Supervisor vs Worker vs Domain Separation

To ensure system safety and prevent privilege escalation, AgentPay maintains strict role boundaries:

| Layer | Responsibility | Authority |
|---|---|---|
| **Operations Supervisor** | Observes workflows, schedules queues, detects stuck tasks. | **OPERATIONAL ONLY**. Outputs scheduling decisions (`RUN`, `WAIT`, `PAUSE`). Cannot authorize funds or override policies. |
| **Worker Fleet** | Claims leased tasks from durable queues and executes tool calls. | **EXECUTES AUTHORIZED STEPS**. Cannot commit state without valid lease token (`INV-101`). |
| **Domain Engine** | Evaluates policy rules, computes credit risks, reserves treasury balance. | **FINANCIAL AUTHORITY**. Sole source of truth for allowances and permissions. |
| **Execution Layer** | Issues on-chain transactions to Arc / AgentVault. | **SETTLEMENT ONLY**. Requires cryptographically signed and treasury-reserved authorizations. |

---

## 3. Deterministic Decision Engine

Every scheduling evaluation passes through the `OperationsDecisionEngine`, which computes an exact `DecisionType` along with structured, machine-verifiable audit fields:
- `decision_id`: Unique cryptographic identifier.
- `decision`: Output action (`RUN`, `WAIT`, `RETRY`, `RECOVER`, `REPLAN`, `ESCALATE`, `PAUSE`, `CANCEL`, `RECONCILE`).
- `reason_code`: Machine-checked categorization (`POLICY_DENIED`, `APPROVAL_EXPIRED`, `TREASURY_UNAVAILABLE`, `PROVIDER_CIRCUIT_OPEN`, `EXECUTE_AUTHORIZED`).
- `inputs_hash`: SHA-256 digest of input parameters guaranteeing reproducible auditing.
- `financial_authority`: Fixed strictly to `UNCHANGED` (`INV-121`).

### Decision Evaluation Logic

```go
func (e *OperationsDecisionEngine) Evaluate(ctx context.Context, in DecisionInput) (*OperationsDecision, error) {
    // 1. Policy Gating (INV-122, INV-125)
    if in.PolicyDecision == "DENY" {
        return makeDecision(DecisionPause, "POLICY_DENIED", "Policy engine denied execution; cannot retry")
    }

    // 2. Human Approval Check (INV-123)
    if in.RequiresApproval && (!in.ApprovalApproved || in.ApprovalExpired) {
        return makeDecision(DecisionEscalate, "APPROVAL_EXPIRED", "Step requires approval or existing approval expired")
    }

    // 3. Treasury Liquidity Verification (INV-124)
    if in.RequiresPayment && !in.TreasuryReserved {
        return makeDecision(DecisionWait, "TREASURY_UNAVAILABLE", "Required treasury liquidity reservation not confirmed")
    }

    // 4. Circuit Breakers (INV-132)
    if in.ProviderCircuitOpen {
        return makeDecision(DecisionReplan, "PROVIDER_CIRCUIT_OPEN", "Provider circuit tripped; select alternative provider")
    }

    // 5. Authorized Execution
    return makeDecision(DecisionRun, "EXECUTE_AUTHORIZED", "Operational prerequisites satisfied; domain checks required")
}
```

---

## 4. Stuck Workflow & Starvation Detection

The `WorkflowSupervisor` continuously checks for workflow starvation:
- **Missing Heartbeats**: If a worker has not refreshed a lease within the visibility timeout window, the lease is revoked and the task re-queued.
- **Dependency Starvation**: Workflows waiting for external agent callbacks or quote responses beyond configured SLAs are classified with `WAITING_FOR` and `WAIT_DURATION`.
- **Policy Staleness**: If constitutional policy rules update while a financial workflow is in flight, the plan status is marked `POLICY_REVALIDATION_REQUIRED` and execution pauses.
