# AgentPay v1.0.0-rc — Release Manifest

---

## Metadata

- **Release Name:** AgentPay Autonomous Economic Fabric v1.0 Release Candidate
- **Version:** `v1.0.0-rc`
- **Release Target:** Hackathon Submission & Operator Evaluation
- **Target Network:** Arc Mainnet (Chain ID `5042`)
- **Native Asset:** USDC (`0x3600000000000000000000000000000000000000`)
- **License:** Apache-2.0

---

## Build & Test Status

- **Web Application (`apps/web`):** `PASS` (Next.js 14, 79 static/dynamic routes compiled)
- **Go API Gateway (`services/gateway`):** `PASS` (35 packages passed, binary compiled)
- **Rust Policy Core (`services/policy-engine`):** `PASS` (57 tests passed, release binary built)
- **TypeScript SDK (`packages/sdk-typescript`):** `PASS` (33 tests passed)
- **Python SDK (`packages/sdk-python`):** `PASS` (26 tests passed)
- **Operator CLI (`packages/cli`):** `PASS` (14 suites passed, binary verified)
- **Total Verified Tests:** **386 passed, 0 failures, 0 regressions**

---

## Settlement & Security Status

- **Arc RPC Connection:** `ONLINE` (`https://rpc.mainnet.arc.io`, Block #23,401,027)
- **Native USDC Contract:** `VERIFIED ON-CHAIN` (3,598 bytes bytecode)
- **AgentVault (`AgentVault.sol`):** `NOT DEPLOYED ON MAINNET` (`0x` bytecode)
- **Execution Mode:** `SIMULATION` (`ENABLE_LIVE_EXECUTION=false`)
- **Live Broadcasts:** `0` (Zero transactions broadcast to Arc)
- **Real Settlements:** `0 VERIFIED` (All executions operate in simulation)
- **Hardware KMS Custody:** `NOT IMPLEMENTED` (`KMSSigner` fails closed)
- **Database Safety Gate:** `ENFORCED` (Refuses memory storage in production)
- **AI Authority Boundary:** `ENFORCED` (AI agents hold 0 private keys)
- **Inviolable HARD_DENY:** `ENFORCED` (`INV-46` cannot be bypassed)

---

## Known Blockers for Live Mainnet Funds

1. **Cold Multi-Sig Deployment:** Deployment of `AgentVaultV2` with multi-sig role separation is required before depositing unrestricted live enterprise capital.
2. **Cloud HSM / KMS Key Custody:** Enterprise integration with AWS KMS / GCP Cloud HSM is pending; local signer with calldata binding is used for development.

---

## Release Decision

$$\mathbf{SUBMISSION\ READY\ /\ DEMO\ READY\ /\ OPERATOR\ BLOCKED\ (FOR\ LIVE\ MAINNET\ FUNDS)}$$
