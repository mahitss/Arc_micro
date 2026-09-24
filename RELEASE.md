# AgentPay Release Manifest

```yaml
Product: AgentPay
Version: v1.0.0
Release_Type: Production Candidate (Canary Ready)
Thesis: "AI REQUESTS -> AGENTPAY CONTROLS -> ARC SETTLES"
Core_Invariant: "AUTONOMY MAY EXPAND. FINANCIAL AUTHORITY MUST REMAIN BOUNDED."

Blockchain:
  Network: Arc Mainnet
  Chain_ID: 5042
  RPC_Endpoint: https://rpc.mainnet.arc.io
  Native_USDC: "0x3600000000000000000000000000000000000000"
  Explorer: https://explorer.arc.io

Deployments:
  AgentVault_Address: NOT DEPLOYED (OPERATOR ACTION REQUIRED)
  Live_Canary_TxHash: NOT VERIFIED (OPERATOR ACTION REQUIRED)
  Simulated_Canary: VERIFIED SIMULATION (Deterministic Pass)

Verification_Summary:
  Go_Gateway: 35/35 Packages PASS (100%)
  Rust_Policy_Core: 57/57 Tests PASS (0.04s)
  Solidity_Contracts: 42/42 Tests PASS (Foundry Fuzz: 256 runs)
  TypeScript_SDK: 33/33 Tests PASS (100%)
  Python_SDK: 26/26 Tests PASS (100%)
  Operator_CLI: 14/14 Tests PASS (100%)
  Web_Frontend: 199/199 Unit & Invariant Tests PASS
  Web_Build: 74/74 Static & Dynamic Routes Compiled Cleanly
  Security_Authority_Boundary: 30/30 Rules PASS
  Security_Chaos_Economy: 32/32 Scenarios PASS

Performance_Benchmarks:
  Pure_Policy_Evaluation: 6.36 µs/op (~157,150 op/s)
  Amount_Deny_Evaluation: 3.82 µs/op (~261,700 op/s)
  Quote_Matching: 45.07 ns/op (~22.2M op/s)
  Clearinghouse_Netting: 209.90 ns/op (~4.76M op/s)
  Reconciliation_Matching: 12.55 ns/op (~79.7M op/s)
  Event_Serialization: 0.785 ns/op (~1.27B op/s)

Security_Architecture:
  Database_Mode: STORAGE_MODE=postgres (memory prohibited in production)
  Signer_Status: LocalSigner active with strict EIP-1559 calldata bindings; KMSSigner fails closed (NOT IMPLEMENTED)
  Owner_Relayer_Separation: PRODUCTION_BLOCKED for unrestricted funds until AgentVaultV2 cold multisig separation; Canary-ready for bounded micro-budgets (<50 USDC)
  Secret_Audit: CLEAN (0 secrets committed, .env ignored, .env.example sanitized)

Known_Limitations:
  - AgentVault.sol conflates owner with relayer via onlyOwner on executePayment.
  - AWS/GCP KMS client adapter is not implemented; returns ErrKMSSignerUnavailable.
  - Settlement asset is exclusively native Arc USDC (6 decimals).
  - Gas fees require native Arc gas tokens on relayer account.
```
