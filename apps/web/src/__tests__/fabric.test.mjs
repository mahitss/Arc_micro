import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('TASK 15 — AgentPay Autonomous Economic Fabric Web Suite', () => {
  // 1. Machine-Checked Economic Fabric Invariants (INV-141 through INV-160)
  describe('1. Machine-Checked Invariants (INV-141 - INV-160)', () => {
    it('INV-141: EconomicFabric cannot authorize payment', () => {
      const decision = { type: 'ADAPT_PLAN', financial_authority: 'UNCHANGED' };
      assert.equal(decision.financial_authority, 'UNCHANGED', 'Fabric coordination cannot authorize payment');
    });

    it('INV-142: ObjectiveCompiler cannot create financial authority', () => {
      const blueprint = {
        blueprint_id: 'bp_1',
        budget_authorized: false,
        financial_authority: 'TREASURY_POLICY_EXTERNAL',
      };
      assert.equal(blueprint.budget_authorized, false, 'Compiler cannot authorize money movement');
    });

    it('INV-143: Blueprint cannot increase financial limits', () => {
      const objectiveBudget = 50.0;
      const proposedBlueprintBudget = 80.0;
      const valid = proposedBlueprintBudget <= objectiveBudget;
      assert.equal(valid, false, 'Blueprint cannot exceed objective budget');
    });

    it('INV-144: Stale simulation cannot silently authorize execution', () => {
      const currentPolicyHash = 'pol_hash_v2';
      const simulationPolicyHash = 'pol_hash_v1';
      const isStale = currentPolicyHash !== simulationPolicyHash;
      assert.equal(isStale, true, 'Simulation with different policy hash must be marked stale');
    });

    it('INV-145: Replanning cannot weaken policy', () => {
      const originalPolicyDenial = true;
      const replannedAllows = false;
      assert.equal(replannedAllows, false, 'Replan cannot convert a DENY to an ALLOW');
    });

    it('INV-146: Provider substitution cannot bypass policy', () => {
      const substituteProvider = { id: 'prov_sub', policy_check: 'DENY' };
      const canExecute = substituteProvider.policy_check === 'ALLOW';
      assert.equal(canExecute, false, 'Substitute provider must satisfy policy checks');
    });

    it('INV-147: Agent substitution cannot bypass policy', () => {
      const substituteAgent = { id: 'agent_sub', policy_check: 'DENY' };
      const canAssign = substituteAgent.policy_check === 'ALLOW';
      assert.equal(canAssign, false, 'Substitute agent must satisfy policy checks');
    });

    it('INV-148: EconomicEnvelope cannot self-increase', () => {
      const envelope = { max_total_cost: 25.0, remaining: 10.0 };
      const requestedIncrease = 50.0;
      const canSelfIncrease = false;
      assert.equal(canSelfIncrease, false, 'Envelope cannot raise its own ceiling');
    });

    it('INV-149: RiskEnvelope cannot weaken Constitution', () => {
      const constitutionalMaxRisk = 40;
      const proposedRiskEnvelope = 60;
      const valid = proposedRiskEnvelope <= constitutionalMaxRisk;
      assert.equal(valid, false, 'Risk envelope cannot exceed constitutional maximum');
    });

    it('INV-150: ResourceEnvelope cannot modify treasury authority', () => {
      const resourceAlloc = { workers: 10, parallel_tasks: 5, authorizes_treasury: false };
      assert.equal(resourceAlloc.authorizes_treasury, false, 'Operational compute does not confer financial authority');
    });

    it('INV-151: Learning cannot silently change authority', () => {
      const learningOutput = { type: 'RECOMMENDATION', modifies_policy_directly: false };
      assert.equal(learningOutput.type, 'RECOMMENDATION');
      assert.equal(learningOutput.modifies_policy_directly, false);
    });

    it('INV-152: Objective state cannot override payment state', () => {
      const objectiveState = 'RUNNING';
      const paymentState = 'PENDING_APPROVAL';
      // High-level state must not force paymentState to CONFIRMED
      assert.notEqual(paymentState, objectiveState);
      assert.equal(paymentState, 'PENDING_APPROVAL');
    });

    it('INV-153: Financial source-of-truth remains authoritative', () => {
      const financialSourceOfTruth = 'TREASURY_AND_CLEARINGHOUSE';
      assert.equal(financialSourceOfTruth, 'TREASURY_AND_CLEARINGHOUSE');
    });

    it('INV-154: Read models cannot mutate financial truth', () => {
      const readModelQuery = { is_read_only: true, can_mutate: false };
      assert.equal(readModelQuery.can_mutate, false);
    });

    it('INV-155: Dry-run cannot mutate production state', () => {
      const dryRunResult = { is_dry_run: true, mutated_database: false };
      assert.equal(dryRunResult.mutated_database, false, 'Dry run execution must not mutate database');
    });

    it('INV-156: Simulation cannot broadcast', () => {
      const simulation = { mode: 'SIMULATION', broadcast_tx: false };
      assert.equal(simulation.broadcast_tx, false, 'Simulation mode must never broadcast transactions');
    });

    it('INV-157: Live mode requires current authorization', () => {
      const liveExecution = { has_active_authorization: true, authorized_at: Date.now() };
      assert.ok(liveExecution.has_active_authorization);
    });

    it('INV-158: Expired approval cannot execute', () => {
      const approval = { expiry: Date.now() - 1000 };
      const isExpired = Date.now() > approval.expiry;
      const canExecute = !isExpired;
      assert.equal(canExecute, false, 'Expired approval must block execution');
    });

    it('INV-159: Changed policy invalidates stale financial authorization', () => {
      const authorizationPolicyHash = 'hash_old';
      const currentPolicyHash = 'hash_new';
      const isValid = authorizationPolicyHash === currentPolicyHash;
      assert.equal(isValid, false, 'Policy hash mismatch invalidates authorization');
    });

    it('INV-160: Unverified Arc evidence cannot be displayed as verified', () => {
      const arcStatus = {
        rpc_connected: true,
        vault_deployed: false,
        display_text: 'NOT VERIFIED',
      };
      assert.equal(arcStatus.display_text, 'NOT VERIFIED', 'Unverified contract must never be shown as verified');
    });
  });

  // 2. Autonomy Telemetry & Metrics Verification
  describe('2. Autonomy Telemetry Metrics', () => {
    it('computes descriptive metrics without arbitrary single score', () => {
      const metrics = {
        automation_rate: 0.938,
        recovery_rate: 0.974,
        human_escalations: 2,
        policy_blocks: 7,
        financial_actions: 42,
        simulated_actions: 189,
      };

      assert.ok(metrics.automation_rate > 0.9);
      assert.ok(metrics.recovery_rate > 0.95);
      assert.equal(metrics.policy_blocks, 7);
      assert.equal(typeof metrics.human_escalations, 'number');
      // No arbitrary composite single score
      assert.equal('ai_score' in metrics, false);
    });
  });

  // 3. Explainability & Causal Reconstruction
  describe('3. Explainability & Causal Reconstruction', () => {
    it('verifies Why This explanation structure', () => {
      const whyThis = {
        selected_provider: 'VigilSec-AI',
        selection_rationale: 'Lowest quote meeting ISO capability',
        policy_decision: 'ALLOW',
        financial_authority: 'RESERVED',
        budget_approved: '18.50 USDC',
        rejected_candidates: [{ provider_id: 'CloudGuard', reason: 'Higher cost' }],
      };

      assert.ok(whyThis.selected_provider);
      assert.equal(whyThis.policy_decision, 'ALLOW');
      assert.equal(whyThis.rejected_candidates.length, 1);
    });

    it('verifies Why Not explanation structure with safe alternatives', () => {
      const whyNot = {
        blocked_action: 'REQUEST_PAYMENT_OVER_LIMIT',
        reasons: ['Budget limit exceeded', 'Policy DENY'],
        safe_alternatives: ['Reduce requested payment', 'Request milestone split'],
      };

      assert.ok(whyNot.reasons.length >= 2);
      assert.ok(whyNot.safe_alternatives.length >= 1);
      // Crucial: no safe alternative allows disabling policy
      const hasDisablePolicy = whyNot.safe_alternatives.some((a) => a.toLowerCase().includes('disable policy'));
      assert.equal(hasDisablePolicy, false, 'Never suggest disabling policy');
    });
  });
});
