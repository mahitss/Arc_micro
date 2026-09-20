# AgentPay Multi-Tier Emergency Controls (Day 3)

## 1. Overview & Architecture

AgentPay implements a defense-in-depth emergency hierarchy that enables human financial controllers and administrators to halt payments at multiple levels of granularity.

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 1: GLOBAL PAYMENT KILL SWITCH (Off-Chain)             │
│ Halts all execution across the entire AgentPay network.     │
│ Observability and intent creation remain operational.       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               v
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 2: ORGANIZATION PAUSE (Off-Chain)                     │
│ Halts execution for all agents owned by the tenant.         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               v
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 3: AGENT PAUSE (Off-Chain)                            │
│ Halts execution for an individual autonomous agent.         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               v
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 4: ON-CHAIN CONTRACT PAUSE (AgentVault.sol)           │
│ Smart contract `pause()` invoked by vault owner on Arc.     │
│ EVM execution reverts with `EnforcedPause()`.               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Distinction: Off-Chain vs On-Chain Pause

| Control Tier | Scope | Implementation | Reversibility | Failure Behavior |
|---|---|---|---|---|
| **Global Execution Kill Switch** | All organizations & agents | Off-chain Gateway (`system_state.global_execution = "PAUSED"`) | Instant resume via API | Blocks execution immediately |
| **Organization Pause** | All agents in organization | Off-chain Gateway (`organizations.status = "PAUSED"`) | Instant resume via API | Blocks execution for org |
| **Agent Pause** | Specific agent | Off-chain Gateway (`agents.status = "PAUSED"`) | Instant resume via API | Blocks execution for agent |
| **On-Chain Vault Pause** | Smart contract `AgentVault.sol` | On-chain EVM (`Pausable._pause()`) | Requires on-chain `unpause()` tx | Contract reverts at EVM level |

### Critical Principle:
- **Off-chain pause blocks submission** of new blockchain transactions while preserving observability and monitoring.
- **On-chain pause guarantees zero-trust protection** directly on Arc; even if the gateway server is compromised, `AgentVault.executePayment` reverts on-chain.
- **Transactions already broadcast to the Arc mempool cannot be reversed by pausing.** Once a transaction is included in a block, settlement is final.

---

## 3. Emergency Control API

### 1. Agent Controls
- `POST /v1/agents/:id/pause`
- `POST /v1/agents/:id/resume`
- Request Body: `{"actor_id": "usr_compliance_officer"}`

### 2. Organization Controls
- `POST /v1/organizations/:id/pause`
- `POST /v1/organizations/:id/resume`
- Request Body: `{"actor_id": "usr_admin"}`

### 3. Global Execution Kill Switch
- `POST /v1/system/pause` — Engages global execution pause.
- `POST /v1/system/resume` — Resumes global execution.
- `GET /v1/system/status` — Returns current status (`ACTIVE` or `PAUSED`).
- Request Body: `{"actor_id": "usr_superadmin"}`

---

## 4. Audit Trail

All emergency operations emit append-only audit events:
- `agent.paused` / `agent.resumed`
- `organization.paused` / `organization.resumed`
- `system.execution_paused` / `system.execution_resumed`
