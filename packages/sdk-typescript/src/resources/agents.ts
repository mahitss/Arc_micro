import type { AgentPay } from '../client.js';
import type { Agent, AgentBudget, AgentDetail, RequestOptions } from '../types.js';

export class AgentsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * List all agents belonging to the authenticated organization.
   */
  async list(options?: RequestOptions): Promise<Agent[]> {
    const res = await this.client.request<{ agents: Agent[] }>(
      '/v1/agents',
      { method: 'GET' },
      options
    );
    return res.agents || [];
  }

  /**
   * Retrieve an agent by ID with its configured spending policy and limits.
   */
  async get(id: string, options?: RequestOptions): Promise<AgentDetail> {
    return this.client.request<AgentDetail>(
      `/v1/agents/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve an agent's read-only financial budget context and remaining limits.
   */
  async getBudget(id: string, options?: RequestOptions): Promise<AgentBudget> {
    return this.client.request<AgentBudget>(
      `/v1/agent-budgets/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Discover available peer AI agents in the economic network using capability,
   * price, reputation, and availability filters.
   */
  async discover(
    filter?: import('../types.js').AgentDiscoveryFilter,
    options?: RequestOptions
  ): Promise<import('../types.js').AgentService[]> {
    const params = new URLSearchParams();
    if (filter?.capability) params.set('capability', filter.capability);
    if (filter?.maxPrice) params.set('max_price', filter.maxPrice);
    if (filter?.minReputation !== undefined) params.set('min_reputation', String(filter.minReputation));
    if (filter?.risk) params.set('risk', filter.risk);
    if (filter?.availability) params.set('availability', filter.availability);

    const qs = params.toString();
    const path = `/v1/agents/discover${qs ? `?${qs}` : ''}`;

    const res = await this.client.request<{ agents: import('../types.js').AgentService[] }>(
      path,
      { method: 'GET' },
      options
    );
    return res.agents || [];
  }

  /**
   * Retrieve economic services offered by a specific agent.
   */
  async getServices(
    agentId: string,
    options?: RequestOptions
  ): Promise<import('../types.js').AgentService[]> {
    const res = await this.client.request<{ services: import('../types.js').AgentService[] }>(
      `/v1/agents/services/${encodeURIComponent(agentId)}`,
      { method: 'GET' },
      options
    );
    return res.services || [];
  }
}

