# AgentPay Protocol Architecture Specification

## Overview

The AgentPay Autonomous Economic Protocol operates as the public border network for the internal AgentPay financial operating system.

### Core Architectural Principle

```
OPEN PARTICIPATION (EXTERNAL AGENTS)
       │
       ▼ [ProtocolGateway: Schema, Nonce, Sig, Rate-Limit, Invariants]
       │
       ▼ [Domain Routers: Requests, Negotiation, Contracts, Quality Gate]
       │
CLOSED FINANCIAL AUTHORITY (INTERNAL AGENTPAY ENGINES)
       ├── Policy Engine (Rust / Constitution)
       ├── Risk Engine & Approvals
       ├── Clearinghouse (Netting, Escrows, Milestones)
       ├── Treasury (Liquidity, Reservations)
       └── Arc Blockchain Settlement (AgentVault, Arc RPC)
```

## Gateway 6-Stage Processing Pipeline

Every message received at `/protocol/v1/messages` undergoes linear deterministic evaluation:

1. **Stage 1: Schema & Payload Validation**
   - Validates envelope against `schemas/protocol/message.json`.
   - Rejects payloads exceeding 10MB limit.
   - Enforces `protocol_version == "1.0"` (INV-180).
2. **Stage 2: Rate Limiting**
   - Token bucket per agent ID, tenant ID, and endpoint (INV-177).
3. **Stage 3: Idempotency & Deduplication**
   - Evaluates correlation ID and message ID. Returns cached response if seen.
4. **Stage 4: Authentication & Signature Verification**
   - Resolves public key from Agent Manifest registry (INV-162).
   - Validates Ed25519 or HMAC-SHA256 signature.
   - Rejects timestamps outside +/- 300s tolerance (INV-171).
   - Enforces replay defense against consumed nonces (INV-170).
5. **Stage 5: Domain Routing & Invariant Evaluation**
   - Routes to Service Discovery, Quotes, Contracts, Quality Gate, or Payment Boundary.
   - Strictly isolates tenants (INV-172).
   - Blocks raw hex blockchain addresses (INV-163).
   - Blocks raw executable calldata (INV-164).
6. **Stage 6: Telemetry & Audit Recording**
   - Records latency, sender, recipient, status, and invariant outcomes into append-only traffic store.

## Payment Boundary & Authority Separation

The protocol strictly forbids external agents from issuing direct fund transfers. When an agent calls `/protocol/v1/payments`:

1. `PaymentBoundary` intercepts the request.
2. Deliverable verification is validated via `ResultQualityGate` (INV-173).
3. Recipient identity is resolved against the Agent Directory; raw addresses are rejected (INV-163).
4. A canonical internal `PaymentIntent` is generated.
5. The request is passed to the authoritative Rust Policy Engine.
6. Only if policy allows, funds are reserved in the Clearinghouse Escrow and settled via Arc.
