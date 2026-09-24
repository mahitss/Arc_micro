import { strict as assert } from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { getConfig, maskApiKey, setConfigKey } from '../src/config.js';
import {
  formatUsdc,
  printPaymentTrace,
  printAgentServicesList,
  printAgentQuote,
  printHire,
  printEconomicGraph,
  printSwarm,
  printSwarmTasks,
  printSwarmGraph,
  printSwarmTrace,
  printSwarmRisk,
  printSimulateSwarm,
  printObligationsList,
  printObligationDetail,
  printInvoicesList,
  printInvoiceDetail,
  printEscrowsList,
  printMilestonesList,
  printNettingProposalsList,
  printSettlementBatchesList,
  printReconciliationList,
  printExposureSnapshot,
  printHealthSnapshot,
  printTreasuryState,
  printTreasuryReservationsList,
  printTreasuryReservationDetail,
  printTreasuryForecast,
  printTreasuryStressResult,
  printTreasuryReconciliationReport,
  printTreasuryHealth,
  printTreasuryAnomaliesList,
  printControlStateStrip,
  printControlOverview,
  printControlActivity,
  printFinancialTrace,
  printMissionCommandCenter,
  printArcStatus,
  printControlIncidents,
  printControlSearch,
  printRuntimeStatus,
  printRuntimeWorkflows,
  printRuntimeWorkflowDetail,
  printRuntimeWorkers,
  printRuntimeRecoveryQueue,
  printRuntimeDangerousAction,
  printOpsStatus,
  printOpsHealth,
  printOpsWorkers,
  printOpsQueues,
  printOpsIncidents,
  printOpsTopology,
  printOpsReplay,
  printOpsWhy,
  printOpsNext,
  printOpsStateAt,
} from '../src/output.js';

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

test('AgentPay CLI Output — Clearinghouse Formatters (Task 10)', () => {
  const mockObligation = {
    obligation_id: 'ob_cli_01',
    organization_id: 'org_test',
    payer_agent_id: 'agent_payer',
    payee_agent_id: 'agent_payee',
    contract_id: 'contract_cli_01',
    amount: '30000000',
    currency: 'USDC',
    status: 'AUTHORIZED',
    execution_mode: 'REAL',
  };

  const mockInvoice = {
    invoice_id: 'inv_cli_01',
    contract_id: 'contract_cli_01',
    provider_agent_id: 'agent_payee',
    requester_agent_id: 'agent_payer',
    amount: '30000000',
    currency: 'USDC',
    status: 'ISSUED',
    line_items: [{ item_number: 1, description: 'Service', amount: '30000000' }],
  };

  const mockEscrow = {
    escrow_id: 'esc_cli_01',
    obligation_id: 'ob_cli_01',
    status: 'RESERVED',
    reserved_amount: '30000000',
    released_amount: '0',
  };

  const mockMilestones = [
    { sequence: 1, milestone_id: 'ms_01', amount: '10000000', verification_rule: 'MIN_LENGTH_50', status: 'VERIFIED', description: 'Deliverable 1' },
  ];

  const mockNetting = [
    { proposal_id: 'net_01', agent_a: 'agent_a', agent_b: 'agent_b', gross_total: '20000000', net_amount: '5000000', net_payer: 'agent_a', net_payee: 'agent_b', savings_amount: '15000000', status: 'PROPOSED' },
  ];

  const mockBatches = [
    { batch_id: 'batch_01', obligation_ids: ['ob_1', 'ob_2'], gross_amount: '20000000', net_amount: '20000000', status: 'READY' },
  ];

  const mockRecon = [
    { record_id: 'rec_01', status: 'MATCHED', payment_intent_id: 'pi_01', expected_amount: '10000000', actual_amount: '10000000' },
  ];

  const mockExposure = {
    organization_id: 'org_test',
    current_exposure: '30000000',
    max_possible_exposure: '50000000',
    reserved_in_escrow: '30000000',
    outstanding_obligations: '30000000',
    pending_settlements: '0',
    disputed_amount: '0',
    counterparties: [{ agent_id: 'agent_payee', risk_level: 'LOW', net_exposure: '30000000', committed_payable: '30000000', reserved_in_escrow: '30000000' }],
  };

  const mockHealth = {
    organization_id: 'org_test',
    on_chain_available: '100000000',
    active_escrow_reserved: '30000000',
    available_unencumbered: '70000000',
    total_exposure: '30000000',
    solvency_ratio: 3.33,
    health_status: 'HEALTHY',
    deterministic_signals: ['Adequate on-chain liquidity'],
  };

  assert.doesNotThrow(() => {
    printObligationsList([mockObligation]);
    printObligationDetail(mockObligation);
    printInvoicesList([mockInvoice]);
    printInvoiceDetail(mockInvoice);
    printEscrowsList([mockEscrow]);
    printMilestonesList(mockMilestones);
    printNettingProposalsList(mockNetting);
    printSettlementBatchesList(mockBatches);
    printReconciliationList(mockRecon);
    printExposureSnapshot(mockExposure);
    printHealthSnapshot(mockHealth);
  });
});

