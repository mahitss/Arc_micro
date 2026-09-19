# Arc Blockchain Network Reference & Safety Specification

> **Verification Date**: September 20, 2026  
> **Target Network**: Arc Mainnet (Circle L1, launched September 16, 2026)  
> **Live JSON-RPC Check**: Verified via `https://rpc.mainnet.arc.io` (`eth_chainId` returned `0x13b2` = `5042`)  
> **ERC-20 USDC Code Check**: Verified at `0x3600000000000000000000000000000000000000` (Bytecode size: 3,598 bytes)  
> **Authoritative Documentation**: [https://docs.arc.network](https://docs.arc.network)

---

## 1. Verified Network Configuration

| Parameter | Authoritative Value | Verification Method / Description |
|---|---|---|
| **Network Name** | Arc Mainnet | Stablecoin-native Layer 1 network designed for payments |
| **Chain ID** | `5042` | Confirmed via `eth_chainId` RPC call (`0x13b2`) |
| **Public RPC Endpoint** | `https://rpc.mainnet.arc.io` | Live verified JSON-RPC over HTTPS |
| **Block Explorer** | `https://explorer.arc.io` | Official Arc transaction and contract explorer |
| **Native Gas Currency** | USDC | Protocol-level gas currency (18 decimals) |
| **ERC-20 USDC Contract** | `0x3600000000000000000000000000000000000000` | Canonical ERC-20 interface (6 decimals, 3,598 bytes bytecode) |
| **Testnet Chain ID** | `5042002` | Testnet identifier (for non-production staging) |

---

## 2. USDC Dual Representation & Precision

On the Arc blockchain, USDC operates with dual representation:
1. **Native Gas Asset (18 Decimals)**: Used at the protocol level for gas accounting, validator fees, and base-layer transfers.
2. **ERC-20 Interface (6 Decimals)**: Exposed at `0x3600000000000000000000000000000000000000` for application-level smart contract operations (`AgentVault.executePayment`, `balanceOf`, `transfer`).

Both interfaces represent the exact same underlying balance. `AgentVault.sol` holds and transfers ERC-20 USDC in 6-decimal integer base units (e.g., `1_000_000` = 1.00 USDC, `180_000` = 0.18 USDC). Floating-point math is strictly forbidden across all contracts, policy engines, and gateways.

---

## 3. Execution Layer Safety Architecture

```
Client / AI
    ↓ (POST /v1/payments/execute)
Go Gateway
    ↓ (POST /v1/authorize)
Rust Policy Engine
    ↓ (ALLOW / DENY)
Go Gateway
    ↓ (ALLOW only)
Execution Service
    ↓ (EIP-1559 Transaction)
AgentVault.sol
    ↓ (usdc.safeTransfer)
Recipient (USDC)
```

### Safety Invariants

1. **Authorization Precedence**:
   Blockchain execution is NEVER initiated without prior explicit `ALLOW` from the authoritative Rust Policy Engine. If Rust returns `DENY`, no transaction is created or broadcast.
2. **Live Execution Gate (`ENABLE_LIVE_EXECUTION`)**:
   Production broadcast is disabled by default (`ENABLE_LIVE_EXECUTION=false`). When disabled, transaction preparation, address validation, and policy checks are executed, returning `status: "EXECUTION_DISABLED"` with the authorization decision.
3. **Chain ID Verification**:
   Before transaction broadcast, the execution service queries the connected RPC client for `eth_chainId` and verifies it matches `5042`. If there is a mismatch, the transaction is rejected immediately.
4. **Zero Key Exposure**:
   The `EXECUTOR_PRIVATE_KEY` is loaded strictly from environment variables or secret managers at runtime. It is never logged, never returned over HTTP, never sent to the frontend, and never committed to source control.
5. **Idempotency**:
   Payment requests are indexed by `request_id`. A request that is already confirmed or currently in flight cannot be submitted again, preventing duplicate transfers.
6. **Confirmation Verification**:
   Transactions are tracked until receipt confirmation (`status == 1`) and verified against the `PaymentExecuted` event.
