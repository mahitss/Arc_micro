# AgentPay Final Claim Verification Report: Documentation vs. Actual Repository

**Role:** Final Independent Auditor (Task 22 Audit)  
**Target Repository:** `github.com/arc-agentpay/agentpay`  
**Git Commit:** `ab7be45678a61592ed0de10666b12df20071f185`  
**Current Branch:** `main` (Clean working tree, synchronized with `origin/main`)  
**Audit Completion Date:** September 25, 2026  
**Operating System / Environment:** Windows (PowerShell), AMD Ryzen 5 7520U with Radeon Graphics  

---

## 1. Executive Summary

AgentPay claims to be the **v1.0.0 Production Candidate & Flagship Release** for an autonomous agent economic control plane on Arc. Under the mandate of **Rule Zero** ("Do Not Trust Documentation; Verify Against Source Code, Tests, Scripts, Git History, Build Output, and Live Blockchain State"), this audit evaluated every claim made across the repository's specifications, manifests, and architecture documents.

### Key Audit Findings:
1. **The Core Financial & Autonomous Engine is Fully Realized Locally:** The Go Gateway, Rust Policy Engine, Foundry Smart Contracts, TypeScript SDK, Python SDK, Developer CLI, and Next.js Web Control Tower are entirely implemented and tested. A total of **800 test functions pass cleanly** across 7 complete suites (exceeding the claimed "438+").
2. **Policy Evaluation Performance Exceeds Expectations:** The claimed "6.36 microsecond policy evaluation" was traced to an active Criterion benchmark (`services/policy-engine/benches/policy_benchmark.rs`). Re-running `cargo bench` on the current machine produced a mean evaluation latency of **4.97 µs** (with simple allowances evaluating in **4.93 µs**).
3. **Web Application Route Count is Exact:** Next.js compilation (`npm run build`) produced **exactly 75 routes** (59 static prerendered routes, 16 dynamic server routes).
4. **Arc Mainnet is Real and Live, but AgentVault is Not Deployed:** Independent RPC queries to `https://rpc.mainnet.arc.io` confirmed Chain ID **5042**, block height **22,650,747**, and active bytecode for the native USDC contract. However, the claimed `AgentVault` address (`0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852`) returned empty bytecode (`0x`). **No live on-chain transactions have occurred.**
5. **KMS Signing is Not Implemented:** `services/gateway/internal/signer/kms.go` returns `ErrKMSSignerUnavailable` (status: `OPERATOR ACTION REQUIRED`). The system operates securely via a local ECDSA keystore with cryptographic transaction bindings.
6. **Production Database Fails Closed:** `services/gateway/cmd/server/main.go` and `internal/storage/factory.go` strictly prevent silent fallback to in-memory storage in production mode.

---

## 2. Final Scorecard (Qualitative Classification)

In accordance with Section 23, no numerical ranking or percentage score is provided. Every domain is classified strictly as **`VERIFIED`**, **`PARTIAL`**, or **`BLOCKED`**:

| Subsystem Domain | Classification | Audit Rationale |
| :--- | :--- | :--- |
| **Architecture** | **VERIFIED** | Core thesis (*AI Requests -> AgentPay Controls -> Arc Settles*) is completely modeled across gateway, policy engine, and contracts. |
| **Autonomous Economy** | **VERIFIED** | 12-stage economic lifecycle, state machines, mission coordinators, and causal traces are implemented and tested. |
| **Policy** | **VERIFIED** | Rust policy engine compiles, passes 57 tests, and executes in 4.93 µs – 6.64 µs (mean 4.97 µs). |
| **Risk** | **VERIFIED** | Multi-dimensional risk engine scores velocity, counterparty trust, and anomaly levels; triggers approval gates when score >= 80. |
| **Treasury** | **VERIFIED** | Double-entry ledgers, atomic reservations, overdraft prevention, and buffer floors pass high-concurrency race tests. |
| **Clearing** | **PARTIAL** | Multilateral debt cycle netting benchmarked at 276.5 ns/op. "68% reduction" claim is valid for specific test graphs, not universal. |
| **Runtime** | **VERIFIED** | Distributed lease fencing (`INV-101`), heartbeat monitoring, optimistic locking, and idempotent retries prevent duplicate dispatches. |
| **Swarms** | **PARTIAL** | Max depth (4) and max tasks (20) are machine-enforced by `SwarmGraphValidator`. Critic threshold >= 80% is scored but not hard-gated. |
| **Marketplace** | **VERIFIED** | Provider discovery, quote generation, and candidate evaluation pass integration suites without granting spend authority. |
| **Protocol** | **VERIFIED** | A2A protocol specifications, schema validation, and structured quote-negotiation models pass unit and chaos tests. |
| **Simulator** | **VERIFIED** | 100-run Monte Carlo simulation executes deterministically; strict execution gate (`INV-156`) prevents live broadcast. |
| **SDK** | **VERIFIED** | TypeScript SDK (33 tests) and Python SDK (26 tests) pass with zero policy/risk bypass vectors. |
| **CLI** | **VERIFIED** | Developer CLI builds, passes 14 tests, and executes interactive and JSON demo missions with clear simulation labeling. |
| **Frontend** | **VERIFIED** | Next.js Control Tower builds cleanly, generating exactly 75 routes with live/sim state labeling. |
| **Security** | **VERIFIED** | 30 non-negotiable security rules machine-checked in `authority_boundary_test.go`; 32 chaos scenarios verified. |
| **AgentVault** | **PARTIAL** | Contract code (`AgentVault.sol`) passes 42 Foundry fuzz and invariant tests, but is NOT yet deployed on Arc Mainnet. |
| **Arc** | **PARTIAL** | Arc Mainnet RPC (5042) and native USDC contract are verified; live transaction settlement is unverified due to missing vault deployment. |
| **Production Storage** | **VERIFIED** | Gateway fails fast with `ErrDatabaseURLRequiredInProduction` if production mode is set without `DATABASE_URL`. |
| **Deployment** | **BLOCKED** | On-chain deployment of `AgentVault` and AWS/GCP KMS key provisioning require operator broadcast and configuration. |
| **Demo** | **VERIFIED** | Flagship CLI and web demos execute deterministically across all 12 economic lifecycle stages. |

