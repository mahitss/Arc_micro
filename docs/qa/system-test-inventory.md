# AgentPay System Test Inventory & Architectural Map
**Document Version:** 1.0.0  
**Generated:** 2026-10-06  
**Status:** Canonical QA Baseline  
**Environment:** Simulation — No Funds Moved  

---

## 1. Executive Subsystem Mapping

| Subsystem | Location | Language / Framework | Role & Scope |
| :--- | :--- | :--- | :--- |
| **Web Operator Control Center** | `apps/web` | Next.js 14 (React 18, TypeScript) | Executive Control Tower, Mission Replay, Treasury, Simulator, Security Lab. |
| **Financial Control Gateway** | `services/gateway` | Go 1.27 (`net/http`, standard lib) | Autonomous economic control plane, policy enforcement, intent engine, clearinghouse, API routing. |
| **Policy Engine** | `services/policy-engine` | Rust (Tokio, Axum, Serde) | Deterministic sub-millisecond policy rule evaluator, risk checks, invariant validation. |
| **Python Research Agent** | `services/agent` | Python 3.13 (FastAPI, Pydantic, HTTPX) | Autonomous agent reference implementation, mission execution client. |
| **Smart Contracts** | `contracts` | Solidity 0.8.20 (Foundry) | `AgentVault.sol` non-custodial escrow, multi-sig controls, spend velocity gates. |
| **TypeScript SDK** | `packages/sdk-typescript` | TypeScript (Node.js & Browser) | Client library for programmatic AgentPay integration (`@agentpay/sdk`). |
| **Python SDK** | `packages/sdk-python` | Python 3.10+ | PyPI client library (`agentpay`). |
| **Developer CLI** | `packages/cli` | Node.js / TypeScript | Terminal operator CLI (`agentpay` command). |
| **Economic Schemas** | `schemas` | JSON Schema / YAML | Protocol, marketplace, and clearing message definitions. |
| **Database Migrations** | `services/gateway/migrations` | PostgreSQL SQL (16 migrations) | Relational schema migrations embedded in Go gateway binary. |

---

## 2. Test Suite Inventory

### 2.1 Web Frontend (`apps/web/src/__tests__`)
- **Engine:** Node.js native test runner (`node --test`)
- **Suite Count:** 31 suites (533+ tests)
- **Key Suites:**
  - `control_tower_status_semantics.test.mjs` (Canonical health & status disentanglement)
  - `control_tower_truthfulness_hardening.test.mjs` (Data provenance & simulation invariants)
  - `flagship_e2e_mission.test.mjs` (22-step canonical mission progression)
  - `frontend_data_authority.test.mjs` (Zero invented financial figures)
  - `clearing.test.mjs`, `clearinghouse.test.mjs` (Clearing and settlement verification)
  - `treasury.test.mjs` (Liquidity reservation & balance math)
  - `protocol.test.mjs`, `protocol_real_data_flow.test.mjs` (A2A message flow)
  - `marketplace.test.mjs`, `marketplace_simulation_consistency.test.mjs` (Quote comparison & selection)
  - `security_page_repair.test.mjs`, `design_system.test.mjs` (Visual & CSS stability)

### 2.2 Go Gateway (`services/gateway`)
- **Engine:** `go test` with `-race` support
- **Internal Package Suites:**
  - `internal/storage`: `factory_test.go`, `repository_test.go`
  - `internal/config`: `config_test.go`
  - `internal/http/middleware`: `auth_test.go`, `cors_test.go`, `ratelimit_test.go`
  - `internal/treasury`: `treasury_test.go`
  - `internal/clearinghouse`: `clearinghouse_test.go`
  - `internal/protocol`: `protocol_test.go`
  - `internal/runtime`: `runtime_test.go`
  - `internal/marketplace`: `marketplace_test.go`
  - `internal/fabric`: `fabric_test.go`
  - `internal/demo`: `demo_test.go`
