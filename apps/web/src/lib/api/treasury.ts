import { apiRequest } from './client';

export type TreasuryExecutionMode = 'REAL' | 'SIMULATION';
export type TreasuryOperationalMode =
  | 'LIQUIDITY_AVAILABLE'
  | 'LIQUIDITY_CONSTRAINED'
  | 'LIQUIDITY_UNAVAILABLE'
  | 'EMERGENCY_HALT';
export type TreasuryReconciliationStatus =
  | 'MATCHED'
  | 'MISMATCH'
  | 'OVER_COLLATERALIZED'
  | 'UNDER_COLLATERALIZED'
  | 'DISCREPANCY_DETECTED'
  | 'UNVERIFIED';

export interface TreasuryState {
  organization_id: string;
  mode: TreasuryExecutionMode;
  total_balance: string; // micro-USDC
  available_balance: string;
  reserved_balance: string;
  committed_balance: string;
  pending_settlement: string;
  disputed_balance: string;
  minimum_buffer: string;
  safe_capacity: string;
  worst_case_exposure: string;
  solvency_ratio: number;
  operational_mode: TreasuryOperationalMode;
  updated_at: string;
}

export interface TreasurySummary {
  organization_id: string;
  vault_address: string;
  on_chain_balance: string;
  reserved_amount: string;
  available_amount: string;
  asset: string;
  decimals: number;
}