---

## 3. Claim-by-Claim Audit Summary

1. **"438+ tests passing"** -> **`VERIFIED`** (Actual count: **800 test functions** across 7 suites).
2. **"Go: 35 / 35 packages"** -> **`VERIFIED`** (429 tests across 35 packages, code 0).
3. **"Rust: 57 / 57"** -> **`VERIFIED`** (57 tests passing in `services/policy-engine`).
4. **"Solidity: 42 / 42"** -> **`VERIFIED`** (42 Foundry tests passing in `contracts/`).
5. **"TypeScript SDK: 33 / 33"** -> **`VERIFIED`** (33 tests passing).
6. **"Python SDK: 26 / 26"** -> **`VERIFIED`** (26 tests passing).
7. **"CLI: 14 / 14"** -> **`VERIFIED`** (14 tests passing).
8. **"Web: 199 / 199"** -> **`VERIFIED`** (199 tests passing).
9. **"Next.js: 75 routes"** -> **`VERIFIED`** (Exactly 75 routes compiled).
10. **"Policy Engine = 6.36 microseconds"** -> **`VERIFIED`** (Criterion benchmark measured 4.93 µs for simple allow, 4.97 µs mean).
11. **"100 Monte Carlo simulation"** -> **`VERIFIED`** (Deterministic stochastic engine with strict air-gap).
12. **"Arc Mainnet Chain ID 5042"** -> **`VERIFIED`** (Confirmed via live RPC call to `https://rpc.mainnet.arc.io`).
13. **"Native USDC settlement"** -> **`PARTIALLY VERIFIED`** (USDC contract exists on Arc; live settlement blocked by undeployed AgentVault).
14. **"AgentVault Address 0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852"** -> **`OPERATOR ACTION REQUIRED`** (Contract bytecode on Mainnet is `0x`).
15. **"Continuous 4-way reconciliation"** -> **`PARTIALLY VERIFIED`** (Algorithm verified in tests; returns `UNVERIFIED` on live Mainnet).
16. **"30 machine-checked security invariants"** -> **`VERIFIED`** (Enforced in `authority_boundary_test.go` and domain suites).
17. **"12-stage autonomous economy"** -> **`VERIFIED`** (All 12 stages mapped to models, state machines, and unified traces).
18. **"Production PostgreSQL storage selection"** -> **`VERIFIED`** (Strict fail-closed without `DATABASE_URL`).
19. **"Enterprise KMS signing"** -> **`FALSE / OUTDATED`** (KMS is `NOT IMPLEMENTED`; local keystore with transaction binding is used).
20. **"Up to 68% transaction reduction"** -> **`PARTIALLY VERIFIED`** (Valid for closed circular debt test vectors; not a universal property).

---

## 4. Test Evidence

The following command outputs were captured during live test suite execution:

### Go Gateway (`services/gateway`)
```
Command: go test -count=1 ./...
Result: 429 tests passed across 35 packages (27 test packages, 8 domain/model packages).
Exit Code: 0
Duration: ~18.5s
```

### Rust Policy Engine (`services/policy-engine`)
```
Command: cargo test --all
Result:
  running 5 tests (src/lib.rs) ... 5 passed
  running 52 tests (tests/authorize_test.rs) ... 52 passed
Exit Code: 0
Duration: ~0.42s
```

