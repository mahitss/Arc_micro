# AgentPay Economic Exposure & Solvency Risk Model

## 1. Overview & Risk Thesis

In autonomous agent systems where agents negotiate contracts, hire sub-agents, and enter deferred obligations asynchronously, a runaway agent loop could incur millions in debt before human intervention.

To eliminate this systemic failure mode, AgentPay implements real-time **Economic Exposure Tracking** with deterministic circuit breakers.

```
       TOTAL AGENT EXPOSURE
                 │
                 ├── 1. ACTIVE UNRESERVED OBLIGATIONS (Open Liabilities)
                 ├── 2. HELD ESCROWS (Budget Headroom Locked)
                 └── 3. PENDING SETTLEMENT INVOICES (In-flight Intents)
                 │
                 ▼
     Compared against Agent Exposure Ceiling
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
  BELOW CEILING             ABOVE CEILING
 [ALLOW OBLIGATION]       [HARD CIRCUIT BREAKER]
                         (ErrExposureExceeded / INV-64)
```

---

## 2. Mathematical Definition

For any given agent $A$ in organization $O$:

$$\text{Exposure}(A) = \sum_{o \in \text{UnreservedActive}(A)} \text{Amount}(o) + \sum_{e \in \text{HeldEscrows}(A)} \text{Amount}(e) + \sum_{i \in \text{PendingInvoices}(A)} \text{Amount}(i)$$

### Invariant INV-64: Exposure Ceiling Enforcement
$$\forall A, \quad \text{Exposure}(A) \le \text{MaxExposureLimit}(A)$$

If an incoming obligation proposal or contract creates a projected exposure:
$$\text{ProjectedExposure}(A) = \text{Exposure}(A) + \text{NewObligationAmount} > \text{MaxExposureLimit}(A)$$

The clearinghouse rejects the transaction with `ErrExposureExceeded` immediately, without calling the LLM or triggering policy overrides.

---

## 3. Economic Health Snapshot & Solvency Scoring

The clearinghouse exposes an aggregated **Economic Health Snapshot**:

```typescript
export interface EconomicHealthSnapshot {
  orgId: string;
  totalActiveObligationsBase: string;
  totalEscrowLockedBase: string;
  totalSettled24hBase: string;
  discrepancyCount: number;
  solvencyRatio: number; // Reserved / Total Liabilities
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  updatedAt: string;
}
```

### Solvency Classification:
- **HEALTHY:** Solvency ratio $\ge 1.0$, zero discrepancy count, exposure below 70% of organizational cap.
- **WARNING:** Exposure between 70% and 90% of cap, or pending settlements approaching deadline.
- **CRITICAL:** Exposure $> 90\%$ of cap, or any unverified on-chain reconciliation discrepancy (`INV-65`). Automatically freezes new obligation creation.

---

## 4. API & SDK Usage

### TypeScript SDK
```typescript
const health = await client.clearinghouse.getEconomicHealth('org_enterprise');

console.log(`Org Solvency Status: ${health.status}`);
console.log(`Active Liabilities: $${Number(health.totalActiveObligationsBase) / 1e6} USDC`);
console.log(`Escrow Locked: $${Number(health.totalEscrowLockedBase) / 1e6} USDC`);
```

### REST API
```http
GET /v1/economy/health?org_id=org_enterprise HTTP/1.1
Host: gateway.agentpay.network
Authorization: Bearer sk_live_...
```
