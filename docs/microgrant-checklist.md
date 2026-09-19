# Arc Microgrants Program Requirements Checklist

> **Program**: Arc Microgrants  
> **Evaluation Date**: September 20, 2026  
> **Application Target**: AgentPay — Programmable USDC Payment Infrastructure for Autonomous AI Agents  
> **Repository**: [https://github.com/mahitss/Arc_micro](https://github.com/mahitss/Arc_micro)

This document tracks all formal requirements for the Arc Microgrants program. Statuses are strictly evidence-based and reflect verified engineering deliverables without exaggeration.

---

## Requirements Matrix

| # | Requirement | Status | Evidence | Remaining Action |
|---|---|---|---|---|
| 1 | **Live deployment on Arc mainnet** | **PARTIAL** | Smart contract `AgentVault.sol` has been compiled and validated for Arc Mainnet (Chain ID `5042`). Arc Mainnet RPC (`https://rpc.mainnet.arc.io`) and canonical USDC ERC-20 (`0x3600000000000000000000000000000000000000`) are verified. The deployment script `scripts/deploy_mainnet.sh` is fully tested and ready. | Final execution of `scripts/deploy_mainnet.sh` using funded deployer key once grant evaluation commences. |
| 2 | **Public repository** | **COMPLETE** | GitHub repository is public at [https://github.com/mahitss/Arc_micro](https://github.com/mahitss/Arc_micro) containing clean commit history across all development tasks (Tasks 1–10). | Maintain repository visibility and keep branches clean. |
| 3 | **Short project description** | **COMPLETE** | Documented in `docs/submission-copy.md` and root `README.md`: *"AgentPay is programmable USDC payment infrastructure for autonomous AI agents on Arc."* | Paste into application submission form. |
| 4 | **Explanation of Arc usage** | **COMPLETE** | Documented comprehensively in `docs/why-arc.md` and `docs/arc.md`. Explains USDC-native transaction economics, protocol-level gas currency, and EVM smart contract settlement. | Reference in grant application text. |
| 5 | **Public builder profile** | **COMPLETE** | Project maintainer profile configured on GitHub ([@mahitss](https://github.com/mahitss)). | Link maintainer profile in the submission form. |
| 6 | **Working project** | **COMPLETE** | End-to-end working system consisting of Next.js 14 Web Control Center (`apps/web`), Go Gateway (`services/gateway`), Rust Policy Engine (`services/policy-engine`), Foundry smart contracts (`contracts/AgentVault.sol`), and live demo route (`/demo`). Verified with comprehensive unit, integration, and fuzz test suites. | Run interactive demonstration via `/demo` or local dev stack (`scripts/dev.sh`). |
| 7 | **One submission per project** | **COMPLETE** | This is the sole and primary submission for the AgentPay project under the Arc Microgrants program. | None. Single submission confirmed. |

---

## Status Definitions

- **COMPLETE**: The requirement is fully met, verified by existing code, configuration, or public artifacts.
- **PARTIAL**: Substantial infrastructure is built and verified (e.g., contracts compiled, RPC verified, deployment scripts tested), pending final live on-chain broadcast or external operator trigger.
- **BLOCKED**: Progress is impeded by an unresolved external dependency or missing upstream access.
- **NOT APPLICABLE**: The requirement does not apply to this project structure.
