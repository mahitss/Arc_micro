# @agentpay/sdk

Official TypeScript client library for **AgentPay** — the programmable financial control plane for AI agents on Arc.

## Overview
AgentPay allows autonomous agents to safely discover services, request quotes, and trigger programmable payments governed by deterministic spending policies and human approvals without handling blockchain private keys.

## Installation
```bash
npm install @agentpay/sdk
```

## Quickstart
```typescript
import { AgentPay } from '@agentpay/sdk';

const client = new AgentPay({ apiKey: process.env.AGENTPAY_API_KEY });

// 1. Discover services
const services = await client.services.list({ enabled: true });

// 2. Request quote
const quote = await client.services.getQuote(services[0].id, { amount: "180000" });

// 3. Create payment intent
const payment = await client.payments.create(
  {
    agentId: 'agent_alpha',
    serviceId: quote.service_id,
    quoteId: quote.quote_id,
    amount: quote.amount,
    asset: 'USDC',
    purpose: 'Market telemetry retrieval',
  },
  { idempotencyKey: 'task_001_run_01' }
);

// 4. Inspect flight recorder trace
const trace = await client.payments.trace(payment.id);
console.log('Trace ID:', trace.trace_id, 'Status:', trace.status);
```

## Security Invariants
- **Zero Private Keys**: Agents cannot sign raw transactions or manage gas.
- **Server-Side Recipient Resolution**: Payments route exclusively to registered, approved services.
- **Deterministic Policy Enforcement**: Spending caps and velocity controls enforced before execution.
