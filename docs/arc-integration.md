# Arc Integration: Technical Rationale & Settlement Architecture

## Executive Summary

AgentPay selects the **Arc Network** as its authoritative on-chain settlement layer. 
AgentPay's core thesis is:

```
AI requests (Reasoning)
       ↓
AgentPay controls (Deterministic Policy + Risk + Treasury)
       ↓
Arc settles (Verifiable On-Chain Execution)
```

This document details the architectural, economic, and technical reasons why AgentPay leverages Arc for autonomous AI agent transactions.

---

## 1. Native USDC Settlement

### The Problem in Traditional Chains
Autonomous AI agents paying for computational resources, APIs, and data feeds require predictable, stable economic units. Transacting in volatile gas tokens (ETH, SOL, AVAX) introduces severe financial risk:
- Quote volatility between agent decision time and block confirmation.
- High conversion friction and slippage across automated swaps.
- Complex accounting and taxable event tracking for autonomous microtransactions.

### The Arc Solution
- Arc provides **native, frictionless USDC settlement** (`0x3600000000000000000000000000000000000000`).
- AgentPay's smart contract (`AgentVault.sol`) settles microtransactions directly in base units (micro-USDC, 6 decimals).
- 1 base unit = $0.000001 USDC. An AI agent paying $0.0018 for a web search or $0.025 for an embedding query settles directly in exact USD-denominated values with zero exchange rate slippage.

---

## 2. Programmable Agent Vaults (`AgentVault.sol`)

AgentPay deploys smart-contract-enforced treasury vaults directly on Arc:

```solidity
contract AgentVault is Ownable, Pausable {
    IERC20 public immutable usdcToken;
    Policy public policy;
    mapping(address => bool) public allowedRecipients;
    mapping(address => bool) public blockedRecipients;

    function executePayment(
        address recipient,
        uint256 amount,
        string calldata purpose
    ) external onlyOwner whenNotPaused returns (bool);
}
```

### Key Security Benefits on Arc:
1. **On-Chain Policy Mirroring:** Smart contract enforces per-transaction limits, daily spending ceilings, and daily transaction counts directly in EVM state.
2. **Deterministic Daily Resets:** The contract resets daily spend counters based on UTC midnight timestamp transitions (`block.timestamp / 86400`).
3. **Defense-in-Depth Allowlisting:** Even if the Gateway server were compromised, the on-chain contract reverts any payment to an address not previously allowlisted or explicitly blocked by the contract owner.
4. **Non-Custodial for Agents:** The AI agent never signs or interacts directly with the vault; only the authorized Gateway controller or contract owner can execute payments.

---

## 3. Verifiable On-Chain Auditability

Every economic action executed by an autonomous agent on AgentPay produces cryptographic evidence on Arc:

1. **Transaction Hashes:** Immutable proof of transfer queryable on the Arc Explorer (`https://explorer.arc.io/tx/{txHash}`).
2. **On-Chain Events:** `AgentVault` emits structured `PaymentExecuted` events on Arc:
   ```solidity
   event PaymentExecuted(
       address indexed recipient,
       uint256 amount,
       string purpose,
       uint256 timestamp
   );
   ```
3. **Reconciliation & Ambiguity Elimination:** If an off-chain network timeout occurs during transaction broadcast, AgentPay uses Arc's JSON-RPC (`eth_getTransactionReceipt`) to independently verify whether the transaction was included in a block before settling off-chain treasury reservations.

---

## 4. Cost Efficiency for Agent Microtransactions

Autonomous agent workflows frequently perform high-frequency micro-payments (e.g., $0.005 for tool execution, $0.01 for context extraction). High transaction fees on Ethereum L1 ($1.00 - $15.00) render agent micro-economies economically infeasible.

Arc's gas model provides predictable, low transaction costs that allow sub-dollar payments to remain commercially viable without the fee exceeding the principal value.

---

## 5. Summary of Verified Mainnet Parameters

| Parameter | Value | Verification Status |
|---|---|---|
| **Network** | Arc Mainnet | Verified in deployment scripts & contracts |
| **Chain ID** | `5042` | Verified via RPC pre-flight checks |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` | Verified gateway client configuration |
| **USDC Contract** | `0x3600000000000000000000000000000000000000` | Native Arc standard |
| **Block Explorer** | `https://explorer.arc.io` | Verified link formatting in UI & API |
| **Smart Contract** | `contracts/src/AgentVault.sol` | 42 Foundry test cases passing |
