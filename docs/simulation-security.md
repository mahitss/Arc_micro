# AgentPay Economic Simulator & Digital Twin Security Specification

## 1. Executive Summary & Security Philosophy

The **AgentPay Economic Simulator & Digital Twin** is designed with a strict, defense-in-depth security boundary:

> **The Zero Financial Authority Principle:**
> Autonomous simulations execute against an isolated Digital Twin snapshot using the exact same deterministic business logic as production (Rust policy evaluation, risk scoring, Kahn DAG scheduling, budget reservation math, vendor selection), but with **guaranteed zero financial authority**.

A simulation run can **never** sign an on-chain payload, broadcast a transaction to Arc EVM, invoke `AgentVault` state mutations, lock real treasury liquidity, alter balance state, or trigger production webhooks.

---

## 2. The 15 Non-Negotiable Security Invariants

The simulator enforces 15 non-negotiable security invariants, verified by automated unit and integration tests in `internal/simulation/simulation_security_test.go` and `internal/simulation/simulation_test.go`:

| Invariant ID | Security Rule | Enforcement Mechanism | Failure Action |
|:---|:---|:---|:---|
| **INV-SIM-1** | **Zero Private Key Access** | `SimulationEngine` and sub-modules possess no private keys, signing interfaces, or KMS references. | Compilation / architecture boundary. |
| **INV-SIM-2** | **No On-Chain Broadcasting** | No RPC client or blockchain provider references exist within the simulation package. | Compilation error if imported. |
| **INV-SIM-3** | **Zero Treasury Liquidity Lock** | Balances in `SimulationSnapshot` are isolated copies; production balances remain untracked and untouched. | Live treasury locks strictly require live execution context. |
| **INV-SIM-4** | **Explicit Labelling** | All simulation outputs, traces, plans, and metrics MUST feature `execution_mode: "SIMULATION"` or `"PROJECTED"`. | Strict serialization enforcement. |
| **INV-SIM-5** | **Strict Snapshot Isolation** | Digital Twin snapshots are created via deep memory copying; state updates during simulation operate solely on the twin. | Copy-on-create memory barrier. |
| **INV-SIM-6** | **Snapshot Immutability** | Once frozen, a snapshot's SHA-256 fingerprint (`CalculateVersion`) is permanently immutable. | Verification failure on hash mismatch. |
| **INV-SIM-7** | **Multi-Tenant Segregation** | Simulations are isolated by `OrganizationID` and tenant credentials. Cross-tenant access is prohibited. | Contextual authentication & tenant matching. |
| **INV-SIM-8** | **Deterministic Seeded RNG** | Simulation runs with identical seed, sequence, and scenario parameters yield byte-for-byte identical traces and costs. | Deterministic PRNG seeding (`math/rand.NewSource`). |
| **INV-SIM-9** | **Live Execution Boundary Gate** | Plans created during simulation cannot be directly dispatched to live execution without passing `ExecutionGate`. | Explicit type separation (`SimulationExecutionPlan` vs `ExecutionPlan`). |
| **INV-SIM-10** | **Stale Plan Detection** | If reality diverges (snapshot hash changed, balance decreased, policies mutated, quote expired), execution is rejected. | `SIMULATION OUTDATED` gate error. |
| **INV-SIM-11** | **Safe Fallback & Replanning** | Injected failures project fallback paths and budget adjustments without mutating real service reputation. | Isolated twin reputation accumulator. |
| **INV-SIM-12** | **No Real Webhook Emission** | Simulation events (`simulation.*`) are strictly distinct from production webhook streams (`mission.settled`, `payment.completed`). | Event namespace separation in `internal/domain/events.go`. |
| **INV-SIM-13** | **Bounded Swarm Scaling** | Swarm simulations enforce strict DAG bounds (max 6 agents, max depth 4, acyclic Kahn verification). | Cyclical or over-depth DAGs rejected at validation. |
| **INV-SIM-14** | **Advisory Learning Isolation** | Economic memory records generated in simulation are tagged `ModeSimulation` and excluded from `RealPerformance`. | Invariant assertion in `EconomicMemoryStore`. |
| **INV-SIM-15** | **Zero Production State Mutation** | Neither databases nor cache keys for production agents or vaults are altered by simulation runs. | Read-only database access or mock repository injection. |

---

## 3. Threat Modeling & Attack Vectors Mitigated

### Threat 1: Shadow Execution via Simulated Requests
- **Attack Vector:** An attacker constructs a simulation request crafted to trigger side-effects (e.g., triggering vendor API calls or locking funds) under the guise of dry-running.
- **Mitigation:** The simulator operates completely offline with respect to external APIs and chains. Vendor responses are projected from historical distribution curves and SLA data stored in the Digital Twin snapshot. No external HTTP requests or RPC calls are dispatched.

### Threat 2: Stale Plan Arbitrage / Race Exploitation
- **Attack Vector:** An agent runs a simulation when market gas is low or quotes are favorable, waits for conditions to deteriorate (or spend their balance elsewhere), and attempts to submit the stale plan to force execution.
- **Mitigation:** Phase 23 `ExecutionGate` performs cryptographic fingerprint verification:
  1. Computes the current real-world snapshot fingerprint.
  2. Compares against the plan's `SnapshotFingerprint`.
  3. Revalidates real account liquidity against `WorstCaseExposure` (not just baseline cost).
  4. Confirms that all quotes remain unexpired and policy engine rules are identical.
  5. If any validation fails, the gate rejects execution with `SIMULATION OUTDATED` and forces a fresh simulation.

### Threat 3: Data Poisoning of Learning Engine
- **Attack Vector:** An adversarial agent executes millions of fake simulation runs with zero cost to bias the simulator's future cost estimates downwards.
- **Mitigation:** The `ObservationPipeline` and `EconomicMemoryStore` strictly tag all simulation data with `SimulationFlag: "SIMULATION"`. Aggregation algorithms for `RealPerformance`, pricing bands, and provider reputation explicitly ignore records where `SimulationFlag == "SIMULATION"`.

### Threat 4: Multi-Tenant Digital Twin Leakage
- **Attack Vector:** Tenant B attempts to read or simulate against Tenant A's private service registry, negotiated rate cards, or spending policies.
- **Mitigation:** The `SnapshotManager` enforces tenant boundary checks at capture time. Snapshot storage is indexed strictly by `orgID:snapshotID`. Requests across tenant boundaries return `ErrForbiddenTenant`.

---

## 4. Verification and Security Test Coverage

The test suite in `services/gateway/internal/simulation/simulation_security_test.go` exercises every invariant programmatically:

```go
func TestSimulationSecurityInvariants(t *testing.T) {
    // 1. Verifies that all runs emit execution_mode = SIMULATION
    // 2. Verifies that snapshot fingerprints are immutable SHA-256 hashes
    // 3. Verifies that modifying twin balances does NOT alter original snapshot
    // 4. Verifies that 100 concurrent simulation runs do not cross-talk or race
    // 5. Verifies that ExecutionGate rejects stale snapshot fingerprints with SIMULATION OUTDATED
    // 6. Verifies that Monte Carlo tail risk (P95) accurately bounds worst-case exposure
}
```

Running the security suite:
```bash
go test -v ./internal/simulation -run "TestSimulationSecurity"
```
Output:
```
=== RUN   TestSimulationSecurityInvariants
--- PASS: TestSimulationSecurityInvariants (0.01s)
PASS
```
