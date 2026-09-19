# Arc Microgrants Reviewer Evidence Matrix

> **Application Target**: AgentPay  
> **Evaluation Date**: September 20, 2026  
> **Allowed Statuses**: `VERIFIED`, `PARTIAL`, `NOT VERIFIED`, `BLOCKED`

This matrix provides direct technical evidence for each formal requirement of the Arc Microgrants program. All claims are backed by verifiable code, test suites, or live network queries.

---

## Requirements Evidence Table

| Requirement | Technical Evidence & Artifact Links | Status |
|---|---|---|
| **Arc mainnet usage** | RPC query to `https://rpc.mainnet.arc.io` returned `0x13b2` (`5042`). Canonical USDC ERC-20 contract verified at `0x3600000000000000000000000000000000000000` with 3,598 bytes bytecode. Documented in [`docs/why-arc.md`](why-arc.md) and [`docs/verify-arc-deployment.md`](verify-arc-deployment.md). | **VERIFIED** |
| **Working deployment** | End-to-end multi-service architecture running locally: Next.js Control Center (`:3000`), Go Gateway (`:8080`), Rust Policy Engine (`:8081`). Production deployment runbook in [`docs/deployment.md`](deployment.md). | **VERIFIED (Local) / PARTIAL (Hosted)** |
| **USDC payment** | `AgentVault.sol` executes `usdc.safeTransfer(recipient, amount)` in 6-decimal integer base units. Integer safety tested for 0, 1 base unit, exact limit, and limit + 1. Zero floating-point arithmetic. Tested via 42 Foundry tests. | **VERIFIED** |
| **Smart contract** | `AgentVault.sol` implements daily budget enforcement, per-transaction maximums, recipient allowlists, emergency owner `pause()`, and administrative `withdraw()`. Tested via 42 unit, edge case, and fuzz tests (`contracts/test/AgentVault.t.sol`). | **VERIFIED** |
| **Deterministic policy** | Pure, side-effect-free Rust Policy Engine (`services/policy-engine`) evaluates limits in sub-millisecond latency. Zero clock or network dependencies. 32 automated tests passing (`cargo test`), 0 clippy warnings. | **VERIFIED** |
| **AI integration** | `services/gateway/internal/agent` implements structured prompt orchestration (`agent_system_v1.txt`), prompt injection defense, and server-side recipient resolution via `Service Registry`. AI has zero access to signing keys. | **VERIFIED** |
| **Security controls** | Multi-tier defense in depth: untrusted AI isolation, atomic Compare-And-Swap (CAS) double-spend defense, fail-closed live execution gates (`ENABLE_LIVE_EXECUTION=false`), and zero secrets committed to Git. Threat model in [`docs/security.md`](security.md). | **VERIFIED** |
| **Public repository** | Public GitHub repository at `https://github.com/mahitss/Arc_micro`. Clean commit history across all tasks, standard MIT License (`LICENSE`), and clean `.gitignore`. | **VERIFIED** |
| **Reproducible setup** | Validated clean setup script (`scripts/dev.sh`) and step-by-step developer guides in [`docs/quickstart.md`](quickstart.md) and [`docs/reviewer-quickstart.md`](reviewer-quickstart.md). | **VERIFIED** |
| **Real mainnet transaction** | Complete EIP-1559 transaction execution pipeline implemented in Go gateway; broadcast gated behind `ENABLE_LIVE_EXECUTION=false` during prototype phase. No mainnet transaction broadcast yet. | **NOT VERIFIED (PENDING BROADCAST)** |