test('AgentPay CLI Output — Autonomous Treasury Formatters (Task 11)', () => {
  const mockState = {
    organization_id: 'org_test',
    mode: 'REAL',
    total_balance: '100000000',
    available_balance: '80000000',
    reserved_balance: '20000000',
    committed_balance: '5000000',
    pending_settlement: '2000000',
    disputed_balance: '0',
    minimum_buffer: '10000000',
    safe_capacity: '70000000',
    worst_case_exposure: '27000000',
    solvency_ratio: 3.7,
    operational_mode: 'LIQUIDITY_AVAILABLE',
  };

  const mockReservation = {
    reservation_id: 'res_cli_01',
    organization_id: 'org_test',
    amount: '15000000',
    purpose: 'SWARM_MISSION',
    priority: 10,
    agent_id: 'agent_cli_01',
    mission_id: 'msn_01',
    status: 'ACTIVE',
    mode: 'REAL',
    timeout_seconds: 3600,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  };

  const mockForecast = {
    organization_id: 'org_test',
    horizon: '24h',
    survival_state: 'SAFE',
    starting_balance: '100000000',
    expected_inflows: '10000000',
    expected_outflows: '15000000',
    worst_case_outflows: '25000000',
    projected_closing_balance: '95000000',
    stress_scenario: 'OUTFLOW_SPIKE',
    gating_decision: 'LIQUIDITY_AVAILABLE',
  };

  const mockStress = {
    scenario: 'OUTFLOW_SPIKE',
    survival_state: 'SAFE',
    pre_stress_balance: '100000000',
    simulated_shock_outflow: '20000000',
    simulated_inflow_haircut: '2000000',
    post_stress_buffer_headroom: '68000000',
    max_survivable_drawdown: '70000000',
    capital_adequacy_ratio: 3.5,
    safe_to_reserve: true,
    recommendations: ['Liquidity buffer sufficient for peak volume'],
  };

  const mockRecon = {
    organization_id: 'org_test',
    reconciliation_status: 'MATCHED',
    ledger_balance: '100000000',
    repository_balance: '100000000',
    vault_balance: '100000000',
    blockchain_balance: '100000000',
    discrepancy_amount: '0',
    chain_id: 'arc-testnet-1',
    vault_address: '0x1234567890123456789012345678901234567890',
    vault_paused: false,
    evidence: 'On-chain RPC event log and vault state verified.',
  };

  const mockHealth = {
    organization_id: 'org_test',
    mode: 'REAL',
    total_balance: '100000000',
    available_balance: '80000000',
    reserved_balance: '20000000',
    committed_balance: '5000000',
    safe_capacity: '70000000',
    solvency_ratio: 4.0,
    operational_mode: 'LIQUIDITY_AVAILABLE',
    reconciliation_status: 'MATCHED',
    active_reservations_count: 3,
    active_anomalies_count: 0,
  };

  const mockAnomaly = {
    anomaly_id: 'anom_01',
    organization_id: 'org_test',
    type: 'HIGH_CONCENTRATION',
    severity: 'MEDIUM',
    affected_scope: 'SWARM_ORCHESTRATOR',
    evidence: 'Over 60% of reserved funds held by single agent.',
  };

  assert.doesNotThrow(() => {
    printTreasuryState(mockState);
    printTreasuryReservationsList([mockReservation]);
    printTreasuryReservationDetail(mockReservation);
    printTreasuryForecast(mockForecast);
    printTreasuryStressResult(mockStress);
    printTreasuryReconciliationReport(mockRecon);
    printTreasuryHealth(mockHealth);
    printTreasuryAnomaliesList([mockAnomaly]);
  });
});

