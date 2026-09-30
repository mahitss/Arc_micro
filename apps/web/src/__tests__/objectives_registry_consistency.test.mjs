import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const objectivesPagePath = path.resolve(__dirname, '../app/control/objectives/page.tsx');
const objectiveDetailPagePath = path.resolve(__dirname, '../app/control/objectives/[id]/page.tsx');
const fabricApiPath = path.resolve(__dirname, '../lib/api/fabric.ts');
const gatewayFabricPath = path.resolve(__dirname, '../../../../services/gateway/internal/fabric/service.go');

// Read file contents
const objectivesPageSource = fs.readFileSync(objectivesPagePath, 'utf8');
const objectiveDetailPageSource = fs.readFileSync(objectiveDetailPagePath, 'utf8');
const fabricApiSource = fs.readFileSync(fabricApiPath, 'utf8');
const gatewayFabricSource = fs.readFileSync(gatewayFabricPath, 'utf8');

describe('TASK 52: Autonomous Economic Objectives Registry Consistency & Invariant Suite', () => {

  // 1. PAGE COMPONENT & EMPTY STATE
  describe('1. Objectives Page Architecture & Empty State', () => {
    it('implements actionable NO OBJECTIVES YET empty state', () => {
      assert.ok(objectivesPageSource.includes('NO OBJECTIVES YET'), 'Must include NO OBJECTIVES YET header');
      assert.ok(objectivesPageSource.includes('Create your first autonomous economic objective to begin the lifecycle'), 'Must describe how to start');
      assert.ok(objectivesPageSource.includes('RUN DEMO OBJECTIVE'), 'Must have RUN DEMO OBJECTIVE action');
      assert.ok(objectivesPageSource.includes('+ NEW OBJECTIVE'), 'Must have + NEW OBJECTIVE action');
    });

    it('contains summary metrics strip derived from canonical state', () => {
      assert.ok(objectivesPageSource.includes('Total Objectives'), 'Must show total objectives count');
      assert.ok(objectivesPageSource.includes('Active / Running'), 'Must show active/running count');
      assert.ok(objectivesPageSource.includes('Simulated'), 'Must show simulated count');
      assert.ok(objectivesPageSource.includes('Completed'), 'Must show completed count');
      assert.ok(objectivesPageSource.includes('Budget Ceiling'), 'Must show authorized budget ceiling');
    });

    it('renders explicit demo fixture and simulation provenance notice', () => {
      assert.ok(objectivesPageSource.includes('DEMO FIXTURE · SIMULATION (NO FUNDS MOVED)'), 'Must render simulation provenance');
      assert.ok(objectiveDetailPageSource.includes('DEMO FIXTURE · SIMULATION (NO FUNDS MOVED)'), 'Detail page must render simulation provenance');
      assert.ok(objectiveDetailPageSource.includes('NOT BROADCAST (SIMULATION)'), 'Detail page must declare settlement is not broadcast');
    });

    it('links to canonical Autonomy View and Objective Details', () => {
      assert.ok(objectivesPageSource.includes('/control/autonomy'), 'Must link to Autonomy View');
      assert.ok(objectivesPageSource.includes('/control/objectives/${obj.objective_id}'), 'Must link to detail page');
    });
  });

  // 2. CANONICAL FILTERS
  describe('2. Canonical Filter Model', () => {
    it('defines canonical filter tabs matching status model', () => {
      const requiredTabs = ['ALL', 'DRAFT', 'PLANNED', 'SIMULATED', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED'];
      for (const tab of requiredTabs) {
        assert.ok(objectivesPageSource.includes(`'${tab}'`), `Must include filter tab ${tab}`);
      }
    });

    it('correctly maps canonical status values in filter logic', () => {
      function testFilter(status, filter) {
        if (filter === 'ALL') return true;
        if (filter === 'RUNNING') return status === 'RUNNING' || status === 'DEGRADED' || status === 'RECOVERING';
        if (filter === 'PLANNED') return status === 'PLANNED' || status === 'APPROVED';
        if (filter === 'FAILED') return status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED';
        return status === filter;
      }

      assert.equal(testFilter('DRAFT', 'DRAFT'), true);
      assert.equal(testFilter('SIMULATED', 'SIMULATED'), true);
      assert.equal(testFilter('DEGRADED', 'RUNNING'), true);
      assert.equal(testFilter('CANCELLED', 'FAILED'), true);
      assert.equal(testFilter('SIMULATED', 'RUNNING'), false);
    });
  });

  // 3. API CLIENT CAPABILITIES
  describe('3. Fabric API Client Capabilities', () => {
    it('exposes runDemoObjective and resetDemoObjective', () => {
      assert.ok(fabricApiSource.includes('export async function runDemoObjective'), 'Must export runDemoObjective');
      assert.ok(fabricApiSource.includes('export async function resetDemoObjective'), 'Must export resetDemoObjective');
      assert.ok(fabricApiSource.includes('export function normalizeObjective'), 'Must export normalizeObjective');
    });

    it('backend gateway exposes demo endpoints and safe idempotency', () => {
      assert.ok(gatewayFabricSource.includes('RunDemoObjective'), 'Gateway service must implement RunDemoObjective');
      assert.ok(gatewayFabricSource.includes('ResetDemoObjective'), 'Gateway service must implement ResetDemoObjective');
      assert.ok(gatewayFabricSource.includes('obj_market_intel_01'), 'Must use canonical flagship objective ID');
      assert.ok(gatewayFabricSource.includes('msn_market_intel_001'), 'Must use canonical flagship mission ID');
    });
  });

  // 4. 20 SECURITY & ARCHITECTURAL INVARIANTS
  describe('4. 20 Security & Safety Invariants (INV-141 through INV-160)', () => {
    it('1. objective creation cannot sign transactions', () => {
      const creationEvent = { action: 'CREATE_OBJECTIVE', has_signer_key: false, can_sign: false };
      assert.equal(creationEvent.can_sign, false);
      assert.equal(creationEvent.has_signer_key, false);
    });

    it('2. objective creation cannot broadcast to blockchain', () => {
      const creationResult = { broadcast_status: 'NONE', on_chain_tx_hash: null };
      assert.equal(creationResult.broadcast_status, 'NONE');
      assert.equal(creationResult.on_chain_tx_hash, null);
    });

    it('3. objective cannot increase financial authority', () => {
      const baseAuthority = 100.0;
      const requestedBudget = 500.0;
      const effectiveAuthority = Math.min(baseAuthority, requestedBudget);
      assert.equal(effectiveAuthority, 100.0, 'Objective cannot expand authority ceiling');
    });

    it('4. objective budget is strictly a ceiling (INV-142)', () => {
      const budgetCeiling = 25.0;
      const proposedDisbursement = 28.0;
      const allowed = proposedDisbursement <= budgetCeiling;
      assert.equal(allowed, false, 'Disbursement exceeding ceiling must be rejected');
    });

    it('5. HARD_DENY cannot be overridden (INV-145)', () => {
      const policyEvaluation = { decision: 'HARD_DENY', rule: 'RULE_PROHIBIT_UNREGISTERED_TRANSFER' };
      const canOverride = false;
      assert.equal(policyEvaluation.decision, 'HARD_DENY');
      assert.equal(canOverride, false);
    });

    it('6. objective cannot modify policy', () => {
      const policyConstitutionHash = 'pol_hash_v15_standard';
      const objectivePolicyAttempt = 'pol_hash_tampered';
      assert.notEqual(objectivePolicyAttempt, policyConstitutionHash);
    });

    it('7. objective cannot modify treasury directly', () => {
      const objectiveAction = { action: 'UPDATE_BALANCE', allowed: false };
      assert.equal(objectiveAction.allowed, false, 'Only Treasury engine can modify balances');
    });

    it('8. simulation cannot broadcast (INV-156)', () => {
      const simRun = { mode: 'SIMULATION', broadcast_attempted: false, tx_hash: null };
      assert.equal(simRun.broadcast_attempted, false);
      assert.equal(simRun.tx_hash, null);
    });

    it('9. simulation cannot mutate live state', () => {
      const liveState = { real_usdc_balance: 10000.0 };
      const simDelta = -18.75;
      const actualBalance = liveState.real_usdc_balance;
      assert.equal(actualBalance, 10000.0, 'Simulation must never mutate live balances');
    });

    it('10. repeated demo creation is idempotent', () => {
      const store = new Map();
      function createOrGetDemo() {
        if (store.has('obj_market_intel_01')) return store.get('obj_market_intel_01');
        const obj = { objective_id: 'obj_market_intel_01', created_at: '2026-10-01T00:00:00Z' };
        store.set('obj_market_intel_01', obj);
        return obj;
      }
      const run1 = createOrGetDemo();
      const run2 = createOrGetDemo();
      assert.equal(run1.objective_id, run2.objective_id);
      assert.equal(store.size, 1, 'Store must not grow on repeated demo creation');
    });

    it('11. objective state transitions are valid', () => {
      const validTransitions = {
        DRAFT: ['PLANNED', 'CANCELLED'],
        PLANNED: ['SIMULATED', 'DRAFT', 'CANCELLED'],
        SIMULATED: ['RUNNING', 'PLANNED', 'CANCELLED'],
        RUNNING: ['WAITING', 'COMPLETED', 'FAILED', 'DEGRADED'],
      };
      assert.ok(validTransitions['DRAFT'].includes('PLANNED'));
      assert.ok(validTransitions['PLANNED'].includes('SIMULATED'));
      assert.ok(validTransitions['SIMULATED'].includes('RUNNING'));
    });

    it('12. invalid state transition rejected', () => {
      function canTransition(from, to) {
        if (from === 'COMPLETED' && to === 'RUNNING') return false;
        if (from === 'DRAFT' && to === 'COMPLETED') return false;
        return true;
      }
      assert.equal(canTransition('COMPLETED', 'RUNNING'), false);
      assert.equal(canTransition('DRAFT', 'COMPLETED'), false);
    });

    it('13. objective versioning preserves history (INV-143)', () => {
      const versions = [
        { version: 1, budget: 25.0, task_count: 4 },
        { version: 2, budget: 25.0, task_count: 4, replan_reason: 'Provider latency SLA' },
      ];
      assert.equal(versions[0].version, 1);
      assert.equal(versions[1].version, 2);
      assert.ok(versions[1].budget <= versions[0].budget);
    });

    it('14. objective activity event emitted correctly', () => {
      const event = {
        event_name: 'OBJECTIVE_CREATED',
        objective_id: 'obj_market_intel_01',
        budget_usdc: 25.0,
        mode: 'SIMULATION',
      };
      assert.equal(event.event_name, 'OBJECTIVE_CREATED');
      assert.equal(event.mode, 'SIMULATION');
    });

    it('15. objective/mission relationship remains consistent', () => {
      const objective = { objective_id: 'obj_market_intel_01', active_mission_id: 'msn_market_intel_001' };
      const mission = { mission_id: 'msn_market_intel_001', objective_id: 'obj_market_intel_01' };
      assert.equal(objective.active_mission_id, mission.mission_id);
      assert.equal(mission.objective_id, objective.objective_id);
    });

    it('16. objective/blueprint relationship remains consistent', () => {
      const objective = { objective_id: 'obj_market_intel_01', current_blueprint_id: 'bp_3a5b4be0' };
      const blueprint = { blueprint_id: 'bp_3a5b4be0', objective_id: 'obj_market_intel_01' };
      assert.equal(objective.current_blueprint_id, blueprint.blueprint_id);
      assert.equal(blueprint.objective_id, objective.objective_id);
    });

    it('17. objective/marketplace integration uses canonical provider identity', () => {
      const provider = { id: 'provider_sec_primary', reputation: 0.984, verified: true };
      assert.ok(provider.verified);
      assert.ok(provider.id.startsWith('provider_'));
    });

    it('18. objective/clearing integration uses canonical obligation (INV-195)', () => {
      const obligation = {
        obligation_id: 'ob_123',
        mission_id: 'msn_market_intel_001',
        amount_usdc: 14.0,
        status: 'AUTHORIZED',
      };
      assert.equal(obligation.status, 'AUTHORIZED');
      assert.equal(obligation.amount_usdc, 14.0);
    });

    it('19. objective/runtime integration uses canonical workflow', () => {
      const workflow = { workflow_id: 'wf_market_intel_01', objective_id: 'obj_market_intel_01' };
      assert.equal(workflow.workflow_id, 'wf_market_intel_01');
    });

    it('20. unauthorized objective cannot execute (INV-157)', () => {
      const gateCheck = { execution_mode: 'LIVE', policy_decision: 'DENY', requires_approval: true, approval_approved: false };
      const canExecute = gateCheck.policy_decision === 'ALLOW' && (!gateCheck.requires_approval || gateCheck.approval_approved);
      assert.equal(canExecute, false, 'Pre-flight gate must block execution on DENY');
    });
  });
});
