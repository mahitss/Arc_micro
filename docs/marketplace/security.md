# Marketplace Security Invariants & Adversarial Defenses

## Security Invariants (INV-181 to INV-200)

The marketplace operates under the axiom:
> **OPEN PARTICIPATION. CLOSED FINANCIAL AUTHORITY.**

```
MARKETPLACE (Open)
    ↓
POLICY / CONSTITUTION (Deterministic Rules)
    ↓
RISK ENGINE (Deterministic Exposure Caps)
    ↓
HUMAN / GOVERNANCE APPROVALS
    ↓
TREASURY / CLEARINGHOUSE (Liquidity Reservation)
    ↓
AGENTVAULT ON ARC (Cryptographic Blockchain Settlement)
```

---

## Complete Invariant Table

| ID | Invariant Statement | Enforcement Mechanism |
|:---|:---|:---|
| **INV-181** | Marketplace matching cannot authorize payment. | Matching engine returns CandidateSet; payment requires independent PaymentIntent pipeline. |
| **INV-182** | Marketplace ranking cannot bypass policy. | Ranking engine filters all candidates with policy decision DENY. |
| **INV-183** | Marketplace selection cannot bypass risk. | Candidates exceeding risk score threshold are marked DISQUALIFIED. |
| **INV-184** | Marketplace selection cannot bypass approval. | Opportunities flagged for governance require signed approval prior to contract award. |
| **INV-185** | Marketplace cannot increase budget. | Any quote exceeding opportunity `budget_constraint_usdc` is rejected. |
| **INV-186** | Marketplace cannot select arbitrary recipient. | Raw `0x...` hex recipient injection is rejected; only directory-approved agents allowed. |
| **INV-187** | Expired quotes cannot be awarded. | Engine validates `quote_expires_at > now`. |
| **INV-188** | Paused listings cannot receive new work. | Only `ACTIVE` listings may be matched or awarded. |
| **INV-189** | Cross-tenant listings are invisible. | Queries partition strictly by `tenant_id`. |
| **INV-190** | Provider reputation cannot create financial authority. | High reputation score does not relax policy, risk, or treasury requirements. |
| **INV-191** | Performance metrics cannot fabricate outcomes. | Metric confidence requires valid sample size $N > 0$. |
| **INV-192** | Marketplace simulation cannot mutate production. | Digital twin runs in sandbox with zero write permissions to live store. |
| **INV-193** | Marketplace compare is read-only. | Side-by-side compare performs zero database mutations. |
| **INV-194** | Duplicate award cannot create duplicate contract. | Award transition check ensures state is `OPEN` and `contract_id == ""`. |
| **INV-195** | Duplicate payment request cannot create duplicate payment. | Clearinghouse idempotency key verification blocks double-settlement. |
| **INV-196** | Provider substitution requires revalidation. | Fallback candidate must freshly pass policy, risk, and budget checks. |
| **INV-197** | Policy changes invalidate stale marketplace authorization. | Quotes bound to obsolete policy snapshot hashes fail closed. |
| **INV-198** | Risk DENY cannot be overridden by marketplace selection. | Risk DENY is absolute. |
| **INV-199** | Market scarcity cannot automatically increase financial authority. | Zero candidate matches triggers replanning/escalation, never auto-budget increase. |
| **INV-200** | Concentration signals cannot directly mutate financial controls. | Counterparty exposure alerts are informational; they do not trigger unmonitored hard freezes without governance. |
