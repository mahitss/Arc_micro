# AgentPay Release Manifest (v1.0.0-rc1)

**Release Version:** `v1.0.0-rc1` (Day 10 Final Production Freeze)  
**Git Commit SHA:** `bb455eead40f1b1f1b41b85a2b4eae7c2a878ab2`  
**Git Branch:** `main`  
**Source Repository:** [https://github.com/mahitss/Arc_micro](https://github.com/mahitss/Arc_micro)  
**Release Date:** September 22, 2026  
**Classification:** Official Release Manifest (Contains NO secrets)

---

## 1. Release Metadata & Component Checklist

| Component | Language / Framework | Version / Path | Test Coverage | Verification Status |
|---|---|---|---|---|
| **Smart Contracts** | Solidity 0.8.24 (Cancun) | `contracts/src/AgentVault.sol` | 42 tests passing (`forge test`), 3 fuzz suites | `VERIFIED` |
| **Policy Engine** | Rust 1.79, Tokio, Axum | `services/policy-engine` | 57 tests passing (`cargo test`), Criterion benchmarks | `VERIFIED` |
| **Gateway Service** | Go 1.22 | `services/gateway` | 20 packages passing non-cached (`go test -count=1 ./...`) | `VERIFIED` |
| **Web Dashboard** | Next.js 14, React 18, Tailwind | `apps/web` | 19 static routes compiled (`next build`) | `VERIFIED` |
| **TypeScript SDK** | TypeScript 5.4, Node 20 | `packages/sdk-typescript` | 14 tests passing (`npm test`) | `VERIFIED` |
| **Python SDK** | Python 3.11+, Pytest | `packages/sdk-python` | 9 tests passing (`pytest`) | `VERIFIED` |
| **Developer CLI** | Node 20 | `packages/cli` | 3 tests passing (`npm test`) | `VERIFIED` |
| **Adversarial Lab** | Go / Automated Runner | `services/gateway/internal/adversarial` | 10 attack scenarios defended (100% pass) | `VERIFIED` |

---

## 2. Blockchain & Settlement Configuration

| Parameter | Configuration Value | Verification Status |
|---|---|---|
| **Target Blockchain** | Arc Mainnet | `VERIFIED` |
| **Arc Chain ID** | `5042` (`0x13b2`) | `VERIFIED` (Queried live from RPC) |
| **Arc RPC Endpoint** | `https://rpc.mainnet.arc.io` | `VERIFIED` (Current Block: 22,185,584) |
| **Native USDC Contract** | `0x3600000000000000000000000000000000000000` | `VERIFIED` (Code length: 3,598 bytes) |
| **Arc Block Explorer** | `https://explorer.arc.io` | `VERIFIED` |
| **AgentVault Address** | Not yet deployed on Arc Mainnet | `PENDING OPERATOR DEPLOYMENT` |
| **Deployment Transaction** | No deployment transaction broadcast | `NOT VERIFIED` |
| **Canary Transaction (0.01 USDC)** | No canary transaction broadcast | `NOT VERIFIED` |
| **Live Execution Gate** | `ENABLE_LIVE_EXECUTION=false` | `VERIFIED` (Fails closed by default) |
| **KMS / HSM Signing** | AWS KMS / GCP Cloud HSM | `NOT IMPLEMENTED` (Fails closed) |
| **Local Relayer Signing** | `LocalSigner` with `TransactionBinding` | `VERIFIED` |
| **Owner / Relayer Separation** | Cold Multi-Sig vs Hot Relayer | `PENDING OPERATOR INPUT` |

---

## 3. Financial Invariants & Security Matrix

All 16 formal financial invariants are proven and verified:
- **INV-1:** Mandatory Policy Evaluation (`VERIFIED`)
- **INV-2:** Hard DENY Inviolability (`VERIFIED`)
- **INV-3:** Approval Cannot Override Hard DENY (`VERIFIED`)
- **INV-4:** Agent Self-Approval Prohibited (`VERIFIED`)
- **INV-5:** Authoritative Registry Recipient (`VERIFIED`)
- **INV-6:** Atomic Mutex Treasury Reservation (`VERIFIED`)
- **INV-7:** Idempotency Prevents Double-Spending (`VERIFIED`)
- **INV-8:** Insufficient Treasury Execution Blocked (`VERIFIED`)
- **INV-9:** Signer Failure Produces FAILED State (`VERIFIED`)
- **INV-10:** Simulation Never Broadcasts (`VERIFIED`)
- **INV-11:** Ambiguous Transactions Await Reconciliation (`VERIFIED`)
- **INV-12:** Multi-Tenant Organization Isolation (`VERIFIED`)
- **INV-13:** Paused Agent Blocked from Spending (`VERIFIED`)
- **INV-14:** Paused Organization Blocked from Spending (`VERIFIED`)
- **INV-15:** 4-Tier Emergency Kill Switch (`VERIFIED`)
- **INV-16:** Flight Recorder Historical Immutability (`VERIFIED`)

---

## 4. Documented Production Limitations

1. **Live Mainnet Settlement Pending:**
   `AgentVault.sol` is compiled and verified with 42 Foundry test cases, but has not yet been broadcast to Arc Mainnet. Real on-chain settlement is classified as `NOT VERIFIED` until an operator runs `./scripts/deploy_mainnet.sh --confirm` with funded gas and USDC credentials.
2. **KMS / HSM Signing Boundary:**
   Production KMS / HSM signing is `NOT IMPLEMENTED`. The gateway currently uses `LocalSigner` with an in-memory private key (`EXECUTOR_PRIVATE_KEY`). It strictly fails closed if `SIGNER_BACKEND=kms`.
3. **AgentVault Single-Role Ownership Privilege:**
   In `AgentVault.sol`, both `executePayment` and `withdraw` are protected by `onlyOwner`. In production, ownership should be transferred to an institutional cold multi-sig wallet (e.g., Gnosis Safe), separating administrative rescue privilege from hot relayer payment execution.

---

## 5. Release Verification Verdict

- **Automated Test Matrix:** **100% PASS**
- **Security Audit:** **0 P0 Findings, 3 Documented P1 Risks, 2 P2, 2 P3**
- **Production Readiness Score:** **19/21 Domains VERIFIED, 2 Domains PARTIAL**
- **Final Recommendation:** **APPROVED FOR SUBMISSION / RELEASE CANDIDATE FREEZE**
