# AgentPay — Technical Architecture Specification

$$\text{CORE ARCHITECTURAL PRINCIPLE: DECISION \neq AUTHORITY \neq SETTLEMENT}$$

---

## 1. End-to-End Architectural Pipeline

```
                 ┌────────────────────────────────┐
                 │       AI / AGENTS LAYER        │  [ADVISORY INTELLIGENCE]
                 │  Reasoning, Planning, Prompts  │  • Zero Private Keys
                 └───────────────┬────────────────┘  • Zero Signing Authority
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │       AI PROVIDER LAYER        │  [UNIVERSAL ADAPTER]
                 │  OpenRouter / Multi-Model Fall │  • Read-Only Tools Allowlist
                 └───────────────┬────────────────┘  • AIProposal (Status: PROPOSED)
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │        MISSION / FABRIC        │  [COORDINATION & DAG]
                 │  DAG Blueprint, Monte Carlo    │  • Monotonic Budget Envelopes
                 └───────────────┬────────────────┘  • Autonomous Replanning Loop
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │  MARKETPLACE / PROTOCOL / A2A  │  [DISCOVERY & NEGOTIATION]
                 │  Service Registry, SLAs, Critic│  • Verified Candidate Quotes
                 └───────────────┬────────────────┘  • Milestone Checksum Validation
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │     POLICY / CONSTITUTION      │  [DETERMINISTIC GATEWAY]
                 │  Sub-10µs Rust Core, 7 Tiers   │  • Inviolable HARD_DENY (INV-46)
                 └───────────────┬────────────────┘  • Monotonic Scope Tightening
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │          RISK ENGINE           │  [FINANCIAL CONTAINMENT]
                 │  Concentration & Novelty Score │  • Exposure Caps (<30%)
                 └───────────────┬────────────────┘  • Anomaly Detection
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │        APPROVAL ENGINE         │  [HUMAN-IN-THE-LOOP / ESCALATION]
                 │  Policy Threshold Evaluation   │  • Auto-Execution (<$50.00)
                 └───────────────┬────────────────┘  • Multi-Sig Dual-Custody Escalation
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │            TREASURY            │  [LIQUIDITY ENCUMBRANCE]
                 │  Double-Entry Ledger, Reserves │  • Atomic Reservation Locks (INV-76)
                 └───────────────┬────────────────┘  • Multilateral Cycle Netting
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │         EXECUTION GATE         │  [TRANSACTION CONSTRUCTOR]
                 │  PaymentIntent Assembly, TTL   │  • Non-Replayable Causation
                 └───────────────┬────────────────┘  • Server-Resolved Destination
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │             SIGNER             │  [CRYPTOGRAPHIC BOUNDARY]
                 │  Calldata & Target Binding     │  • Zero Native ETH Value
                 └───────────────┬────────────────┘  • EIP-1559 Calldata Verification
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │           AGENTVAULT           │  [ON-CHAIN ENFORCEMENT]
                 │  AgentVault.sol (Solidity)     │  • Daily Calendar Windows
                 └───────────────┬────────────────┘  • Immutable Per-Tx Caps
                                 │
                                 ▼
                 ┌────────────────────────────────┐
                 │          ARC MAINNET           │  [SETTLEMENT LAYER]
                 │  Chain ID 5042, Native USDC    │  • Sub-Second Finality
                 └────────────────────────────────┘  • Single-Asset Gas Accounting
```

---

## 2. Domain Classification & Authority Boundaries

| Domain | Subsystems Included | Permitted Capabilities | Prohibited Capabilities |
| :--- | :--- | :--- | :--- |
| **Advisory Intelligence** | External Agents, AI Provider (OpenRouter), Task Planners, Swarm Coordinators | Reason, decompose objectives, search services, rank quotes, assess deliverable quality, suggest replans. | Hold private keys, sign transactions, self-expand budget, modify policy, call `AgentVault`. |
| **Financial Authority** | Rust Policy Engine, Go Gateway, Risk Engine, Treasury Orchestrator, Signer | Authorize intents, evaluate allowlists, reserve liquidity, verify calldata, sign authorized payloads. | Fabricate quotes, bypass constitutional hierarchy, execute unreserved transactions. |
| **Settlement Plane** | Arc Network, `AgentVault.sol`, Native USDC Token Contract | Enforce daily limits in EVM storage, transfer verified USDC base units, emit on-chain receipts. | Mutate off-chain database records, bypass owner multi-sig roles. |

---

## 3. Subsystem Implementation Mapping

1. **Rust Policy Core (`services/policy-engine`):** Evaluates multi-layered rules in sub-10 microseconds (`authorize.rs`). Enforces monotonic authority reduction across 7 constitutional tiers.
2. **Go Gateway & Workflow Engine (`services/gateway`):** REST API, Compare-and-Swap state machines, lease-fenced worker recovery (`internal/runtime`), and PostgreSQL storage (`internal/storage`).
3. **Reference Smart Contract (`contracts/src/AgentVault.sol`):** Solidity programmable vault tested in Foundry simulation.
4. **Client Libraries (`packages/`):** Keyless SDKs in TypeScript and Python, plus the operator CLI (`packages/cli`).
5. **Observability Plane (`apps/web`):** Next.js Control Tower dashboard rendering real-time causal flight recorder traces.
