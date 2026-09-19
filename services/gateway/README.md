# AgentPay Gateway Service

The Go API Gateway serves as the entrypoint for autonomous AI agents requesting payments and provides blockchain/RPC infrastructure, event streaming, and service orchestration.

## Responsibilities

- Expose HTTP endpoints for agent payment intent submission.
- Relay intents to the deterministic Rust Policy Engine.
- Manage RPC connections and event streaming.
- Provide health and telemetry checks.

## Endpoints

- `GET /health`: Returns service health status.
  ```json
  {
    "status": "ok",
    "service": "gateway"
  }
  ```

## Local Development

```bash
# Run tests
go test -v ./...

# Run service
go run ./cmd/server
```

## Environment Variables

- `GATEWAY_PORT`: Port to listen on (default: `8080`).
- `POLICY_ENGINE_URL`: URL of the Rust Policy Engine (default: `http://localhost:8081`).
- `ARC_RPC_URL`: Arc Blockchain RPC endpoint (placeholder).
- `ARC_CHAIN_ID`: Arc Network Chain ID (placeholder).
- `ARC_USDC_ADDRESS`: USDC token address on Arc (placeholder).
