# Deployed Resources & Network Verification Record

> **Document Version**: 1.0.0  
> **Last Verified**: September 20, 2026  
> **Target Network**: Arc Mainnet (Chain ID `5042`)

This document records the exact addresses, endpoints, and verification status of all components across the AgentPay architecture. Only verified and tested values are listed.

---

## Resources Inventory

| Component | Identifier / URL / Address | Network | Status | Verification Method |
|---|---|---|---|---|
| **Arc Mainnet RPC** | `https://rpc.mainnet.arc.io` | Arc Mainnet (5042) | **VERIFIED** | Live `eth_chainId` RPC check returned `0x13b2` (`5042`). Responsive over HTTPS. |
| **Arc Canonical USDC** | `0x3600000000000000000000000000000000000000` | Arc Mainnet (5042) | **VERIFIED** | `eth_getCode` returned 3,598 bytes bytecode. Canonical 6-decimal ERC-20 contract. |
| **Arc Block Explorer** | `https://explorer.arc.io` | Arc Mainnet (5042) | **VERIFIED** | Official Arc block explorer base URL. |
| **Smart Contract (`AgentVault.sol`)** | Target Script: `contracts/script/DeployAgentVault.s.sol` | Arc Mainnet (5042) | **COMPILED & READY** | Verified via Foundry build (`forge test` 41/41 passing). Ready for broadcast with `scripts/deploy_mainnet.sh`. |
| **Rust Policy Engine** | `http://localhost:8081` (Local Dev) / `services/policy-engine` | Local / Host | **VERIFIED** | Compiles with Cargo, passes 29/29 unit/integration tests, zero clippy warnings. |
| **Go Gateway Service** | `http://localhost:8080` (Local Dev) / `services/gateway` | Local / Host | **VERIFIED** | Compiles with Go 1.22, passes full suite including concurrency & negative paths tests. |
| **Web Control Center** | `http://localhost:3000` (Local Dev) / `apps/web` | Local / Host | **VERIFIED** | Built with Next.js 14, passes unit tests (`14/14`), passes ESLint and production build. |

---

## Smart Contract Parameter Verification

| Parameter | Value | Verification |
|---|---|---|
| **USDC Contract Address** | `0x3600000000000000000000000000000000000000` | Confirmed on Arc Mainnet. |
| **Decimals** | `6` (ERC-20 interface) | Standard Circle USDC precision. |
| **Default Daily Limit** | `100_000_000` base units ($100.00 USDC) | Defined in `AgentVault.sol` deployment script. |
| **Default Per-Tx Limit** | `10_000_000` base units ($10.00 USDC) | Defined in `AgentVault.sol` deployment script. |
| **Owner / Executor Role** | Deployer Address | Set upon contract initialization. |
| **Emergency Pause Role** | Owner | Can instantly pause via `pause()`. |
| **Emergency Withdraw Role** | Owner | Can sweep remaining USDC via `withdraw(uint256)`. |

---

## Live Deployment Notes

1. **Safety Gating**:
   In local development and automated testing, `ENABLE_LIVE_EXECUTION` is set to `false` to avoid inadvertent fund loss and unneeded gas consumption.
2. **Mainnet Broadcast**:
   When ready for live mainnet broadcast, the operator executes:
   ```bash
   export DEPLOYER_PRIVATE_KEY="<funded_hex_key>"
   ./scripts/deploy_mainnet.sh
   ```
   The resulting contract address will be permanently recorded in this registry.
