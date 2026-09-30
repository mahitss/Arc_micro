# TASK 53: Autonomous Economic Protocol Control Tower — Architecture Audit

**Target Route:** `/control/protocol` and associated sub-routes (`/control/protocol/agents/[id]`, `/control/protocol/contracts/[id]`, `/control/protocol/security`, `/control/protocol/traffic`).

---

## 1. PROTOCOL DOMAIN

The protocol subsystem in `services/gateway/internal/protocol` defines the Autonomous Economic Protocol v1.0 specifications and machine-checked invariants. It provides a formal peer-to-peer economic interaction layer where autonomous agents can discover peers, exchange capabilities, negotiate pricing, form multi-milestone contracts, submit work deliverables, and request payouts.

Crucially, the protocol domain operates under a strict architectural axiom:
> **Open economic participation. Closed financial authority.**

External agents may freely participate in discovery, capability advertisement, quoting, and deliverable submission, but they possess **zero financial authority**. They cannot hold private keys, sign on-chain transactions, select arbitrary blockchain recipient addresses, inject arbitrary calldata, modify policy rules, increase budget ceilings, or access AgentVault.

---

## 2. PROTOCOL GATEWAY

The `ProtocolGateway` (`services/gateway/internal/protocol/gateway.go`) serves as the single ingress point for all external protocol communications. Every message is parsed as a canonical `ProtocolMessage` and passes through a multi-stage validation pipeline:
1. **Envelope Validation:** Verifies required envelope fields (`protocol_version`, `message_type`, `message_id`, `sender_id`, `recipient_id`, `timestamp`, `payload`).
2. **Replay & Freshness Protection:** Checks message nonces against an in-memory TTL replay cache (`ValidateINV170`) and rejects timestamps older than 5 minutes (`ValidateINV171`).
3. **Cryptographic Signature Verification:** If signed with Ed25519/HMAC-SHA256, verifies the signature over the canonical canonical signing string (`MessageID.SenderID.RecipientID.Timestamp.PayloadHash.ProtocolVersion`).
4. **Tenant Isolation:** Enforces tenant boundary isolation (`ValidateINV172`).
5. **Rate Limiting:** Enforces token-bucket rate limits per agent/endpoint (`rate_limiter.go`).
6. **Dispatch:** Routes the payload to the respective protocol handler (`ServiceRequest`, `ProtocolQuote`, `NegotiationPayload`, `ResultSubmittedPayload`, `PaymentRequestPayload`).

---

## 3. IDENTITY

Agent identity is established via `AgentManifest` (`models.go` lines 140–155). 
- **Agent IDs:** Machine-readable identifiers such as `agent_research_01`, `agent_security_02`, and `agent_verifier_03`.
- **Organizations:** Organizations (`org_alpha`, `org_beta`, `org_gamma` in fixtures) represent counterparty groupings. In the current environment, these are deterministic demo fixtures, not verified external corporations.
- **Trust Levels:** Four canonical trust tiers (`TrustUnverified`, `TrustIdentified`, `TrustVerified`, `TrustTrusted`).
- **Provenance Reality:** The 3 agents currently displayed are **simulated demo fixtures** registered in `MemoryProtocolStore`. They are not live external processes sending live network packets from external clouds. They must be explicitly labeled `SIMULATED AGENTS` with `DEMO ORGANIZATION`.

---

## 4. MANIFEST

The `AgentManifest` specifies:
- `protocol_version`: Always `"1.0"`.
- `agent_id`, `organization_id`, `display_name`.
- `public_key`: Ed25519 public key.
- `supported_protocols`: E.g., `["agentpay.protocol.v1"]`.
- `capabilities`: Array of published `CapabilityDescriptor`s.
- `endpoints`: Task, health, and status callback URLs.
- `pricing`: Capability-specific pricing structures.
- `availability`: `AVAILABLE`, `BUSY`, or `OFFLINE`.
- `reputation_reference`: Empirical track record metrics.

**Provenance Reality (INV-162):** The header badge `100% Manifest Verified (INV-162)` claims complete manifest verification. While the schemas of the 3 local fixtures are 100% valid according to `validator.go`, claiming "100% Manifest Verified" without qualification implies external verification. The UI must truthfully indicate `3/3 SIMULATED MANIFESTS VALID` or `100% DEMO MANIFEST VALIDATION`.

