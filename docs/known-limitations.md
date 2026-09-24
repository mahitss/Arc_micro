# AgentPay Autonomous Economic Fabric v1.0 — Known Limitations
**Document ID:** `docs/known-limitations.md`  
**Classification:** Architectural Transparency & Technical Limitations  
**Authority:** Principal Engineer & CTO, AgentPay  
**Version:** v1.0  
**Verification Date:** 2026-09-25  

---

## 1. Transparency Mandate

In accordance with AgentPay's core principle of **truthful engineering**, this document records the known limitations, architectural boundaries, and pending hardware integrations in AgentPay Autonomous Economic Fabric v1.0. Zero claims of "trustless autonomy" or "zero-risk" are made without direct code-level proof.

---

## 2. Identified Technical Limitations

### 2.1 Smart Contract Role Conflation in Current `AgentVault.sol`
- **Limitation**: In `contracts/src/AgentVault.sol`, both operational payments (`executePayment`) and administrative actions (`withdraw`, `setPolicy`, `setRecipientAllowed`, `pause`) are guarded by `onlyOwner`.
- **Impact**: In an automated setup where the Gateway signs transactions, the automated key holds owner privileges.
- **Production Status**: **PRODUCTION_BLOCKED for unrestricted funds.** Canary micro-deployments (<50 USDC) are supported under strict monitoring.
- **Resolution Path**: Upgrade to `AgentVaultV2` with OpenZeppelin `AccessControl` separating `DEFAULT_ADMIN_ROLE` (Cold Multi-Sig Safe) from `RELAYER_ROLE` (Automated Gateway Signer).

### 2.2 Hardware Security Module (KMS) Client Adapter
- **Limitation**: The production KMS signer in `services/gateway/internal/signer/kms.go` returns `ErrKMSSignerUnavailable` and strictly fails closed.
- **Impact**: The current system relies on `LocalSigner` with an ECDSA private key in memory. While EIP-1559 transaction bindings are cryptographically enforced, private key memory exposure on host compromise remains a residual risk.
- **Resolution Path**: Integrate AWS KMS / GCP Cloud KMS client SDKs using asymmetric `ECC_SECG_P256K1` signing keys.

### 2.3 Single Settlement Currency (Native Arc USDC)
- **Limitation**: The system settles exclusively in native USDC (`0x3600000000000000000000000000000000000000`) on Arc Mainnet (Chain ID 5042).
- **Impact**: Multi-currency baskets (e.g., EURC, DAI, Wrapped Assets) are unsupported in v1.0. All obligations must denominate in USDC base units (6 decimals).

### 2.4 Relayer Gas Funding vs. Native Account Abstraction
- **Limitation**: Transactions are submitted via an EIP-1559 relayer transaction rather than ERC-4337 user operations.
- **Impact**: The relayer wallet must hold native Arc tokens for gas fees alongside the vault's USDC balance. Gasless paymaster sponsorship is scheduled for v2.0.

### 2.5 Batch Window Discrete Netting
- **Limitation**: Multi-party netting in the clearinghouse operates over discrete settlement windows (Hourly or Manual batches) rather than continuous real-time liquidity streams.
- **Impact**: Intra-hour gross obligations remain unnetted until the batch calculation window triggers.
