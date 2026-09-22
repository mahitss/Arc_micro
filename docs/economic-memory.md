# AgentPay Economic Memory Architecture

## 1. Overview
Economic Memory is the append-only telemetry subsystem that records the outcomes of every economic transaction, quote solicitation, service execution, and result validation across AgentPay.

Traditional payment rails only log whether a transaction was mined. AgentPay Economic Memory logs whether the autonomous work that was paid for was actually delivered, valid, within latency expectations, and of acceptable quality.

---

## 2. Conceptual Schema: `EconomicObservation`

Every economic interaction generates an immutable `EconomicObservation`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique observation identifier (UUID v4 / prefix `obs_`) |
| `organization_id` | `string` | Tenant organization boundary |
| `mission_id` | `string` | Contextual autonomous mission ID |
| `agent_id` | `string` | Agent performing the interaction |
| `service_id` | `string` | Counterparty service provider |
| `hire_id` | `string` | Subcontract hire agreement ID |
| `payment_id` | `string` | Associated `PaymentIntent` ID |
| `event_type` | `EconomicEventType` | Observation event classification |
| `input_context` | `map[string]string`| Sanitized task parameters (capability, size, etc.) |
| `outcome` | `string` | Detailed outcome classification |
| `price` | `string` | Base atomic currency units settled (e.g. USDC `350000`) |
| `latency_ms` | `int64` | Measured round-trip execution latency |
| `quality_score` | `int` | Evaluated quality basis points ($0 - 10000$) |
| `risk_score` | `int` | Counterparty risk score ($0 - 100$) |
| `success` | `bool` | Empirical binary outcome |
| `failure_reason` | `string` | Detailed failure reason code if unsuccessful |
| `timestamp` | `time.Time` | UTC timestamp of observation |
| `correlation_id` | `string` | Cross-system tracing ID |

### Canonical Event Taxonomy:
- `SERVICE_SUCCESS`
- `SERVICE_FAILURE`
- `QUOTE_ACCEPTED`
- `QUOTE_REJECTED`
- `QUOTE_EXPIRED`
- `PAYMENT_SUCCESS`
- `PAYMENT_FAILURE`
- `RESULT_VALIDATED`
- `RESULT_REJECTED`
- `MISSION_COMPLETED`
- `MISSION_FAILED`

---

## 3. Explicit Time-Window Aggregations

To prevent stale historical data from biasing contemporary decisions while avoiding hyper-sensitivity to single transient glitches, metrics are computed over explicit rolling time windows:

```
[Window: last_10_jobs]   --> Immediate operational trend & responsiveness
[Window: last_24_hours]  --> Daily operational SLA compliance
[Window: last_7_days]    --> Medium-term baseline for anomaly detection
[Window: all_time]       --> Macro historical reputation baseline
```

All calculations avoid floating-point drift:
- Rates are stored in basis points:
  $$\text{success\_rate\_bps} = \frac{\text{successful\_jobs} \times 10000}{\text{total\_jobs}}$$
- Variance is calculated using integer sums of squared deviations.

---

## 4. Contextual Performance Modeling

Global reputation can be deeply misleading: a service may excel at structured financial parsing while failing at image segmentation.
Economic Memory tracks contextual performance partitioned by capability:

$$\text{ContextualScore}(S, C) = f(\text{SuccessRate}_{S, C}, \text{Latency}_{S, C}, \text{Quality}_{S, C})$$

Example:
```
Service: DataAgent
- Global Success Rate: 96%
- Context: "data_analysis"  --> 99.1% (380ms)
- Context: "image_analysis" --> 61.0% (1450ms)
- Context: "large_datasets" --> 72.4% (2100ms)
```
When planning a mission requiring `data_analysis`, the engine weights the $99.1\%$ capability performance rather than the degraded global score.

---

## 5. Anti-Poisoning & Security Invariants

> [!CAUTION]
> **Anti-Poisoning Invariant (INV-I2):**
> Economic memory is strictly append-only.
> Third-party service providers cannot declare their own success rate or reputation.

1. **Provider Claims are Metadata**: Any metrics supplied in provider registration or quote proposals are tagged `unverified_provider_claim` and excluded from scoring algorithms.
2. **Authoritative Facts Only**: Observations are derived solely from AgentPay internal gateway events:
   - On-chain Arc payment receipts.
   - Gateway TLS round-trip latencies.
   - Deterministic result validator checksums.
3. **Tenant Privacy**: Contextual performance queries are strictly filtered by `organization_id` to prevent cross-tenant data leakage.
