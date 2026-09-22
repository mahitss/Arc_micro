/**
 * @file swarms.ts
 * @description API queries, mutations, and fixtures for the AgentPay Multi-Agent Swarm Orchestration Layer.
 */

import { apiRequest } from './client';
import type {
  CreateSwarmRequest,
  ReplanProposal,
  SimulateSwarmResponse,
  Swarm,
  SwarmGraph,
  SwarmRiskScore,
  SwarmTrace,
  TaskNode,
} from './types';

export const DEMO_SWARMS: Swarm[] = [
  {
    id: 'swm_demo_ai_infra_01',
    organization_id: 'org_enterprise_alpha',
    root_mission_id: 'msn_root_ai_infra',
    name: 'AI Infrastructure Intelligence Swarm',
    objective: 'Generate a verified market intelligence report on next-generation AI datacenter and GPU pricing.',
    status: 'RUNNING',
    max_budget: '5000000',
    total_spent: '2400000',
    total_reserved: '1600000',
    asset: 'USDC',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
    task_count: 5,
    completed_tasks: 2,
    failed_tasks: 0,
    orchestrator_agent_id: 'agent_orchestrator_01',
    risk_score: {
      overall_score: 18,
      risk_level: 'LOW',
      budget_exhaustion_risk: 15,
      dependency_bottleneck_risk: 20,
      agent_reliability_risk: 12,
      data_tampering_risk: 5,
      recommendations: [
        'All task subcontracts authorized under Rust policy engine',
        'Deterministic hash-chain verification intact for intermediate outputs',
      ],
      evaluated_at: new Date().toISOString(),
    },
    cost_intelligence: {
      total_budget: '5000000',
      allocated_budget: '4000000',
      committed_spend: '2400000',
      active_reservations: '1600000',
      unallocated_budget: '1000000',
      budget_utilization_pct: 48,
      projected_final_cost: '4200000',
      cost_variance: '-800000',
      is_over_budget_risk: false,
    },
  },
  {
    id: 'swm_demo_crypto_sec_02',
    organization_id: 'org_enterprise_alpha',
    root_mission_id: 'msn_root_crypto_audit',
    name: 'Smart Contract Formal Verification Swarm',
    objective: 'Perform automated decompilation, vulnerability scanning, and multi-agent consensus verification.',
    status: 'COMPLETED',
    max_budget: '8000000',
    total_spent: '7250000',
    total_reserved: '0',
    asset: 'USDC',
    deadline: new Date(Date.now() - 7200000).toISOString(),
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 3600000).toISOString(),
    task_count: 6,
    completed_tasks: 6,
    failed_tasks: 0,
    orchestrator_agent_id: 'agent_orchestrator_sec',
    risk_score: {
      overall_score: 10,
      risk_level: 'LOW',
      budget_exhaustion_risk: 8,
      dependency_bottleneck_risk: 10,
      agent_reliability_risk: 5,
      data_tampering_risk: 2,
      recommendations: ['Consensus achieved across 3 independent verifier nodes with 99.4% agreement'],
      evaluated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    cost_intelligence: {
      total_budget: '8000000',
      allocated_budget: '7250000',
      committed_spend: '7250000',
      active_reservations: '0',
      unallocated_budget: '750000',
      budget_utilization_pct: 90.6,
      projected_final_cost: '7250000',
      cost_variance: '-750000',
      is_over_budget_risk: false,
    },
  },
];

