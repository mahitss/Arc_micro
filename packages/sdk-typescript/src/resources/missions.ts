import type { AgentPay } from '../client.js';
import type { EconomicGraph, RequestOptions } from '../types.js';

export class MissionsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Retrieve the complete directed economic graph (DAG) for an autonomous mission.
   * Includes Agents, Services, Hires, Payments, and inter-agent dependency edges.
   */
  async economicGraph(missionId: string, options?: RequestOptions): Promise<EconomicGraph> {
    return this.client.request<EconomicGraph>(
      `/v1/missions/${encodeURIComponent(missionId)}/economic-graph`,
      { method: 'GET' },
      options
    );
  }
}
