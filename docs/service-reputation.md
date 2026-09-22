# Service Reputation & Economic Memory — Specification & Isolation

## 1. Purpose of Economic Memory

In an autonomous agent economy, service discovery cannot rely on static hardcoded endpoints or blind trust. Providers vary in uptime, latency spikes, and execution quality. The **Economic Memory** layer (`ReputationManager`) continuously tracks empirical performance telemetry to inform future candidate selection without ever weakening deterministic policy enforcement.

---

## 2. Tracked Metrics & Schema

Economic memory tracks the following metrics per `(OrganizationID, ServiceID)` pair:

```go
type ServiceReputation struct {
    ServiceID          string    // Target service or peer agent identifier
    OrganizationID     string    // Owning organization (Tenant Isolation)
    TotalRequests      uint64    // Cumulative request count
    SuccessfulRequests uint64    // Requests yielding valid, sanitized outputs
    FailedRequests     uint64    // Requests timing out or returning errors
    PaymentCount       uint64    // Confirmed payment transactions settled on Arc
    TotalVolumeBase    string    // Cumulative USDC spent in base units
    AveragePriceBase   string    // Average unit price charged
    AverageLatencyMs   int64     // Running exponential moving average latency
    FailureRateBps     int64     // Basis points (0 = 0.00%, 10000 = 100.00%)
    ReputationScore    int64     // Dynamic composite score (0 - 10000)
    LastSuccessAt      *time.Time// Timestamp of most recent successful outcome
    LastFailureAt      *time.Time// Timestamp of most recent failure
    UpdatedAt          time.Time // Last recorded outcome timestamp
}
```

---

## 3. Dynamic Reputation Scoring Algorithm

The reputation score is computed deterministically in basis points $[0, 10,000]$:

$$\text{ReputationScoreBps} = \max\left(0, 10,000 - \text{Penalty}_{\text{failure}} - \text{Penalty}_{\text{latency}}\right)$$

### 1. Failure Rate Penalty
Failure rate carries a heavy exponential penalty ($2\times$ weight):
$$\text{FailureRateBps} = \left\lfloor \frac{\text{FailedRequests} \times 10,000}{\text{TotalRequests}} \right\rfloor$$
$$\text{Penalty}_{\text{failure}} = \min\left(8,000, \text{FailureRateBps} \times 2\right)$$

### 2. Latency Spike Penalty
Services with latency exceeding a standard 1,000 ms SLA suffer a proportional latency penalty:
$$\text{Penalty}_{\text{latency}} = \begin{cases} 
0 & \text{if } \text{AvgLatencyMs} \le 1,000 \text{ ms} \\
\min\left(2,000, \left\lfloor \frac{(\text{AvgLatencyMs} - 1,000) \times 2,000}{4,000} \right\rfloor\right) & \text{if } \text{AvgLatencyMs} > 1,000 \text{ ms}
\end{cases}$$

### Example Score Calculations
- **Service A** (1,000 requests, 100% success, 250ms avg latency):
  $$\text{Penalty}_{\text{fail}} = 0, \quad \text{Penalty}_{\text{lat}} = 0 \implies \mathbf{Score = 10,000 \text{ bps (100.0)}}$$
- **Service B** (1,000 requests, 98% success, 1,500ms avg latency):
  $$\text{FailureRateBps} = 200 \implies \text{Penalty}_{\text{fail}} = 400$$
  $$\text{Penalty}_{\text{lat}} = \left\lfloor \frac{500 \times 2000}{4000} \right\rfloor = 250$$
  $$\mathbf{Score = 10,000 - 400 - 250 = 9,350 \text{ bps (93.5)}}$$

---

## 4. Organization-Level Isolation (INV-E10)

> [!IMPORTANT]
> **Strict Multi-Tenant Segregation Guarantee (INV-E10)**:
> An organization's private transaction volume, error frequencies, and mission histories are strictly private.
> Under no circumstances can Organization B inspect, query, or infer Organization A's economic profile or transaction trace.

### Implementation Architecture
1. **Isolated Keying**: All reputation lookups require an explicit `OrganizationID`.
   ```go
   key := fmt.Sprintf("%s:%s", orgID, serviceID)
   ```
2. **Trace Authorization**: Accessing `GetMissionTrace(ctx, callerOrgID, missionID)` checks that `mission.OrganizationID == callerOrgID`. Cross-organization requests immediately abort with:
   `cross-organization access denied: mission belongs to a different tenant`.
3. **Registry Independence**: Global service metadata (e.g. initial registry capabilities) remains separate from tenant-private execution telemetry.

---

## 5. Security Boundary: Reputation vs Policy

A common failure mode in naive agent frameworks is allowing high reputation or "trust scores" to bypass financial controls. In AgentPay:
- **Reputation influences discovery and candidate ranking ONLY.**
- A service with a perfect 10,000 reputation score **CANNOT** bypass per-transaction limits.
- A service with a perfect 10,000 reputation score **CANNOT** override a hard Rust policy `DENY`.
- A service with a perfect 10,000 reputation score **CANNOT** bypass human approval if required by rule.
- Policy evaluation remains authoritative and uncompromising (INV-E6, INV-E12).
