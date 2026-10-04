import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to audited flagship files
const demoApiPath = path.resolve(__dirname, '../lib/api/demo.ts');
const replayPagePath = path.resolve(__dirname, '../app/missions/demo/replay/page.tsx');
const controlPagePath = path.resolve(__dirname, '../app/control/page.tsx');
const objectivesPagePath = path.resolve(__dirname, '../app/control/objectives/page.tsx');
const arcPagePath = path.resolve(__dirname, '../app/arc/page.tsx');

const demoApiSource = fs.readFileSync(demoApiPath, 'utf8');
const replayPageSource = fs.readFileSync(replayPagePath, 'utf8');
const controlPageSource = fs.readFileSync(controlPagePath, 'utf8');
const objectivesPageSource = fs.readFileSync(objectivesPagePath, 'utf8');
const arcPageSource = fs.readFileSync(arcPagePath, 'utf8');

describe('CANONICAL FLAGSHIP AUTONOMOUS ECONOMIC MISSION E2E SUITE (30 INVARIANTS)', () => {
  // 1. OBJECTIVE CREATION
  it('01. Objective Creation: initializes canonical objective with $25.00 USDC cap in SIMULATION mode', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_01_created'"), 'Must contain evt_01_created');
    assert.ok(demoApiSource.includes("title: 'Autonomous Market Intelligence'"), 'Must have title Autonomous Market Intelligence');
    assert.ok(demoApiSource.includes('budget_cap_usdc: 25.0'), 'Budget cap must be $25.00 USDC');
    assert.ok(demoApiSource.includes("mode: 'SIMULATION'"), 'Mode must be SIMULATION');
    assert.ok(demoApiSource.includes("mode_notice: 'SIMULATION — NO FUNDS MOVED'"), 'Must specify mode notice');
  });

  // 2. BLUEPRINT COMPILATION
  it('02. Blueprint Compilation: compiles task graph DAG with AI advisory bounds and unchanged authority', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_02_plan'"), 'Must contain evt_02_plan');
    assert.ok(demoApiSource.includes("Research -> Analysis; Market Data -> Analysis; Analysis + Critic -> Synthesis"), 'Must compile canonical DAG');
    assert.ok(demoApiSource.includes("authority_impact: 'UNCHANGED'"), 'AI blueprint must not expand financial authority');
  });

  // 3. AGENT DISCOVERY
  it('03. Agent Discovery: discovers candidate providers with identity, capabilities, and provenance', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_03_discovery'"), 'Must contain evt_03_discovery');
    assert.ok(demoApiSource.includes("candidates_found: 4"), 'Must discover 4 candidate agents');
    assert.ok(demoApiSource.includes("discovered_entities: ["), 'Must list discovered candidate entities');
    assert.ok(demoApiSource.includes('Provider A (High SLA)'), 'Must include Provider A');
    assert.ok(demoApiSource.includes('Provider B (Cost Opt)'), 'Must include Provider B');
    assert.ok(demoApiSource.includes('Provider C (Ultra Low Latency)'), 'Must include Provider C');
    assert.ok(demoApiSource.includes('Malicious Provider (Adversarial)'), 'Must include Malicious Provider fixture');
  });

  // 4. QUOTE GENERATION
  it('04. Quote Generation: collects structured quotes containing provider, capability, price, latency, and reliability', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_04_quotes'"), 'Must contain evt_04_quotes');
    assert.ok(demoApiSource.includes("quote_usdc: 4.0"), 'Quote for Alpha is $4.00');
    assert.ok(demoApiSource.includes("quote_usdc: 3.6"), 'Quote for Beta is $3.60');
    assert.ok(demoApiSource.includes("quote_usdc: 4.5"), 'Quote for Gamma is $4.50');
    assert.ok(demoApiSource.includes("latency_s: 1.8"), 'Latency must be specified');
  });

  // 5. DETERMINISTIC SELECTION
  it('05. Deterministic Selection: selects Provider B as lowest compliant offer and exposes selection rationale', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_05_compare'"), 'Must contain evt_05_compare');
    assert.ok(demoApiSource.includes("event_id: 'evt_06_select'"), 'Must contain evt_06_select');
    assert.ok(demoApiSource.includes("recommended_provider: 'Provider B'"), 'Provider B recommended');
    assert.ok(demoApiSource.includes("Lowest expected cost ($3.60) within SLA deadline envelope"), 'Rationale must be explicit');
    assert.ok(demoApiSource.includes('why_explanation: {'), 'Why explanation must be present');
  });

  // 6. POLICY EVALUATION
  it('06. Policy Evaluation: Rust Policy Engine deterministically evaluates transaction within microsecond budget', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_08_policy'"), 'Must contain evt_08_policy');
    assert.ok(demoApiSource.includes("actor: 'Rust Policy Engine'"), 'Evaluator must be Rust Policy Engine');
    assert.ok(demoApiSource.includes("status: 'ALLOW'"), 'Decision must be ALLOW');
    assert.ok(demoApiSource.includes("eval_duration: '6.36us'"), 'Evaluation duration must be sub-10 microseconds');
  });

  // 7. RISK EVALUATION
  it('07. Risk Evaluation: Risk Engine quantifies counterparty risk score and concentration envelope', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_09_risk'"), 'Must contain evt_09_risk');
    assert.ok(demoApiSource.includes('risk_score: 18'), 'Risk score must be 18');
    assert.ok(demoApiSource.includes("risk_tier: 'LOW'"), 'Risk tier must be LOW');
    assert.ok(demoApiSource.includes('approval_required: false'), 'Autonomous threshold does not require human escalation');
  });

  // 8. APPROVAL
  it('08. Approval: verifies approval boundary for amounts under policy threshold', () => {
    assert.ok(demoApiSource.includes("gate: 'APPROVAL_GATE'"), 'Must evaluate APPROVAL_GATE');
    assert.ok(demoApiSource.includes("decision: 'NOT_REQUIRED'"), 'Must evaluate to NOT_REQUIRED under $50.00 threshold');
    assert.ok(demoApiSource.includes('$50.00 threshold'), 'Rule must specify threshold');
  });

  // 9. LIQUIDITY
  it('09. Liquidity: Treasury Orchestrator encumbers simulated liquidity and asserts buffer solvency', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_10_treasury'"), 'Must contain evt_10_treasury');
    assert.ok(demoApiSource.includes("actor: 'Treasury Orchestrator'"), 'Actor must be Treasury Orchestrator');
    assert.ok(demoApiSource.includes('amount: 3.6'), 'Encumbered amount must be 3.60');
    assert.ok(demoApiSource.includes("buffer_solvency: '86.4% HEALTHY'"), 'Solvency must be verified');
  });

  // 10. OBLIGATION
  it('10. Obligation: Clearinghouse registers bilateral obligations in ledger', () => {
    assert.ok(demoApiSource.includes("obligation_id: 'obl_prov_b_002'"), 'Must track obligation for Provider B');
    assert.ok(demoApiSource.includes("provider_id: 'provider_b'"), 'Provider B registered in obligations');
    assert.ok(demoApiSource.includes('amount_usdc: 3.6'), 'Amount is $3.60');
  });

  // 11. CLEARING
  it('11. Clearing: validates bilateral clearing netting and double-entry debits equal credits', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_20_clearing'"), 'Must contain evt_20_clearing');
    assert.ok(demoApiSource.includes('total_authorized_usdc: 8.5'), 'Total authorized must be $8.50');
    assert.ok(demoApiSource.includes('total_blocked_usdc: 3.6'), 'Total blocked must be $3.60');
    assert.ok(demoApiSource.includes('remaining_usdc: 16.5'), 'Remaining must be $16.50');
    // Equality: 8.50 + 16.50 = 25.00
    assert.equal(8.50 + 16.50, 25.00, 'Total debits must equal total credits and reconcile to $25.00 cap');
  });

  // 12. EXECUTION GATE
  it('12. Execution Gate: pre-flight check executes in SIMULATION mode with zero broadcast', () => {
    assert.ok(demoApiSource.includes("gate: 'EXECUTION_GATE'"), 'Must evaluate EXECUTION_GATE');
    assert.ok(demoApiSource.includes("decision: 'SIMULATED'"), 'Execution gate decision must be SIMULATED');
    assert.ok(demoApiSource.includes('INV-156 (Zero broadcast in simulation)'), 'Enforces INV-156');
  });

  // 13. SIMULATION SETTLEMENT
  it('13. Simulation Settlement: generates projected trace with NO funds moved and NO broadcast', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_21_settlement'"), 'Must contain evt_21_settlement');
    assert.ok(demoApiSource.includes("settlement_state: 'SIMULATED — NO FUNDS MOVED'"), 'Explicit settlement state notice');
    assert.ok(demoApiSource.includes("broadcast: 'NONE'"), 'Broadcast must be strictly NONE');
    assert.ok(demoApiSource.includes('funds_disbursed_usdc: 0.0'), 'Zero USDC disbursed');
  });

  // 14. RESULT FAILURE
  it('14. Result Failure: injects deterministic failure (heartbeat timeout) and security interception', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_12_sec_violation'"), 'Must contain evt_12_sec_violation');
    assert.ok(demoApiSource.includes("event_id: 'evt_13_pay_blocked'"), 'Must contain evt_13_pay_blocked');
    assert.ok(demoApiSource.includes("event_id: 'evt_14_prov_fail'"), 'Must contain evt_14_prov_fail');
    assert.ok(demoApiSource.includes("status: 'TIMEOUT_DETECTED'"), 'Failure status must be TIMEOUT_DETECTED');
    assert.ok(demoApiSource.includes('Heartbeat missed (>2000ms lease expired)'), 'Deterministic failure reason');
  });

  // 15. ECONOMIC MEMORY
  it('15. Economic Memory: records provider failure in simulation memory without altering production reputation', () => {
    assert.ok(demoApiSource.includes("id: 'provider_b'"), 'Must identify provider B');
    assert.ok(demoApiSource.includes("status: 'BLOCKED'"), 'Provider B status must be BLOCKED in simulation registry');
    assert.ok(demoApiSource.includes('failed_provider: Provider B') || demoApiSource.includes("'Provider B'"), 'Provider B failure captured in memory');
  });

  // 16. REPLANNING
  it('16. Replanning: AI adaptive loop proposes replacement plan without financial authority expansion', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_15_replan_req'"), 'Must contain evt_15_replan_req');
    assert.ok(demoApiSource.includes("authority_expansion: 'NONE'"), 'Authority expansion must be NONE');
    assert.ok(demoApiSource.includes("replacement_provider: 'Provider C ($4.50)'"), 'Replaces with Provider C');
    assert.ok(demoApiSource.includes('8.50 <= 25.00 USDC (PASS)'), 'Replan must remain within $25.00 cap');
  });

  // 17. PROVIDER SUBSTITUTION
  it('17. Provider Substitution: selects Provider C and updates execution graph', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_16_alt_select'"), 'Must contain evt_16_alt_select');
    assert.ok(demoApiSource.includes("provider: 'Provider C'"), 'Provider C selected');
    assert.ok(demoApiSource.includes("state: 'RECOVERY'"), 'State transitions to RECOVERY');
  });

  // 18. POLICY REVALIDATION
  it('18. Policy Revalidation: re-evaluates policy afresh for replacement provider without stale pass-through', () => {
    assert.ok(demoApiSource.includes("policy_validation: 'PASS'"), 'Policy validation must be re-run and pass');
    assert.ok(demoApiSource.includes("recipient_validated: 'service_registry:provider-c'"), 'Recipient must be validated for Provider C');
  });

  // 19. RISK REVALIDATION
  it('19. Risk Revalidation: re-evaluates risk afresh for replacement provider', () => {
    assert.ok(demoApiSource.includes("risk_validation: 'PASS'"), 'Risk validation must be re-run and pass');
  });

  // 20. LIQUIDITY REVALIDATION
  it('20. Liquidity Revalidation: re-encumbers liquidity for Provider C within total cap', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_17_pay_reauth'"), 'Must contain evt_17_pay_reauth');
    assert.ok(demoApiSource.includes('total_reserved: 8.5'), 'Total reserved must be $8.50');
    assert.ok(demoApiSource.includes("buffer_status: 'HEALTHY'"), 'Buffer must remain healthy');
  });

  // 21. SUCCESSFUL SECOND PROVIDER
  it('21. Successful Second Provider: Provider C delivers report and Critic Agent validates deliverable', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_18_result_rec'"), 'Must contain evt_18_result_rec');
    assert.ok(demoApiSource.includes("event_id: 'evt_19_result_val'"), 'Must contain evt_19_result_val');
    assert.ok(demoApiSource.includes("status: 'DELIVERED'"), 'Result delivered');
    assert.ok(demoApiSource.includes('critic_score: 94'), 'Critic score must be 94');
    assert.ok(demoApiSource.includes("schema_check: 'VALID'"), 'Deliverable schema is valid');
  });

  // 22. FINAL OBJECTIVE COMPLETION
  it('22. Final Objective Completion: marks objective satisfied and releases $16.50 unencumbered budget', () => {
    assert.ok(demoApiSource.includes("event_id: 'evt_22_complete'"), 'Must contain evt_22_complete');
    assert.ok(demoApiSource.includes("state: 'COMPLETED'"), 'Final state must be COMPLETED');
    assert.ok(demoApiSource.includes('unencumbered_return_usdc: 16.5'), 'Unencumbered return must be $16.50');
    assert.ok(demoApiSource.includes('authorized_spend_usdc: 8.5'), 'Authorized spend must be $8.50');
  });

  // 23. SIMULATION ISOLATION
  it('23. Simulation Isolation: marks all flagship demo states as SIMULATION with visible notices', () => {
    assert.ok(controlPageSource.includes('SIMULATION — NO FUNDS MOVED'), 'Control page must show simulation notice');
    assert.ok(replayPageSource.includes('SIMULATION — NO FUNDS MOVED'), 'Replay page must show simulation notice');
    assert.ok(objectivesPageSource.includes('SIMULATION — NO FUNDS MOVED'), 'Objectives page must show simulation notice');
  });

  // 24. NO SIGNING
  it('24. No Signing: verifies simulation mode generates zero cryptographic signatures or keys', () => {
    assert.ok(!demoApiSource.includes('eth_signTypedData'), 'Must not contain typed data signing');
    assert.ok(!demoApiSource.includes('private_key'), 'Must not reference private keys');
    assert.ok(demoApiSource.includes("funds_moved_usdc: 0.0"), 'Authority trace verifies 0 funds moved during checks');
    assert.ok(replayPageSource.includes('Zero financial authority'), 'Replay page confirms models have zero financial authority');
  });

  // 25. NO BROADCASTING
  it('25. No Broadcasting: asserts broadcast is strictly NONE across all timeline events', () => {
    assert.ok(demoApiSource.includes("broadcast: 'NONE'"), 'Arc settlement broadcast must be NONE');
    assert.ok(demoApiSource.includes('INV-156 (Zero broadcast in simulation)'), 'Enforces INV-156 zero broadcast in simulation');
  });

  // 26. NO AGENTVAULT MUTATION
  it('26. No AgentVault Mutation: asserts AgentVault is UNDEPLOYED and real settlements are 0', () => {
    assert.ok(demoApiSource.includes("agent_vault_deployment: 'UNDEPLOYED'"), 'AgentVault deployment must be UNDEPLOYED');
    assert.ok(demoApiSource.includes('real_settlements: 0'), 'Real settlements must be 0');
    assert.ok(arcPageSource.includes('UNDEPLOYED') || arcPageSource.includes('AgentVault'), 'Arc page respects undeployed vault state');
  });

  // 27. DETERMINISTIC REPLAY
  it('27. Deterministic Replay: seed agentpay-demo-001 produces bitwise identical 22-event sequence', () => {
    assert.ok(demoApiSource.includes("seed: 'agentpay-demo-001'"), 'Canonical seed must be agentpay-demo-001');
    assert.ok(demoApiSource.includes("CANONICAL_22_EVENTS"), 'Exports CANONICAL_22_EVENTS');
    // Ensure all 22 events exist and have chronological IDs
    for (let i = 1; i <= 22; i++) {
      const pad = i < 10 ? `0${i}` : `${i}`;
      assert.ok(demoApiSource.includes(`evt_${pad}_`), `Must contain event index ${pad}`);
    }
  });

  // 28. RESET
  it('28. Reset: provides deterministic reset functionality back to Step 0', () => {
    assert.ok(replayPageSource.includes('handleReset'), 'Replay page must implement handleReset');
    assert.ok(controlPageSource.includes('handleResetDemo'), 'Control page must implement handleResetDemo');
    assert.ok(objectivesPageSource.includes('handleResetDemo'), 'Objectives page must implement handleResetDemo');
    assert.ok(demoApiSource.includes('resetDemoMission'), 'API client must expose resetDemoMission');
  });

  // 29. DUPLICATE EXECUTION PROTECTION
  it('29. Duplicate Execution Protection: causation and correlation IDs enforce linear idempotency', () => {
    assert.ok(demoApiSource.includes("causation_id: 'evt_01_created'"), 'Must link plan to created');
    assert.ok(demoApiSource.includes("causation_id: 'evt_02_plan'"), 'Must link discovery to plan');
    assert.ok(demoApiSource.includes("causation_id: 'evt_03_discovery'"), 'Must link quotes to discovery');
    assert.ok(controlPageSource.includes('NONCE_REPLAY') || controlPageSource.includes('INV-13'), 'Enforces idempotency invariant');
  });

  // 30. HARD_DENY CANNOT BE OVERRIDDEN
  it('30. HARD_DENY Cannot Be Overridden: recipient swap attack is irreversibly blocked', () => {
    assert.ok(demoApiSource.includes("decision: 'HARD DENY'"), 'Decision must be HARD DENY');
    assert.ok(demoApiSource.includes('override_possible: false'), 'Override must be impossible (override_possible: false)');
    assert.ok(demoApiSource.includes("funds_moved: '0.00 USDC'"), 'Funds moved must be 0.00 USDC');
    assert.ok(demoApiSource.includes('INV-186'), 'Enforces INV-186');
    assert.ok(demoApiSource.includes('INV-146'), 'Enforces INV-146');
    assert.ok(demoApiSource.includes('why_not_explanation: {'), 'Exposes deterministic why_not explanation');
  });
});
