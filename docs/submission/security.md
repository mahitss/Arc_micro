# AgentPay v1.0 — Security Model (Submission)
**Classification:** Security Architecture & Invariant Guarantees  

---

## 1. Zero Trust Architecture

AgentPay is designed under the assumption that autonomous AI agents may be compromised by prompt injection, software errors, or model hallucinations. Consequently, the financial control plane operates on zero trust:

1. **AI Agents Hold Zero Keys (`INV-1`)**: Private keys remain locked within the authorized signer boundary. External agent payloads containing private keys are rejected.
2. **Server-Controlled Recipients (`INV-2`)**: Agents declare desired services; the gateway maps services to on-chain recipient addresses, completely neutralizing prompt injection wallet redirection.
3. **Inviolable HARD_DENY (`INV-46`)**: Blocked recipients, sanctions matches, or hard limit breaches terminate execution immediately. Approvals cannot override hard denies.
4. **Exact Calldata Binding**: The signer inspects transaction calldata hashes and target addresses before signing. Any post-authorization mutation causes immediate rejection.
5. **Checked Arithmetic**: Native Solidity 0.8.24 and Rust `checked_add` arithmetic halt on numerical overflow (`INV-47`).

---

## 2. Invariant Verification

The system maintains 220 machine-checked invariants across 35 packages and test suites:
- **Authority Boundary Suite**: 30 non-negotiable rules tested in `services/gateway/internal/adversarial/authority_boundary_test.go`.
- **Chaos Economy Suite**: 32 adversarial conditions tested in `services/gateway/internal/adversarial/chaos_economy_test.go`.
- **Fuzz Testing**: 3 Foundry fuzz suites validating limits across 256 random iterations.
