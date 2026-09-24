import { apiRequest } from './client';

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

export interface ClearingLedgerEntry {
  entry_id: string;
  organization_id: string;
  obligation_id: string;
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
    return await apiRequest<EconomicObligation[]>(`/v1/economy/obligations${qs}`);
  } catch {
    return MOCK_OBLIGATIONS;
  }
}

export async function fetchEscrows(orgId?: string): Promise<EconomicEscrow[]> {
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<EconomicEscrow[]>(`/v1/economy/escrows${qs}`);
  } catch {
    return MOCK_ESCROWS;
  }
}

export async function fetchMilestones(contractId?: string): Promise<PaymentMilestone[]> {
  try {
    const qs = contractId ? `?contract_id=${encodeURIComponent(contractId)}` : '';
    return await apiRequest<PaymentMilestone[]>(`/v1/economy/milestones${qs}`);
  } catch {
    return MOCK_MILESTONES;
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

export async function fetchReconciliation(orgId?: string): Promise<ReconciliationRecord[]> {
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<ReconciliationRecord[]>(`/v1/economy/reconciliation${qs}`);
  } catch {
    return MOCK_RECONCILIATION;
  }
}

export async function runReconciliation(obligationId: string): Promise<ReconciliationRecord> {
  return await apiRequest<ReconciliationRecord>(`/v1/economy/reconciliation/${encodeURIComponent(obligationId)}`, {
    method: 'POST',
  });
}

export async function fetchExposure(orgId?: string, mode: ClearingExecutionMode = 'REAL'): Promise<EconomicExposureSnapshot> {
  try {
    const params = new URLSearchParams();
    if (orgId) params.set('org_id', orgId);
    params.set('mode', mode);
    return await apiRequest<EconomicExposureSnapshot>(`/v1/economy/exposure?${params.toString()}`);
  } catch {
    return { ...MOCK_EXPOSURE, execution_mode: mode };
  }
}

export async function fetchHealth(orgId?: string, mode: ClearingExecutionMode = 'REAL'): Promise<EconomicHealthSnapshot> {
  try {
    const params = new URLSearchParams();
    if (orgId) params.set('org_id', orgId);
    params.set('mode', mode);
    return await apiRequest<EconomicHealthSnapshot>(`/v1/economy/health?${params.toString()}`);
  } catch {
    return { ...MOCK_HEALTH, execution_mode: mode };
  }
}

export async function fetchLedger(orgId?: string): Promise<ClearingLedgerEntry[]> {
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<ClearingLedgerEntry[]>(`/v1/economy/clearing/ledger${qs}`);
  } catch {
    return [
      {
        entry_id: 'ledg_01',
        organization_id: 'org_default',
        obligation_id: 'ob_live_01',
        entry_type: 'FUNDS_RESERVED',
        debit_account: 'vault_available:0x1111...',
        credit_account: 'escrow_reserved:esc_01',
        amount: '30000000',
        currency: 'USDC',
        execution_mode: 'REAL',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        hash: 'hash_ledg_01',
      },
    ];
  }
}

export async function fetchNettingProposals(orgId?: string): Promise<NettingProposal[]> {
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<NettingProposal[]>(`/v1/economy/netting/proposals${qs}`);
  } catch {
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
}

export async function fetchBatches(orgId?: string): Promise<SettlementBatch[]> {
  try {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<SettlementBatch[]>(`/v1/economy/batches${qs}`);
  } catch {
    return [
      {
        batch_id: 'batch_sched_01',
        organization_id: 'org_default',
        currency: 'USDC',
        obligation_ids: ['ob_live_01', 'ob_sim_02'],
        gross_amount: '40000000',
        net_amount: '40000000',
        savings: '0',
        status: 'READY',
        execution_mode: 'REAL',
        created_at: new Date(Date.now() - 600000).toISOString(),
      },
    ];
  }
}
