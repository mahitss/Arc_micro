# AgentPay Deployment & Production Operations Guide

This guide provides reproducible, step-by-step instructions for deploying and operating the complete AgentPay stack: Gateway, Rust Policy Engine, Next.js Web Control Center, AgentVault smart contracts, and PostgreSQL database.

---

## 1. Prerequisites

- **Go:** 1.22+
- **Rust:** 1.75+ (Cargo)
- **Node.js:** 18.18+ (npm)
- **Foundry:** `forge`, `cast`
- **PostgreSQL:** 14+ (or Docker)
- **Docker & Docker Compose:** Optional for containerized deployment

---

## 2. Local Development Setup (Quick Start)

### Clone & Configure Environment
```bash
git clone https://github.com/mahitss/Arc_micro.git
cd Arc_micro
cp .env.example .env
```

### Start Services via Docker Compose
```bash
docker-compose up --build -d
```
This boots:
- PostgreSQL on port `5432`
- Rust Policy Engine on port `8081`
- Go Gateway API on port `8080`
- Web Control Center on port `3000`

---

## 3. Manual Component Deployment

### A. Database Setup
```bash
# Connect to PostgreSQL and create database
createdb agentpay

# Apply database migrations
cd services/gateway
migrate -path migrations -database "postgres://postgres:postgres@localhost:5432/agentpay?sslmode=disable" up
```

### B. Rust Policy Engine
```bash
cd services/policy-engine
cargo build --release
PORT=8081 ./target/release/policy_engine
```
Verify health:
```bash
curl http://localhost:8081/health
# {"status":"ok","version":"0.1.0"}
```

### C. Backend Gateway
```bash
cd services/gateway
go build -o gateway ./cmd/server
./gateway
```
Verify readiness:
```bash
curl http://localhost:8080/ready
# {"status":"ready","service":"gateway","dependencies":{"policy_engine":"ok","storage":"ok"}}
```

### D. Frontend Web Control Center
```bash
cd apps/web
npm install
npm run build
npm run start
```
Control center will be accessible at `http://localhost:3000`.

---

## 4. Smart Contract Deployment (AgentVault on Arc)

### Mainnet Safety Rules:
- Never deploy without `--confirm` or `CONFIRM_MAINNET_DEPLOY="DEPLOY-ARC-MAINNET"`.
- Verify the deployer wallet has sufficient Arc gas balance before broadcasting.

### Deployment Command
```bash
cd scripts
export DEPLOYER_PRIVATE_KEY="<YOUR_64_CHAR_HEX_PRIVATE_KEY>"
export ARC_RPC_URL="https://rpc.mainnet.arc.io"
export ARC_CHAIN_ID="5042"
export ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"

./deploy_mainnet.sh --confirm
```

### Post-Deployment Verification
1. Inspect deployment output for the deployed `AgentVault` address.
2. Query contract bytecode via Arc RPC:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["<AGENTVAULT_ADDRESS>", "latest"],"id":1}' \
     https://rpc.mainnet.arc.io
   ```
3. Verify on Arc Explorer: `https://explorer.arc.io/address/<AGENTVAULT_ADDRESS>`.

---

## 5. Production Configuration Hardening

Before enabling live payment execution:
1. Ensure `EXECUTOR_PRIVATE_KEY` is set in the Gateway environment.
2. Set `ENABLE_LIVE_EXECUTION=true`.
3. Set `CORS_ALLOWED_ORIGINS` to your production frontend domain (e.g. `https://agentpay.io`).
4. Ensure `MAX_REQUEST_BODY_BYTES=1048576` (1MB) to prevent buffer exhaustion.
5. Set `ARC_CONFIRMATION_TIMEOUT_MS=60000` (60 seconds) to accommodate network latency.

---

## 6. Health & Readiness Monitoring

AgentPay distinguishes process liveness from operational readiness:

### Liveness Probe
```bash
GET /health
```
- Returns 200 OK if the Gateway HTTP server is accepting connections.

### Readiness Probe
```bash
GET /ready
```
- Checks that critical dependencies are operational:
  - `policy_engine`: Checks Rust engine HTTP `/health`.
  - `arc_rpc`: Checks Arc node `eth_chainId` (5042).
  - `storage`: Checks PostgreSQL connection pool.
- Returns 503 Service Unavailable with degraded status if any dependency fails.

---

## 7. Emergency Controls & Kill Switches

### Agent Pause
Freezes a specific agent immediately:
```bash
curl -X POST https://api.agentpay.io/v1/agents/{agent_id}/pause \
  -H "Authorization: Bearer $ORG_ADMIN_KEY"
```

### Organization Pause
Halts all agents and payments across the entire organization:
```bash
curl -X POST https://api.agentpay.io/v1/organizations/{org_id}/pause \
  -H "Authorization: Bearer $ORG_ADMIN_KEY"
```

### Global System Kill Switch
Immediately shuts down payment execution across the entire Gateway:
```bash
curl -X POST https://api.agentpay.io/v1/system/pause \
  -H "Authorization: Bearer $SYSTEM_ADMIN_KEY"
```

### Smart Contract Level Pause
Directly pauses the `AgentVault` contract on Arc:
```bash
cast send <AGENTVAULT_ADDRESS> "pause()" \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key $OWNER_PRIVATE_KEY
```

---

## 8. Rollback Strategy

1. **Database Rollback:**
   ```bash
   migrate -path migrations -database "$DATABASE_URL" down 1
   ```
2. **Binary Rollback:**
   Deploy previous immutable Docker image tag or release binary.
3. **Smart Contract Rollback:**
   `AgentVault` contracts are non-upgradeable by design for money-safety invariants. If an unrecoverable contract vulnerability is discovered, invoke `pause()` and withdraw remaining USDC to the owner treasury using `emergencyWithdraw()`.
