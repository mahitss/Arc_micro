# AI Security Boundary & Invariants — AgentPay Universal AI Layer

## 1. Security Philosophy

The core architectural boundary of AgentPay enforces that **probabilistic reasoning must never possess financial authority**. 

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FINANCIAL AUTHORITY MODEL                       │
│                                                                        │
│   AI ADVISORY DOMAIN          │    DETERMINISTIC AUTHORITY DOMAIN      │
│   (Probabilistic, Unsafe)     │    (Strict, Cryptographic, Arc Net)    │
│   ───────────────────────     │    ───────────────────────────────     │
│   - LLM Reasoning & Planning  │    - Rust Policy Engine (Constitution) │
│   - Service Recommendations   │    - Risk Engine Evaluation            │
│   - Read-Only Context Tools   │    - Dual-Custody Approval Engine      │
│   - Advisory AIProposal       │    - Treasury Atomic Reservation       │
│                               │    - Execution Gate Calldata Sanitizer │
│                               │    - Go Signer (HSM / Arc Vault)       │
└────────────────────────────────────────────────────────────────────────┘
```

The boundary is verified through 20 non-negotiable security invariants, implemented in `internal/ai/security/boundary.go` and verified in `tests/integration/ai_security_invariants_test.go`.

---

## 2. The 20 Security Invariants

| ID | Invariant Name | Enforced Boundary & Mitigation |
| :--- | :--- | :--- |
| **INV-01** | **Zero Key Custody** | The AI provider layer has zero access to private keys, keystores, HSMs, or signing seeds. Requests containing private key keywords are rejected immediately. |
| **INV-02** | **Advisory Proposals Only** | AI outputs are classified strictly as `AIProposal` with status `PROPOSED`. Proposals carry no financial authority and cannot mutate state directly. |
| **INV-03** | **Prohibited Tool Names Blocked** | Mutation tools (`execute_payment`, `sign_transaction`, `transfer_funds`, `withdraw_funds`, `mutate_policy`) are blocked at the registry level. |
| **INV-04** | **Prohibited Tool Parameters Blocked** | Tool parameter schemas requesting `private_key`, `secret`, `signature`, `signer_key`, or `raw_calldata` are rejected prior to registration. |
| **INV-05** | **Read-Only Tools Allowlist** | AI agents are restricted strictly to read-only investigative tools (`search_registry`, `verify_merchant`, `estimate_service_cost`, `check_policy_allowance`). |
| **INV-06** | **Disallowed Tool Call Rejection** | Any tool invocation outside the explicit read-only allowlist is immediately aborted and rejected. |
| **INV-07** | **Proposal Integrity Hashing** | Every proposal generates a deterministic SHA-256 digest over its contents. Any tampering with parameters or amounts invalidates the proposal. |
| **INV-08** | **Strict Proposal Expiration** | Proposals contain an immutable TTL (default 5-10 minutes). Expired proposals are rejected by downstream policy gates. |
| **INV-09** | **Non-Bypassable Policy Gate** | Every proposal must pass through the deterministic Rust Policy Engine (validating single-tx limits, velocity limits, and daily caps). |
| **INV-10** | **Recipient Whitelist Resolution** | AI cannot specify arbitrary recipient addresses. Addresses must resolve to verified entries in the Merchant Registry. |
| **INV-11** | **Unwhitelisted Recipient Rejection** | Proposed transfers to unverified or unknown addresses fail closed at the policy boundary. |
| **INV-12** | **Integer Atomic Amount Enforcement** | Amounts must be atomic `uint64` micro-units (e.g., $1.00 = 1,000,000 micro-USDC). Floating-point or non-numeric amounts are rejected. |
| **INV-13** | **Budget Envelope Ceiling** | An AI mission plan's cumulative stage budgets cannot exceed the parent mission's maximum allocated budget envelope. |
| **INV-14** | **Dual-Custody Human-in-the-Loop** | High-value payments or policy-exceeding transactions mandate cryptographic co-signatures from human operators. |
| **INV-15** | **Treasury Reservation Prerequisite** | No payment intent can be cleared without prior atomic encumbrance/reservation in the treasury ledger. |
| **INV-16** | **Execution Gate Calldata Sanitization** | Raw bytecode, unparsed calldata, or arbitrary contract calls from AI proposals are rejected by the execution gate. |
| **INV-17** | **Relayer & Signer Isolation** | The signing relayer runs as an isolated subsystem and only signs transactions verified by policy and approval proofs. |
| **INV-18** | **Arc Smart Contract Guard** | On-chain contracts (`AgentVault.sol`) verify Merkle policy proofs and owner authorizations before releasing funds. |
| **INV-19** | **Sanitized Observability Telemetry** | API keys (`sk-or-v1-...`, `AI_API_KEY`) and private keys are scrubbed with `[REDACTED_SECRET]` before telemetry storage or logging. |
| **INV-20** | **Fail-Closed on Provider Error** | Provider timeouts, rate limits, schema decode failures, or network disconnections fail closed—no optimistic or default payments are made. |

---

## 3. Allowed vs. Prohibited Capabilities Matrix

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│        ALLOWED AI OPERATIONS         │       PROHIBITED AI OPERATIONS       │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ ✓ Read merchant service registry     │ ✗ Direct payment execution           │
│ ✓ Read policy caps & allowances      │ ✗ Blockchain transaction signing     │
│ ✓ Estimate task cost & duration      │ ✗ Key management / key export        │
│ ✓ Propose mission decomposition plan │ ✗ Vault fund transfers or withdrawal │
│ ✓ Recommend cost-optimal merchant    │ ✗ Modifying risk policies or caps    │
│ ✓ Generate human-readable summaries  │ ✗ Passing unverified calldata to Arc │
│ ✓ Suggest replanning on task failure │ ✗ Bypassing human approval gates     │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 4. Verification & Testing

The security boundary is continuously validated by:
- **Unit Tests**: `services/gateway/internal/ai/security/boundary_test.go`
- **Integration Tests**: `services/gateway/tests/integration/ai_security_invariants_test.go`
- **Adversarial Security Lab**: Automated fuzzing against prompt injection, parameter smuggling, and key-exfiltration payloads.
