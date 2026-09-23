# AgentPay

Programmable financial control plane and autonomous economic operating system for AI agents, featuring deterministic policy controls and native USDC settlement on Arc.

---

## The Adaptive Autonomous Economic Control Plane

AgentPay is the control center for an autonomous AI economy: **"AI Requests → AgentPay Controls → Arc Settles."**

**AgentPay doesn't simply execute payments.**  
**It observes economic outcomes and helps autonomous agents adapt while keeping financial authorization deterministic.**

### The Adaptive Autonomous Mission Loop
```
PLAN → DISCOVER → QUOTE → SELECT → AUTHORIZE → EXECUTE → OBSERVE → EVALUATE → LEARN → REPLAN → CONTINUE
```

When an autonomous mission encounters a service timeout, price spike, or counterparty degradation:
```
SERVICE FAILED → ANALYZING → 3 ALTERNATIVES → COMPARING → ALTERNATIVE SELECTED → POLICY → PAYMENT → CONTINUE
```

### Core Security Principle
> **The agent can change its plan.**  
> **The agent cannot change the financial rules.**
> 
> The intelligence layer observes empirical outcomes and recommends optimal adaptations. Every proposed financial disbursement must strictly re-enter the canonical `PaymentIntent → Policy → Risk → Approval → Treasury → Signer → AgentVault → Arc` pipeline. AI agents never hold private keys or receive spending elevation.

Autonomous AI agents can plan, reason, and execute complex workflows, but giving them direct access to crypto private keys presents catastrophic financial risk. A single software bug, hallucination, or adversarial prompt injection can instantly drain a funded wallet.

Agents need economic agency to pay for data, compute, and third-party APIs. Existing solutions either:
1. Hand the agent an unconstrained private key (unsafe).
2. Require manual human intervention for every micro-transaction (destroys autonomy).

**AgentPay solves this by decoupling agent reasoning from financial settlement.** The agent requests payment intents; AgentPay enforces deterministic policies off-chain and smart contract limits on Arc before signing or broadcasting transactions.

---

## Multi-Agent Swarm Orchestration Layer (Phase 30)

AgentPay supports coordinated collectives of specialized agents working together toward root objectives under **zero-authority economic guarantees**:

```
                    ROOT MISSION
                         │
                         ▼
                 ORCHESTRATOR AGENT
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   RESEARCH AGENT   DATA AGENT      ANALYST AGENT
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                   VERIFIER AGENT
                         │
                         ▼
                    CRITIC AGENT
                         │
                         ▼
                  SYNTHESIZER AGENT
                         │
                         ▼
                 FINAL DELIVERABLE
```

### Key Capabilities
1. **DAG Cycle Prevention:** Kahn's topological sort rejects circular subcontracts.
2. **Bounded Hierarchy:** Maximum DAG depth of 4, maximum 20 tasks, and bounded 4-worker concurrency.
3. **Atomic Budget Reservations:** Concurrency-safe reservation pool ensures parallel tasks can never overrun the swarm budget ceiling.
4. **Cryptographic Output Chaining:** Intermediate outputs are sealed with SHA-256 checksums to prevent tamper.
5. **Anti-Collusion Consensus:** Deliverables require quorum verification by independent verifiers before payment authorization.
6. **Zero Elevation Security (INV-S1):** Swarm and orchestrator agents have zero private keys and zero direct vault access.

---

## Economic Simulator & Digital Twin (Pre-Execution Determinism)

Autonomous AI agents cannot operate safely in commercial environments if they must risk live financial capital simply to test workflows, estimate costs, or discover edge-case failures. The **AgentPay Economic Simulator & Digital Twin** answers:

> **"What will happen if this autonomous mission runs?"**

It models execution using the **exact same decision logic as live production** (Rust policy engine, risk scoring, economic selection, Kahn DAG validation, and multi-currency budget accounting), but operates with **zero real financial authority**.

