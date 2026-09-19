# AgentPay Payment & Denial Flow

> **Specification**: Complete Sequence of Successful Settlement and Safety Denial  
> **Components**: AI Agent, Service Registry, Go Gateway, Rust Policy Engine, AgentVault, Arc Mainnet

This document illustrates the execution lifecycle of payment intents under both normal operation (Happy Path) and safety policy rejection (Denial Path).

---

## 1. Happy Path Sequence: Authorized Payment & On-Chain Settlement

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / AI Agent
    participant GW as Go Gateway (:8080)
    participant Reg as Service Registry
    participant Rust as Rust Policy Engine (:8081)
    participant DB as State Store (PostgreSQL)
    participant Exec as Execution Service
    participant Vault as AgentVault.sol (Arc)
    participant Arc as Arc Mainnet

    User->>GW: POST /v1/agents/tasks (Task Text)
    Note over GW: Ingest task & call LLM
    GW->>Reg: Validate service_id & resolve recipient
    Reg-->>GW: Authoritative Recipient & max_price verified
    GW->>DB: Save Intent (Status: CREATED)
    
    GW->>Rust: POST /v1/authorize (Request ID, Agent, Amount, Recipient)
    Note over Rust: Pure integer check: daily limit, per-tx limit, allowlist
    Rust-->>GW: Decision: ALLOW (Reason: APPROVED)
    GW->>DB: Update Status: AUTHORIZED

    User->>GW: POST /v1/payment-intents/{id}/confirm
    GW->>DB: Atomic CAS (AUTHORIZED -> EXECUTING)
    DB-->>GW: CAS Succeeded (Lock Acquired)

    GW->>Exec: Prepare EIP-1559 Transaction
    Exec->>Vault: executePayment(intentId, recipient, amount, purpose)
    Vault->>Vault: Enforce On-Chain Daily Limits & Paused State
    Vault->>Arc: usdc.safeTransfer(recipient, amount)
    Vault->>Arc: emit PaymentExecuted(intentId, recipient, amount, fee)
    Arc-->>Exec: Transaction Hash & Block Included
    
    Exec->>Arc: Poll Transaction Receipt (eth_getTransactionReceipt)
    Arc-->>Exec: Receipt Confirmed (status == 1)
    Exec->>GW: Confirmation Verified
    GW->>DB: Update Status: CONFIRMED (Save Tx Hash & Block)
    GW-->>User: Payment Confirmed (Receipt & Arc Explorer Link)
```

---

## 2. Safety Denial Path Sequence: Policy Rejection (No Transaction)

The denial path is an essential safety feature of AgentPay: it proves that the system is not merely a payment forwarder, but a deterministic security firewall that blocks unauthorized capital movement before touching the blockchain.

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / AI Agent
    participant GW as Go Gateway (:8080)
    participant Reg as Service Registry
    participant Rust as Rust Policy Engine (:8081)
    participant DB as State Store (PostgreSQL)
    participant Exec as Execution Service
    participant Vault as AgentVault.sol (Arc)

    User->>GW: POST /v1/agents/tasks (Task: "Retrieve bulk market archive: 6.00 USDC")
    GW->>Reg: Resolve service_id ("web-research")
    Reg-->>GW: Recipient: 0x1111...1111
    GW->>DB: Save Intent (Status: CREATED)

    GW->>Rust: POST /v1/authorize (Amount: 6,000,000 base units)
    Note over Rust: Evaluates: 6.00 USDC > 2.59 USDC remaining daily budget
    Rust-->>GW: Decision: DENY (ReasonCode: DAILY_LIMIT_EXCEEDED)
    
    GW->>DB: Update Status: DENIED (Reason: DAILY_LIMIT_EXCEEDED)
    GW-->>User: PAYMENT DENIED: DAILY_LIMIT_EXCEEDED

    Note over Exec,Vault: CRITICAL SAFETY INVARIANT:<br/>Zero calls made to Execution Service.<br/>Zero transactions signed or broadcast.<br/>On-chain gas incurred: 0 USDC.<br/>Vault balance remains 100% untouched.
```

---

## 3. Key Differences Between Flows

| Dimension | Happy Path | Denial Path |
|---|---|---|
| **AI Intent Status** | `CREATED` $\rightarrow$ `AUTHORIZED` $\rightarrow$ `EXECUTING` $\rightarrow$ `CONFIRMED` | `CREATED` $\rightarrow$ `DENIED` (Terminal) |
| **Rust Policy Decision** | `ALLOW` (`APPROVED`) | `DENY` (`DAILY_LIMIT_EXCEEDED` / `RECIPIENT_BLOCKED`) |
| **Execution Call** | Dispatched to `AgentVault.executePayment()` | **Aborted** prior to execution boundary |
| **Blockchain Transaction** | Confirmed on Arc (e.g., EIP-1559 receipt) | **NONE** |
| **Gas Fee Incurred** | Standard Arc USDC gas fee | **0 USDC** |
| **On-Chain Vault State** | Daily spending counter incremented | **Untouched** |
