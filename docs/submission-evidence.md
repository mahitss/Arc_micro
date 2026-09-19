# Arc Microgrants Official Submission Evidence File

> **Application**: Arc Microgrants Program  
> **Project Name**: AgentPay  
> **Submission Date**: September 20, 2026

This document compiles the authoritative submission evidence for the AgentPay application. Only verified values and explicit placeholders are recorded.

---

## 1. Submission Evidence & Resource Links

| Item | Value / URL / Placeholder | Status |
|---|---|---|
| **GitHub Repository URL** | `https://github.com/mahitss/Arc_micro` | **PUBLIC & VERIFIED** |
| **Live Application URL** | `http://localhost:3000` (Local Dev) / [Staging URL Pending Deployment] | **LOCAL VERIFIED** |
| **Backend Gateway URL** | `http://localhost:8080` (Local Dev) / [Staging URL Pending Deployment] | **LOCAL VERIFIED** |
| **Public Builder Profile** | `https://github.com/mahitss` | **PUBLIC & VERIFIED** |
| **Target Blockchain Network** | Arc Mainnet (Chain ID `5042`) | **VERIFIED LIVE** |
| **Public RPC Endpoint** | `https://rpc.mainnet.arc.io` | **VERIFIED LIVE** |
| **Canonical USDC Contract** | `0x3600000000000000000000000000000000000000` | **VERIFIED LIVE** |
| **Deployed AgentVault Address** | Target Script: `contracts/script/DeployAgentVault.s.sol` | **COMPILED & READY FOR BROADCAST** |
| **Verified Transaction Hash** | `MAINNET TRANSACTION NOT YET EXECUTED` | **PENDING LIVE BROADCAST** |
| **Arc Block Explorer URL** | `https://explorer.arc.io` | **VERIFIED** |
| **Demo Video URL** | [Link to 2-3 minute screencast based on `docs/demo-script.md`] | **PENDING RECORDING** |

---

## 2. Short Project Description

> **Programmable USDC payment infrastructure for autonomous AI agents on Arc.**
>
> AgentPay separates intelligence from economic authority. AI agents reason about tasks and produce structured payment intents against an approved service registry. A deterministic Rust policy engine enforces daily budgets and per-transaction limits in sub-millisecond time. Upon authorization, on-chain smart contracts (`AgentVault.sol`) enforce limits and execute finalized USDC settlement on the Arc blockchain.

---

## 3. Arc-Specific Explanation

> **Why Arc?**
>
> AgentPay specifically chose Arc as its settlement network for three technical reasons:
> 1. **USDC-Native Gas Economics**: On standard EVM chains, automated agents must balance two tokens (native gas + stablecoins), creating friction and slippage. On Arc, gas is paid directly in USDC at the protocol layer, unifying gas and settlement into a single stable currency.
> 2. **EVM Compatibility (Chain ID `5042`)**: Arc supports standard Solidity smart contracts and Ethereum tooling (`go-ethereum`, Foundry) with predictable stablecoin accounting.
> 3. **Purpose-Built for Payments**: Arc provides high-throughput settlement without competing against speculative DeFi traffic, making it the ideal home for machine-to-machine micropayments.

---

## 4. Key Architectural Evidence Files
- **Final Architecture Diagram & Trust Boundaries**: [`docs/architecture-final.md`](architecture-final.md)
- **Payment Intent Finite State Machine**: [`docs/payment-state-machine.md`](payment-state-machine.md)
- **Why Arc Technical Rationale**: [`docs/why-arc.md`](why-arc.md)
- **Production Deployment Runbook**: [`docs/deployment.md`](deployment.md)
- **Full Security Threat Model**: [`docs/security.md`](security.md)
- **Known Limitations & Prototype Disclaimer**: [`docs/limitations.md`](limitations.md)
- **Final Production Audit**: [`docs/final-audit.md`](final-audit.md)
