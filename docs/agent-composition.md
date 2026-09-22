# Multi-Agent Recursive Composition & Call Depth Controls

## 1. Compositional Multi-Agent Workflows

Real-world autonomous tasks require agents to delegate sub-tasks to other specialized agents:
- A **Research Agent** hires a **Search Agent** to scrape news.
- The **Search Agent** sub-contracts a **Translation Agent** to convert international sources.
- The **Translation Agent** sub-contracts an **OCR Agent** to parse images.

Without strict constraints, recursive sub-contracting creates vulnerabilities:
- **Infinite Delegation Loops**: Agent A hires Agent B, who hires Agent C, who hires Agent A.
- **Budget Drainage Cascades**: Each sub-agent consumes budget without central authorization.
- **Prompt Injection Amplification**: An untrusted child agent injects payload that overrides the parent.

---

## 2. Hard Invariant: Bounded Call Depth (`MAX_AGENT_CALL_DEPTH = 3`)

AgentPay enforces a hard recursion ceiling:

$$\text{CallDepth}(h) \le 3$$

```
Depth 0: Primary Mission (Coordinator)
   │
   ├── Depth 1: Hire Search Agent (CallDepth = 1)
   │      │
   │      └── Depth 2: Sub-contract Data Agent (CallDepth = 2)
   │             │
   │             └── Depth 3: Sub-contract Parser Agent (CallDepth = 3)
   │                    │
   │                    └── Depth 4: Sub-contract Attempt -> FAILS CLOSED (ErrMaxCallDepthExceeded)
```

### Fail-Closed Implementation
When `POST /v1/hires` is invoked:
1. If `parent_hire_id` is supplied, the Gateway fetches the parent Hire record.
2. If `parent.CallDepth + 1 > 3`, the request is rejected with HTTP `400 Bad Request` and code `MAX_AGENT_CALL_DEPTH_EXCEEDED`.
3. Financial authorization is impossible for any call attempting to exceed depth 3.

---

## 3. Root Mission Budget Conservation Invariant

Every sub-hire in the delegation tree must reference the `root_mission_id`. The sum of all settled and reserved hire payments across the entire delegation tree cannot exceed the root mission budget:

$$\sum_{h \in \text{Hires}(\text{RootMission})} h.\text{Price} \le \text{RootMission}.\text{Budget}$$

Child agents cannot independently increase their own budget or the budget of any ancestor.

---

## 4. Economic Graph DAG Representation

Every sub-hire creates explicit directed edges in the Mission Economic Graph:
- `HIRED`: Directed edge from Buyer Agent to Hire.
- `DEPENDS_ON`: Directed edge from Hire to Seller Agent.
- `PAID`: Directed edge from Hire to Payment Intent.
- `VALIDATED_BY`: Directed edge between validating and validated hires.

This ensures full auditability across all tiers of the delegation hierarchy.
