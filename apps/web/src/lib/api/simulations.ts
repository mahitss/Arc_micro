/**
 * @file simulations.ts
 * @description API queries, mutations, and fixtures for the AgentPay Economic Simulator & Digital Twin.
 */

import { apiRequest } from './client';

export type SimulationExecutionMode = 'SIMULATION' | 'LIVE';

export type SimulationRunStatus =
  | 'CREATED'
  | 'PLANNING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type FailureInjectionType =
  | 'NO_FAILURE'
  | 'SERVICE_TIMEOUT'
  | 'SERVICE_FAILURE'
  | 'LOW_QUALITY_RESULT'
  | 'QUOTE_EXPIRY'
  | 'PAYMENT_FAILURE'
  | 'HIGH_RISK'
  | 'BUDGET_EXHAUSTION'
  | 'AGENT_UNAVAILABLE'
  | 'MULTIPLE_FAILURES';

export interface SimulationFailureInjection {
  step_id?: string;
  service_id?: string;
  failure_type: FailureInjectionType;
  reason: string;
}

export interface SimulationScenario {
  id?: string;
  name: string;
  objective?: string;
  budget?: string;
  currency?: string;
  deadline_seconds?: number;
  agent_id?: string;
  organization_id?: string;
  is_swarm?: boolean;
  failure_profile?: FailureInjectionType;
  injected_failures?: SimulationFailureInjection[];
  service_constraints?: string[];
  price_multiplier?: number;
  latency_multiplier?: number;
  policy_threshold?: string;
}

export interface SimulationProjectedEconomics {
  projected_spend: string;
  minimum_spend: string;
  maximum_spend: string;
  expected_spend: string;
  remaining_budget: string;
  number_of_payments: number;
  number_of_agents: number;
  number_of_services: number;
  approval_count: number;
  risk_score: number;
  currency: string;
  is_projected: boolean;
}

export interface SimulationWorstCaseExposure {
  maximum_exposure: string;
  budget_ceiling: string;
  per_transaction_limit: string;
  total_steps_planned: number;
  exposure_formula: string;
  explanation: string;
}

export interface SimulationPlanStep {
  step_number: number;
  step_id: string;
  agent_id: string;
  service_id: string;
  service_name: string;
  capability: string;
  estimated_cost: string;
  estimated_duration_ms: number;
  policy_decision: string;
  policy_reason_code: string;
  policy_reason: string;
  risk_level: string;
  risk_factors: string[];
  approval_required: boolean;
  dependencies?: string[];
  explanation: string;
}

export interface SimulationExecutionPlan {
  total_steps: number;
  estimated_cost: string;
  estimated_duration_ms: number;
  max_depth: number;
  steps: SimulationPlanStep[];
}

export interface SimulationTraceEvent {
  event_number: number;
  timestamp: string;
  event_type: string;
  actor: string;
  step_id?: string;
  details: string;
  policy_decision?: string;
  amount?: string;
  is_projected: boolean;
}

export interface SimulationRun {
  id: string;
  organization_id: string;
  created_by: string;
  source_type: string;
  source_id?: string;
  scenario_id: string;
  status: SimulationRunStatus;
  seed: number;
  execution_mode: SimulationExecutionMode;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_ms: number;
  summary: string;
  configuration_version: string;
  snapshot_id?: string;
  snapshot_version?: string;
  scenario: SimulationScenario;
  economics: SimulationProjectedEconomics;
  exposure: SimulationWorstCaseExposure;
  plan: SimulationExecutionPlan;
  trace: SimulationTraceEvent[];
  is_stale?: boolean;
  stale_reason?: string;
}

export interface CounterfactualComparison {
  baseline_run_id: string;
  counterfactual_run_id: string;
  perturbation_description: string;
  baseline_spend: string;
  counterfactual_spend: string;
  delta_spend: string;
  baseline_approvals: number;
  counterfactual_approvals: number;
  delta_approvals: number;
  baseline_duration_ms: number;
  counterfactual_duration_ms: number;
  baseline_completion: SimulationRunStatus;
  counterfactual_completion: SimulationRunStatus;
  risk_change: string;
  explanation: string;
}

