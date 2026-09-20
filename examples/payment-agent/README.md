# AgentPay Example Payment Agent

This example demonstrates how an untrusted autonomous AI agent procures paid services through AgentPay's programmable financial control plane.

## Key Principles

1. **Zero Private Keys**: The agent never holds private keys, signs blockchain transactions, or interacts directly with the `AgentVault` smart contract.
2. **Formalized Tool Contract**: The agent invokes a structured `request_payment` tool contract and receives actionable next steps (`CONTINUE`, `WAIT_FOR_APPROVAL`, `WAIT_FOR_EXECUTION`, `HANDLE_DENIAL`, `HANDLE_FAILURE`).
3. **Idempotency**: Every payment intent is tagged with an `idempotency_key` to avoid duplicate charges on network retries.
4. **Webhook Verification**: Real-time events are cryptographically verified using HMAC-SHA256 and processed idempotently using `event.id`.

## Setup & Running

```bash
cd examples/payment-agent
npm install
npm run build

# Run the agent
npm start

# Run the webhook receiver server
npm run webhook
```
