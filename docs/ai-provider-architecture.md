# AgentPay Universal AI Provider Layer — Architecture Specification

## 1. Executive Summary & Core Principle

In AgentPay, **AI is advisory; financial authority is strictly deterministic.**

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CORE ARCHITECTURAL PRINCIPLE                  │
│                                                                        │
│                      AI MAY REASON.                                    │
│                      AI MAY PLAN.                                      │
│                      AI MAY RECOMMEND.                                 │
│                      AI MAY NEGOTIATE.                                 │
│                      AI MAY REPLAN.                                    │
│                                                                        │
│              >>> AI MAY NEVER AUTHORIZE MONEY. <<<                     │
└────────────────────────────────────────────────────────────────────────┘
```

The Universal AI Provider Layer abstracts model vendors (OpenRouter, Gemini, Anthropic, OpenAI, local models) while strictly sequestering all LLM reasoning to **read-only advisory proposals**. No LLM output can ever execute payments, sign blockchain transactions, bypass dual-custody gates, mutate policy invariants, or interact directly with private keys or on-chain vaults.

---

## 2. End-to-End Authoritative Architecture Pipeline

Every financial action follows an unbypassable 9-stage pipeline where AI is confined solely to Stage 1 and Stage 2:

```mermaid
flowchart TD
    subgraph AdvisoryDomain["ADVISORY DOMAIN (Probabilistic / Non-Authoritative)"]
        AIModel["OpenRouter / Universal AI Models\n(Nemotron 550B, North Mini, Gemma 4, Laguna, Flash Fin)"]
        AILayer["AgentPay AI Provider Layer\n(Task Router, Prompt Registry, Tracer)"]
        ProposalGen["Structured Proposal Generator\n(SHA-256 Digest, Strict TTL, Zero Secrets)"]
    end

    subgraph BoundaryVerification["SECURITY BOUNDARY"]
        SecGate{"Boundary Enforcement\n- Disallowed Tools Check\n- Param Sanitization\n- Hash Verification"}
    end

    subgraph DeterministicAuthority["DETERMINISTIC FINANCIAL AUTHORITY (Authoritative / Non-Bypassable)"]
        RustPolicy["Deterministic Rust Policy Engine / Constitution\n(Velocity, Cumulative Caps, Merkle Whitelist)"]
        RiskEngine["Financial Risk Engine\n(Exposure, Anomaly Scoring, Market Volatility)"]
        ApprovalEngine["Approval Engine\n(Threshold Check, Dual-Custody Human-in-the-Loop)"]
        Treasury["Treasury & Clearinghouse\n(Atomic Encumbrance, Netting, Liquidity Proof)"]
        ExecGate["Execution Gate\n(Strict Calldata Sanitizer, Zero Raw AI Hex)"]
        GoRelayer["Go Relayer & Signer\n(Isolated HSM / KMS / Encrypted Vault)"]
        AgentVault["Arc Blockchain\n(AgentVault.sol, Native Settlement)"]
    end

    AIModel -->|Token Stream / Tools| AILayer
    AILayer -->|Structured JSON| ProposalGen
    ProposalGen -->|AIProposal| SecGate

    SecGate -->|Rejected (Tampered / Unsafe)| Reject["FAIL CLOSED (Proposal Rejected)"]
    SecGate -->|Validated Advisory Proposal| RustPolicy

    RustPolicy -->|Policy Approved| RiskEngine
    RustPolicy -->|Policy Denied| Reject

    RiskEngine -->|Risk Score OK| ApprovalEngine
    ApprovalEngine -->|Approved / Signed| Treasury
    ApprovalEngine -->|Escalation Required| DualCustody["Operator Signoff"]
    DualCustody -->|Approved| Treasury

    Treasury -->|Funds Encumbered| ExecGate
    ExecGate -->|Sanitized Calldata| GoRelayer
    GoRelayer -->|Signed Tx Envelope| AgentVault
