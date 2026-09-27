import { apiRequest } from './client';

export type MissionState =
  | 'CREATED'
  | 'PLANNING'
  | 'DISCOVERING'
  | 'QUOTING'
  | 'SELECTING'
  | 'NEGOTIATING'
  | 'POLICY_CHECK'
  | 'RISK_CHECK'
  | 'APPROVAL_CHECK'
  | 'TREASURY_RESERVATION'
  | 'EXECUTING'
  | 'PROVIDER_FAILURE'
  | 'SECURITY_BLOCK'
  | 'REPLANNING'
  | 'RECOVERY'
  | 'VALIDATING'
  | 'SYNTHESIS'
  | 'CLEARING'
  | 'SETTLEMENT_READY'
  | 'COMPLETED'
  | 'FAILED';

export interface MissionEvent {
  event_id: string;
  mission_id: string;
  name?: string;
  timestamp: string;
  state: MissionState;
  actor: string;
  action: string;
  status: string;
  amount: number;
  currency: string;
  correlation_id: string;
  causation_id: string;
  source: string;
  simulation_live: string;
  metadata: Record<string, any>;
}

export interface ProviderInfo {
  id: string;
  name: string;
  capability: string;
  quote_usdc: number;
  latency_seconds: number;
  reliability: string;
  is_malicious?: boolean;
  attempted_attack?: string;
  status: 'AVAILABLE' | 'SELECTED' | 'BLOCKED' | 'FAILED' | 'SUPERSEDED' | 'SETTLED';
}

export interface ClearingObligation {
  obligation_id: string;
  provider_id: string;
  provider_name: string;
  amount_usdc: number;
  status: string;
  reason?: string;
}

export interface EconomicTraceNode {
  stage: string;
  label: string;
  state: string;
  authority: 'ADVISORY' | 'AUTHORITATIVE';
  impact_usdc: number;
  description: string;
}

export interface AITraceNode {
  step_id: string;
  model: string;
  task: string;
  prompt_version: string;
  request_id: string;
  tokens: number;
  latency_ms: number;
  estimated_cost_usdc: number;
  status: string;
}

export interface AuthorityTraceStage {
  gate: string;
  input_state: string;
  evaluator: string;
  decision: 'PASS' | 'FAIL' | 'HARD_DENY' | 'PROPOSED' | 'NOT_REQUIRED' | 'RESERVED' | 'SIMULATED';
  enforced_rule: string;
  funds_moved_usdc: number;
}

export interface FlagshipMissionSummary {
  mission_id: string;
  name: string;
  objective: string;
  budget_cap_usdc: number;
  authorized_usdc: number;
  blocked_usdc: number;
  remaining_usdc: number;
  mode: string;
  mode_notice: string;
  seed: string;
  current_state: MissionState;
  current_step_index: number;
  total_steps: number;
  is_paused: boolean;
  is_completed: boolean;
  agents_count: number;
  security_violations_count: number;
  recovered_failures_count: number;
  arc_settlement: {
    network: string;
    chain_id: number;
    agent_vault_deployment: string;
    live_execution: string;
    broadcast: string;
    real_settlements: number;
    statement: string;
  };
  events: MissionEvent[];
  providers: ProviderInfo[];
  clearing_summary: {
    total_authorized_usdc: number;
    total_blocked_usdc: number;
    simulated_settled_usdc: number;
    obligations: ClearingObligation[];
  };
  economic_trace: EconomicTraceNode[];
  ai_trace: AITraceNode[];
  authority_trace: AuthorityTraceStage[];
  why_explanation: {
    title: string;
    decision: string;
    ai_recommendation: string;
    agentpay_decision: string;
    reasons: string[];
  };
  why_not_explanation: {
    title: string;
    attempted_action: string;
    requested: string;
    allowed: string;
    decision: string;
    override_possible: boolean;
    funds_moved: string;
    enforced_invariant: string;
  };
}

