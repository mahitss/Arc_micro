# Why Arc? Factual Architecture & Economic Rationale

> **Document Version**: 1.0.0  
> **Target Network**: Arc Mainnet (Chain ID `5042`)  
> **Reference RPC**: `https://rpc.mainnet.arc.io`  
> **Verified USDC Contract**: `0x3600000000000000000000000000000000000000`

---

## 1. The Problem: Autonomous Agents Require Economic Boundaries

Autonomous AI agents can formulate plans, invoke external APIs, and make computational decisions. However, granting an AI agent direct, unconstrained access to a cryptocurrency wallet introduces catastrophic operational risk:

- **Prompt Injections & Tool Hijacking**: An adversarial prompt or compromised upstream data feed can trick an LLM into sending arbitrary transactions.
- **Runaway Loops & Cost Spirals**: Buggy agent logic or recursive sub-agent invocations can deplete account balances in seconds.
- **Lack of Governance**: Traditional wallets lack programmatic, deterministic spending limits, daily budget enforcement, or server-side service allowlists.

For AI agents to participate safely in machine-to-machine commerce, economic authority must be separated from intelligence: the AI creates an **intent**, a deterministic policy engine **authorizes** or **denies** it, and a smart contract executes **settlement**.

---

## 2. Why Stablecoin Payments?

Autonomous agents need predictable accounting:

- **Eliminating Volatility Risk**: Operating expenses for APIs, data feeds, and compute clusters are denominated in fiat equivalents (USD). Denominating agent spending in volatile native gas tokens (like ETH, SOL, or AVAX) introduces exchange-rate slippage, unpredictable budgeting, and complex tax accounting.
- **Deterministic Unit Economics**: With USDC, an agent operator can allocate exactly `$5.00` or `$50.00` per day with complete certainty over purchasing power.
- **Standardized Machine Pricing**: External services can charge fixed micro-prices (e.g., `0.18 USDC` for a search query or `0.05 USDC` for an inference call) without needing continuous dynamic pricing or oracle recalculations.

---

## 3. Why Programmable Settlement?

Simple off-chain credit systems (like centralized API keys or corporate credit cards) fail to meet the requirements of open, autonomous agent networks:

- **Counterparty Risk & Custody**: An agent operating in an untrusted environment cannot be trusted with custodial credit card credentials.
- **On-Chain Enforcement**: Smart contracts provide an immutable, non-bypassable execution boundary. In AgentPay, `AgentVault.sol` enforces that even if the off-chain gateway were fully compromised, withdrawals and payments cannot exceed the hard on-chain daily limit or transfer to unapproved recipients.
- **Verifiable Audit Trail**: Every economic action creates an on-chain receipt with a distinct transaction hash, block number, and emitted event (`PaymentExecuted`), enabling automated reconciliation and auditing.

---

## 4. Why Arc?

AgentPay specifically chose Arc as its settlement layer due to fundamental architectural alignments with payment-oriented systems:

### 1. USDC-Native Transaction Economics
On standard EVM networks, transactions require two separate tokens: a native gas token (such as ETH or MATIC) and the stablecoin itself (USDC). This creates a dual-asset management burden for automated agent fleets, requiring gas-refueling faucets, swap routers, and slippage buffers.

On Arc, **USDC is the native gas asset**. Gas fees are paid directly in USDC at the protocol level (18 decimals), while contract storage and token balances operate via the canonical ERC-20 interface (6 decimals at `0x3600000000000000000000000000000000000000`). This unifies gas and settlement into a single stable currency.

### 2. EVM Compatibility (Chain ID `5042`)
Arc provides standard Ethereum Virtual Machine (EVM) execution semantics. This allows AgentPay to deploy standard Solidity smart contracts (`AgentVault.sol`), use industry-standard tooling (Foundry, `forge`, `cast`), and interface with established client libraries (Go `go-ethereum`, TypeScript `viem`/`ethers`).

### 3. Purpose-Built for Payments
Arc is architected specifically as a payment-oriented settlement layer. Rather than competing for blockspace with speculative NFT mints or complex DeFi liquidations, Arc provides a dedicated environment for stablecoin value transfer and machine-to-machine settlement.

---

## 5. What AgentPay Specifically Uses Arc For

AgentPay uses Arc strictly for deterministic on-chain operations:

1. **Vault Custody (`AgentVault.sol`)**:
   Holds USDC reserves assigned to specific autonomous agents.
2. **On-Chain Policy Guardrails**:
   Enforces daily spending limits, per-transaction maximums, and operator pause switches directly in the EVM state.
3. **Deterministic Settlement (`executePayment`)**:
   Transfers verified USDC base units to registered service recipients upon receipt of cryptographic authorization from the Go Gateway and Rust Policy Engine.
4. **Transparent Verification**:
   Emits `PaymentExecuted(bytes32 indexed intentId, address indexed recipient, uint256 amount, uint256 fee)` events on Arc for immutable indexing and verification by external auditors.
