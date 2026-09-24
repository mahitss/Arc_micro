# AgentPay v1.0 — Known Limitations (Submission)
**Classification:** Technical Transparency & Scope Boundaries  

---

## Technical Limitations in v1.0

1. **Smart Contract Role Conflation**: Current `AgentVault.sol` uses `onlyOwner` on `executePayment`, conflating hot relayer with admin owner. Live deployment for unrestricted institutional funds is marked `PRODUCTION_BLOCKED` until `AgentVaultV2` (Cold Multi-Sig Safe + Hot Relayer role separation) is deployed.
2. **KMS Signer Status**: Production AWS/GCP KMS client adapter is `NOT IMPLEMENTED` (fails closed with `ErrKMSSignerUnavailable`). Local key signing with strict calldata binding is supported for canary testing.
3. **Single Settlement Asset**: Settles exclusively in native Arc USDC (`0x3600...0000`). Multi-currency token baskets are unsupported in v1.0.
4. **Relayer Gas Dependency**: Relayer requires native Arc gas tokens; gasless Account Abstraction (ERC-4337 paymaster) is planned for v2.0.
