# AgentPay — 60-Second Elevator Pitch

Autonomous AI agents are hiring peers and executing multi-step tasks, but granting them raw crypto wallets creates catastrophic risks of prompt injection, infinite retry loops, and treasury drain.

AgentPay is the financial control plane for autonomous AI agents. Our principle is simple: **autonomy can expand, but financial authority cannot.**

Architecturally, agents never touch private keys. They generate structured intents; an independent Rust policy engine validates spending caps, allowlists, and risk bounds in microseconds. The Go gateway orchestrates atomic double-entry reservations, while the Arc blockchain provides deterministic micro-settlement.

Arc’s native USDC gas model is revolutionary here: agents transact and pay gas entirely in USDC, eliminating slippage and dual-token complexity.

With lease fencing, idempotent replay protection, and zero raw calldata authority, AgentPay makes agentic commerce safe. Without financial controls, enterprise multi-agent systems cannot exist. AgentPay unlocks the agentic economy: **AI requests, AgentPay controls, and Arc settles.**
