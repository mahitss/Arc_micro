import { apiRequest } from './client';

export type CounterpartyIdentityStatus = 'UNVERIFIED' | 'IDENTIFIED' | 'VERIFIED' | 'SUSPENDED';

export interface EconomicCounterparty {
  counterparty_id: string;
  tenant_id: string;
  agent_id: string;
  organization_id: string;
  identity_status: CounterpartyIdentityStatus;
  capability_reference?: string;
  protocol_version: string;
  exposure_limit: string;
  current_exposure: string;
  historical_obligations: number;
  active_contracts: number;
  risk_reference: string;
  created_at: string;
  updated_at: string;
}

export interface ProposedNetObligation {
  payer_id: string;
  payee_id: string;
  net_amount: string;
  currency: string;
}

export interface MultiPartyNettingProposal {
  proposal_id: string;
  tenant_id: string;
  organization_id: string;
  currency: string;
  original_obligations: string[];
  proposed_net_obligations: ProposedNetObligation[];
  gross_value: string;
  net_value: string;
  savings_value: string;
  counterparties: string[];
  cycles_count: number;
  economic_impact: string;
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'EXPIRED';
  risk_status: 'ALLOW' | 'ESCALATE' | 'DENY';
  policy_status: 'PASS' | 'FLAG' | 'FAIL';
  approval_status: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'DENIED';
  created_at: string;
  expires_at: string;
}

export interface SettlementBatchItem {
  item_id: string;
  batch_id: string;
  obligation_id: string;
  payer_id: string;
  payee_id: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'SUBMITTED' | 'SETTLED' | 'FAILED' | 'RECONCILING';
  payment_intent_id?: string;
  execution_id?: string;
  settled_amount: string;
  failure_reason?: string;
}

export interface SettlementBatch {
  batch_id: string;
  tenant_id: string;
  organization_id: string;
  settlement_window: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'MILESTONE' | 'MANUAL';
  obligations: string[];
  netting_proposal_id?: string;
  gross_amount: string;
  net_amount: string;
  savings: string;
  currency: string;
  status: 'OPEN' | 'BUILDING' | 'READY' | 'AWAITING_APPROVAL' | 'APPROVED' | 'SUBMITTING' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'FAILED' | 'RECONCILING' | 'CANCELLED';
  items?: SettlementBatchItem[];
  created_at: string;
  approved_at?: string;
  submitted_at?: string;
  completed_at?: string;
}

export interface ReconciliationItem {
  item_id: string;
  tenant_id: string;
  obligation_id?: string;
  payment_intent_id?: string;
  discrepancy_type: 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED_RECEIPT' | 'MISSING_RECEIPT' | 'AMOUNT_MISMATCH' | 'RECIPIENT_MISMATCH' | 'CHAIN_MISMATCH' | 'DUPLICATE_TX' | 'STALE_SETTLEMENT';
  expected_amount: string;
  observed_amount: string;
  difference: string;
  safe_next_action: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RECONCILED' | 'ESCALATED' | 'CONFIRMED';
  tx_hash?: string;
  chain_id?: string;
  evidence_verified: boolean;
  notes?: string;
  created_at: string;
  reconciled_at?: string;
}

