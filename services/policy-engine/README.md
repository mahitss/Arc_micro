# AgentPay Policy Engine

The Rust Policy Engine is the deterministic, security-critical component responsible for validating payment intents before any on-chain transaction can occur on the Arc blockchain.

## Responsibilities

- Evaluate agent payment intents against deterministic spending policies (per-transaction, per-hour, per-day).
- Validate recipient addresses against whitelists and contract registries.
- Produce explicit, auditable `ALLOW` or `DENY` decisions with reason codes.
- Strict invariant: Zero floating-point arithmetic. All token values are processed as integers in smallest units.

## Endpoints

- `GET /health`: Returns service health status.
  ```json
  {
    "status": "ok",
    "service": "policy-engine"
  }
  ```

## Local Development

```bash
# Run tests
cargo test

# Run service
cargo run
```

## Environment Variables

- `POLICY_ENGINE_PORT`: Port to listen on (default: `8081`).
