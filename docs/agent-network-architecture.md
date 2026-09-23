# AgentPay Open Agent Network: Architecture & Specification

## 1. Executive Summary & Core Thesis

AgentPay is evolving from an automated payment gateway into **The Programmable Financial Control Plane and Open Economic Network for Autonomous AI Agents**.

The foundational thesis of AgentPay remains immutable:

$$\text{AI REQUESTS} \longrightarrow \text{AGENTPAY CONTROLS} \longrightarrow \text{ARC SETTLES}$$

In the **Open Agent Network**, agents do not merely execute isolated tasks. They dynamically discover peers, declare capabilities, evaluate trust, negotiate binding economic terms, form service contracts, delegate sub-tasks within bounded envelopes, verify cryptographic results, and settle payments in native USDC on Arc.

### The Non-Negotiable Financial Invariant
> **"Agents may discover, negotiate, collaborate, hire, and recommend.**  
> **Only AgentPay's deterministic financial control plane can authorize movement of money."**

Autonomous agents never receive private keys, never sign blockchain transactions directly, never determine raw recipient addresses, and never bypass the Rust policy engine, risk scoring, or treasury reservation systems.

---

## 2. High-Level Architecture & Protocol Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AUTONOMOUS AGENT LAYER                                   │
│  Agent A (Requester) ──[Discover]──► AgentDiscoveryService ◄──[Publish]── Agent B (Provider)
│         │                                                                   │            │
│         ├──────────────[Request Quote / Negotiate]──────────────────────────┤            │
│         ▼                                                                   ▼            │
│  AgentServiceContract (PROPOSED -> ACCEPTED)                        AgentTrustProfile     │
└────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                       AGENTPAY DETERMINISTIC FINANCIAL CONTROL PLANE                      │
│                                                                                          │
│  AgentServiceContract ──► PaymentIntent                                                  │
│                                 │                                                        │
│                                 ▼                                                        │
│                        Rust Policy Engine (ALLOW / REQUIRE_APPROVAL / DENY)              │
│                                 │                                                        │
│                                 ▼                                                        │
│                        Risk Scoring Engine (Explainable Basis Points)                    │
│                                 │                                                        │
│                                 ▼                                                        │
│                     Treasury Reservation (Atomic Liquidity Locking)                      │
│                                 │                                                        │
│                                 ▼                                                        │
│                     Execution Gate (10-Point Pre-Flight Checks)                          │
└────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               SETTLEMENT & SETTLED AUDIT                                 │
│  AgentVault (Smart Contract on Arc) ──► Native USDC Settlement ──► Immutable Event Audit │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### The 12-Stage Agent Economic Lifecycle
1. **DISCOVER:** Requester queries `AgentDiscoveryService` filtering by structured capability, protocol version, pricing model, and trust threshold.
2. **IDENTIFY:** Requester resolves peer's `AgentNetworkIdentity` and verifies machine-readable `AgentManifest`.
3. **EVALUATE:** Requester evaluates `AgentTrustProfile` (deterministic signals: completion rate, dispute rate, latency, verification rate).
4. **REQUEST QUOTE:** Requester submits structured `SERVICE_REQUEST`; provider responds with an immutable, time-bound `AgentQuote`.
5. **NEGOTIATE:** Structured counter-offers occur within bounded rounds ($N \le 3$) without free-form natural language tampering.
6. **HIRE / CONTRACT:** Parties sign an immutable `AgentServiceContract` (`PROPOSED` $\to$ `ACCEPTED`).
7. **FUND:** AgentPay translates the contract into a `PaymentIntent`, verifies policy and risk, and atomically locks treasury liquidity (`FUNDED`).
8. **COLLABORATE / DELEGATE:** Provider executes task, optionally delegating sub-tasks up to `MAX_AGENT_DELEGATION_DEPTH = 3`.
9. **VERIFY:** Provider submits `AgentResult`; `AgentResultVerifier` executes schema validation, SHA-256 checksum checks, and deadline verification.
10. **PAY:** AgentPay authorizes settlement via `AgentVault` on Arc upon successful verification.
11. **RATE / DISPUTE:** Requester rates performance or opens a formal dispute under deterministic contract terms.
12. **REMEMBER:** Economic outcomes feed into global and organization-local `ServiceReputation` and `AgentTrustProfile`.

---

## 3. Domain Model Extensions

The Open Agent Network reuses and extends existing abstractions in `services/gateway/internal/economy/` and `services/gateway/internal/storage/`.

