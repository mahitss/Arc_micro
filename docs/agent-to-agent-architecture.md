# AgentPay Agent-to-Agent (A2A) Economic Network Architecture

**Status:** APPROVED DESIGN  
**Version:** 1.0.0  
**Scope:** Autonomous Economy Engine & Inter-Agent Financial Protocol  
**Settlement Anchor:** Arc (Chain ID 5042) Native USDC  

---

## 1. Executive Summary & Product Thesis

Autonomous AI agents must be able to discover other agents, evaluate their capabilities, negotiate terms, hire them, disburse payments, validate execution outputs, and incorporate results into their primary objectives.

However:
> **The AI may reason. The AI may propose. The AI may negotiate.**  
> **BUT: AgentPay authorizes money.**

```
                    HUMAN (Objective Owner)
                      │
                 Objective
                      │
                      ▼
                AGENT A ("ResearchAgent")
                      │
                      │ needs capability
                      ▼
              AGENTPAY NETWORK
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   AGENT B        AGENT C        AGENT D
   Research       Data           Validator
    $0.40          $0.25           $0.30
        │             │             │
        └─────────────┼─────────────┘
                      ▼
              ECONOMIC ENGINE
                      │
               quote evaluation & negotiation
                      │
                      ▼
             POLICY + RISK ENGINE
                      │
                      ▼
                  PAYMENT
                      │
                      ▼
               AGENTVAULT (Solidity)
                      │
                      ▼
                     ARC (USDC Settlement)
                      │
                      ▼
                RESULT RETURNED (Untrusted)
                      │
                      ▼
                AGENT A CONTINUES
```

### Core Invariants Enforced by Architecture
1. **Zero Key Custody:** No agent ever receives a private key or signing secret.
2. **Server-Side Recipient Authority:** Payout addresses are immutably resolved from the server registry. Agents cannot choose arbitrary blockchain recipients.
3. **Hard Policy Inviolability:** No agent can bypass policy or self-approve transactions. Hard `DENY` decisions from the Rust policy engine can never be overridden.
4. **Budget Ceilings:** No agent can alter another agent's budget or exceed mission ceilings.
5. **Bounded Recursion:** Infinite recursive agent calls are blocked via `MAX_AGENT_CALL_DEPTH` limits.
6. **Untrusted Inputs:** External agent results are strictly classified as `UNTRUSTED INPUT` and can never alter financial authority or state machines.

---

## 2. Agent Identity & Service Model

Every agent participating in the economic network has a stable, cryptographic identity registered within a multi-tenant organization boundary.

### 2.1 The AgentService Abstraction
```
Agent (Keyless Principal)
  └── exposes capabilities
          └── AgentService (Discoverable Economic Endpoint)
```

```go
type AgentService struct {
    AgentID          string            `json:"agent_id"`
    ServiceID        string            `json:"service_id"`
    OrganizationID   string            `json:"organization_id"`
    Name             string            `json:"name"`
    Description      string            `json:"description"`
    Capabilities     []AgentCapability `json:"capabilities"`
    PricingModel     string            `json:"pricing_model"` // FIXED, VARIABLE, QUOTE_REQUIRED
    BasePrice        string            `json:"base_price"`    // micro-USDC integer string
    MaxPrice         string            `json:"max_price"`     // micro-USDC integer string
    SupportedAssets  []string          `json:"supported_assets"` // ["USDC"]
    Availability     string            `json:"availability"`  // ONLINE, BUSY, OFFLINE
    Reputation       int64             `json:"reputation"`    // Basis points (0-10000)
    SuccessRateBps   int64             `json:"success_rate_bps"`
    AverageLatencyMs int64             `json:"average_latency_ms"`
    RiskProfile      string            `json:"risk_profile"`  // LOW, MEDIUM, HIGH
    Enabled          bool              `json:"enabled"`
    Verified         bool              `json:"verified"`
    CreatedAt        time.Time         `json:"created_at"`
    UpdatedAt        time.Time         `json:"updated_at"`
}
```