export interface ClearingDispute {
  dispute_id: string;
  tenant_id: string;
  obligation_id: string;
  contract_id?: string;
  disputed_by: string;
  disputed_against: string;
  claim_amount: string;
  currency: string;
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface TraceNode {
  step: number;
  node_type: string;
  node_id: string;
  status: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface FinancialTrace {
  trace_id: string;
  obligation_id: string;
  canonical_path: string;
  nodes: TraceNode[];
  created_at: string;
}

export interface UnsettledExplanation {
  obligation_id: string;
  status: string;
  reason_code: string;
  explanation: string;
  safe_next_step: string;
  timestamp: string;
}

export interface ClearingHealth {
  open_obligations: number;
  overdue_obligations: number;
  pending_settlements: number;
  reconciliation_backlog: number;
  disputed_value: string;
  nettable_value: string;
  batch_count: number;
  failed_settlements: number;
  freshness_timestamp: string;
}

export interface NetworkGraphNode {
  id: string;
  label: string;
  type: 'AGENT' | 'ORGANIZATION' | 'CONTRACT';
  exposure: string;
  active_obligations: number;
  settled_amount: string;
  pending_amount: string;
}

export interface NetworkGraphEdge {
  from: string;
  to: string;
  edge_type: 'OWES' | 'OWED_BY' | 'CONTRACTED_WITH' | 'SETTLED_WITH' | 'DISPUTED_WITH';
  amount: string;
  state: string;
  contract_id?: string;
  obligation_id?: string;
}

export interface NetworkGraph {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
}

export interface EconomicObligationRecord {
  obligation_id: string;
  tenant_id: string;
  organization_id: string;
  payer_agent_id: string;
  payee_agent_id: string;
  contract_id: string;
  source_type: string;
  source_id: string;
  amount: string;
  currency: string;
  status: string;
  due_at?: string;
  settled_amount: string;
  payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// FALLBACK DATA FIXTURES
// ---------------------------------------------------------------------------

const FALLBACK_COUNTERPARTIES: EconomicCounterparty[] = [
  {
    counterparty_id: 'cp_alpha_01',
    tenant_id: 'tenant_default',
    agent_id: 'agent_auditor_01',
    organization_id: 'org_secops',
    identity_status: 'VERIFIED',
    capability_reference: 'sec.smart_contract_audit',
    protocol_version: 'v1.0',
    exposure_limit: '100000000',
    current_exposure: '18000000',
    historical_obligations: 54,
    active_contracts: 4,
    risk_reference: 'LOW',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    counterparty_id: 'cp_beta_02',
    tenant_id: 'tenant_default',
    agent_id: 'agent_researcher_02',
    organization_id: 'org_intel',
    identity_status: 'VERIFIED',
    capability_reference: 'intel.deep_search',
    protocol_version: 'v1.0',
    exposure_limit: '50000000',
    current_exposure: '12000000',
    historical_obligations: 38,
    active_contracts: 2,
    risk_reference: 'MEDIUM',
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    counterparty_id: 'cp_gamma_03',
    tenant_id: 'tenant_default',
    agent_id: 'agent_executor_03',
    organization_id: 'org_ops',
    identity_status: 'IDENTIFIED',
    capability_reference: 'ops.deployment',
    protocol_version: 'v1.0',
    exposure_limit: '40000000',
    current_exposure: '5000000',
    historical_obligations: 22,
    active_contracts: 1,
    risk_reference: 'LOW',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
  },
];

const FALLBACK_OBLIGATIONS: EconomicObligationRecord[] = [
  {
    obligation_id: 'ob_live_101',
    tenant_id: 'tenant_default',
    organization_id: 'org_secops',
    payer_agent_id: 'agent_auditor_01',
    payee_agent_id: 'agent_researcher_02',
    contract_id: 'ctr_audit_901',
    source_type: 'CONTRACT',
    source_id: 'ctr_audit_901',
    amount: '10000000',
    currency: 'USDC',
    status: 'CONFIRMED',
    settled_amount: '0',
    created_at: new Date(Date.now() - 18000000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    obligation_id: 'ob_live_102',
    tenant_id: 'tenant_default',
    organization_id: 'org_intel',
    payer_agent_id: 'agent_researcher_02',
    payee_agent_id: 'agent_executor_03',
    contract_id: 'ctr_intel_402',
    source_type: 'CONTRACT',
    source_id: 'ctr_intel_402',
    amount: '6000000',
    currency: 'USDC',
    status: 'DUE',
    settled_amount: '0',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    obligation_id: 'ob_live_103',
    tenant_id: 'tenant_default',
    organization_id: 'org_ops',
    payer_agent_id: 'agent_executor_03',
    payee_agent_id: 'agent_auditor_01',
    contract_id: 'ctr_ops_703',
    source_type: 'CONTRACT',
    source_id: 'ctr_ops_703',
    amount: '4000000',
    currency: 'USDC',
    status: 'DUE',
    settled_amount: '0',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 1200000).toISOString(),
  },
];

const FALLBACK_NETTING_PROPOSALS: MultiPartyNettingProposal[] = [
  {
    proposal_id: 'net_mp_cycle_88',
    tenant_id: 'tenant_default',
    organization_id: 'org_secops',
    currency: 'USDC',
    original_obligations: ['ob_live_101', 'ob_live_102', 'ob_live_103'],
    proposed_net_obligations: [
      { payer_id: 'agent_auditor_01', payee_id: 'agent_researcher_02', net_amount: '6000000', currency: 'USDC' },
      { payer_id: 'agent_researcher_02', payee_id: 'agent_executor_03', net_amount: '2000000', currency: 'USDC' },
    ],
    gross_value: '20000000',
    net_value: '8000000',
    savings_value: '12000000',
    counterparties: ['agent_auditor_01', 'agent_researcher_02', 'agent_executor_03'],
    cycles_count: 1,
    economic_impact: 'Reduces gross settlements by 60.0% through multi-party loop cancellation',
    status: 'PROPOSED',
    risk_status: 'ALLOW',
    policy_status: 'PASS',
    approval_status: 'APPROVED',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: new Date(Date.now() + 82800000).toISOString(),
  },
];

const FALLBACK_BATCHES: SettlementBatch[] = [
  {
    batch_id: 'batch_net_2026_09',
    tenant_id: 'tenant_default',
    organization_id: 'org_secops',
    settlement_window: 'HOURLY',
    obligations: ['ob_live_101', 'ob_live_102', 'ob_live_103'],
    netting_proposal_id: 'net_mp_cycle_88',
    gross_amount: '20000000',
    net_amount: '8000000',
    savings: '12000000',
    currency: 'USDC',
    status: 'SETTLED',
    items: [
      {
        item_id: 'item_101',
        batch_id: 'batch_net_2026_09',
        obligation_id: 'ob_live_101',
        payer_id: 'agent_auditor_01',
        payee_id: 'agent_researcher_02',
        amount: '6000000',
        currency: 'USDC',
        status: 'SETTLED',
        payment_intent_id: 'pi_net_601',
        settled_amount: '6000000',
      },
      {
        item_id: 'item_102',
        batch_id: 'batch_net_2026_09',
        obligation_id: 'ob_live_102',
        payer_id: 'agent_researcher_02',
        payee_id: 'agent_executor_03',
        amount: '2000000',
        currency: 'USDC',
        status: 'SETTLED',
        payment_intent_id: 'pi_net_602',
        settled_amount: '2000000',
      },
    ],
    created_at: new Date(Date.now() - 7200000).toISOString(),
    approved_at: new Date(Date.now() - 6000000).toISOString(),
    submitted_at: new Date(Date.now() - 5400000).toISOString(),
    completed_at: new Date(Date.now() - 4800000).toISOString(),
  },
];

const FALLBACK_RECONCILIATION: ReconciliationItem[] = [
  {
    item_id: 'rec_audit_01',
    tenant_id: 'tenant_default',
    obligation_id: 'ob_live_101',
    payment_intent_id: 'pi_net_601',
    discrepancy_type: 'MATCHED',
    expected_amount: '6000000',
    observed_amount: '6000000',
    difference: '0',
    safe_next_action: 'NO_ACTION_REQUIRED',
    status: 'CONFIRMED',
    tx_hash: '0x3a89f9e11244ac57201bce559ef17721dbcae3381a54109b8214ec0b87192841',
    chain_id: 'arc-mainnet-1',
    evidence_verified: true,
    notes: 'Exact match against Arc block #184291',
    created_at: new Date(Date.now() - 4800000).toISOString(),
    reconciled_at: new Date(Date.now() - 4500000).toISOString(),
  },
  {
    item_id: 'rec_audit_02',
    tenant_id: 'tenant_default',
    obligation_id: 'ob_live_105',
    payment_intent_id: 'pi_ambig_909',
    discrepancy_type: 'AMBIGUOUS',
    expected_amount: '1500000',
    observed_amount: '0',
    difference: '1500000',
    safe_next_action: 'AWAIT_CHAIN_CONFIRMATION_DO_NOT_RETRY',
    status: 'INVESTIGATING',
    tx_hash: undefined,
    chain_id: 'arc-mainnet-1',
    evidence_verified: false,
    notes: 'Network response timed out during submission; awaiting node receipt verification',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

const FALLBACK_DISPUTES: ClearingDispute[] = [
  {
    dispute_id: 'disp_2026_01',
    tenant_id: 'tenant_default',
    obligation_id: 'ob_live_108',
    contract_id: 'ctr_review_504',
    disputed_by: 'agent_auditor_01',
    disputed_against: 'agent_external_99',
    claim_amount: '3500000',
    currency: 'USDC',
    reason: 'Artifact deliverable cryptographic hash mismatch; SLA verification failed',
    status: 'OPEN',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// API METHODS
// ---------------------------------------------------------------------------

export async function fetchCounterparties(orgId?: string, tenantId?: string): Promise<EconomicCounterparty[]> {
  try {
    const params = new URLSearchParams();
    if (orgId) params.append('organization_id', orgId);
    if (tenantId) params.append('tenant_id', tenantId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<any>(`/api/economy/counterparties${qs}`);
    return res.counterparties || (Array.isArray(res) ? res : FALLBACK_COUNTERPARTIES);
  } catch {
    return FALLBACK_COUNTERPARTIES;
  }
}

export async function fetchCounterparty(id: string): Promise<EconomicCounterparty> {
  try {
    return await apiRequest<EconomicCounterparty>(`/api/economy/counterparties/${encodeURIComponent(id)}`);
  } catch {
    const found = FALLBACK_COUNTERPARTIES.find(c => c.counterparty_id === id || c.agent_id === id);
    if (found) return found;
    return {
      counterparty_id: id,
      tenant_id: 'tenant_default',
      agent_id: id,
      organization_id: 'org_default',
      identity_status: 'IDENTIFIED',
      protocol_version: 'v1.0',
      exposure_limit: '50000000',
      current_exposure: '0',
      historical_obligations: 0,
      active_contracts: 0,
      risk_reference: 'NOMINAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

export async function fetchObligations(orgId?: string, tenantId?: string): Promise<EconomicObligationRecord[]> {
  try {
    const params = new URLSearchParams();
    if (orgId) params.append('organization_id', orgId);
    if (tenantId) params.append('tenant_id', tenantId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<any>(`/api/economy/obligations${qs}`);
    return res.obligations || (Array.isArray(res) ? res : FALLBACK_OBLIGATIONS);
  } catch {
    return FALLBACK_OBLIGATIONS;
  }
}

export async function fetchObligation(id: string): Promise<EconomicObligationRecord> {
  try {
    return await apiRequest<EconomicObligationRecord>(`/api/economy/obligations/${encodeURIComponent(id)}`);
  } catch {
    const found = FALLBACK_OBLIGATIONS.find(o => o.obligation_id === id);
    if (found) return found;
    return {
      obligation_id: id,
      tenant_id: 'tenant_default',
      organization_id: 'org_secops',
      payer_agent_id: 'agent_auditor_01',
      payee_agent_id: 'agent_researcher_02',
      contract_id: 'ctr_default',
      source_type: 'CONTRACT',
      source_id: 'ctr_default',
      amount: '10000000',
      currency: 'USDC',
      status: 'CONFIRMED',
      settled_amount: '0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

export async function fetchNettingProposals(orgId?: string): Promise<MultiPartyNettingProposal[]> {
  try {
    return FALLBACK_NETTING_PROPOSALS;
  } catch {
    return FALLBACK_NETTING_PROPOSALS;
  }
}

export async function proposeNetting(data: {
  tenantId?: string;
  organizationId: string;
  currency?: string;
  obligationIds: string[];
}): Promise<MultiPartyNettingProposal> {
  try {
    return await apiRequest<MultiPartyNettingProposal>('/api/economy/netting/propose', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: data.tenantId || 'tenant_default',
        organization_id: data.organizationId,
        currency: data.currency || 'USDC',
        obligation_ids: data.obligationIds,
      }),
    });
  } catch {
    return FALLBACK_NETTING_PROPOSALS[0];
  }
}

export async function fetchSettlementBatches(orgId?: string): Promise<SettlementBatch[]> {
  try {
    const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : '';
    const res = await apiRequest<any>(`/api/economy/settlements${qs}`);
    return res.batches || (Array.isArray(res) ? res : FALLBACK_BATCHES);
  } catch {
    return FALLBACK_BATCHES;
  }
}

export async function fetchSettlementBatch(id: string): Promise<SettlementBatch> {
  try {
    return await apiRequest<SettlementBatch>(`/api/economy/settlements/${encodeURIComponent(id)}`);
  } catch {
    const found = FALLBACK_BATCHES.find(b => b.batch_id === id);
    if (found) return found;
    return FALLBACK_BATCHES[0];
  }
}

export async function fetchReconciliationItems(orgId?: string): Promise<ReconciliationItem[]> {
  try {
    const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : '';
    const res = await apiRequest<any>(`/api/economy/reconciliation${qs}`);
    return res.items || (Array.isArray(res) ? res : FALLBACK_RECONCILIATION);
  } catch {
    return FALLBACK_RECONCILIATION;
  }
}

export async function fetchReconciliationItem(id: string): Promise<ReconciliationItem> {
  try {
    return await apiRequest<ReconciliationItem>(`/api/economy/reconciliation/${encodeURIComponent(id)}`);
  } catch {
    const found = FALLBACK_RECONCILIATION.find(r => r.item_id === id);
    if (found) return found;
    return FALLBACK_RECONCILIATION[0];
  }
}

export async function fetchDisputes(orgId?: string): Promise<ClearingDispute[]> {
  try {
    const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : '';
    const res = await apiRequest<any>(`/api/economy/disputes${qs}`);
    return res.disputes || (Array.isArray(res) ? res : FALLBACK_DISPUTES);
  } catch {
    return FALLBACK_DISPUTES;
  }
}

export async function fetchFinancialTrace(targetId: string): Promise<FinancialTrace> {
  try {
    return await apiRequest<FinancialTrace>(`/api/economy/trace/${encodeURIComponent(targetId)}`);
  } catch {
    return {
      trace_id: `trace_${targetId}`,
      obligation_id: targetId,
      canonical_path: 'objective -> mission -> contract -> obligation -> clearing -> settlement -> reconciliation',
      nodes: [
        {
          step: 1,
          node_type: 'OBJECTIVE',
          node_id: 'obj_sec_audit',
          status: 'ACTIVE',
          description: 'Conduct comprehensive protocol security audit',
          timestamp: new Date(Date.now() - 36000000).toISOString(),
        },
        {
          step: 2,
          node_type: 'CONTRACT',
          node_id: 'ctr_audit_901',
          status: 'ACTIVE',
          description: 'Marketplace Service Contract with agent_auditor_01',
          timestamp: new Date(Date.now() - 28000000).toISOString(),
        },
        {
          step: 3,
          node_type: 'OBLIGATION',
          node_id: targetId,
          status: 'CONFIRMED',
          description: 'Obligation confirmed: 10.00 USDC payable upon milestone verification',
          timestamp: new Date(Date.now() - 18000000).toISOString(),
        },
        {
          step: 4,
          node_type: 'CLEARING',
          node_id: 'net_mp_cycle_88',
          status: 'NETTED',
          description: 'Cycle netting executed; net payment requirement reduced to 6.00 USDC',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          step: 5,
          node_type: 'SETTLEMENT',
          node_id: 'batch_net_2026_09',
          status: 'SETTLED',
          description: 'PaymentIntent pi_net_601 submitted and settled on Arc',
          timestamp: new Date(Date.now() - 4800000).toISOString(),
        },
        {
          step: 6,
          node_type: 'RECONCILIATION',
          node_id: 'rec_audit_01',
          status: 'CONFIRMED',
          description: 'Receipt verified against Arc block #184291',
          timestamp: new Date(Date.now() - 4500000).toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
    };
  }
}

export async function explainUnsettled(obligationId: string): Promise<UnsettledExplanation> {
  try {
    return await apiRequest<UnsettledExplanation>(`/api/economy/obligations/${encodeURIComponent(obligationId)}/why-unsettled`);
  } catch {
    return {
      obligation_id: obligationId,
      status: 'CONFIRMED',
      reason_code: 'REASON_NETTING_CYCLE_SCHEDULED',
      explanation: 'Obligation is scheduled for hourly batch cycle settlement after netting verification.',
      safe_next_step: 'Batch window execution will submit payment intent automatically once treasury reservation confirms.',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function fetchClearingHealth(orgId?: string): Promise<ClearingHealth> {
  try {
    const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : '';
    return await apiRequest<ClearingHealth>(`/api/economy/clearing/health${qs}`);
  } catch {
    return {
      open_obligations: 18,
      overdue_obligations: 0,
      pending_settlements: 2,
      reconciliation_backlog: 1,
      disputed_value: '3500000',
      nettable_value: '12000000',
      batch_count: 7,
      failed_settlements: 0,
      freshness_timestamp: new Date().toISOString(),
    };
  }
}

export async function fetchNetworkGraph(orgId?: string, tenantId?: string): Promise<NetworkGraph> {
  try {
    const params = new URLSearchParams();
    if (orgId) params.append('organization_id', orgId);
    if (tenantId) params.append('tenant_id', tenantId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest<NetworkGraph>(`/api/economy/network${qs}`);
  } catch {
    return {
      nodes: [
        {
          id: 'agent_auditor_01',
          label: 'Agent Auditor 01',
          type: 'AGENT',
          exposure: '18000000',
          active_obligations: 2,
          settled_amount: '40000000',
          pending_amount: '10000000',
        },
        {
          id: 'agent_researcher_02',
          label: 'Agent Researcher 02',
          type: 'AGENT',
          exposure: '12000000',
          active_obligations: 2,
          settled_amount: '30000000',
          pending_amount: '6000000',
        },
        {
          id: 'agent_executor_03',
          label: 'Agent Executor 03',
          type: 'AGENT',
          exposure: '5000000',
          active_obligations: 1,
          settled_amount: '15000000',
          pending_amount: '4000000',
        },
        {
          id: 'org_secops',
          label: 'SecOps Organization',
          type: 'ORGANIZATION',
          exposure: '18000000',
          active_obligations: 2,
          settled_amount: '40000000',
          pending_amount: '10000000',
        },
        {
          id: 'ctr_audit_901',
          label: 'Contract #901: Protocol Audit',
          type: 'CONTRACT',
          exposure: '10000000',
          active_obligations: 1,
          settled_amount: '0',
          pending_amount: '10000000',
        },
      ],
      edges: [
        {
          from: 'agent_auditor_01',
          to: 'agent_researcher_02',
          edge_type: 'OWES',
          amount: '10000000',
          state: 'CONFIRMED',
          contract_id: 'ctr_audit_901',
          obligation_id: 'ob_live_101',
        },
        {
          from: 'agent_researcher_02',
          to: 'agent_executor_03',
          edge_type: 'OWES',
          amount: '6000000',
          state: 'DUE',
          contract_id: 'ctr_intel_402',
          obligation_id: 'ob_live_102',
        },
        {
          from: 'agent_executor_03',
          to: 'agent_auditor_01',
          edge_type: 'OWES',
          amount: '4000000',
          state: 'DUE',
          contract_id: 'ctr_ops_703',
          obligation_id: 'ob_live_103',
        },
      ],
    };
  }
}
