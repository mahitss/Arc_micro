# AgentPay Control Tower Security Architecture & Invariants

## Formal Security Invariants: INV-86 through INV-100

| Invariant | Title | Description | Enforcement Point |
|---|---|---|---|
| **INV-86** | Non-Authoritative Read Models | Control Tower projections are strictly read-only and never authoritative sources of financial truth. | `internal/control/invariants.go` |
| **INV-87** | Zero UI Financial Authority | Frontend UI clients can never authorize payment movements or trigger on-chain transfers directly. | `internal/control/invariants.go` |
| **INV-88** | No Arbitrary Blockchain Recipients | Frontend cannot specify arbitrary recipient addresses; recipients must be allowlisted or contract-bound. | `internal/control/invariants.go` |
| **INV-89** | Inviolable Policy Engine | UI operator requests cannot bypass the Rust policy engine or Constitution limits. | Gateway Execution Gate |
| **INV-90** | Inviolable Approval Gate | Payment intents requiring human authorization cannot proceed to execution without explicit approval. | Gateway State Machine |
| **INV-91** | Mandatory Treasury Reservation | No payment execution can proceed without an active pre-encumbered treasury reservation under mutex lock. | Treasury Orchestrator |
| **INV-92** | Strict Simulation Separation | Simulated events, twin models, and dry-runs can never appear as verified blockchain settlements. | Control Tower Models |
| **INV-93** | Stale Data Warning | Financial data older than 30 seconds must be visibly flagged as STALE. Unreachable data must show UNAVAILABLE. | UI Components |
| **INV-94** | Strict Tenant Isolation | Control Tower queries and commands are tenant-scoped. Cross-tenant leakage is strictly blocked. | Gateway Middleware |
| **INV-95** | Server-Side RBAC Enforcement | All operator actions require server-side cryptographic authentication and role checks. | Gateway Auth |
| **INV-96** | Command Idempotency | All destructive or financial operator commands require a non-empty idempotency key. | Gateway Handlers |
| **INV-97** | Hard DENY Inviolability | If an action receives a hard DENY decision, the Approval Center must strictly disable or omit the approve option. | Approval Center UI & API |
| **INV-98** | Cryptographic Settlement Truth | A displayed transaction hash must correspond to verified on-chain evidence with 66-character hex format. | Arc Status Engine |
| **INV-99** | Pure Read Model Mutex | Read model endpoints cannot mutate database state, treasury balances, or blockchain vaults. | Control Service |
| **INV-100** | Zero Authority Aggregation | Control Tower aggregations and AI recommendations cannot synthesize financial authority. | Control Service |

---

## 2. Threat Modeling & Defenses

### 2.1 IDOR and Multi-Tenant Leakage
Every query (`/v1/control/...`) requires tenant context (`organization_id`). Cross-tenant access is rejected at both the middleware layer and the repository boundary (`INV-94`).

### 2.2 Replay and Command Duplication
Destructive commands (kill switch activation, approval resolution, netting execution) require client-provided idempotency keys (`INV-96`). Duplicate submissions return the cached canonical result without re-executing.

### 2.3 Separation of Approval Duty
A requester agent or user cannot approve their own financial request. The Approval Center validates that `approver_id != requester_agent_id`.
