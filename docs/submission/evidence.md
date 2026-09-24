# AgentPay v1.0 — Verification Evidence (Submission)
**Classification:** Empirical Verification & Test Evidence  

---

## 1. Machine Test Results

- **Go Gateway Core**: 35/35 packages passing (`go test -count=1 ./...`).
- **Rust Policy Engine**: 57/57 tests passing in 0.04s (`cargo test --all`).
- **Solidity Smart Contracts**: 42/42 Foundry tests passing including 3 fuzz suites (`forge test -vvv`).
- **TypeScript SDK**: 33/33 tests passing (`npm test`).
- **Python SDK**: 26/26 tests passing in 0.27s (`pytest`).
- **Operator CLI**: 14/14 tests passing (`npm test`).
- **Web Frontend**: 199 unit & invariant tests passing; 74 routes compiled cleanly (`npm run build`).

---

## 2. Benchmark Measurements

- **Pure Policy Evaluation**: 6.36 µs (~157k checks/sec).
- **Amount & Limit Deny**: 3.82 µs (~261k checks/sec).
- **Quote Matching**: 45.07 ns/op (~22.2M op/s).
- **Clearinghouse Netting**: 209.90 ns/op (~4.76M op/s).
- **Reconciliation Matching**: 12.55 ns/op (~79.7M op/s).
- **Event Processing**: 0.785 ns/op (~1.27B op/s).

---

## 3. Network Evidence

- **Arc Mainnet RPC**: `https://rpc.mainnet.arc.io` (`VERIFIED LIVE`).
- **Chain ID**: `5042` (`0x13b2`, `VERIFIED LIVE`).
- **Latest Block**: Block #22,572,770 (`VERIFIED LIVE`).
- **Native USDC Contract**: `0x3600000000000000000000000000000000000000` (`VERIFIED LIVE`).
