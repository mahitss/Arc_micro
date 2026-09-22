# AgentPay Mainnet Operations Runbook

**Target Network:** Arc Mainnet (EVM Chain ID `5042`)  
**Settlement Asset:** Native USDC (`0x3600000000000000000000000000000000000000`)  
**Security Freeze:** Day 9 Final Mainnet Production Freeze  
**Classification:** Confidential Operator Runbook (Contains NO secrets)

---

## Prerequisites & Operational Principles

> [!CRITICAL]
> **Zero Secrets in Documentation**:
> Never enter, store, or paste real private keys, API secrets, or passwords into this file or shell history.
> Use environment variables, hardware security modules, or secure secret managers (e.g. AWS Secrets Manager, HashiCorp Vault) exclusively.

---

## 1. Relayer & Wallet Funding

Before initiating on-chain settlement, both the Relayer (executor) wallet and the `AgentVault` contract require initial capitalization.

### 1.1 Relayer Gas Wallet (Native Arc Token)
- The Relayer hot wallet submits `executePayment` transactions to `AgentVault`.
- Minimum recommended gas balance: **5.0 ARC** (covers ~10,000 transaction submissions at current network gas parameters).
- Query Relayer native balance:
  ```bash
  cast balance $RELAYER_ADDRESS --rpc-url https://rpc.mainnet.arc.io
  ```

### 1.2 AgentVault Capitalization (Native USDC)
- `AgentVault` holds the operational funds spent by autonomous agents.
- Transfer initial USDC capital from the organization treasury (e.g., Gnosis Safe multisig) to the deployed `AgentVault` address:
  ```bash
  cast send 0x3600000000000000000000000000000000000000 \
    "transfer(address,uint256)(bool)" \
    $AGENTVAULT_ADDRESS \
    100000000 \
    --rpc-url https://rpc.mainnet.arc.io \
    --private-key $TREASURY_MULTISIG_KEY
  ```
- Verify vault USDC balance (100.00 USDC = `100000000` base units):
  ```bash
  cast call 0x3600000000000000000000000000000000000000 \
    "balanceOf(address)(uint256)" \
    $AGENTVAULT_ADDRESS \
    --rpc-url https://rpc.mainnet.arc.io
  ```

---

## 2. AgentVault On-Chain Verification

Ensure bytecode, owner configuration, and initialization parameters are verified on Arc Mainnet before routing traffic.

1. **Verify Contract Bytecode Exists**:
   ```bash
   cast code $AGENTVAULT_ADDRESS --rpc-url https://rpc.mainnet.arc.io
   ```
   *Expectation: Non-empty bytecode string (> 3000 bytes).*

2. **Verify Vault Owner**:
   ```bash
   cast call $AGENTVAULT_ADDRESS "owner()(address)" --rpc-url https://rpc.mainnet.arc.io
   ```
   *Expectation: Matches operator administration or relayer key.*

3. **Verify Bound USDC Contract**:
   ```bash
   cast call $AGENTVAULT_ADDRESS "usdc()(address)" --rpc-url https://rpc.mainnet.arc.io
   ```
   *Expectation: Must equal `0x3600000000000000000000000000000000000000`.*

4. **Verify Initial Policy Configuration**:
   ```bash
   cast call $AGENTVAULT_ADDRESS "policy()((bool,uint256,uint256,uint256,uint256,uint256,uint256))" \
     --rpc-url https://rpc.mainnet.arc.io
   ```

---

## 3. Relayer Verification & Key Boundary

1. Verify Relayer Address derived matches the configured private key:
   ```bash
   cast wallet address --private-key $EXECUTOR_PRIVATE_KEY
   ```
2. Verify Relayer is recognized as the authorized caller (`owner`) of `AgentVault`:
   ```bash
   cast call $AGENTVAULT_ADDRESS "owner()(address)" --rpc-url https://rpc.mainnet.arc.io
   ```
3. Test Relayer RPC connection:
   ```bash
   cast chain-id --rpc-url https://rpc.mainnet.arc.io
   # Expected output: 5042
   ```

---

## 4. Production Environment Configuration

Configure production environment variables in the Gateway execution host (`/etc/agentpay/gateway.env` or container orchestration secret):

