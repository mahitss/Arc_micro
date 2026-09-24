import type { AgentPay } from '../client.js';
import type {
  ClearingExecutionMode,
  ClearingLedgerEntry,
  EconomicEscrow,
  EconomicExposureSnapshot,
  EconomicHealthSnapshot,
  EconomicInvoice,
  EconomicObligation,
  NettingProposal,
  PaymentMilestone,
  ReconciliationRecord,
  RefundRequest,
  RequestOptions,
  SettlementBatch,
} from '../types.js';

/**
 * Autonomous Economic Clearinghouse Resource (Task 10)
 *
 * Coordinates economic obligations, milestone-based escrows, invoice validation,
 * bilateral netting, settlement batches, cryptographic deliverable verification,
 * and machine-checkable on-chain reconciliation with Arc.
 *
 * Principle: The clearinghouse coordinates value; the existing financial control
 * plane authorizes value; Arc settles value.
 */
export class ClearinghouseResource {
  constructor(private readonly client: AgentPay) {}

  // ---------------------------------------------------------------------------
  // Obligations
  // ---------------------------------------------------------------------------

  public async createObligation(
    data: Partial<EconomicObligation>,
    options?: RequestOptions
  ): Promise<EconomicObligation> {
    return this.client.request<EconomicObligation>(
      '/v1/economy/obligations',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      options
    );
  }

