import { strict as assert } from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { getConfig, maskApiKey, setConfigKey } from '../src/config.js';
import { formatUsdc, printPaymentTrace, printAgentServicesList, printAgentQuote, printHire, printEconomicGraph, printSwarm, printSwarmTasks, printSwarmGraph, printSwarmTrace, printSwarmRisk, printSimulateSwarm } from '../src/output.js';

test('AgentPay CLI Config — Set and Get API Key', () => {
  const originalConfig = getConfig();

  // Test set key
  setConfigKey('api-key', 'ap_live_test_cli_key_123456');
  const updated = getConfig();
  assert.equal(updated.apiKey, 'ap_live_test_cli_key_123456');

  // Test set base url
  setConfigKey('base-url', 'http://127.0.0.1:9090');
  const withUrl = getConfig();
  assert.equal(withUrl.baseUrl, 'http://127.0.0.1:9090');

  // Test mask
  assert.equal(maskApiKey('ap_live_test_cli_key_123456'), 'ap_liv...3456');
  assert.equal(maskApiKey(undefined), '(not set)');
  assert.equal(maskApiKey('123'), '****');

  // Restore
  if (originalConfig.apiKey) {
    setConfigKey('api-key', originalConfig.apiKey);
  }
  if (originalConfig.baseUrl) {
    setConfigKey('base-url', originalConfig.baseUrl);
  }
});

test('AgentPay CLI Output — USDC Amount Formatting', () => {
  assert.equal(formatUsdc('2500000'), '2.50 USDC');
  assert.equal(formatUsdc('1000000'), '1.00 USDC');
  assert.equal(formatUsdc('500000'), '0.50 USDC');
  assert.equal(formatUsdc('0'), '0.00 USDC');
});

test('AgentPay CLI Output — Payment Trace Formatter', () => {
  const mockTrace = {
    trace_id: 'trc_pi_test_01',
    organization_id: 'org_test',
    agent_id: 'agent_test',
    payment_intent_id: 'pi_test_01',
    status: 'CONFIRMED',
    execution_mode: 'SIMULATION',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    payment_summary: {
      intent_id: 'pi_test_01',
      organization_id: 'org_test',
      agent_id: 'agent_test',
      service_id: 'web-research',
      recipient: '0x1234567890123456789012345678901234567890',
      amount: '180000',
      asset: 'USDC',
      purpose: 'CLI unit test',
      request_id: 'req_idem_cli_01',
    },
    policy_evidence: {
      decision: 'ALLOW',
      reason_code: 'POLICY_PERMITTED',
      risk_level: 'LOW',
      evaluated_at: new Date().toISOString(),
    },
    steps: [
      {
        step_number: 1,
        step_id: 'st_1',
        trace_id: 'trc_pi_test_01',
        type: 'PAYMENT_REQUESTED',
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
        actor: 'AGENT:agent_test',
      },
    ],
  };

  // Ensure calling printPaymentTrace does not throw
  assert.doesNotThrow(() => {
    printPaymentTrace(mockTrace);
  });
});

