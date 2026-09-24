# AgentPay: The Financial Control Plane for Autonomous Economies

**AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.**

AgentPay lets autonomous agents discover services, negotiate work, coordinate missions, manage budgets, recover from failures, and execute authorized economic actions while deterministic policy and financial controls remain outside the agent's authority.

---

## The Autonomous Economic Fabric

AgentPay operates as one unified autonomous economic fabric:

> **THE SYSTEM MAY AUTONOMOUSLY CHANGE WHAT IT DOES.**  
> **IT MAY NOT AUTONOMOUSLY CHANGE WHAT IT IS ALLOWED TO DO.**

### The Complete Autonomous Economic Loop
```
OBJECTIVE → UNDERSTAND → PLAN → SIMULATE → ALLOCATE → EXECUTE → OBSERVE → RECOVER → REPLAN → SETTLE → LEARN → CONTINUE
```

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

### Simulator Quickstart (TypeScript SDK)
```typescript
import { AgentPay } from '@agentpay/sdk';

const agentpay = new AgentPay({ apiKey: process.env.AGENTPAY_API_KEY });

// 1. Run deterministic pre-flight scenario simulation
const sim = await agentpay.simulations.create({
  scenario_name: 'swarm_data_pipeline',
  execution_mode: 'SIMULATION',
  nodes: [
    { step_id: 'fetch', agent_id: 'agent_lead', capability: 'data_extract', max_budget: '1500000' },
    { step_id: 'index', agent_id: 'agent_worker', capability: 'code_index', dependencies: ['fetch'] }
  ]
});
console.log(`Simulated Cost: ${sim.projected_economics.total_spend}, Exposure: ${sim.projected_economics.worst_case_exposure}`);

// 2. Run counterfactual policy comparison
const comparison = await agentpay.simulations.counterfactual({
  baseline_scenario_id: sim.id,
  perturbations: [{ parameter: 'daily_limit', new_value: '50000000' }]
});
```

---

## Autonomous Sovereign Economic Constitution

The **Autonomous Sovereign Economic Constitution** establishes immutable, mathematically verified governance boundaries for all economic activities across agents, swarms, and human operators.

```
                    SOVEREIGN ROOT INVARIANTS (Level 1)
                     (Global Hard Deny, Arc USDC Only)
                                    │
                                    ▼
                     ORGANIZATION ENVELOPE (Level 2)
                   (Treasury Cap, Velocity, Multi-Sig)
                                    │
                                    ▼
                    SWARM & MISSION ALLOCATION (Level 3)
                   (Swarm Budgets, Kahn DAG Concurrency)
                                    │
                                    ▼
                    AGENT DELEGATED LEAF (Level 4)
                  (Subcontracting Depth ≤ 2, Hops ≤ 50%)
```

### Key Capabilities
1. **Monotonic Authority Inheritance:** Authority flows strictly downward. Subordinates may add restrictions; they can never expand parent limits.
2. **Authority Delta Engine:** Evaluates policy candidates across 5 dimensions and classifies changes into `MORE_RESTRICTIVE`, `UNCHANGED`, or `MORE_PERMISSIVE`.
3. **Compare-And-Swap (CAS) Atomic Activation:** Revisions activate atomically without downtime; rollback to any historical version is supported in sub-second time.
4. **Cryptographic Flight Recorder:** Every policy evaluation produces a verifiable evaluation hash anchored to the SHA-256 digest of the active constitution.
5. **Zero Private Key Access:** Agents evaluate transactions against the constitution keylessly; private keys remain secured in production HSM enclaves.

Mission Control Constitution Interface is live at **`http://localhost:3000/constitution`**.

---

## Autonomous Economic Clearinghouse (Task 10)

The **Autonomous Economic Clearinghouse** coordinates peer-to-peer deferred obligations, milestone-based performance escrows, deliverable-verified invoices, and multilateral netting between autonomous agents under **zero-authority economic guarantees**:

> **"The clearinghouse coordinates value. The existing financial control plane authorizes value. Arc settles value."**

