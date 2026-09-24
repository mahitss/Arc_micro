import { apiRequest } from './client';

export type ObjectiveStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'SIMULATED'
  | 'APPROVED'
  | 'RUNNING'
  | 'WAITING'
  | 'DEGRADED'
  | 'RECOVERING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface ObjectiveConstraints {
  deadline?: string;
  max_budget?: string;
  max_parallel_tasks?: number;
  required_capability?: string;
  minimum_confidence?: number;
  required_policy?: string;
}

export interface EconomicEnvelope {
  max_total_cost: string;
  max_single_cost: string;
  max_exposure: string;
  max_parallel_exposure: string;
  reserved_amount: string;
  remaining_amount: string;
  expiry: string;
  policy_hash: string;
}

export interface RiskEnvelope {
  max_risk_score: number;
  allowed_risk_classes: string[];
  escalation_threshold: number;
  minimum_confidence: number;
  security_requirements: string[];
}

export interface ResourceEnvelope {
  max_workers: number;
  max_parallel_tasks: number;
  max_provider_calls: number;
  max_agent_depth: number;
  max_runtime_seconds: number;
  max_retries: number;
}

export interface ExecutionBlueprint {
  blueprint_id: string;
  objective_id: string;
  version: number;
  status: string;
  tasks: Array<{
    task_id: string;
    type: string;
    description: string;
    required_capability: string;
    dependencies: string[];
    economic_envelope?: EconomicEnvelope;
  }>;
  policy_hash: string;
  risk_envelope: RiskEnvelope;
  resource_envelope: ResourceEnvelope;
  simulation_id?: string;
  simulation_timestamp?: string;
  created_at: string;
}

export interface EconomicObjective {
  objective_id: string;
  tenant_id: string;
  description: string;
  owner: string;
  constraints: ObjectiveConstraints;
  deadline?: string;
  economic_budget: string;
  operational_budget: string;
  risk_tolerance: string;
  required_capabilities: string[];
  status: ObjectiveStatus;
  current_blueprint_id?: string;
  blueprint_version?: number;
  active_mission_id?: string;
  active_workflow_id?: string;
  replan_count: number;
  created_at: string;
  updated_at: string;
}

export interface UnifiedEconomicTraceNode {
  stage: string;
  id: string;
  timestamp: string;
  status: string;
  source_of_truth: string;
  details?: Record<string, any>;
}

export interface UnifiedEconomicTrace {
  trace_id: string;
  objective_id: string;
  tenant_id: string;
  started_at: string;
  completed_at?: string;
  nodes: UnifiedEconomicTraceNode[];
}

export interface WhyThisExplanation {
  selected_provider: string;
  selection_rationale: string;
  policy_decision: string;
  policy_rule: string;
  financial_authority: string;
  budget_approved: string;
  rejected_candidates: Array<{ provider_id: string; reason: string }>;
}

export interface WhyNotExplanation {
  blocked_action: string;
  reasons: string[];
  safe_alternatives: string[];
}

export interface AutonomyMetrics {
  automation_rate: number;
  recovery_rate: number;
  human_escalations: number;
  policy_blocks: number;
  financial_actions: number;
  simulated_actions: number;
}

export interface DryRunResult {
  is_dry_run: boolean;
  proposed_action: string;
  target_id: string;
  what_would_change: string[];
  what_would_not_change: string[];
  financial_impact: string;
  policy_impact: string;
  mutated_database: boolean;
}

