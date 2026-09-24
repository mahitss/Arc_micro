import type { AgentPay } from '../client.js';
import type {
  ArcStatusView,
  ControlActivityEvent,
  ControlIncident,
  ControlSearchResult,
  EconomicStateStrip,
  ExecutiveOverview,
  MissionCommandCenterView,
  RequestOptions,
  UniversalFinancialTrace,
} from '../types.js';

/**
 * ControlTowerResource provides programmatic access to the AgentPay
 * Autonomous Economic Control Tower aggregation and telemetry layer.
 *
 * AXIOM: ONE ECONOMIC SYSTEM. ONE FINANCIAL CONTROL PLANE. ONE AUDITABLE REALITY.
 * Strictly adheres to INV-86 through INV-100:
 * - Read models aggregate canonical truth but possess zero financial authority.
 * - Stale data is explicitly indicated.
 * - Unverified Arc state is never fabricated.
 */
export class ControlTowerResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Get the real-time operational status banner across Treasury, Policy, Risk, Execution, and Arc.
   */
  async getStateStrip(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<EconomicStateStrip> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<EconomicStateStrip>(
      `/v1/control/state${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Get executive-level system metrics aggregated from authoritative domain services.
   */
  async getOverview(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<ExecutiveOverview> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<ExecutiveOverview>(
      `/v1/control/overview${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Get real-time classified activity events across all economic subsystems.
   */
  async getActivityTimeline(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION'; category?: string; limit?: number },
    options?: RequestOptions
  ): Promise<{ events: ControlActivityEvent[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);
    if (params?.category) query.set('category', params.category);
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<{ events: ControlActivityEvent[]; count: number }>(
      `/v1/control/activity${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve universal 13-stage financial trace for an economic payment intent.
   * Trace: MISSION -> TASK -> AGENT -> CONTRACT -> OBLIGATION -> POLICY -> RISK -> RESERVATION -> INTENT -> VAULT -> ARC -> RECONCILE -> LEARNING.
   */
  async getFinancialTrace(
    id: string,
    params?: { orgId?: string },
    options?: RequestOptions
  ): Promise<UniversalFinancialTrace> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<UniversalFinancialTrace>(
      `/v1/control/financial-trace/${encodeURIComponent(id)}${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve operational telemetry for a mission: objective, budget, DAG task graph,
   * active providers, explainability why alternatives were declined, and learning.
   */
  async getMissionCommandCenter(
    missionId: string,
    params?: { orgId?: string },
    options?: RequestOptions
  ): Promise<MissionCommandCenterView> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<MissionCommandCenterView>(
      `/v1/control/missions/${encodeURIComponent(missionId)}${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Get policy governance, constitution version, and multi-tier kill switches.
   */
  async getSecurityCenter(
    params?: { orgId?: string },
    options?: RequestOptions
  ): Promise<Record<string, unknown>> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<Record<string, unknown>>(
      `/v1/control/security${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Get unified treasury control view including balance, capacity envelope, and buffer floor rules.
   */
  async getTreasuryView(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<Record<string, unknown>> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<Record<string, unknown>>(
      `/v1/control/treasury${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Get verified Arc blockchain settlement status, AgentVault contract, and RPC reachability.
   */
  async getArcStatus(options?: RequestOptions): Promise<ArcStatusView> {
    return this.client.request<ArcStatusView>(
      '/v1/control/arc',
      { method: 'GET' },
      options
    );
  }

  /**
   * Get active and historical system incidents with root-cause analysis and automated recovery steps.
   */
  async getIncidents(
    params?: { orgId?: string; status?: string },
    options?: RequestOptions
  ): Promise<{ incidents: ControlIncident[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.status) query.set('status', params.status);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<{ incidents: ControlIncident[]; count: number }>(
      `/v1/control/incidents${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Get economic learning recommendations, counterparty drift, and forecast calibration telemetry.
   */
  async getIntelligenceView(
    params?: { orgId?: string },
    options?: RequestOptions
  ): Promise<Record<string, unknown>> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<Record<string, unknown>>(
      `/v1/control/intelligence${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Global cross-system search across missions, agents, contracts, payments, and incidents.
   */
  async search(
    queryText: string,
    params?: { orgId?: string },
    options?: RequestOptions
  ): Promise<{ query: string; results: ControlSearchResult[]; count: number }> {
    const query = new URLSearchParams();
    query.set('q', queryText);
    if (params?.orgId) query.set('organization_id', params.orgId);

    return this.client.request<{ query: string; results: ControlSearchResult[]; count: number }>(
      `/v1/control/search?${query.toString()}`,
      { method: 'GET' },
      options
    );
  }
}