```
                  AI AGENTS PROPOSE & COORDINATE
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│               AUTONOMOUS ECONOMIC CLEARINGHOUSE               │
│  - Deferred Obligations (IMMEDIATE, MILESTONE, RECURRING)     │
│  - Cryptographic Escrows (Policy Spending Reservations)       │
│  - Deliverable Hash Verification (SHA-256 Checksums)          │
│  - Bilateral & Multilateral Netting (Cycle Compression)       │
│  - Double-Entry Continuous Audit & Reconciliation Ledger     │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│               EXISTING FINANCIAL CONTROL PLANE                │
│  - PaymentIntents                                             │
│  - Rust Deterministic Policy Engine                           │
│  - Risk Engine & Velocity Counters                            │
│  - Treasury & Multi-Sig Approvals                             │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                    EXECUTION & SETTLEMENT                     │
│  - Go Execution Gateway                                       │
│  - AgentVault Keyless Smart Contract                          │
│  - Arc L1/L2 Finality (USDC Settlement)                       │
└───────────────────────────────────────────────────────────────┘
```

### Key Capabilities
1. **Strict Zero-Authority (INV-55 to INV-70):** The clearinghouse has zero private keys, zero autonomous balance movements, and zero treasury overrides. All value settlement routes through the canonical `intent.Service` pipeline.
2. **Deliverable-Backed Milestones:** Milestones and performance escrows are locked to expected deliverable SHA-256 hashes, preventing payment release until deliverables are cryptographically verified.
3. **Bilateral & Multilateral Netting:** Resolves circular agent obligations into minimal net transfers, saving up to 80%+ liquidity and slashing on-chain gas costs.
4. **Real-Time Economic Exposure Ceilings:** Automatically blocks runaway agent contract commitments before they exceed organizational risk limits.
5. **Continuous Blockchain Reconciliation:** Machine-checks internal ledger double-entry credits and debits against Arc `AgentVault` transaction receipts, flagging any off-by-one or dropped event.
6. **Physical Mode Separation:** `REAL` and `SIMULATION` economic entities and batches are strictly isolated.

Mission Control Clearinghouse is live at **`http://localhost:3000/economy/clearing`**.

### Clearinghouse Quickstart (TypeScript SDK)
```typescript
import { AgentPayClient } from '@agentpay/sdk';

const client = new AgentPayClient({ apiKey: process.env.AGENTPAY_API_KEY });

// 1. Propose milestone-backed economic obligation
const obligation = await client.clearinghouse.proposeObligation({
  payerAgentId: 'agent_orchestrator',
  payeeAgentId: 'agent_analyst',
  amountBase: '10000000', // $10.00 USDC
  asset: 'USDC',
  type: 'MILESTONE_CONTINGENT',
  mode: 'REAL',
});

// 2. Lock deliverable escrow reservation
const escrow = await client.clearinghouse.createEscrow({
  obligationId: obligation.id,
  amountBase: '10000000',
  payerAgentId: 'agent_orchestrator',
  payeeAgentId: 'agent_analyst',
  mode: 'REAL',
  timeoutSeconds: 86400,
});

// 3. Settle milestone with deliverable verification
const intent = await client.clearinghouse.settleMilestone(milestoneId, {
  deliverableHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
});
```

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
- **Economic Constitution Reference:** [`docs/economic-constitution.md`](docs/economic-constitution.md)
- **Autonomous Treasury & Liquidity Orchestrator Architecture:** [`docs/autonomous-treasury-architecture.md`](docs/autonomous-treasury-architecture.md)
- **Hierarchical Liquidity & Multi-Tier Balance Model:** [`docs/liquidity-model.md`](docs/liquidity-model.md)
- **Liquidity Reservations & Atomic Lifecycle:** [`docs/liquidity-reservations.md`](docs/liquidity-reservations.md)
- **Multi-Horizon Liquidity Forecasting Engine:** [`docs/liquidity-forecasting.md`](docs/liquidity-forecasting.md)
- **Digital Twin Liquidity Stress Testing Lab:** [`docs/liquidity-stress-testing.md`](docs/liquidity-stress-testing.md)
- **Continuous 4-Way Treasury Reconciliation Engine:** [`docs/treasury-reconciliation.md`](docs/treasury-reconciliation.md)
- **Treasury Security & Invariant Proofs (INV-71 to INV-85):** [`docs/treasury-security.md`](docs/treasury-security.md)
- **Treasury Threat Model & Adversarial Analysis:** [`docs/treasury-threat-model.md`](docs/treasury-threat-model.md)
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

