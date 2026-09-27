# AgentPay AI Provider Audit

**Document:** `docs/ai-provider-audit.md`  
**Task:** Task 37 — AgentPay Universal AI Provider Layer  
**Date:** September 2026  
**Status:** Canonical Security & Architecture Audit  

---

## 1. Executive Summary

This audit catalogs every AI/LLM dependency, integration point, and call site across the AgentPay codebase. The primary architectural objective of Task 37 is to replace direct, coupled Gemini/Google-specific dependencies and single-provider models with a **universal, provider-agnostic AI abstraction layer** powered by **OpenRouter**, while strictly enforcing the core security invariant:

> **AI MAY REASON. AI MAY PLAN. AI MAY RECOMMEND. AI MAY NEGOTIATE. AI MAY REPLAN.**  
> **AI MAY NEVER AUTHORIZE MONEY.**

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AGENTPAY AUTHORITATIVE FLOW                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   AI Agent / Reasoner                                                  │
│        │                                                               │
│        ▼                                                               │
│   AgentPay AI Provider Layer (OpenRouter / Multi-Model Router)         │
│        │                                                               │
│        ▼                                                               │
│   Strict Structured Proposal (AIProposal)                              │
│        │                                                               │
│        ▼                                                               │
│   Deterministic Rust Policy Engine / Constitution (Zero Float/Clock)   │
│        │                                                               │
│        ▼                                                               │
│   Deterministic Risk Engine (Risk Scoring & Thresholds)               │
│        │                                                               │
│        ▼                                                               │
│   Approval Engine (Exemptions / Multi-Sig Escalation)                  │
│        │                                                               │
│        ▼                                                               │
│   Treasury / Clearinghouse (Balance Check, Reservation, Netting)       │
│        │                                                               │
│        ▼                                                               │
│   Execution Gate (Idempotency, Kill-Switch, Rate Limits)               │
│        │                                                               │
│        ▼                                                               │
│   Go Blockchain Relayer (Holds Signing Capability)                     │
│        │                                                               │
│        ▼                                                               │
│   AgentVault Smart Contract (Arc Mainnet 5042)                         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inventory of Current AI Dependencies

### 2.1 Gemini & Google-Specific Dependencies

| Component | File Path | Type | Details |
| :--- | :--- | :--- | :--- |
| **Python Agent SDK** | `services/agent/pyproject.toml` | Package Dependency | `google-genai>=1.0.0`, `google-adk>=2.8.0,<2.9.0` |
| **Python Agent Lockfile** | `services/agent/uv.lock` | Lockfile | Direct resolution of `google-genai` and `google-adk` |
| **Python Root Agent** | `services/agent/app/agent.py` | Import & Instantiation | `from google.adk.models import Gemini`, instantiated with `MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")` |
| **Python Guidance Docs** | `services/agent/GEMINI.md` | Documentation | Instructions referencing Google ADK runtime and Gemini models |
| **CLI Manifest** | `services/agent/agents-cli-manifest.yaml` | Manifest | References `GEMINI.md` as agent guidance |

### 2.2 Go Gateway AI Integrations

| Component | File Path | Type | Details |
| :--- | :--- | :--- | :--- |
| **Gateway Config** | `services/gateway/internal/config/config.go` | Environment / Config | `AIProvider`, `AIEndpoint`, `AIModel`, `AIAPIKey` read from env (`AI_PROVIDER`, `AI_ENDPOINT`, `AI_MODEL`, `AI_API_KEY`) |
| **Gateway HTTP Model** | `services/gateway/internal/agent/model.go` | HTTP Client | `HTTPModel` interacting with OpenAI/OpenRouter chat completions (`https://openrouter.ai/api/v1/chat/completions`) |
| **Gateway Main Server** | `services/gateway/cmd/server/main.go` | Wiring | Instantiates `agent.NewHTTPModel` with system prompt from `services/agent/prompts/agent_system_v1.txt` |
| **Agent Runner Loop** | `services/gateway/internal/agent/runner.go` | Execution Loop | `AgentRunner` orchestrating multi-step autonomous task execution with tool execution |
| **Agent Service** | `services/gateway/internal/agent/service.go` | Orchestration | `Service` managing task submission, payment intent generation, and service registry lookups |
| **Mock Model** | `services/gateway/internal/agent/model.go` | Testing | `MockAgentModel` providing deterministic responses for offline tests |

### 2.3 Web Application & UI Integrations

| Component | File Path | Type | Details |
| :--- | :--- | :--- | :--- |
| **Settings Page** | `apps/web/src/app/settings/page.tsx` | View | References `AI Reasoning Engine: Pluggable AgentModel` |
| **Control Intelligence** | `apps/web/src/app/control/intelligence/page.tsx` | View | Displays economic recommendations and performance drift |
| **Simulator** | `apps/web/src/app/simulator/page.tsx` | Simulation View | Simulates agent task prompts, policy checks, and settlements |
| **Demo Flow** | `apps/web/src/app/demo/page.tsx` | Interactive Demo | Demonstrates the end-to-end flow from objective to settlement |

