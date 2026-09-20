# AgentPay — Service Marketplace & Registry

## 1. Overview

The **AgentPay Service Marketplace** provides an authoritative, server-side registry of external services that AI agents are permitted to discover, evaluate, and pay.

Rather than allowing agents to connect to arbitrary internet services and send funds to arbitrary crypto addresses, AgentPay enforces a **curated, verified marketplace model**.

---

## 2. Service Domain Model

Each registered service contains authoritative metadata:

```go
type Service struct {
    ID           string       // Unique identifier (e.g. "research-api")
    OrgID        string       // Provider organization identity
    Name         string       // Human-readable service name
    Description  string       // Service purpose and capabilities
    Category     string       // Categorization (RESEARCH, DATA, COMPUTE, ORACLE, AI_MODELS)
    Recipient    string       // Approved destination wallet address on Arc
    Asset        string       // Settlement currency (e.g. "USDC")
    Enabled      bool         // Operational status
    MaxPrice     string       // Maximum allowable price in base units (e.g. 5000000 = 5.00 USDC)
    FixedPrice   string       // Exact fixed price (if FIXED pricing model)
    PricingModel PricingModel // FIXED, VARIABLE, or QUOTE_REQUIRED
    TrustStatus  TrustStatus  // TRUSTED, VERIFIED, UNVERIFIED, or DISABLED
    CreatedAt    time.Time
    UpdatedAt    time.Time
}
```

### Supported Categories
- `RESEARCH`: In-depth telemetry, market analysis, synthesized intelligence.
- `DATA`: Real-time financial feeds, validator metrics, orderbook data.
- `COMPUTE`: Decentralized job execution, zero-knowledge proof generation.
- `ORACLE`: Cross-chain state attestations, price feeds.
- `AI_MODELS`: Specialized inference, embeddings, fine-tuned agent sub-models.

---

## 3. Service Trust Model

AgentPay implements a lightweight, deterministic trust classification:

| Status | Meaning | Policy Interaction |
| :--- | :--- | :--- |
| **`TRUSTED`** | First-party or audited institutional provider | Eligible for auto-execution within agent spending limits |
| **`VERIFIED`** | Third-party provider verified by AgentPay ops | Standard policy evaluation; may require approval for higher tiers |
| **`UNVERIFIED`** | Newly registered or experimental service | Strict policy: requires human approval or blocked by default policies |
| **`DISABLED`** | Deactivated or compromised service | **Hard DENY**. All payment requests immediately blocked |

> **CRITICAL**: Trust status never bypasses policy. Even a `TRUSTED` service requires human approval if the payment amount exceeds the agent's configured threshold.

---

## 4. Pricing Models & Time-Bound Quotes

### Pricing Models
1. **`FIXED`**: The service charges an exact fixed rate per invocation (e.g., 2.50 USDC per research query).
2. **`VARIABLE`**: The service charges based on usage (e.g., compute duration), capped by `max_price`.
3. **`QUOTE_REQUIRED`**: The agent must request a formal quote before submitting a payment intent.

### Service Quotes
To prevent stale pricing and price slippage, services issue **cryptographically verifiable, time-bound quotes**:

```http
POST /v1/services/:id/quote
```

**Request**:
```json
{
  "amount": "2500000",
  "asset": "USDC"
}
```

**Response**:
```json
{
  "quote_id": "quote_6f8b9e1a",
  "service_id": "research-api",
  "amount": "2500000",
  "asset": "USDC",
  "expires_at": "2026-09-20T23:30:00Z"
}
```

### Quote Validation Rules
- **Expiration**: Quotes are valid for a strict window (default: 15 minutes). Expired quotes are rejected.
- **Service Mismatch**: A quote issued for `research-api` cannot be used for `compute-api`.
- **Amount Tampering**: If the agent submits a payment intent with an amount differing from the quote, the gateway rejects the intent.

---

## 5. Service Discovery API & SDK

### HTTP API
```http
GET /v1/services?category=RESEARCH&trust_status=TRUSTED&enabled=true
```

### TypeScript SDK
```typescript
const services = await client.services.list({
  category: 'RESEARCH',
  trustStatus: 'TRUSTED',
  enabled: true,
});

const quote = await client.services.getQuote('research-api', {
  amount: '2500000',
});
```

### Python SDK
```python
services = client.services.list(category="RESEARCH", trust_status="TRUSTED", enabled=True)
quote = client.services.get_quote("research-api", amount="2500000")
```

### CLI
```bash
agentpay services list --category RESEARCH --trust TRUSTED
agentpay services quote research-api --amount 2500000
```
