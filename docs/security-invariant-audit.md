# AgentPay Security Invariant Audit: Machine-Checked Assertions

**Auditor:** Principal Release & Security Auditor (Final Audit — Task 22)  
**Target Repository:** `github.com/arc-agentpay/agentpay`  
**Git Commit:** `ab7be45678a61592ed0de10666b12df20071f185`  
**Date:** September 25, 2026  

---

## 1. Executive Summary

This document audits the **30 Non-Negotiable Security Invariants** governing the AgentPay Autonomous Financial Execution Fabric. In accordance with **Rule Zero**, an invariant is verified ONLY if:
1. It is backed by concrete code logic in the gateway, runtime, or smart contracts.
2. It is verified by an automated machine-checked test that asserts the invariant fails closed under attack or mutation.

---

## 2. Invariant Verification Table

| ID | Description | Source File | Test File & Function | Enforcement Layer | Verified? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **INV-1** | AI agent cannot sign transactions or hold private keys | `services/gateway/internal/adversarial/invariants.go` | `authority_boundary_test.go:Rule 1: AI cannot sign` & `adversarial/invariants.go:CheckInvariant1` | Gateway Signer Boundary / Process Isolation | **VERIFIED** |
| **INV-2** | AI agent cannot choose arbitrary settlement recipient (server-controlled registry) | `services/gateway/internal/intent/service.go` | `authority_boundary_test.go:Rule 2` & `day9_production_security_test.go:TestDay9_ServerControlledRecipient` | Gateway Service Registry Lookup | **VERIFIED** |
| **INV-3** | Deterministic hard policy `DENY` is inviolable and cannot be overridden by human approval | `services/gateway/internal/service/domain_service.go` | `authority_boundary_test.go:Rule 3 & 6` & `domain_service_test.go:TestRecordApproval_CannotApproveDenied` | Domain Service State Machine Transition Gate | **VERIFIED** |
| **INV-4** | Zero self-approval: Requesting agent cannot approve its own payment intent | `services/gateway/internal/service/domain_service.go` | `authority_boundary_test.go:Rule 5` & `adversarial/invariants.go:CheckInvariant4` | Domain Service Approval Handler (`agent_id != approver_id`) | **VERIFIED** |
| **INV-5** | Cross-tenant resources, intents, and workflows are strictly isolated | `services/gateway/internal/storage/` & `internal/runtime/service.go` | `authority_boundary_test.go:Rule 21` & `adversarial/invariants.go:CheckInvariant5` | Multi-Tenant Data Store Row Isolation & Runtime Tenant Gate | **VERIFIED** |
| **INV-6** | Idempotent execution: Duplicate payment intent requests cannot settle twice | `services/gateway/internal/intent/service.go` | `authority_boundary_test.go:Rule 19` & `concurrency_test.go:TestIdempotentExecution` | Gateway Request Hash / Nonce Deduplication | **VERIFIED** |
| **INV-7** | Treasury spending caps and daily velocity limits strictly enforced | `services/gateway/internal/treasury/orchestrator.go` | `authority_boundary_test.go:Rule 10` & `concurrency_limit_test.go:TestConcurrencyLimit` | Treasury Orchestrator Balance Check | **VERIFIED** |
| **INV-8** | Policy engine fails closed (`DENY`) on network timeout or malformed response | `services/gateway/internal/policy/client.go` | `authority_boundary_test.go:Rule 3` & `failure_injection_test.go:TestPolicyEngineFailure` | Gateway Policy Client Timeout Handler | **VERIFIED** |
| **INV-9** | Signer failure safety: Signer fault halts pipeline without fund exposure | `services/gateway/internal/signer/local.go` | `authority_boundary_test.go:Rule 24-26` & `signer_test.go:TestLocalSigner_BindingVerification` | Cryptographic Signer Boundary | **VERIFIED** |
| **INV-10** | Simulation mode can NEVER broadcast transactions to the live blockchain | `services/gateway/internal/simulation/execution_gate.go` | `authority_boundary_test.go:Rule 7` & `simulation_security_test.go:TestPhase28_SecurityInvariants` | Simulation Air-Gap Execution Gate (`AssertLiveAllowed`) | **VERIFIED** |
| **INV-11** | Ambiguous blockchain transaction receipts route to reconciliation, never blindly rebroadcast | `services/gateway/internal/clearinghouse/reconciliation.go` | `authority_boundary_test.go:Rule 20` & `adversarial/invariants.go:CheckInvariant11` | Blockchain Client Reconciliation Worker | **VERIFIED** |
| **INV-12** | Append-only immutability for financial event ledgers and audit trails | `services/gateway/internal/storage/` | `authority_boundary_test.go:Rule 29` & `flight_recorder_test.go:TestFlightRecorderAudit` | PostgreSQL Append-Only Event Log | **VERIFIED** |
| **INV-13** | Runtime workflow recovery cannot create financial authority or un-deny intents | `services/gateway/internal/runtime/recovery.go` | `authority_boundary_test.go:Rule 13` & `runtime_test.go:TestRecoveryCannotElevate` | Runtime Orchestration Recovery Coordinator | **VERIFIED** |
| **INV-14** | Autonomous operations supervisors cannot modify financial policies or budgets | `services/gateway/internal/operations/invariants.go` | `authority_boundary_test.go:Rule 14` & `operations_test.go:TestOperationsAuthority` | Operations OS Supervisor Boundary | **VERIFIED** |
| **INV-15** | External protocol participants cannot acquire gateway administrative authority | `services/gateway/internal/network/service.go` | `authority_boundary_test.go:Rule 15` & `network_adversarial_test.go:TestRoleElevation` | Role-Based Access Control (RBAC) Gate | **VERIFIED** |
| **INV-16** | External agents cannot directly invoke AgentVault contract methods | `contracts/src/AgentVault.sol` | `authority_boundary_test.go:Rule 16` & `AgentVault.t.sol:test_UnauthorizedCallerReverts` | Solidity `onlyRelayer` Modifier | **VERIFIED** |
| **INV-17** | Stale pre-flight simulations (>5 min TTL) cannot authorize live payment dispatches | `services/gateway/internal/simulation/engine.go` | `authority_boundary_test.go:Rule 17` & `simulation_test.go:TestStaleSimulationExpired` | Simulation Cache Timestamp Validator | **VERIFIED** |
| **INV-18** | Stale policy versions fail closed; execution requires latest active policy hash | `services/gateway/internal/fabric/validator.go` | `authority_boundary_test.go:Rule 18` & `fabric_adversarial_test.go:TestPolicyHashMismatch` | Blueprint Validator Policy Hash Matcher | **VERIFIED** |
| **INV-19** | Hot relayer private key cannot be the owner/admin of AgentVault | `contracts/src/AgentVault.sol` & deployment config | `authority_boundary_test.go:Rule 22` & `AgentVault.t.sol:test_RelayerCannotTransferOwnership` | Smart Contract Role Separation (`owner != relayer`) | **VERIFIED** |
| **INV-20** | Unknown or un-allowlisted recipients cannot be funded by AgentVault | `contracts/src/AgentVault.sol` | `authority_boundary_test.go:Rule 23` & `AgentVault.t.sol:test_AllowlistRecipientEnforcement` | Smart Contract `isRecipientAllowed` Check | **VERIFIED** |
| **INV-21** | Signer enforces exact calldata binding (tampered calldata rejected) | `services/gateway/internal/signer/local.go` | `authority_boundary_test.go:Rule 24` & `signer_test.go:TestCalldataMismatchFails` | EIP-1559 Signer Binding Verifier (`bytes.Equal`) | **VERIFIED** |
| **INV-22** | Signer enforces exact chain ID binding (cross-chain replay strictly rejected) | `services/gateway/internal/signer/local.go` | `authority_boundary_test.go:Rule 25` & `signer_test.go:TestChainIDMismatchFails` | EIP-1559 Signer Chain ID Matcher | **VERIFIED** |
| **INV-23** | Signer rejects non-zero native gas token value on AgentVault transfer calls | `services/gateway/internal/signer/local.go` | `authority_boundary_test.go:Rule 26` & `signer_test.go:TestNonZeroNativeValueFails` | Transaction Value Sanitizer (`tx.Value() == 0`) | **VERIFIED** |
| **INV-24** | Emergency pause halts all financial transfers and execution dispatches | `contracts/src/AgentVault.sol` & gateway middleware | `authority_boundary_test.go:Rule 27` & `AgentVault.t.sol:test_PauseBlocksExecution` | OpenZeppelin `Pausable` & Gateway Circuit Breaker | **VERIFIED** |
| **INV-25** | Emergency killswitch remains authoritative over all autonomous workflows | `services/gateway/internal/control/service.go` | `authority_boundary_test.go:Rule 28` & `control_test.go:TestEmergencyKillswitch` | Central Control Tower Killswitch Coordinator | **VERIFIED** |
| **INV-26** | Worker crash during execution cannot duplicate financial reservations | `services/gateway/internal/storage/` | `authority_boundary_test.go:Rule 30` & `concurrency_test.go:TestWorkerCrashNoDuplication` | Database Unique Constraint on Intent Reservation | **VERIFIED** |
| **INV-71** | Expected inflows cannot be treated as available funds until on-chain verification | `services/gateway/internal/treasury/invariants.go` | `orchestrator_test.go:TestInflowNotAvailable` & `adversarial_test.go:Scenario 9` | Treasury Inflow Validator (`AssertExpectedInflowNotAvailable`) | **VERIFIED** |
| **INV-72** | Treasury reservations cannot exceed available liquidity | `services/gateway/internal/treasury/invariants.go` | `adversarial_test.go:Scenario 1` & `concurrency_test.go:TestReservationOversubscription` | Atomic Reservation Math (`AssertReservationWithinAvailable`) | **VERIFIED** |
| **INV-75** | Recurring obligations cannot reserve infinite funds (bounded time horizons) | `services/gateway/internal/treasury/invariants.go` | `adversarial_test.go:Scenario 6` & `treasury_test.go:TestRecurringBounds` | Recurring Budget Ceiling Validator | **VERIFIED** |
| **INV-101** | Stale worker cannot commit state after lease fencing token mismatch | `services/gateway/internal/runtime/invariants.go` | `runtime_test.go:TestFencingTokenRejection` & `runtime/adversarial_test.go` | Distributed Lease Fencing Token Verifier | **VERIFIED** |
| **INV-103** | Workflow retry cannot bypass deterministic policy `HARD_DENY` | `services/gateway/internal/runtime/retry.go` | `runtime_test.go:TestCase3_PolicyHashChange` & `invariants.go:CheckPolicyDenyRetry` | Runtime Retry Classifier Barrier | **VERIFIED** |
| **INV-146** | Autonomous provider substitution cannot bypass policy allowlists | `services/gateway/internal/fabric/replanning.go` | `fabric/adversarial_test.go:TestProviderSubstitutionPolicyBypass` | Autonomous Replanning Policy Gate | **VERIFIED** |
| **INV-148** | `EconomicEnvelope` spending ceilings cannot self-increase at runtime | `services/gateway/internal/fabric/invariants.go` | `fabric/adversarial_test.go:TestEconomicEnvelopeSelfIncrease` | Envelope Budget Immutable Ceiling Assertion | **VERIFIED** |
| **INV-156** | Pre-flight counterfactual simulation cannot broadcast on-chain transactions | `services/gateway/internal/fabric/invariants.go` | `fabric/adversarial_test.go:TestSimulationCannotBroadcast` | Dual-Mode Simulation Execution Barrier | **VERIFIED** |
| **INV-S1** | Multi-agent swarm orchestrators and roles have zero private keys and zero spend authority | `services/gateway/internal/economy/swarm_models.go` | `swarm_adversarial_test.go:TestSwarm_ZeroAuthority` & `swarm_test.go` | Swarm Role Specification Boundary | **VERIFIED** |

