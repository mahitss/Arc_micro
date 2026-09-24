# AgentPay Autonomous Economic Fabric v1.0

> **AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.**  
> *Autonomy may expand. Financial authority must remain bounded.*

AgentPay is the **Autonomous Economic Control Plane** for AI agents. It decouples agent reasoning and task planning from financial execution, allowing autonomous agents to discover services, negotiate contracts, and coordinate complex multi-step missions while ensuring that all financial authority remains deterministic, auditable, and strictly bounded.

---

## 1. What AgentPay Is

AgentPay is a production-grade infrastructure platform that acts as the financial execution gate between autonomous AI agents and settlement blockchains. It provides:
- **Autonomous Economic Fabric**: Translates high-level natural language objectives into executable blueprints, runs Monte Carlo cost simulations, and coordinates multi-agent missions and swarms.
- **Economic Control Plane**: Enforces multi-layered constitutional governance, microsecond deterministic policy evaluation, composite risk scoring, and multi-sig escalation.
- **Autonomous Clearinghouse**: Maintains a double-entry ledger, executes multilateral debt netting cycles across agent trade networks, and reconciles transactions against blockchain receipts.
- **Programmable Vault (`AgentVault.sol`)**: An on-chain smart contract deployed on Arc Mainnet that enforces spending limits, daily calendar windows, and recipient allowlists in native USDC.

---

## 2. Why It Exists

Autonomous AI agents are capable of reasoning, planning, and tool use, but giving an LLM direct access to cryptocurrency private keys is fundamentally unsafe:
1. **Prompt Injection**: A single malicious injection in an external data feed can instruct an agent to transfer its entire wallet balance to an attacker.
2. **Hallucination & Loops**: Unbounded retry loops or reasoning bugs can drain thousands of dollars in minutes.
3. **Regulatory Non-Compliance**: Institutional enterprise capital cannot flow through unvetted, unmonitored agent wallets without strict audit trails.

AgentPay eliminates this risk by enforcing the invariant:
```
AI AGENTS NEVER HOLD PRIVATE KEYS.
AI AGENTS CANNOT SIGN TRANSACTIONS.
ALL VALUE MOVEMENT FLOWS THROUGH THE AUTHORIZED FINANCIAL GATE.
```

---

## 3. Architecture

AgentPay integrates multi-language services into a single authoritative pipeline:

```
                    ┌──────────────────────────┐
                    │   External AI Agents     │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   AgentPay Protocol      │
                    │   + Agent Network        │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   Economic Fabric        │
                    │                          │
                    │ Objective → Plan         │
                    │ → Simulate → Execute     │
                    │ → Observe → Adapt        │
                    └────────────┬─────────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               ▼                 ▼                 ▼
        Marketplace          Missions          Swarms
               │                 │                 │
               └─────────────────┼─────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Economic Control Plane   │
                    │                          │
                    │ Constitution             │
                    │ Policy                   │
                    │ Risk                     │
                    │ Approval                 │
                    │ Liquidity                │
                    │ Clearing                 │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Financial Execution Gate │
                    │                          │
                    │ PaymentIntent            │
                    │ Treasury Reservation     │
                    │ Settlement Router        │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Authorized Executor      │
                    │                          │
                    │ Go Gateway / Signer      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      AgentVault.sol      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │       ARC MAINNET        │
                    │       USDC SETTLEMENT    │
                    └──────────────────────────┘
```

- **Go Gateway** (`services/gateway`): High-throughput API gateway, durable workflow runtime, event bus, and storage persistence.
- **Rust Policy Engine** (`services/policy-engine`): High-performance deterministic policy evaluation core executing in <10 microseconds.
- **Solidity Smart Contracts** (`contracts/src`): On-chain programmable vault (`AgentVault.sol`) on Arc.
- **TypeScript & Python SDKs** (`packages/`): Fully typed client libraries with zero private key handling.
- **Operator CLI** (`packages/cli`): Command-line utility for operations, simulations, and inspections.
- **Control Tower** (`apps/web`): Real-time observability dashboard with live economic causal tracing.

---

## 4. Security Model

AgentPay operates on a zero-trust, defense-in-depth model:
- **Server-Controlled Recipients (`INV-2`)**: Agents submit payment intents referencing registered services; the server resolves the on-chain destination address.
- **7-Tier Constitutional Hierarchy**: `GLOBAL → ORG → AGENT → MISSION → SWARM → TASK → PAYMENT`. Policies can only tighten at lower scopes; they can never expand.
- **Inviolable HARD_DENY (`INV-46`)**: Blocked recipients, sanctions lists, or disabled policies cannot be overridden by human approval or emergency tools.
- **Exact Calldata Binding**: The signer inspects transactions before signing, ensuring target contract, calldata hash, and amount match off-chain authorizations, and native ETH value is strictly zero.
- **Idempotency & Cas State Transitions**: All state transitions use Compare-and-Swap (CAS) to prevent double-spending across retries or worker crashes.

---

## 5. Autonomous Economy

The autonomous lifecycle is deterministic and adaptive:
```
Objective → Blueprint → Simulate → Discover → Quote → Select
→ Authorize → Execute → Observe → Outcome → Learn → Adapt
```
- **Marketplace & Discovery**: Evaluates candidate providers based on verifiable historical SLA, completion rate, price, and latency.
- **Automatic Failure Recovery**: If a provider drops out mid-mission, the runtime detects the failure and replans with an alternative provider without exceeding budget caps.
- **Empirical Learning**: Provider performance and latency observations feed Bayesian reputation updates in economic memory.

---

## 6. Arc Integration

