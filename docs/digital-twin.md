# AgentPay Digital Twin: Snapshot Model, Isolation & Cryptographic Fingerprinting

## 1. What is the Digital Twin?

The **AgentPay Digital Twin** is an in-memory, deep-copied virtual replica of the active economic environment. It mirrors all production entities necessary to compute deterministic forecasts:
- Approved Service Registry entries (pricing models, capabilities, SLAs, trust levels)
- Agent profiles, roles, and status
- Active Spending Policies (daily velocity limits, approval thresholds, allowed assets)
- Counterparty reputations and historical reliability ratings
- Latency models and network communication assumptions

---

## 2. Deep-Copy Isolation Guarantees

Simulations frequently explore aggressive or catastrophic edge cases:
- 10x price surges
- Network blackouts & service dropouts
- Malicious adversary prompt injections
- Budget exhaustion scenarios

**Non-Negotiable Guarantee:** No mutation during a simulation run can ever modify live production state.

When `SnapshotManager.CaptureSnapshot(ctx, orgID, reg, overrides)` executes:
1. Every service entry is deep-copied into a detached memory structure.
2. Every agent and policy is duplicated.
3. The snapshot is marked `is_frozen = true`.
4. Subsequent mutations during simulation execution (e.g. tracking temporary quota deductions or failure counts) occur **strictly within the snapshot scope**.

---

## 3. Cryptographic Fingerprinting (`CalculateVersion`)

To detect whether real-world assumptions have changed between simulation time and execution time, every snapshot receives an immutable SHA-256 fingerprint:

```go
func (sm *SnapshotManager) CalculateVersion(snap *SimulationSnapshot) string {
    h := sha256.New()
    h.Write([]byte(snap.OrganizationID))
    // Deterministic sorted traversal of all services, prices, recipients, and statuses
    for _, id := range sortedServiceIDs {
        h.Write([]byte(fmt.Sprintf(":svc:%s:%s:%s:%t", id, s.MaxPrice, s.Recipient, s.Enabled)))
    }
    return hex.EncodeToString(h.Sum(nil))[:16]
}
```

If a service provider raises its price by even 0.01 USDC, or if an administrator pauses an agent in production, the fingerprint changes. When execution is attempted, the `ExecutionGate` immediately detects this mismatch and halts execution with `SIMULATION OUTDATED`.
