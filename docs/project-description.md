# AgentPay Project Descriptions & Positioning Options

This document provides standardized, factual project descriptions of varying lengths for use across grant applications, directory listings, and documentation.

---

### One Sentence
AgentPay is programmable USDC payment infrastructure that lets autonomous AI agents request payments while deterministic policies and on-chain controls govern whether funds can move.

---

### 50-Word Description
AgentPay is programmable USDC payment infrastructure for autonomous AI agents on Arc. It decouples reasoning from spending authority: AI agents formulate structured payment intents for approved services, a deterministic Rust policy engine evaluates spending limits, and an on-chain smart contract (AgentVault) executes safe USDC settlement directly on the Arc blockchain.

---

### 100-Word Description
Autonomous AI agents need economic authority to purchase computation, APIs, and data feeds, but granting LLMs direct wallet access risks catastrophic prompt injections and runaway spending. AgentPay provides a deterministic financial firewall for agent commerce. 

AI agents submit structured payment intents to an approved service catalog. An independent, deterministic Rust policy engine evaluates per-transaction caps and daily budgets in sub-millisecond time. Upon authorization, a Go Gateway coordinates execution via atomic database locks, and an on-chain Solidity vault enforces hard spending limits and settles USDC on Arc. AgentPay ensures that AI can request payments without holding uncontrolled financial power.

---

### Technical Description
AgentPay is a multi-tier payment orchestration system comprising a Next.js 14 Web Control Center, Go 1.22 API Gateway, deterministic Rust 1.78 Policy Engine, and Solidity 0.8.24 smart contracts (`AgentVault.sol`) targeting Arc Mainnet (Chain ID `5042`). 

The AI reasoning layer is treated as untrusted input; recipient addresses are resolved strictly server-side from an authorized Service Registry. The policy engine uses checked integer arithmetic (`u64`) to enforce daily and per-transaction limits with zero side effects. The Go execution gateway employs atomic Compare-And-Swap (CAS) state transitions to prevent double-spending, while `AgentVault` enforces immutable on-chain spending guardrails and emits audited events upon USDC settlement.

---

### Arc-Specific Description
AgentPay uses Arc as its native settlement layer for USDC-denominated agent payments. Unlike standard EVM networks where automated agents must manage two assets (native gas + stablecoins), Arc's protocol-level architecture uses USDC as the native gas asset. This enables an agent funded with USDC to pay for both external service fees and transaction gas from a single balance without exchange-rate volatility or slippage. Combined with sub-second EVM finality, Arc provides the ideal settlement foundation for high-frequency, machine-to-machine micropayments.
