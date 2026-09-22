import type { AgentPay } from '../client.js';
import type {
  CreateSwarmRequest,
  ReplanProposal,
  RequestOptions,
  SimulateSwarmResponse,
  Swarm,
  SwarmCostIntelligence,
  SwarmGraph,
  SwarmRiskScore,
  SwarmTrace,
  TaskNode,
} from '../types.js';

export class SwarmsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Create a new multi-agent swarm with objective, budget, and DAG decomposition.
   */
  async create(params: CreateSwarmRequest, options?: RequestOptions): Promise<Swarm> {
    const res = await this.client.request<{ swarm: Swarm }>(
      '/v1/swarms',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
    return res.swarm;
  }

  /**
   * Retrieve a swarm by ID.
   */
  async get(swarmId: string, options?: RequestOptions): Promise<Swarm> {
    const res = await this.client.request<{ swarm: Swarm }>(
      `/v1/swarms/${encodeURIComponent(swarmId)}`,
      { method: 'GET' },
      options
    );
    return res.swarm;
  }

  /**
   * Start autonomous multi-agent swarm DAG execution.
   */
  async start(swarmId: string, options?: RequestOptions): Promise<Swarm> {
    const res = await this.client.request<{ swarm: Swarm }>(
      `/v1/swarms/${encodeURIComponent(swarmId)}/start`,
      { method: 'POST' },
      options
    );
    return res.swarm;
  }

  /**
   * Cancel an active or running swarm and release all uncommitted budget reservations.
   */
  async cancel(swarmId: string, options?: RequestOptions): Promise<Swarm> {
    const res = await this.client.request<{ swarm: Swarm }>(
      `/v1/swarms/${encodeURIComponent(swarmId)}/cancel`,
      { method: 'POST' },
      options
    );
    return res.swarm;
  }

  /**
   * Simulate a swarm DAG plan without spending funds or broadcasting transactions.
   */
  async simulate(params: CreateSwarmRequest, options?: RequestOptions): Promise<SimulateSwarmResponse> {
    return this.client.request<SimulateSwarmResponse>(
      '/v1/swarms/simulate',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * List all task nodes in the swarm DAG.
   */
  async tasks(swarmId: string, options?: RequestOptions): Promise<TaskNode[]> {
    const res = await this.client.request<{ tasks: TaskNode[] }>(
      `/v1/swarms/${encodeURIComponent(swarmId)}/tasks`,
      { method: 'GET' },
      options
    );
    return res.tasks;
  }

  /**
   * Retrieve the complete directed economic graph of the swarm.
   */
  async graph(swarmId: string, options?: RequestOptions): Promise<SwarmGraph> {
    const res = await this.client.request<{ graph: SwarmGraph }>(
      `/v1/swarms/${encodeURIComponent(swarmId)}/graph`,
      { method: 'GET' },
      options
    );
    return res.graph;
  }

  /**
   * Retrieve append-only audit trace events for the swarm.
   */
  async trace(swarmId: string, options?: RequestOptions): Promise<SwarmTrace> {
    const res = await this.client.request<{ trace: SwarmTrace }>(
      `/v1/swarms/${encodeURIComponent(swarmId)}/trace`,
      { method: 'GET' },
      options
    );
    return res.trace;
  }

  /**
   * Retrieve risk score and risk intelligence for the swarm.
   */
  async risk(swarmId: string, options?: RequestOptions): Promise<SwarmRiskScore> {
    const res = await this.client.request<{ risk_score: SwarmRiskScore }>(
      `/v1/swarms/${encodeURIComponent(swarmId)}/risk`,
      { method: 'GET' },
      options
    );
    return res.risk_score;
  }

  /**
   * Propose a dynamic replan for the swarm upon bottleneck or task failure.
   */
  async replan(
    swarmId: string,
    payload?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<ReplanProposal> {
    const res = await this.client.request<{ proposal: ReplanProposal }>(
      `/v1/swarms/${encodeURIComponent(swarmId)}/replan`,
      {
        method: 'POST',
        body: payload ? JSON.stringify(payload) : '{}',
      },
      options
    );
    return res.proposal;
  }
}