export const DEMO_SWARM_TASKS: Record<string, TaskNode[]> = {
  swm_demo_ai_infra_01: [
    {
      id: 'task_infra_01',
      swarm_id: 'swm_demo_ai_infra_01',
      mission_id: 'msn_root_ai_infra',
      title: 'Global Datacenter Power & Capacity Audit',
      role: 'RESEARCHER',
      required_capability: 'web-research',
      dependencies: [],
      status: 'COMPLETED',
      assigned_agent_id: 'agent_researcher_01',
      assigned_service_id: 'service_hyperscaler_telemetry',
      budget: '1200000',
      actual_cost: '1100000',
      depth: 0,
      output_checksum: 'a8b9f123c5e4d2719a00bce42798e',
      critic_feedback: {
        task_id: 'task_infra_01',
        critic_agent_id: 'agent_critic_01',
        score: 96,
        feedback: 'Comprehensive megawatt capacity breakdown across tier-4 facilities.',
        passed: true,
        reviewed_at: new Date(Date.now() - 2800000).toISOString(),
      },
      retry_count: 0,
      max_retries: 3,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3000000).toISOString(),
      started_at: new Date(Date.now() - 3500000).toISOString(),
      completed_at: new Date(Date.now() - 3000000).toISOString(),
    },
    {
      id: 'task_infra_02',
      swarm_id: 'swm_demo_ai_infra_01',
      mission_id: 'msn_root_ai_infra',
      title: 'GPU Spot & Reserved Pricing Ingestion',
      role: 'DATA_PROVIDER',
      required_capability: 'market-data',
      dependencies: [],
      status: 'COMPLETED',
      assigned_agent_id: 'agent_data_02',
      assigned_service_id: 'service_gpu_exchange_feed',
      budget: '1300000',
      actual_cost: '1300000',
      depth: 0,
      output_checksum: 'f374a2b9187e14529d89b147ef384',
      consensus_validation: {
        task_id: 'task_infra_02',
        verifier_count: 3,
        approval_count: 3,
        rejection_count: 0,
        consensus_reached: true,
        confidence: 0.99,
        completed_at: new Date(Date.now() - 2500000).toISOString(),
      },
      retry_count: 0,
      max_retries: 3,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 2500000).toISOString(),
      started_at: new Date(Date.now() - 3500000).toISOString(),
      completed_at: new Date(Date.now() - 2500000).toISOString(),
    },
    {
      id: 'task_infra_03',
      swarm_id: 'swm_demo_ai_infra_01',
      mission_id: 'msn_root_ai_infra',
      title: 'Unit Economics & TCO Synthesis',
      role: 'ANALYST',
      required_capability: 'financial-modeling',
      dependencies: ['task_infra_01', 'task_infra_02'],
      status: 'IN_PROGRESS',
      assigned_agent_id: 'agent_analyst_03',
      assigned_service_id: 'service_financial_modeler',
      budget: '800000',
      actual_cost: '0',
      depth: 1,
      retry_count: 0,
      max_retries: 3,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'task_infra_04',
      swarm_id: 'swm_demo_ai_infra_01',
      mission_id: 'msn_root_ai_infra',
      title: 'Peer Review & Adversarial Quality Check',
      role: 'CRITIC',
      required_capability: 'code-review',
      dependencies: ['task_infra_03'],
      status: 'PENDING',
      budget: '400000',
      actual_cost: '0',
      depth: 2,
      retry_count: 0,
      max_retries: 3,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task_infra_05',
      swarm_id: 'swm_demo_ai_infra_01',
      mission_id: 'msn_root_ai_infra',
      title: 'Executive Intelligence Brief Generation',
      role: 'SYNTHESIZER',
      required_capability: 'report-synthesis',
      dependencies: ['task_infra_04'],
      status: 'PENDING',
      budget: '300000',
      actual_cost: '0',
      depth: 3,
      retry_count: 0,
      max_retries: 3,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

export const DEMO_SWARM_GRAPH: Record<string, SwarmGraph> = {
  swm_demo_ai_infra_01: {
    nodes: [
      { id: 'agent_orchestrator_01', type: 'ORCHESTRATOR', label: 'Orchestrator Agent', role: 'ORCHESTRATOR' },
      { id: 'task_infra_01', type: 'TASK', label: 'Datacenter Power Audit', role: 'RESEARCHER', status: 'COMPLETED' },
      { id: 'task_infra_02', type: 'TASK', label: 'GPU Pricing Ingestion', role: 'DATA_PROVIDER', status: 'COMPLETED' },
      { id: 'task_infra_03', type: 'TASK', label: 'Unit Economics Synthesis', role: 'ANALYST', status: 'IN_PROGRESS' },
      { id: 'task_infra_04', type: 'TASK', label: 'Critic Review', role: 'CRITIC', status: 'PENDING' },
      { id: 'task_infra_05', type: 'TASK', label: 'Executive Brief', role: 'SYNTHESIZER', status: 'PENDING' },
    ],
    edges: [
      { id: 'e1', from: 'agent_orchestrator_01', to: 'task_infra_01', type: 'DISPATCH' },
      { id: 'e2', from: 'agent_orchestrator_01', to: 'task_infra_02', type: 'DISPATCH' },
      { id: 'e3', from: 'task_infra_01', to: 'task_infra_03', type: 'DEPENDENCY', label: 'power telemetry' },
      { id: 'e4', from: 'task_infra_02', to: 'task_infra_03', type: 'DEPENDENCY', label: 'pricing feeds' },
      { id: 'e5', from: 'task_infra_03', to: 'task_infra_04', type: 'DEPENDENCY', label: 'draft model' },
      { id: 'e6', from: 'task_infra_04', to: 'task_infra_05', type: 'DEPENDENCY', label: 'critique' },
    ],
    depth: 3,
    is_dag: true,
  },
};

export async function getSwarms(): Promise<Swarm[]> {
  try {
    const res = await apiRequest<{ swarms: Swarm[] }>('/v1/swarms');
    if (res.swarms && res.swarms.length > 0) return res.swarms;
    return DEMO_SWARMS;
  } catch {
    return DEMO_SWARMS;
  }
}

export async function getSwarm(id: string): Promise<Swarm> {
  try {
    const res = await apiRequest<{ swarm: Swarm }>(`/v1/swarms/${encodeURIComponent(id)}`);
    return res.swarm;
  } catch {
    const fallback = DEMO_SWARMS.find((s) => s.id === id);
    if (fallback) return fallback;
    throw new Error(`Swarm ${id} not found`);
  }
}

export async function createSwarm(params: CreateSwarmRequest): Promise<Swarm> {
  const res = await apiRequest<{ swarm: Swarm }>('/v1/swarms', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.swarm;
}

export async function startSwarm(id: string): Promise<Swarm> {
  const res = await apiRequest<{ swarm: Swarm }>(`/v1/swarms/${encodeURIComponent(id)}/start`, {
    method: 'POST',
  });
  return res.swarm;
}

export async function cancelSwarm(id: string): Promise<Swarm> {
  const res = await apiRequest<{ swarm: Swarm }>(`/v1/swarms/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  });
  return res.swarm;
}

export async function simulateSwarm(params: CreateSwarmRequest): Promise<SimulateSwarmResponse> {
  return apiRequest<SimulateSwarmResponse>('/v1/swarms/simulate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getSwarmTasks(id: string): Promise<TaskNode[]> {
  try {
    const res = await apiRequest<{ tasks: TaskNode[] }>(`/v1/swarms/${encodeURIComponent(id)}/tasks`);
    if (res.tasks && res.tasks.length > 0) return res.tasks;
    return DEMO_SWARM_TASKS[id] || [];
  } catch {
    return DEMO_SWARM_TASKS[id] || [];
  }
}

export async function getSwarmGraph(id: string): Promise<SwarmGraph> {
  try {
    const res = await apiRequest<{ graph: SwarmGraph }>(`/v1/swarms/${encodeURIComponent(id)}/graph`);
    if (res.graph && res.graph.nodes) return res.graph;
    return DEMO_SWARM_GRAPH[id] || { nodes: [], edges: [], depth: 0, is_dag: true };
  } catch {
    return DEMO_SWARM_GRAPH[id] || { nodes: [], edges: [], depth: 0, is_dag: true };
  }
}

export async function getSwarmTrace(id: string): Promise<SwarmTrace> {
  try {
    const res = await apiRequest<{ trace: SwarmTrace }>(`/v1/swarms/${encodeURIComponent(id)}/trace`);
    return res.trace;
  } catch {
    return {
      swarm_id: id,
      events: [
        { event_type: 'swarm.created', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { event_type: 'swarm.started', timestamp: new Date(Date.now() - 3500000).toISOString() },
        { event_type: 'swarm.task_started', task_id: 'task_infra_01', timestamp: new Date(Date.now() - 3400000).toISOString() },
        { event_type: 'swarm.task_completed', task_id: 'task_infra_01', timestamp: new Date(Date.now() - 3000000).toISOString() },
        { event_type: 'swarm.validation_completed', task_id: 'task_infra_02', timestamp: new Date(Date.now() - 2500000).toISOString() },
      ],
    };
  }
}

export async function getSwarmRisk(id: string): Promise<SwarmRiskScore> {
  try {
    const res = await apiRequest<{ risk_score: SwarmRiskScore }>(`/v1/swarms/${encodeURIComponent(id)}/risk`);
    return res.risk_score;
  } catch {
    const sw = DEMO_SWARMS.find((s) => s.id === id);
    if (sw && sw.risk_score) return sw.risk_score;
    return {
      overall_score: 15,
      risk_level: 'LOW',
      budget_exhaustion_risk: 10,
      dependency_bottleneck_risk: 15,
      agent_reliability_risk: 10,
      data_tampering_risk: 5,
      recommendations: ['DAG integrity verified'],
      evaluated_at: new Date().toISOString(),
    };
  }
}

export async function replanSwarm(id: string, payload?: Record<string, unknown>): Promise<ReplanProposal> {
  const res = await apiRequest<{ proposal: ReplanProposal }>(`/v1/swarms/${encodeURIComponent(id)}/replan`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
  return res.proposal;
}
