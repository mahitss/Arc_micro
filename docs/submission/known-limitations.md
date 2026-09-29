# AgentPay — Known Limitations (Submission Scope)

This document provides complete technical transparency regarding the known architectural boundaries and limitations of AgentPay v1.0.

---

## 1. Smart Contract & Blockchain Settlement Limitations

1. **Undeployed Mainnet AgentVault:**
   `AgentVault.sol` has been compiled and rigorously tested locally in Foundry (`AgentVault.t.sol` passes 44/44 tests), but its bytecode is not yet broadcast to Arc Mainnet. RPC queries to the designated address return `0x`.
2. **Simulation Mode Gating:**
   Live on-chain transaction broadcast is disabled by default (`ENABLE_LIVE_EXECUTION=false`). All demo and mission execution flows run in deterministic simulation mode. Exactly 0 on-chain transactions have been broadcast to mainnet, and $0.00 in real funds have moved.
3. **Smart Contract Role Conflation:**
   Current `AgentVault.sol` enforces `onlyOwner` on `executePayment`, which conflates the hot transaction relayer with the administrative contract owner. Institutional production deployment requires `AgentVaultV2` with strict role separation (Cold Multi-Sig Governance + Hot Relayer execution keys).
4. **Single Settlement Currency:**
   AgentPay v1.0 settles exclusively in native Arc USDC (`0x3600000000000000000000000000000000000000`). Multi-currency token baskets, cross-chain bridging, and volatile collateral assets are deliberately excluded from this release.
5. **Relayer Gas Dependency:**
   Transaction execution on Arc requires the relayer address to hold native gas tokens. Account Abstraction paymasters (ERC-4337) and automated gas sponsorship are scheduled for v2.0.

---

## 2. Infrastructure & Key Management Limitations

6. **Cloud KMS Signing Provider:**
   The enterprise AWS KMS and GCP Cloud KMS signer modules are architected as interface adapters but fail closed with `ErrKMSSignerUnavailable`. Local private key signing with strict calldata hash binding is implemented for development and test harnesses.
7. **Off-Chain Clearing & Netting:**
   The multilateral debt netting engine computes optimal cycle settlements off-chain in the clearinghouse. While net obligations can be submitted as individual settlement transfers, atomic on-chain multi-party settlement contracts are planned for a subsequent version.
8. **AI Provider Sandbox:**
   AI inference is executed via OpenRouter / external LLM APIs with strict read-only tool contracts. While prompt injection is neutralized from altering financial state, model latency and external provider rate limits depend on third-party API availability.