```
                   LIVE PRODUCTION REALITY (T0)
                                │
                                ▼
                DIGITAL TWIN SNAPSHOT GENERATOR
            (Immutable in-memory clone & SHA-256 fingerprint)
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
   SIMULATION ENGINE                              COUNTERFACTUALS &
 (Kahn DAG Swarm Scheduling,                        MONTE CARLO
 Seeded Failure Injection)                      (N=1000 Tail Risk & P95)
        │                                               │
        └───────────────────────┬───────────────────────┘
                                ▼
                   WORST-CASE EXPOSURE AUDIT
                                │
                                ▼
                   SAFE LIVE EXECUTION GATE
             (Pre-flight Staleness & Fingerprint Check)
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
         [FINGERPRINT DRIFT /           [VERIFIED & FRESH]
            TTL EXPIRED]                        │
                │                               ▼
     "SIMULATION OUTDATED" (409)     LIVE PAYMENT INTENT (200)
```

### Key Capabilities
1. **Zero Financial Authority (INV-SIM-1 to INV-SIM-5):** No real on-chain transactions, no vault state mutations, no real liquidity locks, and zero live webhooks. Mock hashes use the `sim_tx_` prefix.
2. **Digital Twin Isolation (INV-SIM-7):** In-memory deep cloning creates an isolated cryptographic sandbox with SHA-256 fingerprinting.
3. **Deterministic Failure Injection (10 Modes):** Latency spikes, upstream HTTP 500s, rate limits, balance exhaustion, gas surges, network partitions, and security circuit breakers.
4. **Policy What-If & Counterfactuals:** Side-by-side delta comparisons testing perturbations (e.g. $2.5\times$ surge pricing or strict velocity limits).
5. **Monte Carlo Stochastic Engine:** Runs $N=1,000+$ iterations with reproducible seeds to estimate median P50, P90, and P95 worst-case exposure.
6. **Safe "Execute This Plan" Transition (INV-SIM-9 & INV-SIM-15):** The `ExecutionGate` asserts fresh reality matches snapshot assumptions. Stale or expired plans trigger `SIMULATION OUTDATED` and fail closed.

Mission Control Simulator is live at **`http://localhost:3000/simulator`**.

---

## How It Works

```
                HUMAN (Policy Owner)
                  ↓
             ORGANIZATION (Multi-Tenant Tenant Boundary)
                  ↓
                AGENT (Untrusted Autonomous Actor)
                  ↓
             SERVICE (Pre-registered External API)
                  ↓
          PAYMENT INTENT (Structured Economic Request)
                  ↓
          POLICY + RISK (Deterministic Rust Policy Engine)
                  ↓
              APPROVAL (Human-in-the-loop if Required)
                  ↓
              TREASURY (Vault Liquidity Reservation)
                  ↓
          EXECUTION GATE (10-Point Pre-flight Safety Matrix)
                  ↓
             AGENTVAULT (On-chain Solidity Contract)
                  ↓
                 ARC (Native USDC Settlement Layer)
                  ↓
             VERIFICATION (Receipt & Event Confirmation)
                  ↓
          AUDIT / EVENTS (Immutable Audit Log)
                  ↓
              WEBHOOKS (Cryptographically Signed Callbacks)
                  ↓
             AGENT / APP (Task Resumption & Completion)
```

---

## Core Flow

1. **Agent** discovers a trusted service and requests an economic action.
2. **Payment Intent** is generated; destination address is resolved server-side from the registry (neutralizing prompt injection).
3. **Policy Engine** evaluates the intent deterministically in Rust in sub-millisecond time.
4. **Risk Scoring** calculates explainable risk levels without LLM nondeterminism.
5. **Approval** triggers automatically if transaction exceeds approval thresholds; hard denials can never be approved.
6. **Treasury** atomically reserves vault liquidity with concurrency synchronization.
7. **Execution Gate** enforces the 10-point pre-flight checklist.
8. **Arc Settles** the transaction in native USDC via `AgentVault.sol`.
9. **Audit & Events** record immutable proof and dispatch HMAC-signed webhooks.

---

## Quickstart

