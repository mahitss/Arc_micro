# AgentPay Multi-Agent Swarm API Reference

## 1. REST Endpoints

All endpoints are hosted at `/v1/swarms` and authenticated via `Bearer <API_KEY>` or tenant context.

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/swarms` | Create and decompose a new multi-agent swarm DAG |
| `GET` | `/v1/swarms/{id}` | Retrieve swarm details, budget status, and task metrics |
| `POST` | `/v1/swarms/{id}/start` | Commence autonomous execution of the swarm DAG |
| `POST` | `/v1/swarms/{id}/cancel` | Cancel swarm and release all uncommitted budget reservations |
| `POST` | `/v1/swarms/simulate` | Simulate DAG plan, cost, depth, and risk without spending funds |
| `GET` | `/v1/swarms/{id}/tasks` | List all task nodes in the swarm DAG |
| `GET` | `/v1/swarms/{id}/graph` | Retrieve directed economic network DAG nodes and edges |
| `GET` | `/v1/swarms/{id}/trace` | Retrieve append-only audit trace events for the swarm |
| `GET` | `/v1/swarms/{id}/risk` | Retrieve risk score breakdown and safety recommendations |
| `POST` | `/v1/swarms/{id}/replan` | Generate an adaptive replanning proposal upon bottleneck or failure |

---

## 2. CLI Commands

```bash
# Create a new swarm
agentpay swarms create --name "AI Infra Analysis" --objective "Datacenter power telemetry" --budget 5000000

# Get swarm details
agentpay swarms get swm_123

# Start autonomous execution
agentpay swarms start swm_123

# Simulate DAG before execution (zero broadcast)
agentpay swarms simulate --name "Audit" --objective "Decompile smart contract" --budget 3000000

# List swarm tasks
agentpay swarms tasks swm_123

# Inspect directed economic network DAG
agentpay swarms graph swm_123

# View audit trace events
agentpay swarms trace swm_123

# Check risk assessment
agentpay swarms risk swm_123

# Trigger adaptive replan
agentpay swarms replan swm_123

# Cancel swarm
agentpay swarms cancel swm_123
```

---

## 3. Client SDKs

### TypeScript SDK
```typescript
import { AgentPay } from '@agentpay/sdk';

const client = new AgentPay({ apiKey: process.env.AGENTPAY_API_KEY });

// 1. Create Swarm
const swarm = await client.swarms.create({
  name: 'Market Intelligence Swarm',
  objective: 'Analyze next-gen GPU datacenter contracts',
  max_budget: '5000000', // 5.00 USDC
});

// 2. Start Execution
await client.swarms.start(swarm.id);

// 3. Inspect Directed Economic Network DAG
const graph = await client.swarms.graph(swarm.id);
console.log(`DAG valid: ${graph.is_dag}, Max depth: ${graph.depth}`);
```

### Python SDK
```python
from agentpay import AgentPay

client = AgentPay(api_key="your_api_key")

# 1. Simulate Swarm
sim = client.swarms.simulate(
    name="Market Intelligence Swarm",
    objective="Analyze AI infrastructure",
    max_budget="5000000",
)
print(f"Estimated cost: {sim['estimated_cost']}, Valid DAG: {sim['is_valid_dag']}")

# 2. Create and Start
swarm = client.swarms.create(
    name="Market Intelligence Swarm",
    objective="Analyze AI infrastructure",
    max_budget="5000000",
)
client.swarms.start(swarm["id"])
```
