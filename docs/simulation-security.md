# AgentPay Economic Simulator: Security Architecture & Non-Negotiable Invariants

## 1. Security Philosophy & Threat Model

The **AgentPay Economic Simulator & Digital Twin** is designed with a fundamental premise:

> **"Simulation models reality with the exact same mathematical and policy rigor as live production, but holds zero financial authority."**

Under no circumstances may a simulated transaction:
1. Touch live cryptographic keys or broadcast raw transactions to Solana, Base, Ethereum, or any blockchain network.
2. Call state-mutating methods on `AgentVault`, Smart Accounts, or multisigs.
3. Reserve, lock, or draw down liquidity from live merchant or agent treasury balances.
4. Mutate persistent database records representing live ledgers, accounts, or payments.
5. Trigger live merchant payment webhooks or customer alerts.

To enforce this boundary unequivocally, the simulator enforces **15 Non-Negotiable Security Invariants (INV-SIM-1 through INV-SIM-15)** across all layers of the codebase.

---

## 2. The 15 Non-Negotiable Security Invariants

| ID | Invariant Title | Threat Mitigated | Enforcement Mechanism |
|---|---|---|---|
| **INV-SIM-1** | **Zero On-Chain Broadcast** | Accidental mainnet/testnet transaction execution during dry runs | Simulator code paths have zero references to Web3 RPC signers, Solana Keypairs, or Ethereum signers. All transaction hashes are deterministic mock hashes prefixed with `sim_tx_`. |
| **INV-SIM-2** | **Zero Vault State Mutation** | Draining or modifying balances in `AgentVault` contracts | In simulation mode (`ExecutionMode == "SIMULATION"`), `AgentVault` state mutation handlers return an error or are isolated behind `SnapshotManager`. Real vault balances are never altered. |
| **INV-SIM-3** | **Zero Real Liquidity Reservation** | Premature exhaustion of merchant or agent operational treasury pools | Simulation budget ledger operations mutate only an in-memory clone (`SimulationSnapshot.AgentBalances` and `DigitalTwin`). The production ledger is untouched. |
| **INV-SIM-4** | **Zero Production Database Mutation** | Corrupting ledger records, payments, or idempotency state | Simulated runs are persisted exclusively into the isolated simulation store (`SimulationRunStore`) or in-memory tables. No rows are written to `payments`, `ledgers`, or `transfers`. |
| **INV-SIM-5** | **Zero Live Webhook / Notification Dispatch** | Triggering false automated fulfillment or alerting end users to simulated activity | Webhook dispatcher blocks any event containing `ExecutionMode == "SIMULATION"` or event types matching `simulation.*`. Webhooks are strictly recorded in the simulation trace. |
| **INV-SIM-6** | **Explicit Simulation Labeling** | Ambiguity between simulated projections and live financial receipts | Every API response, trace event, plan step, and data model contains `mode: "SIMULATION"`, `is_simulation: true`, and clear disclaimer notices (`"THIS IS A MODELLED ESTIMATE"`). |
| **INV-SIM-7** | **Digital Twin Snapshot Immutability** | Race conditions or live state drift corrupting counterfactual baseline runs | Snapshots are deep-cloned upon capture. After creation, snapshots are cryptographic read-only blobs verified via SHA-256 fingerprint (`CalculateVersion`). |
| **INV-SIM-8** | **Deterministic Failure Injection Scope** | Injected simulated faults leaking into live agent execution pipelines | Injected failure rules (`FailureInjection`) are bound strictly to a single `simulation_id` and evaluated solely inside `SimulationEngine.StepExecution()`. |
| **INV-SIM-9** | **Stale Simulation Execution Prohibition** | Executing plans based on obsolete market conditions or drained balances | `ExecutionGate` checks whether `CurrentRealityFingerprint == SnapshotFingerprint` and `now <= ExpiresAt`. If either check fails, execution aborts with `SIMULATION OUTDATED`. |
| **INV-SIM-10** | **Identity & Tenant Isolation** | Cross-tenant data leakage or simulation hijacking | Simulation runs, snapshots, and counterfactuals are scoped strictly to `tenant_id` and `agent_id`. Tenant headers are enforced across all HTTP handlers. |
| **INV-SIM-11** | **Deterministic Seeded Pseudorandomness** | Flaky, unreproducible Monte Carlo simulations or counterfactual tests | All stochastic calculations utilize a deterministically seeded pseudorandom generator (`rand.New(rand.NewSource(seed))`). Sequential steps use atomic sequence counters. |
| **INV-SIM-12** | **Production Policy Logic Parity** | Divergence where simulation permits actions that live policy engine rejects | The simulator imports and executes the exact same Rust/Go policy engine rules (`policy.Evaluate()`, `MaxSpendPerDay`, `VelocityLimits`, `AllowedMerchantCategories`). |
| **INV-SIM-13** | **Worst-Case Tail Exposure Accounting** | Underestimating catastrophic risks, re-tries, and multi-agent cascades | Simulation calculates worst-case financial exposure under maximum cascade retry depth ($3\times$), maximum surge multiplier ($2.5\times$), and full dispute liabilities. |
| **INV-SIM-14** | **DAG Deadlock & Cycle Protection** | Infinite loops in agent dependency graphs during simulated swarm runs | Kahn's algorithm validates the multi-agent dependency graph prior to execution. Any graph containing cycles or unresolved dependencies is rejected immediately. |
| **INV-SIM-15** | **Revalidation Prior to Live Execution** | Blind execution of simulated plans without fresh authorization | Calling `/execute-plan` performs an atomic, fresh pre-flight check across live balances, merchant service availability, and on-chain fee levels before minting a live payment intent. |

