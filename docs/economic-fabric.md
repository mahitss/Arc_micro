# AgentPay Economic Fabric Specification

## 1. Overview & Purpose

The **Economic Fabric** is the thin, top-level integration layer of AgentPay. Its responsibility is **not** to own domain state, duplicate existing engines, or hold financial authority. Its sole responsibility is to **synthesize and coordinate** the domain engines created across Tasks 1–14:

- **MissionEngine & Swarms**: Multi-agent task graphs and coordination.
- **Durable Runtime & Operations OS**: Worker leases, checkpoints, and failure recovery.
- **Rust Policy & Risk Engine**: Deterministic policy evaluation and risk scoring.
- **Treasury & Clearinghouse**: Solvency checks, liquidity reservations, and netting.
- **PaymentIntent Pipeline & AgentVault**: Keyless execution on Arc blockchain (Chain ID 5042).
- **Economic Intelligence & Simulator**: Digital twin simulation and causal memory.

---

## 2. Non-Duplication Architecture

Per Section 0 of Task 15, the Economic Fabric strictly delegates to authoritative subsystems:

```
EconomicFabric
│
├── Mission               ──> Delegates to internal/mission (MissionEngine)
├── Durable Workflows     ──> Delegates to internal/runtime (DurableRuntime)
├── Operations OS         ──> Delegates to internal/operations (OperationsSupervisor)
├── Policy & Risk         ──> Delegates to Rust PolicyEngine via HTTP/IPC
├── Approvals             ──> Delegates to internal/approvals
├── Treasury              ──> Delegates to internal/treasury (TreasuryLedger)
├── Clearinghouse         ──> Delegates to internal/clearinghouse
├── PaymentIntents        ──> Delegates to internal/intents
├── Execution & Vault     ──> Delegates to internal/signer & Solidity AgentVault
└── Intelligence & Memory ──> Delegates to internal/intelligence & economic_memory
```

---

## 3. Machine-Checked Security Invariants (INV-141 to INV-160)

| Invariant | Name | Guarantee | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **INV-141** | Fabric Financial Scope | Fabric coordination cannot authorize payments | `ValidateFabricPaymentAuthority` rejects non-treasury execution |
| **INV-142** | Compiler Authority | Compiler cannot grant financial authority | `ObjectiveCompiler` emits unapproved financial blueprints |
| **INV-143** | Blueprint Budget Limit | Blueprints cannot exceed objective budget | `BlueprintValidator` blocks budget elevation |
| **INV-144** | Simulation Freshness | Stale simulations cannot execute | Hash mismatch against current policy triggers `STALE_SIMULATION` |
| **INV-145** | Replan Policy Integrity | Replanning cannot weaken policy | `ControlledReplanner` checks policy diff against original |
| **INV-146** | Provider Substitution | Substitute providers must satisfy policy | Policy re-evaluated on substitute candidate |
| **INV-147** | Agent Substitution | Substitute agents must satisfy policy | Capability and trust score verified before assignment |
| **INV-148** | Envelope Ceiling | Economic envelopes cannot self-increase | Invariant check blocks runtime envelope expansion |
| **INV-149** | Risk Ceiling | Risk envelope cannot weaken Constitution | Maximum risk score bounded by constitutional hard cap |
| **INV-150** | Operational Boundaries | Operational compute grants zero treasury rights | Worker compute allocations strictly segregated from funds |
| **INV-151** | Learning Boundaries | Learning emits recommendations, not authority | Economic memory cannot mutate policy or approval rules |
| **INV-152** | State Segregation | Fabric state cannot overwrite financial state | Objective `RUNNING` does not override Payment `PENDING` |
| **INV-153** | Financial Truth | Treasury and clearinghouse remain authoritative | Single financial ledger of record |
| **INV-154** | Read Model Isolation | Read models cannot mutate financial truth | CQRS read replicas lack write connection strings |
| **INV-155** | Dry-Run Isolation | `--dry-run` commands never mutate database | Transactions aborted / read-only simulation path |
| **INV-156** | Simulation Broadcast | Simulation mode cannot broadcast on-chain | Zero RPC broadcast calls in `SIMULATION` mode |
| **INV-157** | Live Mode Authority | Live execution requires current approval | Unapproved live requests rejected before dispatch |
| **INV-158** | Approval Expiration | Expired approvals cannot execute | Timestamp freshness checked before payment execution |
| **INV-159** | Policy Invalidation | Changed policy invalidates stale authorization | Hash comparison forces re-evaluation |
| **INV-160** | Blockchain Truth | Unverified Arc evidence cannot be presented as verified | UI and API report `NOT VERIFIED` until confirmed |

---

## 4. API Endpoints

The fabric exposes RESTful endpoints under `/v1/fabric/...` and `/api/fabric/...`:

- `POST /v1/fabric/objectives`: Create new economic objective.
- `GET /v1/fabric/objectives/:id`: Retrieve objective with constraints and envelopes.
- `GET /v1/fabric/objectives`: List objectives with status and tenant filters.
- `POST /v1/fabric/objectives/:id/plan`: Compile execution blueprint (`--dry-run` supported).
- `POST /v1/fabric/objectives/:id/simulate`: Run deterministic pre-execution simulation.
- `POST /v1/fabric/objectives/:id/start`: Dispatch blueprint to durable runtime.
- `POST /v1/fabric/objectives/:id/pause`: Pause active workflows safely.
- `POST /v1/fabric/objectives/:id/resume`: Resume paused objective.
- `POST /v1/fabric/objectives/:id/replan`: Execute bounded replan (max 3 replans).
- `POST /v1/fabric/objectives/:id/cancel`: Cancel objective safely without leaking funds.
- `GET /v1/fabric/objectives/:id/trace`: Retrieve 18-stage end-to-end causal trace.
- `GET /v1/fabric/objectives/:id/why`: "Why This?" provider selection explainability.
- `GET /v1/fabric/objectives/:id/why-not`: "Why Not?" blocked action inspector.
- `GET /v1/fabric/objectives/:id/state`: Synchronized fabric vs financial source-of-truth state.
- `GET /v1/fabric/metrics`: Autonomous telemetry metrics.