---

## 3. Specifically Audited Key Invariants

### INV-1: AI Cannot Sign
- **Source:** `internal/adversarial/invariants.go`, `internal/signer/local.go`.
- **Test:** `internal/adversarial/authority_boundary_test.go:Rule 1`.
- **Mechanism:** AI agent structures are purely data schemas containing no private key attributes. Private keys are loaded solely by the server-side `LocalSigner` or KMS boundary.
- **Status:** **VERIFIED**.

### INV-10 / INV-156: Simulation Cannot Broadcast
- **Source:** `internal/simulation/execution_gate.go`, `internal/fabric/invariants.go`.
- **Test:** `internal/adversarial/authority_boundary_test.go:Rule 7`, `internal/fabric/adversarial_test.go`.
- **Mechanism:** `AssertLiveAllowed()` inspects the request context and execution mode. If mode is `SIMULATION`, any attempt to call `SendTransaction` or broadcast calldata immediately returns `ErrSimulationBroadcastForbidden`.
- **Status:** **VERIFIED**.

### INV-13 / INV-102: Runtime Recovery Cannot Elevate Authority
- **Source:** `internal/runtime/recovery.go`, `internal/runtime/invariants.go`.
- **Test:** `internal/adversarial/authority_boundary_test.go:Rule 13`, `internal/runtime/runtime_test.go`.
- **Mechanism:** When a crashed worker or failed workflow step is recovered by the `RecoveryCoordinator`, the recovered state can only retry idempotent tasks or transition to `FAILED`. It cannot mark an unapproved or denied intent as `AUTHORIZED`.
- **Status:** **VERIFIED**.