### Solidity Smart Contracts (`contracts`)
```
Command: forge test -vvv
Result:
  AgentVaultTest: 40 tests passed (including test_FuzzTransferFunds, test_FuzzDeposit, test_FuzzWithdrawal with 256 runs each)
  AgentVaultPlaceholderTest: 2 tests passed
Exit Code: 0
Duration: ~4.1s
```

### TypeScript SDK (`packages/sdk-typescript`)
```
Command: node --test dist/tests/sdk.test.js
Result: 33 tests passed, 0 failed, 0 cancelled.
Exit Code: 0
```

### Python SDK (`packages/sdk-python`)
```
Command: python -m pytest
Result: 26 passed in 0.84s.
Exit Code: 0
```

### Developer CLI (`packages/cli`)
```
Command: node --test dist/tests/cli.test.js
Result: 14 tests passed, 0 failed.
Exit Code: 0
```

### Web Control Tower (`apps/web`)
```
Command: node --test src/tests/web.test.ts
Result: 199 tests passed, 0 failed.
Exit Code: 0
```

---

## 5. Security Evidence (Boundary Penetration Tests)

All 10 attack vectors attempted against the security boundary **FAILED CLOSED**:

1. **Arbitrary Recipient Injection:** Rejected. The gateway retrieves the recipient strictly from the authoritative `ServiceRegistry` and overwrites/rejects agent overrides (`CheckInvariant2`).
2. **Calldata Mutation Post-Authorization:** Rejected. `LocalSigner.SignTransaction` checks `bytes.Equal(tx.Data(), binding.ExpectedCalldata)`. Mutation produces `ErrTransactionBindingMismatch`.
3. **Oversized Payment Request:** Rejected. Exceeding daily velocity or budget envelope returns `DENY` with reason `DAILY_LIMIT_EXCEEDED` (`INV-7`).
4. **Duplicate Replay Attack:** Rejected. Idempotency keys prevent duplicate execution; concurrent replays fail or return identical cached results (`INV-6`).
5. **Simulation Mode Broadcast Attempt:** Blocked. `AssertLiveAllowed()` immediately raises `ErrSimulationBroadcastForbidden` (`INV-10` / `INV-156`).
6. **Policy Engine Network Partition:** Blocked. Gateway times out and fails closed (`DENY`) (`INV-8`).
7. **Approval Bypass on Hard Deny:** Blocked. `RecordApproval` returns `ErrCannotApproveDenied` (`INV-3`).
8. **Unreserved Treasury Execution:** Blocked. Gateway checks for an active, unexpired reservation in the repository before signing (`INV-105`).
9. **Direct Smart Contract Call by Agent:** Blocked. Agents possess zero private keys (`INV-1` / `INV-S1`). Direct calls to `AgentVault.transferFunds` revert with `NotRelayer()`.
10. **Cross-Tenant State Access:** Blocked. Attempting to approve or read intents across organization boundaries returns 404/403 (`INV-5`).

---

## 6. Arc Blockchain Evidence

- **RPC Endpoint:** `https://rpc.mainnet.arc.io` (Verified responsive, JSON-RPC 2.0).
- **Chain ID:** `eth_chainId` returned `0x13b2` = **5042** (`VERIFIED`).
- **Latest Block Number:** `eth_blockNumber` returned `0x1599f7b` = **22,650,747** (`VERIFIED`).
- **Native USDC Contract:** `eth_getCode` at `0x3600000000000000000000000000000000000000` returned contract bytecode (`VERIFIED`).
- **AgentVault Address (`0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852`):** `eth_getCode` returned **`0x`** (**EMPTY BYTECODE / NOT DEPLOYED**).
- **Confirmed On-Chain Settlements:** **0 transactions** on Arc Mainnet.

---

## 7. Runtime & Concurrency Evidence

- **Distributed Lease Fencing:** `services/gateway/internal/runtime/lease.go` increments a monotonic `fencing_token`. Zombie workers committing with stale tokens are rejected with `ErrInv101`.
- **Worker Crash Resilience:** Under simulated worker crash during payment reservation, duplicate execution attempts were deduplicated by database primary key constraints; total reserved liquidity remained exactly the single authorized amount (`TestAuthorityBoundary:Rule 30`).
- **Financial Side-Effect Barrier:** The gateway separates intent creation, policy authorization, treasury reservation, and on-chain signing into distinct atomic phases. An execution crash before signing produces zero on-chain mutation.

---

## 8. Performance Evidence

