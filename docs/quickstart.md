# AgentPay Developer Quickstart Guide

Get the complete AgentPay local development environment up and running in under 5 minutes.

---

## 1. Prerequisites

Ensure you have the following installed:
- **Go**: `1.22+`
- **Rust & Cargo**: `1.78+`
- **Node.js**: `18+` and `npm`
- **Foundry**: `forge` and `cast` ([https://getfoundry.sh](https://getfoundry.sh))

---

## 2. Clone & Setup Environment

```bash
# Clone the repository
git clone https://github.com/mahitss/Arc_micro.git
cd Arc_micro

# Initialize environment variables
cp .env.example .env
```

The default `.env` is preconfigured for safe local development (`ENABLE_LIVE_EXECUTION=false`, in-memory storage, mock AI model).

---

## 3. Start Local Services

You can start all three core services using the automated dev script or individually:

### Option A: Automated Script (Linux / macOS / Git Bash)
```bash
./scripts/dev.sh
```

### Option B: Manual Service Startup (3 Terminals)

**Terminal 1: Rust Policy Engine (Port 8081)**
```bash
cd services/policy-engine
cargo run --release
```

**Terminal 2: Go Gateway (Port 8080)**
```bash
cd services/gateway
go run cmd/server/main.go
```

**Terminal 3: Next.js Web Control Center (Port 3000)**
```bash
cd apps/web
npm install
npm run dev
```

---

## 4. Run Verification Tests

Run the complete test suite across all 4 system layers:

```bash
# 1. Smart Contract Tests (Solidity)
cd contracts && forge test

# 2. Policy Engine Tests (Rust)
cd ../services/policy-engine && cargo test

# 3. Gateway & Integration Tests (Go)
cd ../gateway && go test -v ./...

# 4. Frontend Unit Tests & Linter (TypeScript)
cd ../../apps/web && npm test && npm run lint
```

---

## 5. Explore the Control Center & Demo

1. Open your browser to **[http://localhost:3000](http://localhost:3000)**.
2. Navigate to the **[Interactive Demo](http://localhost:3000/demo)** route (`/demo`):
   - Click **"Run Research Agent Demo"** to see the 5-step pipeline authorize a 0.18 USDC payment.
   - Click **"Test Policy Denial"** to see the Rust policy engine reject an over-limit request with `DAILY_LIMIT_EXCEEDED` and zero blockchain transactions.
3. Check system status and health in the main **Dashboard** (`/dashboard`).

---

## 6. Architecture Reference

For an in-depth breakdown of the architecture, trust boundaries, and Arc settlement mechanics:
- [Architecture & Trust Boundaries](architecture-final.md)
- [Why Arc?](why-arc.md)
- [Deployment Runbook](deployment.md)
- [Known Limitations](limitations.md)