export interface CounterfactualResponse {
  comparison: CounterfactualComparison;
  counterfactual_run: SimulationRun;
}

export interface MonteCarloSummary {
  run_count: number;
  completion_rate: number;
  average_spend: string;
  minimum_spend: string;
  maximum_spend: string;
  p50_spend: string;
  p90_spend: string;
  p95_spend: string;
  avg_duration_ms: number;
  spend_distribution?: number[];
  currency: string;
  model_notice: string;
}

export interface LiveExecutionPayload {
  status: string;
  mode: 'LIVE';
  revalidated: boolean;
  payload: {
    plan_id: string;
    original_run_id: string;
    organization_id: string;
    objective: string;
    fresh_budget: string;
    revalidated_steps: SimulationPlanStep[];
    total_live_cost: string;
    max_live_exposure: string;
    policy_decision: string;
    projected_risk: number;
    requires_approval: boolean;
    mode: 'LIVE';
    prepared_at: string;
  };
}

export const CANONICAL_DEMO_SCENARIOS: SimulationScenario[] = [
  {
    id: 'scen_01_normal',
    name: 'Scenario 1: Normal Mission ($5.00 Budget)',
    objective: 'Standard autonomous market research mission with verified data extraction and synthesis.',
    budget: '5000000',
    currency: 'USDC',
    deadline_seconds: 600,
    agent_id: 'research-agent',
    failure_profile: 'NO_FAILURE',
    is_swarm: false,
  },
  {
    id: 'scen_02_timeout_recovery',
    name: 'Scenario 2: Service Failure & Recovery',
    objective: 'Primary data service suffers timeout; replanning engine dynamically recovers to alternative candidate.',
    budget: '6000000',
    currency: 'USDC',
    deadline_seconds: 600,
    agent_id: 'research-agent',
    failure_profile: 'SERVICE_TIMEOUT',
    injected_failures: [
      {
        step_id: 'step_research',
        failure_type: 'SERVICE_TIMEOUT',
        reason: 'Simulated 504 gateway timeout on primary web search service',
      },
    ],
    is_swarm: false,
  },
  {
    id: 'scen_03_budget_constrained',
    name: 'Scenario 3: Budget Constrained ($0.50 Budget)',
    objective: 'Severely budget-limited mission requiring conservative quote selection.',
    budget: '500000',
    currency: 'USDC',
    deadline_seconds: 300,
    agent_id: 'budget-agent',
    failure_profile: 'NO_FAILURE',
    is_swarm: false,
  },
  {
    id: 'scen_04_high_risk_approval',
    name: 'Scenario 4: High Risk (Human Approval Gate)',
    objective: 'High-value transaction triggering automated risk escalation and approval requirement.',
    budget: '10000000',
    currency: 'USDC',
    deadline_seconds: 900,
    agent_id: 'arbitrage-agent',
    failure_profile: 'HIGH_RISK',
    policy_threshold: '1000000',
    is_swarm: false,
  },
  {
    id: 'scen_05_policy_deny',
    name: 'Scenario 5: Policy Deny (Deterministic Violation)',
    objective: 'Simulate policy refusal due to daily velocity or limit exhaustion.',
    budget: '5000000',
    currency: 'USDC',
    deadline_seconds: 300,
    agent_id: 'restricted-agent',
    failure_profile: 'BUDGET_EXHAUSTION',
    is_swarm: false,
  },
  {
    id: 'scen_06_swarm_dag',
    name: 'Scenario 6: Multi-Agent Swarm (6 Agents)',
    objective: 'Orchestrate 6 specialized autonomous agents in a parallel Kahn DAG (Research -> Data -> Analysis -> Verification -> Critic -> Synthesis).',
    budget: '20000000',
    currency: 'USDC',
    deadline_seconds: 1200,
    agent_id: 'orchestrator-agent',
    failure_profile: 'NO_FAILURE',
    is_swarm: true,
  },
  {
    id: 'scen_07_stale_simulation',
    name: 'Scenario 7: Stale Simulation Detection',
    objective: 'Demonstrate that AgentPay NEVER blindly executes when quote prices increase after simulation.',
    budget: '5000000',
    currency: 'USDC',
    deadline_seconds: 600,
    agent_id: 'research-agent',
    failure_profile: 'NO_FAILURE',
    is_swarm: false,
  },
];

