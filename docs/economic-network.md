# The Agent-to-Agent Directed Economic Network (DAG)

## 1. Network Topology

The AgentPay Economic Network models autonomous agent collaboration not as opaque black-box calls, but as a formal **Directed Acyclic Graph (DAG)** of economic entities, dependencies, and disbursements.

$$\mathcal{G} = (\mathcal{V}, \mathcal{E})$$

### Vertices ($\mathcal{V}$)
- `MISSION`: The root economic objective initialized by a human or enterprise.
- `AGENT`: Keyless autonomous AI actors with bounded spending policies.
- `SERVICE`: Registered capabilities offered by peer agents or external APIs.
- `HIRE`: Binding operational contracts between buyers and sellers.
- `PAYMENT`: Authoritative payment intents settled via Arc USDC.

### Directed Edges ($\mathcal{E}$)
- `HIRED`: $u \xrightarrow{\text{HIRED}} v$, where agent $u$ hires agreement $v$.
- `PAID`: $u \xrightarrow{\text{PAID}} v$, where hire $u$ disburses payment $v$.
- `DEPENDS_ON`: $u \xrightarrow{\text{DEPENDS_ON}} v$, where entity $u$ requires output of $v$.
- `PRODUCED`: $u \xrightarrow{\text{PRODUCED}} v$, where entity $u$ generates asset $v$.
- `VALIDATED_BY`: $u \xrightarrow{\text{VALIDATED_BY}} v$, where result $u$ is cryptographically verified by validator $v$.

---

## 2. API Contract: Querying the Graph

`GET /v1/missions/{id}/economic-graph`

```json
{
  "mission_id": "msn_demo_weather_01",
  "nodes": [
    { "id": "msn_demo_weather_01", "type": "MISSION", "label": "Weather Telemetry Mission" },
    { "id": "agent_coordinator", "type": "AGENT", "label": "Coordinator Agent" },
    { "id": "hire_101", "type": "HIRE", "label": "Hire: Web Search" },
    { "id": "agent_search", "type": "AGENT", "label": "Search Agent" },
    { "id": "payment_201", "type": "PAYMENT", "label": "Arc USDC Settlement: 0.30" }
  ],
  "edges": [
    { "source": "msn_demo_weather_01", "target": "agent_coordinator", "type": "DEPENDS_ON" },
    { "source": "agent_coordinator", "target": "hire_101", "type": "HIRED" },
    { "source": "hire_101", "target": "agent_search", "type": "DEPENDS_ON" },
    { "source": "hire_101", "target": "payment_201", "type": "PAID" }
  ]
}
```

---

## 3. Real-Time Observability & Forensics

The Directed Economic Network provides:
1. **Financial Flight Recording**: Every node links to audit trails showing the policy evaluation timestamp, risk score, and blockchain tx hash.
2. **Visual Mission Control**: The interactive visualizer in the AgentPay Web UI (`/network`) renders SVG DAG edges with live status badges.
3. **Byzantine Fault Isolation**: If an agent produces malicious or failing outputs, the graph highlights the exact branch and isolates the fault.