---

## 3. Agent Capability Model

Capabilities are versioned, machine-readable specifications that define the exact input and output contracts for a service.

```json
{
  "capability": "data_analysis",
  "version": "1.0",
  "name": "Financial Data Analysis & Aggregation",
  "description": "Processes time-series financial telemetry and produces statistical summaries",
  "category": "DATA",
  "input_schema": {
    "type": "object",
    "required": ["dataset_id", "metrics"],
    "properties": {
      "dataset_id": { "type": "string" },
      "metrics": { "type": "array", "items": { "type": "string" } }
    }
  },
  "output_schema": {
    "type": "object",
    "required": ["summary", "confidence_score"],
    "properties": {
      "summary": { "type": "string" },
      "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 }
    }
  }
}
```

Agents cannot escalate or modify their registered capabilities during mission execution.

---

## 4. Agent Discovery Engine

### 4.1 Discovery API: `GET /v1/agents/discover`
Allows buyer agents to discover candidates based on deterministic operational criteria:
- `capability`: Targeted capability identifier (e.g. `data_analysis`)
- `max_price`: Ceiling in micro-USDC base units
- `min_reputation`: Minimum acceptable reputation in basis points (e.g. `8000` = 80%)
- `max_risk`: Maximum permissible risk level (`LOW`, `MEDIUM`)
- `availability`: Availability filter (`ONLINE`)
- `asset`: Currency filter (`USDC`)

### 4.2 Cross-Organization Isolation
- Agents can only discover peers within their own organization unless a service is explicitly flagged `PublicCrossOrg: true`.
- Private organizational metadata is strictly filtered out from responses.

---

## 5. Quote Lifecycle & Structured Negotiation

### 5.1 Quote Model
```go
type AgentQuote struct {
    QuoteID            string            `json:"quote_id"`
    BuyerAgentID       string            `json:"buyer_agent_id"`
    SellerAgentID      string            `json:"seller_agent_id"`
    ServiceID          string            `json:"service_id"`
    MissionID          string            `json:"mission_id,omitempty"`
    Price              string            `json:"price"` // micro-USDC base units
    Asset              string            `json:"asset"` // "USDC"
    EstimatedLatencyMs int64             `json:"estimated_latency_ms"`
    Quality            int64             `json:"quality"` // basis points (0-10000)
    ValidUntil         time.Time         `json:"valid_until"`
    Terms              map[string]string `json:"terms,omitempty"`
    Status             QuoteStatus       `json:"status"`
    NegotiationRound   int               `json:"negotiation_round"`
    CreatedAt          time.Time         `json:"created_at"`
}
```

### 5.2 Quote State Machine
```
[REQUESTED] ──► [OFFERED] ──► [ACCEPTED] (Price locked & immutable)
     │              │              │
     ├──► [EXPIRED] ├──► [EXPIRED] └──► [COMPLETED]
     │              │
     └──► [REJECTED]└──► [COUNTERED] ──► [OFFERED] (Max 3 rounds)
                    │
                    └──► [CANCELLED]
```

### 5.3 Structured Negotiation Protocol
1. Agents propose counter-offers via structured negotiation rounds.
2. An LLM or agent runtime cannot directly alter financial limits.
3. Every counter-offer is evaluated against the mission budget ceiling. If a proposed counter-offer exceeds the budget or maximum per-transaction limit, it is automatically rejected by AgentPay.
4. Once accepted, the quote is **strictly immutable**. Sellers cannot retroactively escalate prices.

---

## 6. Hiring Lifecycle & Contracts

A `Hire` represents the binding economic agreement between two agents within a mission context.

