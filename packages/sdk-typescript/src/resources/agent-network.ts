import type { AgentPay } from '../client.js';
import type {
  AgentManifest,
  AgentNetworkIdentity,
  AgentResultPayload,
  AgentServiceContract,
  DiscoveredAgent,
  DisputeRecord,
  ExecutionPlanDraft,
  NetworkDiscoveryFilter,
  NetworkGraph,
  RequestOptions,
  TrustEvaluation,
  VerificationReport,
} from '../types.js';

/**
 * Open Agent Network resource for discovery, contracts, and peer settlement.
 */
export class AgentNetworkResource {
  constructor(private readonly client: AgentPay) {}

  public async register(manifest: AgentManifest, options?: RequestOptions): Promise<AgentNetworkIdentity> {
    return this.client.request<AgentNetworkIdentity>(
      '/v1/agent-network/agents/register',
      {
        method: 'POST',
        body: JSON.stringify(manifest),
      },
      options
    );
  }

  public async list(filter?: NetworkDiscoveryFilter, options?: RequestOptions): Promise<{ agents: DiscoveredAgent[]; count: number }> {
    const params = new URLSearchParams();
    if (filter) {
      if (filter.capability) params.set('capability', filter.capability);
      if (filter.protocol_version) params.set('protocol_version', filter.protocol_version);
      if (filter.pricing_model) params.set('pricing_model', filter.pricing_model);
      if (filter.availability) params.set('availability', filter.availability);
      if (filter.min_trust_score) params.set('min_trust_score', String(filter.min_trust_score));
      if (filter.limit) params.set('limit', String(filter.limit));
    }
    const qs = params.toString();
    const path = qs ? `/v1/agent-network/agents?${qs}` : '/v1/agent-network/agents';
    return this.client.request<{ agents: DiscoveredAgent[]; count: number }>(path, { method: 'GET' }, options);
  }

  public async get(agentId: string, options?: RequestOptions): Promise<{
    identity: AgentNetworkIdentity;
    manifest: AgentManifest;
    trust_evaluation: TrustEvaluation;
  }> {
    return this.client.request(
      `/v1/agent-network/agents/${encodeURIComponent(agentId)}`,
      { method: 'GET' },
      options
    );
  }

  public async updateManifest(agentId: string, manifest: AgentManifest, options?: RequestOptions): Promise<AgentNetworkIdentity> {
    return this.client.request<AgentNetworkIdentity>(
      `/v1/agent-network/agents/${encodeURIComponent(agentId)}/manifest`,
      {
        method: 'POST',
        body: JSON.stringify(manifest),
      },
      options
    );
  }

  public async suspend(agentId: string, reason?: string, options?: RequestOptions): Promise<{ agent_id: string; status: string }> {
    return this.client.request<{ agent_id: string; status: string }>(
      `/v1/agent-network/agents/${encodeURIComponent(agentId)}/suspend`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
      options
    );
  }

  public async listCapabilities(category?: string, options?: RequestOptions): Promise<{ capabilities: unknown[]; count: number }> {
    const path = category ? `/v1/agent-network/capabilities?category=${encodeURIComponent(category)}` : '/v1/agent-network/capabilities';
    return this.client.request<{ capabilities: unknown[]; count: number }>(path, { method: 'GET' }, options);
  }

  public async routePlan(req: {
    required_capability: string;
    budget_base_units: string;
    deadline?: string;
    risk_tolerance?: string;
    min_trust_score?: number;
  }, options?: RequestOptions): Promise<ExecutionPlanDraft> {
    return this.client.request<ExecutionPlanDraft>(
      '/v1/agent-network/routing/plan',
      {
        method: 'POST',
        body: JSON.stringify(req),
      },
      options
    );
  }

  public async createContract(contract: Partial<AgentServiceContract>, options?: RequestOptions): Promise<AgentServiceContract> {
    return this.client.request<AgentServiceContract>(
      '/v1/agent-network/contracts',
      {
        method: 'POST',
        body: JSON.stringify(contract),
      },
      options
    );
  }

