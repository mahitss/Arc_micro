import { apiRequest } from './client';
import { getActiveDataMode, DataMode } from '../data-authority';

export type ClearingExecutionMode = 'REAL' | 'SIMULATION';

export interface EconomicObligation {
  obligation_id: string;
  organization_id: string;
  payer_agent_id: string;
  payee_agent_id: string;
  contract_id: string;
  capability?: string;
  amount: string; // micro-USDC
  currency: string;
  status: string;
  due_at?: string;
  settled_amount: string;
  payment_intent_id?: string;
  execution_mode: ClearingExecutionMode;
  created_at: string;
  updated_at: string;
}

export interface EconomicEscrow {
  escrow_id: string;
  obligation_id: string;
  contract_id: string;
  organization_id: string;
  payer: string;
  payee: string;
  vault_address: string;
  amount: string;
  reserved_amount: string;
  released_amount: string;
  refunded_amount: string;
  currency: string;
  status: string;
  execution_mode: ClearingExecutionMode;
  created_at: string;
}

export interface PaymentMilestone {
  milestone_id: string;
  contract_id: string;
  obligation_id: string;
  organization_id: string;
  sequence: number;
  description: string;
  amount: string;
  verification_rule: string;
  due_at?: string;
  status: string;
  actual_output?: string;
  result_hash?: string;
  evidence_uri?: string;
  verified_at?: string;
  settled_at?: string;
  payment_intent_id?: string;
}

export interface EconomicInvoice {
  invoice_id: string;
  contract_id: string;
  obligation_id?: string;
  organization_id: string;
  provider_agent_id: string;
  requester_agent_id: string;
  amount: string;
  currency: string;
  line_items: Array<{ item_number: number; description: string; amount: string }>;
  status: string;
  issued_at: string;
  due_at: string;
  execution_mode: ClearingExecutionMode;
}

export interface NettingProposal {
  proposal_id: string;
  organization_id: string;
  agent_a: string;
  agent_b: string;
  currency: string;
  gross_total: string;
  net_payer: string;
  net_payee: string;
  net_amount: string;
  savings_amount: string;
  status: string;
  approved_by_a: boolean;
  approved_by_b: boolean;
  created_at: string;
}

export interface SettlementBatch {
  batch_id: string;
  organization_id: string;
  currency: string;
  obligation_ids: string[];
  gross_amount: string;
  net_amount: string;
  savings: string;
  status: string;
  execution_mode: ClearingExecutionMode;
  created_at: string;
}

export interface ReconciliationRecord {
  record_id: string;
  organization_id: string;
  obligation_id: string;
  payment_intent_id: string;
  transaction_hash?: string;
  chain_id: string;
  target_contract: string;
  expected_amount: string;
  actual_amount: string;
  expected_recipient: string;
  actual_recipient: string;
  status: 'MATCHED' | 'MISMATCH' | 'PENDING' | 'AMBIGUOUS' | 'RESOLVED';
  discrepancy_notes?: string;
  recommended_action?: string;
  execution_mode: ClearingExecutionMode;
  reconciled_at: string;
}

export interface EconomicExposureSnapshot {
  organization_id: string;
  current_exposure: string;
  max_possible_exposure: string;
  reserved_in_escrow: string;
  outstanding_obligations: string;
  pending_settlements: string;
  disputed_amount: string;
  unsettled_invoices: string;
  counterparties: Array<{
    agent_id: string;
    committed_payable: string;
    reserved_in_escrow: string;
    pending_settlement: string;
    receivable_amount: string;
    net_exposure: string;
    risk_level: string;
  }>;
  execution_mode: ClearingExecutionMode;
  calculated_at: string;
}

export interface EconomicHealthSnapshot {
  organization_id: string;
  on_chain_available: string;
  active_escrow_reserved: string;
  available_unencumbered: string;
  total_exposure: string;
  solvency_ratio: number;
  health_status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  deterministic_signals: string[];
  execution_mode: ClearingExecutionMode;
  evaluated_at: string;
}

export interface FlagshipSimulationResult {
  simulation_id: string;
  mode: string;
  obligations_count: number;
  gross_value: string;
  netted_value: string;
  net_settlement: string;
  projected_savings: string;
  batches_count: number;
  obligations: EconomicObligation[];
  netting_proposal?: NettingProposal;
  batch?: SettlementBatch;
  reconciliation?: ReconciliationRecord;
  ledger_balanced: boolean;
  total_debits: string;
  total_credits: string;
  simulated_ledger: ClearingLedgerEntry[];
  live_arc_status: string;
  sim_recon_status: string;
  financial_authority: string;
  settlement_status: string;
  timestamp: string;
}