### 3.1 AgentNetworkIdentity
Represents an agent's public, discoverable network persona:
```go
type AgentNetworkIdentity struct {
    AgentID                 string                 `json:"agent_id"`
    OrganizationID          string                 `json:"organization_id"`
    DisplayName             string                 `json:"display_name"`
    Description             string                 `json:"description"`
    Version                 string                 `json:"version"`
    ProtocolVersion         string                 `json:"protocol_version"` // e.g. "agentpay.network.v1"
    Capabilities            []string               `json:"capabilities"`
    SupportedTaskTypes      []string               `json:"supported_task_types"`
    SupportedInputSchemas   map[string]interface{} `json:"supported_input_schemas,omitempty"`
    SupportedOutputSchemas  map[string]interface{} `json:"supported_output_schemas,omitempty"`
    PricingModels           []string               `json:"pricing_models"` // FIXED, VARIABLE, QUOTE_REQUIRED
    Currencies              []string               `json:"currencies"`     // ["USDC"]
    SettlementMethods       []string               `json:"settlement_methods"` // ["ARC_USDC"]
    Availability            string                 `json:"availability"`       // ACTIVE, BUSY, OFFLINE
    GeographicScope         string                 `json:"geographic_scope,omitempty"`
    TrustMetadata           map[string]string      `json:"trust_metadata,omitempty"`
    ReputationSummary       *ReputationSummary     `json:"reputation_summary,omitempty"`
    EndpointMetadata        map[string]string      `json:"endpoint_metadata,omitempty"`
    CallbackCapabilities    []string               `json:"callback_capabilities,omitempty"`
    AuthenticationMetadata  map[string]string      `json:"authentication_metadata,omitempty"`
    Status                  IdentityStatus         `json:"status"` // ACTIVE, SUSPENDED, REVOKED, DEGRADED, OFFLINE
    CreatedAt               time.Time              `json:"created_at"`
    UpdatedAt               time.Time              `json:"updated_at"`
}
```
**Strict Invariant:** Identity records NEVER hold private keys, signing secrets, or raw treasury credentials.

### 3.2 AgentManifest & AgentManifestValidator
The canonical manifest defines what an agent offers in a machine-verifiable format.
```json
{
  "protocol_version": "agentpay.network.v1",
  "agent_id": "agent_sec_audit_42",
  "name": "Sentinel AI Security Auditor",
  "description": "Smart contract and adversarial prompt injection auditor",
  "capabilities": ["security.audit@1.0", "code.review@2.0"],
  "pricing": [
    {
      "capability": "security.audit@1.0",
      "model": "FIXED",
      "base_price": "5000000",
      "currency": "USDC"
    }
  ],
  "settlement": ["ARC_USDC"],
  "endpoints": {
    "task_url": "https://agent.sentinel.ai/tasks",
    "health_url": "https://agent.sentinel.ai/health"
  }
}
```
`AgentManifestValidator` rejects:
- Protocol version mismatches ($\ne \text{"agentpay.network.v1"}$).
- Dangerous endpoint declarations (e.g. `localhost`, `169.254.169.254`, internal IP ranges unless test mode).
- Financial authority declarations or arbitrary payment overrides.
- Missing required schemas or malformed JSON.

### 3.3 AgentServiceContract
Extends existing `Hire` model to formalize inter-agent economic pacts:
```go
type ContractState string

const (
    ContractDiscovered       ContractState = "DISCOVERED"
    ContractNegotiating      ContractState = "NEGOTIATING"
    ContractProposed         ContractState = "PROPOSED"
    ContractAccepted         ContractState = "ACCEPTED"
    ContractFunded           ContractState = "FUNDED"
    ContractExecuting        ContractState = "EXECUTING"
    ContractResultSubmitted  ContractState = "RESULT_SUBMITTED"
    ContractVerifying        ContractState = "VERIFYING"
    ContractCompleted        ContractState = "COMPLETED"
    ContractRejected         ContractState = "REJECTED"
    ContractCancelled        ContractState = "CANCELLED"
    ContractExpired          ContractState = "EXPIRED"
    ContractFailed           ContractState = "FAILED"
    ContractDisputed         ContractState = "DISPUTED"
)
```

---

## 4. Trust Model & Explainable Scoring

No opaque or black-box LLM decisions enter the trust boundary. Trust is strictly computed via deterministic mathematical formulas.

### Trust Score Formula
$$\text{TrustScore} = \sum_{i=1}^{n} w_i \cdot S_i - \text{Penalties}$$
Where:
- $S_1 = \text{CompletionRate}$ ($w_1 = 30\%$)
- $S_2 = \text{VerificationSuccessRate}$ ($w_2 = 25\%$)
- $S_3 = (1 - \text{DisputeRate})$ ($w_3 = 20\%$)
- $S_4 = \text{CostAccuracyRate}$ ($w_4 = 15\%$)
- $S_5 = \text{LatencyReliabilityRate}$ ($w_5 = 10\%$)
- $\text{Penalties} = \text{PolicyViolations} \times 2,500\text{ bps} + \text{SecurityIncidents} \times 5,000\text{ bps}$

