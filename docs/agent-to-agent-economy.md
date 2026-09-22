# Agent-to-Agent Economy — Autonomous Peer Commerce Specification

## 1. Overview & Vision

In an autonomous economic operating system, services are not limited to traditional Web2 APIs. Increasingly, **services are themselves autonomous AI agents** specialized in specific cognitive domains (e.g. data extraction, smart contract verification, cryptographic proofs, or computational research).

The **Agent-to-Agent Economy** layer enables agents to discover, hire, coordinate, and compensate peer agents without human intervention, while maintaining absolute financial governance.

---

## 2. The Non-Bypass Invariant (INV-E11 & INV-E12)

> [!CAUTION]
> **Zero Direct Wallet-to-Wallet Transfers (INV-E11, INV-E12)**:
> Autonomous agents possess NO private keys and NO direct access to `AgentVault` smart contracts.
> 
> Under no circumstances can Agent A transfer USDC directly to Agent B's address.
> Every inter-agent economic transaction MUST route through AgentPay's canonical authorization pipeline:
> `Agent A Proposal → PaymentIntent → Rust Policy Engine → Risk Engine → Treasury → Signer → Arc Settlement → Agent B`.

```
                    +------------------------------------+
                    |       Autonomous Agent A           |
                    |        (e.g. ResearchAgent)        |
                    +------------------------------------+
                                      |
                      [1. Discover Peer Agent Service]
                                      v
                    +------------------------------------+
                    |        Service Registry            |
                    |     (Registered AgentServices)     |
                    +------------------------------------+
                                      |
                      [2. Receive Time-Bound Quote]
                                      v
                    +------------------------------------+
                    |   AgentPay Canonical Pipeline      |
                    |  * Policy Engine (Limits/Rules)    |
                    |  * Risk Engine (Counterparty Risk) |
                    |  * Treasury Lock (USDC Reserve)    |
                    +------------------------------------+
                                      |
                      [3. Settle on Arc Network]
                                      v
                    +------------------------------------+
                    |      Arc Network (Chain 5042)      |
                    |    USDC Settled to Agent B Vault   |
                    +------------------------------------+
                                      |
                      [4. Deliver Task Result Payload]
                                      v
                    +------------------------------------+
                    |       Autonomous Agent B           |
                    |         (e.g. DataAgent)           |
                    +------------------------------------+
```

---

## 3. Peer Agent Registration (`AgentService`)

An agent offering capabilities to the network registers with the `AgentCoordinator`:

```go
type AgentService struct {
    AgentID      string            // Peer agent identity
    ServiceID    string            // Unique service registry ID (e.g. peer-data-agent)
    Capabilities []string          // Offered capabilities (e.g. ["contract_audit", "data_feed"])
    PricingModel string            // FIXED or VARIABLE
    BasePrice    string            // Base fee in USDC base units
    Asset        string            // Default: "USDC"
    Recipient    string            // Authoritative server-bound payout address
    Enabled      bool              // Active status
    Reputation   int64             // Historical score in basis points
    Metadata     map[string]string // Version, model architecture, SLA
}
```

### Registration Security Guarantees
1. **Server-Bound Recipient**: The agent cannot supply an arbitrary recipient address on the fly. The recipient address is cryptographically bound during registration and immutable thereafter.
2. **Capability Validation**: Registry ensures capability names adhere to the platform's standardized taxonomy.
3. **Deterministic Discovery**: Peer agents appear alongside traditional API services in `registry.ListByCapability()`, ranked identically by the `EconomyEngine`.

---

## 4. Multi-Agent Coordination Flow

Consider an end-to-end multi-agent workflow:
1. **Objective Inception**: `ResearchAgent` receives mission: "Audit protocol liquidity on Arc".
2. **First Peer Hire**:
   - `ResearchAgent` discovers `DataAgent` for capability `data_feed`.
   - `DataAgent` issues a binding quote for 0.10 USDC.
   - `ResearchAgent` submits payment proposal to AgentPay.
   - AgentPay evaluates daily limits, approves, and settles on Arc.
   - `DataAgent` delivers streaming liquidity telemetry.
3. **Second Peer Hire**:
   - `ResearchAgent` analyzes telemetry and identifies an anomalous contract.
   - `ResearchAgent` discovers `ValidatorAgent` for capability `contract_audit`.
   - `ValidatorAgent` issues quote for 0.30 USDC.
   - AgentPay approves and settles payment.
   - `ValidatorAgent` returns formal verification report.
4. **Mission Completion**: `ResearchAgent` synthesizes telemetry and audit results into the final objective report.
5. **Full Flight Trace**: Every inter-agent payment is permanently recorded in the mission trace with transaction hashes, quote IDs, and policy decisions.
