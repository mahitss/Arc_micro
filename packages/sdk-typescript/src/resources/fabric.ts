import type { AgentPay } from '../client.js';
import type {
  EconomicObjective,
  ExecutionBlueprint,
  BlueprintVersion,
  FabricDecision,
  UnifiedEconomicTrace,
  WhyThisExplanation,
  WhyNotExplanation,
  AutonomyMetrics,
  SimulationCompareResult,
  DryRunResult,
  RequestOptions,
  ObjectiveConstraints,
} from '../types.js';

export interface CreateObjectiveParams {
  tenant_id?: string;
  description: string;
  owner?: string;
  constraints: ObjectiveConstraints;
  economic_budget_usdc: number;
  risk_tolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  required_capabilities: string[];
  dry_run?: boolean;
}

export interface ReplanObjectiveParams {
  reason: string;
  new_provider_candidate?: string;
  new_agent_candidate?: string;
  requested_budget_usdc?: number;
  bypass_approval?: boolean;
  allowed_providers?: string[];
  allowed_agents?: string[];
}

/**
 * FabricResource provides high-level lifecycle coordination for the
 * AgentPay Autonomous Economic Fabric (Task 15).
 *
 * CORE PRINCIPLE:
 * The Economic Fabric may autonomously change what it does.
 * It may not autonomously change what it is allowed to do.
 * Strictly enforces machine-checked invariants INV-141 through INV-160.
 */
export class FabricResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Create a new EconomicObjective.
   */
  async createObjective(
    params: CreateObjectiveParams,
    options?: RequestOptions
  ): Promise<EconomicObjective | DryRunResult> {
    return this.client.request<EconomicObjective | DryRunResult>(
      '/v1/fabric/objectives',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Compile an objective into an ExecutionBlueprint.
   */
  async planObjective(
    objectiveId: string,
    dryRun = false,
    options?: RequestOptions
  ): Promise<ExecutionBlueprint | DryRunResult> {
    const query = dryRun ? '?dry_run=true' : '';
    return this.client.request<ExecutionBlueprint | DryRunResult>(
      `/v1/fabric/objectives/${objectiveId}/plan${query}`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Run a deterministic counterfactual simulation.
   */
  async simulateObjective(
    objectiveId: string,
    options?: RequestOptions
  ): Promise<SimulationCompareResult> {
    return this.client.request<SimulationCompareResult>(
      `/v1/fabric/objectives/${objectiveId}/simulate`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Start execution of an objective through the pre-flight execution gate.
   */
  async startObjective(
    objectiveId: string,
    dryRun = false,
    options?: RequestOptions
  ): Promise<FabricDecision | DryRunResult> {
    const query = dryRun ? '?dry_run=true' : '';
    return this.client.request<FabricDecision | DryRunResult>(
      `/v1/fabric/objectives/${objectiveId}/start${query}`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Pause an active objective.
   */
  async pauseObjective(
    objectiveId: string,
    dryRun = false,
    options?: RequestOptions
  ): Promise<{ status: string } | DryRunResult> {
    const query = dryRun ? '?dry_run=true' : '';
    return this.client.request<{ status: string } | DryRunResult>(
      `/v1/fabric/objectives/${objectiveId}/pause${query}`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Resume a paused objective after revalidation.
   */
  async resumeObjective(
    objectiveId: string,
    dryRun = false,
    options?: RequestOptions
  ): Promise<{ status: string } | DryRunResult> {
    const query = dryRun ? '?dry_run=true' : '';
    return this.client.request<{ status: string } | DryRunResult>(
      `/v1/fabric/objectives/${objectiveId}/resume${query}`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Initiate a controlled, versioned replan.
   */
  async replanObjective(
    objectiveId: string,
    params: ReplanObjectiveParams,
    dryRun = false,
    options?: RequestOptions
  ): Promise<{ blueprint: ExecutionBlueprint; version: BlueprintVersion } | DryRunResult> {
    const query = dryRun ? '?dry_run=true' : '';
    return this.client.request<{ blueprint: ExecutionBlueprint; version: BlueprintVersion } | DryRunResult>(
      `/v1/fabric/objectives/${objectiveId}/replan${query}`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Terminate an objective.
   */
  async cancelObjective(
    objectiveId: string,
    dryRun = false,
    options?: RequestOptions
  ): Promise<{ status: string } | DryRunResult> {
    const query = dryRun ? '?dry_run=true' : '';
    return this.client.request<{ status: string } | DryRunResult>(
      `/v1/fabric/objectives/${objectiveId}/cancel${query}`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Get an objective by ID.
   */
  async getObjective(objectiveId: string, options?: RequestOptions): Promise<EconomicObjective> {
    return this.client.request<EconomicObjective>(
      `/v1/fabric/objectives/${objectiveId}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * List objectives.
   */
  async listObjectives(
    params?: { tenant_id?: string },
    options?: RequestOptions
  ): Promise<{ objectives: EconomicObjective[] }> {
    const query = params?.tenant_id ? `?tenant_id=${params.tenant_id}` : '';
    return this.client.request<{ objectives: EconomicObjective[] }>(
      `/v1/fabric/objectives${query}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve the complete 18-stage economic trace.
   */
  async getObjectiveTrace(
    objectiveId: string,
    options?: RequestOptions
  ): Promise<UnifiedEconomicTrace> {
    return this.client.request<UnifiedEconomicTrace>(
      `/v1/fabric/objectives/${objectiveId}/trace`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Universal "Why This?" provider selection explanation.
   */
  async explainObjective(
    objectiveId: string,
    options?: RequestOptions
  ): Promise<WhyThisExplanation> {
    return this.client.request<WhyThisExplanation>(
      `/v1/fabric/objectives/${objectiveId}/why`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Universal "Why Not?" blocked action explanation.
   */
  async explainObjectiveBlocked(
    objectiveId: string,
    options?: RequestOptions
  ): Promise<WhyNotExplanation> {
    return this.client.request<WhyNotExplanation>(
      `/v1/fabric/objectives/${objectiveId}/why-not`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve measurable autonomy telemetry.
   */
  async getAutonomyMetrics(
    params?: { tenant_id?: string },
    options?: RequestOptions
  ): Promise<AutonomyMetrics> {
    const query = params?.tenant_id ? `?tenant_id=${params.tenant_id}` : '';
    return this.client.request<AutonomyMetrics>(
      `/v1/fabric/metrics${query}`,
      { method: 'GET' },
      options
    );
  }
}