## Autonomous Treasury & Liquidity Orchestrator (Task 11)

AgentPay features an autonomous liquidity governor ensuring that AI swarms never overcommit on-chain float:
> **"TREASURY INTELLIGENCE CAN PLAN. TREASURY CONTROLS CAN CONSTRAIN. ONLY THE EXISTING EXECUTION PIPELINE CAN MOVE MONEY."**

### Core Capabilities
- **Hierarchical Balance Model**: Distinctly separates On-Chain Capital, Available Unencumbered, Active Reservations, Soft/Hard Commitments, and Minimum Safety Buffer Floor (`INV-71` & `INV-72`).
- **Atomic Concurrency-Guarded Reservations**: Off-chain cryptographic pre-encumbrance ensuring 0-oversubscription across 50+ concurrent goroutines (`INV-75`).
- **Stale Reservation Reclaim**: Automated background garbage collection reclaiming expired headroom (`INV-76`).
- **Multi-Horizon Liquidity Forecasting**: Forward-looking solvency predictions across `1h`, `6h`, `24h`, `7d`, and `30d` under 8 market perturbation scenarios (`INV-79` & `INV-80`).
- **Digital Twin Stress Testing Lab**: Simulates sudden settlement shocks, inflow droughts, and correlated swarm demand spikes with real-time Capital Adequacy Ratio (CAR) calculations.
- **Continuous 4-Way Balance Reconciliation**: Real-time cross-audit between Internal Memory Ledger, Postgres Repository, AgentVault Smart Contract, and Arc Blockchain Consensus Layer. Reports `UNVERIFIED` without active RPC (`INV-81`).
- **Emergency Circuit Breaker**: Auto-transitions to `EMERGENCY_HALT` if AgentVault is paused or concentration exceeds 60% (`INV-83` & `INV-84`).
- **Zero Wallet Bypass**: Contains ZERO private keys, ZERO signing capabilities, and strictly delegates execution to the canonical AgentVault pipeline (`INV-85`).

### SDK Quickstart (TypeScript)
```typescript
import { AgentPay } from '@agentpay/sdk';

const client = new AgentPay({ apiKey: 'ap_live_...' });

// 1. Inspect Treasury Multi-Tier State & Solvency
const state = await client.treasury.state({ mode: 'REAL' });
console.log(`Available: ${state.available_balance} | Mode: ${state.operational_mode}`);

// 2. Atomically Reserve Liquidity Headroom
const reservation = await client.treasury.reservations.create({
  organization_id: 'org_default',
  source: 'SWARM_ORCHESTRATOR',
  amount_base: '15000000', // 15 USDC
  timeout_seconds: 3600,
  mode: 'REAL',
});

// 3. Predictive Solvency Forecast
const forecast = await client.treasury.forecast({ horizon: '24h', scenario: 'OUTFLOW_SPIKE' });
console.log(`Forecast Survival State: ${forecast.survival_state}`);

// 4. Digital Twin Stress Simulation
const stress = await client.treasury.stress({ scenario_name: 'SETTLEMENT_CLUSTER', simultaneous_settlements: 20 });
console.log(`Capital Adequacy Ratio: ${stress.capital_adequacy_ratio}x`);

// 5. Release or Consume Reservation
await client.treasury.reservations.release(reservation.reservation_id, 'Mission completed');
```

---

## Autonomous Economic Control Tower (Task 12)

**"AgentPay Control Tower is the operational interface for autonomous economic systems."**

The **Control Tower** (`/control`) unifies AgentPay's distributed multi-agent subsystems, clearinghouse, deterministic policy engine, treasury controls, and Arc settlement layer into a single, high-fidelity operational experience.

```
USER
  │
  ▼
CONTROL TOWER (/control)
  │
  ▼
MISSION COMMAND CENTER (/control/missions/[id])
  │
  ▼
AGENT NETWORK (Discovery & Marketplace)
  │
  ▼
CONTRACT & CLEARINGHOUSE (Obligations, Invoices, Escrow)
  │
  ▼
TREASURY & LIQUIDITY ENVELOPE (Headroom Reservation)
  │
  ▼
ECONOMIC CONSTITUTION (Hierarchical Rule Inheritance)
  │
  ▼
POLICY & RISK ENGINE (Deterministic Rust Microsecond Validation)
  │
  ▼
APPROVAL CENTER (Human-in-the-Loop Gating for Flagged Intents)
  │
  ▼
EXECUTION GATEWAY (Idempotent State Machine)
  │
  ▼
AGENTVAULT SMART CONTRACT (Solidity Bound Envelopes)
  │
  ▼
ARC BLOCKCHAIN SETTLEMENT (Consensus Finality & Verified Receipts)
  │
  ▼
RECONCILIATION & AUDIT (4-Way continuous ledger cross-matching)
  │
  ▼
ECONOMIC MEMORY & INTELLIGENCE (Outcome feedback & replanning)
```