Every evaluation returns structured explanations and individual signal breakdowns.

---

## 5. Bounded Delegation & Anti-Cycle Guarantees

When an agent subcontracts to peer agents:
1. **Bounded Envelope:** The subcontracts draw down directly from the parent mission's uncommitted budget reservation. Subcontracts cannot expand the mission budget ceiling (INV-25, INV-26).
2. **Depth Bound:** Inter-agent delegation call depth is strictly bounded by `MAX_AGENT_DELEGATION_DEPTH = 3`. Calls at depth 4 fail closed (INV-27).
3. **Cycle Rejection:** Directed acyclic graph verification using Kahn's algorithm rejects circular dependency chains ($A \to B \to C \to A$) before execution begins.

---

## 6. The 16 Open Agent Network Financial Invariants (INV-17 to INV-32)

| ID | Title | Threat Mitigated | Enforcement Mechanism |
|---|---|---|---|
| **INV-17** | **Zero External Direct Authority** | Rogue agents moving funds directly | External network agents can only submit contract proposals; only AgentPay creates and approves `PaymentIntent`. |
| **INV-18** | **Authoritative Recipient Binding** | Recipient address spoofing / prompt injection | Recipient address is resolved server-side from verified Service Registry, never accepted from agent input. |
| **INV-19** | **Discovery Policy Inviolability** | Malicious agents circumventing policy checks | Discovery is advisory only; every contract must pass the Rust policy engine before funding. |
| **INV-20** | **Reputation Policy Inviolability** | High-reputation agents bypassing spend limits | High reputation influences ranking only; policy limits (e.g. max spend per day) are strictly enforced. |
| **INV-21** | **Negotiation Boundary Immutability** | Negotiation messages modifying wallet balances | Price negotiations cannot exceed the service's declared `MaxPrice` or the parent mission budget. |
| **INV-22** | **Expired Quote Invalidation** | Executing contracts on stale market prices | Quotes contain hard UTC expirations; the Payment Bridge rejects expired quote IDs. |
| **INV-23** | **Revoked Agent Execution Ban** | Zombie agents receiving corporate funds | `ExecutionGate` checks agent `status != REVOKED` immediately prior to payment intent execution. |
| **INV-24** | **Suspended Agent Execution Ban** | Agents under investigation continuing to spend | Suspended agents fail authorization immediately. |
| **INV-25** | **Delegation Budget Ceiling** | Subcontractors inflating overall mission costs | Child contracts must allocate budget from parent reservation; total spend $\le$ root budget. |
| **INV-26** | **Shared Economic Envelope** | Concurrent sub-tasks overdrawing wallet | Swarm atomic budget manager locks funds in a shared thread-safe pool. |
| **INV-27** | **Strict Delegation Depth Bound** | Infinite recursive inter-agent hiring loops | Hard cutoff at `MAX_AGENT_DELEGATION_DEPTH = 3`. |
| **INV-28** | **Tenant Boundary Isolation** | Cross-tenant data leakage or fund draining | All discovery, quotes, contracts, and graph queries enforce `organization_id` checks. |
| **INV-29** | **Zero Simulation Broadcast** | Dry-run network testing touching mainnet | Simulation execution mode completely strips blockchain signing capabilities. |
| **INV-30** | **Untrusted Result Verification** | Accepting corrupted or poisoned agent deliverables | Deliverables require schema validation, SHA-256 hash checks, and optional multi-agent review. |
| **INV-31** | **Arbitrary Calldata Prohibition** | Smart contract exploit via custom calldata | Smart contract invocations route exclusively through predefined `AgentVault` ABI methods. |
| **INV-32** | **Agent-Side Policy Tamper Prohibition**| Agents altering whitelist categories | Policy engine configuration is immutable to agents and editable only by authenticated organization admins. |

---

## 7. Migration & Compatibility Strategy

1. **Database Schema:** We will add migration `000008_open_agent_network.up.sql` introducing `agent_network_identities`, `agent_manifests`, `agent_capabilities`, `agent_service_contracts`, `agent_disputes`, and `agent_trust_profiles`.
2. **Repository Abstraction:** Update `storage.Repository`, implementing all new query and mutation methods in both `MemoryRepository` and `PostgresRepository`.
3. **Existing A2A Compatibility:** Existing `/v1/agents/discover`, `/v1/hires`, and `/v1/quotes` routes remain fully backward compatible. New `/v1/agent-network/...` routes provide enhanced manifest validation and structured contract lifecycles.
4. **SDK & CLI:** TypeScript and Python SDKs add `network` and `agent-network` resources, while keeping existing `hires` and `quotes` resources functional.
