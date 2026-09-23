# Simulation Security & Invariant Enforcement

## Overview

The **AgentPay Economic Simulator & Digital Twin** is designed with strict security guarantees. The central security objective is to allow AI agents, multi-agent swarms, and autonomous operators to explore hypothetical financial workflows, predict costs, simulate adversary injections, and test policy boundary conditions with **complete cryptographic and operational isolation** from live financial assets.

Under no circumstances may a simulation mutate live database records, touch on-chain smart contracts, hold private keys, reserve real treasury liquidity, or emit live payment notifications.

---

## The 15 Non-Negotiable Security Invariants

The simulator rigorously enforces fifteen formal security invariants (`INV-SIM-1` through `INV-SIM-15`). Every simulation run is checked against these invariants throughout its lifecycle.

| Invariant | Name | Description | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **INV-SIM-1** | Zero Blockchain Writes | No transactions, calldata, or signatures may be broadcast to the Arc Layer 1 network. | Hardcoded RPC isolation; simulator uses memory mock and rejects transaction dispatch. |
| **INV-SIM-2** | Zero Vault Mutations | `AgentVault` smart contracts and live on-chain balances must remain completely untouched. | Simulated balances are recorded in a transient `SimulationSnapshot` copy, never modifying production vault state. |
| **INV-SIM-3** | Zero Liquidity Locks | Simulation must never reserve, lock, or encumber real USDC funds in production accounts. | Budget reservations are evaluated against local hypothetical pool allocations only. |
| **INV-SIM-4** | Zero Real Webhooks | External webhook listeners and downstream business logic must not receive production payment events. | Event broker restricts simulation event dispatch to the dedicated `simulation.*` namespace. |
| **INV-SIM-5** | Zero Private Key Access | Agents and the simulation engine must have zero access to private keys or signing seeds. | Keyless agent architecture; keys reside strictly in production HSM enclaves, inaccessible to simulation. |
| **INV-SIM-6** | Mandatory Mode Labeling | Every simulation object, response, plan, and trace must be explicitly labeled `mode: SIMULATION`. | Serialization interceptor validates the `mode: SIMULATION` tag on all generated JSON payloads. |
| **INV-SIM-7** | Explicit State Separation | Simulated payment intents, quotes, and transactions must not be stored in production tables. | Persistent storage uses isolated simulation collections (`simulations`, `simulation_runs`). |
| **INV-SIM-8** | Deterministic Seeded Replay | Identical scenario parameters and PRNG seeds must yield bitwise identical execution plans. | Cryptographically seeded pseudo-random generator with monotonic sequence numbering. |
| **INV-SIM-9** | Snapshot Immutability | A `SimulationSnapshot` must be cryptographically hashed and immutable once captured. | Deep-copy cloning on read; SHA-256 fingerprint validation (`CalculateVersion`) on every access. |
| **INV-SIM-10**| Stale Plan Execution Gate | A simulated plan cannot be converted to live execution without re-verifying real-time state. | `ExecutionGate.VerifyPlanFreshness` rejects plans where reality has diverged (`SIMULATION OUTDATED`). |
| **INV-SIM-11**| Monotonic Budget Ceiling | Simulation spend can never exceed the scenario or swarm budget ceiling. | Pre-execution budget assertion rejects any plan step where cumulative cost exceeds budget. |
| **INV-SIM-12**| Hard Invariant Inheritance | Hard-deny constitutional rules can never be bypassed or relaxed in simulation mode. | Policy engine enforces global hard denies regardless of simulation flags or permissive parameters. |
| **INV-SIM-13**| Adversarial Injection Isolation | Injected failures (timeouts, corrupt data, quote expiries) remain confined to the simulated context. | Fault injector operates inside a sandboxed step interceptor; no live service faults are generated. |
| **INV-SIM-14**| Worst-Case Exposure Bound | Worst-case exposure must account for maximum unrefunded failure costs and retry overhead. | Formal worst-case exposure algorithm calculates `UpperCost = ProjectedSpend + ContingencyReserve`. |
| **INV-SIM-15**| Cryptographic Audit Trail | Every simulated step, decision, and injected failure must produce a cryptographically verifiable trace. | `SimulationTraceEvent` logs monotonic sequence numbers, timestamps, and SHA-256 state fingerprints. |

---

## Verification & Automated Testing

All 15 invariants are verified using dedicated automated security tests in `services/gateway/internal/simulation/simulation_security_test.go`.

### Execution Command
```bash
go test -v -run TestSimulationSecurityInvariants ./internal/simulation/...
```

### Invariant Test Summary
- **Zero On-Chain Write Assertion:** Tests verify that mock transaction handlers intercept all transaction dispatches and assert zero network socket writes.
- **Digital Twin Snapshot Isolation:** Tests assert that modifying a running simulation's state leaves the source baseline snapshot's SHA-256 hash bit-for-bit identical.
- **Staleness Rejection:** Tests induce budget drift and policy updates, asserting that `ExecutionGate` halts execution with `SIMULATION OUTDATED`.
- **Memory & Concurrency Bounds:** Phase 29 tests execute 100 concurrent simulations in parallel, ensuring no race conditions or cross-run memory leaks.
