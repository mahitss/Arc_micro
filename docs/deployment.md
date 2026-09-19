# AgentPay Production Deployment & Operations Runbook

This document details the production deployment, configuration, verification, and emergency procedures for **AgentPay** on the Arc blockchain network.

---

## 1. Prerequisites

Before deploying AgentPay to production or staging:
- **Go 1.22+**: For compiling `services/gateway`.
- **Rust 1.78+ / Cargo**: For compiling `services/policy-engine`.
- **Foundry (`forge`)**: For smart contract verification and deployment (`contracts/`).
- **Node.js 18+ / npm**: For building and serving `apps/web`.
- **PostgreSQL 15+**: (Optional for production persistence; gateway defaults to in-memory repository if `DATABASE_URL` is omitted).
- **Arc Mainnet Access**: Verified RPC endpoint at `https://rpc.mainnet.arc.io` (Chain ID `5042`).

---

## 2. Environment Variables Specification

### Go Gateway (`services/gateway`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `ENABLE_LIVE_EXECUTION` | **Yes** | `false` | Master safety gate. If `false`, transactions are simulated and fail safe. |
| `ARC_RPC_URL` | **Yes** | `https://rpc.mainnet.arc.io` | Verified Arc JSON-RPC over HTTPS. |
| `ARC_CHAIN_ID` | **Yes** | `5042` | Expected EVM Chain ID. Gateway rejects any mismatch. |
| `ARC_USDC_ADDRESS` | **Yes** | `0x3600000000000000000000000000000000000000` | Canonical Arc USDC ERC-20 contract address. |
| `ARC_EXPLORER_URL` | No | `https://explorer.arc.io` | Base URL for block explorer transaction links. |
| `EXECUTOR_PRIVATE_KEY` | If Live | None | 64-character hex private key for transaction signing. **Never commit or log.** |
| `AGENTVAULT_ADDRESS` | If Live | None | Deployed `AgentVault.sol` contract address on Arc. |
| `POLICY_ENGINE_URL` | **Yes** | `http://localhost:8081` | Authoritative Rust Policy Engine HTTP URL. |
| `AGENT_AUTO_EXECUTION` | No | `false` | If `false`, authorized intents await operator confirmation dialog. |
| `PORT` | No | `8080` | Gateway HTTP listen port. |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:3000` | Allowed frontend origins. |
| `AI_API_KEY` | No | None | LLM API key (mock model used if omitted). |

### Web Control Center (`apps/web`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_GATEWAY_URL` | **Yes** | `http://localhost:8080` | Public URL for Go Gateway API. |
| `NEXT_PUBLIC_ARC_CHAIN_ID` | No | `5042` | Expected Arc chain ID for runtime badge validation. |
| `NEXT_PUBLIC_ARC_EXPLORER_URL`| No | `https://explorer.arc.io` | Explorer base URL for transaction links. |

> [!CAUTION]
> **Zero Browser Secrets**: `EXECUTOR_PRIVATE_KEY`, `AI_API_KEY`, database credentials, and signing secrets MUST NEVER be prefixed with `NEXT_PUBLIC_` or exposed to the frontend.

---

## 3. Smart Contract Deployment (`contracts/`)

To deploy `AgentVault.sol` to Arc Mainnet:

```bash
# 1. Export deployment credentials securely into current shell session (DO NOT write to disk)
export DEPLOYER_PRIVATE_KEY="<your_hex_private_key>"
export ARC_RPC_URL="https://rpc.mainnet.arc.io"
export ARC_CHAIN_ID="5042"
export ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"
export AGENT_ID="research-agent"

# 2. Run the secure deployment script
./scripts/deploy_mainnet.sh
```

### Post-Deployment On-Chain Verification
Run view calls against the deployed contract:
```bash
# Check owner
cast call <AGENTVAULT_ADDRESS> "owner()(address)" --rpc-url https://rpc.mainnet.arc.io

# Check configured USDC address
cast call <AGENTVAULT_ADDRESS> "usdc()(address)" --rpc-url https://rpc.mainnet.arc.io

# Check paused state
cast call <AGENTVAULT_ADDRESS> "paused()(bool)" --rpc-url https://rpc.mainnet.arc.io

# Check daily limit policy
cast call <AGENTVAULT_ADDRESS> "getPolicy()(bool,uint256,uint256,uint256,uint256,uint256,uint256)" --rpc-url https://rpc.mainnet.arc.io
```

---

## 4. Backend Deployment (`services/`)

### Rust Policy Engine
```bash
cd services/policy-engine
cargo build --release
./target/release/policy_engine
# Listening on http://0.0.0.0:8081
```

### Go Gateway
```bash
cd services/gateway
go build -o bin/gateway cmd/server/main.go
./bin/gateway
# Listening on http://0.0.0.0:8080
```

---

## 5. Frontend Deployment (`apps/web`)

```bash
cd apps/web
npm install
npm run build
npm run start -p 3000
# Accessible at http://localhost:3000
```

---

## 6. Startup Safety Checks & Fail-Closed Behavior

The Go Gateway implements fail-closed validation on startup:
1. **Live Execution Gate**: If `ENABLE_LIVE_EXECUTION=true`:
   - Validates `ARC_RPC_URL` is responsive.
   - Validates `eth_chainId` matches `5042`.
   - Validates `ARC_USDC_ADDRESS` has deployed bytecode.
   - Validates `EXECUTOR_PRIVATE_KEY` exists, is 64 hex characters, and corresponds to a valid ECDSA key.
   - If any condition is unsatisfied, the gateway logs a `FATAL SAFETY ERROR` and terminates immediately.
2. **Safe Default**: If `ENABLE_LIVE_EXECUTION=false`, the gateway logs that it is operating in safe simulation mode and prevents any on-chain broadcasts.

---

## 7. Emergency Rollback & Disable Procedure

If anomalous spending or unauthorized activity is detected:

### Step 1: Emergency On-Chain Pause (Instant)
The vault owner can pause `AgentVault` immediately, blocking all payments:
```bash
cast send <AGENTVAULT_ADDRESS> "pause()" \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key <OWNER_PRIVATE_KEY>
```

### Step 2: Disable Gateway Live Execution (Instant)
Set `ENABLE_LIVE_EXECUTION=false` in the gateway environment and restart the service:
```bash
kill -TERM $(pgrep gateway)
ENABLE_LIVE_EXECUTION=false ./bin/gateway
```

### Step 3: Withdraw Remaining Funds
The vault owner can withdraw all remaining USDC from `AgentVault` back to treasury:
```bash
cast send <AGENTVAULT_ADDRESS> "withdraw(uint256)" <AMOUNT_BASE_UNITS> \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key <OWNER_PRIVATE_KEY>
```
