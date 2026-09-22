# @agentpay/sdk — Official TypeScript SDK

The `@agentpay/sdk` is the official client library for integrating autonomous AI agents with the AgentPay financial control plane and Arc USDC settlement layer.

---

## Key Features

- 🔒 **Zero Private Keys**: Never touch private keys or construct blockchain calldata.
- ⚡ **Autonomous Procurement**: Agents procure external services with deterministic financial safety.
- 🛡️ **Deterministic Spending Controls**: Hard limits enforced before transactions touch the chain.
- 🔁 **Built-in Idempotency**: Safe automated retries with `idempotencyKey`.
- 🧩 **Fully Typed**: Complete TypeScript typings, interfaces, and specialized exception classes.

---

## Installation

```bash
npm install @agentpay/sdk
# or
pnpm add @agentpay/sdk
# or
yarn add @agentpay/sdk
```

---

## Quick Initialization

```typescript
import { AgentPay } from '@agentpay/sdk';

const agentpay = new AgentPay({
  apiKey: process.env.AGENTPAY_API_KEY,
  baseUrl: process.env.AGENTPAY_BASE_URL || 'http://localhost:8080',
});
```

---

## SDK Methods

### 1. Payment Intents (`agentpay.paymentIntents`)

#### Create a Payment Intent
```typescript
const payment = await agentpay.paymentIntents.create(
  {
    agentId: 'agent_research',
    service: 'research-api',
    amount: '1200000', // Base units (1.20 USDC)
    asset: 'USDC',
    purpose: 'Market intelligence report procurement',
    justification: 'Automated retrieval of on-chain telemetry',
  },
  {
    idempotencyKey: 'req_research_99991', // Guarantees exactly-once creation
  }
);

console.log(payment.id); // e.g. "intent_9525df7cd3120591"
console.log(payment.status); // "AUTHORIZED" | "APPROVAL_REQUIRED" | "DENIED"
console.log(payment.recipient); // Authoritative server-resolved address
```

#### Retrieve Intent Details
```typescript
const detail = await agentpay.paymentIntents.get('intent_9525df7cd3120591');
console.log(detail.execution_status); // "CONFIRMED"
console.log(detail.transaction_hash); // "0x1c3cef38833ca20bf6548a29eabf43c811952e0f1b5101ec6514a68e661e5207"
```

#### List Intents
```typescript
const intents = await agentpay.paymentIntents.list({ status: 'AUTHORIZED' });
```

#### Confirm & Execute Payment on Arc
```typescript
const result = await agentpay.paymentIntents.confirm('intent_9525df7cd3120591');
console.log(result.intent.status); // "CONFIRMED"
```

---

### 2. Services Registry (`agentpay.services`)

```typescript
// Discover approved external service providers
const services = await agentpay.services.list();
services.forEach((s) => {
  console.log(`${s.id}: ${s.name} (Max Price: ${Number(s.max_price) / 1e6} ${s.asset})`);
});

// Get service details
const service = await agentpay.services.get('research-api');
```

---

### 3. Agents & Policies (`agentpay.agents`)

```typescript
// List agents
const agents = await agentpay.agents.list();

// Inspect agent limits and policy configuration
const agent = await agentpay.agents.get('agent_research');
console.log(agent.policy.per_transaction_limit);
console.log(agent.policy.daily_spending_limit);
console.log(agent.usdc_balance);
```

---

### 4. Approvals Control Plane (`agentpay.approvals`)

```typescript
// List pending approvals
const pending = await agentpay.approvals.list();

// Grant human approval
await agentpay.approvals.approve('appr_123');

// Reject payment
await agentpay.approvals.reject('appr_123');
```

---

### 5. Transactions (`agentpay.transactions`)

```typescript
// List all on-chain settlements
const transactions = await agentpay.transactions.list();

// Get transaction for a specific intent
const tx = await agentpay.transactions.get('intent_9525df7cd3120591');
console.log(tx.transaction_hash);
```

### 5. Financial Flight Recorder Trace (`agentpay.payments.trace`)

Retrieve the deterministic decision trace:

```typescript
const trace = await agentpay.payments.trace('intent_123');
console.log(`Trace: ${trace.trace_id}, Execution Mode: ${trace.execution_mode}`);
trace.steps.forEach(s => console.log(`[${s.type}] ${s.status}`));
```

### 6. Webhook Verification

```typescript
import { verifyWebhookSignature } from '@agentpay/sdk';

const isValid = verifyWebhookSignature(
  rawBody,
  req.headers['agentpay-signature'],
  process.env.AGENTPAY_WEBHOOK_SECRET
);
```

---

## Error Handling

All SDK operations throw typed errors derived from `AgentPayError`:

```typescript
import {
  AgentPayError,
  PolicyDeniedError,
  ApprovalRequiredError,
  UnauthorizedError,
  NotFoundError,
  RateLimitError,
} from '@agentpay/sdk';

try {
  const intent = await agentpay.payments.create({ ... });
} catch (err) {
  if (err instanceof PolicyDeniedError) {
    // Payment violated spending policy
    console.error(`Denied: ${err.message} (Trace: ${err.requestId})`);
  } else if (err instanceof UnauthorizedError) {
    // Missing or revoked API key
    console.error('Invalid credentials');
  } else if (err instanceof NotFoundError) {
    // Resource does not exist
    console.error('Resource not found');
  } else if (err instanceof AgentPayError) {
    console.error(`AgentPay API error [${err.code}]: ${err.message}`);
  }
}
```

