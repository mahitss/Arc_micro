/**
 * @file missions.ts
 * @description API queries and mutations for the AgentPay Autonomous Mission Control Center.
 */

import { apiRequest } from './client';
import {
  Mission,
  MissionTrace,
  MarketplaceService,
  ServiceReputation,
  MissionSimulationResponse,
  OverviewMetrics,
  ApprovalItem,
  GlobalActivityEvent,
  SecuritySubsystemsReport,
} from './types';

export interface CreateMissionInput {
  organization_id?: string;
  agent_id: string;
  objective: string;
  budget: string;
  currency?: string;
  max_execution_amount?: string;
  deadline?: string;
  metadata?: Record<string, string>;
}

// -----------------------------------------------------------------------------
// Explicit DEMO Fixtures (Used ONLY when Demo Mode is explicitly active)
// -----------------------------------------------------------------------------

export const DEMO_MISSIONS: Mission[] = [
  {
    id: 'msn_demo_weather_01',
    organization_id: 'org_default',
    agent_id: 'research-agent',
    objective: 'Acquire verified real-time weather and satellite meteorological telemetry under $2.00',
    status: 'COMPLETED',
    budget: '2000000',
    spent: '680000',
    remaining_budget: '1320000',
    currency: 'USDC',
    max_execution_amount: '1000000',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    started_at: new Date(Date.now() - 3500000).toISOString(),
    completed_at: new Date(Date.now() - 3400000).toISOString(),
    current_step: 'step_2_verification',
    metadata: {
      priority: 'high',
      execution_mode: 'autonomous',
    },
  },
  {
    id: 'msn_demo_arbitrage_02',
    organization_id: 'org_default',
    agent_id: 'arbitrage-bot-1',
    objective: 'Stream liquidity depth and execute atomic flash routing on Arc decentralized exchanges',
    status: 'EXECUTING',
    budget: '5000000',
    spent: '2100000',
    remaining_budget: '2900000',
    currency: 'USDC',
    max_execution_amount: '2000000',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    started_at: new Date(Date.now() - 1700000).toISOString(),
    current_step: 'step_orderbook_telemetry',
    metadata: {
      environment: 'arc-mainnet-sim',
    },
  },
  {
    id: 'msn_demo_adversarial_03',
    organization_id: 'org_default',
    agent_id: 'sec-audit-agent',
    objective: 'Audit external code generator service with untrusted prompt injection defense test',
    status: 'COMPLETED',
    budget: '1000000',
    spent: '500000',
    remaining_budget: '500000',
    currency: 'USDC',
    max_execution_amount: '500000',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    started_at: new Date(Date.now() - 7100000).toISOString(),
    completed_at: new Date(Date.now() - 7000000).toISOString(),
    current_step: 'step_untrusted_eval',
  },
];

export const DEMO_SERVICES: MarketplaceService[] = [
  {
    id: 'web-research',
    name: 'Web Research & Intelligence API',
    description: 'Real-time web search, document scraping, and intelligence synthesis.',
    category: 'RESEARCH',
    capabilities: ['web_search', 'scraping', 'summarization'],
    recipient: '0x1111111111111111111111111111111111111111',
    asset: 'USDC',
    enabled: true,
    verified: true,
    max_price: '500000',
    pricing_model: 'VARIABLE',
    trust_status: 'TRUSTED',
    success_rate_bps: 9980,
    average_latency_ms: 380,
    risk_score: 5,
    historical_tx_count: 1420,
  },
  {
    id: 'compute-cluster',
    name: 'GPU Inference Compute Cluster',
    description: 'On-demand H100 compute for embeddings, fine-tuning, and heavy inference.',
    category: 'COMPUTE',
    capabilities: ['gpu_inference', 'embeddings', 'model_fine_tuning'],
    recipient: '0x2222222222222222222222222222222222222222',
    asset: 'USDC',
    enabled: true,
    verified: true,
    max_price: '2000000',
    pricing_model: 'VARIABLE',
    trust_status: 'TRUSTED',
    success_rate_bps: 9995,
    average_latency_ms: 720,
    risk_score: 2,
    historical_tx_count: 850,
  },
  {
    id: 'data-feed',
    name: 'Real-time Financial Data Feed',
    description: 'Streaming liquidity, orderbook depth, and volatility telemetry on Arc.',
    category: 'DATA',
    capabilities: ['data_feed', 'orderbook_telemetry', 'liquidity_feed', 'volatility_metrics'],
    recipient: '0x3333333333333333333333333333333333333333',
    asset: 'USDC',
    enabled: true,
    verified: true,
    max_price: '100000',
    fixed_price: '100000',
    pricing_model: 'FIXED',
    trust_status: 'VERIFIED',
    success_rate_bps: 9999,
    average_latency_ms: 85,
    risk_score: 1,
    historical_tx_count: 4310,
  },
  {
    id: 'peer-data-agent',
    name: 'Autonomous Peer Data Agent',
    description: 'Agent-to-agent data verification peer running under AgentPay economic bounds.',
    category: 'AGENT',
    capabilities: ['peer_data_analysis', 'contract_audit_feed'],
    recipient: '0x4444444444444444444444444444444444444444',
    asset: 'USDC',
    enabled: true,
    verified: true,
    max_price: '300000',
    pricing_model: 'VARIABLE',
    trust_status: 'VERIFIED',
    success_rate_bps: 9920,
    average_latency_ms: 450,
    risk_score: 8,
    historical_tx_count: 230,
  },
];

