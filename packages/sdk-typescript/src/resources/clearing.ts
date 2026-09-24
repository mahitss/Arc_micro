import type { AgentPay } from '../client.js';
import type {
  EconomicObligation,
  ReconciliationRecord,
  RequestOptions,
  SettlementBatch,
} from '../types.js';

export interface ProposeNettingParams {
  organizationId: string;
  tenantId?: string;
  currency?: string;
  obligationIds: string[];
  ttlSeconds?: number;
}

export interface EconomicCounterpartyData {
  counterpartyId?: string;
  counterparty_id?: string;
  tenantId?: string;
  tenant_id?: string;
  agentId?: string;
  agent_id?: string;
  organizationId?: string;
  organization_id?: string;
  identityStatus?: 'UNVERIFIED' | 'IDENTIFIED' | 'VERIFIED' | 'SUSPENDED';
  identity_status?: 'UNVERIFIED' | 'IDENTIFIED' | 'VERIFIED' | 'SUSPENDED';
  capabilityReference?: string;
  capability_reference?: string;
  protocolVersion?: string;
  protocol_version?: string;
  exposureLimit?: string;
  exposure_limit?: string;
  currentExposure?: string;
  current_exposure?: string;
  historicalObligations?: number;
  historical_obligations?: number;
  activeContracts?: number;
  active_contracts?: number;
  riskReference?: string;
  risk_reference?: string;
}

/**
 * Autonomous Economic Clearing Network Client (Task 18)
 *
 * Coordinates multi-party obligations, network counterparties, multi-party cycle netting,
 * settlement batches, reconciliation items, causal financial traces, and health telemetry.
 * Read-only by default; mutating operations require canonical policy and authorization.
 */
export class ClearingClient {
  constructor(private readonly client: AgentPay) {}

  public async getObligation(
    id: string,
    options?: RequestOptions
  ): Promise<EconomicObligation> {
    return this.client.request<EconomicObligation>(
      `/api/economy/obligations/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  public async listObligations(
    orgId?: string,
    options?: RequestOptions
  ): Promise<EconomicObligation[]> {
    const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : '';
    return this.client.request<EconomicObligation[]>(
      `/api/economy/obligations${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getCounterpartyExposure(
    counterpartyId: string,
    options?: RequestOptions
  ): Promise<any> {
    return this.client.request<any>(
      `/api/economy/counterparties/${encodeURIComponent(counterpartyId)}`,
      { method: 'GET' },
      options
    );
  }

  public async proposeNetting(
    params: ProposeNettingParams,
    options?: RequestOptions
  ): Promise<any> {
    return this.client.request<any>(
      '/api/economy/netting/propose',
      {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: params.tenantId || 'tenant_default',
          organization_id: params.organizationId,
          currency: params.currency || 'USDC',
          obligation_ids: params.obligationIds,
          ttl_seconds: params.ttlSeconds || 86400,
        }),
      },
      options
    );
  }

  public async getSettlementBatch(
    id: string,
    options?: RequestOptions
  ): Promise<SettlementBatch> {
    return this.client.request<SettlementBatch>(
      `/api/economy/settlements/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  public async listSettlementBatches(
    orgId?: string,
    tenantId?: string,
    options?: RequestOptions
  ): Promise<SettlementBatch[]> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (orgId) params.append('organization_id', orgId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.request<SettlementBatch[]>(
      `/api/economy/settlements${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getReconciliation(
    id: string,
    options?: RequestOptions
  ): Promise<ReconciliationRecord> {
    return this.client.request<ReconciliationRecord>(
      `/api/economy/reconciliation/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  public async listReconciliation(
    orgId?: string,
    tenantId?: string,
    options?: RequestOptions
  ): Promise<ReconciliationRecord[]> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (orgId) params.append('organization_id', orgId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.request<ReconciliationRecord[]>(
      `/api/economy/reconciliation${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getSettlementStatus(
    id: string,
    options?: RequestOptions
  ): Promise<{ batchId: string; status: string }> {
    const batch = await this.getSettlementBatch(id, options);
    return {
      batchId: batch.batch_id || id,
      status: batch.status,
    };
  }

  public async getNetworkGraph(
    tenantId?: string,
    orgId?: string,
    options?: RequestOptions
  ): Promise<any> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (orgId) params.append('organization_id', orgId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.request<any>(
      `/api/economy/network${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getFinancialTrace(
    id: string,
    options?: RequestOptions
  ): Promise<any> {
    return this.client.request<any>(
      `/api/economy/trace/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  public async getClearingHealth(
    tenantId?: string,
    orgId?: string,
    options?: RequestOptions
  ): Promise<any> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (orgId) params.append('organization_id', orgId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.request<any>(
      `/api/economy/clearing/health${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async explainUnsettled(
    id: string,
    options?: RequestOptions
  ): Promise<any> {
    return this.client.request<any>(
      `/api/economy/obligations/${encodeURIComponent(id)}/why-unsettled`,
      { method: 'GET' },
      options
    );
  }

  public async listCounterparties(
    tenantId?: string,
    orgId?: string,
    options?: RequestOptions
  ): Promise<EconomicCounterpartyData[]> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (orgId) params.append('organization_id', orgId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.request<EconomicCounterpartyData[]>(
      `/api/economy/counterparties${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getCounterparty(
    id: string,
    tenantId?: string,
    options?: RequestOptions
  ): Promise<EconomicCounterpartyData> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return this.client.request<EconomicCounterpartyData>(
      `/api/economy/counterparties/${encodeURIComponent(id)}${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async registerCounterparty(
    data: EconomicCounterpartyData,
    options?: RequestOptions
  ): Promise<EconomicCounterpartyData> {
    return this.client.request<EconomicCounterpartyData>(
      '/api/economy/counterparties',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      options
    );
  }

  public async listDisputes(
    tenantId?: string,
    orgId?: string,
    options?: RequestOptions
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (orgId) params.append('organization_id', orgId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.client.request<any[]>(
      `/api/economy/disputes${qs}`,
      { method: 'GET' },
      options
    );
  }

  public async getDispute(
    id: string,
    options?: RequestOptions
  ): Promise<any> {
    return this.client.request<any>(
      `/api/economy/disputes/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }
}