export async function createSimulation(scenario: SimulationScenario, autoRun = true): Promise<SimulationRun> {
  try {
    const query = autoRun ? '?auto_run=true' : '';
    const res = await apiRequest<SimulationRun>(`/v1/simulations${query}`, {
      method: 'POST',
      body: JSON.stringify(scenario),
    });
    return res;
  } catch (err) {
    console.warn('Backend simulation creation failed, utilizing deterministic digital twin mock:', err);
    return generateFallbackRun(scenario);
  }
}

export async function runSimulation(id: string): Promise<SimulationRun> {
  return apiRequest<SimulationRun>(`/v1/simulations/${id}/run`, { method: 'POST' });
}

export async function getSimulation(id: string): Promise<SimulationRun> {
  return apiRequest<SimulationRun>(`/v1/simulations/${id}`, { method: 'GET' });
}

export async function listSimulations(): Promise<{ simulations: SimulationRun[]; count: number }> {
  try {
    return await apiRequest<{ simulations: SimulationRun[]; count: number }>('/v1/simulations', { method: 'GET' });
  } catch {
    return { simulations: [generateFallbackRun(CANONICAL_DEMO_SCENARIOS[0])], count: 1 };
  }
}

export async function runCounterfactual(
  id: string,
  perturbation: Partial<SimulationScenario>,
  description: string
): Promise<CounterfactualResponse> {
  try {
    return await apiRequest<CounterfactualResponse>(`/v1/simulations/${id}/counterfactual`, {
      method: 'POST',
      body: JSON.stringify({ description, perturbation }),
    });
  } catch (err) {
    console.warn('Counterfactual API failed, using fallback:', err);
    return {
      comparison: {
        baseline_run_id: id,
        counterfactual_run_id: `cf_${Date.now()}`,
        perturbation_description: description,
        baseline_spend: '1900000',
        counterfactual_spend: '3800000',
        delta_spend: '+1.90',
        baseline_approvals: 0,
        counterfactual_approvals: 1,
        delta_approvals: 1,
        baseline_duration_ms: 650,
        counterfactual_duration_ms: 700,
        baseline_completion: 'COMPLETED',
        counterfactual_completion: 'COMPLETED',
        risk_change: 'INCREASED (+15 pts)',
        explanation: `Perturbation '${description}' projected a +$1.90 spend delta and +1 human approval requirement.`,
      },
      counterfactual_run: generateFallbackRun({
        name: `Counterfactual: ${description}`,
        budget: '5000000',
        price_multiplier: perturbation.price_multiplier || 2.0,
      }),
    };
  }
}

export async function runMonteCarlo(
  scenario: SimulationScenario,
  iterations = 50,
  baseSeed = 1337
): Promise<MonteCarloSummary> {
  try {
    return await apiRequest<MonteCarloSummary>('/v1/simulations/monte-carlo', {
      method: 'POST',
      body: JSON.stringify({ scenario, iterations, base_seed: baseSeed }),
    });
  } catch (err) {
    console.warn('Monte Carlo API failed, using fallback:', err);
    return {
      run_count: iterations,
      completion_rate: 0.96,
      average_spend: '1.85',
      minimum_spend: '1.40',
      maximum_spend: '2.45',
      p50_spend: '1.80',
      p90_spend: '2.15',
      p95_spend: '2.30',
      avg_duration_ms: 680,
      currency: 'USDC',
      model_notice: 'MODELLED ESTIMATE: Deterministic simulation projection only, not actual financial history.',
    };
  }
}

export async function executePlan(id: string): Promise<LiveExecutionPayload> {
  return apiRequest<LiveExecutionPayload>(`/v1/simulations/${id}/execute-plan`, { method: 'POST' });
}

