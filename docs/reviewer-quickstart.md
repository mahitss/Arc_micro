# Reviewer Quickstart: 5-Minute Evaluation Guide

Welcome, reviewer! This guide enables you to verify and test AgentPay in under 5 minutes.

---

## 1. Quick Local Setup (Docker)

```bash
git clone https://github.com/mahitss/Arc_micro.git
cd Arc_micro
cp .env.example .env
docker-compose up -d
```
All four services are now running:
- **Web Control Center:** `http://localhost:3000`
- **Go API Gateway:** `http://localhost:8080`
- **Rust Policy Engine:** `http://localhost:8081`
- **PostgreSQL Database:** `localhost:5432`

---

## 2. Verify Health & Readiness

```bash
# Check Gateway Liveness & Dependency Readiness
curl http://localhost:8080/ready
# Expected: {"status":"ready","service":"gateway","dependencies":{"policy_engine":"ok","storage":"ok"}}
```

---

## 3. Run the Automated Test Suites

Verify all test suites passing with zero errors:

```bash
# 1. Gateway Unit & Security Invariants (Go)
cd services/gateway
go test -count=1 ./...

# 2. Deterministic Policy Engine (Rust)
cd ../policy-engine
cargo test

# 3. Smart Contract & Fuzz Tests (Solidity / Foundry)
cd ../../contracts
forge test

# 4. TypeScript SDK
cd ../packages/sdk-typescript
npm test

# 5. Python SDK
cd ../sdk-python
python -m unittest tests/test_sdk.py
```

---

## 4. Test the Autonomous Agent Hero Demo

1. Open **`http://localhost:3000/demo`** in your browser.
2. Select **Autonomous Research Agent**.
3. Click **"Run Autonomous Task"**.
4. Observe the real-time execution lifecycle:
   - **Service Discovery:** Resolves `Web Research & Intelligence API` ($0.18 USDC quote).
   - **Payment Intent:** Structured payload generated; recipient resolved server-side.
   - **Policy Engine:** Evaluated in sub-millisecond by Rust engine (`ALLOW`, `RISK_LOW`).
   - **Settlement:** Simulates Arc AgentVault payment confirmation.
   - **Audit Trail:** Inspect the created event in `http://localhost:3000/developers/events`.

---

## 5. Test Key Security & Invariant Defenses

Try attempting an unauthorized action:

### Test A: Agent Self-Approval (Must Fail)
```bash
# An agent trying to approve its own payment intent fails closed with 403
curl -X POST http://localhost:8080/v1/approvals/app_self/approve \
  -H "Content-Type: application/json" \
  -d '{"approver_id":"research-agent"}'
# Response: 403 Forbidden ("SELF_APPROVAL_PROHIBITED")
```

### Test B: Cross-Tenant IDOR (Must Fail)
```bash
# Org A attempting to access Org B payment intent
curl -X GET http://localhost:8080/v1/payment-intents/intent_orgB_01 \
  -H "X-Organization-ID: org_A"
# Response: 404 Not Found (zero resource enumeration)
```

---

## 6. Inspect Arc Mainnet Architecture Evidence

- Review the formal Arc settlement parameters in [`docs/arc-integration.md`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/docs/arc-integration.md).
- Review verified test evidence and deployment readiness in [`docs/arc-mainnet-evidence.md`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/docs/arc-mainnet-evidence.md).
