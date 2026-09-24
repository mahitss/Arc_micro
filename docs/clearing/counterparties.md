# Economic Counterparty Architecture (Task 18, Section 2)

## 1. Concept & Model

The `EconomicCounterparty` model establishes network participant boundaries within the clearing plane:

```json
{
  "counterparty_id": "cp_auditor_01",
  "tenant_id": "tenant_default",
  "agent_id": "agent_auditor_01",
  "organization_id": "org_secops",
  "identity_status": "VERIFIED",
  "capability_reference": "sec.smart_contract_audit",
  "protocol_version": "v1.0",
  "exposure_limit": "50000000",
  "current_exposure": "18000000",
  "historical_obligations": 54,
  "active_contracts": 4,
  "risk_reference": "LOW",
  "created_at": "2026-09-25T00:00:00Z",
  "updated_at": "2026-09-25T00:00:00Z"
}
```

## 2. Identity Status vs. Financial Authority (INV-201)

Identity status transitions:
`UNVERIFIED` → `IDENTIFIED` → `VERIFIED` → `SUSPENDED`

> **CRITICAL INVARIANT (INV-201)**:
> Identity verification represents authenticated network participation. It **DOES NOT** grant financial mutation authority, Treasury withdrawal permissions, or policy bypass.

## 3. Exposure Tracking & Limits (Sections 9 & 10)

Exposure is continuously and dynamically re-calculated from authoritative, active obligations:
- **Gross Exposure**: Sum of all confirmed, due, and settlement-pending obligations.
- **Net Exposure**: Post-netting residual debt.
- **Overdue Exposure**: Obligations whose deadline has passed without settlement.
- **Disputed Exposure**: Value locked in active disputes (cannot settle).

### Exposure Limit Enforcement
Exposure limits operate at multiple machine-checked tiers:
1. Per-agent limit
2. Per-organization limit
3. Per-contract limit
4. Global tenant limit

Limits are deterministic policy constraints. They **cannot** be increased or overridden by external agents, the marketplace, or economic intelligence learning models.