- **Integration Test Suites (`services/gateway/tests/integration`):**
  - `adversarial_lab_test.go`
  - `agent_flow_test.go`
  - `agent_reference_test.go`
  - `ai_security_invariants_test.go`
  - `benchmark_test.go`
  - `build_first_hardening_test.go`
  - `concurrency_limit_test.go`
  - `concurrency_test.go`
  - `day3_control_plane_test.go`
  - `day5_developer_platform_test.go`
  - `day6_events_webhooks_test.go`
  - `day8_developer_platform_test.go`
  - `day8_economy_simulation_test.go`
  - `day9_production_security_test.go`
  - `failure_injection_test.go`
  - `flight_recorder_test.go`
  - `gateway_policy_test.go`
  - `negative_paths_test.go`

### 2.3 Policy Engine (`services/policy-engine`)
- **Engine:** `cargo test` & `cargo bench`
- **Suites:** `tests/authorize_test.rs` (31+ KB comprehensive authorization matrix)
- **Benchmarks:** `benches/` (Microsecond decision benchmarks)

### 2.4 Contracts (`contracts`)
- **Engine:** Foundry (`forge test`)
- **Suites:** `test/AgentVault.t.sol`, `test/AgentVaultPlaceholder.t.sol`

### 2.5 SDKs & CLI
- **TypeScript SDK:** `packages/sdk-typescript/tests` (`npm test`)
- **Python SDK:** `packages/sdk-python/tests` (`pytest`)
- **Developer CLI:** `packages/cli/tests` (`npm test`)

---

## 3. Complete API Endpoint Inventory (`services/gateway`)

### Universal AI Provider Layer
- `GET /control/ai/telemetry`, `GET /api/ai/telemetry`, `GET /v1/ai/telemetry`
- `GET /control/ai/health`, `GET /api/ai/health`, `GET /v1/ai/health`
- `GET /control/ai/models`, `GET /api/ai/models`, `GET /v1/ai/models`
- `GET /control/ai/prompts`, `GET /api/ai/prompts`, `GET /v1/ai/prompts`
- `POST /control/ai/proposals`, `POST /api/ai/proposals`, `POST /v1/ai/proposals`

### Health, Readiness & Metrics
- `GET /health` (Gateway liveness probe)
- `GET /ready` (Dependency readiness: Policy Engine, Arc RPC, Storage)
- `GET /metrics` (Prometheus telemetry)

### V1 Payments & Execution
- `POST /v1/payments/authorize`
- `POST /v1/payments/execute`
- `POST /v1/payment-intents`
- `GET /v1/payment-intents/{id}`
- `GET /v1/payment-intents/{id}/trace`
- `POST /v1/payment-intents/{id}/authorize`
- `POST /v1/payment-intents/{id}/confirm`
- `GET /v1/payment-intents`
- `GET /v1/transactions`

### Autonomous Missions & Economy
- `POST /v1/missions`
- `GET /v1/missions`
- `GET /v1/missions/{id}`
- `POST /v1/missions/{id}/start`
- `POST /v1/missions/{id}/cancel`
- `POST /v1/missions/simulate`
- `GET /v1/missions/{id}/trace`
- `GET /v1/marketplace`
- `GET /v1/economy/reputation`

### Agent-to-Agent (A2A) Network
- `GET /v1/agents/discover`
- `GET /v1/agents/services/{id}`, `GET /v1/agent-services/{id}`
- `POST /v1/agent-services/{id}/quotes`
- `GET /v1/quotes/{id}`
- `POST /v1/quotes/{id}/accept`, `POST /v1/quotes/{id}/reject`, `POST /v1/quotes/{id}/counter`
- `POST /v1/hires`, `GET /v1/hires/{id}`, `POST /v1/hires/{id}/cancel`, `POST /v1/hires/{id}/result`
- `GET /v1/missions/{id}/economic-graph`, `GET /v1/missions/{id}/hires`

### Intelligence Layer
- `GET /v1/services/{id}/performance`, `GET /v1/services/{id}/reputation`, `GET /v1/services/{id}/anomalies`
- `GET /v1/missions/{id}/observations`, `GET /v1/missions/{id}/recommendations`
- `POST /v1/missions/{id}/replan`
- `GET /v1/missions/{id}/recovery`, `GET /v1/missions/{id}/intelligence`

