# AgentPay — Service Marketplace & Registry (Day 4)

## 1. Overview

The **AgentPay Service Marketplace** provides an authoritative, server-side registry of external commercial services that autonomous AI agents are permitted to discover, evaluate, and purchase.

Rather than allowing autonomous models to connect to arbitrary endpoints and send funds to arbitrary wallet addresses, AgentPay enforces a **curated, verified marketplace model**.

---

## 2. Service Domain Model

Each registered service exposes safe, structured metadata:

```go
type Service struct {
    ID                    string       // Unique identifier (e.g. "web-research", "data-feed")
    OrgID                 string       // Provider organization identity
    Name                  string       // Human-readable service name
    Description           string       // Service purpose and capabilities
    Category              string       // RESEARCH, DATA, COMPUTE, ORACLE, AI_MODELS
    Capabilities          []string     // Specific capability tags (e.g. "web_search", "orderbook_telemetry")
    Recipient             string       // Authoritative destination wallet address on Arc
    Asset                 string       // Settlement currency (strictly "USDC")
    Enabled               bool         // Operational status
    MaxPrice              string       // Maximum allowable price in base units (micro-USDC)
    FixedPrice            string       // Exact fixed price (if FIXED pricing model)
    PricingModel          PricingModel // FIXED, VARIABLE, PER_CALL, or QUOTE_REQUIRED
    TrustStatus           TrustStatus  // TRUSTED, VERIFIED, UNVERIFIED, or DISABLED
    HistoricalReliability string       // Verifiable historical uptime metric (e.g. "99.98%")
    CreatedAt             time.Time
    UpdatedAt             time.Time
}
```

### Pre-Configured Ecosystem Services
1. **`web-research`**: Web Search & Deep Research Provider (`TRUSTED`, Max 0.50 USDC, 99.98% reliability).
2. **`compute-cluster`**: Decentralized GPU Compute Cluster (`TRUSTED`, Max 10.00 USDC, 99.95% reliability).
3. **`data-feed`**: Real-time Financial Data Feed (`VERIFIED`, Fixed 0.10 USDC, 99.99% reliability).
4. **`research-api`**: Autonomous Research Data Provider (`TRUSTED`, Max 25.00 USDC, Quote-Required, 99.5% reliability).
5. **`oracle-network`**: Verified Oracle Network (`TRUSTED`, Fixed 0.30 USDC, 99.99% reliability).
6. **`community-indexer`**: Community Block Indexer (`UNVERIFIED`, Max 1.50 USDC, 97.5% reliability).
7. **`archived-service`**: Deprecated Legacy Service (`DISABLED`, Inactive).

---

## 3. Service Discovery Protocol

Agents query the registry via narrow, safe tools (`ToolNameSearchService` / `discover_services`):

```go
type SearchServiceInput struct {
    Query      string // Free-text search matching name, description, ID, or capabilities
    Category   string // Filter by Category (RESEARCH, DATA, COMPUTE, ORACLE)
    Capability string // Explicit capability matching (e.g. "web_search")
}
```

### Discovery Guarantees
- Disabled services are filtered out automatically.
- No internal infrastructure secrets, API keys, or provider credentials are ever returned to the agent.
- Trust levels and historical reliability metrics are explicitly provided for agent economic reasoning.

---

## 4. Quote Architecture & Lifecycle

Services support time-limited price quotes to ensure economic predictability:

```go
type Quote struct {
    ID                string    // Unique quote ID (e.g. "qt_a1b2c3d4...")
    ServiceID         string    // Service issuing the quote
    Recipient         string    // Authoritative service recipient address
    Amount            string    // Integer base units (micro-USDC)
    Asset             string    // "USDC"
    Purpose           string    // Purpose description for policy checks
    EstimatedDelivery string    // Delivery time estimate (e.g. "immediate", "500ms")
    CreatedAt         time.Time
    ExpiresAt         time.Time
}
```

### Quote Generation Flow
```
Agent: get_quote(service_id="web-research", requested_amount="180000", asset="USDC")
  ↓
Registry evaluates:
  - Is service enabled?
  - Does requested amount adhere to pricing model (fixed vs max price cap)?
  - Is asset supported?
  ↓
Registry issues Quote:
  - ID: "qt_6f8b9e1a..."
  - Amount: "180000"
  - ExpiresAt: Now + 15m
  - Authoritative Recipient: 0x1111...1111
```

### Invariants
1. **Authoritative Recipient Binding**: A quote cannot override the registry's registered recipient address.
2. **Strict Expiry**: Once `ExpiresAt` passes, `GetQuote` and `ValidateQuote` fail closed with `ErrQuoteExpired`.
3. **Mismatched Terms**: Any discrepancy between quote terms and payment intent arguments triggers `ErrQuoteMismatch`.

---

## 5. Security Invariants

1. **Client Recipient Override Prohibited**: If a client or agent provides a recipient differing from the service registry, the request is rejected (`ErrRecipientManipulation`).
2. **Quota / Price Exceeded Prohibited**: Payment amounts exceeding `MaxPrice` fail immediately (`ErrPriceExceeded`).
3. **Disabled Service Lockout**: Any attempt to quote or pay a `DISABLED` service fails immediately (`ErrServiceDisabled`).
