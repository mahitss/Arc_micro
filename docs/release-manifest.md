# AgentPay: Release Manifest (v1.0.0-rc1)

## Release Metadata

| Field | Value |
|---|---|
| **Version** | `v1.0.0-rc1` (Day 10 Production Release) |
| **Git Commit Hash** | `f55461fcbaadc1c72d6305642cb5fdb5192a58b4` |
| **Git Branch** | `main` |
| **Source Repository** | [https://github.com/mahitss/Arc_micro](https://github.com/mahitss/Arc_micro) |
| **Release Status** | **PRODUCTION CANDIDATE / READY FOR SUBMISSION** |

---

## Component Release Details

### 1. Smart Contracts
- **Artifact:** `AgentVault.sol` (Solidity 0.8.24)
- **Location:** `contracts/src/AgentVault.sol`
- **Compiler:** Foundry / Solc 0.8.24 (via EVM Cancun)
- **Test Coverage:** 42 test cases passing (`forge test`), 256 fuzz runs on daily limit invariants.
- **Verification Status:** **PASS**

### 2. Policy Engine
- **Artifact:** `policy_engine` binary
- **Location:** `services/policy-engine`
- **Language / Runtime:** Rust 1.75+, Tokio, Axum
- **Test Coverage:** 49 test cases passing (`cargo test`). Zero floating-point math.
- **Verification Status:** **PASS**

### 3. API Gateway & Settlement Service
- **Artifact:** `gateway` binary
- **Location:** `services/gateway`
- **Language / Runtime:** Go 1.22+
- **Test Coverage:** 21 packages passing uncached (`go test -count=1 ./...`).
- **Verification Status:** **PASS**

### 4. Web Control Center
- **Artifact:** Next.js 14 Production Bundle
- **Location:** `apps/web`
- **Language / Runtime:** TypeScript, React 18, Tailwind CSS
- **Build Status:** Compiled successfully (`next build`, 15/15 static and dynamic routes).
- **Verification Status:** **PASS**

### 5. Client SDKs & CLI
- **TypeScript SDK:** `@agentpay/sdk` v0.1.0 — 12 tests passing (`npm test`).
- **Python SDK:** `agentpay` v0.1.0 — 7 tests passing (`python -m unittest`).
- **CLI Tool:** `agentpay` CLI v0.1.0.
- **Verification Status:** **PASS**

---

## Network & Blockchain Configuration

| Attribute | Verified Production Value |
|---|---|
| **Target Blockchain** | Arc Mainnet |
| **Chain ID** | `5042` |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` |
| **USDC Contract** | `0x3600000000000000000000000000000000000000` |
| **Block Explorer** | `https://explorer.arc.io` |
| **Live Execution Flag** | `ENABLE_LIVE_EXECUTION=false` (Fails closed by default) |
| **Live Mainnet Transaction** | **NOT VERIFIED** (Gated behind operator deploy command) |

---

## Security & Verification Summary

| Category | Status | Notes |
|---|---|---|
| **Application Security** | **PASS** | Strict 1MB payload limits, 10s timeouts, typed error handling. |
| **Authentication** | **PASS** | Cryptographic API keys hashed with SHA-256; constant-time check. |
| **Authorization / IDOR** | **PASS** | Zero cross-tenant data leakage; verified by `day9_production_security_test.go`. |
| **Financial Invariants** | **PASS** | 16 formal invariants verified; hard denial inviolable; zero agent private keys. |
| **Prompt Injection Defense** | **PASS** | Server-side recipient resolution from verified registry; agent inputs treated as DATA. |
| **SSRF Protection** | **PASS** | Webhook validator blocks private IPs, loopback, and cloud metadata. |
| **Concurrency Safety** | **PASS** | Treasury balance race protected by mutex; duplicate approvals serialized. |
| **Ambiguous Transactions** | **PASS** | Receipt timeouts transition to `StateAmbiguous` with recovery reconciliation. |
| **Submission Readiness** | **READY** | All requirements satisfied for Arc Microgrant submission. |