test('AgentPay CLI Output — Autonomous Economic Control Tower Formatters (Task 12)', () => {
  const mockStrip = {
    treasury_status: 'HEALTHY',
    policy_version: 'v8 ACTIVE',
    risk_level: 'NORMAL',
    execution_mode: 'LIVE',
    arc_status: 'VERIFIED',
    last_updated: new Date().toISOString(),
  };

  const mockOverview = {
    organization_id: 'org_test',
    execution_mode: 'REAL',
    data_freshness: 'LIVE',
    active_missions_count: 3,
    active_agents_count: 12,
    active_contracts_count: 5,
    active_approvals_count: 1,
    available_liquidity: '82500000000',
    reserved_liquidity: '25000000000',
    outstanding_obligations: '15000000000',
    pending_settlements: '5000000000',
    arc_verified_balance: '125000000000',
    current_policy_version: 'v8 ACTIVE',
    current_treasury_mode: 'NORMAL',
    security_status: 'NORMAL',
  };

  const mockActivity = [
    {
      category: 'TREASURY',
      timestamp: new Date().toISOString(),
      severity: 'SUCCESS',
      title: 'Reconciliation Verified',
      aggregate_id: 'treasury_default',
      summary: 'Zero discrepancies detected',
    },
  ];

  const mockTrace = {
    trace_id: 'trc_pi_live_01',
    payment_intent_id: 'pi_live_01',
    mission_id: 'msn_01',
    agent_id: 'agent_analyst',
    contract_id: 'contract_01',
    obligation_id: 'ob_01',
    policy_decision: 'ALLOW',
    policy_version: 'v8',
    risk_score: 12,
    risk_level: 'LOW',
    reservation_id: 'res_01',
    reservation_status: 'CONSUMED',
    payment_status: 'CONFIRMED',
    execution_tx_hash: '0x1234...',
    arc_block_number: 1492041,
    arc_chain_id: '5042',
    reconciliation_status: 'MATCHED',
    learning_notes: 'Verified deliverable',
    steps: [
      { step_number: 1, stage: 'MISSION', status: 'COMPLETED', reference_id: 'msn_01', description: 'Mission init' },
      { step_number: 13, stage: 'LEARNING', status: 'RECORDED', reference_id: 'obs_01', description: 'Learning complete' },
    ],
  };

  const mockMcc = {
    mission_id: 'msn_01',
    title: 'Macro Research Mission',
    objective: 'Orderbook scanning',
    status: 'EXECUTING',
    budget_total: '50000000',
    budget_reserved: '15000000',
    budget_settled: '10000000',
    budget_remaining: '25000000',
    potential_exposure: '15000000',
    current_action: {
      action: 'Waiting for verification',
      why: 'Task 01 complete',
      evidence: 'Payload checksum matched',
    },
    next_expected_action: 'RUNNING_VERIFICATION',
    selected_agents: [
      {
        agent_id: 'agent_analyst',
        display_name: 'Lead Analyst',
        capability: 'modeling',
        quoted_price: '10000000',
        verification_rate: 0.994,
        selection_reason: 'Lowest latency',
        rejected_alternatives: [
          {
            agent_id: 'agent_alt_1',
            quoted_price: '15000000',
            rejection_reason: 'Higher price',
            score_difference: '-14%',
          },
        ],
      },
    ],
  };

  const mockArc = {
    chain_id: '5042',
    rpc_reachable: true,
    rpc_url: 'https://rpc.arc.network',
    latest_block_number: 1492041,
    agent_vault_address: '0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852',
    agent_vault_deployed: true,
    agent_vault_paused: false,
    usdc_address: '0x0000...',
    verified_treasury_balance: '125000000000',
    live_execution_enabled: true,
  };

  const mockIncidents = [
    {
      incident_id: 'inc_01',
      title: 'Provider Latency Spike',
      status: 'RESOLVED',
      severity: 'MEDIUM',
      trigger_event: '504 Timeout',
      root_cause: 'External API degraded',
      timeline: [
        { step_number: 1, subsystem: 'MISSION', description: 'Timeout detected' },
        { step_number: 2, subsystem: 'REPLANNER', description: 'Selected fallback provider' },
      ],
    },
  ];

  const mockSearch = [
    {
      type: 'MISSION',
      id: 'msn_01',
      title: 'Macro Research Mission',
      subtitle: 'Executing',
      status: 'EXECUTING',
      deep_link_url: '/control/missions/msn_01',
    },
  ];

  assert.doesNotThrow(() => {
    printControlStateStrip(mockStrip);
    printControlOverview(mockOverview);
    printControlActivity(mockActivity);
    printFinancialTrace(mockTrace);
    printMissionCommandCenter(mockMcc);
    printArcStatus(mockArc);
    printControlIncidents(mockIncidents);
    printControlSearch(mockSearch, 'macro');
  });
});