// Fallback Fixtures
export const FALLBACK_OBJECTIVES: EconomicObjective[] = [
  {
    objective_id: 'obj_prod_audit_01',
    tenant_id: 'tenant_default',
    description: 'Produce a verified security report for provider X cluster and deliver audited telemetry',
    owner: 'operator',
    constraints: {
      deadline: '2026-10-01T18:00:00Z',
      max_budget: '100.00',
      max_parallel_tasks: 4,
      required_capability: 'security-audit',
      minimum_confidence: 0.95,
      required_policy: 'policy_hash_v15_standard',
    },
    deadline: '2026-10-01T18:00:00Z',
    economic_budget: '100.00',
    operational_budget: '100.00',
    risk_tolerance: 'LOW',
    required_capabilities: ['security-audit', 'verification', 'synthesis'],
    status: 'RUNNING',
    current_blueprint_id: 'bp_sec_audit_01',
    blueprint_version: 1,
    active_mission_id: 'msn_sec_01',
    active_workflow_id: 'wf_sec_exec_01',
    replan_count: 0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    objective_id: 'obj_multi_research_02',
    tenant_id: 'tenant_default',
    description: 'Research three decentralized compute providers, benchmark response latency, and synthesize quote matrix',
    owner: 'ai_planner',
    constraints: {
      max_budget: '45.00',
      max_parallel_tasks: 3,
      required_capability: 'market-research',
      minimum_confidence: 0.90,
    },
    economic_budget: '45.00',
    operational_budget: '60.00',
    risk_tolerance: 'MEDIUM',
    required_capabilities: ['market-research', 'benchmarking'],
    status: 'SIMULATED',
    current_blueprint_id: 'bp_research_02',
    blueprint_version: 1,
    replan_count: 0,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    objective_id: 'obj_infra_pentest_03',
    tenant_id: 'tenant_default',
    description: 'Execute automated zero-knowledge verifier benchmark on testnet contract 0x5042...',
    owner: 'sec_team',
    constraints: {
      max_budget: '80.00',
      required_capability: 'zk-verification',
    },
    economic_budget: '80.00',
    operational_budget: '80.00',
    risk_tolerance: 'LOW',
    required_capabilities: ['zk-verification'],
    status: 'COMPLETED',
    current_blueprint_id: 'bp_pentest_03',
    blueprint_version: 2,
    active_mission_id: 'msn_zk_03',
    active_workflow_id: 'wf_zk_03',
    replan_count: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
  },
];

export const FALLBACK_METRICS: AutonomyMetrics = {
  automation_rate: 0.938,
  recovery_rate: 0.974,
  human_escalations: 2,
  policy_blocks: 7,
  financial_actions: 42,
  simulated_actions: 189,
};