### Multi-Agent Swarms
- `POST /v1/swarms`, `GET /v1/swarms/{id}`, `POST /v1/swarms/{id}/start`, `POST /v1/swarms/{id}/cancel`
- `POST /v1/swarms/simulate`, `GET /v1/swarms/{id}/tasks`, `GET /v1/swarms/{id}/graph`
- `GET /v1/swarms/{id}/trace`, `GET /v1/swarms/{id}/risk`, `POST /v1/swarms/{id}/replan`

### Simulations & Digital Twin
- `POST /v1/simulations`, `GET /v1/simulations`, `GET /v1/simulations/{id}`
- `POST /v1/simulations/{id}/run`, `POST /v1/simulations/{id}/cancel`
- `GET /v1/simulations/{id}/trace`, `GET /v1/simulations/{id}/economics`, `GET /v1/simulations/{id}/risk`
- `GET /v1/simulations/{id}/plan`, `POST /v1/simulations/{id}/counterfactual`, `GET /v1/simulations/{id}/comparison`
- `POST /v1/simulations/monte-carlo`, `POST /v1/simulations/{id}/execute-plan`

### Approvals & Emergency Controls
- `GET /v1/approvals`, `GET /v1/approvals/{id}`, `POST /v1/approvals/{id}/approve`, `POST /v1/approvals/{id}/reject`
- `POST /v1/agents/{id}/pause`, `POST /v1/agents/{id}/resume`
- `POST /v1/organizations/{id}/pause`, `POST /v1/organizations/{id}/resume`
- `POST /v1/system/pause`, `POST /v1/system/resume`, `GET /v1/system/status`

### Treasury & Liquidity Orchestrator
- `GET /v1/treasury/summary`, `GET /api/treasury/summary`
- `GET /v1/treasury/state`, `GET /api/treasury/state`
- `GET /v1/treasury/balance`, `GET /api/treasury/balance`
- `GET /v1/treasury/reservations`, `POST /v1/treasury/reservations`, `POST /v1/treasury/reservations/{id}/release`
- `GET /v1/treasury/commitments`, `POST /v1/treasury/commitments`
- `GET /v1/treasury/exposure`, `GET /v1/treasury/forecast`, `POST /v1/treasury/stress`
- `GET /v1/treasury/reconciliation`, `GET /v1/treasury/anomalies`, `GET /v1/treasury/health`
- `GET /v1/treasury/inflows`, `POST /v1/treasury/inflows`

### Webhooks & Events
- `POST /v1/webhooks`, `GET /v1/webhooks`, `GET /v1/webhooks/{id}`, `PATCH /v1/webhooks/{id}`, `DELETE /v1/webhooks/{id}`
- `GET /v1/webhooks/{id}/deliveries`, `POST /v1/webhooks/{id}/test`
- `GET /v1/events`, `GET /v1/events/{id}`

### Open Agent Network (A2A Protocol)
- `POST /v1/agent-network/agents/register`, `GET /v1/agent-network/agents`, `GET /v1/agent-network/agents/{id}`
- `POST /v1/agent-network/agents/{id}/manifest`, `POST /v1/agent-network/agents/{id}/suspend`
- `GET /v1/agent-network/capabilities`, `POST /v1/agent-network/routing/plan`
- `POST /v1/agent-network/contracts`, `GET /v1/agent-network/contracts`, `GET /v1/agent-network/contracts/{id}`
- `POST /v1/agent-network/contracts/{id}/accept`, `POST /v1/agent-network/contracts/{id}/fund`
- `POST /v1/agent-network/contracts/{id}/delegate`, `POST /v1/agent-network/contracts/{id}/verify`
- `POST /v1/agent-network/contracts/{id}/disputes`, `GET /v1/agent-network/disputes`, `POST /v1/agent-network/disputes/{id}/resolve`
- `GET /v1/agent-network/graph`, `GET /v1/agent-network/trust/{id}`

