# Why Arc? Factual Architecture & Economic Rationale

> **Target Network**: Arc Mainnet (Chain ID `5042`)  
> **Reference RPC**: `https://rpc.mainnet.arc.io`  
> **Native USDC Contract**: `0x3600000000000000000000000000000000000000`

---

## 1. The Autonomous Agent Economic Challenge

Autonomous AI agents can formulate plans, invoke external APIs, and make computational decisions. However, granting an AI agent direct, unconstrained access to a cryptocurrency wallet introduces catastrophic operational risk:
- **Prompt Injections & Tool Hijacking**: An adversarial prompt or compromised upstream data feed can trick an LLM into sending arbitrary transactions.
- **Runaway Loops & Cost Spirals**: Buggy agent logic or recursive sub-agent invocations can deplete account balances in seconds.
- **Lack of Governance**: Traditional wallets lack programmatic, deterministic spending limits, daily budget enforcement, or server-side service allowlists.

For AI agents to participate safely in machine-to-machine commerce, economic authority must be separated from intelligence: the AI creates an **intent**, a deterministic policy engine **authorizes** or **denies** it, and a smart contract executes **settlement**.

---

## 2. Why Arc as the Settlement Layer?

AgentPay specifically chose Arc as its settlement layer due to fundamental architectural alignments with payment-oriented systems:

### 1. USDC-Native Transaction Economics
On standard EVM networks, transactions require two separate tokens: a native gas token (such as ETH or MATIC) and the stablecoin itself (USDC). This creates a dual-asset management burden for automated agent fleets, requiring gas-refueling faucets, swap routers, and slippage buffers.

On Arc, **USDC is the native gas asset**. Gas fees are paid directly in USDC at the protocol level (18 decimals), while contract storage and token balances operate via the canonical ERC-20 interface (6 decimals at `0x3600000000000000000000000000000000000000`). This unifies gas and settlement into a single stable currency.

### 2. EVM Compatibility (Chain ID `5042`)
Arc provides standard Ethereum Virtual Machine (EVM) execution semantics. This allows AgentPay to deploy standard Solidity smart contracts (`AgentVault.sol`), use industry-standard tooling (Foundry, `forge`, `cast`), and interface with established client libraries (Go `go-ethereum`, TypeScript `viem`/`ethers`).

### 3. Purpose-Built for Payments
Arc is architected specifically as a payment-oriented settlement layer. Rather than competing for blockspace with speculative NFT mints or complex DeFi liquidations, Arc provides a dedicated environment for stablecoin value transfer and machine-to-machine settlement.

---

## 3. What AgentPay Uses Arc For

1. **Vault Custody (`AgentVault.sol`)**: Holds USDC reserves assigned to specific autonomous agents.
2. **On-Chain Policy Guardrails**: Enforces daily spending limits, per-transaction maximums, and operator pause switches directly in the EVM state.
3. **Deterministic Settlement (`executePayment`)**: Transfers verified USDC base units to registered service recipients upon receipt of cryptographic authorization from the Go Gateway and Rust Policy Engine.
4. **Transparent Verification**: Emits `PaymentExecuted` events on Arc for immutable indexing and verification by external auditors.

---

## 4. Current Verified Arc Status (Truth Disclosure)

- **Architecture Positioning:** AgentPay is architected specifically for Arc Mainnet settlement.
- **RPC Availability:** Connected to `https://rpc.mainnet.arc.io` (Chain ID `5042`, Block #23,401,027+).
- **Native USDC:** Verified on-chain at `0x3600000000000000000000000000000000000000`.
- **AgentVault Status:** The reference smart contract `AgentVault.sol` is compiled and verified in Foundry simulation; it is **NOT DEPLOYED ON MAINNET** (`0x` bytecode confirmed via `eth_getCode`).
- **Live Broadcasts:** 0. All mission runs operate in strict deterministic `SIMULATION` mode (`ENABLE_LIVE_EXECUTION=false`).
