# AgentPay Developer 5-Minute Quickstart

Welcome to AgentPay — the programmable financial control plane for autonomous AI agents on Arc.

In this 5-minute quickstart, you will:
1. Install the SDK / CLI
2. Configure your API key
3. Query approved services
4. Request a payment from an AI agent with idempotency
5. Observe policy evaluation and Arc settlement
6. Verify an incoming webhook signature

---

## 1. Installation

### TypeScript / Node.js
```bash
npm install @agentpay/sdk
```

### Python
```bash
pip install agentpay
```

### CLI
```bash
npm install -g @agentpay/cli
```

---

## 2. Authentication

Configure your API key in your environment or CLI:

```bash
export AGENTPAY_API_KEY="ap_live_your_key_here"
export AGENTPAY_BASE_URL="http://localhost:8080" # or production endpoint
```

Or configure via CLI:
```bash
agentpay config set api-key ap_live_your_key_here
agentpay config set base-url http://localhost:8080
```

---

## 3. Discover Approved Services

Agents can only pay approved service providers registered in the organization registry.

### TypeScript
```typescript
import { AgentPay } from '@agentpay/sdk';

const agentpay = new AgentPay({ apiKey: process.env.AGENTPAY_API_KEY });

const services = await agentpay.services.list();
console.log('Approved Services:', services);
```

### CLI
```bash
agentpay services list
```

---

## 4. Request a Payment from an AI Agent

> [!IMPORTANT]
> **Zero Private Keys Invariant**: The agent never holds private keys, signs transactions, or selects recipient addresses. AgentPay resolves the recipient and executes settlement.

> [!TIP]
> **Denomination**: Amounts are specified as strings in base units (6 decimals for USDC: `1000000` = $1.00 USDC, `2500000` = $2.50 USDC).

### TypeScript
```typescript
import { AgentPay, PolicyDeniedError, ApprovalRequiredError } from '@agentpay/sdk';

const agentpay = new AgentPay();

try {
  const payment = await agentpay.paymentIntents.create(
    {
      agentId: 'agent_research_01',
      service: 'research-api',
      amount: '1500000', // 1.50 USDC
      asset: 'USDC',
      purpose: 'Procure real-time market liquidity telemetry',
      justification: 'Automated agent research task',
    },
    {
      idempotencyKey: 'task_run_12345', // Prevents double-charging on network retries
    }
  );

  console.log(`Payment Intent Created: ${payment.id}`);
  console.log(`Status: ${payment.status}`); // AUTHORIZED, APPROVAL_REQUIRED, or DENIED

  if (payment.status === 'AUTHORIZED') {
    // Confirm settlement on Arc
    const settlement = await agentpay.paymentIntents.confirm(payment.id);
    console.log('Confirmed on Arc! Tx Hash:', settlement.execution.transaction_hash);
  }
} catch (err) {
  if (err instanceof PolicyDeniedError) {
    console.error('Payment violated policy limits:', err.message);
  } else if (err instanceof ApprovalRequiredError) {
    console.warn('Payment requires human approval in dashboard.');
  }
}
```

### CLI
```bash
agentpay payments create \
  --agent agent_research_01 \
  --service research-api \
  --amount 1500000 \
  --purpose "Procure market telemetry" \
  --idempotency-key "cli_test_001"
```

---

## 5. Formalized Agent Tool Contract

If you are using LangChain, CrewAI, AutoGen, or custom agent loops, expose the formalized `request_payment` tool contract:

```typescript
import { AgentPaymentTool } from '@agentpay/example-payment-agent';

// Tool input
const result = await agentTool.requestPayment({
  service_id: 'research-api',
  amount: '1500000',
  purpose: 'Analyze orderbook depth',
  idempotency_key: 'agent_step_42',
});

// The tool returns a structured decision with actionable next_action:
switch (result.next_action) {
  case 'CONTINUE':
  case 'WAIT_FOR_EXECUTION':
    // Payment approved! Agent retrieves the paid data.
    break;
  case 'WAIT_FOR_APPROVAL':
    // Limit exceeded. Agent notifies human user to approve in dashboard.
    break;
  case 'HANDLE_DENIAL':
    // Policy rejected. Agent pivots to alternative free resource.
    break;
}
```

---

## 6. Verify Incoming Webhooks

AgentPay signs all webhooks using HMAC-SHA256 (`AgentPay-Signature: t=<unix>,v1=<sig>`).

```typescript
import express from 'express';
import { AgentPay } from '@agentpay/sdk';

const app = express();
const agentpay = new AgentPay();

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['agentpay-signature'] as string;

  const isValid = agentpay.webhooks.verifySignature({
    payload: req.body,
    signature,
    secret: process.env.AGENTPAY_WEBHOOK_SECRET!,
    toleranceSeconds: 300, // Replay attack protection
  });

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());
  console.log(`Received verified event: ${event.type} (${event.id})`);

  // Consumers should treat event.id as idempotency key
  res.status(200).json({ received: true });
});
```

---

## 7. Polling Payment Completion

For asynchronous payments requiring approval or on-chain mining, use `waitForCompletion()`:

```typescript
const detail = await agentpay.paymentIntents.waitForCompletion(payment.id, {
  timeoutMs: 60000,   // Wait up to 60s
  intervalMs: 2000,    // Poll every 2s
});

console.log('Final Status:', detail.intent.status);
console.log('Transaction Hash:', detail.transaction_hash);
```