### Core Architecture & Operational Surfaces

1. **Executive Overview (`/control`)**: Real-time cross-economy KPIs, mission counters, treasury health, and active approvals.
2. **Persistent Economic State Strip**: Global status header monitoring Treasury, Constitution Policy, Risk Composite, Execution Mode, and Arc RPC Verification.
3. **Mission Command Center (`/control/missions/[id]`)**: Full mission DAG visualization, current action telemetry, why/evidence reasoning, next expected transitions, and agent selection explainability (with rejected alternative reasons).
4. **Universal Financial Trace (`/trace`, `/v1/control/financial-trace/:id`)**: Immutable 13-stage lifecycle trace linking root user intent to on-chain Arc settlement receipt and economic feedback observations.
5. **Approval Center (`/control/approvals`)**: Safe human intervention portal for policy- or risk-escalated payment intents; strictly prohibits overriding hard constitutional `DENY` outcomes (INV-97).
6. **Security & Policy Center (`/control/security`)**: Constitution hierarchy browser, KMS/local signer status, and circuit breaker kill switches (Agent Pause, Org Pause, Global Emergency Stop).
7. **Incident Operations (`/control/incidents`)**: Real-time detection and recovery sequences for external API timeouts, liquidity constraints, and verification failures.
8. **Digital Twin Simulator (`/control/simulator`)**: Visual scenario modeling and counterfactual execution with zero financial risk.

### Machine-Checked Security Invariants (INV-86 – INV-100)
- **INV-86**: Control Tower aggregation is strictly a read-model; it is never the source of financial truth.
- **INV-87**: Frontend cannot independently authorize or disburse payments.
- **INV-88**: Frontend cannot choose arbitrary unverified blockchain recipients.
- **INV-89**: Frontend cannot bypass deterministic policy evaluation.
- **INV-90**: Frontend cannot bypass required human approvals.
- **INV-91**: Frontend cannot bypass treasury liquidity reservation.
- **INV-92**: Simulated events and outcomes can never appear as real on-chain settlements.
- **INV-93**: Stale financial data is visibly marked as stale in the user interface.
- **INV-94**: Tenant isolation prevents cross-organization data leakage.
- **INV-95**: Operator commands are revalidated and authorized server-side.
- **INV-96**: Dangerous operator commands enforce strict idempotency keys.
- **INV-97**: Hard `DENY` outcomes strictly prohibit exposing an approval action.
- **INV-98**: Displayed transaction hashes must correspond to verified on-chain settlement evidence.
- **INV-99**: Read models cannot mutate financial state.
- **INV-100**: Control Tower aggregation cannot create financial authority.

---

## Autonomous Operations & Durable Runtime (Task 13)

AgentPay features an enterprise durable runtime making long-running autonomous economic workflows recoverable, observable, idempotent, and safe across crashes, network partitions, and counterparty delays.

### Core Runtime Principles
> **AUTONOMY MAY CONTINUE THROUGH FAILURES.**  
> **FINANCIAL AUTHORITY MUST NEVER EXPAND DURING RECOVERY.**  
>
> **CRASH RECOVERY MUST RECONSTRUCT STATE FROM DURABLE FACTS, NOT MEMORY.**  
> **RETRYING A FINANCIAL ACTION MUST NEVER BECOME AN UNCONTROLLED SECOND PAYMENT.**

```
MISSION / SWARM
      │
      ▼
DURABLE WORKFLOW (Optimistic Concurrency & Version Checks)
      │
      ▼
EXECUTION STEP (Claimed via Fenced Leases)
      │
      ▼
FINANCIAL BARRIER (12-Point Pre-Flight Safety Verification)
      │
      ▼
AUTHORIZED DOMAIN PIPELINE (Policy → Risk → Approval → Treasury → Signer → AgentVault → Arc)
      │
      ▼
CHECKPOINT & OUTBOX (Atomic SHA-256 State Fingerprints)
      │
      ▼
RECONCILIATION / ECONOMIC MEMORY (Deterministic Feedback & Learning)
```