AgentPay settles value exclusively on **Arc Mainnet**:
- **Chain ID**: `5042`
- **Native USDC Contract**: `0x3600000000000000000000000000000000000000` (6 decimals)
- **RPC Endpoint**: `https://rpc.mainnet.arc.io`
- **Block Explorer**: `https://explorer.arc.io`
- **On-Chain Enforcement**: `AgentVault.sol` validates per-transaction limits, daily calendar spending windows, and recipient allowlists directly in the EVM before moving USDC.

---

## 7. Local Setup

### Prerequisites
- Go 1.22+
- Rust 1.78+ & Cargo
- Node.js 20+ & pnpm / npm
- Foundry (`forge` & `cast`)

### Quickstart

1. **Clone & Configure**:
   ```bash
   cp .env.example .env
   ```

2. **Start the Rust Policy Engine**:
   ```bash
   cd services/policy-engine
   cargo run --release
   # Listens on http://localhost:8081
   ```

3. **Start the Go Gateway**:
   ```bash
   cd services/gateway
   go run cmd/server/main.go
   # Listens on http://localhost:8080
   ```

4. **Start the Control Tower Dashboard**:
   ```bash
   cd apps/web
   pnpm install
   pnpm dev
   # Open http://localhost:3000
   ```

---

## 8. Testing

The entire repository is backed by comprehensive, machine-checked test suites:

```bash
# 1. Run Go Gateway Tests (35 packages)
cd services/gateway
go test ./...

# 2. Run Rust Policy Engine Tests (57 tests)
cd services/policy-engine
cargo test

# 3. Run Foundry Solidity Tests (42 tests, 3 fuzz suites)
cd contracts
forge test

# 4. Run TypeScript SDK Tests (33 tests)
cd packages/sdk-typescript
npm test

# 5. Run Python SDK Tests (26 tests)
cd packages/sdk-python
pytest tests/

# 6. Run Web Unit Tests (199 invariant tests)
cd apps/web
npm test

# 7. Run Authority Boundary & Chaos Economy Suites
cd services/gateway
go test -v ./internal/adversarial
```

---

## 9. Simulation vs. Live Execution

AgentPay enforces strict isolation between simulation and real financial execution:
- **`SIMULATION`**: Executes Monte Carlo economic modeling, projected worst-case exposure, and dry-run policy evaluation. Marked with `is_simulation = true`. Signers strictly reject simulation transactions (`INV-10`, `INV-107`).
- **`LIVE`**: Enabled ONLY when `ENABLE_LIVE_EXECUTION=true` with a verified `AGENTVAULT_ADDRESS` and valid relayer key.
- **Fail-Closed Principle**: Zero fake transaction hashes, zero fabricated contract addresses, and zero placeholder balances. If mainnet connectivity is unverified, status displays as `UNVERIFIED / SIMULATION`.

---

## 10. Mainnet Deployment

Deploying AgentPay to Arc Mainnet requires cold multi-sig separation:
```
VAULT OWNER (Cold Multi-Sig / Safe) ≠ HOT RELAYER (Gateway Signer)
```

1. **Deploy AgentVault**:
   ```bash
   cd contracts
   forge script script/DeployAgentVault.s.sol:DeployAgentVault \
     --rpc-url https://rpc.mainnet.arc.io \
     --broadcast \
     --sig "run(address,string,address)" \
     0x3600000000000000000000000000000000000000 \
     "agentpay-mainnet-vault" \
     <COLD_MULTISIG_ADDRESS>
   ```
2. **Fund Relayer**: Send Arc gas tokens to the relayer wallet address.
3. **Fund Vault**: Send operational USDC to the deployed `AgentVault` address.
4. **Configure Policies**: Call `setPolicy` and `setRecipientAllowed` via cold multi-sig.

For full step-by-step instructions, see [`docs/mainnet-operator-checklist.md`](docs/mainnet-operator-checklist.md).

---

## 11. Flagship Demo: Autonomous Market Mission

Run the deterministic flagship demo demonstrating the complete autonomous lifecycle:
1. User provides natural language objective: *"Research the cheapest reliable AI inference provider, analyze three sources, hire a summarizer, and complete the report within a $5.00 USDC budget."*
2. System compiles blueprint and runs Monte Carlo simulation.
3. Marketplace discovers providers; agents submit quotes; deterministic matcher awards job.
4. Provider drops connection mid-mission; runtime detects failure and automatically replans with a backup provider.
5. Critic verifies output hash against contract SLA.
6. Execution gate authorizes payment, reserves liquidity, and commands Arc settlement.
7. Control Tower renders the complete end-to-end causal trace graph.

Run via CLI:
```bash
agentpay demo mission
```
Or view the interactive demo at `http://localhost:3000/demo/economic-fabric`.

---

## 12. Known Limitations

In the interest of full technical transparency:
1. **Contract Role Conflation in Current Vault**: `AgentVault.sol` currently uses OpenZeppelin `onlyOwner` on `executePayment`. Unrestricted institutional mainnet funds are **PRODUCTION_BLOCKED** pending deployment of `AgentVaultV2` with multi-sig role separation. Canary micro-budgets (<50 USDC) are supported.
2. **Hardware Key Isolation (KMS)**: `KMSSigner` fails closed (`ErrKMSSignerUnavailable`). Local key signing is supported with strict calldata bindings, but cloud KMS integration is required for high-value vaults.
3. **Single Settlement Currency**: Native Arc USDC (`0x3600...0000`) is the sole supported settlement asset in v1.0.

For full details, consult [`docs/known-limitations.md`](docs/known-limitations.md) and [`docs/agentpay-v1-final-audit.md`](docs/agentpay-v1-final-audit.md).

---

## License

Apache-2.0