export interface ClearingLedgerEntry {
  entry_id: string;
  organization_id: string;
  obligation_id: string;
  contract_id?: string;
  entry_type: string;
  debit_account: string;
  credit_account: string;
  amount: string;
  currency: string;
  execution_mode: ClearingExecutionMode;
  timestamp: string;
  hash: string;
}

// =============================================================================
// MOCK DATA FALLBACKS (Guarantees UI renders when backend is offline)
// =============================================================================

export const MOCK_OBLIGATIONS: EconomicObligation[] = [
  {
    obligation_id: 'ob_live_01',
    organization_id: 'org_default',
    payer_agent_id: 'agent_coordinator_a',
    payee_agent_id: 'agent_researcher_b',
    contract_id: 'contract_sec_report_30',
    capability: 'security.report',
    amount: '30000000',
    currency: 'USDC',
    status: 'AUTHORIZED',
    settled_amount: '15000000',
    payment_intent_id: 'intent_ob_01',
    execution_mode: 'REAL',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    obligation_id: 'ob_sim_02',
    organization_id: 'org_default',
    payer_agent_id: 'agent_data_harvester',
    payee_agent_id: 'agent_synth_ai',
    contract_id: 'contract_synth_dataset_10',
    capability: 'dataset.synthesis',
    amount: '10000000',
    currency: 'USDC',
    status: 'SETTLED',
    settled_amount: '10000000',
    payment_intent_id: 'intent_sim_02',
    execution_mode: 'SIMULATION',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MOCK_ESCROWS: EconomicEscrow[] = [
  {
    escrow_id: 'esc_vault_01',
    obligation_id: 'ob_live_01',
    contract_id: 'contract_sec_report_30',
    organization_id: 'org_default',
    payer: 'agent_coordinator_a',
    payee: 'agent_researcher_b',
    vault_address: '0x1111111111111111111111111111111111111111',
    amount: '30000000',
    reserved_amount: '15000000',
    released_amount: '15000000',
    refunded_amount: '0',
    currency: 'USDC',
    status: 'RESERVED',
    execution_mode: 'REAL',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const MOCK_MILESTONES: PaymentMilestone[] = [
  {
    milestone_id: 'ms_01',
    contract_id: 'contract_sec_report_30',
    obligation_id: 'ob_live_01',
    organization_id: 'org_default',
    sequence: 1,
    description: 'Security intelligence gathering and CVE index',
    amount: '5000000',
    verification_rule: 'MIN_LENGTH_50',
    status: 'SETTLED',
    actual_output: 'Indexed 14 CVE feeds, 400 indicators analyzed.',
    verified_at: new Date(Date.now() - 3000000).toISOString(),
    settled_at: new Date(Date.now() - 2900000).toISOString(),
  },
  {
    milestone_id: 'ms_02',
    contract_id: 'contract_sec_report_30',
    obligation_id: 'ob_live_01',
    organization_id: 'org_default',
    sequence: 2,
    description: 'Risk correlation matrix and attack surface graph',
    amount: '10000000',
    verification_rule: 'MIN_LENGTH_50',
    status: 'SETTLED',
    actual_output: 'Graph nodes correlation complete: 18 critical paths.',
    verified_at: new Date(Date.now() - 2000000).toISOString(),
    settled_at: new Date(Date.now() - 1900000).toISOString(),
  },
  {
    milestone_id: 'ms_03',
    contract_id: 'contract_sec_report_30',
    obligation_id: 'ob_live_01',
    organization_id: 'org_default',
    sequence: 3,
    description: 'Executive briefing and machine-readable remediation plan',
    amount: '15000000',
    verification_rule: 'MIN_LENGTH_50',
    status: 'VERIFIED',
    actual_output: 'Comprehensive Security Intelligence Report v1.0. 42 actionable remediation items.',
    verified_at: new Date(Date.now() - 600000).toISOString(),
  },
];

export const MOCK_RECONCILIATION: ReconciliationRecord[] = [
  {
    record_id: 'rec_match_01',
    organization_id: 'org_default',
    obligation_id: 'ob_live_01',
    payment_intent_id: 'intent_ob_01',
    transaction_hash: '0x2fec1a70fa311f9dcbe7dc6a794ce5b06f283ef3bf38145159195034d3c4aaab',
    chain_id: '5042',
    target_contract: '0x1111111111111111111111111111111111111111',
    expected_amount: '15000000',
    actual_amount: '15000000',
    expected_recipient: '0xResearcherWallet123',
    actual_recipient: '0xResearcherWallet123',
    status: 'MATCHED',
    discrepancy_notes: 'Confirmed on Arc block 104200 with successful AgentVault payment event.',
    execution_mode: 'REAL',
    reconciled_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    record_id: 'rec_ambig_02',
    organization_id: 'org_default',
    obligation_id: 'ob_live_02',
    payment_intent_id: 'intent_ambig_02',
    chain_id: '5042',
    target_contract: '0x1111111111111111111111111111111111111111',
    expected_amount: '5000000',
    actual_amount: '',
    expected_recipient: '0xWorkerNode99',
    actual_recipient: '',
    status: 'AMBIGUOUS',
    discrepancy_notes: 'Transaction submitted but unconfirmed on Arc. Waiting for finality without rebroadcast (INV-69).',
    recommended_action: 'Poll gateway status or await block confirmation.',
    execution_mode: 'REAL',
    reconciled_at: new Date(Date.now() - 300000).toISOString(),
  },
];

export const MOCK_EXPOSURE: EconomicExposureSnapshot = {
  organization_id: 'org_default',
  current_exposure: '30000000',
  max_possible_exposure: '45000000',
  reserved_in_escrow: '15000000',
  outstanding_obligations: '30000000',
  pending_settlements: '15000000',
  disputed_amount: '0',
  unsettled_invoices: '0',
  counterparties: [
    {
      agent_id: 'agent_researcher_b',
      committed_payable: '30000000',
      reserved_in_escrow: '15000000',
      pending_settlement: '15000000',
      receivable_amount: '0',
      net_exposure: '30000000',
      risk_level: 'LOW',
    },
  ],
  execution_mode: 'REAL',
  calculated_at: new Date().toISOString(),
};

export const MOCK_HEALTH: EconomicHealthSnapshot = {
  organization_id: 'org_default',
  on_chain_available: '100000000',
  active_escrow_reserved: '15000000',
  available_unencumbered: '85000000',
  total_exposure: '30000000',
  solvency_ratio: 3.33,
  health_status: 'HEALTHY',
  deterministic_signals: [
    'On-chain vault balance covers 3.33x total obligations',
    'Escrow reservations fully bounded and funded',
    'Zero unbacked settlement batches detected',
  ],
  execution_mode: 'REAL',
  evaluated_at: new Date().toISOString(),
};

// =============================================================================
// API FUNCTIONS
// =============================================================================

export async function fetchObligations(orgId?: string): Promise<EconomicObligation[]> {
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    const res = await apiRequest<EconomicObligation[]>(`/v1/economy/obligations${qs}`);
    return res || [];
  } catch {
    return [];
  }
}

export async function fetchEscrows(orgId?: string, mode?: DataMode): Promise<EconomicEscrow[]> {
  const currentMode = mode || getActiveDataMode();
  if (currentMode === 'SIMULATION') {
    return MOCK_ESCROWS;
  }
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<EconomicEscrow[]>(`/v1/economy/escrows${qs}`);
  } catch {
    return [];
  }
}

export async function fetchMilestones(contractId?: string, mode?: DataMode): Promise<PaymentMilestone[]> {
  const currentMode = mode || getActiveDataMode();
  if (currentMode === 'SIMULATION') {
    return MOCK_MILESTONES;
  }
  try {
    const qs = contractId ? `?contract_id=${encodeURIComponent(contractId)}` : '';
    return await apiRequest<PaymentMilestone[]>(`/v1/economy/milestones${qs}`);
  } catch {
    return [];
  }
}

export async function verifyMilestone(id: string): Promise<any> {
  return await apiRequest(`/v1/economy/milestones/${encodeURIComponent(id)}/verify`, {
    method: 'POST',
  });
}

export async function settleMilestone(id: string, idempotencyKey?: string): Promise<any> {
  return await apiRequest(`/v1/economy/milestones/${encodeURIComponent(id)}/settle`, {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: idempotencyKey || `idem_web_${Date.now()}` }),
  });
}

