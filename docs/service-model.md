# AgentPay Service Economy Model

## 1. Overview & Core Proposition

In AgentPay, **Services** are trusted economic destinations.

> **PRIMARY ARCHITECTURAL INVARIANT**:
> **Autonomous AI agents select a `service_id`. They NEVER specify arbitrary blockchain recipient addresses.**

When an LLM agent needs compute, data, or storage, it requests a registered service from the Service Registry catalog (e.g. `web-research`, `gpu-cluster-a100`, `arweave-storage`). The gateway deterministically resolves the verified on-chain recipient address and enforces pricing constraints server-side.

This architectural pattern completely neutralizes prompt injection attacks where an attacker instructs an agent to "send 5 USDC to my personal wallet 0xBad...". The gateway rejects any intent targeting an unregistered service.

---

## 2. Service Schema & Specification

```sql
CREATE TABLE services (
    id VARCHAR(64) PRIMARY KEY,              -- e.g. "web-research"
    organization_id VARCHAR(64) NOT NULL,   -- Org scope or "system" for global catalog
    name VARCHAR(255) NOT NULL,             -- "Web Intelligence API"
    description TEXT NOT NULL,              -- Natural language description for LLM tool selection
    category VARCHAR(64) NOT NULL,          -- "RESEARCH", "COMPUTE", "STORAGE", "ORACLE"
    recipient_address VARCHAR(42) NOT NULL, -- Verified Arc wallet (0x...)
    asset VARCHAR(32) NOT NULL DEFAULT 'USDC',
    pricing_model VARCHAR(32) NOT NULL,     -- "FIXED", "PER_UNIT", "DYNAMIC_CEILING"
    max_price VARCHAR(78) NOT NULL,         -- Hard ceiling in micro-USDC (e.g. 500000 = 0.50 USDC)
    fixed_price VARCHAR(78) DEFAULT NULL,   -- Set if pricing_model is FIXED
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- "ACTIVE", "SUSPENDED", "DEPRECATED"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Service Lifecycle & Governance

### 1. Service Creation & Verification
- Services can be defined globally by AgentPay (Curated Catalog) or created privately by an Organization Admin.
- **Recipient Verification**: When registering a recipient address, the admin must verify that the address can receive native USDC on Arc. Contracts that lack fallback/receive or blacklist USDC are prevented.

### 2. Service Updates & Recipient Changes
- **Time-Lock for Recipient Changes**: Changing the recipient address of an active service requires a 24-hour time-lock or re-authentication by an Organization Admin. This prevents an attacker who gains temporary database access from silently redirecting service payments to a malicious address.
- When a recipient address changes, any in-flight intents for that service are invalidated (`CANCELLED`).

### 3. Service Suspension & Deprecation
- If a service provider experiences an outage, vulnerability, or fraudulent behavior, an admin can toggle status to `SUSPENDED`.
- Any intent referencing a suspended service is rejected immediately at the gateway with HTTP 422 `SERVICE_SUSPENDED`.

---

## 4. Pricing Rules & Policy Interaction

1. **Fixed Pricing**:
   - For deterministic micro-fees (e.g. $0.05 per API query), the service specifies `fixed_price = 50000`.
   - If the agent emits an intent requesting a different amount, the gateway automatically adjusts or rejects the request.
2. **Dynamic Ceiling Pricing**:
   - For variable compute or batch data extraction, the service specifies `max_price = 1000000` ($1.00).
   - The agent specifies its estimated amount $\le \text{max\_price}$. If the requested amount exceeds `max_price`, the gateway rejects it immediately before calling the Rust policy engine.
3. **Policy Interaction**:
   - Both the Service maximum price and the Agent's per-transaction limit must be satisfied:
     $$\text{Amount} \le \min(\text{Service.max\_price}, \text{Policy.per\_tx\_limit})$$
