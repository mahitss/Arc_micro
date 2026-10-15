# Arc Deployment Resources

## 1. Arc Mainnet Resources

| Resource | Value | Verification |
|---|---|---|
| **Network** | Arc Mainnet | **VERIFIED** |
| **Chain ID** | `5042` | **VERIFIED** |
| **RPC** | `https://rpc.mainnet.arc.io` | **VERIFIED** |
| **USDC** | `0x3600000000000000000000000000000000000000` | **VERIFIED** |
| **AgentVault** | Target: `contracts/script/DeployAgentVault.s.sol` | **NOT DEPLOYED ON MAINNET** |
| **Explorer** | `https://explorer.arc.io` | **VERIFIED** |
| **Owner/Controller** | Deployer Address (Assigned at Initialization) | **NOT VERIFIED** |
| **Demo Transaction** | None | **NOT VERIFIED** |

---

## 2. Arc Testnet Verified Deployment

| Resource | Value | Verification |
|---|---|---|
| **Network** | Arc Testnet | **VERIFIED LIVE** |
| **Chain ID** | `5042002` (`0x4cef52`) | **VERIFIED** |
| **RPC Endpoint** | `https://rpc.testnet.arc.network` | **VERIFIED (ACTIVE)** |
| **USDC Contract** | `0x3600000000000000000000000000000000000000` | **VERIFIED (CODE PRESENT)** |
| **AgentVault Contract** | `0x7789bC3d8366782b97496165C24BD5bB09302843` | **VERIFIED DEPLOYED (9,902 bytes)** |
| **Deployment Transaction** | `0xcc3485dc1958fde3b7bb75623e01c00e8dc155723d69cb64516fefdde2dccb70` | **CONFIRMED (STATUS 1, BLOCK #67246545)** |
| **Deployer / Initial Owner** | `0x2a3613D44799Ce28385058358586E8D311eE6C57` | **VERIFIED (`owner()` match)** |
| **Agent ID** | `research-agent` | **VERIFIED (`agentId()` match)** |
| **Spending Policy** | Disabled (`policy.enabled == false`) | **VERIFIED SAFE** |
| **Live Execution Mode** | `ENABLE_LIVE_EXECUTION=false` | **VERIFIED SAFE (READ-ONLY)** |
| **Gas Used** | `1,236,065` gas | **VERIFIED** |
| **Explorer Contract** | [0x7789bC3d8366782b97496165C24BD5bB09302843](https://testnet.arcscan.app/address/0x7789bC3d8366782b97496165C24BD5bB09302843) | **LIVE** |
| **Explorer Tx** | [0xcc3485dc1958fde3b7bb75623e01c00e8dc155723d69cb64516fefdde2dccb70](https://testnet.arcscan.app/tx/0xcc3485dc1958fde3b7bb75623e01c00e8dc155723d69cb64516fefdde2dccb70) | **LIVE** |

---

## 3. On-Chain Settlement Evidence

No live Arc mainnet payment is currently documented (Mainnet remains protected with zero bytecode deployed).
Arc Testnet AgentVault has been successfully broadcast, confirmed in block `#67246545`, and holds verified unpaused status with spending policies safely disabled.

### Factual Status:
1. **Live RPC & Canonical Token**: Verified live via direct JSON-RPC calls. `eth_chainId` returns `0x13b2` (`5042`) on Mainnet and `0x4cef52` (`5042002`) on Testnet.
2. **Contract Readiness**: `AgentVault.sol` is deployed on Arc Testnet at `0x7789bC3d8366782b97496165C24BD5bB09302843` with owner `0x2a3613D44799Ce28385058358586E8D311eE6C57`.
3. **Zero Mainnet Transactions Broadcast**: In accordance with project safety guidelines, automated testing and local reviews run with `ENABLE_LIVE_EXECUTION=false` to avoid inadvertent gas spend or unverified transaction claims.
