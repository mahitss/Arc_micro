import type { AgentPay } from '../client.js';
import type { RequestOptions, SimulationRequest, SimulationResponse } from '../types.js';

export class SimulationsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Run a dry-run financial simulation to predict policy, risk, approval,
   * and treasury feasibility without executing on-chain or debiting funds.
   */
  async create(params: SimulationRequest, options?: RequestOptions): Promise<SimulationResponse> {
    return this.client.request<SimulationResponse>(
      '/v1/simulations',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }
}
