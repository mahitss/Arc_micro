# Arc Deployment Resources

| Resource | Value | Verification |
|---|---|---|
| **Network** | Arc Mainnet | **VERIFIED** |
| **Chain ID** | `5042` | **VERIFIED** |
| **RPC** | `https://rpc.mainnet.arc.io` | **VERIFIED** |
| **USDC** | `0x3600000000000000000000000000000000000000` | **VERIFIED** |
| **AgentVault** | Target: `contracts/script/DeployAgentVault.s.sol` | **NOT VERIFIED** |
| **Explorer** | `https://explorer.arc.io` | **VERIFIED** |
| **Owner/Controller** | Deployer Address (Assigned at Initialization) | **NOT VERIFIED** |
| **Demo Transaction** | None | **NOT VERIFIED** |

---

## On-Chain Settlement Evidence

No verified Arc mainnet payment is currently documented.

### Factual Status:
1. **Live RPC & Canonical Token**: Verified live via direct JSON-RPC calls. `eth_chainId` returns `0x13b2` (`5042`) and canonical USDC contains 3,598 bytes of deployed bytecode.
2. **Contract Readiness**: `AgentVault.sol` is compiled and tested across 42 Foundry unit and fuzz tests. Deployment script `scripts/deploy_mainnet.sh` is prepared for broadcast with funded deployer keys.
3. **Zero Mainnet Transactions Broadcast**: In accordance with project safety guidelines, automated testing and local reviews run with `ENABLE_LIVE_EXECUTION=false` to avoid inadvertent gas spend or unverified transaction claims.
