# Arc Mainnet Canary & Deployment Evidence

**Role:** AgentPay Mainnet Release Operator  
**Target Network:** Arc Mainnet (Chain ID `5042`)  
**RPC URL:** `https://rpc.mainnet.arc.io`  
**Native USDC Address:** `0x3600000000000000000000000000000000000000`  
**Execution Mode:** Mainnet Release Preflight (Real-Blockchain Operation)  
**Date:** September 25, 2026  

---

## 1. Preflight Safety Gate Summary

Under **Phase 0 (Stop Conditions)** and **Phase 3 (Owner Safety)** of the Mainnet Release Protocol, real-blockchain broadcast is strictly gated on non-fabricated operator credentials and secure ownership architecture.

The preflight safety checks identified missing runtime credentials in the deployment environment:
- `DEPLOYER_PRIVATE_KEY` / `PRIVATE_KEY`: **MISSING** (Not present in environment or `.env`)
- `DEPLOYER_ADDRESS`: **MISSING / UNCONFIGURED**
- Deployer Arc Gas Balance: **UNKNOWN / UNFUNDED**
- Expected Cold Multisig Owner: **UNSPECIFIED** (Would unsafely default to deployer address under `DeployAgentVault.s.sol`)

**Current Preflight Status:** **`BLOCKED — OPERATOR ACTION REQUIRED`**

---

## 2. Verified Network & Contract State

| Parameter | Current Value / State | Verification Source |
| :--- | :--- | :--- |
| **Chain ID** | `5042` | Query `eth_chainId` to `https://rpc.mainnet.arc.io` -> `0x13b2` (**VERIFIED**) |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` | HTTP 200 JSON-RPC 2.0 (**VERIFIED**) |
| **Latest Arc Block Height** | `22,650,747` | Query `eth_blockNumber` (**VERIFIED**) |
| **Native USDC Contract** | `0x3600000000000000000000000000000000000000` | Query `eth_getCode` returns active bytecode (**VERIFIED**) |
| **Configured Candidate Vault Address** | `0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852` | Query `eth_getCode` returns `0x` (**UNDEPLOYED**) |
| **Deployment Transaction** | `NONE` (Zero transactions broadcast) | Verified Arc RPC state |
| **Deployment Block** | `NONE` | Verified Arc RPC state |
| **Vault Owner** | `PENDING OPERATOR SPECIFICATION` | Phase 3 Safety Gate |
| **Hot Relayer** | `PENDING OPERATOR SPECIFICATION` | Phase 7 Separation Gate |
| **Vault USDC Balance** | `0.00 USDC` | Contract undeployed |
| **Canary Transaction** | `NONE` (Canary execution halted) | Phase 10 / Phase 12 Safety Gate |
| **Canary Amount** | `0.01 USDC` (Planned) | Phase 9 Funding Plan |
| **Canary Recipient** | `PENDING OPERATOR SPECIFICATION` | Phase 10 Safety Gate |
| **Receipt Status** | `NONE` | Preflight gate held |
| **Reconciliation Status** | `BLOCKED — AWAITING DEPLOYMENT` | Phase 14 |

---

## 3. Preflight Stop Condition Report

In accordance with Phase 0 rules:
```
STOP CONDITION TRIGGERED:
Missing:
1. DEPLOYER_PRIVATE_KEY / PRIVATE_KEY
2. DEPLOYER_ADDRESS
3. Deployer Arc Native Gas Balance
4. Explicit Vault Owner Address (Cold Multisig)
5. Explicit Authorized Canary Recipient Address
```

The operator must provide these variables to proceed with on-chain deployment. In adherence to Rule Zero and Mainnet Release Instructions, zero transactions were fabricated, zero contracts were mocked on live network, and zero unsafe default credentials were used.
