# AgentPay Multi-Agent Swarm Security Boundaries

## 1. Threat Model & Guarantees

In multi-agent swarms, the attack surface expands because agents dynamically create sub-contracts, hire other agents, negotiate pricing, and pass intermediate payloads. Without formal invariants, a compromised agent could:
- Drain the parent organization's treasury through unbounded subcontracts.
- Forge fake completion proofs.
- Execute recursive hire loops ($A \to B \to A$) until funds are exhausted.
- Substitute unauthorized recipient addresses.
- Collude with malicious critics or verifiers.

AgentPay resolves this by introducing **8 Invariant Security Boundaries (INV-S1 through INV-S8)**.

---

## 2. The 8 Swarm Invariants

### INV-S1: Zero Authority for Swarm & Orchestrator Agents
> **Invariant**: No agent, worker, or orchestrator in a swarm ever holds private keys, signs on-chain transactions, or calls the `AgentVault` contract directly.
- All inter-agent payments must flow through the canonical:
  $$\text{Task Subcontract} \to \text{PaymentIntent} \to \text{Policy Engine (Rust)} \to \text{Treasury} \to \text{Signer} \to \text{AgentVault} \to \text{Arc}$$
- Attempting to pass raw calldata or direct contract calls returns a hard `DENY`.

### INV-S2: Strict DAG Acyclicity
> **Invariant**: No swarm plan may contain directed cycles, self-dependencies, or recursive loops.
- Kahn's algorithm validates acyclicity at creation, simulation, and replan time.
- Any attempt to inject an edge $(u, v)$ where $v$ reaches $u$ is rejected with `ERR_GRAPH_CYCLE_DETECTED`.

### INV-S3: Bounded Swarm Hierarchy
> **Invariant**: Swarm execution tree depth is hard-capped at 4 levels (Depth 0 to 3). Total task count is hard-capped at 20 tasks.
- Prevents exponential agent explosion and unbounded resource drain.

### INV-S4: Atomic Concurrent Budget Reservations
> **Invariant**: At all moments in time, the sum of committed spend plus active reservations across all tasks cannot exceed the swarm's immutable maximum budget:
$$\sum_{i} \text{CommittedSpend}_i + \sum_{j} \text{ActiveReservation}_j \le \text{SwarmMaxBudget}$$
- Implemented with atomic concurrency locks (`sync.Mutex`), completely safe against 100+ concurrent workers racing for remaining budget.

### INV-S5: Cryptographic Result Checksum Chaining
> **Invariant**: All intermediate task outputs must carry a SHA-256 cryptographic checksum verified before consumption by downstream dependent tasks.
- If an agent tampers with an output payload after submission, downstream validation detects the checksum mismatch and rejects the result with `ERR_TAMPERED_OUTPUT`.

### INV-S6: Strict Cross-Tenant Isolation
> **Invariant**: Tasks within a swarm can only hire and interact with agents registered under the same tenant organization, unless explicitly signed off by a multi-tenant peering policy.
- Prevents cross-organization agent impersonation or data exfiltration.

### INV-S7: Anti-Collusion Multi-Agent Consensus
> **Invariant**: Consensus validation for high-stakes deliverables requires a quorum of $N \ge 3$ independent verifier agents.
- Verifier agents cannot share ownership or identity with the executing agent or critic.
- Discrepancies trigger automatic escalation to human approval.

### INV-S8: Deterministic Adaptive Replanning
> **Invariant**: When a task fails or times out, the Replanning Engine may only substitute alternative counterparties within the existing authorized task budget ceiling.
- Replanning cannot escalate budget or bypass policy checks without explicit human sign-off.