### Economic Clearinghouse
- Obligations: `POST/GET /v1/economy/obligations`, `GET/POST /v1/economy/obligations/{id}`, `POST /v1/economy/obligations/{id}/cancel`
- Invoices: `POST/GET /v1/economy/invoices`, `GET/POST /v1/economy/invoices/{id}`, `POST /v1/economy/invoices/{id}/accept`, `POST /v1/economy/invoices/{id}/dispute`
- Escrows: `POST/GET /v1/economy/escrows`, `GET/POST /v1/economy/escrows/{id}`, `POST /v1/economy/escrows/{id}/release`, `POST /v1/economy/escrows/{id}/refund`
- Milestones: `POST/GET /v1/economy/milestones`, `POST /v1/economy/milestones/{id}/submit`, `POST /v1/economy/milestones/{id}/verify`, `POST /v1/economy/milestones/{id}/settle`
- Netting: `POST/GET /v1/economy/netting/proposals`, `POST /v1/economy/netting/{id}/approve`, `POST /v1/economy/netting/{id}/execute`, `POST /api/economy/netting/simulate`
- Batches: `POST/GET /v1/economy/batches`, `GET/POST /v1/economy/batches/{id}/execute`
- Refunds: `POST/GET /v1/economy/refunds`, `POST /v1/economy/refunds/{id}/approve`, `POST /v1/economy/refunds/{id}/execute`
- Reconciliation: `GET /v1/economy/reconciliation`, `POST /v1/economy/reconciliation/{id}`
- Exposure & Health: `GET /v1/economy/exposure`, `GET /v1/economy/health`, `GET /v1/economy/clearing/ledger`
- Flagship Sim: `POST/GET /v1/economy/clearing/simulate`, `POST /v1/economy/clearing/reset`

### Autonomous Control Tower APIs
- `GET /v1/control/overview`, `GET /api/control/overview`
- `GET /v1/control/state`, `GET /api/control/state`
- `GET /v1/control/activity`, `GET /api/control/activity`
- `GET /v1/control/financial-trace/{id}`, `GET /api/control/financial-trace/{id}`
- `GET /v1/control/missions/{id}`, `GET /api/control/missions/{id}`
- `GET /v1/control/security`, `GET /api/control/security`
- `GET /v1/control/treasury`, `GET /api/control/treasury`
- `GET /v1/control/arc`, `GET /api/control/arc`
- `GET /v1/control/incidents`, `GET /api/control/incidents`
- `GET /v1/control/intelligence`, `GET /api/control/intelligence`
- `GET /v1/control/search`, `GET /api/control/search`

### Durable Runtime & Operations OS
- Workflows: `POST/GET /v1/runtime/workflows`, `POST .../pause`, `POST .../resume`, `POST .../cancel`, `POST .../retry`, `GET .../steps`, `GET .../checkpoints`
- Workers & Queues: `GET /v1/runtime/workers`, `GET /v1/runtime/queues`, `GET /v1/runtime/recovery`
- Incidents: `GET /v1/runtime/incidents`, `POST /v1/runtime/incidents/{id}/reconcile`, `GET /v1/runtime/metrics`
- Operations OS: `GET /v1/operations`, `GET /v1/operations/health`, `GET /v1/operations/snapshot`, `GET /v1/operations/topology`, `GET /v1/operations/timeline`, `GET /v1/operations/graph`, `GET /v1/operations/replay/{id}`, `GET /v1/operations/why/{id}`

### Economic Fabric & Autonomous Protocol
- Objectives: `POST/GET /v1/fabric/objectives`, `POST .../plan`, `POST .../simulate`, `POST .../start`, `POST .../pause`, `POST .../resume`, `POST .../replan`, `POST .../cancel`, `GET .../trace`, `GET .../why`, `GET .../why-not`, `DELETE .../{id}`
- Fabric Metrics: `GET /v1/fabric/metrics`
- Demo: `POST /v1/fabric/demo/run`, `POST /v1/fabric/demo/reset`
- Protocol v1: `POST /protocol/v1/messages`, `GET/POST /protocol/v1/agents`, `GET/POST /protocol/v1/capabilities`, `POST /protocol/v1/requests`, `POST /protocol/v1/quotes`, `POST /protocol/v1/negotiate`, `GET/POST /protocol/v1/contracts`, `POST /protocol/v1/results`, `POST /protocol/v1/payments`, `POST /protocol/v1/heartbeat`, `POST /protocol/v1/simulate`, `POST /protocol/v1/precheck`, `GET /protocol/v1/traffic`, `GET /protocol/v1/security`, `GET /protocol/v1/snapshot`

