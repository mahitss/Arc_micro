# AgentPay Reviewer Quickstart Guide

> **Reading Time**: ~3 minutes  
> **Audience**: Arc Microgrants Reviewers & Technical Evaluators  
> **Repository**: [https://github.com/mahitss/Arc_micro](https://github.com/mahitss/Arc_micro)

---

### 30-Second Overview
AgentPay is programmable USDC payment infrastructure for autonomous AI agents on Arc. It solves the critical safety problem of autonomous agent commerce: **AI models can reason and invoke tools, but giving an LLM direct wallet access risks prompt injection, runaway spending loops, and wallet depletion.** 

AgentPay separates intelligence from economic authority: the AI formulates a structured **Payment Intent**, a deterministic **Rust Policy Engine** evaluates spending limits, and an on-chain smart contract (**`AgentVault.sol`**) enforces limits and settles USDC directly on the Arc blockchain.

---

### 60-Second Architecture
Every economic action passes through a deterministic pipeline:
1. **AI Reasoning**: AI ingests a user task and outputs a structured payment intent (JSON) requesting funds for a registered service.
2. **Server-Side Registry**: The Go Gateway resolves the recipient address strictly from an approved catalog, eliminating prompt injection.
3. **Deterministic Policy**: The standalone Rust Policy Engine evaluates per-transaction limits, daily budgets, and allowlists in sub-millisecond time.
4. **Execution Gateway**: If approved (`ALLOW`), the Go Gateway acquires execution authority via atomic Compare-And-Swap (CAS) to prevent double-spending.
5. **On-Chain Settlement**: `AgentVault.sol` on Arc transfers 6-decimal USDC base units to the recipient and emits a `PaymentExecuted` event.

---

### 60-Second Security Model
- **AI is Untrusted**: The LLM has zero access to private keys, signing RPCs, or arbitrary recipient addresses.
- **Pure Rust Authorization**: Policy evaluation is pure, side-effect-free integer arithmetic (`u64`). No floating-point math is used anywhere.
- **On-Chain Enforcement**: `AgentVault.sol` enforces independent on-chain daily limits and owner emergency pause (`pause()`) switches.
- **Fail-Closed Execution**: `ENABLE_LIVE_EXECUTION` defaults to `false`. Any RPC disconnect, chain ID mismatch, or policy violation immediately halts execution.

---

### How to Verify the Arc Deployment
You can independently verify the Arc network parameters via standard JSON-RPC queries using `curl` or Foundry `cast`:

```bash
# 1. Verify Chain ID (Returns 0x13b2 = 5042)
curl -s -X POST https://rpc.mainnet.arc.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# 2. Verify Canonical USDC ERC-20 Bytecode (3,598 bytes)
cast code 0x3600000000000000000000000000000000000000 --rpc-url https://rpc.mainnet.arc.io

# 3. Verify Block Explorer Accessibility
curl -sI https://explorer.arc.io | grep "HTTP/"
```

For full contract verification commands, see [`docs/verify-arc-deployment.md`](verify-arc-deployment.md).

---

### How to Run Locally

```bash
# 1. Clone and enter repository
git clone https://github.com/mahitss/Arc_micro.git
cd Arc_micro

# 2. Initialize environment
cp .env.example .env

# 3. Start all services simultaneously (Linux / macOS / Git Bash)
./scripts/dev.sh
```

- **Web Control Center**: Open **[http://localhost:3000](http://localhost:3000)**
- **Interactive Reviewer Demo**: Open **[http://localhost:3000/demo](http://localhost:3000/demo)**

---

### How to Reproduce the Denial Flow
1. Open **[http://localhost:3000/demo](http://localhost:3000/demo)**.
2. Click **"🛡 Test Policy Denial (Over-Limit Attempt)"**.
3. **Observe**:
   - Step 1: Agent creates intent for 6.00 USDC (exceeding daily budget).
   - Step 2: Rust policy evaluates rules and returns `DENY`.
   - Step 3: Displays `PAYMENT DENIED: DAILY_LIMIT_EXCEEDED`.
   - Step 4 & 5: Displays **`Blockchain Transaction: NONE`**.
   - Zero gas incurred; zero transactions broadcast to Arc.

---

### How to Verify a Real Transaction
- In the prototype phase, automated test suites run with `ENABLE_LIVE_EXECUTION=false` to preserve gas safety.
- When live transactions are executed post-deployment, the transaction hash is displayed in `/transactions` and links directly to Arc Explorer (`https://explorer.arc.io/tx/<txHash>`).
- If no transaction has been broadcast yet, the UI displays `DATA UNAVAILABLE` rather than fabricating fake hashes.

---

### Known Limitations
- **Unaudited Prototype**: Built for the Arc Microgrants evaluation; has not undergone a third-party security audit.
- **Single-Token Scope**: Specifically tailored for USDC (`6 decimals`).
- **Centralized Executor**: Uses a gateway signer role (production should explore Safe / MPC / session keys).
- For complete disclosures, see [`docs/limitations.md`](limitations.md).
