import { apiRequest } from './client';
import { getActiveDataMode, DataMode } from '../data-authority';

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
// SEED FIXTURES (Authoritative Simulation Datasets)
// ----------------------------------------------------------------------------

export const MOCK_MARKETPLACE_HEALTH: MarketplaceHealth = {
  active_providers: 3,
  active_listings: 3,
  open_opportunities: 1,
  quote_response_rate: 0.94,
  median_quote_count: 3,
  avg_time_to_award_seconds: 45,
  unfilled_opportunities: 0,
  contracts_active: 1,
  work_being_executed: 1,
  disputes: 0,
};

export const MOCK_SERVICE_LISTINGS: ServiceListing[] = [
  {
    listing_id: 'listing_code_audit_01',
    tenant_id: 'tenant_default',
    provider_agent_id: 'agent_security_02',
    capability_id: 'code_audit',
    title: 'Smart Contract & Protocol Security Audit',
    description: 'Formal verification, fuzzing, and invariant vulnerability detection for autonomous execution protocols.',
    pricing_model: 'FIXED',
    base_price_usdc: '75.00',
    availability: 'AVAILABLE',
    estimated_latency_ms: 300,
    supported_protocol_versions: ['v1.0'],
    verification_method: 'INDEPENDENT_VERIFIER_CONSENSUS',
    status: 'ACTIVE',
    max_concurrent_jobs: 5,
    rate_limit_per_minute: 60,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    listing_id: 'listing_market_intel_02',
    tenant_id: 'tenant_default',
    provider_agent_id: 'agent_research_01',
    capability_id: 'market_research',
    title: 'Market Intelligence Synthesis',
    description: 'Cross-protocol decentralized data aggregation and liquidity modeling across EVM & Arc networks.',
    pricing_model: 'FIXED',
    base_price_usdc: '45.00',
    availability: 'AVAILABLE',
    estimated_latency_ms: 120,
    supported_protocol_versions: ['v1.0'],
    verification_method: 'CRYPTO_HASH_AND_SCHEMA',
    status: 'ACTIVE',
    max_concurrent_jobs: 10,
    rate_limit_per_minute: 300,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    listing_id: 'listing_verification_03',
    tenant_id: 'tenant_default',
    provider_agent_id: 'agent_verifier_03',
    capability_id: 'result_verification',
    title: 'Quality Gate Independent Deliverable Verification',
    description: 'Oracle seal verification, schema validation, and consensus attestation for completed agent milestones.',
    pricing_model: 'FIXED',
    base_price_usdc: '10.00',
    availability: 'AVAILABLE',
    estimated_latency_ms: 30,
    supported_protocol_versions: ['v1.0'],
    verification_method: 'MULTI_PARTY_SIGNATURE',
    status: 'ACTIVE',
    max_concurrent_jobs: 50,
    rate_limit_per_minute: 600,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
];

export const MOCK_OPPORTUNITIES: MarketplaceOpportunity[] = [
  {
    opportunity_id: 'opp_sim_01',
    tenant_id: 'tenant_default',
    requester_id: 'agent_research_01',
    capability: 'code_audit',
    title: 'Audit Protocol Gateway Handlers',
    requirements: { depth: 'comprehensive', fuzz_rounds: 1000 },
    budget_constraint_usdc: '100.00',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: 'OPEN',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    opportunity_id: 'opp_sec_audit_10k',
    tenant_id: 'tenant_default',
    requester_id: 'agent_ciso_bot',
    capability: 'code_audit',
    title: 'Secondary Simulation: Telemetry Audit',
    requirements: { scope: 'amm_v3', event_count: 10000, max_latency_hours: 24 },
    budget_constraint_usdc: '50.00',
    deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'OPEN',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
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

export async function getMarketplaceHealth(mode?: DataMode): Promise<MarketplaceHealth> {
  const currentMode = mode || getActiveDataMode();
  if (currentMode === 'SIMULATION') {
    return MOCK_MARKETPLACE_HEALTH;
  }
  try {
    return await apiRequest<MarketplaceHealth>('/api/marketplace/health');
  } catch (err) {
    throw err;
  }
}

export async function getListings(capability?: string, mode?: DataMode): Promise<ServiceListing[]> {
  const currentMode = mode || getActiveDataMode();
  if (currentMode === 'SIMULATION') {
    if (capability) {
      return MOCK_SERVICE_LISTINGS.filter(l => l.capability_id === capability);
    }
    return MOCK_SERVICE_LISTINGS;
  }
  try {
    const url = capability ? `/api/marketplace/listings?capability=${encodeURIComponent(capability)}` : '/api/marketplace/listings';
    return await apiRequest<ServiceListing[]>(url);
  } catch (err) {
    throw err;
  }
}

export async function getListing(id: string, mode?: DataMode): Promise<ServiceListing> {
  const currentMode = mode || getActiveDataMode();
  if (currentMode === 'SIMULATION') {
    const found = MOCK_SERVICE_LISTINGS.find(l => l.listing_id === id);
    if (!found) throw new Error(`Listing not found: ${id}`);
    return found;
  }
  try {
    return await apiRequest<ServiceListing>(`/api/marketplace/listings/${encodeURIComponent(id)}`);
  } catch (err) {
    throw err;
  }
}

export async function getOpportunities(mode?: DataMode): Promise<MarketplaceOpportunity[]> {
  const currentMode = mode || getActiveDataMode();
  if (currentMode === 'SIMULATION') {
    return MOCK_OPPORTUNITIES;
  }
  try {
    return await apiRequest<MarketplaceOpportunity[]>('/api/marketplace/opportunities');
  } catch (err) {
    throw err;
  }
}

export async function getOpportunity(id: string, mode?: DataMode): Promise<MarketplaceOpportunity> {
  const currentMode = mode || getActiveDataMode();
  if (currentMode === 'SIMULATION') {
    const targetId = id === 'opp_live_01' ? 'opp_sim_01' : id;
    const found = MOCK_OPPORTUNITIES.find(o => o.opportunity_id === targetId || o.opportunity_id === id);
    if (!found) {
      return MOCK_OPPORTUNITIES[0];
    }
    return found;
  }
  try {
    return await apiRequest<MarketplaceOpportunity>(`/api/marketplace/opportunities/${encodeURIComponent(id)}`);
  } catch (err) {
    throw err;
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
          provider_id: 'agent_security_02',
          listing_id: 'listing_code_audit_01',
          capability_match: true,
          availability: 'AVAILABLE',
          estimated_cost_usdc: '75.00',
          estimated_latency_ms: 300,
          historical_success_rate: 0.98,
          contextual_score: 0.974,
          risk_score: 15,
          policy_compatible: true,
          confidence: 0.85,
          sample_size: 48,
          rank: 1,
          score: 74.21,
          match_reasons: [
            'Capability verified: code_audit',
            'Price 75.00 USDC under budget cap 100.00 USDC',
            'Policy cleared (Risk score: 15/100)',
            'Contextual success rate: 98.0% (sample size: 48)',
          ],
        },
        {
          provider_id: 'agent_research_01',
          listing_id: 'listing_market_intel_02',
          capability_match: false,
          availability: 'AVAILABLE',
          estimated_cost_usdc: '45.00',
          estimated_latency_ms: 120,
          historical_success_rate: 0.95,
          contextual_score: 0.92,
          risk_score: 10,
          policy_compatible: true,
          confidence: 0.80,
          sample_size: 32,
          rank: 2,
          score: 0,
          disqualification: 'Capability mismatch: listing offers market_research, required code_audit',
          match_reasons: [],
        },
        {
          provider_id: 'agent_verifier_03',
          listing_id: 'listing_verification_03',
          capability_match: false,
          availability: 'AVAILABLE',
          estimated_cost_usdc: '10.00',
          estimated_latency_ms: 30,
          historical_success_rate: 0.99,
          contextual_score: 0.98,
          risk_score: 5,
          policy_compatible: true,
          confidence: 0.95,
          sample_size: 150,
          rank: 3,
          score: 0,
          disqualification: 'Capability mismatch: listing offers result_verification, required code_audit',
          match_reasons: [],
        },
      ],
      explanation: {
        opportunity_id: id,
        selected_provider_id: 'agent_security_02',
        selected_listing_id: 'listing_code_audit_01',
        capability_match: 'MATCH',
        deadline_feasibility: 'FEASIBLE',
        policy_status: 'ALLOWED',
        risk_status: 'WITHIN_LIMIT (Score: 15)',
        availability_status: 'AVAILABLE',
        quote_amount_usdc: '75.00',
        historical_success: '98.0% completion',
        sample_size: 48,
        tie_break_reason: 'Deterministic rank #1 by composite score within risk envelope',
        alternatives_rejected: {
          'agent_research_01': 'Disqualified: Capability mismatch (offers market_research, required code_audit)',
          'agent_verifier_03': 'Disqualified: Capability mismatch (offers result_verification, required code_audit)',
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
    const isSecurityAlpha = agentId === 'agent_security_02' || agentId === 'agent_security_alpha';
    const isVerifier = agentId === 'agent_verifier_03';
    return {
      agent_id: agentId,
      identity_verified: true,
      organization: isVerifier ? 'Independent Oracle Guild' : 'AgentPay Protocol Guild',
      total_completed_jobs: isVerifier ? 320 : isSecurityAlpha ? 142 : 88,
      overall_dispute_rate: 0.002,
      security_compliant: true,
      concentration_warning: isSecurityAlpha,
      active_anomalies: isSecurityAlpha ? ['[MEDIUM] Counterparty Concentration: 62% in category (INV-200 Signal)'] : [],
      contextual_performance: [
        {
          metric_id: `met_${agentId}_primary`,
          tenant_id: 'tenant_default',
          provider_agent_id: agentId,
          capability_id: isSecurityAlpha ? 'code_audit' : isVerifier ? 'result_verification' : 'market_research',
          sample_size: isSecurityAlpha ? 48 : isVerifier ? 150 : 32,
          completion_rate: 0.98,
          failure_rate: 0.02,
          timeout_rate: 0.00,
          avg_duration_ms: isSecurityAlpha ? 300 : isVerifier ? 30 : 120,
          p50_duration_ms: isSecurityAlpha ? 280 : 30,
          p95_duration_ms: isSecurityAlpha ? 340 : 50,
          quote_accuracy: 0.99,
          result_acceptance_rate: 0.98,
          dispute_rate: 0.00,
          cancellation_rate: 0.00,
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
        provider_id: providerIds[0] || 'agent_security_02',
        capability_id: capability,
        capability_match: true,
        availability: 'AVAILABLE',
        base_price_usdc: '75.00',
        latency_ms: 300,
        historical_success: '98.0%',
        sample_size: 48,
        policy_compatible: true,
        risk_score: 15,
      },
      {
        provider_id: providerIds[1] || 'agent_research_01',
        capability_id: capability,
        capability_match: capability === 'market_research',
        availability: 'AVAILABLE',
        base_price_usdc: '45.00',
        latency_ms: 120,
        historical_success: '95.0%',
        sample_size: 32,
        policy_compatible: true,
        risk_score: 10,
      },
      {
        provider_id: providerIds[2] || 'agent_verifier_03',
        capability_id: capability,
        capability_match: capability === 'result_verification',
        availability: 'AVAILABLE',
        base_price_usdc: '10.00',
        latency_ms: 30,
        historical_success: '99.0%',
        sample_size: 150,
        policy_compatible: true,
        risk_score: 5,
      },
    ];
  }
}

export async function getSecurityAnomalies(mode?: DataMode): Promise<MarketplaceAnomaly[]> {
  const currentMode = mode || getActiveDataMode();
  if (currentMode === 'SIMULATION') {
    return MOCK_ANOMALIES;
  }
  try {
    return await apiRequest<MarketplaceAnomaly[]>('/api/marketplace/anomalies');
  } catch {
    return [];
  }
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
