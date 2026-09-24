# Task 16: Protocol Integration Audit & Architecture Freeze

## 1. System Context & Freeze Objectives

Prior to implementing **Task 16 — AgentPay Autonomous Economic Protocol**, this audit documents all existing protocol-related abstractions across Tasks 1–15 to prevent architectural drift, parallel implementations, or duplicate identity and payment systems.

The core rule of Task 16 is:
> **ANY AGENT CAN PARTICIPATE IN THE ECONOMY.**  
> **NO AGENT CAN BECOME THE FINANCIAL AUTHORITY.**  
> **OPEN ECONOMIC PARTICIPATION. CLOSED FINANCIAL AUTHORITY.**

The protocol layer wraps, validates, and exposes existing authoritative subsystems to external agents without creating alternative financial pathways.

---

## 2. Inventory of Existing Subsystems (Tasks 1–15)

| Subsystem | Existing Location | Source of Truth | Reusable Abstraction | Task 16 Integration Role |
| :--- | :--- | :--- | :--- | :--- |
| **Agent Identity & Network** | `internal/network` | `AgentNetworkIdentity`, `IdentityRegistry` | `AgentNetworkIdentity`, `IdentityStatus` | Wrap into canonical `AgentManifest` v1. Do NOT recreate identity store. |
| **Capabilities** | `internal/network`, `internal/service` | `CapabilityRegistry`, `StructuredCapability` | `StructuredCapability` | Expose via `/protocol/v1/capabilities` query and schema endpoints. |
| **Manifests** | `internal/network` | `AgentManifest`, `ManifestValidator` | `AgentManifest` | Standardize as canonical AgentPay Manifest v1 format. |
| **Service Contracts** | `internal/network`, `internal/agent` | `AgentServiceContract`, `ContractState` | `AgentServiceContract` | Protocol maps contract lifecycle (`PROPOSED` -> `ACCEPTED` -> `COMPLETED`). |
| **Quotes & Negotiation** | `internal/network`, `internal/service` | `NetworkQuote`, `NegotiationMessage` | `NegotiationMessage`, rounds | Wrap as `QuoteRequest/Response`, `NegotiationRequest/Response`. |
| **Payment Intents** | `internal/intent` | `PaymentIntentStore`, Postgres | `PaymentIntent` | Sole pipeline for financial representation. Protocol only transports `PaymentRequest`. |
| **Clearinghouse & Obligations** | `internal/clearinghouse` | `Obligation`, `Invoice`, `SettlementBatch` | `ClearinghouseService` | Milestone settlement integration. Protocol milestone -> clearinghouse obligation. |
| **Policy & Risk Engine** | `services/policy-engine` (Rust) | Rust Policy Engine & Constitution | Deterministic evaluate & simulate | Deterministic policy gating on all protocol actions. |
| **Treasury & Liquidity** | `internal/treasury` | `TreasuryLedger`, `Reservation` | `TreasuryService` | Liquidity reservation before contract funding/payment. |
| **Execution & Settlement** | `internal/signer`, Solidity `AgentVault` | Arc Blockchain (Chain 5042) | `SignerFactory`, `AgentVault` | Real or simulated on-chain settlement. External agents never sign calldata. |
| **Operations OS & Runtime** | `internal/runtime`, `internal/operations` | Durable Checkpoints, Worker Leases | `OperationsSupervisor` | Long-running mission task execution, heartbeats, and recovery. |
| **Economic Fabric** | `internal/fabric` | `EconomicObjective`, `ExecutionBlueprint` | `EconomicFabricService` | High-level objective compilation, envelope validation, trace builder. |
| **Webhooks & Signing** | `internal/webhook` | `WebhookDispatcher`, `SignPayload` | HMAC-SHA256 signer | Webhook notifications for external agents. Reuse existing signature format `t=...,v1=...`. |
| **Authentication & Tenancy** | `internal/auth`, `internal/http/middleware` | API Key Registry, `X-Tenant-ID` | API Key validation | Authenticate external agents, enforce tenant boundary isolation. |
| **Intelligence & Reputation** | `internal/intelligence`, `internal/network` | `AgentTrustProfile`, `ReputationSummary` | Deterministic trust signals | Expose underlying descriptive reputation metrics without arbitrary trust scores. |

