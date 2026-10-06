# AGENTPAY — PRODUCTIONIZATION PHASE 1: REAL ARC DEPLOYMENT & LIVE CANARY READINESS REPORT

**Document ID:** `AGENTPAY-PROD-CANARY-01`  
**Execution Timestamp:** 2026-10-06T14:32:00Z  
**Target Environment:** Arc Mainnet (Chain ID 5042)  
**Verification Level:** HARD AUDIT (Fail-Closed)  

---

## 1. EXECUTIVE SUMMARY & VERDICT

| Component / Phase | Verdict | Evidence / Status |
| :--- | :--- | :--- |
| **QA Baseline (Phase 0)** | **VERIFIED** | 1,657/1,657 tests green (533 Frontend, 952 Go, 57 Rust, 42 Foundry, 33 TS, 26 Py, 14 CLI; 33/33 API E2E, 19/19 UI E2E, 30/30 Invariants, 100/100 Determinism). |
| **Production Database (Phase 1)** | **VERIFIED** | PostgreSQL 18.6 on AWS Neon pooler. 16/16 migrations applied (`schema_migrations` tracking active), 84 production tables initialized, memory fallback strictly prohibited. |
| **Arc Mainnet RPC & Chain ID (Phase 1)** | **VERIFIED** | `https://rpc.mainnet.arc.io` online. Live RPC Chain ID queried: `5042` (`0x13b2`). |
| **Native Arc USDC (Phase 1)** | **VERIFIED** | Address: `0x3600000000000000000000000000000000000000`. On-chain code length: 1,798 bytes. |
| **Operator Deployer Address (Phase 2)** | **VERIFIED** | Derived from operator key: `0x2a3613D44799Ce28385058358586E8D311eE6C57`. Matches configured `DEPLOYER_ADDRESS`. |
| **Deployer Gas Balance (Phase 2)** | **BLOCKED** | On-chain balance: `0 wei` (0.000000 ARC). Deployment requires real gas. |
| **Cold Multisig Owner (Phase 2)** | **BLOCKED** | `COLD_MULTISIG_OWNER` is unconfigured (`None`). |
| **Authorized Canary Recipient (Phase 2)** | **BLOCKED** | `AUTHORIZED_CANARY_RECIPIENT` is unconfigured (`None`). |
| **AgentVault On-Chain State (Phase 3)** | **VERIFIED UNDEPLOYED** | Target address `0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852`. `eth_getCode` returned `0x` (0 bytes). |
| **Deployment Safety Gate (Phase 4)** | **HALTED** | Fails closed: missing gas, missing cold multisig, missing canary recipient. |
| **Signer Architecture (Phase 17)** | **PARTIAL / KMS BLOCKED** | LocalSigner loaded in gateway with derived address; enterprise KMS signer is unconfigured. |
| **Live Execution Status (Phase 10/16)** | **HALTED** | `ENABLE_LIVE_EXECUTION=false`. Fail-closed simulation isolation active. |

---

## 2. PHASE 1: PRODUCTION ENVIRONMENT AUDIT

### Configuration State
- `ENVIRONMENT`: `production` (configured in root `.env` and runtime config).
- `DATABASE_URL`: Active connection to Neon PostgreSQL (`ep-broad-grass-azv5188q-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb`).
- `ENABLE_LIVE_EXECUTION`: `false` (hard fail-closed gate maintained).
- `ARC_RPC_URL`: `https://rpc.mainnet.arc.io`.
- `ARC_CHAIN_ID`: `5042`.
- `ARC_USDC_ADDRESS`: `0x3600000000000000000000000000000000000000`.

### Database & Migrations Evidence
- **PostgreSQL Version:** PostgreSQL 18.6 (Debian 18.6-1.pgdg13+1 on AWS Neon).
- **Migration Engine:** `services/gateway/migrations/migrations.go` applied all 16 migrations sequentially:
  1. `000001_init.up.sql`
  2. `000002_domain_foundation.up.sql`
  3. `000003_day3_controls.up.sql`
  4. `000004_api_keys.up.sql`
  5. `000005_events_and_webhooks.up.sql`
  6. `000006_production_hardening.up.sql`
  7. `000007_swarm_orchestration.up.sql`
  8. `000008_open_agent_network.up.sql`
  9. `000009_clearinghouse.up.sql`
  10. `000010_treasury_orchestrator.up.sql`
  11. `000011_durable_runtime.up.sql`
  12. `000012_operations_os.up.sql`
  13. `000013_economic_fabric.up.sql`
  14. `000014_economic_protocol.up.sql`
  15. `000015_economic_marketplace.up.sql`
  16. `000016_clearing_network.up.sql`
- **Total Tables:** 84 relational tables established in schema `public`.
- **Memory Storage Prohibition:** `InitializeRepository` in `factory.go` actively enforces `ErrMemoryStorageForbiddenInProduction` when `ENVIRONMENT=production` or `ENABLE_LIVE_EXECUTION=true`. Silent fallback to in-memory storage is physically impossible.

### Secret Isolation & Frontend Hygiene
- **Frontend Audit:** Inspected all `NEXT_PUBLIC_` variables across `apps/web`. Zero private keys, seeds, or confidential connection credentials present.
- **Git Repository Audit:** `.env`, `*.key`, `*.pem`, and `private_key*` are strictly ignored by `.gitignore`. `git ls-files` confirms zero committed secrets.

---

## 3. PHASE 2: OPERATOR CREDENTIAL PREFLIGHT

