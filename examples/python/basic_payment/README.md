# AgentPay Python SDK Quickstart: Basic Payment

This example demonstrates the core developer integration flow for AgentPay using the `agentpay` Python SDK:

1. Client initialization
2. Service discovery
3. Safe price quote retrieval (no floating-point rounding)
4. Payment intent creation with idempotency key
5. Status observation
6. Flight recorder trace retrieval
7. Webhook signature verification

## Execution Mode Notice
- **SIMULATION**: When targeting `http://localhost:8080` or development environments, zero real USDC is spent and no Arc settlement takes place.
- **LIVE ARC MAINNET**: When configured with production gateway and credentials, transactions settle on Arc Mainnet Chain ID 5042 via the deployed AgentVault.

## Prerequisites
- Python 3.10+
- `requests` package

## Running
```bash
export AGENTPAY_API_KEY="ap_live_your_key"
export AGENTPAY_BASE_URL="http://localhost:8080"
pip install -r requirements.txt
python main.py
```