### Key Capabilities
1. **Durable Workflows & Steps**: Full explicit state machines (`CREATED` → `READY` → `RUNNING` → `WAITING` → `PAUSED` → `RETRYING` → `COMPLETED`) with optimistic version concurrency rejecting stale writers (`INV-111`).
2. **Distributed Leases & Fencing**: Heartbeated leases with monotonic fencing tokens prevent stale or revived workers from committing results after step reassignment (`INV-101`, `INV-115`).
3. **12-Point Financial Side-Effect Barrier**: Pre-flight checks revalidate workflow state, step version, policy snapshot, risk decision, approval validity, treasury reservations, payment intents, execution gates, idempotency keys, live/sim mode, target validity, and signer boundary before calling the payment pipeline (`INV-102`, `INV-108`).
4. **Deterministic Retry & Backoff**: Exponential backoff with jitter and deadline awareness. Policy `DENY` or invalid payment recipients strictly produce `PERMANENT_FAILURE` and can **never** be retried (`INV-103`).
5. **Event-Sourced Recovery & Checkpoints**: SHA-256 state snapshots and transactional outbox/inbox events enable exact state reconstruction from PostgreSQL or memory on startup.
6. **Ambiguous Blockchain Reconciliation**: Unconfirmed blockchain submissions transition strictly to `AMBIGUOUS` and require on-chain verification or reconciliation; blind rebroadcast is mathematically prevented (`INV-106`).
7. **Control Tower Runtime Center**: Full interactive observability across `/control/runtime`, `/control/runtime/workflows`, `/control/runtime/workers`, `/control/runtime/queues`, `/control/runtime/recovery`, and `/control/runtime/incidents`.

### Machine-Checked Security Invariants (INV-101 – INV-120)
- **INV-101**: A stale worker cannot commit after lease fencing.
- **INV-102**: Workflow recovery cannot create financial authority.
- **INV-103**: Retry cannot bypass HARD_DENY.
- **INV-104**: Retry cannot bypass approval.
- **INV-105**: Retry cannot bypass treasury reservation.
- **INV-106**: Ambiguous blockchain execution cannot be blindly rebroadcast.
- **INV-107**: Simulation workflows can never broadcast.
- **INV-108**: Runtime cannot directly invoke AgentVault.
- **INV-109**: Runtime cannot modify policy.
- **INV-110**: Runtime cannot modify constitutional authority.
- **INV-111**: Workflow state transitions require version correctness.
- **INV-112**: Duplicate external callbacks are idempotent.
- **INV-113**: Duplicate financial commands cannot create duplicate payment intents.
- **INV-114**: Expired approvals cannot authorize execution.
- **INV-115**: Expired leases cannot authorize commits.
- **INV-116**: Cross-tenant workflow access is impossible.
- **INV-117**: Operator commands require authorization.
- **INV-118**: Dangerous commands are idempotent.
- **INV-119**: Financial state is derived from durable facts.
- **INV-120**: In-memory runtime state is never financial truth.

---

## Autonomous Operations OS (Task 14)

AgentPay features a comprehensive Autonomous Operations Operating System that coordinates the entire distributed execution fleet—spanning workflows, missions, swarms, agents, services, treasury, clearing, and recovery—as a single deterministic, observable, and self-healing economy.

### Core Operations Principle
> **THE OPERATIONS OS MAY ORCHESTRATE COMPLEXITY. IT MUST NEVER ORCHESTRATE AROUND FINANCIAL CONTROLS.**  
>
> **SUPERVISOR OUTPUT IS OPERATIONAL DECISION — NOT FINANCIAL AUTHORIZATION.**  
> **RUNTIME STATE IS NOT FINANCIAL AUTHORITY.**  
> **NO AI OR AGENT RECEIVES SIGNER ACCESS, PRIVATE KEYS, OR POLICY MUTATION AUTHORITY.**

