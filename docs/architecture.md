# AgentPay Architecture & Trust Boundaries

> **Document Version**: 2.0.0  
> **Status**: Verified Prototype Architecture (Tasks 1–12)  
> **Target Settlement Network**: Arc Mainnet (Chain ID `5042`)

---

## 1. System Architecture Diagram

```mermaid
flowchart TD
    subgraph UNTRUSTED["UNTRUSTED LAYER"]
        User["User / Operator"] -->|HTTP / Web Browser| Web["Next.js Control Center (/demo)"]
        AI["AI Agent (LLM Reasoning)"] -->|Raw Intent JSON| Gateway
    end

    subgraph TRUSTED_APPLICATION_LOGIC["TRUSTED APPLICATION LOGIC BOUNDARY"]
        Web -->|POST /tasks| Gateway["Go Gateway (:8080)"]
        Gateway -->|Ingest Task| AI
        Gateway -->|Resolve Recipient| Registry["Service Registry"]
        Registry -->|Validated Request| PolicyClient["Policy Client"]
        PolicyClient -->|POST /v1/authorize| Rust["Rust Policy Engine (:8081)"]
        Rust -->|Deterministic Math| Eval{"ALLOW or DENY?"}
        Eval -->|ALLOW| ExecGate["Execution Service"]
        Eval -->|DENY| Reject["Halt Request (Zero Tx)"]
        ExecGate -->|Atomic CAS| DB[("PostgreSQL / In-Memory Store")]
        ExecGate -->|EIP-1559 Signer| Signer["Transaction Signer"]
    end

    subgraph ON_CHAIN_ENFORCEMENT["ON-CHAIN ENFORCEMENT LAYER (ARC MAINNET)"]
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
    class Gateway,Registry,PolicyClient,Rust,Eval,ExecGate,Reject,DB,Signer trusted;
    class Vault,USDC,Recipient,Event onchain;
```

---

## 2. Trust Boundaries & Security Enforcements

AgentPay enforces strict structural separation between computational reasoning, authorization policy, and on-chain execution:

### 1. UNTRUSTED Boundary
- **Entities**: User/Operator, Next.js Web UI, AI Model (LLM).
- **Security Rule**: No entity in this tier has access to signing keys, raw RPC broadcast capabilities, or arbitrary contract calldata.
- **Enforcement**:
  - The AI model's output is treated as untrusted user input.
  - The AI cannot specify recipient addresses; it can only request an approved `service_id`.
  - Prompts are delimited by `<user_task>` to prevent prompt injection.

### 2. TRUSTED APPLICATION LOGIC Boundary
- **Entities**: Go Gateway, Service Registry, Rust Policy Engine, Database Store, Transaction Signer.
- **Security Rule**: Enforces deterministic risk limits, recipient validation, and concurrency protection before touching the blockchain.
- **Enforcement**:
  - **Service Registry**: Maps service IDs (e.g. `web-research`) to authoritative server-side recipient addresses.
  - **Rust Policy Engine**: Evaluates spending limits, daily budget caps, and allowlists in pure integer arithmetic (`u64`) with zero clock or network side effects.
  - **Atomic Compare-And-Swap (CAS)**: Updates intent state from `AUTHORIZED` to `EXECUTING` atomically in SQL, eliminating double-spending and race conditions.
  - **Fail-Closed Execution**: `ENABLE_LIVE_EXECUTION` defaults to `false`.

### 3. ON-CHAIN ENFORCEMENT Boundary
- **Entities**: `AgentVault.sol`, Canonical USDC ERC-20 (`0x3600000000000000000000000000000000000000`), Arc Mainnet.
- **Security Rule**: The smart contract does not trust the off-chain gateway; it enforces hard limits directly in immutable EVM bytecode.
- **Enforcement**:
  - `AgentVault.sol` enforces independent daily spending limits (`dailyLimit`) and per-transaction maximums.
  - Even if the Go Gateway were fully compromised, an attacker cannot extract more than the hard on-chain allowance.
  - The contract owner retains an emergency `pause()` switch and an emergency `withdraw()` mechanism.

---

## 3. Off-Chain Policy vs. On-Chain Enforcement Comparison

| Dimension | Rust Policy Engine (Off-Chain) | Solidity AgentVault (On-Chain) |
|---|---|---|
| **Role** | Pre-flight policy & risk evaluation | Final fund custody & payment execution |
| **Trust Model** | Fast, deterministic off-chain security filter | Zero-trust immutable EVM bytecode enforcement |
| **Failure Mode** | Returns `DENY` decision with auditable `reason_code` | Reverts transaction on-chain (`revert`) |
| **Gas Cost** | Zero gas (sub-millisecond evaluation) | Gas consumed on Arc network upon state change |
| **State Storage** | In-memory / PostgreSQL | On-chain contract storage slots |