### INV-71 & INV-72: Treasury Inflow & Reservation Integrity
- **Source:** `internal/treasury/invariants.go`, `internal/treasury/orchestrator.go`.
- **Test:** `internal/treasury/adversarial_test.go`, `internal/treasury/concurrency_test.go`.
- **Mechanism:** Inflows remain uncredited to available liquidity until cryptographic receipts confirm settlement (`INV-71`). Reservations are decremented atomically with a mutex and database lock; negative available balances trigger immediate rejection (`INV-72`).
- **Status:** **VERIFIED**.

### INV-75: Recurring Budget Boundedness
- **Source:** `internal/treasury/invariants.go`, `internal/treasury/allocator.go`.
- **Test:** `internal/treasury/adversarial_test.go:Scenario 6`.
- **Mechanism:** Long-running recurring agent contracts require explicit time horizons ($T \le 30\text{ days}$) and an explicit cumulative reserve cap. Unbounded reservations fail validation.
- **Status:** **VERIFIED**.

### INV-101: Fencing Token Rejection
- **Source:** `internal/runtime/lease.go`, `internal/runtime/invariants.go`.
- **Test:** `internal/runtime/runtime_test.go:TestFencingTokenRejection`.
- **Mechanism:** Every distributed lease renewal increments a monotonic `fencing_token`. If a zombie worker attempts to commit a completed step with an outdated fencing token, the lease verifier rejects the write with `ErrInv101`.
- **Status:** **VERIFIED**.