export const FALLBACK_TRACE: UnifiedEconomicTrace = {
  trace_id: 'trc_sec_audit_01',
  objective_id: 'obj_prod_audit_01',
  tenant_id: 'tenant_default',
  started_at: new Date(Date.now() - 1800000).toISOString(),
  completed_at: undefined,
  nodes: [
    { stage: 'OBJECTIVE', id: 'obj_prod_audit_01', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'RUNNING', source_of_truth: 'FABRIC_DB' },
    { stage: 'BLUEPRINT', id: 'bp_sec_audit_01', timestamp: new Date(Date.now() - 1750000).toISOString(), status: 'VALIDATED', source_of_truth: 'BLUEPRINT_STORE' },
    { stage: 'SIMULATION', id: 'sim_sec_audit_01', timestamp: new Date(Date.now() - 1700000).toISOString(), status: 'PASSED', source_of_truth: 'SIMULATOR_ENGINE' },
    { stage: 'MISSION', id: 'msn_sec_01', timestamp: new Date(Date.now() - 1600000).toISOString(), status: 'ACTIVE', source_of_truth: 'MISSION_ENGINE' },
    { stage: 'WORKFLOW', id: 'wf_sec_exec_01', timestamp: new Date(Date.now() - 1500000).toISOString(), status: 'RUNNING', source_of_truth: 'DURABLE_RUNTIME' },
    { stage: 'TASK', id: 'task_scan_01', timestamp: new Date(Date.now() - 1400000).toISOString(), status: 'SUCCEEDED', source_of_truth: 'OPERATIONS_OS' },
    { stage: 'AGENT', id: 'agent_scanner_01', timestamp: new Date(Date.now() - 1300000).toISOString(), status: 'ASSIGNED', source_of_truth: 'SWARM_REGISTRY' },
    { stage: 'SERVICE', id: 'svc_prov_alpha', timestamp: new Date(Date.now() - 1200000).toISOString(), status: 'SELECTED', source_of_truth: 'MARKET_CATALOG' },
    { stage: 'CONTRACT', id: 'ctr_task_01', timestamp: new Date(Date.now() - 1100000).toISOString(), status: 'BOUND', source_of_truth: 'A2A_REGISTRY' },
    { stage: 'POLICY', id: 'pol_eval_01', timestamp: new Date(Date.now() - 1000000).toISOString(), status: 'ALLOW', source_of_truth: 'RUST_POLICY_ENGINE' },
    { stage: 'RISK', id: 'risk_eval_01', timestamp: new Date(Date.now() - 950000).toISOString(), status: 'LOW_RISK', source_of_truth: 'RISK_ENGINE' },
    { stage: 'APPROVAL', id: 'appr_01', timestamp: new Date(Date.now() - 900000).toISOString(), status: 'AUTO_APPROVED', source_of_truth: 'APPROVAL_GATE' },
    { stage: 'RESERVATION', id: 'res_liq_01', timestamp: new Date(Date.now() - 800000).toISOString(), status: 'COMMITTED', source_of_truth: 'TREASURY_LEDGER' },
    { stage: 'PAYMENT', id: 'pi_fabric_01', timestamp: new Date(Date.now() - 700000).toISOString(), status: 'AUTHORIZED', source_of_truth: 'PAYMENT_PIPELINE' },
    { stage: 'EXECUTION', id: 'exec_worker_01', timestamp: new Date(Date.now() - 600000).toISOString(), status: 'DISPATCHED', source_of_truth: 'WORKER_LEASES' },
    { stage: 'AGENTVAULT', id: 'vault_0x5042', timestamp: new Date(Date.now() - 500000).toISOString(), status: 'HOLD_CONFIRMED', source_of_truth: 'SOLIDITY_VAULT' },
    { stage: 'ARC', id: 'arc_tx_0x99281a', timestamp: new Date(Date.now() - 400000).toISOString(), status: 'CONFIRMED_BLOCK_184920', source_of_truth: 'ARC_SETTLEMENT' },
    { stage: 'RECEIPT', id: 'rcpt_7718', timestamp: new Date(Date.now() - 300000).toISOString(), status: 'VERIFIED', source_of_truth: 'CLEARINGHOUSE' },
    { stage: 'RECONCILIATION', id: 'recon_batch_12', timestamp: new Date(Date.now() - 200000).toISOString(), status: 'BALANCED', source_of_truth: 'RECON_ENGINE' },
    { stage: 'OBSERVATION', id: 'obs_task_01', timestamp: new Date(Date.now() - 100000).toISOString(), status: 'RECORDED', source_of_truth: 'INTELLIGENCE' },
    { stage: 'LEARNING', id: 'lrn_task_01', timestamp: new Date(Date.now() - 50000).toISOString(), status: 'RECOMMENDATION_EMITTED', source_of_truth: 'ECONOMIC_MEMORY' },
  ],
};

export const FALLBACK_WHY: WhyThisExplanation = {
  selected_provider: 'provider-alpha (VigilSec-AI)',
  selection_rationale: 'Lowest validated quote (18.50 USDC vs 28.00 USDC competitor), 99.4% historical success, latency 210ms within 500ms constraint',
  policy_decision: 'ALLOW',
  policy_rule: 'RULE_BUDGET_CAP_UNDER_100_USDC (INV-141)',
  financial_authority: 'RESERVED_IN_TREASURY',
  budget_approved: '18.50 USDC',
  rejected_candidates: [
    { provider_id: 'provider-beta (CloudGuard)', reason: 'Quote 28.00 USDC exceeds preferred median efficiency baseline' },
    { provider_id: 'provider-gamma (TestLab)', reason: 'Lacks required ISO-compliance capability badge' },
  ],
};

export const FALLBACK_WHY_NOT: WhyNotExplanation = {
  blocked_action: 'REQUEST_PAYMENT_AMOUNT_ELEVATION',
  reasons: [
    'Autonomous budget elevation from 10.00 to 100.00 USDC rejected by INV-148 (EconomicEnvelope cannot self-increase)',
    'Financial authority outside autonomous scope (INV-141)',
    'Policy Hash policy_v15 requires Human Multi-Sig approval for any budget adjustment',
  ],
  safe_alternatives: [
    'Operate within current allocated 18.50 USDC envelope',
    'Submit formal operator proposal for budget expansion',
    'Split mission deliverables into sequential lower-cost milestones',
  ],
};

