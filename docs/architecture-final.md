# AgentPay Final Architecture & Pipeline Specification

> **Specification Version**: 2.1.0  
> **Status**: Final Submission Freeze  
> **Target Settlement Network**: Arc Mainnet (Chain ID `5042`)

---

## 1. Core Execution Pipeline

```
                AI AGENT
                   |
                   v
            PAYMENT INTENT
                   |
                   v
          TRUSTED SERVICE
             REGISTRY
                   |
                   v
          RUST POLICY ENGINE
                   |
             ALLOW / DENY
              /         \
           DENY         ALLOW
            |             |
            X             v
                     GO EXECUTOR
                          |
                          v
                     AGENTVAULT
                          |
                          v
                         USDC
                          |
                          v
                    ARC MAINNET
                          |
                          v
                   VERIFICATION
```

> **CRITICAL ARCHITECTURAL GUARANTEE**:  
> **`DENY` = ZERO BLOCKCHAIN TRANSACTION.**  
> When the Rust Policy Engine returns `DENY`, execution halts immediately. No transaction is created, signed, or broadcast. Zero gas is incurred, and on-chain vault balances remain 100% untouched.

---

## 2. End-to-End System Architecture

```mermaid
flowchart TD
    subgraph UNTRUSTED_TIER["UNTRUSTED TIER"]
        User["User / Operator"] -->|HTTP / Web| Web["Next.js Control Center (/demo)"]
        AI["AI Agent (LLM Reasoning)"] -->|Payment Intent JSON| Gateway
    end

    subgraph TRUSTED_APPLICATION_LOGIC["TRUSTED APPLICATION LOGIC BOUNDARY"]
        Web -->|POST /tasks| Gateway["Go Gateway (:8080)"]
        Gateway -->|Ingest Task| AI
        Gateway -->|Resolve Recipient| Registry["Service Registry"]
        Registry -->|Validated Request| Rust["Rust Policy Engine (:8081)"]
        Rust -->|Deterministic Math| Eval{"ALLOW or DENY?"}
        Eval -->|DENY| Halt["Halt Execution (Zero Tx)"]
        Eval -->|ALLOW| ExecGate["Execution Service"]
        ExecGate -->|Atomic CAS| DB[("PostgreSQL / In-Memory Store")]
        ExecGate -->|EIP-1559 Signer| Signer["Transaction Signer"]
    end

    subgraph ON_CHAIN_SETTLEMENT["ON-CHAIN SETTLEMENT LAYER (ARC MAINNET)"]
        Signer -->|executePayment()| Vault["AgentVault.sol"]
        Vault -->|Enforce On-Chain Limits| USDC["Canonical Arc USDC (0x3600...0000)"]
        USDC -->|Transfer Base Units| Recipient["Service Provider Recipient"]
        Vault -->|Emit Event| Event["PaymentExecuted Event"]
        Event -->|Receipt Verification| ExecGate
    end

    classDef untrusted fill:#4a154b,stroke:#e01e5a,stroke-width:2px,color:#fff;
    classDef trusted fill:#1e3a5f,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef onchain fill:#1a3a2a,stroke:#10b981,stroke-width:2px,color:#fff;

    class User,Web,AI untrusted;
    class Gateway,Registry,Rust,Eval,Halt,ExecGate,DB,Signer trusted;
    class Vault,USDC,Recipient,Event onchain;
```

---

## 3. Trust Boundaries & Invariants

1. **AI is Untrusted**: The LLM never touches private keys or RPC endpoints. It can only request an approved `service_id`.
2. **Server-Side Registry Controls Recipients**: The Go Gateway resolves recipient addresses from an internal catalog, eliminating prompt injection.
3. **Pure Rust Policy Authorization**: Spending limits, daily budgets, and allowlists are evaluated using pure integer arithmetic (`u64`) with zero side effects.
4. **Atomic CAS Double-Spend Defense**: Concurrency is protected in SQL using `UPDATE payment_intents SET status = 'EXECUTING' WHERE status = 'AUTHORIZED'`.
5. **Solidity On-Chain Guardrails**: `AgentVault.sol` independently enforces daily spending limits and owner emergency pause switches directly in EVM bytecode.