  public async listObligations(
    orgId?: string,
    options?: RequestOptions
  ): Promise<EconomicObligation[]> {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return this.client.request<EconomicObligation[]>(
      `/v1/economy/obligations${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getObligation(
    id: string,
    options?: RequestOptions
  ): Promise<EconomicObligation> {
    return this.client.request<EconomicObligation>(
      `/v1/economy/obligations/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  public async cancelObligation(
    id: string,
    reason?: string,
    options?: RequestOptions
  ): Promise<{ status: string }> {
    return this.client.request<{ status: string }>(
      `/v1/economy/obligations/${encodeURIComponent(id)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Invoices
  // ---------------------------------------------------------------------------

  public async createInvoice(
    data: Partial<EconomicInvoice>,
    options?: RequestOptions
  ): Promise<EconomicInvoice> {
    return this.client.request<EconomicInvoice>(
      '/v1/economy/invoices',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      options
    );
  }

  public async listInvoices(
    orgId?: string,
    options?: RequestOptions
  ): Promise<EconomicInvoice[]> {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return this.client.request<EconomicInvoice[]>(
      `/v1/economy/invoices${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getInvoice(
    id: string,
    options?: RequestOptions
  ): Promise<EconomicInvoice> {
    return this.client.request<EconomicInvoice>(
      `/v1/economy/invoices/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  public async acceptInvoice(
    id: string,
    options?: RequestOptions
  ): Promise<{ status: string }> {
    return this.client.request<{ status: string }>(
      `/v1/economy/invoices/${encodeURIComponent(id)}/accept`,
      { method: 'POST' },
      options
    );
  }

  public async disputeInvoice(
    id: string,
    reason: string,
    options?: RequestOptions
  ): Promise<{ status: string }> {
    return this.client.request<{ status: string }>(
      `/v1/economy/invoices/${encodeURIComponent(id)}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Escrows
  // ---------------------------------------------------------------------------

  public async createEscrow(
    data: Partial<EconomicEscrow>,
    options?: RequestOptions
  ): Promise<EconomicEscrow> {
    return this.client.request<EconomicEscrow>(
      '/v1/economy/escrows',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      options
    );
  }

  public async listEscrows(
    orgId?: string,
    options?: RequestOptions
  ): Promise<EconomicEscrow[]> {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return this.client.request<EconomicEscrow[]>(
      `/v1/economy/escrows${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getEscrow(
    id: string,
    options?: RequestOptions
  ): Promise<EconomicEscrow> {
    return this.client.request<EconomicEscrow>(
      `/v1/economy/escrows/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  public async releaseEscrow(
    id: string,
    amount: string,
    options?: RequestOptions
  ): Promise<{ status: string }> {
    return this.client.request<{ status: string }>(
      `/v1/economy/escrows/${encodeURIComponent(id)}/release`,
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
      },
      options
    );
  }

  public async refundEscrow(
    id: string,
    reason?: string,
    options?: RequestOptions
  ): Promise<{ status: string }> {
    return this.client.request<{ status: string }>(
      `/v1/economy/escrows/${encodeURIComponent(id)}/refund`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  public async createMilestone(
    data: Partial<PaymentMilestone>,
    options?: RequestOptions
  ): Promise<PaymentMilestone> {
    return this.client.request<PaymentMilestone>(
      '/v1/economy/milestones',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      options
    );
  }

  public async listMilestones(
    contractId?: string,
    options?: RequestOptions
  ): Promise<PaymentMilestone[]> {
    const qs = contractId ? `?contract_id=${encodeURIComponent(contractId)}` : '';
    return this.client.request<PaymentMilestone[]>(
      `/v1/economy/milestones${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async submitMilestone(
    id: string,
    actualOutput: string,
    resultHash?: string,
    evidenceUri?: string,
    options?: RequestOptions
  ): Promise<{ status: string }> {
    return this.client.request<{ status: string }>(
      `/v1/economy/milestones/${encodeURIComponent(id)}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({
          actual_output: actualOutput,
          result_hash: resultHash,
          evidence_uri: evidenceUri,
        }),
      },
      options
    );
  }

  public async verifyMilestone(
    id: string,
    options?: RequestOptions
  ): Promise<{ outcome: string; reason: string; verified_hash?: string }> {
    return this.client.request<{ outcome: string; reason: string; verified_hash?: string }>(
      `/v1/economy/milestones/${encodeURIComponent(id)}/verify`,
      { method: 'POST' },
      options
    );
  }

  public async settleMilestone(
    id: string,
    idempotencyKey?: string,
    options?: RequestOptions
  ): Promise<any> {
    return this.client.request(
      `/v1/economy/milestones/${encodeURIComponent(id)}/settle`,
      {
        method: 'POST',
        body: JSON.stringify({ idempotency_key: idempotencyKey }),
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Netting
  // ---------------------------------------------------------------------------

  public async proposeNetting(
    params: {
      organization_id: string;
      agent_a: string;
      agent_b: string;
      currency?: string;
      ttl_seconds?: number;
    },
    options?: RequestOptions
  ): Promise<NettingProposal> {
    return this.client.request<NettingProposal>(
      '/v1/economy/netting/proposals',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  public async listNetting(
    orgId?: string,
    options?: RequestOptions
  ): Promise<NettingProposal[]> {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return this.client.request<NettingProposal[]>(
      `/v1/economy/netting/proposals${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async approveNetting(
    id: string,
    agentId: string,
    options?: RequestOptions
  ): Promise<NettingProposal> {
    return this.client.request<NettingProposal>(
      `/v1/economy/netting/${encodeURIComponent(id)}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId }),
      },
      options
    );
  }

  public async executeNetting(
    id: string,
    idempotencyKey?: string,
    options?: RequestOptions
  ): Promise<any> {
    return this.client.request(
      `/v1/economy/netting/${encodeURIComponent(id)}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({ idempotency_key: idempotencyKey }),
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Batches
  // ---------------------------------------------------------------------------

  public async createBatch(
    data: {
      organization_id: string;
      currency: string;
      obligation_ids: string[];
    },
    options?: RequestOptions
  ): Promise<SettlementBatch> {
    return this.client.request<SettlementBatch>(
      '/v1/economy/batches',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      options
    );
  }

  public async listBatches(
    orgId?: string,
    options?: RequestOptions
  ): Promise<SettlementBatch[]> {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return this.client.request<SettlementBatch[]>(
      `/v1/economy/batches${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getBatch(
    id: string,
    options?: RequestOptions
  ): Promise<SettlementBatch> {
    return this.client.request<SettlementBatch>(
      `/v1/economy/batches/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  public async executeBatch(
    id: string,
    options?: RequestOptions
  ): Promise<{ status: string; payment_intents: any[] }> {
    return this.client.request<{ status: string; payment_intents: any[] }>(
      `/v1/economy/batches/${encodeURIComponent(id)}/execute`,
      { method: 'POST' },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Refunds
  // ---------------------------------------------------------------------------

  public async requestRefund(
    data: Partial<RefundRequest>,
    options?: RequestOptions
  ): Promise<RefundRequest> {
    return this.client.request<RefundRequest>(
      '/v1/economy/refunds',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      options
    );
  }

  public async listRefunds(
    orgId?: string,
    options?: RequestOptions
  ): Promise<RefundRequest[]> {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return this.client.request<RefundRequest[]>(
      `/v1/economy/refunds${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async approveRefund(
    id: string,
    options?: RequestOptions
  ): Promise<{ status: string }> {
    return this.client.request<{ status: string }>(
      `/v1/economy/refunds/${encodeURIComponent(id)}/approve`,
      { method: 'POST' },
      options
    );
  }

  public async executeRefund(
    id: string,
    idempotencyKey?: string,
    options?: RequestOptions
  ): Promise<any> {
    return this.client.request(
      `/v1/economy/refunds/${encodeURIComponent(id)}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({ idempotency_key: idempotencyKey }),
      },
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Reconciliation & Ledger
  // ---------------------------------------------------------------------------

  public async listReconciliation(
    orgId?: string,
    options?: RequestOptions
  ): Promise<ReconciliationRecord[]> {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return this.client.request<ReconciliationRecord[]>(
      `/v1/economy/reconciliation${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async reconcileObligation(
    obligationId: string,
    options?: RequestOptions
  ): Promise<ReconciliationRecord> {
    return this.client.request<ReconciliationRecord>(
      `/v1/economy/reconciliation/${encodeURIComponent(obligationId)}`,
      { method: 'POST' },
      options
    );
  }

  public async getExposure(
    orgId?: string,
    mode: ClearingExecutionMode = 'REAL',
    options?: RequestOptions
  ): Promise<EconomicExposureSnapshot> {
    const params = new URLSearchParams();
    if (orgId) params.set('org_id', orgId);
    params.set('mode', mode);
    return this.client.request<EconomicExposureSnapshot>(
      `/v1/economy/exposure?${params.toString()}`,
      { method: 'GET' },
      options
    );
  }

  public async getHealth(
    orgId?: string,
    mode: ClearingExecutionMode = 'REAL',
    onChainBalance?: string,
    options?: RequestOptions
  ): Promise<EconomicHealthSnapshot> {
    const params = new URLSearchParams();
    if (orgId) params.set('org_id', orgId);
    params.set('mode', mode);
    if (onChainBalance) params.set('balance', onChainBalance);
    return this.client.request<EconomicHealthSnapshot>(
      `/v1/economy/health?${params.toString()}`,
      { method: 'GET' },
      options
    );
  }

  public async getLedger(
    orgId?: string,
    options?: RequestOptions
  ): Promise<ClearingLedgerEntry[]> {
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    return this.client.request<ClearingLedgerEntry[]>(
      `/v1/economy/clearing/ledger${qs}`,
      { method: 'GET' },
      options
    );
  }
}