test('AgentPay CLI Output — Task 13 Autonomous Operations & Durable Runtime Formatters', () => {
  const mockMetrics = {
    active_workflows: 3,
    waiting_workflows: 1,
    retry_rate_bps: 100,
    failure_rate_bps: 20,
    recovery_rate_bps: 9900,
    average_step_duration_ms: 280,
    lease_expirations_count: 1,
    stale_worker_count: 0,
    queue_depth: 2,
    deadline_violations_count: 0,
    reconciliation_queue_size: 0,
    ambiguous_operations: 0,
    worker_utilization_pct: 0.35,
  };

  const mockQueues = {
    queue_depth: 2,
    reconciliation_queue_size: 0,
  };

  const mockWorkflows = [
    {
      workflow_id: 'wf_cli_01',
      tenant_id: 'tenant_default',
      workflow_type: 'MISSION_EXECUTION',
      aggregate_type: 'MISSION',
      aggregate_id: 'msn_001',
      state: 'RUNNING',
      version: 2,
      priority: 10,
      idempotency_key: 'idem_cli_wf',
      current_step: 'step_discover',
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockSteps = [
    {
      step_id: 'step_discover',
      sequence: 1,
      step_type: 'SERVICE_DISCOVERY',
      state: 'SUCCEEDED',
      attempt: 1,
      timeout_seconds: 30,
    },
  ];

  const mockCheckpoints = [
    {
      checkpoint_id: 'cp_01',
      step_id: 'step_discover',
      state_hash: 'abcdef0123456789abcdef0123456789',
      event_position: 1,
    },
  ];

  const mockWorkers = [
    {
      worker_id: 'worker_cli_01',
      worker_type: 'STANDARD',
      hostname: 'node-cli-1',
      status: 'HEALTHY',
      version: '1.0.0',
      heartbeat_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    },
  ];

  const mockRecoverySteps = [
    {
      step_id: 'step_rec_cli_01',
      workflow_id: 'wf_cli_01',
      step_type: 'QUOTE_COLLECTION',
      state: 'RETRYABLE_FAILURE',
      attempt: 1,
      next_retry_at: new Date().toISOString(),
      error_code: 'PROVIDER_TIMEOUT',
      error_message: 'External provider timed out after 30s',
    },
  ];

  assert.doesNotThrow(() => {
    printRuntimeStatus(mockMetrics, mockQueues);
    printRuntimeWorkflows(mockWorkflows);
    printRuntimeWorkflowDetail(mockWorkflows[0], mockSteps, mockCheckpoints);
    printRuntimeWorkers(mockWorkers);
    printRuntimeRecoveryQueue(mockRecoverySteps);
    printRuntimeDangerousAction('PAUSE_WORKFLOW', {
      tenant: 'tenant_default',
      workflow: 'wf_cli_01',
      currentState: 'RUNNING',
      idempotencyKey: 'idem_cli_wf',
      result: { state: 'PAUSED', version: 3 },
    });
  });
});

test('AgentPay CLI Operations OS — Output Formatting Test', () => {
  const mockSnapshot = {
    snapshot_id: 'snap_cli_01',
    freshness: 'FRESH',
    active_workflows: 8,
    queued_workflows: 14,
    blocked_workflows: 0,
    failed_workflows: 0,
    recovering_workflows: 1,
    available_workers: 10,
    active_agents: 6,
    incident_count: 1,
    treasury_state: 'HEALTHY',
    liquidity_state: 'AVAILABLE',
    clearing_state: 'ACTIVE',
    security_state: 'HEALTHY',
    policy_state: 'ENFORCING',
    arc_state: 'NOT VERIFIED / NOT DEPLOYED',
    generated_at: new Date().toISOString(),
  };

  const mockHealth = {
    overall_state: 'HEALTHY',
    components: {
      Database: { name: 'Database', state: 'HEALTHY', message: 'Operational' },
      PolicyEngine: { name: 'PolicyEngine', state: 'HEALTHY', message: 'Responding' },
    },
    arc: {
      rpc_connected: true,
      vault_deployed: false,
      live_execution_enabled: false,
      status_text: 'NOT VERIFIED / NOT DEPLOYED',
    },
  };

  const mockWorkers = [
    { worker_id: 'w_cli_01', worker_type: 'STANDARD', status: 'HEALTHY', last_seen: new Date().toISOString(), capabilities: ['MISSION'] },
  ];

  const mockQueues = {
    queue_depths: { mission: 4, task: 10 },
    dead_letters: [{ dead_letter_id: 'dl_01', queue_name: 'task', reason: 'timeout' }],
    total_dead: 1,
  };

  const mockIncidents = [
    { incident_id: 'inc_cli_01', severity: 'MEDIUM', category: 'WORKER_TIMEOUT', state: 'DETECTED', root_cause: 'Node reboot' },
  ];

  const mockTopology = {
    arc: { rpc_connected: true, vault_deployed: false },
    workers: mockWorkers,
    components: mockHealth.components,
  };

  const mockReplay = {
    workflow_id: 'wf_cli_01',
    total_steps: 2,
    final_state: 'COMPLETED',
    entries: [
      { sequence: 1, step_id: 's1', step_type: 'RESEARCH', state: 'SUCCEEDED', timestamp: new Date().toISOString() },
    ],
  };

  const mockWhy = {
    current_state: 'BLOCKED',
    trigger: 'approval_expired',
    evidence: 'Approval timed out',
    decision: 'ESCALATE',
    next_action: 'New approval',
    financial_authority: 'UNCHANGED',
  };

  const mockNext = {
    action: 'RUN',
    reason: 'Ready to execute',
    estimated_delay_seconds: 5,
    requires_human: false,
  };

  const mockStateAt = {
    timestamp: '2026-09-24T12:00:00Z',
    reconstructed_from: 'EVENTS_AND_CHECKPOINTS',
    tenant_id: 'tenant_default',
    active_workflows: 5,
    financial_state_frozen: true,
  };

  assert.doesNotThrow(() => {
    printOpsStatus(mockSnapshot);
    printOpsHealth(mockHealth);
    printOpsWorkers(mockWorkers);
    printOpsQueues(mockQueues);
    printOpsIncidents(mockIncidents);
    printOpsTopology(mockTopology);
    printOpsReplay(mockReplay);
    printOpsWhy(mockWhy);
    printOpsNext(mockNext);
    printOpsStateAt(mockStateAt);
  });
});

