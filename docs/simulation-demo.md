# AgentPay Simulator: Canonical Demo Scenarios Walkthrough

This guide provides step-by-step instructions for running, inspecting, and demonstrating the **7 Canonical Demo Scenarios** supported by the AgentPay Economic Simulator across the CLI, Web UI, and SDKs.

---

## Scenario 1: Multi-Agent Swarm Mission (Kahn DAG Coordination)

### Objective
Demonstrate an autonomous 6-agent swarm executing a distributed research, synthesis, and code generation workflow. Show topological dependency ordering via Kahn's algorithm, dynamic step-by-step budget drawdown, and deterministic completion.

### Swarm Topology
- `Agent 1` (Lead Researcher) $\to$ `Agent 2` (Web Scraper) & `Agent 3` (Document Parser)
- `Agent 2` & `Agent 3` $\to$ `Agent 4` (Data Synthesizer)
- `Agent 4` $\to$ `Agent 5` (Code Generator)
- `Agent 5` $\to$ `Agent 6` (Reviewer / QA Verifier)

### Running via Web UI
1. Navigate to `/simulator` in Mission Control.
2. Under **Scenario Selector**, select **"1. Base 6-Agent Swarm Mission"**.
3. Click **"Run Simulation"**.
4. Observe:
   - **DAG Execution Sequence:** Steps execute in topological order without cycle deadlocks.
   - **Total Projected Cost:** $\$0.1420$ with $\$0.0008$ on-chain fees.
   - **Trace Audit Log:** Step-by-step ledger deductions with deterministic sequence IDs.

### Running via CLI
```bash
agentpay simulate --scenario swarm-6-agents --visualize
```

---

## Scenario 2: Provider Latency Spike & Failover

### Objective
Show how the simulator models an unexpected $3,500\text{ms}$ upstream latency spike on the primary search provider (`SerpAPI`), triggering the dynamic routing engine to reroute traffic to the backup provider (`BraveSearch`).

### Injected Fault
```json
{
  "failure_type": "LATENCY_SPIKE",
  "target_service": "serpapi-search",
  "latency_ms": 3500,
  "trigger_step": 1
}
```

### Observed Behavior
1. Step 1 attempts execution against `SerpAPI`.
2. Latency threshold ($1,500\text{ms}$) is exceeded.
3. Simulator projects a `simulation.recovery_projected` event:
   - Primary marked as degraded.
   - Failover route to `BraveSearch` at $\$0.0150$ per query.
4. Total execution completes successfully with an economic variance note showing $+\$0.0030$ failover premium.

---

## Scenario 3: Upstream Provider HTTP 500 & Circuit Breaker

### Objective
Demonstrate resilient economic handling when a critical LLM provider (`openai-gpt4o`) returns `HTTP 500 Internal Server Error`.

### Injected Fault
```json
{
  "failure_type": "HTTP_500",
  "target_service": "openai-gpt4o",
  "trigger_step": 2,
  "max_retries": 2
}
```

### Observed Behavior
1. Step 2 fails with `SERVICE_UNAVAILABLE`.
2. Simulator models the production retry policy with exponential backoff:
   - Retry 1: Projected failure after $200\text{ms}$.
   - Retry 2: Circuit breaker trips (`CIRCUIT_OPEN`).
3. Automated fallback routes the step to `anthropic-claude-3-5-sonnet`.
4. Economic trace records the wasted retry fees and the successful alternative completion.

---

## Scenario 4: Dynamic Surge Pricing Counterfactual

### Objective
Evaluate the financial impact of a sudden $2.5\times$ surge in token pricing or gas fees on an agent's batch processing run.

### Running Counterfactual via Python SDK
```python
from agentpay import AgentPayClient

client = AgentPayClient(api_key="ap_live_demo123")

# Run counterfactual comparison
comparison = client.simulations.run_counterfactual(
    base_scenario_id="scenario_batch_indexing",
    perturbation={
        "surge_multiplier": 2.5,
        "gas_price_gwei": 75.0
    }
)

print(f"Baseline Cost: ${comparison['baseline_cost']}")
print(f"Counterfactual Cost: ${comparison['counterfactual_cost']}")
print(f"Cost Delta: +{comparison['percentage_change']}%")
print(f"Recommendation: {comparison['recommendation']}")
```

### Output
```text
Baseline Cost: $1.4500
Counterfactual Cost: $3.6250
Cost Delta: +150.0%
Recommendation: EXCEEDS_DAILY_VELOCITY_LIMIT (Recommend rescheduling to low-traffic window)
```

---

## Scenario 5: Critical Vulnerability / Compromised Key Stop

### Objective
Demonstrate the emergency circuit breaker stopping a simulated mission when a suspicious withdrawal or unauthorized contract address is detected.

### Injected Fault
```json
{
  "failure_type": "SECURITY_POLICY_VIOLATION",
  "target_recipient": "0xUnverifiedAttackerAddress999",
  "trigger_step": 3
}
```

### Observed Behavior
1. At Step 3, the Rust policy engine flags an unverified merchant contract.
2. Status immediately transitions to `FAILED` with `REASON: EMERGENCY_CIRCUIT_BREAKER_TRIGGERED`.
3. Projected spend stops immediately; no subsequent swarm steps are executed.
4. Total financial loss prevented: $\$850.00$.

---

## Scenario 6: Monte Carlo $N=1000$ Tail Risk Analysis

### Objective
Run $1,000$ deterministically seeded stochastic simulations to construct the probability distribution of execution costs and identify the 95th-percentile (P95) worst-case financial exposure.

### Running via Web UI
1. Select the **Monte Carlo Analysis** tab on `/simulator`.
2. Set iterations $N = 1000$, confidence interval $= 95\%$.
3. Click **"Run Monte Carlo Simulation"**.
4. Review the generated distribution:
   - **P50 (Median):** $\$0.1450$
   - **P90:** $\$0.1820$
   - **P95 (Tail Risk):** $\$0.2240$
   - **Completion Rate:** $98.4\%$
   - Notice: `"ALL VALUES ARE MODELLED ESTIMATES UNDER DETERMINISTIC SEEDS"`

---

## Scenario 7: Stale Simulation Execution Blocked

### Objective
Verify that the `ExecutionGate` strictly prevents stale or invalidated simulation plans from acquiring live financial authority.

### Step-by-Step Test Procedure
1. Run a simulation run and generate an execution plan.
2. In the background, simulate an interim event:
   - Either wait for the 15-minute TTL to elapse, or
   - Alter the agent's wallet balance from $\$10.00$ to $\$0.05$.
3. Attempt to call `/api/v1/simulations/{id}/execute-plan`.
4. Observe the response:
   - **Status Code:** `409 Conflict`
   - **Error Code:** `SIMULATION_OUTDATED`
   - **Message:** `"SIMULATION OUTDATED: snapshot fingerprint mismatch or insufficient balance"`
   - Web UI renders a bright amber warning banner: **`SIMULATION OUTDATED: Re-run required before live execution`**.