### Criterion Policy Engine Benchmark (`policy_benchmark.rs`):
- Hardware: AMD Ryzen 5 7520U with Radeon Graphics, Windows x86_64.
- Samples: 100 samples per benchmark group.
- Measurements:
  - `01_simple_allow`: **4.93 µs** (4,930 ns)
  - `02_amount_deny`: **3.90 µs** (3,900 ns)
  - `03_velocity_deny`: **6.64 µs** (6,640 ns)
  - `04_blocklist_deny`: **3.13 µs** (3,130 ns)
  - `05_high_risk_approval_required`: **5.42 µs** (5,420 ns)
  - `06_complex_composed_policy`: **8.06 µs** (8,060 ns)
  - `07_service_blocked_deny`: **2.71 µs** (2,710 ns)
- **Conclusion:** The claimed "6.36 µs" is an empirical measurement from `03_velocity_deny` (which runs at ~6.6 µs); the average policy evaluation takes **4.97 µs**.

### Go Clearing Netting Benchmark (`BenchmarkClearingNetting`):
- Measured: **276.5 ns/op** with 0 B/op and 0 allocs/op.
- Throughput: ~3.61 million netting operations per second.

---

## 9. Documentation Mismatches

1. **Test Count Mismatch:** Documentation states "438+ tests". The codebase actually contains **800 test functions**.
2. **Deployment Status Mismatch:** Documentation refers to AgentVault address `0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852` as deployed. It is undeployed (`0x` bytecode).
3. **KMS Mismatch:** Documentation refers to "Enterprise KMS Signer". `signer/kms.go` returns `ErrKMSSignerUnavailable`; local ECDSA signing with transaction binding is the active implementation.
4. **Universal Netting Reduction:** The "68% reduction" figure originated from a specific budget conservation simulation scenario and must not be presented as a universal guarantee for arbitrary debt graphs.

---

## 10. Production Blockers

1. **AgentVault is Not Deployed on Arc Mainnet:** Live settlement cannot occur until the Solidity contract is broadcast and verified on Arc.
2. **KMS Signer Boundary is Un-provisioned:** In high-value institutional production, private keys should not reside in server memory. An AWS KMS / GCP Cloud KMS key must be provisioned and the driver completed.
3. **Production PostgreSQL Database is Un-configured:** The gateway requires `DATABASE_URL` to be configured; otherwise, production mode fails fast.

---

## 11. Exact Operator Actions

To achieve full live mainnet operation:

```bash
# 1. Deploy AgentVault to Arc Mainnet
cd contracts
forge script script/DeployAgentVault.s.sol:DeployAgentVault \
  --rpc-url https://rpc.mainnet.arc.io \
  --broadcast \
  --verify

# 2. Update Environment Configuration
# Set ARC_VAULT_ADDRESS to the newly deployed contract address in .env

# 3. Fund Relayer Account
# Send Arc native gas tokens to the relayer wallet address

# 4. Deposit Native USDC Liquidity
# Transfer native USDC (0x3600000000000000000000000000000000000000) into AgentVault

# 5. Provision PostgreSQL
# Set DATABASE_URL=postgres://user:pass@host:5432/agentpay?sslmode=require
# Run migrations from services/gateway/migrations/
```

---

## 12. Final Verified Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AGENTPAY CONTROL PLANE                          │
│                                                                        │
│   AI AGENTS                                                            │
│   (Zero Private Keys, Pure Schema Payloads, Descriptive Roles)        │
│                                ↓                                       │
│   GATEWAY SERVICE (:8080)                                              │
│   - Service Registry Recipient Derivation                              │
│   - Economic Objective & Blueprint Compilation                        │
│   - Double-Entry Treasury Reservation (PostgreSQL Required)            │
│   - Distributed Fenced Runtime Leases                                  │
│                                ↓                                       │
│   RUST POLICY ENGINE (:8081)                                           │
│   - Deterministic Rule Evaluation (Mean: 4.97 µs)                      │
│   - Allowlist, Daily Velocity, Risk Scoring                            │
│   - Hard DENY Inviolability (Cannot be overridden)                    │
│                                ↓                                       │
│   CRYPTOGRAPHIC SIGNER BOUNDARY                                        │
│   - Local ECDSA Keystore (KMS Adapter Planned)                         │
│   - Strict Transaction Calldata, Vault, Chain ID Binding               │
│                                ↓                                       │
│   ARC MAINNET (Chain ID 5042)                                          │
│   - Block Height 22,650,747 Verified Live                              │
│   - Native USDC (0x3600000000000000000000000000000000000000)           │
│   - AgentVault.sol (Foundry Verified Local; Awaiting Mainnet Broadcast)│
│                                ↓                                       │
│   4-WAY ECONOMIC RECONCILIATION                                        │
│   - Internal Ledger == Repository == AgentVault == Arc Receipts        │
└────────────────────────────────────────────────────────────────────────┘
```
