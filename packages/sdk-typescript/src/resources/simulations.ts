import type { AgentPay } from '../client.js';
import type {
  RequestOptions,
  SimulationScenario,
  SimulationRun,
  SimulationTraceEvent,
  SimulationProjectedEconomics,
  SimulationWorstCaseExposure,
  SimulationExecutionPlan,
  CounterfactualResponse,
  MonteCarloRequest,
  MonteCarloSummary,
  LiveExecutionPayload,
  SimulationRequest,
  SimulationResponse,
} from '../types.js';

export class SimulationsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Initialize a new economic simulation run or legacy dry-run.
   */
  async create(params: SimulationScenario, options?: RequestOptions & { auto_run?: boolean }): Promise<SimulationRun>;
  async create(params: SimulationRequest, options?: RequestOptions & { auto_run?: boolean }): Promise<SimulationResponse>;
  async create(
    params: SimulationScenario | SimulationRequest,
    options?: RequestOptions & { auto_run?: boolean }
  ): Promise<SimulationRun | SimulationResponse> {
    const query = options?.auto_run ? '?auto_run=true' : '';
    return this.client.request<SimulationRun | SimulationResponse>(
      `/v1/simulations${query}`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Execute an initialized simulation run deterministically.
   */
  async run(id: string, options?: RequestOptions): Promise<SimulationRun> {
    return this.client.request<SimulationRun>(
      `/v1/simulations/${encodeURIComponent(id)}/run`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Retrieve an existing simulation run.
   */
  async get(id: string, options?: RequestOptions): Promise<SimulationRun> {
    return this.client.request<SimulationRun>(
      `/v1/simulations/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * List all simulation runs for the current organization.
   */
  async list(options?: RequestOptions): Promise<{ simulations: SimulationRun[]; count: number }> {
    return this.client.request<{ simulations: SimulationRun[]; count: number }>(
      '/v1/simulations',
      { method: 'GET' },
      options
    );
  }

  /**
   * Cancel an in-flight simulation run.
   */
  async cancel(id: string, options?: RequestOptions): Promise<SimulationRun> {
    return this.client.request<SimulationRun>(
      `/v1/simulations/${encodeURIComponent(id)}/cancel`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Retrieve the complete audit trace for a simulation run.
   */
  async trace(
    id: string,
    options?: RequestOptions
  ): Promise<{ simulation_id: string; status: string; seed: number; trace: SimulationTraceEvent[]; count: number }> {
    return this.client.request(
      `/v1/simulations/${encodeURIComponent(id)}/trace`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve projected economics and worst-case exposure.
   */
  async economics(
    id: string,
    options?: RequestOptions
  ): Promise<{ simulation_id: string; projected_economics: SimulationProjectedEconomics; worst_case_exposure: SimulationWorstCaseExposure }> {
    return this.client.request(
      `/v1/simulations/${encodeURIComponent(id)}/economics`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve projected risk score and contributing risk factors.
   */
  async risk(
    id: string,
    options?: RequestOptions
  ): Promise<{ simulation_id: string; risk_score: number; risk_level: string; contributing_factors: string[]; approval_required: boolean }> {
    return this.client.request(
      `/v1/simulations/${encodeURIComponent(id)}/risk`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve the projected execution plan steps.
   */
  async plan(
    id: string,
    options?: RequestOptions
  ): Promise<{ simulation_id: string; execution_plan: SimulationExecutionPlan }> {
    return this.client.request(
      `/v1/simulations/${encodeURIComponent(id)}/plan`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Run a what-if counterfactual scenario against an existing baseline run.
   */
  async counterfactual(
    id: string,
    perturbation: Partial<SimulationScenario>,
    description: string,
    options?: RequestOptions
  ): Promise<CounterfactualResponse> {
    return this.client.request<CounterfactualResponse>(
      `/v1/simulations/${encodeURIComponent(id)}/counterfactual`,
      {
        method: 'POST',
        body: JSON.stringify({ description, perturbation }),
      },
      options
    );
  }

  /**
   * Compare two simulations side-by-side.
   */
  async compare(
    idA: string,
    idB?: string,
    options?: RequestOptions
  ): Promise<{ simulation_a: SimulationRun; simulation_b?: SimulationRun; delta_spend?: string; delta_risk?: number }> {
    const query = idB ? `?compare_to=${encodeURIComponent(idB)}` : '';
    return this.client.request(
      `/v1/simulations/${encodeURIComponent(idA)}/comparison${query}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Run N deterministic seeded simulations for statistical outcome distribution.
   */
  async monteCarlo(
    params: MonteCarloRequest,
    options?: RequestOptions
  ): Promise<MonteCarloSummary> {
    return this.client.request<MonteCarloSummary>(
      '/v1/simulations/monte-carlo',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Revalidate fresh environment state against simulation assumptions and prepare a safe live plan.
   * NEVER executes blindly: checks staleness, live policy, risk, and service availability.
   */
  async executePlan(
    id: string,
    options?: RequestOptions
  ): Promise<LiveExecutionPayload> {
    return this.client.request<LiveExecutionPayload>(
      `/v1/simulations/${encodeURIComponent(id)}/execute-plan`,
      { method: 'POST' },
      options
    );
  }
}
