# AgentPay Incident Response & Operations Runbook

## Overview & Severity Matrix

| Severity | Definition | Target Response Time | Escalation |
|---|---|---|---|
| **SEV-0** | Active financial drain, compromised execution key, unauthorized mainnet transfers | < 5 minutes | Immediate Global Pause + Engineering Lead |
| **SEV-1** | Blockchain ambiguity, stuck execution workers, partial database outage | < 15 minutes | On-Call Lead + DevOps |
| **SEV-2** | Compromised API key, suspicious payment alert, webhook delivery backlog | < 1 hour | Security Operations |
| **SEV-3** | Policy misconfiguration, non-financial degraded performance | < 4 hours | Platform Engineering |

---

## Standard Emergency Control Commands

```bash
# 1. Global Kill Switch: Halts all execution across the entire network
curl -X POST https://api.agentpay.io/v1/system/pause \
  -H "Authorization: Bearer $SYSTEM_ADMIN_KEY"

# 2. Organization Pause: Halts all agents and payments for specific tenant
curl -X POST https://api.agentpay.io/v1/organizations/{org_id}/pause \
  -H "Authorization: Bearer $ORG_ADMIN_KEY"

# 3. Agent Pause: Freezes a rogue or malfunctioning autonomous agent
curl -X POST https://api.agentpay.io/v1/agents/{agent_id}/pause \
  -H "Authorization: Bearer $ORG_ADMIN_KEY"
```

---

## 1. Compromised API Key

### Detection
- Anomaly alerts on velocity, geographic origin, or unexpected IP addresses.
- User or developer report of leaked key in public repository or logs.

### Immediate Containment
1. Revoke the compromised key immediately:
   ```bash
   curl -X DELETE https://api.agentpay.io/v1/api-keys/{key_id} \
     -H "Authorization: Bearer $ORG_ADMIN_KEY"
   ```
2. If high-velocity payments are actively creating intents, pause the agent:
   ```bash
   curl -X POST https://api.agentpay.io/v1/agents/{agent_id}/pause ...
   ```

### Investigation
- Query audit logs: `GET /v1/audit-events?actor_id={key_id}&limit=100`.
- Identify all intents created by the compromised key since compromise timestamp.
- Check execution status of created intents: `GET /v1/payment-intents?status=PENDING_APPROVAL`.

### Recovery & Verification
- Reject any pending approvals associated with the attacker.
- Issue a new API key with least-privilege scopes.
- Unpause agent once credentials have been safely rotated in client environment.

### Post-Incident Actions
- Review developer key distribution practices.
- Add IP-whitelisting rule to organization configuration if appropriate.

---

## 2. Suspicious Payment Intent

### Detection
- Risk engine flags payment with `RISK_HIGH` or `ABOVE_APPROVAL_THRESHOLD`.
- Unusually high amount or rapid burst of tasks from autonomous agent.

### Immediate Containment
1. Reject pending approval:
   ```bash
   curl -X POST https://api.agentpay.io/v1/approvals/{approval_id}/reject \
     -H "Authorization: Bearer $ORG_ADMIN_KEY" \
     -d '{"approver_id":"sec_ops","reason":"Suspicious payment anomaly detected"}'
   ```
2. Pause the agent if automated loop is suspected.

### Investigation
- Inspect agent reasoning and justification: `GET /v1/payment-intents/{intent_id}`.
- Review agent prompt context and external inputs for prompt injection indicators.
- Verify whether the target service was legitimate.

### Recovery & Verification
- Release any held treasury reservations: `POST /v1/treasury/reservations/{id}/release`.
- Confirm no on-chain transaction was submitted.

---

## 3. AgentPay Emergency Pause (Global / Org)

### Execution Procedure
1. Trigger Global Pause:
   ```bash
   curl -X POST https://api.agentpay.io/v1/system/pause \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```
2. Verify status returns `{"global_execution": "PAUSED"}`:
   ```bash
   curl https://api.agentpay.io/v1/system/status
   ```

### Operational Effects
- All calls to `POST /v1/payments/execute` immediately fail closed with 503 Service Unavailable.
- All intent confirmations in `POST /v1/payment-intents/{id}/confirm` are halted by the Execution Gate (`ErrGlobalExecutionPaused`).
- Transactions already confirmed on-chain are immutable and remain settled.

### Resumption Procedure
- Confirm root cause is resolved and patched.
- Resume global execution: `POST /v1/system/resume`.
- Verify readiness probe: `GET /ready` returns `status: "ready"`.

---

