# AgentPay

Programmable USDC payment infrastructure for autonomous AI agents on Arc.

## Short Description
AgentPay is a high-assurance, programmable payment infrastructure designed for autonomous AI agents operating on Arc. It enforces deterministic, off-chain policy verification (written in Rust) and on-chain vault safeguards (written in Solidity) to ensure AI agents never hold signing keys or execute unconstrained transactions with company treasury funds.

## Problem
Autonomous AI agents are increasingly tasked with procuring resources: purchasing API credits, buying dataset access, subscribing to compute clusters, and paying micro-fees. However, giving an LLM-driven agent direct access to an unconstrained Web3 private key is a critical security hazard. Prompt injections, stochastic drift, and reasoning hallucination can cause an agent to drain an entire wallet, pay malicious addresses, or execute arbitrary calldata.

## Solution
AgentPay enforces strict architectural decoupling:
1. **AI is Untrusted**: Agents only emit structured payment intents (specifying recipient, amount, reason, and context). They have zero access to private keys or signing logic.
2. **Deterministic Service Registry**: Intents must match pre-approved services in a cryptographic registry.
3. **Deterministic Rust Policy Engine**: Formal validation enforces per-transaction limits, 24-hour velocity caps, asset checks, and recipient whitelisting. If an intent violates policy, it is rejected with a `DENY` decision, resulting in zero blockchain interaction.
4. **On-Chain AgentVault Guardrails**: Payments that pass policy are signed by a trusted backend executor and routed to `AgentVault.sol` on Arc. The smart contract enforces an independent layer of defense-in-depth: pause switches, per-agent caps, withdrawal restrictions, and strict native USDC compliance.

## Why Arc
1. **Native USDC Gas Currency**: Arc operates with USDC as its native gas token (`0x3600000000000000000000000000000000000000`), eliminating the multi-token friction of funding agents with both native gas tokens (ETH/MATIC) and settlement stablecoins.
2. **Sub-Second Finality & Predictable Fees**: Machine-to-machine micropayments require instantaneous settlement and deterministic micro-cent transaction fees.
3. **Chain Architecture**: Arc's deterministic execution environment provides an ideal settlement substrate for high-frequency autonomous agent workflows.

## Technical Architecture
```
        AI AGENT (Untrusted)
                 |
                 v (Structured Intent)
         PAYMENT INTENT
                 |
                 v (Verify Service)
       TRUSTED SERVICE REGISTRY
                 |
                 v (Validate Rules)
       RUST POLICY ENGINE
                 |
           ALLOW / DENY
            /         \
         DENY         ALLOW
          |             |
     (Zero Tx)          v
                   GO EXECUTOR (Signs with Executor Key)
                        |
                        v (executePayment)
                   AGENTVAULT (Solidity)
                        |
                        v (Transfer)
                   USDC (Native Arc Token)
                        |
                        v
                   ARC MAINNET (Chain ID: 5042)
                        |
                        v
                  VERIFICATION (Explorer & Receipt)
```

## Security Model
- **No Agent Keys**: Agents never touch private keys, seeds, or signers.
- **Dual-Layer Enforcement**:
  - *Layer 1 (Off-Chain Policy Engine)*: Rust engine checks amount <= tx limit, 24-hour spent + amount <= daily limit, recipient == allowed recipient, token == USDC.
  - *Layer 2 (On-Chain AgentVault)*: Smart contract checks agent authorization, daily spending limit, paused state, and emits auditable `PaymentExecuted` events.
- **Idempotency**: Every intent is cryptographically hashed and assigned an idempotency key to prevent double-spending or replay attacks.

## What Is Actually Deployed
- **Arc Mainnet Configuration**: Verified Arc Mainnet parameters (Chain ID `5042` / `0x13b2`, RPC `https://rpc.mainnet.arc.io`, Native USDC `0x3600000000000000000000000000000000000000`).
- **Contracts**: `AgentVault.sol` is fully implemented, verified with 42 Foundry test cases, and deployment script `scripts/deploy_mainnet.sh` is prepared.
- **On-Chain Vault**: NOT VERIFIED (Contract compiled and verified locally; deployment script ready for funded operator broadcast).
- **Backend Services**: Go Gateway and Rust Policy Engine are implemented, fully tested, and containerized via Docker.
- **Control Center UI**: Next.js 14 web dashboard with real-time intent creation, audit logs, and on-chain verification views.

## How To Verify It
1. **Run Full Test Suite**:
   ```bash
   # Rust Policy Engine
   cd services/policy-engine && cargo test
   # Go Gateway
   cd services/gateway && go test ./...
   # Solidity Contracts
   cd contracts && forge test
   # Frontend
   cd apps/web && npm test && npm run build
   ```
2. **Verify Arc Network Integration**:
   ```bash
   ./scripts/verify_mainnet.sh
   ```
3. **Launch Local Services & Demo**:
   ```bash
   ./scripts/dev.sh
   ```
   Navigate to `http://localhost:3000` to trigger authorized and denied payment flows.

## Known Limitations
1. **Mainnet Broadcast Pending Operator Funding**: `AgentVault.sol` has not yet been broadcasted to Arc Mainnet live because live broadcast requires a funded private key with Arc USDC for gas.
2. **Hardware Security Module (HSM)**: In the current prototype, the Go executor uses a local environment private key; production enterprise deployments should integrate AWS KMS or HashiCorp Vault.
3. **Dynamic Service Registry Updates**: In the current version, service registry entries are configured via static configuration files rather than on-chain decentralized governance.

## Links
- **Repository**: https://github.com/mahitss/Arc_micro
- **Live App**: NOT PROVIDED
- **Demo Video**: NOT PROVIDED
- **Arc Explorer**: https://explorer.arc.io
- **Builder Profile**: NOT PROVIDED
