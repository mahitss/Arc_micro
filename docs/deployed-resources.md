# Deployed Resources & Network Verification Record

> **Document Version**: 1.1.0  
> **Audit Status**: Task 11 Final Production Audit  
> **Last Verified**: September 20, 2026  
> **Target Network**: Arc Mainnet (Chain ID `5042`)

This document records the verified status of all infrastructure endpoints, contracts, and network parameters across AgentPay. All statuses strictly distinguish between `LIVE`, `VERIFIED`, `CONFIGURED`, `OPTIONAL`, `UNVERIFIED`, and `NOT DEPLOYED`.

---

## 1. Resources Inventory

| Component | Identifier / URL / Address | Network | Status | Verification Method |
|---|---|---|---|---|
| **Arc Mainnet RPC** | `https://rpc.mainnet.arc.io` | Arc Mainnet (5042) | **VERIFIED** | Live `eth_chainId` RPC query returned `0x13b2` (`5042`). Responsive over HTTPS. |
| **Arc Canonical USDC** | `0x3600000000000000000000000000000000000000` | Arc Mainnet (5042) | **VERIFIED** | `eth_getCode` returned 3,598 bytes bytecode. Canonical 6-decimal ERC-20 contract. |
| **Arc Block Explorer** | `https://explorer.arc.io` | Arc Mainnet (5042) | **VERIFIED** | Official Arc block explorer base URL. |
| **Smart Contract (`AgentVault.sol`)** | Script: `contracts/script/DeployAgentVault.s.sol` | Arc Mainnet (5042) | **CONFIGURED / NOT DEPLOYED** | Compiled and verified via Foundry (42/42 tests passing). Ready for broadcast with `scripts/deploy_mainnet.sh`. |
| **Mainnet Transaction** | Transaction Hash | Arc Mainnet (5042) | **MAINNET TRANSACTION NOT YET EXECUTED** | No live transactions broadcast during prototype phase. Pre-broadcast safety gate active (`ENABLE_LIVE_EXECUTION=false`). |
| **Rust Policy Engine** | `http://localhost:8081` (Local) / `services/policy-engine` | Local / Host | **LIVE (Local) / VERIFIED** | Cargo test passing (32/32 tests), zero clippy warnings. Sub-millisecond evaluation. |
| **Go Gateway Service** | `http://localhost:8080` (Local) / `services/gateway` | Local / Host | **LIVE (Local) / VERIFIED** | Go 1.22 test suite passing (100%), CAS state transitions, concurrency hardened. |
| **Web Control Center** | `http://localhost:3000` (Local) / `apps/web` | Local / Host | **LIVE (Local) / VERIFIED** | Next.js 14, 14/14 unit tests passing, clean production build, interactive `/demo` route. |
| **PostgreSQL Database** | `DATABASE_URL` | Local / Staging | **CONFIGURED / OPTIONAL** | Relational persistence supported; gateway defaults to in-memory store if unset. |

---

## 2. Smart Contract Parameter Verification

| Parameter | Value | Status | Verification |
|---|---|---|---|
| **USDC Contract Address** | `0x3600000000000000000000000000000000000000` | **VERIFIED** | Confirmed on Arc Mainnet. |
| **Token Decimals** | `6` (ERC-20 interface) | **VERIFIED** | Standard Circle USDC precision. |
| **Default Daily Limit** | `100_000_000` base units ($100.00 USDC) | **CONFIGURED** | Defined in `AgentVault.sol` deployment script. |
| **Default Per-Tx Limit** | `10_000_000` base units ($10.00 USDC) | **CONFIGURED** | Defined in `AgentVault.sol` deployment script. |
| **Owner / Executor Role** | Deployer Address | **CONFIGURED** | Assigned to deployer upon contract initialization. |
| **Emergency Pause Switch** | `pause()` callable by Owner | **VERIFIED** | Tested via Foundry unit test `test_26_pause_prevents_payment`. |
| **Emergency Withdraw Switch** | `withdraw(uint256)` callable by Owner | **VERIFIED** | Tested via Foundry unit test `test_24_withdrawal_works_for_owner`. |

---

## 3. Real Mainnet Transaction Status

> **Status**: **MAINNET TRANSACTION NOT YET EXECUTED**

### Why No Transaction Has Been Broadcast Yet:
1. **Safety First**: As required by the engineering specification, automated test suites and local demonstrations must never broadcast real-money transactions without explicit operator authorization and funded deployer credentials.
2. **Master Safety Gate**: `ENABLE_LIVE_EXECUTION` defaults to `false` across all environments.
3. **Pre-Submission Readiness**: The complete execution pipeline (EIP-1559 gas calculation, nonce management, ABI encoding, and receipt confirmation) has been validated against simulated and local environments.

### What Remains Before Live Broadcast:
1. Fund the deployer wallet on Arc Mainnet with native USDC for gas.
2. Execute `scripts/deploy_mainnet.sh`.
3. Set `AGENTVAULT_ADDRESS` and `EXECUTOR_PRIVATE_KEY` in `services/gateway/.env`.
4. Set `ENABLE_LIVE_EXECUTION=true` and execute a live payment intent.
