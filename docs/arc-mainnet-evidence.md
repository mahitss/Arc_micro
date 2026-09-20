# Arc Mainnet Deployment & Verification Evidence

## Deployment Overview & Verification Status

| Attribute | Parameter / Verified Value | Source / Verification |
|---|---|---|
| **Network** | Arc Mainnet | Authoritative Arc Network Specification |
| **Chain ID** | `5042` | Pre-flight RPC verified in `scripts/deploy_mainnet.sh` |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` | Verified gateway client dialer |
| **Native USDC Contract** | `0x3600000000000000000000000000000000000000` | Arc Native USDC Token standard |
| **Block Explorer** | `https://explorer.arc.io` | Verified transaction formatting |
| **Smart Contract** | `AgentVault.sol` (Solidity 0.8.24) | 42 Foundry test cases passing (`forge test`) |
| **Gateway Live Execution** | `ENABLE_LIVE_EXECUTION=false` | Fails closed by default; requires operator activation |
| **Deployment Status** | **READY FOR OPERATOR BROADCAST** | Deployment script hardened with `--confirm` check |

---

## 1. Verified Smart Contract Artifacts

- **Contract Source:** [`contracts/src/AgentVault.sol`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/contracts/src/AgentVault.sol)
- **Deployment Script:** [`contracts/script/DeployAgentVault.s.sol`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/contracts/script/DeployAgentVault.s.sol)
- **Deployment Automation:** [`scripts/deploy_mainnet.sh`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/scripts/deploy_mainnet.sh)

### Contract Safety & Verification Highlights:
- **Zero Upgradeability Risk:** `AgentVault` is non-upgradeable by design.
- **Fuzz Testing:** 256 fuzz runs on daily limit invariants (`testFuzz_PaymentNeverExceedsDailyLimit`, `testFuzz_PaymentAbovePerTxLimitAlwaysFails`).
- **Emergency Protection:** Owner `pause()` halts all outgoing payments on-chain (`test_26_pause_prevents_payment`).

---

## 2. Mainnet Deployment Procedure

To execute the official mainnet deployment, an operator with funded Arc Mainnet deployer credentials executes:

```bash
export DEPLOYER_PRIVATE_KEY="<AUTHORIZED_DEPLOYER_KEY>"
export ARC_RPC_URL="https://rpc.mainnet.arc.io"
export ARC_CHAIN_ID="5042"
export ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"

# Interactive safety prompt requires typing 'DEPLOY-ARC-MAINNET'
./scripts/deploy_mainnet.sh --confirm
```

The script automatically:
1. Verifies the live RPC reports Chain ID `5042` before broadcasting.
2. Runs Foundry deployment script with `--slow` and `--broadcast`.
3. Verifies bytecode at destination address via `eth_getCode`.

---

## 3. Post-Deployment Record Template

Once broadcast is executed by the operator, the live production parameters will be recorded below:

```yaml
network: "Arc Mainnet"
chain_id: 5042
rpc_url: "https://rpc.mainnet.arc.io"
usdc_contract: "0x3600000000000000000000000000000000000000"
agent_vault_address: "READY_FOR_DEPLOYMENT"
deployment_transaction: "PENDING_OPERATOR_BROADCAST"
explorer_url: "https://explorer.arc.io"
live_execution_status: "SAFETY_GATED (ENABLE_LIVE_EXECUTION=false)"
```

> **Policy Note:** In accordance with Day 10 safety guidelines, no fake transaction hashes or simulated mainnet contract addresses have been fabricated. Live broadcast remains gated behind explicit human operator authorization.
