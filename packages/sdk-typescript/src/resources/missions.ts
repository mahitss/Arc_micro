import type { AgentPay } from '../client.js';
import type {
  EconomicGraph,
  EconomicObservation,
  MissionIntelligence,
  MissionRecoveryResponse,
  ReplanProposal,
  RequestOptions,
} from '../types.js';

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

  /**
   * Retrieve full diagnostic and adaptive intelligence telemetry for a mission.
   */
  async intelligence(
    missionId: string,
    params?: { organizationId?: string },
    options?: RequestOptions
  ): Promise<MissionIntelligence> {
    const q = new URLSearchParams();
    if (params?.organizationId) q.set('organization_id', params.organizationId);
    const qs = q.toString();
    const path = `/v1/missions/${encodeURIComponent(missionId)}/intelligence${qs ? `?${qs}` : ''}`;
    return this.client.request<MissionIntelligence>(path, { method: 'GET' }, options);
  }

  /**
   * Retrieve active recommendation and replanning proposal for a mission.
   */
  async recommendations(
    missionId: string,
    params?: { organizationId?: string },
    options?: RequestOptions
  ): Promise<ReplanProposal> {
    const q = new URLSearchParams();
    if (params?.organizationId) q.set('organization_id', params.organizationId);
    const qs = q.toString();
    const path = `/v1/missions/${encodeURIComponent(missionId)}/recommendations${qs ? `?${qs}` : ''}`;
    return this.client.request<ReplanProposal>(path, { method: 'GET' }, options);
  }

  /**
   * Explicitly invoke the Replanning Engine to generate a fresh recovery proposal.
   */
  async replan(
    missionId: string,
    params?: { organizationId?: string },
    options?: RequestOptions
  ): Promise<ReplanProposal> {
    const q = new URLSearchParams();
    if (params?.organizationId) q.set('organization_id', params.organizationId);
    const qs = q.toString();
    const path = `/v1/missions/${encodeURIComponent(missionId)}/replan${qs ? `?${qs}` : ''}`;
    return this.client.request<ReplanProposal>(path, { method: 'POST' }, options);
  }

  /**
   * Retrieve recovery status, attempts count, and current strategy for a mission.
   */
  async recovery(
    missionId: string,
    params?: { organizationId?: string },
    options?: RequestOptions
  ): Promise<MissionRecoveryResponse> {
    const q = new URLSearchParams();
    if (params?.organizationId) q.set('organization_id', params.organizationId);
    const qs = q.toString();
    const path = `/v1/missions/${encodeURIComponent(missionId)}/recovery${qs ? `?${qs}` : ''}`;
    return this.client.request<MissionRecoveryResponse>(path, { method: 'GET' }, options);
  }

  /**
   * Retrieve append-only economic observations recorded during mission execution.
   */
  async observations(
    missionId: string,
    params?: { organizationId?: string },
    options?: RequestOptions
  ): Promise<{ mission_id: string; observations: EconomicObservation[] }> {
    const q = new URLSearchParams();
    if (params?.organizationId) q.set('organization_id', params.organizationId);
    const qs = q.toString();
    const path = `/v1/missions/${encodeURIComponent(missionId)}/observations${qs ? `?${qs}` : ''}`;
    return this.client.request<{ mission_id: string; observations: EconomicObservation[] }>(
      path,
      { method: 'GET' },
      options
    );
  }
}
