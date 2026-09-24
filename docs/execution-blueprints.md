# Execution Blueprints & DAG Compilation

## 1. Blueprint Specification

An `ExecutionBlueprint` represents a fully resolved, executable translation of an `EconomicObjective`. It contains:

- **Task Graph (DAG)**: Directed acyclic graph of discrete tasks (Discovery, Negotiation, Execution, Verification, Settlement).
- **Economic Envelopes**: Hard spending constraints per task and across the entire mission.
- **Risk Envelope**: Maximum tolerable risk score and required confidence thresholds.
- **Resource Envelope**: Maximum concurrent worker threads, compute units, and retry limits.
- **Policy References**: Cryptographic policy hash (`policy_hash`) and constitutional version.
- **Simulation Reference**: `simulation_id` and timestamp linking pre-flight validation.

---

## 2. Objective Compiler

The `ObjectiveCompiler` converts high-level objectives into blueprints without creating financial authority:

```
EconomicObjective ("Research 3 providers")
      │
      ▼
ObjectiveCompiler (Kahn DAG Resolution + Envelopes)
      │
      ▼
ExecutionBlueprint
 ├── Task 1: Discover candidate providers [Capability: discovery]
 ├── Task 2: Provider A Benchmark         [Capability: benchmark]
 ├── Task 3: Provider B Benchmark         [Capability: benchmark]
 ├── Task 4: Provider C Benchmark         [Capability: benchmark]
 ├── Task 5: Result Validation            [Capability: verification]
 └── Task 6: Deliverable Synthesis        [Capability: synthesis]
```

### Compiler Invariants:
1. **INV-142**: The compiler cannot generate financial authorizations or pre-approved payment intents.
2. **INV-143**: The sum of task economic envelopes cannot exceed the objective's `economic_budget`.
3. **DAG Correctness**: The task graph must be strictly acyclic with single-root and single-sink validation.

---

## 3. Blueprint Validation Matrix

Before any blueprint can be scheduled or dispatched:

1. **DAG Correctness**: No cycles, valid topological sort order.
2. **Dependency Correctness**: All task prerequisites exist within the blueprint.
3. **Capability Match**: Registered agents and providers satisfy required capability tags.
4. **Tenant Isolation**: All tasks bound to the requesting tenant ID (`INV-126`).
5. **Budget Envelope Consistency**: Envelope caps <= objective cap (`INV-143`, `INV-148`).
6. **Policy Compatibility**: Target actions comply with active policy rules.
7. **Deadline Feasibility**: Estimated duration <= SLA deadline.
8. **Simulation Freshness**: Policy hash and liquidity snapshot remain current (`INV-144`).

If any check fails, execution is blocked immediately. Constraints are **never** auto-relaxed.