export const CANONICAL_22_EVENTS: MissionEvent[] = [
  {
    event_id: 'evt_01_created',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:00Z',
    state: 'CREATED',
    actor: 'Operator',
    action: 'Initialize Autonomous Objective',
    status: 'SUCCESS',
    amount: 25.0,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'op_intent_init',
    source: 'ECONOMIC_FABRIC',
    simulation_live: 'SIMULATION',
    metadata: {
      title: 'Autonomous Market Intelligence',
      objective: 'Produce a high-confidence market intelligence report using autonomous agents while staying within a strict economic policy.',
      budget_envelope: 25.0,
      deadline: '10 minutes',
      risk_envelope: 'LOW',
      thesis: 'AI proposals are advisory. Financial authority remains deterministic.',
    },
  },
  {
    event_id: 'evt_02_plan',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:02Z',
    state: 'PLANNING',
    actor: 'AI Planner Layer',
    action: 'Decompose Objective into Task Graph',
    status: 'SUCCESS',
    amount: 0.0,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_01_created',
    source: 'AI_PROVIDER_OPENROUTER',
    simulation_live: 'SIMULATION',
    metadata: {
      model: 'anthropic/claude-3.5-sonnet',
      tasks: ['Research', 'Market Data', 'Analysis', 'Critic', 'Synthesis'],
      dag_dependencies: 'Research -> Analysis; Market Data -> Analysis; Analysis + Critic -> Synthesis',
      policy_validation: 'PASS',
      authority_impact: 'UNCHANGED',
    },
  },
  {
    event_id: 'evt_03_discovery',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:04Z',
    state: 'DISCOVERING',
    actor: 'A2A Marketplace Registry',
    action: 'Discover Specialist Agents',
    status: 'SUCCESS',
    amount: 0.0,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_02_plan',
    source: 'MARKETPLACE_REGISTRY',
    simulation_live: 'SIMULATION',
    metadata: {
      capability: 'market-intel',
      candidates_found: 4,
      discovered_entities: ['Provider A (High SLA)', 'Provider B (Cost Opt)', 'Provider C (Ultra Low Latency)', 'Malicious Provider (Adversarial)'],
    },
  },
  {
    event_id: 'evt_04_quotes',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:06Z',
    state: 'QUOTING',
    actor: 'Marketplace Ingestion',
    action: 'Receive Structured Service Quotes',
    status: 'SUCCESS',
    amount: 0.0,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_03_discovery',
    source: 'ECONOMIC_FABRIC',
    simulation_live: 'SIMULATION',
    metadata: {
      quotes: [
        { provider: 'Provider A', quote_usdc: 4.0, latency_s: 2.1, reliability: 'HIGH' },
        { provider: 'Provider B', quote_usdc: 3.6, latency_s: 1.8, reliability: 'MEDIUM' },
        { provider: 'Provider C', quote_usdc: 4.5, latency_s: 1.4, reliability: 'HIGH' },
      ],
      provenance: 'SIMULATED MARKET DATA',
    },
  },
  {
    event_id: 'evt_05_compare',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:08Z',
    state: 'SELECTING',
    actor: 'AI Advisory Layer',
    action: 'Compare Quotes & Recommend Candidate',
    status: 'SUCCESS',
    amount: 3.6,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_04_quotes',
    source: 'AI_RECOMMENDATION',
    simulation_live: 'SIMULATION',
    metadata: {
      recommended_provider: 'Provider B',
      reason: 'Lowest expected cost ($3.60) within SLA deadline envelope.',
      ai_recommendation: 'Provider B',
      agentpay_status: 'PENDING_AUTHORITY_GATE',
    },
  },
  {
    event_id: 'evt_06_select',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:10Z',
    state: 'SELECTING',
    actor: 'AgentPay Gate',
    action: 'Authorize Candidate Provider B',
    status: 'SUCCESS',
    amount: 3.6,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_05_compare',
    source: 'ECONOMIC_FABRIC',
    simulation_live: 'SIMULATION',
    metadata: {
      selected_provider: 'Provider B',
      recipient_resolution: 'REGISTRY_RESOLVED (service_registry:provider-b)',
      budget_check: '3.60 <= 25.00 USDC (PASS)',
      authority_decision: 'AUTHORIZED',
    },
  },
  {
    event_id: 'evt_07_negotiate',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:12Z',
    state: 'NEGOTIATING',
    actor: 'A2A Protocol',
    action: 'Finalize Service Level Agreement',
    status: 'SUCCESS',
    amount: 3.6,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_06_select',
    source: 'PROTOCOL_SERVICE',
    simulation_live: 'SIMULATION',
    metadata: {
      sla_max_latency_s: 2.5,
      retry_policy: 'MAX_RETRIES_1',
      escrow_mode: 'SIMULATED_RESERVATION',
    },
  },
  {
    event_id: 'evt_08_policy',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:14Z',
    state: 'POLICY_CHECK',
    actor: 'Rust Policy Engine',
    action: 'Deterministic Policy Evaluation',
    status: 'ALLOW',
    amount: 3.6,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_07_negotiate',
    source: 'POLICY_ENGINE_RUST',
    simulation_live: 'SIMULATION',
    metadata: {
      policy_decision: 'ALLOW',
      eval_duration: '6.36us',
      rules_checked: ['ALLOWLIST', 'PER_TX_LIMIT', 'DAILY_LIMIT', 'SERVICE_ALLOWED', 'RECIPIENT_ALLOWED'],
    },
  },
  {
    event_id: 'evt_09_risk',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:16Z',
    state: 'RISK_CHECK',
    actor: 'Risk Engine',
    action: 'Assess Counterparty & Concentration Risk',
    status: 'PASS',
    amount: 3.6,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_08_policy',
    source: 'RISK_ENGINE',
    simulation_live: 'SIMULATION',
    metadata: {
      risk_score: 18,
      risk_tier: 'LOW',
      concentration_ratio: '0.144 (safe < 0.30)',
      approval_required: false,
    },
  },
  {
    event_id: 'evt_10_treasury',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:18Z',
    state: 'TREASURY_RESERVATION',
    actor: 'Treasury Orchestrator',
    action: 'Encumber Simulated Liquidity',
    status: 'RESERVED',
    amount: 3.6,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_09_risk',
    source: 'TREASURY_ORCHESTRATOR',
    simulation_live: 'SIMULATION',
    metadata: {
      reservation_id: 'res_sim_001_b',
      encumbered_amount: 3.6,
      buffer_solvency: '86.4% HEALTHY',
      invariant_check: 'INV-76 (reservation isolated)',
    },
  },
  {
    event_id: 'evt_11_payment_req',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:20Z',
    state: 'EXECUTING',
    actor: 'Execution Gate',
    action: 'Construct PaymentIntent for Provider B',
    status: 'PENDING_DISPATCH',
    amount: 3.6,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_10_treasury',
    source: 'INTENT_SERVICE',
    simulation_live: 'SIMULATION',
    metadata: {
      intent_id: 'pi_sim_prov_b_01',
      recipient: 'service_registry:provider-b',
      amount_raw: '3600000',
    },
  },
  {
    event_id: 'evt_12_sec_violation',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:22Z',
    state: 'SECURITY_BLOCK',
    actor: 'Malicious Provider Interceptor',
    action: 'Attack #1: Recipient Substitution Attempt',
    status: 'ATTACK_DETECTED',
    amount: 3.6,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_11_payment_req',
    source: 'SECURITY_GUARDRAILS',
    simulation_live: 'SIMULATION',
    metadata: {
      attack_vector: 'Recipient Substitution',
      requested_recipient: '0xdead00000000000000000000000000000000beef (attacker-wallet)',
      allowed_recipient: 'service_registry:provider-b',
      reason: 'RECIPIENT_MISMATCH: Unauthorized recipient swap attempted mid-flight',
      enforced_rule: 'INV-186 (raw hex destination blocked; recipient must be verified registry entry) & INV-146',
    },
  },
  {
    event_id: 'evt_13_pay_blocked',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:24Z',
    state: 'SECURITY_BLOCK',
    actor: 'AgentPay Security Guardrail',
    action: 'HARD DENY: Block Payment to Attacker',
    status: 'BLOCKED',
    amount: 0.0,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_12_sec_violation',
    source: 'SECURITY_GUARDRAILS',
    simulation_live: 'SIMULATION',
    metadata: {
      decision: 'HARD DENY',
      funds_moved: '0.00 USDC',
      override_possible: false,
      treasury_protection: 'Reservation revoked; zero unreserved exposure.',
    },
  },
  {
    event_id: 'evt_14_prov_fail',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:26Z',
    state: 'PROVIDER_FAILURE',
    actor: 'Durable Runtime Monitor',
    action: 'Detect Provider B Lease Heartbeat Timeout',
    status: 'TIMEOUT_DETECTED',
    amount: 0.0,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_13_pay_blocked',
    source: 'RUNTIME_SUPERVISOR',
    simulation_live: 'SIMULATION',
    metadata: {
      failed_provider: 'Provider B',
      failure_reason: 'Heartbeat missed (>2000ms lease expired)',
      mission_state: 'RECOVERY REQUIRED',
      invariant_check: 'INV-101 (stale worker fenced) & INV-103 (no blind retry)',
    },
  },
  {
    event_id: 'evt_15_replan_req',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:28Z',
    state: 'REPLANNING',
    actor: 'AI Adaptive Loop',
    action: 'Propose Autonomous Replan: Switch to Provider C',
    status: 'PROPOSAL_SUBMITTED',
    amount: 4.5,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_14_prov_fail',
    source: 'AI_ADAPTIVE_LOOP',
    simulation_live: 'SIMULATION',
    metadata: {
      original_provider: 'Provider B ($3.60)',
      replacement_provider: 'Provider C ($4.50)',
      marginal_cost: '+0.90 USDC',
      new_total_cost: '8.50 USDC (Provider A $4.00 + Provider C $4.50)',
      budget_check: '8.50 <= 25.00 USDC (PASS)',
      authority_expansion: 'NONE',
    },
  },
  {
    event_id: 'evt_16_alt_select',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:30Z',
    state: 'RECOVERY',
    actor: 'AgentPay Gate',
    action: 'Authorize Replacement Provider C',
    status: 'AUTHORIZED',
    amount: 4.5,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_15_replan_req',
    source: 'ECONOMIC_FABRIC',
    simulation_live: 'SIMULATION',
    metadata: {
      provider: 'Provider C',
      policy_validation: 'PASS',
      risk_validation: 'PASS',
      recipient_validated: 'service_registry:provider-c',
      envelope_bound: 'INV-143 & INV-148 PRESERVED',
    },
  },
  {
    event_id: 'evt_17_pay_reauth',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:32Z',
    state: 'EXECUTING',
    actor: 'Treasury & Intent Service',
    action: 'Reserve and Authorize Payment to Provider C',
    status: 'AUTHORIZED',
    amount: 4.5,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_16_alt_select',
    source: 'TREASURY_ORCHESTRATOR',
    simulation_live: 'SIMULATION',
    metadata: {
      reservation_id: 'res_sim_002_c',
      total_reserved: 8.5,
      buffer_status: 'HEALTHY',
    },
  },
  {
    event_id: 'evt_18_result_rec',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:35Z',
    state: 'VALIDATING',
    actor: 'Provider C Deliverable Service',
    action: 'Deliver Research & Market Intel Report',
    status: 'DELIVERED',
    amount: 0.0,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_17_pay_reauth',
    source: 'SERVICE_DELIVERY',
    simulation_live: 'SIMULATION',
    metadata: {
      payload_hash: '0x3f8a912e74d8123bf018a092147acb84179321de82e81190bc1f4a9b0cde3281',
      latency_actual: '1.38s',
      items_analyzed: 142,
    },
  },
  {
    event_id: 'evt_19_result_val',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:37Z',
    state: 'VALIDATING',
    actor: 'Critic Agent',
    action: 'Validate Deliverable Quality & Schema',
    status: 'PASS',
    amount: 0.0,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_18_result_rec',
    source: 'CRITIC_AGENT',
    simulation_live: 'SIMULATION',
    metadata: {
      critic_score: 94,
      quality_threshold: 80,
      schema_check: 'VALID',
      source_metadata: 'VERIFIED',
    },
  },
  {
    event_id: 'evt_20_clearing',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:39Z',
    state: 'CLEARING',
    actor: 'Autonomous Clearinghouse',
    action: 'Record Netting & Bilateral Obligations',
    status: 'RECORDED',
    amount: 8.5,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_19_result_val',
    source: 'CLEARINGHOUSE_ENGINE',
    simulation_live: 'SIMULATION',
    metadata: {
      obligations: [
        { provider: 'Provider A', amount_usdc: 4.0, status: 'AUTHORIZED' },
        { provider: 'Provider B', amount_usdc: 3.6, status: 'BLOCKED_NOT_SETTLED' },
        { provider: 'Provider C', amount_usdc: 4.5, status: 'AUTHORIZED' },
      ],
      total_authorized: 8.5,
      total_blocked: 3.6,
    },
  },
  {
    event_id: 'evt_21_settlement',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:41Z',
    state: 'SETTLEMENT_READY',
    actor: 'Arc Simulator',
    action: 'Generate Projected Arc Settlement Trace',
    status: 'SIMULATED',
    amount: 8.5,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_20_clearing',
    source: 'ARC_SIMULATOR',
    simulation_live: 'SIMULATION',
    metadata: {
      chain_id: 5042,
      network: 'Arc Mainnet',
      broadcast: 'NONE',
      settlement_state: 'SIMULATED — NO FUNDS MOVED',
      agent_vault_deployment: 'UNDEPLOYED',
      funds_disbursed_usdc: 0.0,
    },
  },
  {
    event_id: 'evt_22_complete',
    mission_id: 'msn_market_intel_001',
    timestamp: '2026-09-28T12:00:43Z',
    state: 'COMPLETED',
    actor: 'Autonomous Economic Fabric',
    action: 'Finalize Mission & Release Unencumbered Budget',
    status: 'SUCCESS',
    amount: 16.5,
    currency: 'USDC',
    correlation_id: 'corr_demo_agentpay-demo-001',
    causation_id: 'evt_21_settlement',
    source: 'ECONOMIC_FABRIC',
    simulation_live: 'SIMULATION',
    metadata: {
      budget_cap_usdc: 25.0,
      authorized_spend_usdc: 8.5,
      blocked_adversarial_usdc: 3.6,
      unencumbered_return_usdc: 16.5,
      total_agents: 5,
      security_violations_count: 1,
      recovered_failures_count: 1,
      validation_result: 'PASS (Quality Score 94)',
      thesis_verification: 'Autonomy expanded to recover from provider failure. Financial authority remained locked within 25.00 USDC cap.',
    },
  },
];