  public async listContracts(options?: RequestOptions): Promise<{ contracts: AgentServiceContract[]; count: number }> {
    return this.client.request<{ contracts: AgentServiceContract[]; count: number }>('/v1/agent-network/contracts', { method: 'GET' }, options);
  }

  public async getContract(contractId: string, options?: RequestOptions): Promise<AgentServiceContract> {
    return this.client.request<AgentServiceContract>(
      `/v1/agent-network/contracts/${encodeURIComponent(contractId)}`,
      { method: 'GET' },
      options
    );
  }

  public async acceptContract(contractId: string, acceptorId?: string, options?: RequestOptions): Promise<AgentServiceContract> {
    return this.client.request<AgentServiceContract>(
      `/v1/agent-network/contracts/${encodeURIComponent(contractId)}/accept`,
      {
        method: 'POST',
        body: JSON.stringify({ acceptor_agent_id: acceptorId }),
      },
      options
    );
  }

  public async fundContract(contractId: string, options?: RequestOptions): Promise<{ contract_id: string; status: string; payment_intent_id: string }> {
    return this.client.request<{ contract_id: string; status: string; payment_intent_id: string }>(
      `/v1/agent-network/contracts/${encodeURIComponent(contractId)}/fund`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      options
    );
  }

  public async delegateContract(contractId: string, params: {
    subcontractor_agent_id: string;
    capability: string;
    price_base_units: string;
    deadline?: string;
    input_spec?: Record<string, unknown>;
  }, options?: RequestOptions): Promise<AgentServiceContract> {
    return this.client.request<AgentServiceContract>(
      `/v1/agent-network/contracts/${encodeURIComponent(contractId)}/delegate`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  public async verifyResult(contractId: string, payload: AgentResultPayload, options?: RequestOptions): Promise<VerificationReport> {
    return this.client.request<VerificationReport>(
      `/v1/agent-network/contracts/${encodeURIComponent(contractId)}/verify`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      options
    );
  }

  public async openDispute(contractId: string, initiatorId: string, reason: string, evidence?: string, options?: RequestOptions): Promise<DisputeRecord> {
    return this.client.request<DisputeRecord>(
      `/v1/agent-network/contracts/${encodeURIComponent(contractId)}/disputes`,
      {
        method: 'POST',
        body: JSON.stringify({
          initiator_agent_id: initiatorId,
          reason,
          evidence: evidence ?? '',
        }),
      },
      options
    );
  }

  public async listDisputes(options?: RequestOptions): Promise<{ disputes: DisputeRecord[]; count: number }> {
    return this.client.request<{ disputes: DisputeRecord[]; count: number }>('/v1/agent-network/disputes', { method: 'GET' }, options);
  }

  public async getDispute(disputeId: string, options?: RequestOptions): Promise<DisputeRecord> {
    return this.client.request<DisputeRecord>(
      `/v1/agent-network/disputes/${encodeURIComponent(disputeId)}`,
      { method: 'GET' },
      options
    );
  }

  public async resolveDispute(disputeId: string, state: string, notes?: string, refundAmount?: string, options?: RequestOptions): Promise<DisputeRecord> {
    return this.client.request<DisputeRecord>(
      `/v1/agent-network/disputes/${encodeURIComponent(disputeId)}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({
          state,
          notes: notes ?? '',
          refund_amount: refundAmount ?? '0',
        }),
      },
      options
    );
  }

  public async getGraph(options?: RequestOptions): Promise<NetworkGraph> {
    return this.client.request<NetworkGraph>('/v1/agent-network/graph', { method: 'GET' }, options);
  }

  public async getTrust(agentId: string, options?: RequestOptions): Promise<TrustEvaluation> {
    return this.client.request<TrustEvaluation>(
      `/v1/agent-network/trust/${encodeURIComponent(agentId)}`,
      { method: 'GET' },
      options
    );
  }
}