---

## 3. Analysis of Current Call Sites

### 3.1 `services/gateway/internal/agent/model.go`

- **Current Provider**: OpenAI-compatible HTTP model (defaulting to OpenRouter).
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`.
- **Request Format**:
  ```json
  {
    "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
    "models": ["nvidia/nemotron-3-ultra-550b-a55b:free", "cohere/north-mini-code:free"],
    "messages": [
      { "role": "system", "content": "<system_prompt>" },
      { "role": "user", "content": "<user_task>\n...\n</user_task>" }
    ],
    "response_format": { "type": "json_object" },
    "temperature": 0.0
  }
  ```
- **Response Format Expected**:
  ```json
  {
    "service_id": "web-research",
    "amount": 2500000,
    "confidence": 0.95,
    "reasoning": "Market research dataset query",
    "metadata": { "query": "AI Compute Benchmark" }
  }
  ```
- **Streaming Usage**: Currently non-streaming (buffered HTTP POST with `30s` timeout).
- **Tool Calling**: Managed client-side by `services/gateway/internal/agent/runner.go` (prompt injection defended via XML framing and data isolation).
- **Structured Output**: Relies on `response_format: { "type": "json_object" }` + strict Go unmarshaling and validation against registered service IDs.
- **Error Handling**: Fails closed upon HTTP non-200, unmarshaling error, or missing choices.
- **Retry Behavior**: Handled at network level (`HttpRetryOptions` in Python, single attempt with fallback array in Go).
- **Timeout Behavior**: `30s` strict HTTP timeout.

### 3.2 `services/agent/app/agent.py`

- **Current Provider**: `google.adk.models.Gemini`.
- **Current Model**: `gemini-2.5-flash`.
- **Request/Response**: Google ADK agent loop with function calling tools (`list_registered_services`, `propose_payment_intent`, `check_payment_status`).
- **Target Replacement**: Provider-agnostic OpenAI-compatible OpenRouter client supporting tool calling.

---

## 4. Gaps and Required Enhancements for Task 37

1. **Provider Abstraction Missing**:
   The Gateway currently ties `HTTPModel` directly to chat completions. An explicit `AIProvider` interface with factory registration is needed so OpenRouter, Gemini, or Mock can be swapped seamlessly.

2. **Single Model Assumption**:
   Model names are currently global (`AI_MODEL`). Different tasks require different capabilities:
   - Planning vs. Negotiation vs. Replanning vs. Swarm vs. Evaluation.
   - A logical **Model Profile Routing** system (`AI_MODEL_PLANNER`, `AI_MODEL_NEGOTIATION`, `AI_MODEL_EVALUATOR`, etc.) is required.

3. **Proposal Layer Formalization**:
   The payment intent was previously generated as an immediate transaction candidate. We need a formal `AIProposal` layer with explicit proposal types (`PLAN`, `SERVICE_SELECTION`, `NEGOTIATION`, `REPLAN`, `SWARM_ASSIGNMENT`, etc.), strict TTLs, and explicit deterministic validation steps before reaching policy.

4. **Structured Schema Validation**:
   Instead of basic JSON unmarshaling, implement rigorous schema validation rejecting any unknown fields or malformed proposals.

5. **Prompt Versioning Registry**:
   Prompts must be registered with versions, input/output schemas, and safety boundaries in a dedicated registry.

6. **Observability**:
   Trace token consumption, latency, correlation IDs, and estimated costs across all AI requests without ever logging secrets or private keys.

7. **Control Tower & UI Settings**:
   Add an AI Provider monitoring panel in Control Tower and a dedicated `/settings/ai` page.

---

## 5. Security Invariant Summary

Every component in this architectural upgrade must respect the following ironclad boundary:

| Capability | AI Layer | Deterministic Gateway / Policy | Arc Smart Contract |
| :--- | :---: | :---: | :---: |
| **Reasoning & Planning** | ✅ Allowed | ❌ Not applicable | ❌ Not applicable |
| **Service Discovery & Negotiation** | ✅ Allowed | ❌ Not applicable | ❌ Not applicable |
| **Proposing Payment Intents** | ✅ Allowed (Proposal only) | ❌ Evaluates proposals | ❌ Holds state |
| **Direct Fund Movement** | ❌ **PROHIBITED** | ❌ Authorizes | ✅ Executes via AgentVault |
| **Private Key Access** | ❌ **PROHIBITED** | ✅ Local Relayer only | ❌ Not applicable |
| **Policy Mutation** | ❌ **PROHIBITED** | ✅ Deterministic Rust | ❌ Immutable rules |
| **Treasury Allocation** | ❌ **PROHIBITED** | ✅ Deterministic Go/Rust | ✅ Vault lock |

*Audit complete. Ready for Step 2: Provider Abstraction.*
