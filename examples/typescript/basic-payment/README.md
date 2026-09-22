# AgentPay TypeScript SDK Quickstart: Basic Payment

This example demonstrates the core developer integration flow for AgentPay using `@agentpay/sdk`:

1. Client initialization
2. Service discovery
3. Price quote retrieval
4. Payment intent creation with idempotency key
5. Status observation
6. Flight recorder trace retrieval
7. Webhook signature verification

## Execution Mode Notice
- **SIMULATION**: When targeting `http://localhost:8080` or development environments, zero real USDC is spent and no Arc settlement takes place.
- **LIVE ARC MAINNET**: When configured with production gateway and credentials, transactions settle on Arc Mainnet Chain ID 5042 via the deployed AgentVault.

## Prerequisites
- Node.js v18+
- TypeScript SDK built in `packages/sdk-typescript`

## Running
```bash
export AGENTPAY_API_KEY="ap_live_your_key"
export AGENTPAY_BASE_URL="http://localhost:8080"
npm install
npm run build
npm start
```
