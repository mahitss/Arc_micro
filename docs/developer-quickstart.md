# AgentPay Developer Quickstart

Integrate deterministic financial controls and autonomous Arc USDC payments into your AI agent in under 10 lines of code.

---

## The 7-Step Integration Workflow

```
1. Create API Key
       │
2. Configure Environment
       │
3. Discover Services
       │
4. Create Payment Intent
       │
5. Inspect Deterministic Policy Decision
       │
6. Handle Approval (if required)
       │
7. Retrieve Settlement Result on Arc
```

---

### Step 1: Create an API Key

Generate an API key via `POST /v1/api-keys` or use your initial development key:

```bash
curl -X POST http://localhost:8080/v1/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My AI Agent Key",
    "scopes": ["payments:read", "payments:create", "agents:read", "services:read"]
  }'
```

Output:
```json
{
  "id": "key_e4b1a23c89d012e4",
  "secret": "ap_live_a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
  "masked_key": "ap_live_...8f90",
  "warning": "This secret will never be displayed again. Store it securely in your environment variables."
}
```

---

### Step 2: Configure Environment

Set your credentials in your project's `.env` file:

```env
AGENTPAY_API_KEY=ap_live_a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90
AGENTPAY_BASE_URL=http://localhost:8080
```

Install the SDK:

```bash
npm install @agentpay/sdk
```

---

### Step 3: Discover Approved Services

In your autonomous agent code:

```typescript
import { AgentPay } from '@agentpay/sdk';

const agentpay = new AgentPay({
  apiKey: process.env.AGENTPAY_API_KEY,
  baseUrl: process.env.AGENTPAY_BASE_URL,
});

// Discover available services and prices
const services = await agentpay.services.list();
console.log(services);
```

---

### Step 4: Create a Payment Intent

When your agent decides to procure a paid service, create a Payment Intent with an `idempotencyKey`:

```typescript
const payment = await agentpay.paymentIntents.create(
  {
    agentId: 'agent_research',
    service: 'research-api',
    amount: '1200000', // 1.20 USDC in base units
    asset: 'USDC',
    purpose: 'Market intelligence telemetry report',
  },
  { idempotencyKey: `req_agent_${Date.now()}` }
);
```

---

### Step 5: Inspect Policy Decision

AgentPay evaluates the request against the agent's spending limits and risk engine before money can move:

```typescript
console.log(`Payment Status: ${payment.status}`);
console.log(`Decision: ${payment.decision?.result}`); // "ALLOW" | "APPROVAL_REQUIRED" | "DENY"
console.log(`Risk Level: ${payment.decision?.risk}`);
```

---

### Step 6: Handle Approvals (If Required)

If `payment.status === 'APPROVAL_REQUIRED'`:
- The payment exceeded the agent's autonomous limit or triggered elevated risk.
- It is held safely in the Gateway state machine.
- A human operator approves or rejects it in the Web Control Center (`http://localhost:3000/approvals`).

---

### Step 7: Confirm & Retrieve Settlement Result

Once authorized or approved, confirm execution on Arc:

```typescript
if (payment.status === 'AUTHORIZED') {
  const result = await agentpay.paymentIntents.confirm(payment.id);
  console.log(`Settled on Arc: ${result.execution.transaction_hash}`);
}
```

---

## What the Developer NEVER Does

- ❌ Construct or sign raw blockchain transactions
- ❌ Store or manage executor private keys
- ❌ Specify arbitrary recipient addresses
- ❌ Write custom spending limit checks
- ❌ Write custom approval state machines
- ❌ Directly call `AgentVault` smart contracts

AgentPay handles all policy, risk, and on-chain settlement deterministically.