```

---

## 3. Layer Breakdown

### 3.1. Go Gateway AI Subsystem (`services/gateway/internal/ai/`)

The Go AI layer is structured into modular components:

| Component | Package | Purpose |
| :--- | :--- | :--- |
| **Canonical Types** | `internal/ai/types` | Unified request/response types, read-only tool contracts, advisory proposals, SHA-256 integrity hash verification. |
| **Security Boundary** | `internal/ai/security` | 20 security invariants verification, prohibited tool blocker (`execute_payment`, `sign_transaction`, etc.), calldata sanitization, zero-secret assertion. |
| **Model Router** | `internal/ai/routing` | Task-profile-based dynamic model selection with cascading fallbacks across 8 distinct task types. |
| **Prompt Registry** | `internal/ai/prompts` | Versioned, immutable system prompts (`v1`) enforcing strict structured output schemas and advisory postures. |
| **Observability Tracer** | `internal/ai/observability` | Ring-buffer telemetry tracer recording tokens, latencies, estimated costs, and automatic secret redaction. |
| **OpenRouter Client** | `internal/ai/openrouter` | HTTP transport for OpenRouter with model fallback arrays, structured completions, and referral headers. |
| **Provider Factory** | `internal/ai/provider` | Registry pattern supporting `"openrouter"` and `"mock"` providers with pluggable expansion. |
| **Service Facade** | `internal/ai/service.go` | Central coordinator orchestrating requests, boundary checks, hashing, and telemetry. |
| **HTTP Handlers** | `internal/http/handlers/ai.go` | Control tower endpoints for AI telemetry, health probes, routing tables, and prompt catalogs. |

### 3.2. Universal Python Agent Layer (`services/agent/app/agent.py`)

The Python Autonomous Agent framework integrates universally with OpenRouter via OpenAI-compatible endpoints:
- Uses `AsyncOpenAI(base_url="https://openrouter.ai/api/v1")` with Google ADK Labs OpenAI adapter.
- Configured with `nvidia/nemotron-3-ultra-550b-a55b:free` as primary.
- Seamless automatic fallback to `cohere/north-mini-code:free` and `google/gemma-4-31b-it:free`.
- Strictly exposes only read-only investigative tools (`search_registry`, `verify_merchant`, `estimate_service_cost`, `check_policy_allowance`).
- Zero execution or signing tools are provided to the agent model.

### 3.3. Web Application Interface (`apps/web/`)

- **`/settings/ai`**: Live management console showing active model provider, health status, 8 logical routing profiles, prompt catalog, model fallbacks, and 20 security invariants.
- **`/control`**: Operator Control Tower featuring the prominent architectural boundary strip:
  `AI IS ADVISORY. FINANCIAL AUTHORITY REMAINS DETERMINISTIC.`
  with real-time token, cost, latency, and dual-custody verification indicators.
- **`/demo`**: Updated interactive simulation flow clearly labeling Step 1 as `Universal AI Provider (Advisory)` with OpenRouter model attribution and deterministic authority badges.

---

## 4. Logical Task Routing Matrix

Models are categorized according to task complexity and latency profiles:

| Logical Task Profile | Primary Model | Fallback Models | Latency SLA |
| :--- | :--- | :--- | :--- |
| `intent_decomposition` | `nvidia/nemotron-3-ultra-550b-a55b:free` | `cohere/north-mini-code:free`, `google/gemma-4-31b-it:free` | < 1200ms |
| `service_marketplace` | `nvidia/nemotron-3-ultra-550b-a55b:free` | `cohere/north-mini-code:free` | < 800ms |
| `mission_planning` | `nvidia/nemotron-3-ultra-550b-a55b:free` | `poolside/laguna-s-2.1:free` | < 2000ms |
| `merchant_negotiation` | `inclusionai/ling-3.0-flash-fin:free` | `nvidia/nemotron-3-ultra-550b-a55b:free` | < 1000ms |
| `replanning` | `cohere/north-mini-code:free` | `nvidia/nemotron-3-ultra-550b-a55b:free` | < 900ms |
| `risk_analysis` | `inclusionai/ling-3.0-flash-fin:free` | `nvidia/nemotron-3-ultra-550b-a55b:free` | < 1500ms |
| `anomaly_explanation` | `nvidia/nemotron-3-ultra-550b-a55b:free` | `google/gemma-4-31b-it:free` | < 1200ms |
| `policy_recommendation`| `nvidia/nemotron-3-ultra-550b-a55b:free` | `inclusionai/ling-3.0-flash-fin:free` | < 1200ms |

---

## 5. Security Invariant Verification

All AI interactions produce an `AIProposal` record containing:
- Unique `ProposalID` and `RequestID`
- Cryptographic `ProposalHash` (SHA-256 over agent, action, recipient, amount, parameters, and creation time)
- Strict `ExpiresAt` timestamp (default: 5-10 minutes)
- Immutable advisory status `PROPOSED`
- Structured parameters with atomic integer amounts (`uint64` micro-units)

Any attempt to modify the proposal, forge parameters, or submit expired proposals immediately causes the deterministic security boundary to fail closed.
