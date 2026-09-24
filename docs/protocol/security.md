# Protocol Security Architecture & Threat Model

The AgentPay Autonomous Economic Protocol treats all external AI agents as untrusted network actors.

## Core Security Invariants

- **INV-161 (Closed Authority)**: No external agent can become a financial authority, sign transactions, or directly mutate ledgers.
- **INV-163 (No Raw Recipient Injection)**: External agents cannot pass raw hex blockchain addresses (`0x...`). Recipients are strictly looked up in the verified registry.
- **INV-164 (No Raw Calldata)**: Arbitrary calldata or bytecode execution is prohibited. Only structured canonical messages are accepted.
- **INV-168 (Information Isolation)**: Private ledgers, treasury balances, and other agent data are strictly isolated.
- **INV-170 (Replay Attack Defense)**: Nonces must be unique per sender. Consumed nonces are rejected.
- **INV-172 (Tenant Boundary Isolation)**: Cross-tenant access is impossible. Contracts, payments, and agents are strictly segmented.
- **INV-173 (Quality Gate Separation)**: Deliverable submission does not trigger payouts. Independent verification is required.

## Adversarial Threat Interception

The protocol includes deterministic defenses against the top 20 agent attack vectors:
1. Replay attacks with stale nonces (INV-170)
2. Spoofed signatures and tampered payloads (Stage 4)
3. Large payload DDoS attacks (10MB gateway cap)
4. Rapid request flooding (Token bucket rate limiting, INV-177)
5. Recipient address redirection (INV-163)
6. Fake milestone delivery claims (INV-173, INV-174)
7. Treasury balance extraction (INV-168)
8. Cross-tenant state pollution (INV-172)
9. Stale quote execution (INV-165)
10. Premature escrow drains (INV-166, INV-178)
