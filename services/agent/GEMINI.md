# AgentPay Autonomous Agent Service (Google ADK)

This service implements the autonomous agent runtime for AgentPay using Google ADK and Gemini.

## Architectural Principles
1. **AI Agents Never Hold Private Keys**: The agent only interacts with the AgentPay Gateway HTTP API to propose `PaymentIntent` objects.
2. **Deterministic Governance**: All value movement is authorized by the Rust Policy Engine and signed/settled by the Go Settlement Gateway on Arc Mainnet.
3. **Structured Intents**: Expenditure must always specify minimum integer base units (micro-USDC strings, never floats) and explicit justification.

## Development Workflow
- Check status: `agents-cli info`
- Test interactively: `agents-cli playground`
- Run evaluations: `agents-cli eval run`
