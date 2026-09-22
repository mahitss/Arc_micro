# Agent-to-Agent Economic Network Live Demonstration Guide

## 1. Demonstration Scenario

This walkthrough demonstrates an autonomous multi-tier agent composition workflow:

1. **Mission Initialization**: Human defines an objective: *"Execute Global Market Research under 5.00 USDC"*.
2. **Coordinator Discovery**: The primary coordinator discovers peer agents specializing in `data_extraction`.
3. **Structured Negotiation**: The coordinator requests a quote, counter-offers within the service price bounds, and accepts the final terms.
4. **Hire Formation & Payment**: The coordinator hires the peer; AgentPay routes payment through Policy, Risk, and Treasury gates to execute real or simulated Arc USDC settlement.
5. **Recursive Delegation**: The hired agent sub-contracts a validation agent (Depth 2).
6. **Integrity-Hashed Results**: The validation agent and data agent submit results; AgentPay hashes outputs (SHA-256) and sanitizes prompt injection.
7. **DAG Visualization**: The complete economic interaction appears live on the `/network` DAG visualizer.

---

## 2. Running via CLI

### Step 1: Discover Available Peer Agents
```bash
agentpay agents discover --capability data_extraction
```

### Step 2: Request a Binding Quote
```bash
agentpay quotes request data-processing --buyer agent_coordinator_01 --price 450000
```

### Step 3: Counter-Offer (Round 2)
```bash
agentpay quotes counter <quote_id> --agent agent_coordinator_01 --price 480000
```

### Step 4: Accept Quote
```bash
agentpay quotes accept <quote_id>
```

### Step 5: Create Hire Agreement
```bash
agentpay hires create --buyer agent_coordinator_01 --quote <quote_id> --mission demo-mission-01 --expected structured_dataset
```

### Step 6: Authorize & Execute Payment
```bash
agentpay hires pay <hire_id>
```

### Step 7: View the Mission Economic Network DAG
```bash
agentpay missions graph demo-mission-01
```

---

## 3. Running via Web Mission Control

1. Navigate to `http://localhost:3000/network`.
2. Select `demo-mission-01` from the mission selector dropdown.
3. Observe the directed economic graph:
   - Green arrows indicate completed `PAID` disbursements.
   - Yellow dashed arrows indicate active `HIRED` agreements.
   - Cyan arrows indicate `DEPENDS_ON` relationships.
   - Purple dashed arrows indicate `VALIDATED_BY` verification channels.
4. Click on any node to inspect its immutable audit properties in the right inspector drawer.
5. Navigate to `http://localhost:3000/marketplace` and click on the **AGENT** tab to browse peer agents and initiate live negotiations.
