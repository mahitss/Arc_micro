# AgentPay Deployment & Production Operations Guide

This guide provides reproducible, step-by-step instructions for deploying and operating the complete AgentPay stack: Gateway, Rust Policy Engine, Next.js Web Control Center, AgentVault smart contracts, and PostgreSQL database.

---

## 1. System Architecture

```
                 [ Operator Web Control Center ] (Port 3000)
                                |
                                v
                      [ AgentPay Gateway ] (Port 8080)
                     /         |         \
                    v          v          v
       [ Policy Engine ]  [ PostgreSQL ]  [ Arc Settlement ]
          (Port 8081)     (Port 5432)     (Chain ID 5042)
```

---

## 2. Storage Persistence & Repository Selection

AgentPay supports dual repository implementations with fail-safe initialization:

| Environment | `DATABASE_URL` Present | Resulting Backend | Failure Behavior |
| :--- | :--- | :--- | :--- |
| `development` | No | `MemoryRepository` | Logs warning regarding ephemeral development storage |
| `development` | Yes | `PostgresRepository` | Connects, verifies ping, applies pending migrations. Fails if unreachable (no silent fallback). |
| `production` | No | **FAIL FAST** | Process exits with `DATABASE_URL is required in production mode: refusing to run ephemeral in-memory storage`. |
| `production` | Yes | `PostgresRepository` | Connects, validates pool, applies migrations. Fails immediately on network or auth error. |

### Security & Invariant Rules:
1. **No Silent Fallback:** If `DATABASE_URL` is configured but PostgreSQL cannot be reached, the Gateway will never silently fall back to `MemoryRepository`.
2. **Credential Redaction:** Connection strings printed to logs are strictly sanitized via `SanitizeDatabaseURL()`, masking credentials (e.g. `postgres://user:*****@host:5432/db`).
3. **Automated Migrations:** With `DB_AUTO_MIGRATE=true` (default), the Gateway applies embedded SQL migrations idempotently using the `schema_migrations` tracking table on startup.

---

## 3. Database Connection Pooling

The PostgreSQL connection pool is configurable via environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URI | *(empty in dev, required in prod)* |
| `DB_MAX_OPEN_CONNS` | Maximum open connections to database | `25` |
| `DB_MAX_IDLE_CONNS` | Maximum idle connections kept in pool | `10` |
| `DB_CONN_MAX_LIFETIME_MIN` | Maximum connection reuse duration in minutes | `15` |
| `DB_CONN_MAX_IDLE_TIME_MIN` | Maximum idle connection duration in minutes | `5` |
| `DB_AUTO_MIGRATE` | Run embedded migrations on startup | `true` |

---

## 4. Local Development Setup

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
This boots 4 containerized services connected on the internal `agentpay-network`:
- **`postgres`** on port `5432` with persistent data volume `postgres_data` and healthcheck (`pg_isready`)
- **`policy-engine`** on port `8081` with healthcheck (`curl http://localhost:8081/health`)
- **`gateway`** on port `8080` with healthcheck (`curl http://localhost:8080/health`), connected to PostgreSQL and Policy Engine
- **`web`** on port `3000` with healthcheck (`curl http://localhost:3000/api/health`)

Verify system readiness:
```bash
curl http://localhost:8080/ready
# {"status":"ready","service":"gateway","dependencies":{"policy_engine":"ok","storage":"ok"}}
```

---

## 5. Manual Component Execution

### A. Database Migrations
Migrations are embedded inside the Gateway binary (`migrations/*.up.sql`) and run automatically when `DB_AUTO_MIGRATE=true`.
Alternatively, run them externally via standard migration tools:
```bash
cd services/gateway
# Migration files 000001 through 000006 are in services/gateway/migrations/
```

### B. Rust Policy Engine
```bash
cd services/policy-engine
cargo build --release
PORT=8081 ./target/release/policy_engine
```
Run Criterion benchmarks:
```bash
cargo bench
```

### C. Backend Gateway
```bash
cd services/gateway
go build -o bin/gateway ./cmd/server
./bin/gateway
```

### D. Frontend Web Control Center
```bash
cd apps/web
npm ci
npm run build
npm run start
```
Control center will be accessible at `http://localhost:3000`.

---

## 6. Continuous Integration (CI)

The GitHub Actions CI pipeline (`.github/workflows/ci.yml`) validates all 7 components:
1. **`web`**: Next.js lint, unit tests, and production build
2. **`gateway`**: Go fmt, vet, unit/integration tests, and binary compilation
3. **`policy-engine`**: Rust formatting, unit tests, and release compilation
4. **`contracts`**: Foundry build and Solidity test suite
5. **`sdk-typescript`**: TypeScript SDK compilation and test suite
6. **`sdk-python`**: Python SDK installation and pytest suite
7. **`cli`**: Developer CLI dependency build, compilation, and tests