---

## 5. CAPABILITIES

Capabilities are machine-readable capability definitions (`CapabilityDescriptor` in `models.go`):
- `market-research@1.0`: "Market & Threat Research" (Base price: $10.00 USDC, SLA: 350ms, Verification: Schema).
- `security-audit@1.0`: "Automated Security Audit" (Base price: $18.50 USDC, SLA: 450ms, Verification: Independent verifier consensus).
- `verification@1.0`: "Result & Evidence Verification" (Base price: $5.00 USDC, SLA: 150ms, Verification: Cryptographic deliverable checksum).

Capabilities are dynamically queried from `ProtocolService.DiscoverAgents` or `/protocol/v1/capabilities`. They define input/output schemas, pricing models (`FIXED`, `VARIABLE`), and verification requirements.

---

## 6. CONTRACTS

Contracts are modeled by `ProtocolContract` (`models.go` lines 226–245):
- Bounded agreements specifying requester ID, provider ID, capability, deliverables, milestones, total amount, currency (`USDC`), deadline, policy snapshot hash, and contract state.
- **Contract State Machine:** `DRAFT` → `PROPOSED` → `NEGOTIATING` → `ACCEPTED` → `ACTIVE` → `MILESTONE_PENDING` → `COMPLETED` (or `DISPUTED`, `CANCELLED`, `EXPIRED`, `REJECTED`, `FAILED`).
- **Milestones (`ContractMilestone`):** Intermediate progress milestones each specifying deliverable specification, amount in USDC, due date, verification method, and status (`PENDING`, `SUBMITTED`, `VERIFIED`, `PAID`).
- **Financial Bounds:** Contracts have fixed budget ceilings that cannot exceed the parent envelope or policy limits (`INV-165`).

---

## 7. NEGOTIATION

The negotiation protocol (`NegotiationPayload`, `MsgNegotiationRequest`, `MsgNegotiationResponse`) allows two agents to exchange bounded proposals regarding price, deadline, and deliverables across numbered negotiation rounds. If an agreed quote is reached within policy budget caps, it transitions into an accepted `ProtocolContract`.

---

## 8. SECURITY & INVARIANTS

The protocol enforces machine-checked invariants `INV-161` through `INV-180`:
- **INV-161:** Protocol authentication does not imply financial authorization.
- **INV-162:** External agents cannot sign financial transactions.
- **INV-163:** External agents cannot select arbitrary raw recipient addresses. Addresses must resolve from the registered service directory.
- **INV-164:** External agents cannot supply arbitrary calldata.
- **INV-165:** Protocol messages cannot bypass policy budget caps.
- **INV-166:** Protocol messages cannot bypass risk scoring.
- **INV-167:** Protocol messages cannot bypass human approval gates.
- **INV-168:** Protocol messages cannot bypass treasury reservations.
- **INV-169:** Duplicate payment requests are idempotent.
- **INV-170:** Replayed messages with reused nonces are rejected.
- **INV-171:** Expired messages exceeding timestamp tolerance are rejected.
- **INV-172:** Cross-tenant protocol access is blocked.
- **INV-173:** Result submission cannot directly trigger payment; quality gate verification is mandatory.
- **INV-174:** Fake payment confirmations cannot alter financial truth.
- **INV-175:** Protocol simulation cannot broadcast on-chain transactions.
- **INV-176:** Protocol precheck cannot mutate financial state.
- **INV-177:** Webhook delivery failures cannot alter confirmed financial state.
- **INV-178:** Disputes cannot directly mutate ledger state.
- **INV-179:** Trust level cannot grant financial authority.
- **INV-180:** Reputation cannot grant financial authority.

**The "324 Security Guardrails" Source:** The figure 324 comes directly from `FALLBACK_SECURITY.adversarial_summary`:
- 142 Replay attacks prevented
- 89 Unauthorized balance queries blocked
- 37 Raw transfer injections halted
- 56 Expired/invalid signature rejections
Total: $142 + 89 + 37 + 56 = 324$. These are deterministic adversarial test cases verified in simulation (`adversarial_test.go` and `chaos_test.go`). They must be labeled `324 SIMULATED ATTACK CASES NEUTRALIZED` with `0 AUTHORITY LEAKS · VERIFIED IN SIMULATION`.

