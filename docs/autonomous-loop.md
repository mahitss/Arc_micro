# Autonomous Economic Loop & Bounded Self-Healing

## 1. The Autonomous Economic Loop

AgentPay runs an iterative, closed-loop coordination cycle:

```
  OBSERVE ──> INTERPRET ──> PLAN ──> SIMULATE ──> VALIDATE
     ▲                                                │
     │                                                ▼
   ADAPT <── EVALUATE <── OBSERVE <── SETTLE <── EXECUTE
```

1. **Observe**: Ingest real-time provider latency, task heartbeats, worker leases, and treasury balances.
2. **Interpret**: Identify anomalies, provider degradation, worker timeouts, or SLA risks.
3. **Plan**: Compile or adjust the execution DAG using `ObjectiveCompiler`.
4. **Simulate**: Validate expected cost, risk, and duration against production policy via Digital Twin.
5. **Validate**: Verify DAG acyclicity, capability requirements, and budget envelopes (`INV-143`).
6. **Execute**: Dispatch tasks to durable workers with fenced leases and checkpointing.
7. **Observe & Evaluate**: Ingest worker deliverables; inspect output schemas and confidence scores.
8. **Settle**: If quality gate passes, release milestone payment through Treasury and Clearinghouse.
9. **Adapt**: If failures occur, perform safe recovery or replan within bounded parameters.

---

## 2. Hard Execution Bounds

The autonomous loop is strictly bounded to prevent infinite loops, cascade retries, or compute exhaustion:

- **Maximum Replans**: Capped at **3** replan attempts per objective. Further failure forces human escalation (`ESCALATE`).
- **Maximum Retries**: Capped at **3** retries per individual task step.
- **Maximum Delegation Depth**: Capped at **4** agent delegation hops (`INV-S2`).
- **Maximum Execution Time**: Enforced by SLA deadline timestamp (`deadline`).
- **Maximum Economic Budget**: Hard locked by `economic_budget` and `EconomicEnvelope`.

---

## 3. Safe vs Unsafe Self-Healing

| Safe Self-Healing (Permitted Autonomously) | Unsafe Self-Healing (Hard Blocked by Invariants) |
| :--- | :--- |
| Standby worker replacement | Elevating economic budget |
| Provider fallback substitution within budget | Overriding or weakening policy rules |
| Checkpoint restoration and replay | Bypassing required multi-sig approvals |
| Re-running deliverable quality checks | Changing payment recipient address |
| Rebuilding CQRS read models | Disabling constitutional guardrails |
