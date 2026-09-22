# AgentPay Multi-Agent Swarm DAG Validation

## 1. Topological Validation Engine

AgentPay's `SwarmGraphValidator` is the gatekeeper that inspects all proposed task decompositions before any economic capital is reserved or execution commences.

```
Incoming Task Nodes & Dependencies
               │
               ▼
   [ Structural Checks ] ──> Max 20 Tasks, Max 4 Depth
               │
               ▼
   [ Kahn's Algorithm ] ───> Detect Cycles & Calculate In-Degrees
               │
               ▼
   [ Budget Gate ] ────────> Validate Sum(TaskBudgets) <= SwarmMaxBudget
               │
               ▼
   [ Cross-Tenant Gate ] ──> Verify all subcontracts belong to same Organization
               │
               ▼
       VALID DAG APPROVED
```

## 2. Cycle Detection with Kahn's Algorithm

Kahn's algorithm operates on in-degrees:
1. Compute in-degree for every task node $u \in V$.
2. Enqueue all nodes with $\text{in-degree}(u) = 0$ (independent root tasks).
3. Dequeue node $u$, increment `visitedCount`, and for each successor edge $(u, v)$:
   - Decrement $\text{in-degree}(v)$.
   - If $\text{in-degree}(v) == 0$, enqueue $v$.
4. If $\text{visitedCount} \ne |V|$, the graph contains a directed cycle and is rejected immediately with:
   ```
   ERR_GRAPH_CYCLE_DETECTED: cycle detected in task dependencies; Kahn's algorithm visited N of M nodes
   ```

## 3. Depth Limitation

To prevent recursive agent decomposition from generating infinite subcontract chains:
- Independent root tasks are assigned `depth = 0`.
- For any edge $(u, v)$, $\text{depth}(v) \ge \text{depth}(u) + 1$.
- Maximum depth is strictly capped at `4` (Depths 0, 1, 2, 3).
- Any task with $\text{depth} \ge 4$ is rejected with:
  ```
  ERR_MAX_DEPTH_EXCEEDED: task exceeds maximum allowed DAG depth 4
  ```

## 4. Total Budget Allocation Check

The validator verifies:
$$\sum_{i=1}^{n} \text{TaskBudget}_i \le \text{SwarmMaxBudget}$$
Any task decomposition requesting more total budget than the swarm's ceiling is rejected with `ERR_BUDGET_OVER_ALLOCATION`.