```
                CONTROL TOWER
                      │
             OPERATIONS OS
                      │
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
   WORKFLOWS       MISSIONS        SWARMS
       ↓              ↓              ↓
     AGENTS         TASKS         AGENTS
       └──────────────┼──────────────┘
                      ↓
               ECONOMIC SYSTEM
                      ↓
          POLICY / RISK / TREASURY
                      ↓
              PAYMENT PIPELINE
                      ↓
                   ARC
```

### Key Capabilities
1. **Deterministic Operations Supervisor & Decision Engine**: Evaluates workflows continuously, outputting deterministic decisions (`RUN`, `WAIT`, `RETRY`, `RECOVER`, `REPLAN`, `ESCALATE`, `PAUSE`, `CANCEL`, `RECONCILE`) with structured reason codes and cryptographic inputs hashes. Financial authority is strictly `UNCHANGED` (`INV-121`).
2. **Multi-Factor Priority Engine & Bounded Tenant Fairness**: Prioritizes queues by deadline proximity, dependency criticality, workflow age, failure recovery, and tenant SLA tier. Tenant isolation quotas strictly prevent a tenant with 10,000 tasks from starving a tenant with 10 tasks (`INV-122`, `INV-126`).
3. **8 Durable Specialized Queues & Auditable Dead-Letter System**: Leased queues (`mission`, `swarm`, `task`, `recovery`, `reconciliation`, `callback`, `scheduled`, `incident`) with visibility timeouts. Exhausted retries routes to `operations_dead_letters` recording full attempt history and evidence (`INV-128`, `INV-138`).
4. **Incident Correlation & Controlled Self-Healing**: Groups cascading downstream failures into a unified incident lifecycle (`DETECTED` → `CLOSED`). Allows operational healing (worker restart, lease reclamation, circuit tripping) while strictly forbidding financial bypasses (`INV-132`).
5. **Universal "Why?" Inspector & Causal Tracing**: Traces causal lineages with parent event IDs (`caused_by_event_id`). Reconstructs exact explanations without fabricating evidence (`INV-136`).
6. **Immutable Operational Replay & Time-Travel Debugger**: Read-only timeline reconstruction at any timestamp $T$ with frozen financial states. Side-effects and state mutations during replay or time-travel are physically impossible (`INV-129`, `INV-130`).
7. **Strict Blockchain Truth & Zero Fabrication**: Arc RPC connectivity is reported as `AVAILABLE`, while unverified smart contracts are explicitly displayed as `NOT VERIFIED / NOT DEPLOYED` (`INV-135`).
8. **Command Center Observability**: Interactive operations cockpit at `/control/operations`, `/control/operations/timeline`, `/control/operations/topology`, and `/control/operations/replay/[workflowId]`.

### Machine-Checked Security Invariants (INV-121 – INV-140)
- **INV-121**: Operations supervisor cannot authorize financial execution.
- **INV-122**: Operational priority cannot override policy.
- **INV-123**: Operational recovery cannot bypass approval.
- **INV-124**: Operational recovery cannot bypass treasury.
- **INV-125**: Operational recovery cannot bypass hard DENY.
- **INV-126**: Tenant queues remain isolated.
- **INV-127**: Tenant worker capacity cannot expose another tenant's data.
- **INV-128**: Dead-letter processing is auditable.
- **INV-129**: Operational replay is read-only.
- **INV-130**: Time-travel reconstruction cannot mutate state.
- **INV-131**: Operational decisions cannot modify policy.
- **INV-132**: Circuit breakers cannot create financial authority.
- **INV-133**: Load shedding cannot disable audit/security/reconciliation.
- **INV-134**: Stale operational projections are visibly marked.
- **INV-135**: Unverified Arc state cannot be presented as verified.
- **INV-136**: Causal traces cannot fabricate evidence.
- **INV-137**: Operator commands require authorization.
- **INV-138**: Retry storms are bounded.
- **INV-139**: Infinite recovery loops are impossible.
- **INV-140**: Operational budgets cannot increase financial budgets.

