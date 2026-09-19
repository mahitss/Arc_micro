# @agentpay/shared

Shared TypeScript schemas, types, and mathematical invariants for AgentPay.

## Invariants

- **Zero Floating-Point Arithmetic**: Token amounts must never use floating-point numbers (`number`). All amounts are represented as `bigint` or strings representing integer micro-units (6 decimal places for USDC).
- **Explicit Types**: Types shared across frontend and orchestration layers for payment intents and policy evaluation responses.