## 4. Blockchain Ambiguity (RPC Timeout / Network Partition)

### Detection
- Log alert: `[BLOCKCHAIN] Transaction ... in AMBIGUOUS state due to confirmation timeout`.
- Execution record status marked as `AMBIGUOUS`.

### Containment
- System automatically holds the payment intent in `AMBIGUOUS` state.
- **NEVER re-broadcast or fail closed immediately**; this prevents double-spending.

### Resolution Procedure
1. Query transaction status on Arc Explorer using the captured transaction hash.
2. Trigger the automated reconciliation endpoint / CLI:
   ```bash
   agentpay tx reconcile --request-id {request_id}
   ```
3. If the transaction was mined successfully, `ReconcileTransaction` updates state to `CONFIRMED` and settles treasury reservation.
4. If transaction was dropped / never included after block horizon, mark as `FAILED` and release reservation.

---

## 5. Stuck Execution Worker

### Detection
- Health check degraded: `GET /ready` reports `arc_rpc: unavailable`.
- Intent remains in `EXECUTING` state beyond `PaymentIntentTTLSeconds`.

### Resolution Procedure
1. Check Arc RPC endpoint latency and block height.
2. Inspect gateway execution queue: verify worker nonces are in order.
3. Restart execution worker process if process lock is detected:
   ```bash
   sudo systemctl restart agentpay-gateway
   ```
4. On startup, idempotency check will safely recover pending transactions.

---

## 6. Database Outage

### Detection
- Gateway returns 500 `INTERNAL_ERROR` or readiness probe reports `storage: unavailable`.
- PostgreSQL connection pool exhausted.

### Immediate Containment
1. Traffic routing: Edge proxy redirects to read-only status page.
2. In-flight transactions: Handlers fail closed; no money moves without DB persistence.

### Recovery
1. Check Postgres primary health: `pg_isready -h db.agentpay.internal`.
2. If disk full or WAL log saturation, rotate old audit event archives.
3. Fail over to hot standby if primary hardware failed.
4. Restore service and run schema verification: `migrate -path migrations -database ... version`.

---

## 7. Webhook Abuse / Inbound Flood

### Detection
- Webhook dispatcher error logs indicating repeated destination timeouts.
- High outgoing network traffic on webhook egress port.

### Immediate Containment
1. Disable abusive webhook endpoint:
   ```bash
   curl -X PATCH https://api.agentpay.io/v1/webhooks/{id} \
     -H "Authorization: Bearer $ORG_ADMIN_KEY" \
     -d '{"enabled": false}'
   ```
2. Circuit breaker automatically trips if endpoint accumulates >10 consecutive failures.

### Investigation & Verification
- Check destination URL in SSRF validator logs.
- Verify webhook delivery payload size is strictly bounded (<256KB).

---

## 8. Compromised External Service

### Detection
- Partner service reports breach or wallet compromise.
- Malicious calldata or unauthorized address associated with service ID.

### Containment & Resolution
1. Immediately disable service in Service Registry:
   ```bash
   agentpay services disable --service-id {service_id}
   ```
2. Execution Gate immediately rejects any intent targeting the disabled service with `ErrServiceNotActive`.
3. Update service recipient address in database after re-verification with provider.

---

## 9. Policy Misconfiguration

### Detection
- Legitimate agent tasks unexpectedly denied (`AMOUNT_EXCEEDS_LIMIT` or `DAILY_LIMIT_EXCEEDED`).
- Overly permissive limits discovered during audit.

### Resolution Procedure
1. Re-evaluate agent policy with dry-run simulation:
   ```bash
   curl -X POST https://api.agentpay.io/v1/simulations \
     -H "Content-Type: application/json" \
     -d '{"agent_id":"agent_1","service":"compute-cluster","amount":"500000","asset":"USDC"}'
   ```
2. Update policy limits with corrected integer base units.
3. Verify changes through unit testing in `services/policy-engine`.

---

## 10. Accidental Mainnet Execution Attempt

### Detection
- Gateway attempts execution against Chain ID 5042 when operating in development or testing mode.

### Containment Guardrails
- `ENABLE_LIVE_EXECUTION=false` is hardcoded default.
- If live execution is attempted while disabled, gateway fails closed with `StateExecutionDisabled` (`"live execution is disabled by configuration"`).
- `scripts/deploy_mainnet.sh` requires explicit confirmation typing `DEPLOY-ARC-MAINNET`.

### Post-Incident Actions
- Audit environment variable injection in CI/CD pipeline.
- Ensure staging environment does not have access to production executor keys.
