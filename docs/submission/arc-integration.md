# AgentPay v1.0 — Arc Blockchain Integration (Submission)
**Classification:** Arc Integration & Settlement Architecture  

---

## 1. Network Parameters

AgentPay settles value in native USDC on **Arc Mainnet**:

| Parameter | Configuration | Live Verification Status |
|---|---|---|
| **Network** | Arc Mainnet | `VERIFIED LIVE` |
| **Chain ID** | `5042` | `VERIFIED LIVE` (`0x13b2`) |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` | `VERIFIED LIVE` (Block #22,572,770) |
| **Native USDC Contract** | `0x3600000000000000000000000000000000000000` | `VERIFIED LIVE` (Active Bytecode) |
| **Block Explorer** | `https://explorer.arc.io` | `VERIFIED LOCAL` |

---

## 2. On-Chain Smart Contract: `AgentVault.sol`

`AgentVault.sol` provides on-chain spending enforcement:
- **Per-Transaction Spending Limit**: Hard cap enforced on every individual payment.
- **Daily Calendar Budget**: Resets automatically when the UTC epoch day rolls over.
- **Daily Transaction Velocity**: Limits maximum payment frequency per day.
- **Recipient Allowlist & Blocklist**: Blocked addresses can never receive funds.
- **Emergency Controls**: Pausable by owner; emergency `withdraw()` remains active during pause for capital safety.

---

## 3. Fail-Closed Deployment

Live execution is guarded by `ENABLE_LIVE_EXECUTION=true` and requires verified contract addresses. In the absence of live operator credentials, the system runs safely in deterministic simulation mode.
