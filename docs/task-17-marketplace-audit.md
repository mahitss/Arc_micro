# TASK 17 ARCHITECTURAL AUDIT — AGENTPAY AUTONOMOUS ECONOMIC MARKETPLACE

## Executive Summary

Task 17 transforms the existing agent network, protocol, and economic intelligence into a machine-native **Autonomous Economic Marketplace**.
Per the core design mandate:
- **THIS IS NOT A GREENFIELD BUILD.**
- **THE MARKETPLACE DECIDES WHO MAY PARTICIPATE IN AN OPPORTUNITY.**
- **AGENTPAY DECIDES WHETHER VALUE MAY MOVE.**

This audit establishes the exact boundaries, single sources of truth, existing assets to reuse, and strict anti-duplication constraints.

---

## 1. Audit of Existing Components (Tasks 1–16)

| Domain / Component | File Path / Package | Current Responsibilities | Marketplace Reuse Strategy |
|---|---|---|---|
| **Agent Identity & Network** | `internal/network/models.go`, `internal/domain/agent.go` | Canonical agent registration, Ed25519 cryptographic keys, verified orgs | **Reuse as Single Source of Truth**. Marketplace references `agent_id` and verified identity. Zero duplicate agent tables. |
| **Agent Manifest & Protocol Registry** | `internal/protocol/models.go`, `internal/network/capability_registry.go` | `AgentManifestV1`, public capabilities, endpoints, SLAs, cryptographic verification | **Reuse**. Marketplace service listings extend capability descriptors with marketplace terms, pricing models, and operational availability. |
| **Quotes & Negotiation** | `internal/network/negotiation.go`, `internal/protocol/models.go` | `ProtocolQuote`, `NegotiationPayload`, multi-round term negotiation | **Reuse**. Quotes remain immutable. Marketplace collects competitive quotes without creating redundant quote formats. |
| **Contracts & Milestones** | `internal/network/contract.go`, `internal/protocol/models.go`, `internal/clearinghouse` | `ProtocolContract`, `ContractMilestone`, state machine (`ACTIVE`, `DISPUTED`, `SETTLED`) | **Reuse**. Once an opportunity is awarded, it binds directly to the canonical Contract engine. Zero duplicate contract models. |
| **Economic Memory & Intelligence** | `internal/economy/memory.go`, `internal/economy/evaluator.go`, `internal/economy/anomaly.go` | Observations, empirical outcomes, reputation metrics, anomaly signals | **Reuse & Consume**. Marketplace matching engine queries `EconomicMemory` for contextual performance. Marketplace does not rewrite authoritative history. |
| **Economic Fabric & Objectives** | `internal/fabric/models.go`, `internal/fabric/compiler.go` | `EconomicObjective`, `ExecutionBlueprint`, counterfactual simulation, replanning | **Integrate**. Objectives autonomously spawn `MarketplaceOpportunity` instances; winning contracts feed back into durable execution blueprints. |
| **Protocol Gateway** | `internal/protocol/gateway.go`, `internal/protocol/validator.go` | 6-stage pipeline (schema, rate limit, idempotency, auth, domain routing, telemetry) | **Front-door Gateway**. External agents interact with the marketplace via AgentPay Protocol v1 envelopes with zero security bypass. |
| **Financial Authority Pipeline** | `services/policy-engine`, `internal/intent`, `internal/clearinghouse`, `internal/treasury`, `internal/signer` | Policy evaluation, risk rating, approval, liquidity reservations, AgentVault Arc settlement | **Closed Authority**. The marketplace has ZERO financial authority. Matching and awarding never authorize payment (INV-181). |
| **Control Tower & Telemetry** | `internal/control`, `apps/web/src/app/control/` | Unified trace, system health, incidents, operator actions | **Integrate**. Marketplace opportunities, listings, and matching explanations surface directly in Control Tower and Dashboard views. |

---

## 2. Identified Potential Duplications & Prohibitions

1. **No Duplicate Identity**: External agents publishing listings must resolve to a valid registered `agent_id` in the network/protocol registry (INV-186).
2. **No Duplicate Contract Engine**: The marketplace awards work by creating or referencing the canonical `ProtocolContract` with milestones. It does not introduce a separate "marketplace contract" table.
3. **No Duplicate Balances or Escrows**: Marketplace views display Clearinghouse commitments, reservations, and settlements. No "marketplace wallet" or internal credit balance is created.
4. **No Arbitrary "Star Ratings"**: Reputation is computed contextually from empirical observations in `EconomicMemory` (completion rate, latency p50/p95, quote accuracy, dispute rate) with sample-size awareness.
5. **No Financial Authority in Matching**: A candidate being ranked #1 or awarded an opportunity does NOT bypass policy or disburse funds (INV-181, INV-182, INV-183).

---

## 3. Thin Marketplace Domain Architecture

The `services/gateway/internal/marketplace` package coordinates:

```
[Economic Fabric / External Request]
                │
                ▼
      MarketplaceOpportunity (OPEN)
                │
     ┌──────────┴──────────┐
     ▼                     ▼
ServiceListings       AgentCapabilities
     │                     │
     └──────────┬──────────┘
                ▼
   MarketplaceMatchingEngine
   (Deterministic Multi-Criteria + EconomicMemory + Policy/Risk Filter)
                │
                ▼
       Ranked CandidateSet & Match Explanation
                │
                ▼
     Competitive Quoting & Sealed Quotes
                │
                ▼
       Award Provider (INV-194)
                │
                ▼
       Canonical Contract (ACTIVE)
                │
                ▼
   [Durable Workflow / Task Execution]
                │
                ▼
       Deliverable Submitted & Quality Gate (INV-173)
                │
                ▼
       Clearinghouse & Payment Pipeline (ARC SETTLEMENT)
                │
                ▼
   EconomicMemory Feedback & Reputation Update (INV-190/191)
```

---

## 4. Machine-Checked Invariants (INV-181 through INV-200)

1. **INV-181**: Marketplace matching cannot authorize payment.
2. **INV-182**: Marketplace ranking cannot bypass policy.
3. **INV-183**: Marketplace selection cannot bypass risk.
4. **INV-184**: Marketplace selection cannot bypass approval.
5. **INV-185**: Marketplace cannot increase budget.
6. **INV-186**: Marketplace cannot select arbitrary recipient.
7. **INV-187**: Expired quotes cannot be awarded.
8. **INV-188**: Paused listings cannot receive new work.
9. **INV-189**: Cross-tenant listings are invisible.
10. **INV-190**: Provider reputation cannot create financial authority.
11. **INV-191**: Performance metrics cannot fabricate outcomes.
12. **INV-192**: Marketplace simulation cannot mutate production.
13. **INV-193**: Marketplace compare is read-only.
14. **INV-194**: Duplicate award cannot create duplicate contract.
15. **INV-195**: Duplicate payment request cannot create duplicate payment.
16. **INV-196**: Provider substitution requires revalidation.
17. **INV-197**: Policy changes invalidate stale marketplace authorization.
18. **INV-198**: Risk DENY cannot be overridden by marketplace selection.
19. **INV-199**: Market scarcity cannot automatically increase financial authority.
20. **INV-200**: Concentration signals cannot directly mutate financial controls.