```env
# Arc Mainnet Parameters
ARC_RPC_URL=https://rpc.mainnet.arc.io
ARC_CHAIN_ID=5042
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
ARC_EXPLORER_URL=https://explorer.arc.io

# Production Safety Switches
ENABLE_LIVE_EXECUTION=true
APP_ENV=production

# Storage (PostgreSQL mandatory in production; in-memory fails closed)
DATABASE_URL=postgres://agentpay_user:<STRONG_PASSWORD>@db.internal:5432/agentpay_prod?sslmode=verify-full

# Relayer Credentials (injected via secret store)
SIGNER_BACKEND=local
EXECUTOR_PRIVATE_KEY=<64_CHAR_HEX_WITHOUT_0X>
AGENTVAULT_ADDRESS=<DEPLOYED_42_CHAR_HEX_VAULT_ADDRESS>

# Timeouts & Confirmation Horizons
ARC_RPC_TIMEOUT_MS=5000
ARC_CONFIRMATION_TIMEOUT_MS=60000
PAYMENT_INTENT_TTL_SECONDS=300
```

---

## 5. Deployment Procedure

1. **Deploy Smart Contracts (if not already deployed)**:
   ```bash
   ./scripts/deploy_mainnet.sh --confirm
   ```
   *Note: Requires interactive typing of confirmation token to prevent accidental execution.*

2. **Run Database Migrations**:
   Ensure PostgreSQL migrations are applied cleanly before starting gateway instances:
   ```bash
   migrate -path services/gateway/migrations -database "$DATABASE_URL" up
   ```

3. **Deploy Gateway & Policy Engine Services**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

---

## 6. Post-Deployment Verification

Execute automated smoke check against the live gateway:

1. **Check Readiness**:
   ```bash
   curl -s http://localhost:8080/ready | jq .
   ```
   *Expected response:*
   ```json
   {
     "status": "ready",
     "service": "gateway",
     "dependencies": {
       "arc_rpc": "ok",
       "policy_engine": "ok",
       "storage": "ok"
     }
   }
   ```
   *If any dependency is "unavailable" or "unconfigured", investigate immediately.*

2. **Verify Registered Services**:
   ```bash
   curl -s http://localhost:8080/v1/services -H "X-Organization-ID: org_default" | jq .
   ```

---

## 7. Tiny Test Payment (Canary Settlement)

Before opening to autonomous traffic, execute one tiny canary payment (0.01 USDC = 10,000 base units):

1. **Create Canary Payment Intent**:
   ```bash
   CANARY_RESP=$(curl -s -X POST http://localhost:8080/v1/payment-intents \
     -H "Content-Type: application/json" \
     -H "Idempotency-Key: canary_init_$(date +%s)" \
     -H "Authorization: Bearer $ADMIN_API_KEY" \
     -d '{
       "agent_id": "canary_verifier",
       "service": "web-research",
       "amount": "10000",
       "asset": "USDC",
       "purpose": "Canary microtransaction live verification"
     }')
   INTENT_ID=$(echo $CANARY_RESP | jq -r .id)
   echo "Canary Intent: $INTENT_ID"
   ```

2. **Confirm Canary Payment Intent**:
   ```bash
   curl -s -X POST "http://localhost:8080/v1/payment-intents/$INTENT_ID/confirm" \
     -H "Authorization: Bearer $ADMIN_API_KEY" | jq .
   ```

3. **Verify On-Chain Confirmation**:
   - Confirm status is `CONFIRMED`.
   - Inspect transaction hash on Arc Explorer: `https://explorer.arc.io/tx/<TX_HASH>`.
   - Verify `PaymentExecuted` event emitted with recipient and 10,000 amount.

---

## 8. Transaction Monitoring

Monitor transactions in real time via structured logs and the Flight Recorder:

1. **Monitor Gateway Blockchain Logs**:
   ```bash
   journalctl -u agentpay-gateway -f | grep "BLOCKCHAIN"
   ```
2. **Monitor Ambiguous States**:
   Query for transactions requiring operator or reconciler attention:
   ```bash
   curl -s http://localhost:8080/v1/payment-intents?status=SUBMITTED | jq .
   ```
3. **Flight Recorder Audit Trace Inspection**:
   ```bash
   curl -s "http://localhost:8080/v1/payment-intents/$INTENT_ID/trace" \
     -H "Authorization: Bearer $ADMIN_API_KEY" | jq .
   ```

---

## 9. Emergency Pause Procedures

AgentPay provides a 4-tier defense-in-depth pause architecture:

