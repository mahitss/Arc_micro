# AgentPay v1.0 — Arc Mainnet Preflight Evidence Report
**Document ID:** `docs/arc-preflight-evidence.md`  
**Classification:** Preflight Network Verification Evidence  
**Auditor:** Release Engineer & Security Lead, AgentPay  
**Verification Date:** 2026-09-25T01:46:14Z  

---

## 1. Network Connectivity & Chain Invariants

Machine-tested directly against the configured production RPC endpoint:

| Parameter | Configured Value | Live Observed Response | Status |
|---|---|---|---|
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` | HTTPS/1.1 200 OK (Cloudflare Edge) | `VERIFIED LIVE` |
| **Chain ID** | `5042` | `0x13b2` (5042 decimal) | `VERIFIED LIVE` |
| **Latest Block Number** | N/A | `0x1586ee2` (Block #22,572,770) | `VERIFIED LIVE` |
| **Native USDC Address** | `0x3600...0000` | Bytecode verified (`eth_getCode` > 0 bytes) | `VERIFIED LIVE` |
| **Block Explorer** | `https://explorer.arc.io` | Configured | `VERIFIED LOCAL` |

---

## 2. Deployer & Live Execution Preconditions

| Precondition | Current Observed State | Status | Impact & Action Required |
|---|---|---|---|
| **Deployer Key** | `EXECUTOR_PRIVATE_KEY` is empty | `OPERATOR ACTION REQUIRED` | No live private keys present in repository or CI environment. |
| **Deployer Balance** | N/A (Key not configured) | `OPERATOR ACTION REQUIRED` | Operator must supply funded account with native Arc gas tokens. |
| **AgentVault Deployment**| `AGENTVAULT_ADDRESS` is empty | `OPERATOR ACTION REQUIRED` | Smart contract must be broadcast to Arc Mainnet by operator. |
| **Live Execution Flag** | `ENABLE_LIVE_EXECUTION=false` | `VERIFIED LOCAL` | System is strictly fail-closed; live execution blocked until prerequisites met. |

---

## 3. Preflight Conclusion

- **Network Compatibility**: `VERIFIED LIVE`. Arc Mainnet is reachable, chain ID matches 5042, and native USDC contract bytecode is verified on-chain.
- **Broadcast Readiness**: `FAIL-CLOSED`. Deployment and live canary payments remain operator-gated to prevent unauthorized execution or fabricated credentials.
