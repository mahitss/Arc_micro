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

---

## Release Candidate 2 Addendum (`v1.0.0-rc.2`)

### RC2 Metadata
- **Release Target:** AgentPay Release Candidate 2 (`v1.0.0-rc.2`)
- **Frozen Commit:** `9575a7b64dff84fca686f96d99b21eea5f52d3c6`
- **Branch:** `main` (synchronized with `origin/main`)
- **CI Verification:** **100% Green / All 6 Jobs Passing** on GitHub Actions (`web`, `gateway`, `policy-engine`, `contracts`, `sdk-typescript`, `cli`)
- **Toolchain Baseline:**
  - Go `1.24` (`services/gateway/go.mod`, `.github/workflows/ci.yml`, `services/gateway/Dockerfile`)
  - Rust `1.85.0` (`services/policy-engine/Dockerfile`, `.github/workflows/ci.yml`)
  - Foundry `1.8.1` (`solc 0.8.24`) (`.github/workflows/ci.yml`, `contracts/foundry.toml`)
  - Node.js `20.x` (`npm ci`) (`.github/workflows/ci.yml`)

### RC2 Verified Test Counts
- **Total Local Verified Tests:** **696 passed, 0 failures**
  - Next.js Web: 533 passed (156 test suites, 80 static/dynamic routes compiled)
  - Go Gateway: 29 passed (across 8 internal and integration packages)
  - Rust Policy Core: 61 passed (9 unit tests, 52 integration tests)
  - TypeScript SDK: 33 passed
  - Python SDK: 26 passed
  - Operator CLI: 14 passed
*(Historical context: Initial Day 9 milestone at commit `451a819` verified 386 tests before integration expansion).*

### Settlement & Security Boundaries
- **Execution Mode:** `SIMULATION` (`ENABLE_LIVE_EXECUTION=false` strictly enforced)
- **Live Arc Broadcasts:** `0` (Zero live transactions signed or broadcast)
- **Real Settlements:** `0 VERIFIED` (Safe-mode / simulation only)
- **AgentVault (`AgentVault.sol`):** `NOT DEPLOYED ON MAINNET`
- **AWS KMS Live Integration:** `NOT VERIFIED AGAINST AWS` (Mock adapters & fail-closed tests only)
- **Production PostgreSQL RDS:** `NOT PROVISIONED` (Tested against local SQLite / in-memory only)

### RC2 Status Decision
$$\mathbf{RELEASE\ CANDIDATE\ FROZEN\ /\ CI\ VERIFIED\ /\ LIVE\ MAINNET\ BLOCKED}$$
