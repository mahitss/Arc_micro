# AgentPay Economic Simulator: 7 Canonical Demo Scenarios

This document provides step-by-step instructions, JSON payloads, and expected outcomes for each of the **7 Canonical Demo Scenarios** built into AgentPay Mission Control, SDKs, and CLI.

---

## Scenario 1: Happy Path Single Agent

### Overview
A single autonomous research agent discovers, negotiates, and hires a data extraction service. Both policy and risk checks pass cleanly, and the projected task settles within budget.

### CLI Command
```bash
agentpay-cli simulation run --scenario happy-path
```

### Scenario Payload
```json
{
  "scenario_name": "happy_path_single_agent",
  "organization_id": "org_demo",
  "initiator_agent_id": "agent_researcher_1",
  "execution_mode": "SIMULATION",
  "nodes": [
    {
      "step_id": "step_extract",
      "agent_id": "agent_researcher_1",
      "capability": "data_extract",
      "max_budget": "2000000",
      "timeout_ms": 3000
    }
  ]
}
```

### Expected Output
- **Status:** `COMPLETED`
- **Total Projected Cost:** `1.50 USDC`
- **Platform Fee:** `0.015 USDC` (100 bps)
- **Worst Case Exposure:** `1.50 USDC`
- **Trace Highlights:**
  - `simulation.started`
  - `simulation.policy_evaluated`: `ALLOWED`
  - `simulation.risk_evaluated`: `LOW_RISK` (score: 5)
  - `simulation.step_projected`: Selected `svc_fast_extract` (1.50 USDC, latency: 180ms)
  - `simulation.completed`

---

## Scenario 2: Multi-Agent Swarm with Branching & Parallel Execution

### Overview
A 6-agent research & analysis swarm executes a topological DAG:
- Node 1: Lead Orchestrator parses requirements.
- Nodes 2 & 3: Parallel web search & code repository indexing.
- Node 4: Synthesis agent merges parallel findings.
- Node 5: Critic agent evaluates accuracy.
- Node 6: Executive summarizer drafts final presentation.

### Scenario Payload
```json
{
  "scenario_name": "swarm_parallel_branching",
  "organization_id": "org_demo",
  "execution_mode": "SIMULATION",
  "nodes": [
    { "step_id": "step_parse", "agent_id": "agent_lead", "capability": "intent_parse", "dependencies": [] },
    { "step_id": "step_search", "agent_id": "agent_searcher", "capability": "web_search", "dependencies": ["step_parse"] },
    { "step_id": "step_code", "agent_id": "agent_coder", "capability": "code_index", "dependencies": ["step_parse"] },
    { "step_id": "step_synth", "agent_id": "agent_synth", "capability": "data_synthesis", "dependencies": ["step_search", "step_code"] },
    { "step_id": "step_critique", "agent_id": "agent_critic", "capability": "critique", "dependencies": ["step_synth"] },
    { "step_id": "step_publish", "agent_id": "agent_lead", "capability": "publish", "dependencies": ["step_critique"] }
  ]
}
```

### Expected Output
- **Topology:** Validated DAG via Kahn's algorithm (depth: 4, concurrency: 2 in tier 2).
- **Concurrency Speedup:** 35% latency reduction compared to serial execution.
- **Projected Spend:** `4.85 USDC`.

---

## Scenario 3: Mid-Flight Failure & Dynamic Replanning

### Overview
A primary provider (`svc_nlp_fast`) suffers a simulated connection timeout (`PROVIDER_TIMEOUT`). The simulator automatically engages the configured fallback provider (`svc_nlp_reliable`) and models the additional latency and cost.

### Failure Injection Configuration
```json
{
  "failure_injections": [
    {
      "step_id": "step_summarize",
      "failure_type": "PROVIDER_TIMEOUT",
      "probability": 1.0,
      "delay_ms": 3000
    }
  ]
}
```

### Expected Output
- **Status:** `COMPLETED_WITH_FALLBACK`
- **Trace Highlights:**
  - `simulation.step_projected`: Primary provider `svc_nlp_fast` initiated.
  - `simulation.failure_injected`: `PROVIDER_TIMEOUT` triggered after 3000ms.
  - `simulation.recovery_projected`: Fallback engaged (`svc_nlp_reliable`, +$0.40 cost, +250ms latency).
  - `simulation.completed`: Total spend `1.90 USDC`.
- **Worst-Case Exposure:** Computed as Primary Cost + Fallback Cost = `3.40 USDC`.

---

## Scenario 4: Cascading Failure Across Swarm

### Overview
An upstream data indexing agent fails permanently due to a schema mismatch (`SCHEMA_MISMATCH`). Downstream synthesis and critic agents detect that prerequisite data is missing and trigger compensation logic to avoid burning further budget.

### Expected Output
- **Status:** `FAILED_PARTIALLY_RECOVERED`
- **Budget Conserved:** `68%` of total mission budget saved by halting downstream tasks before payment dispatch.
- **Trace Highlight:** `simulation.compensation_triggered` on downstream nodes.

---

## Scenario 5: Policy Boundary Denial

### Overview
An autonomous agent attempts to execute a batch task with an estimated cost of `$25.00 USDC`, exceeding its configured per-transaction budget limit of `$10.00 USDC`.

### Expected Output
- **Status:** `DENIED_BY_POLICY`
- **HTTP Code:** `403 Forbidden` (in simulation context, returns `status: DENIED`)
- **Policy Violation:** `EXCEEDS_SINGLE_TRANSACTION_LIMIT (10000000 micro-USDC)`.
- **Financial Spend:** `$0.00 USDC` (zero risk exposure).

---

## Scenario 6: Counterfactual Policy Comparison

### Overview
Compares two simulation policies against the exact same swarm scenario:
- **Baseline:** Strict policy requiring secondary human approval for tasks over $2.00 USDC.
- **Counterfactual:** Relaxed policy with $5.00 USDC auto-approval limit and relaxed latency tolerance.

### API Call
`POST /api/v1/simulations/counterfactual`

### Expected Output
- **Comparison Summary:**
  - Execution Time: Baseline 45.2s (with approval hold) vs Counterfactual 1.8s (-96%).
  - Completion Rate: Baseline 100% vs Counterfactual 98%.
  - Cost Difference: Counterfactual saved $0.35 USDC by selecting slightly slower spot providers.
  - Recommendation: Safe to apply counterfactual policy to production.

---

## Scenario 7: Deterministic Monte Carlo Tail Risk

### Overview
Executes 100 deterministic seeded simulation runs across stochastic provider latency and failure distributions to construct the tail risk exposure curve.

### API Call
`POST /api/v1/simulations/monte-carlo`
```json
{
  "scenario_name": "swarm_tail_risk",
  "iterations": 100,
  "seed": 1337
}
```

### Expected Output
- **Notice:** `MODELLED ESTIMATE - NOT FINANCIAL ADVICE`
- **Iterations Completed:** 100
- **Success Rate:** `94.0%`
- **P50 Cost (Median):** `3.20 USDC`
- **P90 Cost:** `4.15 USDC`
- **P95 Tail Risk (Worst-Case):** `5.80 USDC`
- **Safe Budget Recommendation:** Allocate `6.00 USDC` to ensure 99.9% mission completion probability.