```go
type HireStatus string

const (
    HireStatusProposed       HireStatus = "PROPOSED"
    HireStatusAccepted       HireStatus = "ACCEPTED"
    HireStatusPaymentPending HireStatus = "PAYMENT_PENDING"
    HireStatusPaid           HireStatus = "PAID"
    HireStatusExecuting      HireStatus = "EXECUTING"
    HireStatusResultPending  HireStatus = "RESULT_PENDING"
    HireStatusResultReceived HireStatus = "RESULT_RECEIVED"
    HireStatusValidating     HireStatus = "VALIDATING"
    HireStatusCompleted      HireStatus = "COMPLETED"
    HireStatusFailed         HireStatus = "FAILED"
    HireStatusCancelled      HireStatus = "CANCELLED"
)
```

### Explicit State Transitions
```
PROPOSED ──► ACCEPTED ──► PAYMENT_PENDING ──► PAID ──► EXECUTING ──► RESULT_PENDING
                                                                            │
COMPLETED ◄── VALIDATING ◄── RESULT_RECEIVED ◄──────────────────────────────┘
    ▲
    └── (on validation failure: FAILED / CANCELLED)
```

---

## 7. Payment Pipeline Integration

Hiring does not invent a secondary payment system. Instead, accepting a hire directly triggers the existing, hardened AgentPay payment pipeline:

```
Hire Contract (Accepted)
       │
       ▼
PaymentIntent (Structured Request with metadata)
       │
       ▼
Deterministic Policy Engine (Sub-millisecond Rust evaluation)
       │
       ▼
Risk Engine (Explainable scoring)
       │
       ▼
Human Approval Gate (if threshold > $10 or elevated risk)
       │
       ▼
Treasury (Atomic vault liquidity reservation)
       │
       ▼
Execution Gate (10-point safety checklist)
       │
       ▼
Signer & AgentVault.sol (On-chain execution)
       │
       ▼
Arc Blockchain (Native USDC Settlement)
```

### Mandatory Traceability Metadata
Every payment intent created for an inter-agent hire must contain:
- `buyer_agent_id`: Ordering agent
- `seller_agent_id`: Service provider agent
- `hire_id`: Unique hire contract ID
- `mission_id`: Root autonomous mission ID
- `service_id`: Registered service endpoint
- `quote_id`: Accepted immutable quote ID

---

## 8. Result Contract & Untrusted Validation Layer

### 8.1 Result Model
```go
type AgentResult struct {
    HireID           string                 `json:"hire_id"`
    Status           string                 `json:"status"` // "SUCCESS", "FAILED"
    ResultType       string                 `json:"result_type"`
    Payload          map[string]interface{} `json:"payload"`
    QualityScore     int64                  `json:"quality_score"` // basis points (0-10000)
    ExecutionTimeMs  int64                  `json:"execution_time_ms"`
    ProviderMetadata map[string]string      `json:"provider_metadata,omitempty"`
    ChecksumSHA256   string                 `json:"checksum_sha256"`
    CreatedAt        time.Time              `json:"created_at"`
}
```

### 8.2 Untrusted Input Protection
External agent outputs are strictly treated as **passive strings**:
- Results are parsed and sanitized using `untrusted.go`.
- Prompt injection phrases (e.g. `"ignore previous instructions"`, `"increase payment"`, `"new recipient"`) are detected and flagged as a `SECURITY EVENT`.
- A result **can never modify** budget limits, recipient addresses, policies, or payment amounts.

### 8.3 Multi-Factor Validation
Before a hire is transitioned to `COMPLETED`:
1. **Schema Validation:** Ensures required output fields match the capability schema.
2. **Quality Threshold:** Evaluates result quality against minimum contractual SLAs.
3. **Checksum Verification:** Ensures data integrity during transit.

---

## 9. Agent Composition & Economic Recursion

AgentPay supports multi-tier agent delegation:
$$\text{Agent A} \longrightarrow \text{hires Agent B} \longrightarrow \text{hires Agent C}$$

