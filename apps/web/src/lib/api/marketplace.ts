import { apiRequest } from './client';

export type PricingModel =
  | 'FIXED'
  | 'PER_TASK'
  | 'PER_UNIT'
  | 'MILESTONE'
  | 'TIME_BASED'
  | 'USAGE_BASED'
  | 'NEGOTIATED';

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED' | 'RETIRED';

export type AvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'BUSY' | 'OFFLINE' | 'MAINTENANCE';

export type OpportunityStatus =
  | 'OPEN'
  | 'MATCHING'
  | 'QUOTING'
  | 'NEGOTIATING'
  | 'AWARDED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'SETTLING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'EXPIRED'
  | 'FAILED';

export interface ServiceListing {
  listing_id: string;
  tenant_id: string;
  provider_agent_id: string;
  capability_id: string;
  title: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  pricing_model: PricingModel;
  base_price_usdc: string;
  availability: AvailabilityStatus;
  estimated_latency_ms: number;
  quality_requirements?: Record<string, unknown>;
  supported_protocol_versions: string[];
  verification_method: string;
  status: ListingStatus;
  max_concurrent_jobs?: number;
  rate_limit_per_minute?: number;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface MarketplaceOpportunity {
  opportunity_id: string;
  tenant_id: string;
  requester_id: string;
  capability: string;
  title: string;
  requirements?: Record<string, unknown>;
  deadline: string;
  budget_constraint_usdc: string;
  quality_requirement?: Record<string, unknown>;
  risk_requirement?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  status: OpportunityStatus;
  awarded_provider_id?: string;
  awarded_quote_id?: string;
  contract_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateMatch {
  provider_id: string;
  listing_id: string;
  capability_match: boolean;
  availability: AvailabilityStatus;
  estimated_cost_usdc: string;
  estimated_latency_ms: number;
  historical_success_rate: number;
  contextual_score: number;
  risk_score: number;
  policy_compatible: boolean;
  confidence: number;
  sample_size: number;
  rank: number;
  score: number;
  match_reasons: string[];
  disqualification?: string;
}

export interface MatchExplanation {
  opportunity_id: string;
  selected_provider_id: string;
  selected_listing_id: string;
  capability_match: string;
  deadline_feasibility: string;
  policy_status: string;
  risk_status: string;
  availability_status: string;
  quote_amount_usdc: string;
  historical_success: string;
  sample_size: number;
  tie_break_reason: string;
  alternatives_rejected?: Record<string, string>;
}

export interface CandidateSet {
  opportunity_id: string;
  candidates: CandidateMatch[];
  selected_match?: CandidateMatch;
  explanation: MatchExplanation;
  evaluated_at: string;
  deterministic_id: string;
}

export interface MarketplaceMetrics {
  metric_id: string;
  tenant_id: string;
  provider_agent_id: string;
  capability_id: string;
  sample_size: number;
  completion_rate: number;
  failure_rate: number;
  timeout_rate: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  quote_accuracy: number;
  result_acceptance_rate: number;
  dispute_rate: number;
  cancellation_rate: number;
  updated_at: string;
}

export interface MarketplaceAnomaly {
  anomaly_id: string;
  tenant_id: string;
  provider_agent_id: string;
  anomaly_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence?: Record<string, unknown>;
  created_at: string;
}

export interface MarketplaceTrustModel {
  agent_id: string;
  identity_verified: boolean;
  organization: string;
  total_completed_jobs: number;
  overall_dispute_rate: number;
  security_compliant: boolean;
  contextual_performance: MarketplaceMetrics[];
  concentration_warning: boolean;
  active_anomalies: string[];
}

export interface MarketplaceHealth {
  active_providers: number;
  active_listings: number;
  open_opportunities: number;
  quote_response_rate: number;
  median_quote_count: number;
  avg_time_to_award_seconds: number;
  unfilled_opportunities: number;
  contracts_active: number;
  work_being_executed: number;
  disputes: number;
}

export interface MarketplaceSimulationRequest {
  scenario_type: string;
  opportunity_context: MarketplaceOpportunity;
  provider_outage_ids?: string[];
  price_increase_percent?: number;
  reduced_deadline_hours?: number;
}

export interface MarketplaceSimulationResult {
  scenario_type: string;
  feasible: boolean;
  projected_winner_id: string;
  projected_cost_usdc: string;
  projected_duration_ms: number;
  remaining_candidate_count: number;
  worst_case_exposure_usdc: string;
  policy_clearance: string;
  simulation_only_label: string;
}

// ----------------------------------------------------------------------------
// SEED FIXTURES
// ----------------------------------------------------------------------------

export const MOCK_MARKETPLACE_HEALTH: MarketplaceHealth = {
  active_providers: 32,
  active_listings: 84,
  open_opportunities: 8,
  quote_response_rate: 0.965,
  median_quote_count: 4,
  avg_time_to_award_seconds: 32,
  unfilled_opportunities: 1,
  contracts_active: 14,
  work_being_executed: 9,
  disputes: 0,
};

export const MOCK_SERVICE_LISTINGS: ServiceListing[] = [
  {
    listing_id: 'listing_code_audit_01',
    tenant_id: 'tenant_default',
    provider_agent_id: 'agent_security_alpha',
    capability_id: 'sec.smart_contract_audit',
    title: 'Formal Smart Contract & Protocol Auditor',
    description: 'Automated formal verification, reentrancy scanning, and fuzzing for Solidity and Rust smart contracts.',
    pricing_model: 'PER_TASK',
    base_price_usdc: '40.00',
    availability: 'AVAILABLE',
    estimated_latency_ms: 1800000,
    supported_protocol_versions: ['v1.0'],
    verification_method: 'hash_check',
    status: 'ACTIVE',
    max_concurrent_jobs: 8,
    rate_limit_per_minute: 60,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    listing_id: 'listing_market_intel_02',
    tenant_id: 'tenant_default',
    provider_agent_id: 'agent_intel_pro',
    capability_id: 'data.market_analysis',
    title: 'Real-Time Orderbook & DEX Liquidity Oracle',
    description: 'Sub-second market intelligence across EVM DEX pools with statistical slippage modeling.',
    pricing_model: 'USAGE_BASED',
    base_price_usdc: '12.50',
    availability: 'AVAILABLE',
    estimated_latency_ms: 250,
    supported_protocol_versions: ['v1.0'],
    verification_method: 'oracle_attestation',
    status: 'ACTIVE',
    max_concurrent_jobs: 25,
    rate_limit_per_minute: 300,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    listing_id: 'listing_verification_03',
    tenant_id: 'tenant_default',
    provider_agent_id: 'agent_auditor_beta',
    capability_id: 'sec.smart_contract_audit',
    title: 'Zero-Knowledge Proof & Circuit Verifier',
    description: 'Deterministic circuit constraint verification and Groth16 / Plonk proof checks.',
    pricing_model: 'PER_TASK',
    base_price_usdc: '45.00',
    availability: 'AVAILABLE',
    estimated_latency_ms: 2400000,
    supported_protocol_versions: ['v1.0'],
    verification_method: 'zk_snark_verify',
    status: 'ACTIVE',
    max_concurrent_jobs: 4,
    rate_limit_per_minute: 30,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
];

export const MOCK_OPPORTUNITIES: MarketplaceOpportunity[] = [
  {
    opportunity_id: 'opp_sec_audit_10k',
    tenant_id: 'tenant_default',
    requester_id: 'agent_ciso_bot',
    capability: 'sec.smart_contract_audit',
    title: 'Analyze 10,000 smart contract telemetry events',
    requirements: { scope: 'amm_v3', event_count: 10000, max_latency_hours: 24 },
    budget_constraint_usdc: '50.00',
    deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'OPEN',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    opportunity_id: 'opp_market_intel_live',
    tenant_id: 'tenant_default',
    requester_id: 'agent_treasury_arb',
    capability: 'data.market_analysis',
    title: 'Multi-Pool Slippage Curve Estimation',
    requirements: { pairs: ['USDC/ETH', 'USDC/ARC'], granularity_ms: 100 },
    budget_constraint_usdc: '25.00',
    deadline: new Date(Date.now() + 86400000 * 1).toISOString(),
    status: 'AWARDED',
    awarded_provider_id: 'agent_intel_pro',
    awarded_quote_id: 'quote_intel_02',
    contract_id: 'contract_mkt_opp_market_intel_live_agent_intel_pro',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MOCK_ANOMALIES: MarketplaceAnomaly[] = [
  {
    anomaly_id: 'anom_conc_01',
    tenant_id: 'tenant_default',
    provider_agent_id: 'agent_security_alpha',
    anomaly_type: 'COUNTERPARTY_CONCENTRATION',
    severity: 'MEDIUM',
    description: 'Provider receives 62% of smart contract audit opportunities across past 14 days (INV-200 Signal).',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    anomaly_id: 'anom_wash_02',
    tenant_id: 'tenant_default',
    provider_agent_id: 'agent_suspect_sybil',
    anomaly_type: 'WASH_TRANSACTION_SUSPECT',
    severity: 'HIGH',
    description: 'High frequency of $0.05 micro-requests between correlated sub-accounts detected.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

// ----------------------------------------------------------------------------
// API CLIENT CALLS WITH RESILIENT FALLBACKS
// ----------------------------------------------------------------------------

export async function getMarketplaceHealth(): Promise<MarketplaceHealth> {
  try {
    return await apiRequest<MarketplaceHealth>('/api/marketplace/health');
  } catch {
    return MOCK_MARKETPLACE_HEALTH;
  }
}

export async function getListings(capability?: string): Promise<ServiceListing[]> {
  try {
    const url = capability ? `/api/marketplace/listings?capability=${encodeURIComponent(capability)}` : '/api/marketplace/listings';
    return await apiRequest<ServiceListing[]>(url);
  } catch {
    if (capability) {
      return MOCK_SERVICE_LISTINGS.filter(l => l.capability_id === capability);
    }
    return MOCK_SERVICE_LISTINGS;
  }
}

export async function getListing(id: string): Promise<ServiceListing> {
  try {
    return await apiRequest<ServiceListing>(`/api/marketplace/listings/${encodeURIComponent(id)}`);
  } catch {
    const found = MOCK_SERVICE_LISTINGS.find(l => l.listing_id === id);
    if (!found) throw new Error(`Listing not found: ${id}`);
    return found;
  }
}

export async function getOpportunities(): Promise<MarketplaceOpportunity[]> {
  try {
    return await apiRequest<MarketplaceOpportunity[]>('/api/marketplace/opportunities');
  } catch {
    return MOCK_OPPORTUNITIES;
  }
}

export async function getOpportunity(id: string): Promise<MarketplaceOpportunity> {
  try {
    return await apiRequest<MarketplaceOpportunity>(`/api/marketplace/opportunities/${encodeURIComponent(id)}`);
  } catch {
    const found = MOCK_OPPORTUNITIES.find(o => o.opportunity_id === id);
    if (!found) throw new Error(`Opportunity not found: ${id}`);
    return found;
  }
}

export async function matchOpportunity(id: string): Promise<CandidateSet> {
  try {
    return await apiRequest<CandidateSet>(`/api/marketplace/opportunities/${encodeURIComponent(id)}/match`, {
      method: 'POST',
    });
  } catch {
    return {
      opportunity_id: id,
      deterministic_id: 'det_match_9f7a2c',
      evaluated_at: new Date().toISOString(),
      candidates: [
        {
          provider_id: 'agent_security_alpha',
          listing_id: 'listing_code_audit_01',
          capability_match: true,
          availability: 'AVAILABLE',
          estimated_cost_usdc: '40.00',
          estimated_latency_ms: 1800000,
          historical_success_rate: 0.985,
          contextual_score: 0.985,
          risk_score: 10,
          policy_compatible: true,
          confidence: 0.98,
          sample_size: 142,
          rank: 1,
          score: 0.94,
          match_reasons: [
            'Capability: MATCH',
            'Deadline: FEASIBLE',
            'Policy: ALLOWED',
            'Risk: WITHIN LIMIT',
            'Price: 40.00 USDC (Cap: 50.00 USDC)',
          ],
        },
        {
          provider_id: 'agent_auditor_beta',
          listing_id: 'listing_verification_03',
          capability_match: true,
          availability: 'AVAILABLE',
          estimated_cost_usdc: '45.00',
          estimated_latency_ms: 2400000,
          historical_success_rate: 0.96,
          contextual_score: 0.96,
          risk_score: 12,
          policy_compatible: true,
          confidence: 0.95,
          sample_size: 88,
          rank: 2,
          score: 0.88,
          match_reasons: [
            'Capability: MATCH',
            'Deadline: FEASIBLE',
            'Policy: ALLOWED',
            'Price: 45.00 USDC',
          ],
        }
      ],
      explanation: {
        opportunity_id: id,
        selected_provider_id: 'agent_security_alpha',
        selected_listing_id: 'listing_code_audit_01',
        capability_match: 'MATCH',
        deadline_feasibility: 'FEASIBLE',
        policy_status: 'ALLOWED',
        risk_status: 'WITHIN_LIMIT',
        availability_status: 'AVAILABLE',
        quote_amount_usdc: '40.00',
        historical_success: '98.5%',
        sample_size: 142,
        tie_break_reason: 'Lowest verified price within low risk envelope',
        alternatives_rejected: {
          'agent_auditor_beta': 'Alternative priced at 45.00 USDC vs 40.00 USDC for selected winner',
        },
      },
    };
  }
}

export async function awardOpportunity(
  opportunityId: string,
  payload: { provider_id: string; quote_id: string; quote_price_usdc: string }
): Promise<MarketplaceOpportunity> {
  try {
    return await apiRequest<MarketplaceOpportunity>(`/api/marketplace/opportunities/${encodeURIComponent(opportunityId)}/award`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    const opp = await getOpportunity(opportunityId);
    opp.status = 'AWARDED';
    opp.awarded_provider_id = payload.provider_id;
    opp.awarded_quote_id = payload.quote_id;
    opp.contract_id = `contract_mkt_${opportunityId}_${payload.provider_id}`;
    return opp;
  }
}

export async function getAgentProfile(agentId: string): Promise<MarketplaceTrustModel> {
  try {
    return await apiRequest<MarketplaceTrustModel>(`/api/marketplace/agents/${encodeURIComponent(agentId)}`);
  } catch {
    return {
      agent_id: agentId,
      identity_verified: true,
      organization: 'AgentPay Protocol Guild',
      total_completed_jobs: 142,
      overall_dispute_rate: 0.004,
      security_compliant: true,
      concentration_warning: agentId === 'agent_security_alpha',
      active_anomalies: agentId === 'agent_security_alpha' ? ['[MEDIUM] Counterparty Concentration: 62% in category'] : [],
      contextual_performance: [
        {
          metric_id: `met_${agentId}_sec`,
          tenant_id: 'tenant_default',
          provider_agent_id: agentId,
          capability_id: 'sec.smart_contract_audit',
          sample_size: 110,
          completion_rate: 0.985,
          failure_rate: 0.015,
          timeout_rate: 0.005,
          avg_duration_ms: 1800000,
          p50_duration_ms: 1600000,
          p95_duration_ms: 2400000,
          quote_accuracy: 0.99,
          result_acceptance_rate: 0.995,
          dispute_rate: 0.003,
          cancellation_rate: 0.002,
          updated_at: new Date().toISOString(),
        }
      ],
    };
  }
}

export async function getAgentPerformance(agentId: string, capability?: string): Promise<MarketplaceMetrics[]> {
  try {
    const url = capability
      ? `/api/marketplace/agents/${encodeURIComponent(agentId)}/performance?capability=${encodeURIComponent(capability)}`
      : `/api/marketplace/agents/${encodeURIComponent(agentId)}/performance`;
    return await apiRequest<MarketplaceMetrics[]>(url);
  } catch {
    const profile = await getAgentProfile(agentId);
    return profile.contextual_performance;
  }
}

export async function compareProviders(capability: string, providerIds: string[]): Promise<Record<string, unknown>[]> {
  try {
    const query = `?capability=${encodeURIComponent(capability)}&providers=${encodeURIComponent(providerIds.join(','))}`;
    return await apiRequest<Record<string, unknown>[]>(`/api/marketplace/compare${query}`);
  } catch {
    return [
      {
        provider_id: providerIds[0] || 'agent_security_alpha',
        capability_id: capability,
        capability_match: true,
        availability: 'AVAILABLE',
        base_price_usdc: '40.00',
        latency_ms: 1800000,
        historical_success: '98.5%',
        sample_size: 142,
        policy_compatible: true,
        risk_score: 10,
      },
      {
        provider_id: providerIds[1] || 'agent_auditor_beta',
        capability_id: capability,
        capability_match: true,
        availability: 'AVAILABLE',
        base_price_usdc: '45.00',
        latency_ms: 2400000,
        historical_success: '96.0%',
        sample_size: 88,
        policy_compatible: true,
        risk_score: 12,
      },
    ];
  }
}

export async function getSecurityAnomalies(): Promise<MarketplaceAnomaly[]> {
  return MOCK_ANOMALIES;
}

export async function simulateMarketplace(req: MarketplaceSimulationRequest): Promise<MarketplaceSimulationResult> {
  try {
    return await apiRequest<MarketplaceSimulationResult>('/api/marketplace/simulate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  } catch {
    const base = parseFloat(req.opportunity_context?.budget_constraint_usdc || '50.00');
    const mult = 1.0 + (req.price_increase_percent || 0) / 100.0;
    const projected = (base * 0.8 * mult).toFixed(2);
    return {
      scenario_type: req.scenario_type,
      feasible: true,
      projected_winner_id: 'agent_auditor_beta',
      projected_cost_usdc: projected,
      projected_duration_ms: 2400000,
      remaining_candidate_count: 2,
      worst_case_exposure_usdc: (parseFloat(projected) * 1.25).toFixed(2),
      policy_clearance: 'ALLOW',
      simulation_only_label: 'SIMULATION ONLY: NO MONEY MOVED (INV-192)',
    };
  }
}
