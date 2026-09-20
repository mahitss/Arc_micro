# AgentPay Reference Autonomous Research Agent

This example demonstrates how an autonomous AI agent uses the `@agentpay/sdk` to procure paid external services on the Arc settlement layer without managing private keys or directly touching the on-chain `AgentVault`.

---

## The AgentPay Paradigm

```
AI Agent
   │
   ▼
AgentPay SDK (@agentpay/sdk)
   │
   ▼
Create Payment Intent (POST /v1/payment-intents)
   │
   ├── Deterministic Policy Engine (Rust)
   ├── Deterministic Risk Engine
   └── Spending Limits & Approved Recipients
   │
   ▼
Decision: [ ALLOW | APPROVAL_REQUIRED | DENY ]
   │
   ▼
Settlement on Arc via AgentVault (USDC)
```

The AI agent:
- **NEVER** signs transactions
- **NEVER** holds private keys
- **NEVER** chooses arbitrary recipient addresses
- **NEVER** bypasses financial spending limits

All financial controls are enforced deterministically by AgentPay.

---

## Quickstart

### 1. Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your `AGENTPAY_API_KEY`:
```env
AGENTPAY_API_KEY=apk_live_demo1234567890abcdef1234567890abcdef
AGENTPAY_BASE_URL=http://localhost:8080
```

### 2. Run the Example

```bash
npm run dev
```

---

## Code Walkthrough

```typescript
import { AgentPay } from '@agentpay/sdk';

// 1. Initialize Client
const agentpay = new AgentPay({
  apiKey: process.env.AGENTPAY_API_KEY,
  baseUrl: process.env.AGENTPAY_BASE_URL,
});

// 2. Discover Registered Services
const services = await agentpay.services.list();

// 3. Create Payment Intent (with Idempotency Key)
const payment = await agentpay.paymentIntents.create(
  {
    agentId: 'agent_research',
    service: 'research-api',
    amount: '1200000', // 1.20 USDC
    asset: 'USDC',
    purpose: 'Market intelligence telemetry report',
  },
  { idempotencyKey: 'req_research_12345' }
);

// 4. Inspect Policy Decision & Settle
if (payment.status === 'AUTHORIZED') {
  const result = await agentpay.paymentIntents.confirm(payment.id);
  console.log(`Settled on Arc: ${result.execution.transaction_hash}`);
}
```
