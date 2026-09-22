# Economic Selection Engine — Multi-Factor Utility & Tie-Breaking

## 1. Mathematical Foundations

The **Economic Selection Engine** (`EconomyEngine`) provides deterministic ranking of candidate service providers and peer agents for any given mission step.

### Zero Floating-Point Arithmetic Invariant
In distributed systems, financial software, and cross-platform runtimes (e.g. x86_64 vs ARM64), IEEE 754 floating-point operations can introduce non-deterministic rounding errors, epsilon drift, and platform-specific divergence. To ensure that **the exact same input always produces the exact same service selection on any machine**, the Economic Selection Engine operates exclusively on **scaled integer arithmetic** using basis points:
$$1 \text{ bps} = 0.01\% = \frac{1}{10,000}$$
All scores, rates, and weights are represented in the integer range $[0, 10,000]$.

---

## 2. Multi-Factor Utility Formula

The total economic utility of a candidate quote is defined as:

$$\text{Utility Score} = C_{\text{qual}} + C_{\text{rel}} + C_{\text{rep}} + C_{\text{lat}} - C_{\text{price}} - C_{\text{risk}}$$

Where each contribution $C$ is computed via integer division:
$$C_{\text{factor}} = \left\lfloor \frac{\text{FactorScoreBps} \times \text{WeightBps}}{10,000} \right\rfloor$$

### Default Factor Weights

| Weight Parameter | Default Value (BPS) | Contribution Type | Description |
| :--- | :--- | :--- | :--- |
| `QualityWeight` | 2,500 (25%) | **Positive (+)** | Evaluated technical capability and schema adherence |
| `ReliabilityWeight` | 2,500 (25%) | **Positive (+)** | Historical success rate from service registry |
| `ReputationWeight` | 1,500 (15%) | **Positive (+)** | Dynamic historical reputation from economic memory |
| `LatencyWeight` | 1,000 (10%) | **Positive (+)** | Response speed relative to max acceptable threshold |
| `PriceWeight` | 1,500 (15%) | **Negative (-)** | Quoted price relative to step budget cap |
| `RiskWeight` | 1,000 (10%) | **Negative (-)** | Evaluated risk score and counterparty exposure |
| **Total Weights** | **10,000 (100%)** | | |

---

## 3. Factor Calculation Details

### 1. Price Contribution ($C_{\text{price}}$)
Price score measures how much of the step's max budget the quote consumes:
$$\text{PriceBps} = \min\left(10,000, \left\lfloor \frac{\text{QuotedPrice} \times 10,000}{\text{StepMaxBudget}} \right\rfloor\right)$$
$$C_{\text{price}} = \left\lfloor \frac{\text{PriceBps} \times W_{\text{price}}}{10,000} \right\rfloor$$
*A cheaper service has a lower price score, resulting in a smaller penalty and higher overall utility.*

### 2. Quality Contribution ($C_{\text{qual}}$)
Extracted directly from registry certification (e.g. 9,500 for `TRUSTED`, 9,000 for `VERIFIED`, 7,500 for `UNVERIFIED`):
$$C_{\text{qual}} = \left\lfloor \frac{\text{QualityBps} \times W_{\text{qual}}}{10,000} \right\rfloor$$

### 3. Reliability Contribution ($C_{\text{rel}}$)
Derived from the provider's historical success rate:
$$\text{ReliabilityBps} = \text{Service.SuccessRateBps} \quad (\text{e.g. } 99.8\% = 9,980 \text{ bps})$$
$$C_{\text{rel}} = \left\lfloor \frac{\text{ReliabilityBps} \times W_{\text{rel}}}{10,000} \right\rfloor$$

### 4. Latency Contribution ($C_{\text{lat}}$)
Calculated by comparing estimated latency against a baseline benchmark (5,000 ms max ceiling):
$$\text{LatencyScoreBps} = \max\left(0, 10,000 - \left\lfloor \frac{\text{EstimatedLatencyMs} \times 10,000}{5,000} \right\rfloor\right)$$
$$C_{\text{lat}} = \left\lfloor \frac{\text{LatencyScoreBps} \times W_{\text{lat}}}{10,000} \right\rfloor$$

### 5. Reputation Contribution ($C_{\text{rep}}$)
Fetched dynamically from `ReputationManager` for the calling organization:
$$C_{\text{rep}} = \left\lfloor \frac{\text{ReputationScoreBps} \times W_{\text{rep}}}{10,000} \right\rfloor$$

### 6. Risk Contribution ($C_{\text{risk}}$)
Derived from counterparty evaluation:
$$\text{RiskScoreBps} = \min(10,000, \text{RiskScore} \times 100)$$
$$C_{\text{risk}} = \left\lfloor \frac{\text{RiskScoreBps} \times W_{\text{risk}}}{10,000} \right\rfloor$$

---

## 4. Five-Stage Deterministic Tie-Breaking

If two or more candidates produce identical utility scores, ties are resolved deterministically using the following strict priority cascade:

1. **Utility Score** (Higher is better)
2. **Quoted Price** (Lower price in base units is better)
3. **Historical Reliability** (Higher `SuccessRateBps` is better)
4. **Estimated Latency** (Lower `EstimatedLatencyMs` is better)
5. **Stable Service ID** (Alphabetical lexicographical ordering `svc_a < svc_b`)

```go
sort.SliceStable(scored, func(i, j int) bool {
    // 1. Utility Score (descending)
    if scored[i].UtilityScore != scored[j].UtilityScore {
        return scored[i].UtilityScore > scored[j].UtilityScore
    }
    // 2. Price (ascending)
    priceCmp := scored[i].PriceInt.Cmp(scored[j].PriceInt)
    if priceCmp != 0 {
        return priceCmp < 0
    }
    // 3. Reliability (descending)
    if scored[i].ReliabilityBps != scored[j].ReliabilityBps {
        return scored[i].ReliabilityBps > scored[j].ReliabilityBps
    }
    // 4. Latency (ascending)
    if scored[i].LatencyMs != scored[j].LatencyMs {
        return scored[i].LatencyMs < scored[j].LatencyMs
    }
    // 5. Stable Service ID (ascending)
    return scored[i].Quote.ServiceID < scored[j].Quote.ServiceID
})
```

---

## 5. Security Invariant & Authorization Boundary

> [!IMPORTANT]
> The Economic Selection Engine is a **ranking mechanism, not an authorization engine**.
> 
> Achieving the highest utility score grants a service the privilege of being **proposed** for payment. It does NOT authorize payment. Every proposed selection MUST subsequently satisfy the 12-point checklist and receive an explicit `ALLOW` decision from the deterministic Rust Policy Engine (INV-E6).
