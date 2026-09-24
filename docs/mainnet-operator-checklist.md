# AgentPay Autonomous Economic Fabric v1.0 — Arc Mainnet Operator Checklist
**Document ID:** `docs/mainnet-operator-checklist.md`  
**Classification:** Operational Runbook & Deployment Guide  
**Target Blockchain:** Arc Mainnet (Chain ID 5042)  
**Native USDC Contract:** `0x3600000000000000000000000000000000000000`  
**RPC Endpoint:** `https://rpc.mainnet.arc.io`  
**Explorer:** `https://explorer.arc.io`  

---

## 1. Pre-Deployment Operational Invariants

> [!IMPORTANT]
> **NEVER FABRICATE DEPLOYMENT EVIDENCE.**  
> Do not generate fake contract addresses, placeholder transaction hashes, or mock balances. If prerequisites are missing, fail closed.

### Mandatory Role Separation
In production on Arc Mainnet, you MUST enforce:
```
HOT RELAYER ≠ VAULT OWNER
```
- **Vault Owner**: Cold multi-sig wallet (e.g., Safe multi-sig on Arc, or hardware wallet). Holds administrative keys for `withdraw`, `setPolicy`, `setRecipientAllowed`, `pause`, and `unpause`.
- **Relayer**: Restricted hot signer key operated by the Gateway service. Allowed ONLY to submit authorized payment execution transactions within established limits.

---

## 2. Pre-Flight Operator Checklist

### Step 1: Secure Infrastructure Provisioning
- [ ] **PostgreSQL Database**: Provision a managed PostgreSQL 15+ database with automated daily backups.
- [ ] **Network Egress**: Confirm outbound HTTPS connectivity to `https://rpc.mainnet.arc.io` on port 443.
- [ ] **Secrets Storage**: Inject `EXECUTOR_PRIVATE_KEY` and `DATABASE_URL` via a secure secrets manager (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault). Never store in git or plaintext files.

### Step 2: Contract Deployment & Initialization
Deploy `AgentVault` on Arc Mainnet using Foundry:

```bash
cd contracts

# Dry run with simulation
forge script script/DeployAgentVault.s.sol:DeployAgentVault \
  --rpc-url https://rpc.mainnet.arc.io \
  --sig "run(address,string,address)" \
  0x3600000000000000000000000000000000000000 \
  "agentpay-mainnet-vault-01" \
  <COLD_MULTISIG_OWNER_ADDRESS>

# Live broadcast (requires deployer key with gas funds on Arc Mainnet)
forge script script/DeployAgentVault.s.sol:DeployAgentVault \
  --rpc-url https://rpc.mainnet.arc.io \
  --broadcast \
  --verify \
  --sig "run(address,string,address)" \
  0x3600000000000000000000000000000000000000 \
  "agentpay-mainnet-vault-01" \
  <COLD_MULTISIG_OWNER_ADDRESS>
```

Record the deployed `AgentVault` contract address in `AGENTVAULT_ADDRESS`.

### Step 3: Vault Funding
1. [ ] **Relayer Gas Funding**: Transfer sufficient native Arc tokens to the `EXECUTOR_ADDRESS` to cover EIP-1559 transaction fees (recommended: 0.1 Arc).
2. [ ] **Vault Capital Funding**: Transfer initial USDC operational liquidity to the `AgentVault` contract address on Arc Mainnet.
3. [ ] **Verify On-Chain Balance**:
   ```bash
   cast call 0x3600000000000000000000000000000000000000 \
     "balanceOf(address)(uint256)" \
     <AGENTVAULT_ADDRESS> \
     --rpc-url https://rpc.mainnet.arc.io
   ```

### Step 4: Policy Configuration (via Cold Multi-Sig)
From the cold multi-sig owner address, execute:
1. `setPolicy(enabled=true, perTxLimit=5000000, dailyLimit=50000000, maxTxPerDay=100)` (Configures $5.00 max per tx, $50.00 daily budget).
2. `setAllowlistEnabled(true)` (Activates strict recipient allowlist).
3. `setRecipientAllowed(recipientAddress, true)` for all verified service providers.

---

## 3. Gateway Production Environment Setup

Create `.env` on the production gateway host:
```ini
APP_ENV=production
ENVIRONMENT=production
STORAGE_MODE=postgres
DATABASE_URL=postgres://user:password@pg-host:5432/agentpay?sslmode=verify-full

ARC_RPC_URL=https://rpc.mainnet.arc.io
ARC_CHAIN_ID=5042
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
ARC_EXPLORER_URL=https://explorer.arc.io

AGENTVAULT_ADDRESS=<DEPLOYED_AGENTVAULT_ADDRESS>
SIGNER_BACKEND=local
EXECUTOR_PRIVATE_KEY=<64_CHAR_HEX_PRIVATE_KEY>
ENABLE_LIVE_EXECUTION=true

POLICY_ENGINE_URL=http://localhost:8081
CORS_ALLOWED_ORIGINS=https://app.agentpay.io
```

---

## 4. Controlled Canary Verification (First $0.10 Payment)

Execute a single canary payment under strict operator supervision:
```bash
agentpay intent create \
  --agent agent_canary_01 \
  --recipient <VERIFIED_RECIPIENT_ADDRESS> \
  --amount 0.10 \
  --purpose "Canary Mainnet Verification"
```

1. Inspect the resulting `intent_id` in the Control Tower (`https://app.agentpay.io/control`).
2. Verify policy decision: `ALLOW` (in under 10 µs).
3. Verify treasury reservation confirmed.
4. Verify on-chain transaction hash generated and confirmed on `https://explorer.arc.io/tx/<TX_HASH>`.
5. Verify on-chain USDC transfer event matches exact amount (100,000 micro-USDC).
6. Verify double-entry reconciliation matches receipt.

---

## 5. Emergency Response & Incident Procedures

If anomalous agent behavior, unexpected market conditions, or security alerts arise:

### Immediate Soft Pause (via API / CLI)
```bash
agentpay emergency pause --reason "Anomalous transaction frequency detected"
```
Freezes all off-chain `PaymentIntent` execution at the Execution Gate.

### On-Chain Hard Freeze (via Cold Multi-Sig)
Call `pause()` on the `AgentVault` contract directly on Arc Mainnet:
```bash
cast send <AGENTVAULT_ADDRESS> "pause()" --rpc-url https://rpc.mainnet.arc.io --private-key <OWNER_KEY>
```
Prevents any further USDC transfers from the contract regardless of off-chain commands.

### Emergency Fund Extraction (via Cold Multi-Sig)
Extract all remaining USDC funds from the vault to cold storage:
```bash
cast send <AGENTVAULT_ADDRESS> "withdraw(address,uint256)" <SAFE_COLD_WALLET> <AMOUNT> --rpc-url https://rpc.mainnet.arc.io
```
Note: `withdraw()` remains executable even when paused specifically to ensure emergency capital recovery.