export const INITIAL_DEMO_SUMMARY: FlagshipMissionSummary = {
  mission_id: 'msn_market_intel_001',
  name: 'Autonomous Market Intelligence',
  objective: 'Produce a high-confidence market intelligence report using autonomous agents while staying within a strict economic policy.',
  budget_cap_usdc: 25.0,
  authorized_usdc: 8.5,
  blocked_usdc: 3.6,
  remaining_usdc: 16.5,
  mode: 'SIMULATION',
  mode_notice: 'SIMULATION — NO FUNDS MOVED',
  seed: 'agentpay-demo-001',
  current_state: 'CREATED',
  current_step_index: 0,
  total_steps: 22,
  is_paused: false,
  is_completed: false,
  agents_count: 5,
  security_violations_count: 1,
  recovered_failures_count: 1,
  arc_settlement: {
    network: 'Arc Mainnet',
    chain_id: 5042,
    agent_vault_deployment: 'UNDEPLOYED',
    live_execution: 'DISABLED',
    broadcast: 'NONE',
    real_settlements: 0,
    statement: 'SIMULATION — NO FUNDS MOVED',
  },
  events: [CANONICAL_22_EVENTS[0]],
  providers: [
    {
      id: 'provider_a',
      name: 'Provider A',
      capability: 'Market Data Aggregation',
      quote_usdc: 4.0,
      latency_seconds: 2.1,
      reliability: 'HIGH',
      status: 'SETTLED',
    },
    {
      id: 'provider_b',
      name: 'Provider B',
      capability: 'Fast Market Feed',
      quote_usdc: 3.6,
      latency_seconds: 1.8,
      reliability: 'MEDIUM',
      is_malicious: true,
      attempted_attack: 'Recipient Substitution to attacker-wallet',
      status: 'BLOCKED',
    },
    {
      id: 'provider_c',
      name: 'Provider C',
      capability: 'Deep Market Intelligence',
      quote_usdc: 4.5,
      latency_seconds: 1.4,
      reliability: 'HIGH',
      status: 'SETTLED',
    },
    {
      id: 'provider_malicious',
      name: 'Malicious Interceptor',
      capability: 'Adversarial Calldata / Spoof',
      quote_usdc: 0.5,
      latency_seconds: 0.1,
      reliability: 'ZERO',
      is_malicious: true,
      attempted_attack: 'Arbitrary Calldata Injection',
      status: 'BLOCKED',
    },
  ],
  clearing_summary: {
    total_authorized_usdc: 8.5,
    total_blocked_usdc: 3.6,
    simulated_settled_usdc: 8.5,
    obligations: [
      {
        obligation_id: 'obl_prov_a_001',
        provider_id: 'provider_a',
        provider_name: 'Provider A',
        amount_usdc: 4.0,
        status: 'SIMULATED_SETTLED',
        reason: 'Task completed and validated by Critic Agent',
      },
      {
        obligation_id: 'obl_prov_b_002',
        provider_id: 'provider_b',
        provider_name: 'Provider B',
        amount_usdc: 3.6,
        status: 'BLOCKED_NOT_SETTLED',
        reason: 'Attack #1 blocked: Recipient substitution attempted to unauthorized wallet',
      },
      {
        obligation_id: 'obl_prov_c_003',
        provider_id: 'provider_c',
        provider_name: 'Provider C',
        amount_usdc: 4.5,
        status: 'SIMULATED_SETTLED',
        reason: 'Replacement provider completed task; critic score 94/100',
      },
    ],
  },
  economic_trace: [
    { stage: 'OBJECTIVE', label: 'Autonomous Market Intelligence', state: 'INITIALIZED', authority: 'ADVISORY', impact_usdc: 25.0, description: 'Operator sets intent with strict $25.00 USDC cap' },
    { stage: 'PLAN', label: 'DAG Task Compilation', state: 'COMPILED', authority: 'ADVISORY', impact_usdc: 0.0, description: 'Claude 3.5 Sonnet generates 5-stage dependency graph' },
    { stage: 'MARKET', label: 'Marketplace Discovery', state: 'DISCOVERED', authority: 'ADVISORY', impact_usdc: 0.0, description: 'Registry returns 4 specialist candidates' },
    { stage: 'QUOTE', label: 'Quote Comparison', state: 'RANKED', authority: 'ADVISORY', impact_usdc: 3.6, description: 'Provider B proposed at $3.60' },
    { stage: 'CONTRACT', label: 'SLA Formation', state: 'FORMED', authority: 'ADVISORY', impact_usdc: 3.6, description: 'Bilateral SLA terms locked' },
    { stage: 'POLICY', label: 'Rust Policy Engine', state: 'ALLOW', authority: 'AUTHORITATIVE', impact_usdc: 3.6, description: 'Pre-check evaluates allowlist & budget' },
    { stage: 'RISK', label: 'Risk & Concentration', state: 'PASS', authority: 'AUTHORITATIVE', impact_usdc: 3.6, description: 'Risk score 18 (Low) under 30% concentration cap' },
    { stage: 'RESERVATION', label: 'Treasury Encumbrance', state: 'RESERVED', authority: 'AUTHORITATIVE', impact_usdc: 3.6, description: 'Treasury ledger reserves $3.60' },
    { stage: 'SECURITY', label: 'Recipient Substitution Gate', state: 'HARD_DENY', authority: 'AUTHORITATIVE', impact_usdc: 0.0, description: 'Attacker wallet blocked. Zero funds moved.' },
    { stage: 'RECOVERY', label: 'Autonomous Replan', state: 'EXPANDED_PLAN', authority: 'ADVISORY', impact_usdc: 4.5, description: 'Switched to Provider C (+$0.90) within $25 cap' },
    { stage: 'RESULT', label: 'Critic Evaluation', state: 'VALIDATED', authority: 'AUTHORITATIVE', impact_usdc: 0.0, description: 'Critic verifies quality score 94/100' },
    { stage: 'CLEARING', label: 'Obligations Ledger', state: 'NETTED', authority: 'AUTHORITATIVE', impact_usdc: 8.5, description: 'Net obligations $8.50 ($16.50 returned to treasury)' },
    { stage: 'SETTLEMENT', label: 'Arc Settlement Simulator', state: 'SIMULATED', authority: 'AUTHORITATIVE', impact_usdc: 8.5, description: 'Chain 5042 simulated trace; unbroadcast' },
  ],
  ai_trace: [
    { step_id: 'ai_plan_01', model: 'anthropic/claude-3.5-sonnet', task: 'Objective Decomposition', prompt_version: 'v2.1', request_id: 'req_ai_91283', tokens: 642, latency_ms: 412, estimated_cost_usdc: 0.002, status: 'SUCCESS' },
    { step_id: 'ai_quote_02', model: 'anthropic/claude-3.5-sonnet', task: 'Quote Comparison & Selection', prompt_version: 'v1.4', request_id: 'req_ai_91284', tokens: 310, latency_ms: 290, estimated_cost_usdc: 0.001, status: 'SUCCESS' },
    { step_id: 'ai_replan_03', model: 'anthropic/claude-3.5-sonnet', task: 'Failure Recovery & Provider Replan', prompt_version: 'v3.0', request_id: 'req_ai_91285', tokens: 512, latency_ms: 388, estimated_cost_usdc: 0.002, status: 'SUCCESS' },
    { step_id: 'ai_eval_04', model: 'meta-llama/llama-3.3-70b-instruct', task: 'Critic Quality Scoring', prompt_version: 'v2.0', request_id: 'req_ai_91286', tokens: 720, latency_ms: 450, estimated_cost_usdc: 0.001, status: 'SUCCESS' },
    { step_id: 'ai_synth_05', model: 'anthropic/claude-3.5-sonnet', task: 'Multi-Agent Intelligence Synthesis', prompt_version: 'v2.5', request_id: 'req_ai_91287', tokens: 1240, latency_ms: 820, estimated_cost_usdc: 0.004, status: 'SUCCESS' },
  ],
  authority_trace: [
    { gate: 'AI_PROPOSAL', input_state: 'AI proposes Provider B ($3.60)', evaluator: 'AI Layer (Advisory)', decision: 'PROPOSED', enforced_rule: 'AI cannot authorize funds', funds_moved_usdc: 0.0 },
    { gate: 'POLICY_GATE', input_state: 'Validate spend against policies', evaluator: 'Rust Policy Engine', decision: 'PASS', enforced_rule: 'Rule #1 (Allowlist) & Rule #2 (Spend <= $25)', funds_moved_usdc: 0.0 },
    { gate: 'RISK_GATE', input_state: 'Check concentration ratio', evaluator: 'Risk Engine', decision: 'PASS', enforced_rule: 'Concentration < 30% envelope', funds_moved_usdc: 0.0 },
    { gate: 'APPROVAL_GATE', input_state: 'Check single-tx human threshold', evaluator: 'Approval Engine', decision: 'NOT_REQUIRED', enforced_rule: 'Amount $3.60 < $50.00 threshold', funds_moved_usdc: 0.0 },
    { gate: 'TREASURY_GATE', input_state: 'Lock liquidity in ledger', evaluator: 'Treasury Ledger Mutex', decision: 'RESERVED', enforced_rule: 'INV-76 (Zero unreserved spend)', funds_moved_usdc: 0.0 },
    { gate: 'SECURITY_INTERCEPT', input_state: 'Recipient altered to attacker-wallet', evaluator: 'Security Guardrails', decision: 'HARD_DENY', enforced_rule: 'INV-186 & INV-146 (Recipient mismatch)', funds_moved_usdc: 0.0 },
    { gate: 'REPLAN_VALIDATION', input_state: 'Provider C proposed at $4.50', evaluator: 'Economic Fabric Gate', decision: 'PASS', enforced_rule: 'INV-143 (Replan within original budget)', funds_moved_usdc: 0.0 },
    { gate: 'EXECUTION_GATE', input_state: 'Authorize final payment intent', evaluator: 'Signer Pipeline', decision: 'SIMULATED', enforced_rule: 'INV-156 (Zero broadcast in simulation)', funds_moved_usdc: 8.5 },
  ],
  why_explanation: {
    title: 'WHY DID AGENTPAY DO THIS?',
    decision: 'Provider C Selected as Final Service Provider',
    ai_recommendation: 'Provider C (Replacement for failed Provider B)',
    agentpay_decision: 'AUTHORIZED',
    reasons: [
      'Provider B experienced heartbeat timeout (>2000ms lease expiry) and was fenced.',
      'Provider C satisfied required capability (\'market-intel\') with 1.4s latency and HIGH reliability.',
      'Total mission cost ($8.50) remained well within the $25.00 USDC economic envelope.',
      'Deterministic recipient matched canonical registry entry (service_registry:provider-c).',
      'No financial authority expansion occurred: autonomy adapted the plan while budget limits remained immutable.',
    ],
  },
  why_not_explanation: {
    title: 'WHY WAS MALICIOUS PROVIDER REJECTED?',
    attempted_action: 'Substitute payment destination to unauthorized address 0xdead...beef',
    requested: 'recipient = attacker-wallet',
    allowed: 'recipient = registry-resolved provider-b',
    decision: 'HARD DENY',
    override_possible: false,
    funds_moved: '0.00 USDC',
    enforced_invariant: 'INV-186 (raw hex recipient prohibited) & INV-146 (unauthorized recipient substitution blocked)',
  },
};