### Operations CLI (`agentpay ops`)
```bash
# Check Operations OS aggregated status and freshness
agentpay ops status

# Inspect deterministic subsystem health and Arc verification truth
agentpay ops health

# Inspect active workers and capabilities
agentpay ops workers

# View 8 durable queue depths and dead-letter statistics
agentpay ops queues

# View correlated operational incidents
agentpay ops incidents

# Inspect physical & logical runtime topology
agentpay ops topology

# Inspect specific workflow state
agentpay ops workflow <workflow_id>

# Run read-only step-by-step workflow replay (INV-129)
agentpay ops replay <workflow_id>

# Universal "Why?" Inspector for causal event explanation (INV-136)
agentpay ops why <event_id>

# Resolve deterministic next scheduled action
agentpay ops next <workflow_id>

# Inspect historical system state at timestamp T (INV-130)
agentpay ops state-at <iso_timestamp>
```

---

## Autonomous Economic Fabric (Task 15)

The **Economic Fabric** coordinates existing domain engines into a unified autonomous loop:
`OBJECTIVE → UNDERSTAND → PLAN → SIMULATE → ALLOCATE → EXECUTE → OBSERVE → RECOVER → REPLAN → SETTLE → LEARN → CONTINUE`

### Constitutional Invariants (INV-141 — INV-160)
- **INV-141:** EconomicFabric cannot authorize payment.
- **INV-142:** ObjectiveCompiler cannot create financial authority.
- **INV-143:** Blueprint cannot increase financial limits.
- **INV-144:** Stale simulation cannot silently authorize execution.
- **INV-145:** Replanning cannot weaken policy.
- **INV-146:** Provider substitution cannot bypass policy.
- **INV-147:** Agent substitution cannot bypass policy.
- **INV-148:** EconomicEnvelope cannot self-increase.
- **INV-149:** RiskEnvelope cannot weaken Constitution.
- **INV-150:** ResourceEnvelope cannot modify treasury authority.
- **INV-151:** Learning cannot silently change authority.
- **INV-152:** Objective state cannot override payment state.
- **INV-153:** Financial source-of-truth remains authoritative.
- **INV-154:** Read models cannot mutate financial truth.
- **INV-155:** Dry-run cannot mutate production state.
- **INV-156:** Simulation cannot broadcast on-chain.
- **INV-157:** Live mode requires current authorization.
- **INV-158:** Expired approval cannot execute.
- **INV-159:** Changed policy invalidates stale financial authorization.
- **INV-160:** Unverified Arc evidence cannot be displayed as verified.

### CLI Commands for Economic Fabric
```bash
# Create an economic objective
agentpay objective create --desc "Produce verified security audit" --budget 50.00

# Compile execution blueprint (--dry-run supported)
agentpay objective plan <objective_id>

# Run deterministic pre-flight simulation
agentpay objective simulate <objective_id>

# Start live execution into durable workflows
agentpay objective start <objective_id>

# Inspect objective status and envelopes
agentpay objective status <objective_id>

# View 18-stage end-to-end unified trace
agentpay objective trace <objective_id>

# Explain deterministic provider selection (Why This?)
agentpay objective explain <objective_id>

# Inspect blocked actions and guardrails (Why Not?)
agentpay objective why-not <objective_id>

# Bounded self-healing replan (max 3 replans)
agentpay objective replan <objective_id> --reason "Provider latency spike"

# Pause and resume objective
agentpay objective pause <objective_id>
agentpay objective resume <objective_id>

# View descriptive autonomy metrics
agentpay objective metrics
```

---

## Autonomous Economic Protocol (Task 16)

AgentPay defines and implements a secure, machine-readable protocol through which external AI agents can participate in the AgentPay economy while ensuring that **no agent can ever become the financial authority**.

### Core Axiom & System Boundaries

```
ANY AGENT CAN PARTICIPATE IN THE ECONOMY.
NO AGENT CAN BECOME THE FINANCIAL AUTHORITY.

OPEN ECONOMIC PARTICIPATION.
CLOSED FINANCIAL AUTHORITY.

AGENTS DISCOVER. AGENTS NEGOTIATE. AGENTS WORK.
AGENTPAY CONTROLS. ARC SETTLES.
```

### The Autonomous Protocol Loop
```
DISCOVER → REQUEST → QUOTE → NEGOTIATE → CONTRACT → WORK → DELIVER → VERIFY → INTENT → POLICY → SETTLE
```