---

## 9. REPUTATION

Reputation is tracked in `ReputationMetrics` (`models.go` lines 322–334): sample size, completion rate, average latency, result quality average, dispute rate, quote accuracy, and observation days.
- **Simulated Value:** 95/100–99/100 displayed on agent cards is derived from simulated benchmark evaluations.
- **Critical Safety Constraint (INV-180):** Reputation score **never** grants financial authority. A 100/100 agent is still subject to HARD_DENY, cannot sign, cannot exceed policy budgets, and cannot access AgentVault.

---

## 10. TELEMETRY

Telemetry is tracked via `ProtocolTrafficEntry` (`models.go` lines 369–380) with event types:
- `service.request`
- `protocol.quote`
- `contract.negotiation`
- `contract.proposal`
- `result.submitted`
- `payment.request`
- `payment.decision`

The 7 entries displayed in the stream correspond to the canonical deterministic lifecycle run of contract `contract_live_01`.

---

## 11. CLEARING

Protocol contracts do not handle settlement internally. When a milestone deliverable is verified, the obligation is registered with the Economic Clearinghouse (`/economy`). The clearinghouse nets multi-party obligations before generating settlement requests.

---

## 12. PAYMENT

Payment requests flow through `PaymentBoundary` (`payment_boundary.go`):
1. Raw blockchain recipient addresses are strictly denied (`INV-163`).
2. Policy ceilings and budget caps are checked (`INV-165`).
3. Result quality verification is verified (`INV-173`).
4. Recipient address is resolved authoritatively from the service registry.
5. If approved, a canonical `PaymentIntent` is formed (`pi_proto_...`).
6. There is **no direct path** from the Protocol to AgentVault.

---

## 13. SIMULATION & DIGITAL TWIN

The protocol provides two counterfactual execution tools:
- **`runProtocolPrecheck` (`/protocol/v1/precheck`):** Validates agent eligibility, capability existence, and policy compatibility without creating any state or obligations (`INV-176`).
- **`runProtocolSimulation` (`/protocol/v1/simulate`):** Executes dry-run matching and policy evaluation under mode `"DRY_RUN_NO_MONEY_MOVED"`, returning `safe_to_execute` and policy decisions without moving funds or broadcasting (`INV-175`).

---

## 14. STORAGE

Protocol state is persisted via `ProtocolStore` (`storage.go`), with `MemoryProtocolStore` providing in-memory storage seeded with default test fixtures. In production, this can be backed by a PostgreSQL database with identical interface semantics.

---

## 15. CURRENT DATA SOURCE

- **Frontend:** Fetches from `/protocol/v1/agents`, `/protocol/v1/contracts`, `/protocol/v1/traffic`, and `/protocol/v1/security` using `apps/web/src/lib/api/protocol.ts`.
- **Backend:** Handled by `ProtocolHandler` in `services/gateway/internal/http/handlers/protocol_handlers.go`, which queries `ProtocolService` and `MemoryProtocolStore`.
- **Fallback Fixtures:** If the gateway is offline or returns an empty collection, `apps/web/src/lib/api/protocol.ts` returns deterministic fallback fixtures (`FALLBACK_AGENTS`, `FALLBACK_CONTRACTS`, `FALLBACK_TRAFFIC`, `FALLBACK_SECURITY`).

---

## 16. ROOT CAUSE OF CURRENT STATIC/SIMULATED APPEARANCE

1. **Misleading High-Level Labels:** The dashboard displayed "DISCOVERED EXTERNAL AGENTS: 3" and "100% Manifest Verified" without specifying that these are deterministic simulation fixtures.
2. **Ambiguous Escrow Metric:** "CONTRACTED VOLUME: $110.00 USDC · Clearinghouse Escrow Secured" implied real USDC was locked in live escrow, when in reality no live funds moved and AgentVault is not deployed.
3. **Ambiguous Security Metric:** "324 Attacks Neutralized · 0 Authority Leaks" lacked provenance, appearing like a live production telemetry counter rather than an adversarial simulation test suite benchmark.
4. **Lack of Provenance Badges:** Individual agent cards, contract cards, and modals lacked explicit badges distinguishing simulated demo entities from live verified external agents.
5. **Missing Search & Filter Interactivity:** The Discovered Agents tab lacked search and capability filtering.