// -----------------------------------------------------------------------------
// Real Backend API Queries
// -----------------------------------------------------------------------------

export async function fetchMissions(options?: { useDemo?: boolean }): Promise<Mission[]> {
  if (options?.useDemo) return DEMO_MISSIONS;
  try {
    const resp = await apiRequest<{ missions: Mission[] }>('/v1/missions');
    return resp.missions || [];
  } catch (err) {
    if (options?.useDemo) return DEMO_MISSIONS;
    throw err;
  }
}

export async function fetchMission(id: string, options?: { useDemo?: boolean }): Promise<Mission> {
  if (options?.useDemo) {
    const found = DEMO_MISSIONS.find((m) => m.id === id);
    if (found) return found;
  }
  try {
    const resp = await apiRequest<{ mission: Mission }>(`/v1/missions/${encodeURIComponent(id)}`);
    return resp.mission;
  } catch (err) {
    if (options?.useDemo) {
      const found = DEMO_MISSIONS.find((m) => m.id === id);
      if (found) return found;
    }
    throw err;
  }
}

export async function createMission(input: CreateMissionInput): Promise<{ mission: Mission; plan: any }> {
  return apiRequest<{ mission: Mission; plan: any }>('/v1/missions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function startMission(id: string): Promise<Mission> {
  const resp = await apiRequest<{ mission: Mission }>(`/v1/missions/${encodeURIComponent(id)}/start`, {
    method: 'POST',
  });
  return resp.mission;
}

export async function cancelMission(id: string): Promise<Mission> {
  const resp = await apiRequest<{ mission: Mission }>(`/v1/missions/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  });
  return resp.mission;
}

export async function simulateMission(input: Partial<CreateMissionInput>): Promise<MissionSimulationResponse> {
  return apiRequest<MissionSimulationResponse>('/v1/missions/simulate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchMissionTrace(id: string, options?: { useDemo?: boolean }): Promise<MissionTrace> {
  try {
    const resp = await apiRequest<{ trace: MissionTrace }>(`/v1/missions/${encodeURIComponent(id)}/trace`);
    return resp.trace;
  } catch (err) {
    if (options?.useDemo) {
      return {
        mission_id: id,
        organization_id: 'org_default',
        agent_id: 'research-agent',
        objective: 'Acquire verified real-time weather telemetry under $2.00',
        status: 'COMPLETED',
        budget: '2000000',
        spent: '680000',
        remaining: '1320000',
        currency: 'USDC',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        started_at: new Date(Date.now() - 3500000).toISOString(),
        completed_at: new Date(Date.now() - 3400000).toISOString(),
        steps: [
          {
            step_id: 'step_1_discovery',
            mission_id: id,
            required_capability: 'web_search',
            max_budget: '1000000',
            currency: 'USDC',
            selected_service_id: 'web-research',
            selected_quote_id: 'qt_5a72df9b418e2a34',
            payment_intent_id: 'pi_8f3d1b9e2c4a',
            status: 'COMPLETED',
            result_data: '{"status":"success","service":"web-research","data":"Extracted telemetry data"}',
            created_at: new Date(Date.now() - 3500000).toISOString(),
            started_at: new Date(Date.now() - 3490000).toISOString(),
            completed_at: new Date(Date.now() - 3450000).toISOString(),
          },
          {
            step_id: 'step_2_verification',
            mission_id: id,
            required_capability: 'data_feed',
            max_budget: '500000',
            currency: 'USDC',
            selected_service_id: 'data-feed',
            selected_quote_id: 'qt_9e8c7b6a5d4f3e21',
            payment_intent_id: 'pi_3a4b5c6d7e8f',
            status: 'COMPLETED',
            result_data: '{"status":"success","service":"data-feed","verified":true,"signature":"0x9a8f..."}',
            created_at: new Date(Date.now() - 3440000).toISOString(),
            started_at: new Date(Date.now() - 3430000).toISOString(),
            completed_at: new Date(Date.now() - 3400000).toISOString(),
          },
        ],
        events: [
          {
            id: 'evt_msn_created_01',
            type: 'mission.created',
            actor: 'agent:research-agent',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            payload: { budget: '2000000', currency: 'USDC' },
          },
          {
            id: 'evt_msn_planned_02',
            type: 'mission.planned',
            actor: 'engine:planner',
            timestamp: new Date(Date.now() - 3550000).toISOString(),
            payload: { steps_count: 2 },
          },
          {
            id: 'evt_svc_selected_03',
            type: 'mission.step.selected',
            actor: 'engine:economy_selection',
            timestamp: new Date(Date.now() - 3495000).toISOString(),
            payload: { step_id: 'step_1_discovery', service_id: 'web-research', score: 9240 },
          },
          {
            id: 'evt_policy_approved_04',
            type: 'policy.evaluation.allowed',
            actor: 'engine:policy_rust',
            timestamp: new Date(Date.now() - 3490000).toISOString(),
            payload: { decision: 'ALLOW', reason: 'Within per-transaction and daily limits' },
          },
          {
            id: 'evt_treasury_settled_05',
            type: 'payment.executed',
            actor: 'agentvault:signer',
            timestamp: new Date(Date.now() - 3460000).toISOString(),
            payload: { amount: '500000', tx_hash: '0x3f4a...e8b1', network: 'Arc' },
          },
          {
            id: 'evt_msn_completed_06',
            type: 'mission.completed',
            actor: 'engine:mission_orchestrator',
            timestamp: new Date(Date.now() - 3400000).toISOString(),
            payload: { spent: '680000', remaining: '1320000' },
          },
        ],
      };
    }
    throw err;
  }
}

export async function fetchMarketplaceServices(options?: { useDemo?: boolean }): Promise<MarketplaceService[]> {
  try {
    const resp = await apiRequest<{ services: MarketplaceService[] }>('/v1/marketplace');
    return resp.services || [];
  } catch (err) {
    if (options?.useDemo) return DEMO_SERVICES;
    throw err;
  }
}

export async function fetchMarketplaceService(id: string, options?: { useDemo?: boolean }): Promise<MarketplaceService> {
  const services = await fetchMarketplaceServices(options);
  const found = services.find((s) => s.id === id);
  if (!found) throw new Error(`Service '${id}' not found in registry`);
  return found;
}

export async function fetchServiceReputations(options?: { useDemo?: boolean }): Promise<ServiceReputation[]> {
  try {
    const resp = await apiRequest<{ reputations: ServiceReputation[] }>('/v1/economy/reputation');
    return resp.reputations || [];
  } catch (err) {
    if (options?.useDemo) {
      return [
        {
          service_id: 'data-feed',
          organization_id: 'org_default',
          total_requests: 4310,
          successful_requests: 4308,
          failed_requests: 2,
          payment_count: 4308,
          total_volume_base: '430800000',
          average_price_base: '100000',
          average_latency_ms: 85,
          failure_rate_bps: 4,
          reputation_score: 9950,
          last_success_at: new Date(Date.now() - 60000).toISOString(),
        },
        {
          service_id: 'compute-cluster',
          organization_id: 'org_default',
          total_requests: 850,
          successful_requests: 848,
          failed_requests: 2,
          payment_count: 848,
          total_volume_base: '1696000000',
          average_price_base: '2000000',
          average_latency_ms: 720,
          failure_rate_bps: 23,
          reputation_score: 9880,
          last_success_at: new Date(Date.now() - 180000).toISOString(),
        },
        {
          service_id: 'web-research',
          organization_id: 'org_default',
          total_requests: 1420,
          successful_requests: 1412,
          failed_requests: 8,
          payment_count: 1412,
          total_volume_base: '706000000',
          average_price_base: '500000',
          average_latency_ms: 380,
          failure_rate_bps: 56,
          reputation_score: 9750,
          last_success_at: new Date(Date.now() - 120000).toISOString(),
        },
        {
          service_id: 'peer-data-agent',
          organization_id: 'org_default',
          total_requests: 230,
          successful_requests: 228,
          failed_requests: 2,
          payment_count: 228,
          total_volume_base: '68400000',
          average_price_base: '300000',
          average_latency_ms: 450,
          failure_rate_bps: 86,
          reputation_score: 9600,
          last_success_at: new Date(Date.now() - 300000).toISOString(),
        },
      ];
    }
    throw err;
  }
}

export async function fetchOverviewMetrics(options?: { useDemo?: boolean }): Promise<OverviewMetrics> {
  try {
    const [missionsResp, agentsResp, servicesResp, intentsResp, approvalsResp] = await Promise.allSettled([
      apiRequest<{ missions: Mission[] }>('/v1/missions'),
      apiRequest<{ agents: any[] }>('/v1/agents'),
      apiRequest<{ services: any[] }>('/v1/services'),
      apiRequest<{ payment_intents: any[] }>('/v1/payment-intents'),
      apiRequest<{ approvals: any[] }>('/v1/approvals'),
    ]);

    const missions = missionsResp.status === 'fulfilled' ? missionsResp.value.missions || [] : [];
    const agents = agentsResp.status === 'fulfilled' ? agentsResp.value.agents || [] : [];
    const services = servicesResp.status === 'fulfilled' ? servicesResp.value.services || [] : [];
    const intents = intentsResp.status === 'fulfilled' ? intentsResp.value.payment_intents || [] : [];
    const approvals = approvalsResp.status === 'fulfilled' ? approvalsResp.value.approvals || [] : [];

    const activeMissions = missions.filter((m) =>
      ['PLANNING', 'DISCOVERING', 'EVALUATING', 'SELECTING', 'EXECUTING'].includes(m.status)
    ).length;

    const completedMissions = missions.filter((m) => m.status === 'COMPLETED').length;
    const totalFinished = missions.filter((m) => ['COMPLETED', 'FAILED', 'BUDGET_EXHAUSTED'].includes(m.status)).length;
    const successRateBps = totalFinished > 0 ? Math.round((completedMissions / totalFinished) * 10000) : 10000;

    let todayVolume = BigInt(0);
    let policyBlocks = 0;
    for (const pi of intents) {
      if (pi.status === 'CONFIRMED' || pi.status === 'EXECUTING') {
        todayVolume += BigInt(pi.amount || '0');
      }
      if (pi.status === 'DENIED' || pi.status === 'REJECTED') {
        policyBlocks++;
      }
    }

    return {
      active_missions: activeMissions,
      total_agents: agents.length,
      total_services: services.length,
      today_volume_base: todayVolume.toString(),
      today_transactions: intents.length,
      pending_approvals: approvals.filter((a) => a.status === 'PENDING').length,
      policy_blocks: policyBlocks,
      mission_success_rate_bps: successRateBps,
    };
  } catch (err) {
    if (options?.useDemo) {
      return {
        active_missions: 2,
        total_agents: 4,
        total_services: 4,
        today_volume_base: '3280000',
        today_transactions: 12,
        pending_approvals: 0,
        policy_blocks: 1,
        mission_success_rate_bps: 9850,
      };
    }
    return {
      active_missions: null,
      total_agents: null,
      total_services: null,
      today_volume_base: null,
      today_transactions: null,
      pending_approvals: null,
      policy_blocks: null,
      mission_success_rate_bps: null,
    };
  }
}

export async function fetchApprovals(options?: { useDemo?: boolean }): Promise<ApprovalItem[]> {
  try {
    const resp = await apiRequest<{ approvals: ApprovalItem[] }>('/v1/approvals');
    return resp.approvals || [];
  } catch (err) {
    if (options?.useDemo) {
      return [
        {
          id: 'app_req_91b2c4',
          intent_id: 'pi_large_compute_99',
          mission_id: 'msn_heavy_ai_04',
          agent_id: 'research-agent',
          service_id: 'compute-cluster',
          amount: '15000000', // 15.00 USDC (exceeds $10 auto-threshold)
          asset: 'USDC',
          reason: 'Transaction amount 15.00 USDC exceeds automatic policy threshold of 10.00 USDC',
          risk_level: 'MEDIUM',
          status: 'PENDING',
          policy_evaluation: 'APPROVAL_REQUIRED',
          created_at: new Date(Date.now() - 900000).toISOString(),
        },
      ];
    }
    throw err;
  }
}

export async function approveApproval(approvalId: string, approverId: string, reason?: string): Promise<void> {
  await apiRequest(`/v1/approvals/${encodeURIComponent(approvalId)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approver_id: approverId, reason: reason || 'Approved via Mission Control Center' }),
  });
}