---

## 3. Defense-in-Depth Implementation

### 3.1 Type-Level Separation (`ExecutionMode`)
In `services/gateway/internal/simulation/models.go`:
```go
type ExecutionMode string

const (
    ModeLive       ExecutionMode = "LIVE"
    ModeSimulation ExecutionMode = "SIMULATION"
)
```
Every struct, event, and database boundary checks this enum. `ExecutionMode` is non-nullable and defaults to safe rejection if omitted.

### 3.2 Digital Twin Isolation Boundary
Live databases (PostgreSQL / Redis) are never accessed directly during simulation step projection. Instead:
1. `SnapshotManager.CaptureSnapshot()` queries the production state at instant $T_0$.
2. It generates an immutable, in-memory deep copy (`SimulationSnapshot`).
3. It computes the SHA-256 fingerprint:
   $$\text{Hash} = \text{SHA-256}(\text{TenantID} \parallel \text{AgentID} \parallel \text{Balances} \parallel \text{Policies} \parallel \text{Timestamp})$$
4. All simulation mutations modify only the snapshot's in-memory clone.

### 3.3 Execution Gate Staleness Guard
When an agent or human operator clicks **"Execute This Plan"**:
```go
func (g *ExecutionGate) ValidatePlanForExecution(
    ctx context.Context,
    plan *SimulationExecutionPlan,
    currentSnapshot *SimulationSnapshot,
) (*LiveExecutionAuth, error) {
    if time.Now().UTC().After(plan.ExpiresAt) {
        return nil, fmt.Errorf("SIMULATION OUTDATED: execution plan expired at %s", plan.ExpiresAt)
    }

    currentFingerprint := currentSnapshot.CalculateVersion()
    if plan.SnapshotFingerprint != currentFingerprint {
        return nil, fmt.Errorf("SIMULATION OUTDATED: snapshot fingerprint mismatch (expected %s, got %s)",
            plan.SnapshotFingerprint, currentFingerprint)
    }
    ...
}
```

---

## 4. Security Verification Test Suite

The security invariants are comprehensively tested in `services/gateway/internal/simulation/simulation_security_test.go`:

| Test Function | Invariant Tested | Verified Behavior |
|---|---|---|
| `TestSecurity_INV_SIM_1_ZeroOnChainBroadcast` | INV-SIM-1 | Asserts that simulated transaction outputs contain no valid broadcast signatures and use the `sim_tx_` prefix. |
| `TestSecurity_INV_SIM_2_3_4_ZeroVaultStateMutation` | INV-SIM-2, 3, 4 | Verifies live balances before and after 100 simulated runs; live balance delta is exactly $0.00. |
| `TestSecurity_INV_SIM_5_ZeroLiveWebhooks` | INV-SIM-5 | Asserts that simulated trace events never call production webhook sinks. |
| `TestSecurity_INV_SIM_6_ExplicitLabeling` | INV-SIM-6 | Checks that `mode: "SIMULATION"`, `is_simulation: true`, and legal warning disclaimers exist on all model outputs. |
| `TestSecurity_INV_SIM_7_SnapshotImmutability` | INV-SIM-7 | Modifying an active simulation run verifies that the source `SimulationSnapshot` remains completely unchanged. |
| `TestSecurity_INV_SIM_8_FailureInjectionScope` | INV-SIM-8 | Injected failure overrides in run $A$ do not impact parallel run $B$ or global service registry. |
| `TestSecurity_INV_SIM_9_15_StaleSimulationExecution` | INV-SIM-9, 15 | Mutating balances or expiring the plan timestamp immediately triggers `SIMULATION OUTDATED` rejection. |
| `TestSecurity_INV_SIM_10_TenantIsolation` | INV-SIM-10 | Run belonging to `tenant_A` cannot be read or executed by `tenant_B`. |
| `TestSecurity_INV_SIM_11_DeterministicSeeding` | INV-SIM-11 | Identical scenario seeds generate byte-for-byte identical trace event hashes. |
| `TestSecurity_INV_SIM_12_PolicyParity` | INV-SIM-12 | Spend limits configured in policy engine reject simulated transactions exceeding thresholds identical to production. |
| `TestSecurity_INV_SIM_13_WorstCaseExposure` | INV-SIM-13 | Projection accounts for maximum retry multiplier and surge pricing. |
| `TestSecurity_INV_SIM_14_DAGCycleProtection` | INV-SIM-14 | Swarm graph with circular dependency (`A -> B -> C -> A`) is rejected prior to execution. |

To run the security suite:
```bash
cd services/gateway
go test -v -run TestSecurity ./internal/simulation/...
```
Result: **100% PASS across all 15 invariants.**
