# AgentPay — Verified Deployment & Settlement Status

This document presents the authoritative, machine-checked operational status of AgentPay across all infrastructure layers. Every claim corresponds directly to current repository and RPC evidence.

---

## 1. Summary Status Matrix

| Subsystem / Dimension | Status | Evidence / Observation |
| :--- | :--- | :--- |
| **Deterministic Control Plane** | **VERIFIED** | 386/386 machine-checked tests pass across Rust, TypeScript, Go, Solidity, Python, CLI. |
| **Simulation & VCR Demo** | **VERIFIED** | 22/22 steps deterministic replay executes with 0 errors via Web UI and CLI. |
| **AI Layer & Swarm Planning** | **VERIFIED** | Model-agnostic OpenRouter/Anthropic integration with deterministic tool schema barriers. |
| **Arc Mainnet RPC Connectivity** | **VERIFIED** | Endpoint `https://rpc.mainnet.arc.io` active; Chain ID `5042` (`0x13b2`); Block `#23,401,027+`. |
| **Arc Native USDC Contract** | **VERIFIED** | Bytecode present (3,598 bytes) at address `0x3600000000000000000000000000000000000000`. |
| **AgentVault Contract on Arc Mainnet** | **UNVERIFIED (UNDEPLOYED)** | Target address returns `0x` bytecode on Arc Mainnet RPC. Contract is compiled and tested locally (`AgentVault.t.sol`), but not yet broadcast. |
| **Live Mainnet Settlement** | **SIMULATED (DISABLED)** | `ENABLE_LIVE_EXECUTION=false`. Exactly 0 on-chain settlement transactions broadcast. 0 real funds moved. |
| **Cloud KMS Signing Provider** | **UNVERIFIED (STUBBED)** | `KMSSigner` intentionally fails closed with `ErrKMSSignerUnavailable`. Local calldata-bound signing used for development/simulation. |
| **Production Key Management & Vault Funding**| **OPERATOR ACTION REQUIRED** | Operator must generate production cold owner key, fund gas reserve, and execute deployment runbook. |

---

## 2. Categorical Declarations

### A. What is VERIFIED
- **Rust Policy Engine:** Sub-10µs rule evaluations (`INV-1` to `INV-12`), budget caps, and velocity throttles.
- **Constitutional Guardrails:** Multi-layered invariant enforcement preventing prompt injection from acquiring financial control.
- **Double-Entry Ledger:** Zero-drift balance accounting and atomic transaction encumbrances.
- **Multilateral Debt Netting:** Graph netting cycles compress gross counterparty debts before payment batching.
- **Arc RPC Connectivity:** Independent verification of Arc Mainnet RPC responsiveness, chain metadata, and native USDC contract presence.

### B. What is SIMULATED
- **Mission Settlement Execution:** Mission `msn_market_intel_001` and its 22-step execution pipeline operate in deterministic simulation mode. Broadcast is strictly NONE, zero fake transaction hashes are generated, and zero real funds are moved.
- **Adversarial Attack Denial:** Malicious provider recipient substitution is rejected deterministically in simulation without submitting failing transactions to the blockchain.

### C. What is UNVERIFIED
- **Mainnet AgentVault Bytecode:** No verified contract bytecode currently resides at a designated production address on Arc Mainnet.
- **Enterprise KMS Key Management:** Integration with AWS KMS / GCP Cloud KMS is architected as an interface but is not backed by live cloud credentials in this repository.

### D. What Requires OPERATOR ACTION
Before live on-chain settlement can be enabled:
1. Operator must provision cold storage multi-sig keys or HSM credentials.
2. Operator must deploy and verify `AgentVault.sol` to Arc Mainnet following `docs/arc-mainnet-operator-runbook.md`.
3. Operator must fund the vault with initial USDC and gas allocations.
4. Operator must set `ENABLE_LIVE_EXECUTION=true` and `ARC_NETWORK=mainnet` in a hardened production runtime environment.