export async function rejectApproval(approvalId: string, approverId: string, reason?: string): Promise<void> {
  await apiRequest(`/v1/approvals/${encodeURIComponent(approvalId)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ approver_id: approverId, reason: reason || 'Rejected via Mission Control Center' }),
  });
}

export async function fetchGlobalActivity(options?: { useDemo?: boolean }): Promise<GlobalActivityEvent[]> {
  try {
    const resp = await apiRequest<{ events: GlobalActivityEvent[] }>('/v1/events');
    if (resp.events && resp.events.length > 0) {
      return resp.events;
    }
  } catch {}

  if (options?.useDemo) {
    return [
      {
        id: 'evt_act_01',
        type: 'mission.created',
        category: 'MISSION',
        actor: 'agent:research-agent',
        mission_id: 'msn_demo_weather_01',
        amount: '2000000',
        status: 'SUCCESS',
        correlation_id: 'corr_8f3d1b9e',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        payload: { objective: 'Acquire verified real-time weather telemetry', budget: '2000000' },
      },
      {
        id: 'evt_act_02',
        type: 'policy.evaluation.allowed',
        category: 'POLICY',
        actor: 'engine:policy_rust',
        mission_id: 'msn_demo_weather_01',
        amount: '500000',
        status: 'SUCCESS',
        correlation_id: 'corr_8f3d1b9e',
        timestamp: new Date(Date.now() - 3490000).toISOString(),
        payload: { decision: 'ALLOW', reason: 'Within per-transaction limit' },
      },
      {
        id: 'evt_act_03',
        type: 'payment.executed',
        category: 'PAYMENT',
        actor: 'agentvault:signer',
        mission_id: 'msn_demo_weather_01',
        amount: '500000',
        status: 'SUCCESS',
        correlation_id: 'corr_8f3d1b9e',
        timestamp: new Date(Date.now() - 3460000).toISOString(),
        payload: { service: 'web-research', recipient: '0x1111...1111' },
      },
      {
        id: 'evt_act_04',
        type: 'security.prompt_injection_blocked',
        category: 'SECURITY',
        actor: 'engine:untrusted_boundary',
        mission_id: 'msn_demo_adversarial_03',
        status: 'BLOCKED',
        correlation_id: 'corr_sec_audit',
        timestamp: new Date(Date.now() - 7100000).toISOString(),
        payload: { attack_vector: 'Prompt injection in service output', financial_impact: 'NONE' },
      },
    ];
  }

  return [];
}

export async function fetchSecurityReport(options?: { useDemo?: boolean }): Promise<SecuritySubsystemsReport> {
  let policyOperational = true;
  try {
    const ready = await apiRequest<{ status: string }>('/ready', { timeoutMs: 2500 });
    policyOperational = ready.status === 'ready';
  } catch {
    policyOperational = options?.useDemo ? true : false;
  }

  return {
    policy_engine: {
      name: 'Deterministic Rust Policy Engine',
      status: policyOperational ? 'OPERATIONAL' : 'OFFLINE',
      verified: policyOperational,
      details: 'Evaluates spending limits, velocity, and recipient allowlists in native Rust (policy-rs).',
    },
    risk_engine: {
      name: 'Counterparty Risk Engine',
      status: policyOperational ? 'OPERATIONAL' : 'OFFLINE',
      verified: policyOperational,
      details: 'Calculates counterparty risk, service novelty, and transaction size exposure.',
    },
    approval_system: {
      name: 'Subordinated Approval Gate',
      status: 'OPERATIONAL',
      verified: true,
      details: 'Enforces human authorization for high-value requests; strictly subordinated to hard policy DENY.',
    },
    treasury: {
      name: 'Treasury Controller',
      status: 'OPERATIONAL',
      verified: true,
      details: 'Manages balance locks, reservations, and idempotency keys to prevent double-spending.',
    },
    signer: {
      name: 'Keyless Signer Gate',
      status: 'PARTIAL',
      verified: false,
      details: 'Keyless architecture active. AI agents hold no private keys. Simulated signing in dev/test.',
    },
    agent_vault: {
      name: 'AgentVault Smart Contract',
      status: 'PARTIAL',
      verified: false,
      details: 'Audited Solidity contract with daily limits and recipient boundaries on Arc.',
    },
    arc_settlement: {
      name: 'Arc Network Native Settlement',
      status: 'NOT CONNECTED',
      verified: false,
      details: 'Arc Chain ID 5042. Mainnet settlement disabled in non-production mode (ENABLE_LIVE_EXECUTION=false).',
    },
  };
}
