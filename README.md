# AgentPay

Programmable financial control plane and autonomous economic operating system for AI agents, featuring deterministic policy controls and native USDC settlement on Arc.

---

## The Autonomous Economy Engine & Mission Control

AgentPay is the control center for an autonomous AI economy: **"AI Requests → AgentPay Controls → Arc Settles."**

Autonomous agents can plan, discover, hire, and pay peer agents and external services while AgentPay governs every movement of money through deterministic Rust policy evaluation, real-time risk scoring, multi-tenant agent vaults, and verifiable on-chain settlement.

### The Autonomous Mission Flow
```
Objective → Autonomous Mission → Agents → Service Marketplace → Economic Decisions → Policy / Risk → Payments → Arc Settlement → Results → Mission Completion
```

Autonomous AI agents can plan, reason, and execute complex workflows, but giving them direct access to crypto private keys presents catastrophic financial risk. A single software bug, hallucination, or adversarial prompt injection can instantly drain a funded wallet.

Agents need economic agency to pay for data, compute, and third-party APIs. Existing solutions either:
1. Hand the agent an unconstrained private key (unsafe).
2. Require manual human intervention for every micro-transaction (destroys autonomy).

**AgentPay solves this by decoupling agent reasoning from financial settlement.** The agent requests payment intents; AgentPay enforces deterministic policies off-chain and smart contract limits on Arc before signing or broadcasting transactions.

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

## Documentation Index

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
