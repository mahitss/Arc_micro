# AgentPay Architecture & Trust Boundaries

> **Document Version**: 1.0.0  
> **Status**: Verified Prototype Architecture (Tasks 1–10)  
> **Target Settlement Network**: Arc Mainnet (Chain ID `5042`)

---

## 1. End-to-End System Diagram

```mermaid
flowchart TD
    subgraph Client_Layer["Untrusted Client Layer"]
        U["Operator / User"] -->|Interacts| WEB["Next.js Control Center (/demo)"]
    end

    subgraph Gateway_Boundary["Application Gateway & Orchestration Boundary (Go)"]
        WEB -->|HTTP POST /tasks| GW["Go Gateway (Port 8080)"]
        GW -->|1. Ingest Task| AI["AI Reasoning Agent"]
        AI -->|2. Structured Intent JSON| REG["Service Registry (Server-side)"]
        REG -->|3. Validated Intent| VAL["Intent Validator"]
    end

    subgraph Policy_Boundary["Deterministic Policy Boundary (Rust)"]
        VAL -->|4. Authorize Request| PE["Rust Policy Engine (Port 8081)"]
        PE -->|Evaluate Rules| EVAL{"Limits & Allowlist"}
        EVAL -->|ALLOW| AUTH["Authorization Token"]
        EVAL -->|DENY| REJ["Payment Denied (No Tx)"]
    end

    subgraph Execution_Boundary["Privileged Execution Boundary (Go)"]
        AUTH -->|5. Handshake| EXEC["Execution Service"]
        EXEC -->|Check CAS & Idempotency| DB[("PostgreSQL / State Store")]
        EXEC -->|6. Sign EIP-1559 Tx| SIGN["Executor Signer"]
    end

    subgraph Settlement_Boundary["On-Chain Settlement Layer (Arc Mainnet)"]
        SIGN -->|7. executePayment()| AV["AgentVault.sol"]
        AV -->|Enforce On-Chain Limits| USDC["Canonical Arc USDC (0x3600...)"]
        USDC -->|8. Transfer Value| REC["Service Provider Recipient"]
        AV -->|Emit Event| EVT["PaymentExecuted Event"]
    end

    subgraph Verification_Layer["Verification & Audit Layer"]
        EVT -->|Receipt Confirmed| VER["Transaction Verification"]
        VER -->|Update Status| DB
        DB -->|Real-time State| WEB
    end

    classDef untrusted fill:#4a154b,stroke:#e01e5a,stroke-width:2px,color:#fff;
    classDef policy fill:#1e3a5f,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef execution fill:#1a3a2a,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef onchain fill:#2d1a4e,stroke:#8b5cf6,stroke-width:2px,color:#fff;

    class U,WEB,AI untrusted;
    class PE,EVAL,AUTH,REJ policy;
    class GW,REG,VAL,EXEC,SIGN,DB execution;
    class AV,USDC,REC,EVT,VER onchain;
```

---

## 2. Trust Boundaries & Security Invariants

AgentPay enforces strict isolation between computational intelligence, policy authorization, and cryptographic execution.

### Boundary 1: AI Agent vs. Payment Authority (Untrusted AI)
- **Principle**: The AI model is treated as completely untrusted.
- **Enforcement**:
  - The AI has zero access to private keys, signing credentials, or RPC endpoints.
  - The AI cannot generate raw transactions or specify recipient addresses directly.
  - The AI outputs a structured **Payment Intent** containing only a registered `service_id`, requested `amount`, and `purpose`.
  - The Go Gateway resolves the recipient address strictly from the server-side `Service Registry`. Any attempt by the model to inject or override the recipient address triggers `ErrRecipientManipulation` and terminates the request.

### Boundary 2: Gateway vs. Policy Engine (Deterministic Authorization)
- **Principle**: Off-chain authorization decisions must be mathematically verifiable, isolated, and deterministic.
- **Enforcement**:
  - The **Rust Policy Engine** (`services/policy-engine`) is implemented as an independent, side-effect-free service.
  - It evaluates spending requests against immutable mathematical rules:
    1. Per-transaction limit check (`amount <= per_transaction_limit`).
    2. Daily aggregate spending limit check (`daily_spent + amount <= daily_spending_limit`).
    3. Daily transaction frequency cap (`transactions_today < max_transactions_per_day`).
    4. Explicit recipient allowlists and denylists.
  - If any check fails, the policy engine returns `DENY` with an explicit reason code (e.g., `DAILY_LIMIT_EXCEEDED`).
  - No transaction can be scheduled or broadcast without an explicit `ALLOW`.

### Boundary 3: Execution Service vs. Storage (Atomic CAS & Concurrency)
- **Principle**: Double-spending and replay attacks must be prevented at the gateway layer before touching the blockchain.
- **Enforcement**:
  - Every payment intent transitions through a strict state machine: `CREATED` $\rightarrow$ `AUTHORIZED` $\rightarrow$ `EXECUTING` $\rightarrow$ `SUBMITTED` $\rightarrow$ `CONFIRMED`.
  - The state transition from `AUTHORIZED` to `EXECUTING` uses atomic **Compare-And-Swap (CAS)** via SQL:
    ```sql
    UPDATE payment_intents SET status = 'EXECUTING' WHERE id = $1 AND status = 'AUTHORIZED';
    ```
  - If two concurrent requests attempt to execute the same intent, exactly one succeeds and the other receives an error.

### Boundary 4: Gateway vs. Smart Contract (On-Chain Finality)
- **Principle**: The smart contract is the ultimate on-chain arbiter and does not trust the off-chain gateway.
- **Enforcement**:
  - `AgentVault.sol` enforces its own independent on-chain daily limit (`dailyLimit`) and per-transaction maximum.
  - Even if the Go Gateway were fully compromised, an attacker cannot withdraw or spend more than the hard limit configured on Arc.
  - The vault owner retains an emergency `pause()` switch and an emergency `withdraw()` mechanism to recover funds.

---

## 3. Component Breakdown

| Layer | Technology | Primary Responsibility |
|---|---|---|
| **Web Control Center** | Next.js 14, React, TailwindCSS | Real-time monitoring dashboard, policy inspection, interactive `/demo` route. |
| **Gateway Orchestrator** | Go 1.22 | HTTP routing, AI prompt orchestration, intent lifecycle management, rate limiting. |
| **Policy Engine** | Rust 1.78, Axum | High-performance, side-effect-free authorization verification. |
| **Storage & State** | PostgreSQL 15 / In-Memory | Transaction records, intent state transitions, rate limit counters. |
| **Smart Contracts** | Solidity 0.8.20, Foundry | On-chain vault custody, daily limit enforcement, Arc USDC transfer execution. |
| **Settlement Layer** | Arc Mainnet (Chain ID `5042`) | Protocol-level USDC gas settlement and finalized transaction execution. |