### Credential Derivation Audit
- **Operator Private Key:** Present strictly in local `.env` as `EXECUTOR_PRIVATE_KEY` / `DEPLOYER_PRIVATE_KEY`. Never printed, never logged, never exposed.
- **Derived Deployer Address:** `0x2a3613D44799Ce28385058358586E8D311eE6C57`.
- **Configured `DEPLOYER_ADDRESS`:** `0x2a3613D44799Ce28385058358586E8D311eE6C57` (**MATCH: PASS**).

### On-Chain Balances (Direct RPC Query to Arc Mainnet)
- **Native Gas Balance:** `0 wei` (`0.000000 ARC`).
- **Native USDC Balance:** `0 base units` (`0.000000 USDC`).
- **Preflight Gas Requirement:** Insufficient gas to broadcast contract creation transaction.

### Role & Address Verification
- `COLD_MULTISIG_OWNER`: **UNCONFIGURED** (`None`). Preflight requirement for non-zero multisig address failed.
- `AUTHORIZED_CANARY_RECIPIENT`: **UNCONFIGURED** (`None`). Preflight requirement for canary recipient failed.
- **Safety Precondition Verdict:** **FAIL CLOSED — STOPPING BEFORE BROADCAST**.

---

## 4. PHASE 3: AGENTVAULT DEPLOYMENT PREFLIGHT

### Target Contract State
- **Target Contract Address:** `0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852`.
- **Live RPC Bytecode Check (`eth_getCode`):** `0x` (0 bytes).
- **Confirmation:** Target contract is verified undeployed on Arc Mainnet.

### Constructor Parameters Verification
- **Token Contract (`_usdc`):** `0x3600000000000000000000000000000000000000` (Verified deployed with 1,798 bytes).
- **Agent Identifier (`_agentId`):** `research-agent`.
- **Initial Owner (`_initialOwner`):** Requires `COLD_MULTISIG_OWNER`. Cannot be assigned until operator supplies cold multisig address.

---

## 5. PHASE 4: DEPLOYMENT SAFETY GATE

In accordance with strict safety protocols, broadcasting is blocked until all operator requirements are met.

```
==================================================================
           AgentPay: Live Arc Deployment Preflight Audit          
==================================================================
Destination Network: Arc Mainnet
Target Chain ID:     5042 (LIVE RPC MATCHED: 0x13b2)
Target RPC URL:      https://rpc.mainnet.arc.io
USDC Contract:       0x3600000000000000000000000000000000000000 (VERIFIED ON-CHAIN)
Agent ID:            research-agent
Deployer Address:    0x2a3613D44799Ce28385058358586E8D311eE6C57
Native Gas Balance:  0 wei (0.000000 ARC) -> INSUFFICIENT GAS
Initial Owner:       [BLOCKED: COLD_MULTISIG_OWNER UNCONFIGURED]
Canary Recipient:    [BLOCKED: AUTHORIZED_CANARY_RECIPIENT UNCONFIGURED]
==================================================================
SAFETY STATUS:       HALTED (Preconditions Incomplete)
ACTION:              DO NOT BROADCAST. NO REAL FUNDS MOVED.
==================================================================
```

---

## 6. PHASE 8 & 17: OWNER/RELAYER SEPARATION & ENTERPRISE SIGNER AUDIT

### Separation Model
- **Architectural Requirement:**
  $$\text{Cold Multisig} \longrightarrow \text{AgentVault Owner}$$
  $$\text{Hot Relayer} \longrightarrow \text{Authorized Execution Only}$$
- **Current Contract Limitation (`AgentVault.sol` v1):**
  `executePayment` currently enforces `onlyOwner`. If ownership is transferred to a cold multisig that cannot sign automated transactions on the fly, automated execution reverts.
- **Enterprise Signer Status:**
  `LocalSigner` is active using local key derivation.
  Enterprise KMS signer (`KMSSigner`) is marked **BLOCKED** until external AWS/GCP KMS key ARN is provisioned.

---

## 7. PHASE 11 - 14: CANARY READINESS & RECONCILIATION GATE

The 0.01 USDC Canary transaction requires the following sequential steps once funded:
1. Operator funds Deployer account `0x2a36...` with Arc native gas for contract creation.
2. Operator provisions `COLD_MULTISIG_OWNER` and `AUTHORIZED_CANARY_RECIPIENT`.
3. Operator executes canonical deployment script: `scripts/deploy_mainnet.sh --confirm`.
4. Deployed `AgentVault` address is independently queried on Arc RPC (`eth_getCode != 0x`).
5. Operator deposits 0.01 USDC into `AgentVault`.
6. Gateway sets `ENABLE_LIVE_EXECUTION=true` in `LIVE_CANARY` mode.
7. Gateway issues canonical payment through:
   $$\text{Intent} \to \text{Policy} \to \text{Risk} \to \text{Approval} \to \text{Treasury} \to \text{Execution Gate} \to \text{Signer} \to \text{AgentVault} \to \text{Arc}$$
8. On-chain receipt and balance shifts reconciled against internal ledger.

---

## 8. CONTROL TOWER LIVE STATUS

- **Application:** REAL
- **Environment:** PRODUCTION (Ready for Live Canary)
- **Database:** CONNECTED (`PostgreSQL 18.6`, 84 tables)
- **Arc RPC:** CONNECTED (`Chain ID 5042`)
- **AgentVault:** NOT DEPLOYED (`0x`)
- **Execution Mode:** SIMULATION / SAFE (Awaiting Operator Canary Confirmation)
- **Real Funds Moved:** 0.00 USDC (Integrity preserved)