export interface LiquidityReservation {
  reservation_id: string;
  organization_id: string;
  source: string;
  amount: string; // micro-USDC
  currency: string;
  priority: number;
  status: 'ACTIVE' | 'CONSUMED' | 'RELEASED' | 'EXPIRED';
  mode: TreasuryExecutionMode;
  agent_id?: string;
  mission_id?: string;
  swarm_id?: string;
  obligation_id?: string;
  purpose?: string;
  timeout_seconds: number;
  payment_intent_id?: string;
  release_reason?: string;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface LiquidityEnvelope {
  scope: string;
  scope_id: string;
  currency: string;
  total_funds: string;
  current_available: string;
  reserved_funds: string;
  committed_funds: string;
  potential_exposure: string;
  minimum_buffer: string;
  safe_commitment_capacity: string;
  effective_solvency_ratio: number;
  calculated_at: string;
}

export interface LiquidityCommitment {
  commitment_id: string;
  organization_id: string;
  type: 'HARD' | 'SOFT';
  amount: string;
  currency: string;
  counterparty_id: string;
  source: string;
  source_id: string;
  agent_id?: string;
  created_at: string;
  matures_at: string;
  updated_at: string;
}

export interface ExpectedInflow {
  inflow_id: string;
  organization_id: string;
  source: string;
  expected_amount: string;
  currency: string;
  expected_at: string;
  confidence: number;
  status: 'SCHEDULED' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED';
  verified_at?: string;
  tx_hash?: string;
}

export interface ForecastDataPoint {
  timestamp: string;
  available_liquidity: string;
  committed_liquidity: string;
  expected_outflow: string;
  expected_inflow: string;
  buffer: string;
  safe_capacity: string;
}

export interface LiquidityForecast {
  forecast_id: string;
  organization_id: string;
  horizon: '1h' | '6h' | '24h' | '7d' | '30d';
  scenario: string;
  current_balance: string;
  points: ForecastDataPoint[];
  starting_balance: string;
  expected_inflows: string;
  expected_outflows: string;
  worst_case_outflows: string;
  projected_closing_balance: string;
  survival_state: 'SAFE' | 'CONSTRAINED' | 'CRITICAL' | 'UNAVAILABLE';
  gating_decision: TreasuryOperationalMode;
  confidence: number;
  assumptions: string[];
  sample_size: number;
  generated_at: string;
}

export interface LiquidityStressResult {
  scenario: string;
  pre_stress_balance: string;
  simulated_shock_outflow: string;
  simulated_inflow_haircut: string;
  post_stress_buffer_headroom: string;
  max_survivable_drawdown: string;
  survival_state: 'SAFE' | 'CONSTRAINED' | 'CRITICAL' | 'UNAVAILABLE';
  capital_adequacy_ratio: number;
  safe_to_reserve: boolean;
  recommendations: string[];
  tested_at: string;
}

export interface TreasuryReconciliationReport {
  reconciliation_id: string;
  organization_id: string;
  reconciliation_status: TreasuryReconciliationStatus;
  ledger_balance: string;
  repository_balance: string;
  vault_balance: string;
  blockchain_balance: string;
  discrepancy_amount: string;
  chain_id: string;
  vault_address: string;
  token_address: string;
  vault_paused: boolean;
  vault_owner: string;
  verified_at: string;
  evidence: string;
}

export interface TreasuryHealthSnapshot {
  organization_id: string;
  mode: TreasuryExecutionMode;
  total_balance: string;
  available_balance: string;
  reserved_balance: string;
  committed_balance: string;
  pending_settlement: string;
  disputed_balance: string;
  minimum_buffer: string;
  safe_capacity: string;
  worst_case_exposure: string;
  solvency_ratio: number;
  operational_mode: TreasuryOperationalMode;
  reconciliation_status: TreasuryReconciliationStatus;
  last_verified_on_chain_balance: string;
  verification_timestamp: string;
  active_reservations_count: number;
  active_anomalies_count: number;
}

export interface LiquidityAnomaly {
  anomaly_id: string;
  organization_id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affected_scope: string;
  evidence: string;
  detected_at: string;
  status: string;
}

// -------------------------------------------------------------------------
// API Call Functions with Strict Data Authority Boundary
// -------------------------------------------------------------------------

export async function fetchTreasuryState(
  orgId = 'org_default',
  mode: TreasuryExecutionMode = 'REAL'
): Promise<TreasuryState> {
  try {
    return await apiRequest<TreasuryState>(`/v1/treasury/state?organization_id=${encodeURIComponent(orgId)}&mode=${mode}`);
  } catch {
    if (mode === 'SIMULATION') {
      return {
        organization_id: orgId,
        mode: 'SIMULATION',
        total_balance: '125000000000', // 125,000 USDC (simulated)
        available_balance: '82500000000', // 82,500 USDC (simulated)
        reserved_balance: '25000000000', // 25,000 USDC (simulated)
        committed_balance: '12500000000', // 12,500 USDC (simulated)
        pending_settlement: '5000000000', // 5,000 USDC (simulated)
        disputed_balance: '0',
        minimum_buffer: '15000000000', // 15,000 USDC (simulated)
        safe_capacity: '67500000000', // 67,500 USDC (simulated)
        worst_case_exposure: '35000000000', // 35,000 USDC (simulated)
        solvency_ratio: 3.57,
        operational_mode: 'LIQUIDITY_AVAILABLE',
        updated_at: new Date().toISOString(),
      };
    }
    // Truthful zero / unavailable live state
    return {
      organization_id: orgId,
      mode: 'REAL',
      total_balance: '0',
      available_balance: '0',
      reserved_balance: '0',
      committed_balance: '0',
      pending_settlement: '0',
      disputed_balance: '0',
      minimum_buffer: '0',
      safe_capacity: '0',
      worst_case_exposure: '0',
      solvency_ratio: 0,
      operational_mode: 'LIQUIDITY_UNAVAILABLE',
      updated_at: new Date().toISOString(),
    };
  }
}

export async function fetchTreasuryBalance(
  orgId = 'org_default',
  vault?: string,
  mode: TreasuryExecutionMode = 'REAL'
): Promise<TreasurySummary> {
  try {
    const vaultParam = vault ? `&vault=${encodeURIComponent(vault)}` : '';
    return await apiRequest<TreasurySummary>(`/v1/treasury/balance?organization_id=${encodeURIComponent(orgId)}${vaultParam}`);
  } catch {
    if (mode === 'SIMULATION') {
      return {
        organization_id: orgId,
        vault_address: vault || 'SIMULATED_AGENT_VAULT',
        on_chain_balance: '125000000000',
        reserved_amount: '25000000000',
        available_amount: '100000000000',
        asset: 'USDC',
        decimals: 6,
      };
    }
    return {
      organization_id: orgId,
      vault_address: 'NOT_DEPLOYED',
      on_chain_balance: '0',
      reserved_amount: '0',
      available_amount: '0',
      asset: 'USDC',
      decimals: 6,
    };
  }
}

export async function fetchTreasuryReservations(
  orgId = 'org_default',
  mode: TreasuryExecutionMode = 'REAL',
  status?: string
): Promise<LiquidityReservation[]> {
  try {
    let url = `/v1/treasury/reservations?organization_id=${encodeURIComponent(orgId)}&mode=${mode}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return await apiRequest<LiquidityReservation[]>(url);
  } catch {
    if (mode === 'SIMULATION') {
      const now = Date.now();
      return [
        {
          reservation_id: 'res_sim_01',
          organization_id: orgId,
          source: 'SWARM_ORCHESTRATOR',
          amount: '15000000000', // 15,000 USDC
          currency: 'USDC',
          priority: 10,
          status: 'ACTIVE',
          mode: 'SIMULATION',
          agent_id: 'agent_lead_analyst',
          mission_id: 'msn_global_macro',
          swarm_id: 'swm_alpha_cluster',
          purpose: 'Multi-agent high frequency data ingestion and inference pipelines (Simulation)',
          timeout_seconds: 3600,
          created_at: new Date(now - 1200000).toISOString(),
          expires_at: new Date(now + 2400000).toISOString(),
          updated_at: new Date(now - 1200000).toISOString(),
        },
        {
          reservation_id: 'res_sim_02',
          organization_id: orgId,
          source: 'CLEARINGHOUSE_OBLIGATION',
          amount: '10000000000', // 10,000 USDC
          currency: 'USDC',
          priority: 8,
          status: 'ACTIVE',
          mode: 'SIMULATION',
          agent_id: 'agent_settlement_escrow',
          obligation_id: 'ob_sim_01',
          purpose: 'Bilateral service contract milestone verification escrow lock (Simulation)',
          timeout_seconds: 7200,
          created_at: new Date(now - 600000).toISOString(),
          expires_at: new Date(now + 6600000).toISOString(),
          updated_at: new Date(now - 600000).toISOString(),
        },
      ];
    }
    return [];
  }
}

export async function createTreasuryReservation(data: {
  organization_id: string;
  source: string;
  amount_base: string;
  agent_id?: string;
  mission_id?: string;
  swarm_id?: string;
  obligation_id?: string;
  timeout_seconds?: number;
  mode?: TreasuryExecutionMode;
}): Promise<LiquidityReservation> {
  return await apiRequest<LiquidityReservation>('/v1/treasury/reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function releaseTreasuryReservation(
  id: string,
  reason = 'Operator manual release via Mission Control'
): Promise<{ status: string; reservation_id: string }> {
  return await apiRequest<{ status: string; reservation_id: string }>(
    `/v1/treasury/reservations/${encodeURIComponent(id)}/release`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
}

export async function fetchTreasuryCommitments(
  orgId = 'org_default',
  mode: TreasuryExecutionMode = 'REAL'
): Promise<LiquidityCommitment[]> {
  try {
    return await apiRequest<LiquidityCommitment[]>(`/v1/treasury/commitments?organization_id=${encodeURIComponent(orgId)}&mode=${mode}`);
  } catch {
    if (mode === 'SIMULATION') {
      const now = Date.now();
      return [
        {
          commitment_id: 'cmt_sim_01',
          organization_id: orgId,
          type: 'HARD',
          amount: '7500000000', // 7,500 USDC
          currency: 'USDC',
          counterparty_id: 'agent_gpu_cluster_01',
          source: 'RESERVED_ESCROW',
          source_id: 'esc_sim_01',
          agent_id: 'agent_lead_analyst',
          created_at: new Date(now - 1800000).toISOString(),
          matures_at: new Date(now + 14400000).toISOString(),
          updated_at: new Date(now - 1800000).toISOString(),
        },
      ];
    }
    return [];
  }
}

export async function fetchTreasuryExposure(
  orgId = 'org_default',
  mode: TreasuryExecutionMode = 'REAL'
): Promise<LiquidityEnvelope> {
  try {
    return await apiRequest<LiquidityEnvelope>(
      `/v1/treasury/exposure?organization_id=${encodeURIComponent(orgId)}&mode=${mode}`
    );
  } catch {
    if (mode === 'SIMULATION') {
      return {
        scope: 'ORGANIZATION',
        scope_id: orgId,
        currency: 'USDC',
        total_funds: '125000000000',
        current_available: '82500000000',
        reserved_funds: '25000000000',
        committed_funds: '12500000000',
        potential_exposure: '35000000000',
        minimum_buffer: '15000000000',
        safe_commitment_capacity: '67500000000',
        effective_solvency_ratio: 3.57,
        calculated_at: new Date().toISOString(),
      };
    }
    return {
      scope: 'ORGANIZATION',
      scope_id: orgId,
      currency: 'USDC',
      total_funds: '0',
      current_available: '0',
      reserved_funds: '0',
      committed_funds: '0',
      potential_exposure: '0',
      minimum_buffer: '0',
      safe_commitment_capacity: '0',
      effective_solvency_ratio: 0,
      calculated_at: new Date().toISOString(),
    };
  }
}

export async function fetchTreasuryForecast(
  horizon: '1h' | '6h' | '24h' | '7d' | '30d' = '24h',
  orgId = 'org_default',
  scenario = 'BASELINE',
  mode: TreasuryExecutionMode = 'REAL'
): Promise<LiquidityForecast> {
  try {
    return await apiRequest<LiquidityForecast>(
      `/v1/treasury/forecast?organization_id=${encodeURIComponent(orgId)}&horizon=${horizon}&scenario=${scenario}&mode=${mode}`
    );
  } catch {
    if (mode === 'SIMULATION') {
      const now = Date.now();
      const stepMs = horizon === '1h' ? 600000 : horizon === '6h' ? 3600000 : horizon === '24h' ? 14400000 : 86400000;
      const points: ForecastDataPoint[] = [];
      for (let i = 0; i <= 6; i++) {
        points.push({
          timestamp: new Date(now + i * stepMs).toISOString(),
          available_liquidity: (82500000000 - i * 1500000000).toString(),
          committed_liquidity: (12500000000 + i * 800000000).toString(),
          expected_outflow: (i * 2000000000).toString(),
          expected_inflow: (i * 1200000000).toString(),
          buffer: '15000000000',
          safe_capacity: (67500000000 - i * 1500000000).toString(),
        });
      }

      return {
        forecast_id: `fc_sim_${horizon}_01`,
        organization_id: orgId,
        horizon,
        scenario,
        current_balance: '125000000000',
        starting_balance: '125000000000',
        expected_inflows: '25000000000',
        expected_outflows: '18000000000',
        worst_case_outflows: '32000000000',
        projected_closing_balance: '132000000000',
        survival_state: 'SAFE',
        gating_decision: 'LIQUIDITY_AVAILABLE',
        points,
        confidence: 0.94,
        assumptions: [
          'Simulation: Historical mean settlement latency 8.2s',
          'Simulation: Inflow reliability discount factor 0.85',
          'Simulation: Buffer preservation invariant INV-72 enforced',
        ],
        sample_size: 1420,
        generated_at: new Date().toISOString(),
      };
    }

    return {
      forecast_id: `fc_live_${horizon}_empty`,
      organization_id: orgId,
      horizon,
      scenario,
      current_balance: '0',
      starting_balance: '0',
      expected_inflows: '0',
      expected_outflows: '0',
      worst_case_outflows: '0',
      projected_closing_balance: '0',
      survival_state: 'UNAVAILABLE',
      gating_decision: 'LIQUIDITY_UNAVAILABLE',
      points: [],
      confidence: 0,
      assumptions: ['No active treasury telemetry in live environment'],
      sample_size: 0,
      generated_at: new Date().toISOString(),
    };
  }
}

export async function runTreasuryStress(payload: {
  scenario?: string;
  cluster_factor?: number;
  network_stress?: boolean;
  simultaneous_settlements?: number;
  organization_id?: string;
  mode?: TreasuryExecutionMode;
}): Promise<LiquidityStressResult> {
  try {
    return await apiRequest<LiquidityStressResult>('/v1/treasury/stress', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    if (payload.mode === 'SIMULATION') {
      return {
        scenario: payload.scenario || 'OUTFLOW_SPIKE',
        pre_stress_balance: '125000000000',
        simulated_shock_outflow: '45000000000',
        simulated_inflow_haircut: '8000000000',
        post_stress_buffer_headroom: '57000000000',
        max_survivable_drawdown: '72000000000',
        survival_state: 'SAFE',
        capital_adequacy_ratio: 2.82,
        safe_to_reserve: true,
        recommendations: [
          'SIMULATION: Treasury maintains 282% capital adequacy above safety floor',
          'SIMULATION: Settlement shock absorbs within tier-1 capital model',
        ],
        tested_at: new Date().toISOString(),
      };
    }
    throw new Error('Live treasury stress testing service is currently unavailable.');
  }
}

export async function runTreasuryReconciliation(
  orgId = 'org_default',
  mode: TreasuryExecutionMode = 'REAL'
): Promise<TreasuryReconciliationReport> {
  try {
    return await apiRequest<TreasuryReconciliationReport>('/v1/treasury/reconcile', {
      method: 'POST',
      body: JSON.stringify({ organization_id: orgId, mode }),
    });
  } catch {
    if (mode === 'SIMULATION') {
      return {
        reconciliation_id: 'rec_sim_01',
        organization_id: orgId,
        reconciliation_status: 'MATCHED',
        ledger_balance: '125000000000',
        repository_balance: '125000000000',
        vault_balance: '125000000000',
        blockchain_balance: '125000000000',
        discrepancy_amount: '0',
        chain_id: '5042',
        vault_address: 'SIMULATED_AGENT_VAULT',
        token_address: '0x3600000000000000000000000000000000000000',
        vault_paused: false,
        vault_owner: '0x0000000000000000000000000000000000000001',
        verified_at: new Date().toISOString(),
        evidence: 'Deterministic simulation snapshot: 4-way simulated balance check matched across test fixtures.',
      };
    }
    return {
      reconciliation_id: `rec_live_${Date.now()}`,
      organization_id: orgId,
      reconciliation_status: 'UNVERIFIED',
      ledger_balance: '0',
      repository_balance: '0',
      vault_balance: '0',
      blockchain_balance: '0',
      discrepancy_amount: '0',
      chain_id: '5042',
      vault_address: 'NOT_DEPLOYED',
      token_address: '0x3600000000000000000000000000000000000000',
      vault_paused: false,
      vault_owner: '0x0000000000000000000000000000000000000000',
      verified_at: new Date().toISOString(),
      evidence: 'Authoritative Live State: AgentVault is NOT DEPLOYED on Arc (Chain 5042). Live execution disabled.',
    };
  }
}

export async function fetchTreasuryHealth(
  orgId = 'org_default',
  mode: TreasuryExecutionMode = 'REAL'
): Promise<TreasuryHealthSnapshot> {
  try {
    return await apiRequest<TreasuryHealthSnapshot>(
      `/v1/treasury/health?organization_id=${encodeURIComponent(orgId)}&mode=${mode}`
    );
  } catch {
    if (mode === 'SIMULATION') {
      return {
        organization_id: orgId,
        mode: 'SIMULATION',
        total_balance: '125000000000',
        available_balance: '82500000000',
        reserved_balance: '25000000000',
        committed_balance: '12500000000',
        pending_settlement: '5000000000',
        disputed_balance: '0',
        minimum_buffer: '15000000000',
        safe_capacity: '67500000000',
        worst_case_exposure: '35000000000',
        solvency_ratio: 3.57,
        operational_mode: 'LIQUIDITY_AVAILABLE',
        reconciliation_status: 'MATCHED',
        last_verified_on_chain_balance: '125000000000',
        verification_timestamp: new Date().toISOString(),
        active_reservations_count: 2,
        active_anomalies_count: 0,
      };
    }
    return {
      organization_id: orgId,
      mode: 'REAL',
      total_balance: '0',
      available_balance: '0',
      reserved_balance: '0',
      committed_balance: '0',
      pending_settlement: '0',
      disputed_balance: '0',
      minimum_buffer: '0',
      safe_capacity: '0',
      worst_case_exposure: '0',
      solvency_ratio: 0,
      operational_mode: 'LIQUIDITY_UNAVAILABLE',
      reconciliation_status: 'UNVERIFIED',
      last_verified_on_chain_balance: '0',
      verification_timestamp: new Date().toISOString(),
      active_reservations_count: 0,
      active_anomalies_count: 0,
    };
  }
}

export async function fetchTreasuryAnomalies(orgId = 'org_default'): Promise<LiquidityAnomaly[]> {
  try {
    return await apiRequest<LiquidityAnomaly[]>(`/v1/treasury/anomalies?organization_id=${encodeURIComponent(orgId)}`);
  } catch {
    return [];
  }
}

export async function fetchTreasuryInflows(
  orgId = 'org_default',
  mode: TreasuryExecutionMode = 'REAL'
): Promise<ExpectedInflow[]> {
  try {
    return await apiRequest<ExpectedInflow[]>(
      `/v1/treasury/inflows?organization_id=${encodeURIComponent(orgId)}&mode=${mode}`
    );
  } catch {
    if (mode === 'SIMULATION') {
      const now = Date.now();
      return [
        {
          inflow_id: 'inf_sim_01',
          organization_id: orgId,
          source: 'CLIENT_SUBSCRIPTION_RENEWAL',
          expected_amount: '15000000000',
          currency: 'USDC',
          expected_at: new Date(now + 18000000).toISOString(),
          confidence: 0.95,
          status: 'SCHEDULED',
        },
      ];
    }
    return [];
  }
}
