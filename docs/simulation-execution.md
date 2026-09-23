# Safe Plan Execution & Staleness Verification (Phases 23 & 24)

## 1. Overview: The Bridge from Simulation to Reality

In an autonomous multi-agent economic network, blindly executing a simulated plan in the real world is dangerous:
- Providers may have increased prices or suffered outages since the simulation was run.
- The agent's real treasury liquidity may have been consumed by concurrent tasks.
- Spending policies may have been updated or revoked by human risk officers.
- Quotes may have expired.

The **AgentPay Execution Gate** provides a cryptographically verified, deterministic bridge that converts a `SimulationExecutionPlan` into live mission execution **only if real-world reality still matches the simulation's assumptions**.

---

## 2. The Verification Pipeline

```
+--------------------------------------------------------------+
|                POST /simulations/:id/execute-plan            |
+--------------------------------------------------------------+
                               |
                               v
               +--------------------------------+
               | 1. Plan & Snapshot Retrieval   |
               +--------------------------------+
                               |
                               v
               +--------------------------------+
               | 2. Snapshot Fingerprint Check  |
               +--------------------------------+
                               |
                 Matches Current Reality?
                    /                    \
                  No                     Yes
                  /                        \
                 v                          v
  +--------------------------+  +--------------------------+
  | 422 Unprocessable Entity |  | 3. Treasury Liquidity    |
  |   "SIMULATION OUTDATED"  |  |    Sufficiency Check     |
  |  (detailed drift report) |  +--------------------------+
  +--------------------------+              |
                                 Has Worst-Case Exposure?
                                    /                    \
                                  No                     Yes
                                  /                        \
                                 v                          v
                  +--------------------------+  +--------------------------+
                  | 422 Unprocessable Entity |  | 4. Fresh Policy Check    |
                  | "INSUFFICIENT_LIQUIDITY" |  |    & Quote Revalidation  |
                  +--------------------------+  +--------------------------+
                                                            |
                                                All Rules Validated?
                                                   /            \
                                                 No             Yes
                                                 /                \
                                                v                  v
                                 +-----------------------+  +----------------------+
                                 |  Policy / Quote Error |  | 5. Convert to Live   |
                                 +-----------------------+  |    Execution Intent  |
                                                            +----------------------+
                                                                       |
                                                                       v
                                                            +----------------------+
                                                            | Live Mission Started |
                                                            | (200 OK + MissionID) |
                                                            +----------------------+
```

---

## 3. Plan Data Model

When a simulation completes, it produces a deterministic `SimulationExecutionPlan`:

```json
{
  "id": "plan_sim_9a7b1c3d",
  "simulation_id": "sim_9a7b1c3d",
  "snapshot_id": "snap_live_20260923_101",
  "snapshot_fingerprint": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "created_at": "2026-09-23T18:00:00Z",
  "expires_at": "2026-09-23T18:15:00Z",
  "steps": [
    {
      "step_id": "step_1",
      "agent_id": "agent_worker_1",
      "service_id": "svc_research_pro",
      "capability": "data_extract",
      "projected_cost": "1500000",
      "fallback_service_id": "svc_research_fallback",
      "fallback_cost": "1800000",
      "max_retries": 2,
      "timeout_ms": 3000
    }
  ],
  "projected_economics": {
    "total_spend": "1500000",
    "fee_amount": "15000",
    "worst_case_exposure": "2300000"
  },
  "status": "READY_FOR_EXECUTION"
}
```

---

## 4. Staleness Revalidation Rules

The `ExecutionGate` evaluates the following conditions before authorizing live execution:

### 1. Fingerprint Validity
The `snapshot_fingerprint` in the plan is compared against a fresh digest of the current organization configuration. If any policy, vendor definition, or active service status has changed, the fingerprint will differ.

### 2. Balance & Worst-Case Liquidity Revalidation
The gate does **not** simply check if the agent has `total_spend`. It checks whether the agent currently holds:
$$\text{Current Available Balance} \ge \text{Worst Case Exposure} + \text{Safety Buffer}$$
This guarantees that even if the primary provider times out and the fallback provider is engaged, the live mission will not run out of budget midway through.

### 3. Service Availability & Active Status
Every service designated in the plan steps (and fallbacks) must be `Enabled: true` in the live registry. If a provider went into maintenance or was disabled after simulation, execution is blocked.

### 4. Quote Expiry
Simulation plans expire after a configurable duration (default: 15 minutes). Once `expires_at` has passed, the plan cannot be converted into live execution.

---

## 5. API Reference & Error Responses

### Endpoint
`POST /api/v1/simulations/:id/execute-plan`

### Request Payload
```json
{
  "plan_id": "plan_sim_9a7b1c3d",
  "require_fresh_quotes": true,
  "override_buffer_basis_points": 500
}
```

### Stale Simulation Response (`422 Unprocessable Entity`)
```json
{
  "error": "SIMULATION OUTDATED",
  "code": "STALE_SIMULATION_STATE",
  "message": "Real-world state has diverged from simulation snapshot assumptions",
  "divergence": {
    "snapshot_fingerprint_expected": "e3b0c442...",
    "snapshot_fingerprint_actual": "4f53cda1...",
    "reasons": [
      "Service svc_research_pro updated pricing from 1.50 USDC to 1.85 USDC",
      "Agent agent_worker_1 available balance decreased from 25.00 USDC to 1.20 USDC"
    ]
  },
  "action_required": "Run a fresh simulation against the current state before executing."
}
```

### Success Response (`200 OK`)
```json
{
  "status": "EXECUTED",
  "live_mission_id": "mission_live_849201",
  "plan_id": "plan_sim_9a7b1c3d",
  "committed_budget": "2300000",
  "tracking_url": "/missions/mission_live_849201"
}
```

---

## 6. Client SDK Usage Examples

### TypeScript SDK
```typescript
import { AgentPay } from '@agentpay/sdk';

const agentpay = new AgentPay({ apiKey: process.env.AGENTPAY_API_KEY! });

try {
  const result = await agentpay.simulations.executePlan('sim_9a7b1c3d', 'plan_sim_9a7b1c3d', {
    requireFreshQuotes: true,
  });
  console.log(`Live mission launched: ${result.live_mission_id}`);
} catch (err: any) {
  if (err.message.includes('SIMULATION OUTDATED')) {
    console.warn('Simulation is stale. Re-running simulation...');
    const freshRun = await agentpay.simulations.create(myScenario);
    // review fresh plan...
  }
}
```

### Python SDK
```python
from agentpay import AgentPay

client = AgentPay(api_key="ap_live_...")

try:
    result = client.simulations.execute_plan(
        simulation_id="sim_9a7b1c3d",
        plan_id="plan_sim_9a7b1c3d",
        require_fresh_quotes=True
    )
    print(f"Mission executing live: {result['live_mission_id']}")
except Exception as e:
    if "SIMULATION OUTDATED" in str(e):
        print("Plan is outdated. Re-simulating...")
```