export async function fetchObjectives(params?: { status?: string; tenant_id?: string }): Promise<EconomicObjective[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.tenant_id) qs.append('tenant_id', params.tenant_id);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await apiRequest<{ objectives: EconomicObjective[] }>(`/v1/fabric/objectives${query}`);
    return res.objectives || FALLBACK_OBJECTIVES;
  } catch {
    return FALLBACK_OBJECTIVES;
  }
}

export async function fetchObjective(id: string): Promise<EconomicObjective> {
  try {
    const res = await apiRequest<{ objective: EconomicObjective }>(`/v1/fabric/objectives/${id}`);
    return res.objective || FALLBACK_OBJECTIVES.find((o) => o.objective_id === id) || FALLBACK_OBJECTIVES[0];
  } catch {
    return FALLBACK_OBJECTIVES.find((o) => o.objective_id === id) || FALLBACK_OBJECTIVES[0];
  }
}

export async function createObjective(payload: Partial<EconomicObjective>): Promise<EconomicObjective> {
  try {
    const res = await apiRequest<EconomicObjective>('/v1/fabric/objectives', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  } catch {
    const mock: EconomicObjective = {
      objective_id: `obj_mock_${Date.now().toString().slice(-4)}`,
      tenant_id: payload.tenant_id || 'tenant_default',
      description: payload.description || 'Custom objective',
      owner: payload.owner || 'operator',
      constraints: payload.constraints || {},
      economic_budget: payload.economic_budget || '100.00',
      operational_budget: payload.operational_budget || '100.00',
      risk_tolerance: payload.risk_tolerance || 'MEDIUM',
      required_capabilities: payload.required_capabilities || [],
      status: 'DRAFT',
      replan_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return mock;
  }
}

export async function planObjective(id: string, dryRun: boolean = false): Promise<any> {
  try {
    return await apiRequest(`/v1/fabric/objectives/${id}/plan${dryRun ? '?dry_run=true' : ''}`, { method: 'POST' });
  } catch {
    return {
      status: 'PLANNED',
      objective_id: id,
      blueprint: {
        blueprint_id: `bp_${id}`,
        objective_id: id,
        version: 1,
        status: 'VALIDATED',
        tasks: [
          { task_id: 't1', type: 'DISCOVER', description: 'Discover candidates', required_capability: 'discovery', dependencies: [] },
          { task_id: 't2', type: 'BENCHMARK', description: 'Benchmark candidate', required_capability: 'benchmark', dependencies: ['t1'] },
          { task_id: 't3', type: 'SYNTHESIS', description: 'Synthesize report', required_capability: 'synthesis', dependencies: ['t2'] },
        ],
        policy_hash: 'pol_hash_validated_v15',
        risk_envelope: { max_risk_score: 25, allowed_risk_classes: ['LOW'], escalation_threshold: 40, minimum_confidence: 0.9, security_requirements: ['TLS1.3'] },
        resource_envelope: { max_workers: 4, max_parallel_tasks: 3, max_provider_calls: 10, max_agent_depth: 2, max_runtime_seconds: 300, max_retries: 3 },
        created_at: new Date().toISOString(),
      },
    };
  }
}

export async function simulateObjective(id: string, dryRun: boolean = false): Promise<any> {
  try {
    return await apiRequest(`/v1/fabric/objectives/${id}/simulate${dryRun ? '?dry_run=true' : ''}`, { method: 'POST' });
  } catch {
    return {
      objective_id: id,
      status: 'SIMULATED',
      simulation_id: `sim_${Date.now().toString().slice(-4)}`,
      expected_cost: '24.50',
      expected_duration: '42s',
      max_exposure: '35.00',
      failure_probability: 0.04,
      policy_decision: 'ALLOW',
      liquidity_ok: true,
      candidate_providers: ['provider-alpha (VigilSec)', 'provider-beta (CloudGuard)'],
    };
  }
}

export async function startObjective(id: string, dryRun: boolean = false): Promise<any> {
  try {
    return await apiRequest(`/v1/fabric/objectives/${id}/start${dryRun ? '?dry_run=true' : ''}`, { method: 'POST' });
  } catch {
    return {
      objective_id: id,
      status: 'RUNNING',
      mission_id: `msn_${id}`,
      workflow_id: `wf_${id}`,
      financial_authority: 'UNCHANGED (INV-141)',
    };
  }
}

export async function pauseObjective(id: string, reason?: string, dryRun: boolean = false): Promise<any> {
  try {
    return await apiRequest(`/v1/fabric/objectives/${id}/pause${dryRun ? '?dry_run=true' : ''}`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Operator pause' }),
    });
  } catch {
    return { objective_id: id, status: 'WAITING', reason };
  }
}

export async function resumeObjective(id: string, dryRun: boolean = false): Promise<any> {
  try {
    return await apiRequest(`/v1/fabric/objectives/${id}/resume${dryRun ? '?dry_run=true' : ''}`, { method: 'POST' });
  } catch {
    return { objective_id: id, status: 'RUNNING' };
  }
}

export async function replanObjective(id: string, reason: string, dryRun: boolean = false): Promise<any> {
  try {
    return await apiRequest(`/v1/fabric/objectives/${id}/replan${dryRun ? '?dry_run=true' : ''}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  } catch {
    return {
      objective_id: id,
      status: 'RUNNING',
      replan_count: 1,
      version: 2,
      reason,
      financial_authority: 'UNCHANGED (INV-145)',
    };
  }
}

export async function cancelObjective(id: string, reason?: string, dryRun: boolean = false): Promise<any> {
  try {
    return await apiRequest(`/v1/fabric/objectives/${id}/cancel${dryRun ? '?dry_run=true' : ''}`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Operator cancelled' }),
    });
  } catch {
    return { objective_id: id, status: 'CANCELLED', reason };
  }
}

export async function fetchObjectiveTrace(id: string): Promise<UnifiedEconomicTrace> {
  try {
    const res = await apiRequest<{ trace: UnifiedEconomicTrace }>(`/v1/fabric/objectives/${id}/trace`);
    return res.trace || FALLBACK_TRACE;
  } catch {
    return { ...FALLBACK_TRACE, objective_id: id };
  }
}

export async function fetchObjectiveWhy(id: string): Promise<WhyThisExplanation> {
  try {
    const res = await apiRequest<{ why: WhyThisExplanation }>(`/v1/fabric/objectives/${id}/why`);
    return res.why || FALLBACK_WHY;
  } catch {
    return FALLBACK_WHY;
  }
}

export async function fetchObjectiveWhyNot(id: string): Promise<WhyNotExplanation> {
  try {
    const res = await apiRequest<{ why_not: WhyNotExplanation }>(`/v1/fabric/objectives/${id}/why-not`);
    return res.why_not || FALLBACK_WHY_NOT;
  } catch {
    return FALLBACK_WHY_NOT;
  }
}

export async function fetchObjectiveState(id: string): Promise<any> {
  try {
    return await apiRequest(`/v1/fabric/objectives/${id}/state`);
  } catch {
    return {
      objective_id: id,
      objective_status: 'RUNNING',
      mission_status: 'ACTIVE',
      workflow_status: 'RUNNING',
      financial_status: 'RESERVED',
      treasury_status: 'LIQUIDITY_SECURED',
      arc_settlement_status: 'PENDING_DELIVERABLE',
      source_of_truth_map: {
        financial: 'TREASURY_AND_CLEARINGHOUSE',
        workflow: 'DURABLE_CHECKPOINT_STORE',
        fabric: 'FABRIC_DATABASE',
      },
    };
  }
}

export async function fetchAutonomyMetrics(): Promise<AutonomyMetrics> {
  try {
    const res = await apiRequest<AutonomyMetrics>('/v1/fabric/metrics');
    return res || FALLBACK_METRICS;
  } catch {
    return FALLBACK_METRICS;
  }
}
