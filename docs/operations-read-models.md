# Read Model Architecture & Source of Truth Separation

## 1. Authoritative Domain Truth vs Operational Read Models

A fundamental architectural principle of AgentPay is the strict separation between **Authoritative Domain Truth** and **Operational Read Models**. 

Under no circumstances may a read model or aggregated projection serve as the basis for financial authorization:

```
┌────────────────────────────────────────┐       ┌────────────────────────────────────────┐
│      AUTHORITATIVE DOMAIN TRUTH        │       │         OPERATIONAL READ MODEL         │
├────────────────────────────────────────┤       ├────────────────────────────────────────┤
│ • PaymentIntent state machine          │       │ • OperationsSnapshot                   │
│ • Treasury ledger balances             │       │ • OperationsHealth                     │
│ • PolicyEngine evaluation records      │  ──►  │ • OperationalGraph                     │
│ • Clearinghouse netting batches        │       │ • Control Tower Dashboard Projections  │
│ • Arc blockchain receipts & proofs     │       │ • Causal Lineage Visualization         │
├────────────────────────────────────────┤       ├────────────────────────────────────────┤
│ CAN AUTHORIZE OR EXECUTE TRANSFERS     │       │ READ-ONLY DERIVED PROJECTION (INV-121) │
└────────────────────────────────────────┘       └────────────────────────────────────────┘
```

---

## 2. Mapping Domain Truth to Derived Views

| Entity | Role | Source of Truth | Operational Projection |
|---|---|---|---|
| **Payment Pipeline** | Authorization of fund transfers | `PaymentIntent` database record | `OperationsSnapshot.active_workflows` |
| **Treasury & Liquidity** | Account balances and reserved collateral | Internal double-entry ledger & Vault events | `OperationsSnapshot.treasury_state` |
| **Policy & Compliance** | Risk verification and constitutional constraints | Rust Policy Engine evaluated output | `OperationsSnapshot.policy_state` |
| **Settlement** | On-chain fund delivery | Arc RPC receipt & transaction hash | `OperationsHealth.arc.status_text` |
| **Workflow State** | Durable execution progress | PostgreSQL checkpoint event logs | `OperationalReplay.entries` |
| **Topology** | Cluster component layout | Runtime health probes | `OperationalGraph` |

---

## 3. Freshness Guarantees (INV-134)

Operational read models are stamped with exact freshness metadata and versioning. The UI and API strictly expose one of four freshness states:

- **`FRESH`**: Generated within the last 5 seconds. All underlying component probes reported within their SLA.
- **`STALE`**: Telemetry is between 5 and 30 seconds old. Read projections are retained for operator awareness, but marked with warning indicators.
- **`DEGRADED`**: Telemetry older than 30 seconds, or one or more subsystem telemetry collectors is unreachable.
- **`UNKNOWN`**: Supervisor has lost connectivity or is restarting.

> **CRITICAL INVARIANT (INV-134):** The frontend and CLI never display stale aggregated telemetry as current. If the backend disconnects, an emergency `CONNECTION LOST` banner freezes operator controls (`INV-137`).

---

## 4. Arc & AgentVault Verification: Zero-Fabrication Rule (INV-135)

AgentPay guarantees that blockchain status is never falsified or inferred from basic connectivity:

```
                  ┌──────────────────────────────┐
                  │        Arc RPC Node          │
                  └──────────────┬───────────────┘
                                 │ HTTP / WS Ping
                                 ▼
                     RPC Connectivity: AVAILABLE
                                 │
                 ┌───────────────┴───────────────┐
                 │ Is AgentVault deployed & live?│
                 └───────────────┬───────────────┘
                        NO       │       YES
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       AgentVault Status:              AgentVault Status:
   NOT VERIFIED / NOT DEPLOYED          VERIFIED & ACTIVE
```

- **Arc RPC Reachable**: Reports `Arc RPC: AVAILABLE`.
- **Contract Deployment Unverified**: Reports `AgentVault: NOT VERIFIED / NOT DEPLOYED`.
- Live settlement transactions remain gated until cryptographic on-chain verification is complete.