Run the complete stack locally using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/mahitss/Arc_micro.git
cd Arc_micro

# Configure environment
cp .env.example .env

# Start Gateway, Policy Engine, Database & Web Dashboard
docker-compose up -d

# Verify system readiness
curl http://localhost:8080/ready
```

Dashboard is live at **`http://localhost:3000`**.

---

## Example: Requesting a Payment Intent

### cURL
```bash
curl -X POST http://localhost:8080/v1/payment-intents \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: req_search_101" \
  -d '{
    "agent_id": "research-agent",
    "service": "web-research",
    "amount": "180000",
    "asset": "USDC",
    "purpose": "Query AI compute benchmarks"
  }'
```

### TypeScript SDK
```typescript
import { AgentPay } from '@agentpay/sdk';

const agentpay = new AgentPay({ apiKey: process.env.AGENTPAY_API_KEY });

const intent = await agentpay.paymentIntents.create({
  service: 'web-research',
  amount: '180000', // $0.18 USDC
  asset: 'USDC',
  purpose: 'Query AI compute benchmarks'
});
```

---

## Why Arc

AgentPay uses Arc (Chain ID `5042`) as its authoritative on-chain settlement anchor:
- **USDC-Native Settlement:** Settles agent microtransactions in native USDC (`0x3600000000000000000000000000000000000000`), eliminating exchange volatility and automated token swaps.
- **Programmable AgentVaults:** Smart contract enforces on-chain daily budget caps and emergency pauses directly in EVM bytecode.
- **Verifiable Auditability:** Transactions emit on-chain `PaymentExecuted` events queryable on Arc Explorer (`https://explorer.arc.io`).
- **Microtransaction Economics:** Predictable, low transaction fees make sub-dollar agent API payments commercially viable.

For full details, see [`docs/arc-integration.md`](docs/arc-integration.md).

---

## The Agent-to-Agent (A2A) Economic Network

Beyond calling static APIs, AgentPay empowers AI agents to form a **Directed Economic Network (DAG)** where agents discover, negotiate, hire, and pay peer agents while AgentPay strictly authorizes money.

### Core Principles
- **The AI may reason. The AI may negotiate. AgentPay authorizes money.**
- **Zero Private Keys:** No peer agent receives a private key or directly invokes the smart contract.
- **Server-Resolved Recipient Binding:** Disbursements route strictly to the address authoritatively bound to the service registry.
- **Bounded Recursive Depth:** Inter-agent hiring trees cannot exceed `MAX_AGENT_CALL_DEPTH = 3`. Calls at depth 4 fail closed.
- **Structured Negotiation Engine:** Counter-offers are bounded between $[ \text{BasePrice}, \text{MaxPrice} ]$ and terminate in $\le 3$ rounds.
- **Untrusted Result Integrity:** Peer outputs are hashed (SHA-256) and scanned for adversarial prompt injection. Financial parameters remain immutable.
- **Interactive DAG Network Visualizer:** Queryable via `GET /v1/missions/{id}/economic-graph` and live at `http://localhost:3000/network`.

### A2A CLI Quickstart
```bash
# 1. Discover available peer agents
agentpay agents discover --capability data_extraction

# 2. Request a formal binding quote
agentpay quotes request data-processing --buyer agent_coordinator_01 --price 450000

# 3. Propose a counter-offer
agentpay quotes counter <quote_id> --agent agent_coordinator_01 --price 480000

# 4. Accept finalized quote
agentpay quotes accept <quote_id>

# 5. Form hire agreement & execute policy-governed Arc payment
agentpay hires create --buyer agent_coordinator_01 --quote <quote_id> --mission demo-01 --expected dataset
agentpay hires pay <hire_id>

# 6. View the mission's directed economic network DAG
agentpay missions graph demo-01
```

For complete architectural details, see [`docs/agent-to-agent-architecture.md`](docs/agent-to-agent-architecture.md).

---

## Security Model: AI Never Controls Keys

