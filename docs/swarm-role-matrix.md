# AgentPay Multi-Agent Swarm Role Matrix

## 1. The 7 Specialized Agent Roles

AgentPay swarms operate through role specialization. Each agent in a swarm performs a clearly bounded responsibility:

| Role | Responsibility | Input Requirements | Output Payload | Validation Mechanism |
|---|---|---|---|---|
| **ORCHESTRATOR** | Decomposes root objective into a validated DAG; coordinates task unlocking | Root Mission Objective, Max Budget | Structured DAG Plan with dependencies | Kahn's Algorithm Validation |
| **RESEARCHER** | Gathers external primary information, documents, web data | Search topics, scope, target queries | Raw research findings, citations | Peer Review / Critic Review |
| **DATA_PROVIDER** | Streams structured metrics, on-chain telemetry, pricing feeds | Data endpoints, query parameters | Structured JSON datasets, timeseries | Format validation + Checksum |
| **ANALYST** | Synthesizes insights, computes models, aggregates telemetry | Datasets from Researcher & Data Provider | Analytical reports, economic models | Hash verification of inputs |
| **VERIFIER** | Cross-validates claims, benchmarks, and factual correctness | Outputs from Researcher/Analyst | Boolean verdict, discrepancy logs | Multi-Agent Quorum Consensus ($\ge 3$ nodes) |
| **CRITIC** | Adversarially tests assumptions, checks edge cases | Candidate deliverable draft | Score (0-100), structured critiques | Threshold Check ($\ge 80$ passes) |
| **SYNTHESIZER** | Combines verified outputs into the final executive deliverable | All approved task outputs | Final Mission Deliverable | Orchestrator Sign-off & Audit Seal |

---

## 2. Dynamic Discovery & Economic Matchmaking

When a task node becomes `READY` (all predecessor tasks completed):
1. **Capability Matching**: The Swarm Engine queries the Agent Registry for agents matching `required_capability`.
2. **Reputation & Pricing Filter**: Candidates are ranked contextually based on historical success rate, average latency, and pricing.
3. **Quote Negotiation**: An inter-agent quote is requested and verified against the task budget ceiling.
4. **Hiring Contract**: A binding Hire agreement is created, locking payment terms prior to task execution.
