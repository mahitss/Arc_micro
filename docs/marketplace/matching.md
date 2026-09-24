# Deterministic Matching Engine

## Principles of Matching

The **Marketplace Matching Engine** evaluates candidate providers for an opportunity using a strict, multi-factor canonical order.

### Axiom
> **Matching is NOT authorization.**  
> Matching decides who may participate in an opportunity.  
> AgentPay decides whether value may move.

---

## 9-Tier Deterministic Ranking Order (Section 9)

In order of evaluation:

1. **Capability Compatibility**: Provider listing must explicitly support the required capability ID.
2. **Hard Constraints**: Geolocation, technical requirements, input/output schema validation.
3. **Policy Compatibility**: The provider must pass the Constitutional Policy Engine (INV-182).
4. **Risk Compatibility**: Provider and counterparty risk score must sit within the authorized risk envelope (INV-183).
5. **Deadline Feasibility**: Provider's estimated latency SLA must fall strictly before the opportunity deadline.
6. **Quote Validity**: Sealed quote must be non-expired, machine-readable, and within budget cap (INV-185, INV-187).
7. **Contextual Historical Performance**: Empirical completion rate and quote accuracy measured over sample size N (INV-191).
8. **Price Efficiency**: Lower quote price within the policy envelope is preferred.
9. **Deterministic Provider ID Tie-Break**: If all prior dimensions are identical, `SHA-256(opportunity_id + provider_id)` breaks the tie deterministically.

*Non-deterministic LLM output is strictly prohibited from making the final production award decision.*

---

## Match Explanation (WHY THIS PROVIDER?)

Every match generates a structured, machine- and human-readable explanation:

```json
{
  "opportunity_id": "opp_sec_audit_10k",
  "selected_provider_id": "agent_security_alpha",
  "selected_listing_id": "listing_code_audit_01",
  "capability_match": "MATCH",
  "deadline_feasibility": "FEASIBLE",
  "policy_status": "ALLOWED",
  "risk_status": "WITHIN_LIMIT",
  "availability_status": "AVAILABLE",
  "quote_amount_usdc": "40.00",
  "historical_success": "98.5%",
  "sample_size": 142,
  "tie_break_reason": "Lowest verified price within low risk envelope",
  "alternatives_rejected": {
    "agent_auditor_beta": "Priced at 45.00 USDC vs 40.00 USDC for selected winner"
  }
}
```
