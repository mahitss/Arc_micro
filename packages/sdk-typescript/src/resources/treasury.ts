import type { AgentPay } from '../client.js';
import type {
  ExpectedInflow,
  LiquidityAnomaly,
  LiquidityCommitment,
  LiquidityEnvelope,
  LiquidityForecast,
  LiquidityReservation,
  LiquidityReservationRequest,
  LiquidityStressResult,
  LiquidityStressScenario,
  RequestOptions,
  TreasuryForecastHorizon,
  TreasuryHealthSnapshot,
  TreasuryReconciliationReport,
  TreasuryReservationStatus,
  TreasuryState,
  TreasuryStressScenarioType,
  TreasurySummary,
} from '../types.js';

export class TreasuryReservationsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * List all liquidity reservations filtered by status or execution mode.
   */
  async list(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION'; status?: TreasuryReservationStatus },
    options?: RequestOptions
  ): Promise<LiquidityReservation[]> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<LiquidityReservation[]>(
      `/v1/treasury/reservations${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Atomically reserve liquidity headroom for an in-flight economic obligation or mission.
   */
  async create(
    params: LiquidityReservationRequest,
    options?: RequestOptions
  ): Promise<LiquidityReservation> {
    return this.client.request<LiquidityReservation>(
      '/v1/treasury/reservations',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Get an existing liquidity reservation by ID.
   */
  async get(
    reservationId: string,
    options?: RequestOptions
  ): Promise<LiquidityReservation> {
    return this.client.request<LiquidityReservation>(
      `/v1/treasury/reservations/${encodeURIComponent(reservationId)}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Release an active reservation back to available unencumbered treasury balance.
   */
  async release(
    reservationId: string,
    reasonOrOptions?: string | RequestOptions,
    options?: RequestOptions
  ): Promise<{ status: string; reservation_id: string }> {
    const reason = typeof reasonOrOptions === 'string' ? reasonOrOptions : undefined;
    const opt = typeof reasonOrOptions === 'object' ? reasonOrOptions : options;
    return this.client.request<{ status: string; reservation_id: string }>(
      `/v1/treasury/reservations/${encodeURIComponent(reservationId)}/release`,
      {
        method: 'POST',
        body: reason ? JSON.stringify({ reason }) : undefined,
      },
      opt
    );
  }

  /**
   * Consume an active reservation for a payment intent execution.
   */
  async consume(
    reservationId: string,
    paymentIntentId: string,
    options?: RequestOptions
  ): Promise<{ status: string; reservation_id: string; payment_intent_id: string }> {
    return this.client.request<{ status: string; reservation_id: string; payment_intent_id: string }>(
      `/v1/treasury/reservations/${encodeURIComponent(reservationId)}/consume`,
      {
        method: 'POST',
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      },
      options
    );
  }
}

export class TreasuryResource {
  public readonly reservations: TreasuryReservationsResource;

  constructor(private readonly client: AgentPay) {
    this.reservations = new TreasuryReservationsResource(client);
  }

  /**
   * Retrieve canonical multi-balance TreasuryState.
   */
  async state(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<TreasuryState> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<TreasuryState>(
      `/v1/treasury/state${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve current on-chain balance breakdown (on-chain balance, reserved amount, available amount).
   */
  async balance(
    params?: { orgId?: string; vault?: string },
    options?: RequestOptions
  ): Promise<TreasurySummary> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.vault) query.set('vault', params.vault);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<TreasurySummary>(
      `/v1/treasury/balance${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * List all registered soft and hard liquidity commitments.
   */
  async commitments(
    params?: { orgId?: string },
    options?: RequestOptions
  ): Promise<LiquidityCommitment[]> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<LiquidityCommitment[]>(
      `/v1/treasury/commitments${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve current hierarchical liquidity envelope and safe commitment capacity.
   */
  async exposure(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<LiquidityEnvelope> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<LiquidityEnvelope>(
      `/v1/treasury/exposure${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Generate predictive temporal liquidity forecasts across configurable horizons (1h to 30d).
   */
  async forecast(
    params?: {
      orgId?: string;
      horizon?: TreasuryForecastHorizon;
      scenario?: TreasuryStressScenarioType;
      mode?: 'REAL' | 'SIMULATION';
    },
    options?: RequestOptions
  ): Promise<LiquidityForecast> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.horizon) query.set('horizon', params.horizon);
    if (params?.scenario) query.set('scenario', params.scenario);
    if (params?.mode) query.set('mode', params.mode);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<LiquidityForecast>(
      `/v1/treasury/forecast${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Run digital twin liquidity stress simulation under extreme multi-agent perturbations.
   */
  async stress(
    scenario?: LiquidityStressScenario,
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<LiquidityStressResult> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<LiquidityStressResult>(
      `/v1/treasury/stress${queryString}`,
      {
        method: 'POST',
        body: JSON.stringify(scenario || {}),
      },
      options
    );
  }

  /**
   * Execute 4-way balance reconciliation between internal ledger and Arc blockchain state.
   */
  async reconciliation(
    params?: { orgId?: string; vault?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<TreasuryReconciliationReport> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.vault) query.set('vault', params.vault);
    if (params?.mode) query.set('mode', params.mode);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<TreasuryReconciliationReport>(
      `/v1/treasury/reconciliation${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Retrieve holistic treasury solvency health snapshot and operational mode.
   */
  async health(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<TreasuryHealthSnapshot> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<TreasuryHealthSnapshot>(
      `/v1/treasury/health${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Detect real-time concentration, reservation spikes, or flapping rate anomalies.
   */
  async anomalies(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<LiquidityAnomaly[]> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<LiquidityAnomaly[]>(
      `/v1/treasury/anomalies${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * List expected future receipts or receivables.
   */
  async inflows(
    params?: { orgId?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<ExpectedInflow[]> {
    const query = new URLSearchParams();
    if (params?.orgId) query.set('organization_id', params.orgId);
    if (params?.mode) query.set('mode', params.mode);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.client.request<ExpectedInflow[]>(
      `/v1/treasury/inflows${queryString}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Alias for reconciliation audit.
   */
  async reconcile(
    params?: { orgId?: string; vault?: string; mode?: 'REAL' | 'SIMULATION' },
    options?: RequestOptions
  ): Promise<TreasuryReconciliationReport> {
    return this.reconciliation(params, options);
  }
}