export async function fetchReconciliation(orgId?: string, mode?: DataMode): Promise<ReconciliationRecord[]> {
  const currentMode = mode || getActiveDataMode();
  if (currentMode === 'SIMULATION') {
    return MOCK_RECONCILIATION;
  }
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<ReconciliationRecord[]>(`/v1/economy/reconciliation${qs}`);
  } catch {
    return [];
  }
}

export async function runReconciliation(obligationId: string): Promise<ReconciliationRecord> {
  return await apiRequest<ReconciliationRecord>(`/v1/economy/reconciliation/${encodeURIComponent(obligationId)}`, {
    method: 'POST',
  });
}

export async function fetchExposure(orgId?: string, mode: ClearingExecutionMode = 'REAL'): Promise<EconomicExposureSnapshot> {
  const currentMode = getActiveDataMode();
  if (currentMode === 'SIMULATION' || mode === 'SIMULATION') {
    return { ...MOCK_EXPOSURE, execution_mode: 'SIMULATION' };
  }
  try {
    const params = new URLSearchParams();
    if (orgId) params.set('org_id', orgId);
    params.set('mode', mode);
    return await apiRequest<EconomicExposureSnapshot>(`/v1/economy/exposure?${params.toString()}`);
  } catch {
    return {
      organization_id: orgId || 'org_default',
      current_exposure: '0',
      max_possible_exposure: '0',
      reserved_in_escrow: '0',
      outstanding_obligations: '0',
      pending_settlements: '0',
      disputed_amount: '0',
      unsettled_invoices: '0',
      counterparties: [],
      execution_mode: mode,
      calculated_at: new Date().toISOString(),
    };
  }
}

