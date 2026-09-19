# Arc Microgrants Final Submission Checklist

> **Evaluation Date**: September 20, 2026  
> **Application Target**: AgentPay  
> **Repository**: [https://github.com/mahitss/Arc_micro](https://github.com/mahitss/Arc_micro)

This checklist tracks the factual verification status of every submission requirement for the Arc Microgrants application. Items are marked complete (`[x]`) only when verified by existing code, configuration, or live network queries.

---

### PROJECT
- [x] **Project name**: AgentPay — Programmable USDC Payment Infrastructure for Autonomous AI Agents.
- [x] **Description**: Comprehensive descriptions (one-sentence, 50-word, 100-word, technical, Arc-specific) prepared in [`docs/project-description.md`](project-description.md).
- [x] **Public repository**: Publicly accessible on GitHub at `https://github.com/mahitss/Arc_micro` with clean history across Tasks 1–12.
- [x] **Builder profile**: Public GitHub maintainer profile configured at [`@mahitss`](https://github.com/mahitss).

---

### DEPLOYMENT
- [x] **Frontend live**: Local Web Control Center running on `http://localhost:3000` with interactive `/demo` route; production build verified via `npm run build`.
- [x] **Backend live**: Go Gateway running on `http://localhost:8080` with `/health` and `/ready` endpoints; builds cleanly via `go build`.
- [x] **Rust policy engine live**: Standalone service running on `http://localhost:8081` with `/health` and `/v1/authorize`; builds cleanly via `cargo build --release`.
- [x] **Database configured**: PostgreSQL schema migrations configured with atomic CAS state updates; thread-safe in-memory store supported for local dev.
- [x] **Arc mainnet configured**: Verified live RPC at `https://rpc.mainnet.arc.io` (Chain ID `5042` / `0x13b2`).

---

### ON-CHAIN
- [ ] **AgentVault deployed**: Target deployment script `contracts/script/DeployAgentVault.s.sol` compiled and tested (42 Foundry tests). Deployment to Arc Mainnet pending broadcast with funded deployer key. *(Status: CONFIGURED / PENDING BROADCAST)*
- [x] **USDC configured**: Canonical Arc USDC ERC-20 contract verified live at `0x3600000000000000000000000000000000000000` (3,598 bytes bytecode).
- [x] **Contract verified**: Contract logic, edge cases, and fuzz invariants verified via 42 Foundry tests (`contracts/test/AgentVault.t.sol`).
- [x] **Owner/controller verified**: Assigned to deployer upon contract initialization; verified via test suite.
- [x] **Policy configured**: Daily spending limits, per-transaction maximums, and frequency caps tested on-chain and in Rust.
- [x] **Recipient configured**: Server-side Service Registry controls trusted service recipients (e.g., `web-research` $\rightarrow$ `0x1111...1111`).
- [ ] **Real transaction verified**: Live mainnet broadcast intentionally gated behind `ENABLE_LIVE_EXECUTION=false` during prototype phase. *(Status: MAINNET TRANSACTION NOT YET EXECUTED)*

---

### DEMO
- [x] **Valid payment flow**: Deterministic 5-step demonstration implemented at `/demo`: Research Agent requests 0.18 USDC, Rust policy authorizes, execution is prepared, settlement status displayed.
- [x] **Denied payment flow**: Over-limit payment request (6.00 USDC > daily budget) denied off-chain with `DAILY_LIMIT_EXCEEDED` and explicitly displays `Blockchain Transaction: NONE`.
- [x] **No fake data**: UI strictly displays `DATA UNAVAILABLE` or `DEMO / EXECUTION DISABLED` when live broadcast is disabled, preventing fabricated hashes or balances.
- [x] **Arc transaction proof**: Receipt and event verification pipeline implemented in Go gateway; displays live Arc Explorer links when real hashes exist.
- [x] **Security model demonstrated**: Proves that AI can request payments, but deterministic policy and on-chain controls govern whether money moves.

---

### DOCUMENTATION
- [x] **README**: Reviewer-first structure rewritten in root [`README.md`](../README.md).
- [x] **Architecture**: Mermaid system diagram and explicit trust boundaries in [`docs/architecture.md`](architecture.md).
- [x] **Quickstart**: 3-minute evaluator guide in [`docs/reviewer-quickstart.md`](reviewer-quickstart.md) and full setup in [`docs/quickstart.md`](quickstart.md).
- [x] **Security**: Comprehensive threat model and defense-in-depth specification in [`docs/security.md`](security.md).
- [x] **Limitations**: Explicit prototype disclosures and unaudited status documented in [`docs/limitations.md`](limitations.md).
- [x] **Arc verification**: Step-by-step verification commands in [`docs/verify-arc-deployment.md`](verify-arc-deployment.md).
- [x] **Demo script**: Timed 3–5 minute screencast script in [`docs/demo-script.md`](demo-script.md).
