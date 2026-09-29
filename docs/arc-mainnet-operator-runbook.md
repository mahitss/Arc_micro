# Arc Mainnet Production Operator Runbook

$$\text{CLASSIFICATION: AUTHORITATIVE INFRASTRUCTURE DEPLOYMENT PROTOCOL}$$
$$\text{WARNING: ZERO PRIVATE KEYS — ADHERE TO COLD MULTI-SIG SEPARATION}$$

---

## 1. Environment & Chain Parameters

| Parameter | Canonical Value | Verification Status |
| :--- | :--- | :---: |
| **Network** | Arc Mainnet | `VERIFIED` |
| **Chain ID** | `5042` (`0x13b2`) | `VERIFIED` |
| **JSON-RPC Endpoint** | `https://rpc.mainnet.arc.io` | `VERIFIED` (Block #23,401,027+) |
| **Native USDC Contract** | `0x3600000000000000000000000000000000000000` | `VERIFIED` (3,598 bytes bytecode) |
| **Block Explorer** | `https://explorer.arc.io` | `VERIFIED` |
| **Gas Asset** | Native USDC (EIP-1559, protocol-level gas) | `VERIFIED` |

---

## 2. Status Separation: PREPARED vs. EXECUTED

```
┌────────────────────────────────────────────────────────┐
│                        PREPARED                        │
│  [X] Foundry deployment scripts compiled and tested    │
│  [X] AgentVault.sol reference contract audited         │
│  [X] Gateway RPC connection and Chain ID 5042 validated│
│  [X] Calldata binding and signer safeguards verified   │
│  [X] Fail-closed live execution safety gates armed     │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   EXECUTED (CURRENT)                   │
│  [ ] Cold Multi-Sig deployed on Arc Mainnet            │
│  [ ] AgentVault deployed on Arc Mainnet                │
│  [ ] Live canary micro-settlement executed             │
│  [ ] ENABLE_LIVE_EXECUTION switched to true            │
│  CURRENT STATE: DETERMINISTIC SIMULATION MODE (0 LIVE) │
└────────────────────────────────────────────────────────┘
```

---

## 3. Deployment Preflight & Prerequisites

Before broadcasting any transaction to Arc Mainnet:
1. **Cold Multi-Sig Owner Requirement:** Unrestricted production deployments strictly require ownership by an institutional multi-sig wallet (e.g., Gnosis Safe). The Gateway hot relayer key **must never** hold owner privileges on `AgentVault`.
2. **Gas Funding:** Ensure the deployer and relayer addresses hold sufficient Arc native gas (USDC).
3. **Database Production Requirement:** Production mode strictly prohibits in-memory storage. A valid PostgreSQL/Neon `DATABASE_URL` must be configured.

---

## 4. Step-by-Step Operator Deployment Runbook

### Step 1: Deploy AgentVault via Foundry Script
Execute from a secure operator machine:
```bash
cd contracts
forge script script/DeployAgentVault.s.sol:DeployAgentVault \
  --rpc-url https://rpc.mainnet.arc.io \
  --broadcast \
  --sig "run(address,string,address)" \
  0x3600000000000000000000000000000000000000 \
  "agentpay-mainnet-vault" \
  <COLD_MULTISIG_SAFE_ADDRESS>
```

### Step 2: On-Chain Bytecode Verification
Verify that bytecode exists at the newly deployed address:
```bash
python scripts/check_arc.py
# Must show: AgentVault Status: DEPLOYED (non-zero bytecode)
```

### Step 3: Vault Funding
Transfer initial operational USDC from the treasury or multi-sig Safe to the verified `AgentVault` address:
```bash
# Example: 100.00 USDC for canary operations
cast send 0x3600000000000000000000000000000000000000 \
  "transfer(address,uint256)" <DEPLOYED_AGENTVAULT_ADDRESS> 100000000 \
  --rpc-url https://rpc.mainnet.arc.io
```

### Step 4: Configure On-Chain Spending Policies
Via the cold multi-sig Safe, configure initial limits on `AgentVault`:
- `setPolicy(perTxLimit, dailyLimit, maxTransactionsPerDay)`
- `setRecipientAllowed(recipientAddress, true)`

### Step 5: Enable Live Execution in Gateway
Update production environment configuration:
```bash
AGENTVAULT_ADDRESS=<DEPLOYED_AGENTVAULT_ADDRESS>
ENABLE_LIVE_EXECUTION=true
SIGNER_BACKEND=local
EXECUTOR_PRIVATE_KEY=<SECURE_RELAYER_KEY>
ENVIRONMENT=production
DATABASE_URL=<SECURE_POSTGRES_URL>
```

### Step 6: Canary Micro-Settlement (0.01 USDC)
Trigger an automated canary intent through the Gateway to verify end-to-end receipt mining and database reconciliation.

---

## 5. Rollback & Emergency Incident Handling

1. **4-Tier Emergency Pause:**
   - **Tier 1 (Agent Pause):** Call `POST /v1/emergency/pause/agent/{id}` to freeze a misbehaving agent.
   - **Tier 2 (Service Pause):** Call `POST /v1/emergency/pause/service/{id}` to freeze payouts to a compromised provider.
   - **Tier 3 (Organization Pause):** Call `POST /v1/emergency/pause/org` to suspend tenant execution.
   - **Tier 4 (Global Kill Switch):** Set `ENABLE_LIVE_EXECUTION=false` in environment or invoke `pause()` on `AgentVault` via the cold multi-sig Safe.
2. **Asset Recovery:**
   - In the event of a critical system breach, the cold multi-sig owner can invoke `emergencyWithdraw(recipient)` on `AgentVault.sol` to sweep all remaining USDC reserves to cold storage.