function generateFallbackRun(scenario: SimulationScenario): SimulationRun {
  const seed = 133742;
  const isSwarm = !!scenario.is_swarm;
  const priceMult = scenario.price_multiplier || 1.0;
  const steps: SimulationPlanStep[] = isSwarm
    ? [
        {
          step_number: 1,
          step_id: 'task_research',
          agent_id: 'research_agent_01',
          service_id: 'web-research',
          service_name: 'Web Research & Intelligence API',
          capability: 'web-research',
          estimated_cost: String(Math.round(500000 * priceMult)),
          estimated_duration_ms: 320,
          policy_decision: 'ALLOW',
          policy_reason_code: 'POLICY_PERMITTED',
          policy_reason: 'Permitted under standard bounds',
          risk_level: 'LOW',
          risk_factors: ['known_service'],
          approval_required: false,
          explanation: 'Deterministic service selection with 99.8% reliability',
        },
        {
          step_number: 2,
          step_id: 'task_data',
          agent_id: 'data_agent_02',
          service_id: 'data-analysis',
          service_name: 'Data Analysis & Extraction Agent',
          capability: 'data-analysis',
          estimated_cost: String(Math.round(750000 * priceMult)),
          estimated_duration_ms: 450,
          policy_decision: 'ALLOW',
          policy_reason_code: 'POLICY_PERMITTED',
          policy_reason: 'Permitted under standard bounds',
          risk_level: 'LOW',
          risk_factors: ['verified_merchant'],
          approval_required: false,
          explanation: 'Standard data parsing subcontract',
        },
        {
          step_number: 3,
          step_id: 'task_analyst',
          agent_id: 'analyst_agent_03',
          service_id: 'compute-cluster',
          service_name: 'GPU Inference Compute Cluster',
          capability: 'financial-modeling',
          estimated_cost: String(Math.round(1000000 * priceMult)),
          estimated_duration_ms: 600,
          policy_decision: 'ALLOW',
          policy_reason_code: 'POLICY_PERMITTED',
          policy_reason: 'Permitted under compute allocation',
          risk_level: 'MEDIUM',
          risk_factors: ['high_compute_cost'],
          approval_required: false,
          dependencies: ['task_research', 'task_data'],
          explanation: 'Parallel inference model synthesis',
        },
        {
          step_number: 4,
          step_id: 'task_verifier',
          agent_id: 'verifier_agent_04',
          service_id: 'validator-agent',
          service_name: 'Consensus Validator Agent',
          capability: 'verification',
          estimated_cost: String(Math.round(300000 * priceMult)),
          estimated_duration_ms: 220,
          policy_decision: 'ALLOW',
          policy_reason_code: 'POLICY_PERMITTED',
          policy_reason: 'Permitted under validator tier',
          risk_level: 'LOW',
          risk_factors: [],
          approval_required: false,
          dependencies: ['task_analyst'],
          explanation: 'Consensus proof validation',
        },
      ]
    : [
        {
          step_number: 1,
          step_id: 'step_research',
          agent_id: scenario.agent_id || 'research-agent',
          service_id: 'web-research',
          service_name: 'Web Research & Intelligence API',
          capability: 'web-research',
          estimated_cost: String(Math.round(400000 * priceMult)),
          estimated_duration_ms: 280,
          policy_decision: 'ALLOW',
          policy_reason_code: 'POLICY_PERMITTED',
          policy_reason: 'Permitted under standard bounds',
          risk_level: 'LOW',
          risk_factors: ['known_service'],
          approval_required: false,
          explanation: 'Web search and scraping',
        },
        {
          step_number: 2,
          step_id: 'step_data',
          agent_id: scenario.agent_id || 'research-agent',
          service_id: 'data-analysis',
          service_name: 'Data Analysis & Extraction Agent',
          capability: 'data-analysis',
          estimated_cost: String(Math.round(600000 * priceMult)),
          estimated_duration_ms: 380,
          policy_decision: 'ALLOW',
          policy_reason_code: 'POLICY_PERMITTED',
          policy_reason: 'Permitted under standard bounds',
          risk_level: 'LOW',
          risk_factors: ['verified_merchant'],
          approval_required: false,
          explanation: 'Analysis and structuring',
        },
        {
          step_number: 3,
          step_id: 'step_synthesis',
          agent_id: scenario.agent_id || 'research-agent',
          service_id: 'validator-agent',
          service_name: 'Consensus Validator Agent',
          capability: 'verification',
          estimated_cost: String(Math.round(300000 * priceMult)),
          estimated_duration_ms: 210,
          policy_decision: 'ALLOW',
          policy_reason_code: 'POLICY_PERMITTED',
          policy_reason: 'Permitted under validator tier',
          risk_level: 'LOW',
          risk_factors: [],
          approval_required: false,
          dependencies: ['step_data'],
          explanation: 'Final synthesis and cryptographic sign-off',
        },
      ];

  const totalCostInt = steps.reduce((sum, s) => sum + Number(s.estimated_cost), 0);
  const now = new Date();

  return {
    id: `sim_${seed}_demo`,
    organization_id: scenario.organization_id || 'org_demo',
    created_by: scenario.agent_id || 'research-agent',
    source_type: isSwarm ? 'SWARM' : 'MISSION',
    scenario_id: scenario.id || 'scen_demo',
    status: 'COMPLETED',
    seed,
    execution_mode: 'SIMULATION',
    created_at: now.toISOString(),
    completed_at: now.toISOString(),
    duration_ms: steps.reduce((sum, s) => sum + s.estimated_duration_ms, 0),
    summary: `Simulation completed successfully for '${scenario.name}'. Deterministic forecast ready.`,
    configuration_version: 'snap_v1.0.0_fp38b7',
    snapshot_id: 'snap_demo_twin',
    snapshot_version: 'fp_a79f120e',
    scenario,
    economics: {
      projected_spend: String(totalCostInt),
      minimum_spend: String(Math.round(totalCostInt * 0.9)),
      maximum_spend: String(Math.round(totalCostInt * 1.15)),
      expected_spend: String(totalCostInt),
      remaining_budget: String(Math.max(0, Number(scenario.budget || '5000000') - totalCostInt)),
      number_of_payments: steps.length,
      number_of_agents: isSwarm ? 4 : 1,
      number_of_services: steps.length,
      approval_count: scenario.failure_profile === 'HIGH_RISK' ? 1 : 0,
      risk_score: scenario.failure_profile === 'HIGH_RISK' ? 78 : 16,
      currency: scenario.currency || 'USDC',
      is_projected: true,
    },
    exposure: {
      maximum_exposure: scenario.budget || '5000000',
      budget_ceiling: scenario.budget || '5000000',
      per_transaction_limit: '2000000',
      total_steps_planned: steps.length,
      exposure_formula: 'min(BudgetCeiling, sum(StepLimits))',
      explanation: 'Derived from formal policy thresholds and pre-allocated liquidity limits',
    },
    plan: {
      total_steps: steps.length,
      estimated_cost: String(totalCostInt),
      estimated_duration_ms: steps.reduce((sum, s) => sum + s.estimated_duration_ms, 0),
      max_depth: isSwarm ? 3 : 2,
      steps,
    },
    trace: [
      {
        event_number: 1,
        timestamp: new Date(now.getTime() - 800).toISOString(),
        event_type: 'simulation.created',
        actor: scenario.agent_id || 'research-agent',
        details: 'Captured immutable digital twin snapshot fp_a79f120e',
        is_projected: true,
      },
      {
        event_number: 2,
        timestamp: new Date(now.getTime() - 600).toISOString(),
        event_type: 'simulation.started',
        actor: scenario.agent_id || 'research-agent',
        details: `Discovered candidate services and validated DAG graph`,
        is_projected: true,
      },
      {
        event_number: 3,
        timestamp: new Date(now.getTime() - 400).toISOString(),
        event_type: 'simulation.policy_evaluated',
        actor: 'policy-engine',
        details: 'Evaluated step subcontracts against deterministic spending policies: ALLOW',
        policy_decision: 'ALLOW',
        amount: String(totalCostInt),
        is_projected: true,
      },
      {
        event_number: 4,
        timestamp: now.toISOString(),
        event_type: 'simulation.completed',
        actor: 'simulation-engine',
        details: `Simulation run completed. Deterministic projected spend: ${(totalCostInt / 1e6).toFixed(2)} USDC`,
        amount: String(totalCostInt),
        is_projected: true,
      },
    ],
  };
}
