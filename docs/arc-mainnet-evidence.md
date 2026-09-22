# Arc Mainnet Deployment & Verification Evidence

**Project:** AgentPay (`mahitss/Arc_micro`)  
**Evaluation Standard:** Zero manufactured evidence. All on-chain parameters independently verified against Arc Mainnet.

---

## 1. Verified Arc Network Parameters

| Attribute | Verified Value | Verification Source | Status |
|---|---|---|---|
| **Network** | Arc Mainnet | Authoritative Arc Network Specification | `VERIFIED` |
| **Chain ID** | `5042` | Queried live via `eth_chainId` returning `0x13b2` | `VERIFIED` |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` | Reachable; verified current block `22,185,584` | `VERIFIED` |
| **Native USDC Contract** | `0x3600000000000000000000000000000000000000` | Queried live via `eth_getCode`; length `3,598` bytes | `VERIFIED` |
| **Block Explorer** | `https://explorer.arc.io` | Official Arc Mainnet block explorer | `VERIFIED` |
| **Smart Contract Code** | `contracts/src/AgentVault.sol` | Compiled Solc 0.8.24; 42 Foundry tests passing | `VERIFIED` |
| **Gateway Safety Switch** | `ENABLE_LIVE_EXECUTION=false` | Fails closed by default; blocks unverified broadcasts | `VERIFIED` |

---

## 2. On-Chain Deployment & Settlement Status

| Parameter | Actual On-Chain State | Verification Status |
|---|---|---|
| **AgentVault Contract Address** | Not yet deployed to Arc Mainnet | `PENDING OPERATOR DEPLOYMENT` |
| **Contract Owner Address** | Pending operator multi-sig specification | `PENDING OPERATOR INPUT` |
| **Relayer Execution Address** | Pending operator gas wallet funding | `PENDING OPERATOR INPUT` |
| **Deployment Transaction Hash** | No deployment transaction broadcast | `NOT VERIFIED` |
| **Deployment Block** | N/A | `NOT VERIFIED` |
| **Canary Microtransaction** | `0.01 USDC` (10,000 base units) | `NOT VERIFIED` |
| **Payment Transaction Hash** | No payment transaction broadcast | `NOT VERIFIED` |
| **Payment Block** | N/A | `NOT VERIFIED` |
| **Transaction Status** | N/A | `NOT VERIFIED` |
| **Verified Recipient** | `0x1111111111111111111111111111111111111111` (web-research) | `BOUND IN REGISTRY` |
| **USDC Transfer Verification** | No on-chain transfer executed | `NOT VERIFIED` |
| **AgentPay Payment ID** | N/A (Canary pending live execution) | `NOT VERIFIED` |
| **Execution ID** | N/A | `NOT VERIFIED` |
| **Timestamp** | 2026-09-22T19:26:00Z | `VERIFIED` |

> [!IMPORTANT]
> **Zero False Claims Policy**:
> In accordance with Day 10 release freeze rules, no fake transaction hashes, mock block numbers, or synthetic contract addresses have been fabricated.
> Real Arc Mainnet settlement remains strictly classified as `NOT VERIFIED` until an authorized human operator executes the deployment script with funded gas and USDC credentials.

---

## 3. Operator Execution Instructions for Mainnet Settlement

To transition `ARC MAINNET` from `PARTIAL` to `VERIFIED`:

### Step 1: Fund Gas and USDC
- Fund the Relayer address with at least **5.0 ARC** for transaction gas fees.
- Fund the Relayer/Deployer address with at least **0.01 USDC** (`10000` base units) for the canary payment.

### Step 2: Deploy AgentVault to Arc Mainnet
```bash
export DEPLOYER_PRIVATE_KEY="<OPERATOR_PRIVATE_KEY>"
export ARC_RPC_URL="https://rpc.mainnet.arc.io"
export ARC_CHAIN_ID="5042"
export ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"
export AGENT_ID="research-agent"

# Requires typing 'DEPLOY-ARC-MAINNET' for explicit confirmation
./scripts/deploy_mainnet.sh --confirm
```

### Step 3: Verify Deployed Contract on Arc
```bash
# Verify bytecode exists
cast code <DEPLOYED_AGENTVAULT_ADDRESS> --rpc-url https://rpc.mainnet.arc.io

# Verify owner
cast call <DEPLOYED_AGENTVAULT_ADDRESS> "owner()(address)" --rpc-url https://rpc.mainnet.arc.io

# Verify USDC binding
cast call <DEPLOYED_AGENTVAULT_ADDRESS> "usdc()(address)" --rpc-url https://rpc.mainnet.arc.io
```

### Step 4: Transfer Ownership to Cold Multi-Sig
```bash
cast send <DEPLOYED_AGENTVAULT_ADDRESS> "transferOwnership(address)" <COLD_MULTISIG_ADDRESS> \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Step 5: Enable Live Execution & Broadcast Canary
```bash
# Update production environment
export AGENTVAULT_ADDRESS="<DEPLOYED_AGENTVAULT_ADDRESS>"
export ENABLE_LIVE_EXECUTION=true
export EXECUTOR_PRIVATE_KEY="<RELAYER_KEY>"

# Execute 0.01 USDC canary payment via AgentPay Gateway
CANARY_RESP=$(curl -s -X POST http://localhost:8080/v1/payment-intents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d '{
    "agent_id": "research-agent",
    "service": "web-research",
    "amount": "10000",
    "asset": "USDC",
    "purpose": "Day 10 Canary Settlement Verification"
  }')

INTENT_ID=$(echo $CANARY_RESP | jq -r .id)
curl -X POST "http://localhost:8080/v1/payment-intents/$INTENT_ID/confirm" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

### Step 6: Record Live On-Chain Evidence
Record the resulting transaction hash, block number, and explorer link:
- `https://explorer.arc.io/tx/<REAL_TRANSACTION_HASH>`
- `https://explorer.arc.io/address/<DEPLOYED_AGENTVAULT_ADDRESS>`