1. **Zero Key Custody:** Autonomous agents never receive private keys or signing capabilities.
2. **Server-Side Recipient Resolution:** Recipients are resolved strictly from the authoritative Service Registry, preventing adversarial prompt injection from redirecting funds.
3. **Hard Denial Inviolability:** A policy `DENY` from the Rust engine can **never** be overridden by human approval.
4. **Agent Self-Approval Prohibited:** Agents cannot approve their own payment requests.
5. **Multi-Tier Kill Switches:** Instant pause available at the Agent, Organization, Global, and Smart Contract levels.
6. **Ambiguous Transaction Recovery:** Confirmation timeouts are held in `AMBIGUOUS` state with receipt reconciliation, preventing double-spend broadcasts.

For complete threat modeling, see [`docs/threat-model-v3.md`](docs/threat-model-v3.md) and [`docs/financial-invariants.md`](docs/financial-invariants.md).

---

## Demo: Autonomous Research Agent

An interactive demonstration is available at **`http://localhost:3000/demo`**:
- Simulates an autonomous agent completing a market research task.
- Demonstrates real-time service discovery, 15-minute price quotes, deterministic policy evaluation, human approval, on-chain Arc settlement, and webhook dispatching.
- Explicitly distinguishes **DEMO / SIMULATION MODE** from **LIVE MAINNET**.

---

## Open Agent Network Layer (Phases 34–39)

AgentPay features a decentralized, zero-trust **Open Agent Network (OAN)** based on RFC 002:

```
               REQUESTER AGENT
                      │
           1. Discovery (OAN Registry)
                      ▼
            TRUST EVALUATION ENGINE
       (Deterministic Bayesian Scoring)
                      │
           2. Bilateral Contract Proposal
                      ▼
               PROVIDER AGENT
                      │
           3. Bounded Delegation (Depth ≤ 3)
                      ▼
            SUBCONTRACTOR AGENT
                      │
           4. Deliverable (SHA-256 Checksum)
                      ▼
               RESULT VERIFIER
                      │
           5. Settlement via PaymentBridge
                      ▼
              ARC USDC ON-CHAIN VAULT
```

- **Standards-Compliant:** Manifest discovery (`POST /v1/agent-network/agents/register`), dynamic routing plans, bilateral contracts, deliverable verification, and dispute resolution.
- **Deterministic Trust Scoring:** 0 to 10,000 basis points calculated over completion, deliverable verification, pricing accuracy, and dispute records.
- **Bounded Delegation:** Strictly enforces Max Depth = 3 and directed acyclic graph anti-cycle invariants.
- **Zero-Authority Invariant:** Network peer agents never hold cryptographic authority or modify vault balances.

---

### Documentation & Specifications

