# AgentPay Autonomous Economic Fabric v1.0 — Threat Model
**Document ID:** `docs/threat-model-v1.md`  
**Classification:** Security Architecture & Threat Analysis  
**Authority:** Principal Engineer & CTO, AgentPay  
**Version:** v1.0  
**Verification Date:** 2026-09-25  

---

## 1. Threat Modeling Methodology & Scope

This document provides a formal STRIDE security analysis of AgentPay Autonomous Economic Fabric v1.0 across all 5 operational tiers:
1. **Agent Tier**: External autonomous agents, prompt injection, and hallucinated actions.
2. **Protocol & Marketplace Tier**: Counterparty spoofing, Sybil reviews, and quote manipulation.
3. **Control Plane Tier**: Policy bypass attempts, risk score evasion, and approval forgery.
4. **Execution Gate & Signer Tier**: Relayer key extraction, calldata mutation, and replay attacks.
5. **On-Chain Smart Contract Tier**: Contract exploits, reentrancy, and balance drain attacks.

---

## 2. Threat Analysis & Mitigations

### 2.1 Agent Tier: Prompt Injection & Rogue AI

| Threat ID | Threat Description | Attack Vector | Mitigation in AgentPay v1.0 |
|---|---|---|---|
| **T-AGT-01** | Prompt Injection Recipient Redirection | Attacker injects malicious instruction into prompt directing agent to pay attacker wallet. | **Server-Controlled Allowlists (`INV-2`)**: Agents do NOT supply destination wallet addresses; the gateway resolves addresses server-side from registered services. |
| **T-AGT-02** | Budget Exhaustion Loop | Runaway agent enters an infinite loop issuing micro-payments. | **Hourly Velocity & Daily Budget Caps (`INV-3`)**: Enforced deterministically in Rust policy core and on-chain in `AgentVault`. |
| **T-AGT-03** | Model Hallucination / Self-Approval | Agent attempts to self-approve its own high-risk transaction. | **Zero Self-Approval (`INV-4`)**: AI agents cannot approve tickets; tickets require authenticated human/multi-sig signatures. |

---

### 2.2 Protocol & Marketplace Tier: Collusion & Sybil

| Threat ID | Threat Description | Attack Vector | Mitigation in AgentPay v1.0 |
|---|---|---|---|
| **T-MKT-01** | Sybil Reputation Inflation | Colluding agents issue fake reviews to artificially boost trust scores. | **Volume Damping & Counterparty Diversification**: Unique counterparty weighting penalizes repetitive feedback loops. |
| **T-MKT-02** | Stale / Exploited Quotes | Provider updates price or terms after agreement. | **Cryptographic Contract Hash & TTL**: Quotes and contracts are immutably signed; stale quotes fail pre-flight validation. |
| **T-MKT-03** | Malicious Deliverable Spoofing | Provider delivers empty/invalid data and requests payment. | **Critic Verification & Hash Validation**: Payment is withheld until output hash matches contract SLA. |

---

### 2.3 Control Plane Tier: Policy Evasion & Tampering

| Threat ID | Threat Description | Attack Vector | Mitigation in AgentPay v1.0 |
|---|---|---|---|
| **T-CTL-01** | Approval Overriding HARD_DENY | Malicious insider attempts to approve a blocked sanctions address. | **Inviolable HARD_DENY (`INV-46`)**: Approval tickets cannot override hard denies under any circumstance. |
| **T-CTL-02** | Policy Engine Desynchronization | Stale policy caches authorize payments under deprecated limits. | **Pre-Flight Version Binding**: Execution Gate verifies current policy version and constitution hash before signing. |
| **T-CTL-03** | Liquidity Over-Commitment | Concurrent missions oversubscribe treasury balance. | **Atomic Treasury Reservations (`INV-71`)**: CAS concurrency locks liquidity before PaymentIntent authorization. |

---

### 2.4 Execution Gate & Signer Tier: Calldata & Key Security

| Threat ID | Threat Description | Attack Vector | Mitigation in AgentPay v1.0 |
|---|---|---|---|
| **T-SIG-01** | Calldata Injection / Post-Gate Mutation | Attacker modifies recipient or amount between authorization and signing. | **Transaction Binding Hash (`signer.verifyBinding`)**: Signer rejects any transaction whose calldata hash does not match authorization. |
| **T-SIG-02** | Cross-Chain Replay Attack | Transaction signed for Arc is replayed on Ethereum or other EVM chains. | **Strict Chain ID Enforcement**: Signer and smart contract enforce Chain ID `5042`. Wrong chain fails closed. |
| **T-SIG-03** | Non-Zero Native Value Drain | Attacker embeds native gas token transfer into transaction. | **Zero Native Value Invariant**: Signer rejects any transaction where `tx.Value() != 0`. |
| **T-SIG-04** | Ambiguous Submission Double-Spend | RPC drops receipt; gateway blindly resubmits under new nonce. | **Nonce Pinning & Reconciliation (`INV-11`)**: Ambiguous states enter reconciliation; blind rebroadcasts are forbidden. |

---

### 2.5 Smart Contract Tier: On-Chain Invariants (`AgentVault.sol`)

| Threat ID | Threat Description | Attack Vector | Mitigation in AgentPay v1.0 |
|---|---|---|---|
| **T-SC-01** | Reentrancy Attack | Malicious token callback re-enters `executePayment`. | **ReentrancyGuard & Checks-Effects-Interactions**: OpenZeppelin guard applied; state updated before token transfer. |
| **T-SC-02** | Integer Overflow / Underflow | Large amounts cause arithmetic wrap-around. | **Solidity 0.8.24 Checked Arithmetic**: Checked arithmetic halts on overflow (`INV-47`). |
| **T-SC-03** | Blocked Recipient Bypass | Recipient is added to allowlist after being blocked. | **Strict Blocklist Precedence**: Blocked status strictly overrides allowed status in smart contract. |
| **T-SC-04** | Hot Relayer Administrative Privilege Abuse | Compromised relayer key withdraws all vault capital. | **Owner / Relayer Separation (`Section 9`)**: In production, `withdraw()` and `setPolicy()` are restricted to cold multi-sig Safe. |

---

## 3. Residual Risks & Operator Hardening

1. **Host-Level Key Compromise**: When using `LocalSigner`, host compromise can expose the relayer private key. Production deployment mandates hardware key isolation (KMS/HSM).
2. **RPC Compromise / Man-in-the-Middle**: If an adversary controls the Arc RPC endpoint, they could report false confirmations. Gateway verifies transaction receipts and event logs against the contract address.
