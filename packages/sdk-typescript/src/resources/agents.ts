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
}