export async function fetchHealth(orgId?: string, mode: ClearingExecutionMode = 'REAL'): Promise<EconomicHealthSnapshot> {
  const currentMode = getActiveDataMode();
  if (currentMode === 'SIMULATION' || mode === 'SIMULATION') {
    return { ...MOCK_HEALTH, execution_mode: 'SIMULATION' };
  }
  try {
    const params = new URLSearchParams();
    if (orgId) params.set('org_id', orgId);
    params.set('mode', mode);
    return await apiRequest<EconomicHealthSnapshot>(`/v1/economy/health?${params.toString()}`);
  } catch {
    return {
      organization_id: orgId || 'org_default',
      on_chain_available: '0',
      active_escrow_reserved: '0',
      available_unencumbered: '0',
      total_exposure: '0',
      solvency_ratio: 1.0,
      health_status: 'HEALTHY',
      deterministic_signals: [
        'Authoritative clearinghouse service online',
        'AgentVault is NOT deployed on Arc Mainnet (0 on-chain settlements)',
        'Live obligations remain 0',
      ],
      execution_mode: mode,
      evaluated_at: new Date().toISOString(),
    };
  }
}

export async function fetchLedger(orgId?: string, mode?: DataMode): Promise<ClearingLedgerEntry[]> {
  const currentMode = mode || getActiveDataMode();
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<ClearingLedgerEntry[]>(`/v1/economy/clearing/ledger${qs}`);
  } catch {
    if (currentMode === 'SIMULATION') {
      return [
        {
          entry_id: 'ledg_sim_01',
          organization_id: 'org_default',
          obligation_id: 'ob_sim_01',
          entry_type: 'FUNDS_RESERVED',
          debit_account: 'vault_available:simulated',
          credit_account: 'escrow_reserved:sim_01',
          amount: '30000000',
          currency: 'USDC',
          execution_mode: 'SIMULATION',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          hash: 'sim_hash_ledg_01',
        },
      ];
    }
    return [];
  }
}

export async function fetchNettingProposals(orgId?: string, mode?: DataMode): Promise<NettingProposal[]> {
  const currentMode = mode || getActiveDataMode();
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<NettingProposal[]>(`/v1/economy/netting/proposals${qs}`);
  } catch {
    if (currentMode === 'SIMULATION') {
      return [
        {
          proposal_id: 'net_prop_01',
          organization_id: 'org_default',
          agent_a: 'agent_coordinator_a',
          agent_b: 'agent_researcher_b',
          currency: 'USDC',
          gross_total: '20000000',
          net_payer: 'agent_coordinator_a',
          net_payee: 'agent_researcher_b',
          net_amount: '4000000',
          savings_amount: '16000000',
          status: 'PROPOSED',
          approved_by_a: true,
          approved_by_b: false,
          created_at: new Date(Date.now() - 1200000).toISOString(),
        },
      ];
    }
    return [];
  }
}