### INV-103: Policy Deny Inviolability Under Retry
- **Source:** `internal/runtime/retry.go`.
- **Test:** `internal/runtime/runtime_test.go:TestCase3_PolicyHashChange`.
- **Mechanism:** Retries are strictly classified by failure type (transient network faults vs. deterministic policy denies). Any step that returned a policy `HARD_DENY` is non-retryable and permanently terminal.
- **Status:** **VERIFIED**.

### INV-146 & INV-148: Autonomous Replanning Boundaries
- **Source:** `internal/fabric/replanning.go`, `internal/fabric/invariants.go`.
- **Test:** `internal/fabric/adversarial_test.go`.
- **Mechanism:** When an agent provider crashes, the replanner can swap to an alternative provider only if the candidate satisfies identical capability tags and passes Rust policy evaluation (`INV-146`). The replanner cannot increase the overall `EconomicEnvelope` budget cap (`INV-148`).
- **Status:** **VERIFIED**.

### INV-S1: Zero Authority for Swarm Roles
- **Source:** `internal/economy/swarm_models.go`.
- **Test:** `internal/economy/swarm_adversarial_test.go`.
- **Mechanism:** Swarm roles (`PLANNER`, `RESEARCHER`, `ANALYST`, `VERIFIER`, `CRITIC`, `SYNTHESIZER`) are purely organizational descriptors. Swarm agents have no private keys, cannot sign transactions, cannot modify budgets, and cannot directly call `AgentVault`.
- **Status:** **VERIFIED**.