test('AgentPay CLI Output — Agent-to-Agent Formatters', () => {
  const mockService = {
    agent_id: 'agent_research_01',
    service_id: 'web-research',
    organization_id: 'org_default',
    name: 'Web Research Agent',
    description: 'Deep web analysis',
    capabilities: ['search', 'summarization'],
    pricing_model: 'FIXED',
    base_price: '300000',
    max_price: '1000000',
    supported_assets: ['USDC'],
    availability: 'ONLINE',
    reputation: 9900,
    success_rate_bps: 9950,
    average_latency_ms: 150,
    risk_profile: 'LOW',
    enabled: true,
    verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockQuote = {
    quote_id: 'quote_test_01',
    buyer_agent_id: 'agent_buyer',
    seller_agent_id: 'agent_research_01',
    service_id: 'web-research',
    price: '300000',
    asset: 'USDC',
    estimated_latency_ms: 150,
    quality: 9800,
    valid_until: new Date().toISOString(),
    status: 'OFFERED',
    created_at: new Date().toISOString(),
  };

  const mockHire = {
    id: 'hire_test_01',
    organization_id: 'org_default',
    buyer_agent_id: 'agent_buyer',
    seller_agent_id: 'agent_research_01',
    service_id: 'web-research',
    capability: 'search',
    mission_id: 'mission_100',
    root_mission_id: 'mission_100',
    call_depth: 1,
    quote_id: 'quote_test_01',
    price: '300000',
    asset: 'USDC',
    expected_result: 'report',
    status: 'COMPLETED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockGraph = {
    mission_id: 'mission_100',
    nodes: [
      { id: 'mission_100', type: 'MISSION', label: 'Research' },
      { id: 'agent_buyer', type: 'AGENT', label: 'Coordinator' },
    ],
    edges: [
      { source: 'agent_buyer', target: 'hire_test_01', type: 'HIRED' },
    ],
  };

  assert.doesNotThrow(() => {
    printAgentServicesList([mockService]);
    printAgentQuote(mockQuote);
    printHire(mockHire);
    printEconomicGraph(mockGraph);
  });
});

test('AgentPay CLI Swarms — Output Formatting Test', () => {
  const mockSwarm = {
    id: 'swm_cli_01',
    organization_id: 'org_cli',
    root_mission_id: 'msn_cli_root',
    name: 'Market Intelligence Swarm',
    objective: 'Analyze AI infrastructure',
    status: 'RUNNING' as const,
    max_budget: '5000000',
    total_spent: '1200000',
    total_reserved: '800000',
    asset: 'USDC',
    task_count: 5,
    completed_tasks: 2,
    failed_tasks: 0,
    orchestrator_agent_id: 'orch_1',
    cost_intelligence: {
      total_budget: '5000000',
      allocated_budget: '2000000',
      committed_spend: '1200000',
      active_reservations: '800000',
      unallocated_budget: '3000000',
      budget_utilization_pct: 40,
      projected_final_cost: '3500000',
      cost_variance: '0',
      is_over_budget_risk: false,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTasks = [
    {
      id: 'task_01',
      swarm_id: 'swm_cli_01',
      mission_id: 'msn_cli_root',
      title: 'Analyze GPU supply chain',
      role: 'RESEARCHER' as const,
      required_capability: 'web-research',
      dependencies: [],
      status: 'COMPLETED' as const,
      budget: '1000000',
      actual_cost: '600000',
      depth: 0,
      retry_count: 0,
      max_retries: 3,
      critic_feedback: {
        task_id: 'task_01',
        critic_agent_id: 'critic_1',
        score: 95,
        feedback: 'Excellent synthesis',
        passed: true,
        reviewed_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockSwarmGraph = {
    nodes: [
      { id: 'task_01', type: 'TASK', label: 'GPU supply chain', status: 'COMPLETED' },
    ],
    edges: [],
    depth: 1,
    is_dag: true,
  };

  const mockTrace = {
    swarm_id: 'swm_cli_01',
    events: [
      { event_type: 'swarm.created', timestamp: new Date().toISOString() },
      { event_type: 'swarm.started', timestamp: new Date().toISOString() },
    ],
  };

  const mockRisk = {
    overall_score: 18,
    risk_level: 'LOW',
    budget_exhaustion_risk: 12,
    dependency_bottleneck_risk: 15,
    agent_reliability_risk: 10,
    data_tampering_risk: 5,
    recommendations: ['Safe to proceed'],
    evaluated_at: new Date().toISOString(),
  };

  const mockSim = {
    estimated_cost: '3000000',
    estimated_latency_ms: 1200,
    task_count: 5,
    max_depth: 3,
    is_valid_dag: true,
    risk_score: mockRisk,
    tasks: mockTasks,
  };

  assert.doesNotThrow(() => {
    printSwarm(mockSwarm);
    printSwarmTasks(mockTasks);
    printSwarmGraph(mockSwarmGraph);
    printSwarmTrace(mockTrace);
    printSwarmRisk(mockRisk);
    printSimulateSwarm(mockSim);
  });
});