---

## 3. Explicit Prohibitions & Anti-Duplication Directives

1. **NO Duplicate Agent Identity System**: External agents register through the existing `internal/network` identity registry. No secondary user/agent tables.
2. **NO Duplicate Payment Mechanism**: External agents never submit raw transactions or call `AgentVault` directly. A protocol `PaymentRequest` converts strictly into an existing `PaymentIntent` that undergoes standard Policy, Risk, Approval, and Treasury verification.
3. **NO Duplicate Contract Engine**: The protocol transports contract proposals, acceptances, and milestones directly through `AgentServiceContract` in `internal/network`.
4. **NO Raw Recipient Address Injection**: External protocol messages supply `service_id` or `agent_id`; the authoritative gateway maps this to approved destination addresses. Arbitrary external hex addresses are rejected.
5. **NO Raw Calldata Injection**: Transaction payloads are generated server-side and gated by the Rust policy engine.
6. **NO Autonomous Authority Elevation**: Trust ratings or high reputation never bypass policy checks or budget ceilings (`INV-179`, `INV-180`).

---

## 4. Architectural Boundaries

```
                   EXTERNAL AI AGENTS
                           │
             Signed Envelope (Protocol v1)
                           │
                           ▼
               AGENTPAY PROTOCOL GATEWAY
        ┌──────────────────────────────────────┐
        │  1. Protocol Version Check (v1)      │
        │  2. Timestamp Freshness & Nonce      │
        │  3. HMAC/Ed25519 Signature Check     │
        │  4. Tenant Boundary Resolution       │
        │  5. Idempotency Check                │
        │  6. Rate & Size Limiting             │
        └──────────────────┬───────────────────┘
                           │
        ┌──────────────────┴───────────────────┐
        ▼                                      ▼
  OPERATIONAL ACTIONS                   FINANCIAL PROPOSALS
(Discovery, Negotiation,               (Service Requests,
 Task Progress, Results)                Payment Requests)
        │                                      │
        ▼                                      ▼
  AGENT NETWORK / OS                    ECONOMIC FABRIC
(Durable Workflows, Leases)             (Envelopes, Policy Gate)
        │                                      │
        ▼                                      ▼
 RESULT QUALITY GATE                     RUST POLICY ENGINE
(Schema, Checksum, Quality)             (Deterministic Gating)
        │                                      │
        └──────────────────┬───────────────────┘
                           ▼
                  TREASURY / CLEARING
               (Liquidity Reservation)
                           │
                           ▼
                     PAYMENT INTENT
               (Authoritative Pipeline)
                           │
                           ▼
                   AGENTVAULT / ARC
             (Zero External Agent Keys)
```

---

## 5. Security Invariant Scope (INV-161 through INV-180)

Task 16 defines and enforces 20 machine-checked security invariants:
- **INV-161:** Protocol authentication does not imply financial authorization.
- **INV-162:** External agents cannot sign financial transactions.
- **INV-163:** External agents cannot select arbitrary recipients.
- **INV-164:** External agents cannot select arbitrary calldata.
- **INV-165:** Protocol messages cannot bypass policy.
- **INV-166:** Protocol messages cannot bypass risk.
- **INV-167:** Protocol messages cannot bypass approval.
- **INV-168:** Protocol messages cannot bypass treasury.
- **INV-169:** Duplicate payment requests are idempotent.
- **INV-170:** Replayed messages are rejected.
- **INV-171:** Expired messages are rejected.
- **INV-172:** Cross-tenant protocol access is impossible.
- **INV-173:** Result submission cannot directly trigger payment.
- **INV-174:** Fake payment confirmations cannot change financial truth.
- **INV-175:** Protocol simulation cannot broadcast.
- **INV-176:** Protocol precheck cannot mutate financial state.
- **INV-177:** Webhook delivery failure cannot alter completed financial state.
- **INV-178:** Disputes cannot directly mutate ledger state.
- **INV-179:** Trust level cannot grant financial authority.
- **INV-180:** Reputation cannot grant financial authority.