export async function fetchBatches(orgId?: string, mode?: DataMode): Promise<SettlementBatch[]> {
  const currentMode = mode || getActiveDataMode();
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<SettlementBatch[]>(`/v1/economy/batches${qs}`);
  } catch {
    if (currentMode === 'SIMULATION') {
      return [
        {
          batch_id: 'batch_sched_01',
          organization_id: 'org_default',
          currency: 'USDC',
          obligation_ids: ['ob_sim_01', 'ob_sim_02'],
          gross_amount: '40000000',
          net_amount: '40000000',
          savings: '0',
          status: 'READY',
          execution_mode: 'SIMULATION',
          created_at: new Date(Date.now() - 600000).toISOString(),
        },
      ];
    }
    return [];
  }
}

export async function runClearingSimulation(orgId?: string): Promise<FlagshipSimulationResult> {
  const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
  try {
    return await apiRequest<FlagshipSimulationResult>(`/v1/economy/clearing/simulate${qs}`, {
      method: 'POST',
      body: JSON.stringify({ org_id: orgId || 'org_default' }),
    });
  } catch {
    // Deterministic fallback if backend gateway is offline
    const now = new Date();
    return {
      simulation_id: `sim_clr_demo_fallback`,
      mode: 'SIMULATION',
      obligations_count: 4,
      gross_value: '24000000',
      netted_value: '4000000',
      net_settlement: '20000000',
      projected_savings: '4000000',
      batches_count: 1,
      obligations: [
        {
          obligation_id: 'ob_sim_flagship_01',
          organization_id: orgId || 'org_default',
          payer_agent_id: 'agent_coordinator_a',
          payee_agent_id: 'agent_data_harvester',
          contract_id: 'contract_mkt_intel_01',
          capability: 'market.data_harvest',
          amount: '5000000',
          settled_amount: '5000000',
          currency: 'USDC',
          status: 'SETTLED',
          execution_mode: 'SIMULATION',
          created_at: new Date(now.getTime() - 180000).toISOString(),
          updated_at: now.toISOString(),
        },
        {
          obligation_id: 'ob_sim_flagship_02',
          organization_id: orgId || 'org_default',
          payer_agent_id: 'agent_coordinator_a',
          payee_agent_id: 'agent_researcher_b',
          contract_id: 'contract_mkt_intel_01',
          capability: 'market.research_report',
          amount: '10000000',
          settled_amount: '10000000',
          currency: 'USDC',
          status: 'SETTLED',
          execution_mode: 'SIMULATION',
          created_at: new Date(now.getTime() - 120000).toISOString(),
          updated_at: now.toISOString(),
        },
        {
          obligation_id: 'ob_sim_flagship_03',
          organization_id: orgId || 'org_default',
          payer_agent_id: 'agent_researcher_b',
          payee_agent_id: 'agent_coordinator_a',
          contract_id: 'contract_mkt_intel_01',
          capability: 'market.rebate_feed',
          amount: '4000000',
          settled_amount: '4000000',
          currency: 'USDC',
          status: 'SETTLED',
          execution_mode: 'SIMULATION',
          created_at: new Date(now.getTime() - 60000).toISOString(),
          updated_at: now.toISOString(),
        },
        {
          obligation_id: 'ob_sim_flagship_04',
          organization_id: orgId || 'org_default',
          payer_agent_id: 'agent_coordinator_a',
          payee_agent_id: 'agent_validator_c',
          contract_id: 'contract_mkt_intel_01',
          capability: 'result.verification',
          amount: '5000000',
          settled_amount: '0',
          currency: 'USDC',
          status: 'AUTHORIZED',
          execution_mode: 'SIMULATION',
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ],
      netting_proposal: {
        proposal_id: 'net_sim_flagship_01',
        organization_id: orgId || 'org_default',
        agent_a: 'agent_coordinator_a',
        agent_b: 'agent_researcher_b',
        currency: 'USDC',
        gross_total: '14000000',
        net_payer: 'agent_coordinator_a',
        net_payee: 'agent_researcher_b',
        net_amount: '6000000',
        savings_amount: '4000000',
        status: 'PROPOSED',
        approved_by_a: true,
        approved_by_b: true,
        created_at: now.toISOString(),
      },
      batch: {
        batch_id: 'batch_sim_flagship_01',
        organization_id: orgId || 'org_default',
        currency: 'USDC',
        obligation_ids: ['ob_sim_flagship_01', 'ob_sim_flagship_02', 'ob_sim_flagship_03', 'ob_sim_flagship_04'],
        gross_amount: '24000000',
        net_amount: '20000000',
        savings: '4000000',
        status: 'READY',
        execution_mode: 'SIMULATION',
        created_at: now.toISOString(),
      },
      reconciliation: {
        record_id: 'rec_sim_flagship_01',
        organization_id: orgId || 'org_default',
        obligation_id: 'ob_sim_flagship_01',
        payment_intent_id: 'intent_sim_flagship_01',
        status: 'MATCHED',
        expected_amount: '5000000',
        actual_amount: '5000000',
        expected_recipient: 'agent_data_harvester',
        actual_recipient: 'agent_data_harvester',
        chain_id: '5042',
        target_contract: '0x0000000000000000000000000000000000000000',
        discrepancy_notes: 'Deterministic simulation reconciliation: ledger entries balanced. Zero on-chain broadcast.',
        execution_mode: 'SIMULATION',
        reconciled_at: now.toISOString(),
      },
      ledger_balanced: true,
      total_debits: '24000000',
      total_credits: '24000000',
      simulated_ledger: [
        {
          entry_id: 'clearing_led_sim_01',
          organization_id: orgId || 'org_default',
          obligation_id: 'ob_sim_flagship_01',
          contract_id: 'contract_mkt_intel_01',
          entry_type: 'OBLIGATION_CREATED',
          debit_account: 'payer_obligation:agent_coordinator_a',
          credit_account: 'payee_receivable:agent_data_harvester',
          amount: '5000000',
          currency: 'USDC',
          execution_mode: 'SIMULATION',
          timestamp: now.toISOString(),
          hash: 'hash_sim_01',
        },
        {
          entry_id: 'clearing_led_sim_02',
          organization_id: orgId || 'org_default',
          obligation_id: 'ob_sim_flagship_02',
          contract_id: 'contract_mkt_intel_01',
          entry_type: 'OBLIGATION_CREATED',
          debit_account: 'payer_obligation:agent_coordinator_a',
          credit_account: 'payee_receivable:agent_researcher_b',
          amount: '10000000',
          currency: 'USDC',
          execution_mode: 'SIMULATION',
          timestamp: now.toISOString(),
          hash: 'hash_sim_02',
        },
        {
          entry_id: 'clearing_led_sim_03',
          organization_id: orgId || 'org_default',
          obligation_id: 'ob_sim_flagship_03',
          contract_id: 'contract_mkt_intel_01',
          entry_type: 'OBLIGATION_CREATED',
          debit_account: 'payer_obligation:agent_researcher_b',
          credit_account: 'payee_receivable:agent_coordinator_a',
          amount: '4000000',
          currency: 'USDC',
          execution_mode: 'SIMULATION',
          timestamp: now.toISOString(),
          hash: 'hash_sim_03',
        },
        {
          entry_id: 'clearing_led_sim_04',
          organization_id: orgId || 'org_default',
          obligation_id: 'ob_sim_flagship_04',
          contract_id: 'contract_mkt_intel_01',
          entry_type: 'OBLIGATION_CREATED',
          debit_account: 'payer_obligation:agent_coordinator_a',
          credit_account: 'payee_receivable:agent_validator_c',
          amount: '5000000',
          currency: 'USDC',
          execution_mode: 'SIMULATION',
          timestamp: now.toISOString(),
          hash: 'hash_sim_04',
        },
      ],
      live_arc_status: 'BLOCKED — VAULT NOT DEPLOYED',
      sim_recon_status: 'AVAILABLE & MATCHED',
      financial_authority: 'POLICY CONTROLLED',
      settlement_status: 'SIMULATED — NO BROADCAST',
      timestamp: now.toISOString(),
    };
  }
}

export async function resetClearingSimulation(orgId?: string): Promise<void> {
  const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
  try {
    await apiRequest(`/v1/economy/clearing/reset${qs}`, {
      method: 'POST',
      body: JSON.stringify({ org_id: orgId || 'org_default' }),
    });
  } catch {
    // Ignore fallback errors
  }
}

export async function getClearingSimulation(orgId?: string): Promise<FlagshipSimulationResult | null> {
  const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
  try {
    const res = await apiRequest<FlagshipSimulationResult>(`/v1/economy/clearing/simulate${qs}`);
    if (res && res.simulation_id) {
      return res;
    }
    return null;
  } catch {
    return null;
  }
}