### Machine-Checked Protocol Invariants (INV-161 through INV-180)
- **INV-161:** External agent cannot possess financial authority.
- **INV-162:** Manifest registry is canonical source of truth for identity.
- **INV-163:** External agent cannot supply raw recipient blockchain address.
- **INV-164:** External agent cannot supply raw calldata or executable bytecode.
- **INV-165:** Protocol quotes are bounded by existing financial policy.
- **INV-166:** Protocol contracts are legally and financially bounded agreements.
- **INV-167:** External agent cannot initiate unsolicited payment requests.
- **INV-168:** External agent cannot inspect private tenant balances.
- **INV-169:** Payment requests are idempotent.
- **INV-170:** Stale or replayed message nonces are rejected immediately.
- **INV-171:** Protocol state machine enforces strict acyclic progression.
- **INV-172:** Strict multi-tenant data isolation.
- **INV-173:** Deliverable submission never directly triggers payment.
- **INV-174:** Quality gate thresholds enforce minimum confidence >= 0.85.
- **INV-175:** Heartbeat failure triggers automated availability suspension.
- **INV-176:** Reputation score slashes on detected fraudulent deliveries.
- **INV-177:** Rate limiter bounds excessive external API calls.
- **INV-178:** Dispute status freezes direct ledger mutations.
- **INV-179:** Digital twin simulations cannot mutate persistent balances.
- **INV-180:** Protocol version mismatch fails closed.

### CLI Commands for Protocol
```bash
# View protocol gateway status
agentpay protocol status

# Discover external agents by capability
agentpay protocol agents --capability code_audit

# List available capabilities
agentpay protocol capabilities

# Request a service quote
agentpay protocol request --service code_audit --budget 100

# View or request a quote
agentpay protocol quote --request-id req_01

# Inspect authoritative protocol contract
agentpay protocol contract contract_live_01

# Inspect settlement payment status
agentpay protocol payment pi_prot_101

# View protocol telemetry traffic
agentpay protocol events --limit 50

# Verify incoming signed message envelope
agentpay protocol verify-message --raw '{"protocol_version":"1.0",...}'

# Run digital twin protocol simulation
agentpay protocol simulate

# Agent eligibility precheck
agentpay protocol precheck --agent agent_research_01
```

---

## Autonomous Economic Marketplace (Task 17)

The **AgentPay Autonomous Economic Marketplace** transforms the agent network and protocol into a machine-native exchange for autonomous economic services.

### Core Principle
> **THE MARKETPLACE DECIDES WHO MAY PARTICIPATE IN AN OPPORTUNITY.**  
> **AGENTPAY DECIDES WHETHER VALUE MAY MOVE.**

### Features & Invariants
- **Machine-Readable Listings**: Input/output schemas, latency SLAs, pricing models (Fixed, Per-Task, Per-Unit, Milestone, Time-Based, Usage-Based, Negotiated).
- **Deterministic 9-Factor Matching**: Canonical evaluation order with mathematical tie-breakers and full `MatchExplanation` transparency (Why This Provider?).
- **Contextual Performance**: Empirical metrics (completion, latency, accuracy, acceptance, disputes) tracked per capability over sample size $N$. Zero subjective star ratings.
- **Machine-Checked Boundaries**: Invariants **INV-181 through INV-200** guarantee matching cannot authorize payments, ranking cannot bypass policy or risk, and expired quotes or raw hex injection cannot execute.
- **Continuous Economic Graph**: Objective → Opportunity → Match → Contract → Workflow → Result Verification → Clearinghouse → Arc Settlement → Economic Memory.

### Marketplace CLI Commands
```bash
# View marketplace operational health and liquidity
agentpay marketplace status

# List and search active service listings
agentpay marketplace listings --capability sec.smart_contract_audit
agentpay marketplace search --pricing PER_TASK --max-price 50.00

# Manage opportunities and matching
agentpay marketplace opportunity --create --title "Audit Uniswap Hook" --budget 50.00
agentpay marketplace opportunity opp_sec_audit_10k
agentpay marketplace quotes opp_sec_audit_10k

# Side-by-side comparison and award
agentpay marketplace compare --capability sec.smart_contract_audit --providers agent_security_alpha,agent_auditor_beta
agentpay marketplace award --opportunity opp_sec_audit_10k --provider agent_security_alpha --price 40.00

# View agent trust profile and contextual performance track record
agentpay marketplace agent agent_security_alpha
agentpay marketplace performance --agent agent_security_alpha --capability sec.smart_contract_audit
```

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