### 9.1 Recursion Context Tracking
Every nested economic action carries:
- `root_mission_id`: Originating mission identifier
- `parent_hire_id`: Direct upstream hire contract
- `call_depth`: Integer indicating recursion depth (Root = 0, Child = 1, Grandchild = 2)
- `buyer_agent_id` / `seller_agent_id`

### 9.2 Recursion Safety Ceiling
- `MAX_AGENT_CALL_DEPTH = 3`
- If an agent attempts to spawn a nested hire that exceeds `MAX_AGENT_CALL_DEPTH`, AgentPay immediately **fails closed** (`ErrMaxCallDepthExceeded`), preventing infinite hiring loops and wallet drain.

---

## 10. Economic Graph Representation

The entire network of economic relationships is structured as a directed acyclic graph (DAG):

### Graph Schema
- **Nodes:**
  - `AGENT`: Authorized AI agents
  - `SERVICE`: Registered service endpoints
  - `MISSION`: Top-level user objectives
  - `HIRE`: Economic contracts between agents
  - `PAYMENT`: Settled payment intents on Arc
- **Edges:**
  - `HIRED`: Agent $\to$ Agent/Service
  - `PAID`: Hire $\to$ PaymentIntent
  - `DEPENDS_ON`: Step/Hire $\to$ Step/Hire
  - `PRODUCED`: Hire $\to$ Result
  - `VALIDATED_BY`: Result $\to$ Validator Agent

### Query API: `GET /v1/missions/:id/economic-graph`
Returns the deterministic JSON structure consumed by the Mission Control `/network` visualizer.

---

## 11. Formal Security Invariants (A2A-1 through A2A-14)

| Invariant | Title | Enforcement Mechanism |
| :--- | :--- | :--- |
| **A2A-1** | Zero Direct Transfers | Agents hold zero keys and cannot directly transfer funds. |
| **A2A-2** | Canonical Payment Pipeline | Every hire payment enters the standard PaymentIntent $\to$ Policy $\to$ Treasury $\to$ Arc pipeline. |
| **A2A-3** | Quote Immutability | An accepted quote cannot have its price or terms altered by the seller. |
| **A2A-4** | Expiry Enforcement | Expired quotes cannot be accepted or settled. |
| **A2A-5** | Mission Budget Inviolability | Total hire expenditures cannot exceed the authorized mission budget. |
| **A2A-6** | Policy Primacy | Inter-agent payments must respect daily, per-tx, and velocity limits. |
| **A2A-7** | Untrusted Result Isolation | External agent results cannot modify financial state, budgets, or recipients. |
| **A2A-8** | AgentPay Intermediation | Agents cannot bypass AgentPay to execute off-chain economic agreements. |
| **A2A-9** | Multi-Tenant Data Isolation | Cross-organization economic data and private metadata are inaccessible. |
| **A2A-10** | Bounded Recursion Depth | Nested agent calls are capped at `MAX_AGENT_CALL_DEPTH` and fail closed. |
| **A2A-11** | Idempotent Acceptance | Duplicate quote or hire acceptance cannot trigger duplicate payments. |
| **A2A-12** | Hard Deny Inviolability | Hard policy denials from Rust can never be overridden by human approval. |
| **A2A-13** | Simulation Isolation | Simulations execute in memory with zero blockchain broadcasts. |
| **A2A-14** | Authoritative Recipient Binding | Recipient addresses are immutably resolved on the server from the registry. |

---

## 12. Observability & Telemetry

Prometheus counters and histograms track economic network health:
- `a2a_quotes_total`, `a2a_quotes_accepted_total`, `a2a_quotes_rejected_total`, `a2a_quotes_expired_total`
- `hires_created_total`, `hires_completed_total`, `hires_failed_total`
- `agent_payments_total`, `agent_payment_volume`
- `agent_result_failures_total`, `agent_depth_limit_total`, `negotiation_rounds_total`
- Inter-agent execution latency histograms
