# Incident Correlation, Lifecycle & Autonomous Mitigations

## 1. Incident Correlation Engine

In distributed autonomous systems, a single root failure (e.g. database latency or an external API outage) can trigger hundreds of secondary errors: worker timeouts, lease expirations, workflow retries, and queue depth surges.

The `IncidentCorrelationEngine` groups related operational anomalies using deterministic correlation keys:
- **Temporal Closeness**: Failures occurring within a sliding 60-second window.
- **Resource Lineage**: Common dependency paths (same database shard, shared provider API, common worker pool).
- **Tenant Scope**: Cross-tenant isolation ensures tenant-specific incidents are never blended (`INV-126`).

```
                    ROOT CAUSE: External Provider 504 Timeout
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ↓                                                   ↓
   Worker Lease Expired                                Workflow Step Failed
            ↓                                                   ↓
     Task Re-queued                                     Retry Attempt #1
            └─────────────────────────┬─────────────────────────┘
                                      │
                                      ▼
                        CORRELATED INCIDENT: inc_0982
                             Severity: MEDIUM
                         Category: PROVIDER_TIMEOUT
```

---

## 2. Incident Lifecycle & Auditable State Machine

All operational incidents progress through a formal 7-state finite state machine. Every state transition is cryptographically audited:

```
  [ DETECTED ] ──► [ TRIAGED ] ──► [ INVESTIGATING ] ──► [ MITIGATING ]
                                                              │
  [ CLOSED ] ◄──── [ RESOLVED ] ◄──── [ MONITORING ] ◄────────┘
```

- **DETECTED**: Anomaly threshold exceeded by health probes or error rates.
- **TRIAGED**: Correlated and assigned operational severity (`INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **INVESTIGATING**: Root cause identified; affected workflows and resources mapped.
- **MITIGATING**: Deterministic automated mitigation applied.
- **MONITORING**: Observation window verifying error rate returns below threshold.
- **RESOLVED**: Normal operations restored; post-incident telemetry verified.
- **CLOSED**: Final operational report archived in audit store.

---

## 3. Autonomous Mitigation Boundaries

To preserve absolute financial safety, AgentPay strictly enforces what automatic mitigations are permitted versus forbidden:

### Allowed Automatic Mitigations
- **Retry Safe Operations**: Retrying idempotent read or quote collection steps within bounded limits (`INV-138`).
- **Reclaim Expired Leases**: Reassigning orphaned tasks after worker heartbeat failures.
- **Trip Circuit Breakers**: Halting new calls to degraded providers or erratic agents (`INV-132`).
- **Pause Affected Workflows**: Freezing operational pipelines to prevent error propagation.
- **Reduce Concurrency**: Dynamically lowering worker slots to ease cluster backpressure.
- **Drain Worker**: Safely retiring unresponsive worker processes.

### Strictly Forbidden Mitigations
- **Increasing Spending Limits**: Operational engines cannot raise financial budgets (`INV-140`).
- **Bypassing Policy**: Operational mitigations cannot ignore constitutional denies (`INV-125`).
- **Authorizing Payments**: Incidents cannot trigger emergency unapproved money movement (`INV-121`).
- **Changing Recipients**: Operational routing cannot mutate payment destinations.
- **Modifying AgentVault Permissions**: Smart contract permissions remain strictly on-chain and governance-gated.

---

## 4. Provider & Agent Circuit Breakers (INV-132)

Circuit breakers protect both external APIs and internal agents:
- **CLOSED**: Normal operations. Success rate > 95%.
- **OPEN**: Failure rate > 30% over sliding window. All new calls to provider/agent immediately return `CIRCUIT_OPEN` and trigger operational replanning.
- **HALF_OPEN**: After a cooldown window (default: 60s), canary requests test provider recovery before fully resetting the circuit.

> **INVARIANT (INV-132):** Tripping a circuit breaker stops operational work. It cannot alter or invalidate existing, confirmed on-chain transactions or ledger reservations.