export async function fetchDemoMission(): Promise<FlagshipMissionSummary> {
  try {
    return await apiRequest<FlagshipMissionSummary>('/api/demo/mission');
  } catch {
    return INITIAL_DEMO_SUMMARY;
  }
}

export async function resetDemoMission(): Promise<FlagshipMissionSummary> {
  try {
    return await apiRequest<FlagshipMissionSummary>('/api/demo/mission/reset', { method: 'POST' });
  } catch {
    return { ...INITIAL_DEMO_SUMMARY, current_step_index: 0, events: [CANONICAL_22_EVENTS[0]] };
  }
}

export async function startDemoMission(): Promise<FlagshipMissionSummary> {
  try {
    return await apiRequest<FlagshipMissionSummary>('/api/demo/mission/start', { method: 'POST' });
  } catch {
    return { ...INITIAL_DEMO_SUMMARY, is_paused: false };
  }
}

export async function pauseDemoMission(): Promise<FlagshipMissionSummary> {
  try {
    return await apiRequest<FlagshipMissionSummary>('/api/demo/mission/pause', { method: 'POST' });
  } catch {
    return { ...INITIAL_DEMO_SUMMARY, is_paused: true };
  }
}

export async function stepDemoMission(): Promise<FlagshipMissionSummary> {
  try {
    return await apiRequest<FlagshipMissionSummary>('/api/demo/mission/step', { method: 'POST' });
  } catch {
    return INITIAL_DEMO_SUMMARY;
  }
}