### Mission Replay Engine
- `GET /api/demo/mission`, `POST /api/demo/mission/reset`, `POST /api/demo/mission/start`, `POST /api/demo/mission/pause`, `POST /api/demo/mission/step`, `GET /api/demo/mission/events`, `GET /api/demo/mission/trace`, `GET /api/demo/mission/export`

---

## 4. UI Route Inventory (`apps/web/src/app`)

| Route | Title / View | Primary Data Sources |
| :--- | :--- | :--- |
| `/control` | Executive Control Tower | `/api/control/overview`, `/api/control/state`, `/api/control/activity` |
| `/control/protocol` | Protocol Control View | Protocol gateway snapshot & traffic telemetry |
| `/control/security` | Security Invariant Guard | Security lab report, active invariants |
| `/missions` | Mission Command Center | `/v1/missions`, Mission DAG state |
| `/missions/demo/replay` | Flagship Mission Replay | Canonical 22-step replay engine, AI advisory traces |
| `/activity` | System Audit & Activity Feed | Real-time event log, financial flight recorder |
| `/marketplace` | Autonomous Agent Marketplace | `/api/marketplace/listings`, Provider discovery & quotes |
| `/network` | Agent-to-Agent Network Graph | `/v1/agent-network/graph`, Trust topology |
| `/economy` | Economic Clearinghouse | Obligations, escrows, invoices, multilateral netting |
| `/treasury` | Autonomous Treasury Orchestrator | Liquidity reservations, commitments, forecasts, stress |
| `/simulator` | Digital Twin & Monte Carlo | Counterfactual simulations, parameter sweeps |
| `/security` | Operational Security Invariants | INV-01 through INV-80 live audit |
| `/security-lab` | Adversarial Security Lab | Attack suites, threat vector mitigations |
| `/arc` | Arc Settlement Architecture | Live RPC telemetry (Chain 5042), bytecode verification |
| `/objectives` | Economic Objectives Registry | Autonomous objective compilation, replanning traces |
| `/protocol` | Agent Protocol v1 Console | Canonical envelope inspector, rate limiting |
| `/runtime` | Durable Workflow Runtime | Leased workers, step checkpoints, idempotency |
| `/operations` | Autonomous Operations OS | System topology, incident mitigation, supervisor |
| `/incidents` | Incident Response & Mitigation | Automated circuit breaker trips & operator actions |
| `/intelligence` | Agent Intelligence Layer | Performance rankings, anomaly flags, recommendations |
| `/approvals` | Operator Approval Queue | Human-in-the-loop multi-signature authorization |
| `/transactions` | Transaction Ledger | Verified settlement logs (0 live in sim mode) |
| `/payment-intents` | Payment Intent Monitor | TTL tracking, cryptographic commitments |
| `/developers` | Developer Platform & SDKs | Quickstart guides, API key generator |
| `/developers/quickstart` | Integration Quickstart | Code samples for TS/Python SDKs |
| `/settings` | System Configuration | Environment inspection, tenant metadata |
| `/trace` | Financial Flight Recorder | End-to-end causality traces by correlation ID |
| `/swarms` | Multi-Agent Swarm Orchestration | Directed acyclic swarm graphs, budget allocations |

---

## 5. Security Gates & Feature Flags

| Flag / Gate | Value in Sim | Authority Impact |
| :--- | :--- | :--- |
| `ENABLE_LIVE_EXECUTION` | `false` | **HARD GATE**: Prevents any on-chain transaction signing or broadcasting. |
| `AGENT_AUTO_EXECUTION` | `false` | Disables unattended automated funds transfer. |
| `STORAGE_MODE` | `memory` (dev) / `postgres` | In production mode, memory storage fails fast (`ErrMemoryStorageForbiddenInProduction`). |
| `SIGNER_BACKEND` | `local` | Evaluated only when `ENABLE_LIVE_EXECUTION=true`. |
| `AGENTVAULT_ADDRESS` | `0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852` | Bytecode verified as `0x` (undeployed) on Arc Mainnet. |
| `ARC_RPC_URL` | `https://rpc.mainnet.arc.io` | Live RPC probe for network health only. |