| Tier | Scope | Command | Effect |
|---|---|---|---|
| **Tier 1: Agent** | Single Agent | `POST /v1/agents/{id}/pause` | Freezes spending for rogue agent |
| **Tier 2: Organization** | Tenant Org | `POST /v1/organizations/{id}/pause` | Freezes all agents within organization |
| **Tier 3: Global Gateway** | All Gateway Traffic | `POST /v1/system/pause` | Gateway stops all payment execution |
| **Tier 4: On-Chain Vault** | Smart Contract EVM | `cast send $VAULT "pause()"` | EVM reverts any `executePayment` call |

### Trigger On-Chain Emergency Vault Pause:
```bash
cast send $AGENTVAULT_ADDRESS "pause()" \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key $OPERATOR_OWNER_KEY
```

---

## 10. Incident Response Integration

Refer to [`docs/incident-response.md`](incident-response.md) for full procedural playbooks on:
- SEV-0: Active Relayer Key Compromise
- SEV-1: RPC Outage / Ambiguous Broadcasts
- SEV-2: Compromised API Key
- SEV-3: Policy Misconfiguration

---

## 11. Rollback & Settlement Limitations

> [!WARNING]
> **Blockchain Transactions are Irreversible**:
> Once a payment intent transitions to `CONFIRMED` and the transaction receipt is mined on Arc, funds cannot be rolled back via software.
> Rollback of application state does NOT reverse settled on-chain USDC transfers.

- **Cancelled Intents:** If an intent is in `CREATED`, `APPROVAL_REQUIRED`, or `AUTHORIZED` state, it can be cancelled (`POST /v1/payment-intents/{id}/cancel`), which releases the treasury reservation.
- **Executing / Submitted Intents:** Cannot be cancelled while a transaction is in flight. Reconciler must determine final on-chain disposition (`CONFIRMED` or `FAILED`) before funds can be released.

---

## 12. Key Rotation Strategy

### Relayer Hot Key Rotation:
1. Generate new 32-byte SECP256k1 keypair on offline or isolated machine.
2. Fund new relayer address with native Arc tokens for gas (5.0 ARC).
3. If relayer is contract owner, transfer ownership or assign execution role:
   ```bash
   cast send $AGENTVAULT_ADDRESS "transferOwnership(address)" $NEW_RELAYER_ADDRESS \
     --rpc-url https://rpc.mainnet.arc.io \
     --private-key $OLD_RELAYER_KEY
   ```
4. Update `EXECUTOR_PRIVATE_KEY` in gateway secret store.
5. Perform rolling restart of gateway services.
6. Verify new signer address in startup log:
   ```
   [AgentPay Gateway] Transaction signer initialized: backend=local address=0x...
   ```
7. Deprecate and zero-fill old private key.

---

## 13. Observability & Alerting Thresholds

Set up monitoring alerts (Prometheus / Datadog / Grafana) on the following metrics:

| Metric | Condition | Severity | Action |
|---|---|---|---|
| `gateway_ready_status` | != 1 for 1m | P0 | Check RPC, PostgreSQL, Policy Engine |
| `payment_ambiguous_count` | > 0 for 5m | P1 | Check Arc RPC node block sync & latency |
| `treasury_available_ratio` | < 15% | P2 | Alert treasury team to re-fund AgentVault |
| `policy_deny_rate` | > 25% of requests | P2 | Investigate possible agent misconfiguration |
| `webhook_delivery_failures` | > 10 consecutive | P3 | Inspect subscriber endpoint health |

---

## 14. Graceful Shutdown & Maintenance Procedure

To perform planned maintenance or infrastructure upgrades:

1. **Enable Maintenance Mode / Gateway Pause**:
   ```bash
   curl -X POST http://localhost:8080/v1/system/pause -H "Authorization: Bearer $ADMIN_KEY"
   ```
2. **Drain In-Flight Requests**:
   Wait 60 seconds (`ARC_CONFIRMATION_TIMEOUT_MS`) to allow all in-flight broadcasts to reach mined receipts or reconcile.
3. **Stop Gateway Instances**:
   ```bash
   docker-compose stop gateway
   ```
4. **Perform Maintenance** (Database maintenance, binary upgrades, OS patches).
5. **Start Gateway Instances**:
   ```bash
   docker-compose up -d gateway
   ```
6. **Verify Readiness**:
   ```bash
   curl -s http://localhost:8080/ready | jq .status
   # Must return "ready"
   ```
7. **Resume Gateway**:
   ```bash
   curl -X POST http://localhost:8080/v1/system/resume -H "Authorization: Bearer $ADMIN_KEY"
   ```