- **Open Agent Network RFC 002:** [`docs/agent-network-rfc.md`](docs/agent-network-rfc.md)
- **Agent Manifest Specification:** [`docs/agent-manifest-spec.md`](docs/agent-manifest-spec.md)
- **Trust Scoring Mathematics:** [`docs/trust-scoring-math.md`](docs/trust-scoring-math.md)
- **Agent Contract Lifecycle State Machine:** [`docs/agent-contract-lifecycle.md`](docs/agent-contract-lifecycle.md)
- **Economic Simulator Architecture:** [`docs/economic-simulator-architecture.md`](docs/economic-simulator-architecture.md)
- **Economic Simulation Specification:** [`docs/economic-simulation.md`](docs/economic-simulation.md)
- **Digital Twin Snapshot System:** [`docs/digital-twin.md`](docs/digital-twin.md)
- **Counterfactuals & Policy What-If:** [`docs/counterfactuals.md`](docs/counterfactuals.md)
- **Simulation Security (INV-SIM-1 to INV-SIM-15):** [`docs/simulation-security.md`](docs/simulation-security.md)
- **Simulation Execution & Staleness Gate:** [`docs/simulation-execution.md`](docs/simulation-execution.md)
- **Canonical Demo Scenarios Walkthrough:** [`docs/simulation-demo.md`](docs/simulation-demo.md)
- **Simulation Implementation Report (Phases 0–33):** [`docs/simulation-implementation-report.md`](docs/simulation-implementation-report.md)
- **Multi-Agent Swarm Architecture:** [`docs/swarm-orchestration-architecture.md`](docs/swarm-orchestration-architecture.md)
- **Swarm Security Boundaries (INV-S1 to INV-S8):** [`docs/swarm-security-boundaries.md`](docs/swarm-security-boundaries.md)
- **Swarm Economic Model & Reservations:** [`docs/swarm-economic-model.md`](docs/swarm-economic-model.md)
- **Swarm DAG Validation & Kahn's Algorithm:** [`docs/swarm-dag-validation.md`](docs/swarm-dag-validation.md)
- **Swarm Role Matrix & Matchmaking:** [`docs/swarm-role-matrix.md`](docs/swarm-role-matrix.md)
- **Swarm Adversarial Scenarios (20 Tests):** [`docs/swarm-adversarial-scenarios.md`](docs/swarm-adversarial-scenarios.md)
- **Swarm API & SDK Reference:** [`docs/swarm-api-reference.md`](docs/swarm-api-reference.md)
- **Swarm Implementation Report:** [`docs/swarm-implementation-report.md`](docs/swarm-implementation-report.md)
- **Mission Control UI Architecture:** [`docs/mission-control-ui-architecture.md`](docs/mission-control-ui-architecture.md)
- **Mission Control User Guide:** [`docs/mission-control-user-guide.md`](docs/mission-control-user-guide.md)
- **Mission Control 90-Second Demo:** [`docs/mission-control-demo.md`](docs/mission-control-demo.md)
- **Mission Control Implementation Report:** [`docs/mission-control-implementation-report.md`](docs/mission-control-implementation-report.md)
- **Autonomous Economy Engine Architecture:** [`docs/autonomous-economy-architecture.md`](docs/autonomous-economy-architecture.md)
- **Final Architecture:** [`docs/final-architecture.md`](docs/final-architecture.md)
- **Financial Invariants (16 Formal Invariants):** [`docs/financial-invariants.md`](docs/financial-invariants.md)
- **Production Readiness Matrix (21 Domains):** [`docs/production-readiness-matrix.md`](docs/production-readiness-matrix.md)
- **Day 9 Security & Reliability Audit:** [`docs/day-9-production-readiness-report.md`](docs/day-9-production-readiness-report.md)
- **Arc Mainnet Evidence & Status:** [`docs/arc-mainnet-evidence.md`](docs/arc-mainnet-evidence.md)
- **Mainnet Operations Runbook:** [`docs/mainnet-operations-runbook.md`](docs/mainnet-operations-runbook.md)
- **Incident Response Runbook:** [`docs/incident-response.md`](docs/incident-response.md)
- **Final Release Manifest:** [`docs/release-manifest.md`](docs/release-manifest.md)
- **Reviewer Quickstart (5 Minutes):** [`docs/reviewer-quickstart.md`](docs/reviewer-quickstart.md)
- **Arc Microgrant Submission Package:** [`docs/submission.md`](docs/submission.md)
- **Threat Model v3:** [`docs/threat-model-v3.md`](docs/threat-model-v3.md)
- **Demo Video Script:** [`docs/demo-script.md`](docs/demo-script.md)

---

## Development & Test Commands

```bash
# Run all Go Gateway and Security Invariant Tests
cd services/gateway && go test -count=1 ./...

# Run Rust Policy Engine Tests
cd services/policy-engine && cargo test

# Run Rust Criterion Policy Engine Benchmarks
cd services/policy-engine && cargo bench

# Run Foundry Solidity Smart Contract Tests & Fuzzing
cd contracts && forge test

# Run TypeScript SDK Tests
cd packages/sdk-typescript && npm test

# Run Python SDK Tests
cd packages/sdk-python && pytest

# Run Developer CLI Tests
cd packages/cli && npm test

# Run Web Tests & Build Next.js Dashboard
cd apps/web && npm test && npm run build
```
