# Arc Microgrants Reviewer Walkthrough

> **Audience**: Arc Microgrants Reviewers & Technical Evaluators  
> **Format**: 10 Direct Questions & Evidence-Based Answers  
> **Repository**: [https://github.com/mahitss/Arc_micro](https://github.com/mahitss/Arc_micro)

---

### 1. What is this?
**AgentPay is programmable USDC payment infrastructure for autonomous AI agents on Arc.**  
It separates artificial intelligence from economic authority. Instead of granting an LLM direct access to a crypto wallet, agents submit structured payment intents against an approved service registry. A deterministic Rust policy engine evaluates spending limits, and an on-chain smart contract (`AgentVault.sol`) settles payments in USDC on Arc.

---

### 2. Why does it need Arc?
Autonomous AI agents require **predictable dollar-denominated unit economics** without currency volatility. Arc is specifically designed as a stablecoin-native settlement layer where **gas is paid directly in USDC**. This eliminates the dual-asset friction on other chains (where agents must hold both ETH/MATIC and USDC), allowing an agent funded with USDC to pay for both service fees and transaction gas from a single balance.

---

### 3. Is Arc actually used?
**Yes.** The system is configured and tested specifically for Arc Mainnet (Chain ID `5042`). You can verify the live Arc RPC (`https://rpc.mainnet.arc.io`) returns `0x13b2` (`5042`) and that the execution service verifies this chain ID before every transaction broadcast.

---

### 4. Is USDC actually used?
**Yes.** All payments and contract balances are denominated in canonical Arc USDC (`0x3600000000000000000000000000000000000000`). `AgentVault.sol` holds ERC-20 USDC and executes transfers via `usdc.safeTransfer`. All monetary amounts are strictly handled as 6-decimal integer base units (`1_000_000` = 1.00 USDC) with zero floating-point arithmetic.

---

### 5. Can I verify the contract?
**Yes.** The smart contract source code is located in [`contracts/src/AgentVault.sol`](../contracts/src/AgentVault.sol). You can compile and verify it using Foundry:
```bash
cd contracts && forge test
```
All 42 unit, edge case, and fuzz tests pass with zero formatting differences. Complete verification commands are documented in [`docs/verify-arc-deployment.md`](verify-arc-deployment.md).

---

### 6. Can I verify a real payment?
- **In Local Review / Staging**: Yes, via the interactive demonstration route at **[`http://localhost:3000/demo`](http://localhost:3000/demo)**, which runs the full 5-step pipeline.
- **On Arc Mainnet**: During the prototype phase, automated test suites run with `ENABLE_LIVE_EXECUTION=false` to avoid inadvertent gas consumption. Therefore, the status is documented honestly as `MAINNET TRANSACTION NOT YET EXECUTED`. No fake transaction hashes or simulated confirmations are ever presented as real on-chain data.

---

### 7. What prevents an AI agent from spending freely?
A multi-tier defense in depth:
1. **No Keys for AI**: The AI model has zero access to private keys or signing capabilities.
2. **Server-Side Recipient Control**: The AI cannot specify recipient addresses; it can only request an approved `service_id` from the server-side Service Registry.
3. **Pure Rust Policy Engine**: Enforces daily spending limits, per-transaction maximums, frequency caps, and allowlists in checked integer math (`u64`).
4. **On-Chain Guardrails**: `AgentVault.sol` enforces hard on-chain daily limits and owner emergency pause (`pause()`) switches.

---

### 8. What happens when policy denies a payment?
1. The Rust Policy Engine immediately returns `DENY` with an explicit reason code (e.g. `DAILY_LIMIT_EXCEEDED`).
2. The payment intent transitions to the terminal status `DENIED`.
3. **Execution is completely aborted**: zero calls are made to the execution service, zero transactions are signed or broadcast, zero gas is spent, and **`Blockchain Transaction: NONE`** is displayed.
4. You can verify this behavior directly on the `/demo` page by clicking **"Test Policy Denial"**.

---

### 9. Can I run it?
**Yes, in under 5 minutes.**
```bash
git clone https://github.com/mahitss/Arc_micro.git
cd Arc_micro
cp .env.example .env
./scripts/dev.sh
```
This launches the Web Control Center on `:3000`, Go Gateway on `:8080`, and Rust Policy Engine on `:8081`. See [`docs/reviewer-quickstart.md`](reviewer-quickstart.md) for detailed instructions.

---

### 10. What are the limitations?
- **Unaudited Prototype**: Built for the Arc Microgrants evaluation; not audited for production treasury management.
- **Single Token Constraint**: Exclusively supports USDC (`6 decimals`).
- **Centralized Executor**: Uses a gateway signer role (production should explore Safe / MPC / session keys).
- For complete disclosures, see [`docs/limitations.md`](limitations.md).
