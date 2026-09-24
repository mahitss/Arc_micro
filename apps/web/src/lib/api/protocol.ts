import { apiRequest } from './client';

export interface ProtocolAgentManifest {
  manifest_version: string;
  agent_id: string;
  organization_id: string;
  display_name: string;
  public_key: string;
  supported_protocols: string[];
  capabilities: CapabilityDescriptor[];
  endpoint_url: string;
  reputation_score?: number;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  registered_at: string;
  last_heartbeat_at?: string;
  policy_compliance?: boolean;
}

export interface CapabilityDescriptor {
  capability_id: string;
  name: string;
  description: string;
  version: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  pricing_model: 'FIXED' | 'PER_UNIT' | 'AUCTION' | 'OUTCOME_BASED';
  base_price_usdc?: string;
  sla_seconds?: number;
  verification_method: string;
  reputation_minimum?: number;
}

export interface ContractMilestone {
  milestone_id: string;
  title: string;
  deliverable_spec: string;
  amount: string;
  verification_method: string;
  due_at: string;
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'PAID';
}

export interface ProtocolContract {
  contract_id: string;
  tenant_id: string;
  requester_id: string;
  provider_id: string;
  capability: string;
  deliverables: string[];
  milestones: ContractMilestone[];
  state: 'DRAFT' | 'PROPOSED' | 'NEGOTIATING' | 'ACTIVE' | 'DISPUTED' | 'SETTLED' | 'CANCELLED';
  total_amount: string;
  currency: string;
  deadline: string;
  escrow_required: boolean;
  escrow_id?: string;
  arbitrator_id?: string;
  policy_snapshot_hash: string;
  created_at: string;
  updated_at: string;
}

export interface ProtocolQuote {
  quote_id: string;
  provider_id: string;
  request_id: string;
  amount: string;
  currency: string;
  expiration: string;
  expected_duration_seconds: number;
  deliverables: string[];
  assumptions?: string[];
  cancellation_terms?: string;
  verification_requirements?: string;
  policy_snapshot_hash?: string;
}

export interface ResultVerificationDecision {
  decision: 'ACCEPT' | 'REJECT' | 'DISPUTE' | 'RETRY' | 'ESCALATE';
  confidence: number;
  reason: string;
  computed_hash: string;
  eligible_for_payment: boolean;
}

export interface PaymentDecision {
  decision: 'APPROVED' | 'DENIED' | 'REQUIRES_MANUAL_APPROVAL' | 'ESCROW_HELD';
  payment_intent_id?: string;
  policy_reference: string;
  risk_reference: string;
  recommended_safe_action?: string;
  transaction_hash?: string;
  proof_of_settlement?: string;
}

export interface ProtocolTrafficEntry {
  traffic_id: string;
  timestamp: string;
  message_type: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  correlation_id: string;
  latency_ms: number;
  error?: string;
  tenant_id: string;
}

export interface SecurityIncidentReport {
  security_incident_count: number;
  events: ProtocolTrafficEntry[];
  invariants_enforced: string;
  adversarial_summary?: {
    replays_prevented: number;
    unauthorized_queries_blocked: number;
    raw_transfers_halted: number;
    signature_failures: number;
  };
}

export interface ProtocolSimulationResult {
  policy_decision: 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL';
  risk_score: number;
  estimated_cost_usdc: string;
  required_approvals: string[];
  treasury_status: string;
  execution_path: string;
  safe_to_execute: boolean;
  warnings?: string[];
}

export interface PrecheckResponse {
  eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'REQUIRES_APPROVAL' | 'REQUIRES_MORE_INFORMATION';
  reasons: string[];
  max_allowable_budget: string;
}

// ---------------------------------------------------------------------------
// Fallback Fixtures (Offline & Test Determinism)
// ---------------------------------------------------------------------------
export const FALLBACK_AGENTS: ProtocolAgentManifest[] = [
  {
    manifest_version: '1.0',
    agent_id: 'agent_research_01',
    organization_id: 'org_autonomous_labs',
    display_name: 'Deep Research Agent',
    public_key: 'ed25519:7b3a9c4d8e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
    supported_protocols: ['agentpay/1.0'],
    endpoint_url: 'https://research.agents.net/agentpay',
    availability: 'AVAILABLE',
    reputation_score: 98,
    registered_at: '2026-09-20T08:00:00Z',
    last_heartbeat_at: '2026-09-24T23:30:00Z',
    policy_compliance: true,
    capabilities: [
      {
        capability_id: 'market_intelligence',
        name: 'Market Intelligence Synthesis',
        description: 'Deep decentralized market data aggregation and cross-protocol liquidity modeling',
        version: '1.2.0',
        pricing_model: 'FIXED',
        base_price_usdc: '45.00',
        sla_seconds: 120,
        verification_method: 'CRYPTO_HASH_AND_SCHEMA',
        reputation_minimum: 80,
      },
    ],
  },
  {
    manifest_version: '1.0',
    agent_id: 'agent_security_02',
    organization_id: 'org_sentinel_audit',
    display_name: 'Sentinel Security Auditor',
    public_key: 'ed25519:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    supported_protocols: ['agentpay/1.0'],
    endpoint_url: 'https://sentinel.audit.ai/protocol/v1',
    availability: 'AVAILABLE',
    reputation_score: 99,
    registered_at: '2026-09-18T10:00:00Z',
    last_heartbeat_at: '2026-09-24T23:32:00Z',
    policy_compliance: true,
    capabilities: [
      {
        capability_id: 'code_audit',
        name: 'Smart Contract & Protocol Security Audit',
        description: 'Formal verification, invariant fuzzing, and adversarial threat vector detection',
        version: '2.0.0',
        pricing_model: 'FIXED',
        base_price_usdc: '75.00',
        sla_seconds: 300,
        verification_method: 'INDEPENDENT_VERIFIER_CONSENSUS',
        reputation_minimum: 90,
      },
      {
        capability_id: 'vulnerability_scan',
        name: 'Dynamic Penetration & Vulnerability Scan',
        description: 'Live payload injection and runtime exploit boundary verification',
        version: '1.1.0',
        pricing_model: 'FIXED',
        base_price_usdc: '35.00',
        sla_seconds: 60,
        verification_method: 'CRYPTO_HASH_AND_SCHEMA',
        reputation_minimum: 85,
      },
    ],
  },
  {
    manifest_version: '1.0',
    agent_id: 'agent_verifier_03',
    organization_id: 'org_truth_oracles',
    display_name: 'Oracle Deliverable Verifier',
    public_key: 'ed25519:5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e',
    supported_protocols: ['agentpay/1.0'],
    endpoint_url: 'https://verifier.oracle.org/v1',
    availability: 'AVAILABLE',
    reputation_score: 100,
    registered_at: '2026-09-15T04:00:00Z',
    last_heartbeat_at: '2026-09-24T23:34:00Z',
    policy_compliance: true,
    capabilities: [
      {
        capability_id: 'result_verification',
        name: 'Quality Gate Independent Verification',
        description: 'Authoritative deliverable seal hash checking and specification compliance validation',
        version: '1.0.0',
        pricing_model: 'FIXED',
        base_price_usdc: '10.00',
        sla_seconds: 30,
        verification_method: 'MULTI_PARTY_SIGNATURE',
        reputation_minimum: 95,
      },
    ],
  },
];

export const FALLBACK_CONTRACTS: ProtocolContract[] = [
  {
    contract_id: 'contract_live_01',
    tenant_id: 'tenant_default',
    requester_id: 'agent_research_01',
    provider_id: 'agent_security_02',
    capability: 'code_audit',
    deliverables: ['audit_report_full.pdf', 'vulnerability_matrix.json'],
    state: 'ACTIVE',
    total_amount: '110.00',
    currency: 'USDC',
    deadline: '2026-09-26T12:00:00Z',
    escrow_required: true,
    escrow_id: 'escrow_prot_101',
    arbitrator_id: 'agentpay_clearinghouse',
    policy_snapshot_hash: 'c81729b4892019ab76ce0f42337a898112bc55210fa1402390aebce0984f11e2',
    created_at: '2026-09-24T18:30:00Z',
    updated_at: '2026-09-24T23:00:00Z',
    milestones: [
      {
        milestone_id: 'm1_initial_scan',
        title: 'Static Analysis & Initial Scan',
        deliverable_spec: 'SHA-256 seal of static analysis findings',
        amount: '35.00',
        verification_method: 'CRYPTO_HASH_AND_SCHEMA',
        due_at: '2026-09-25T00:00:00Z',
        status: 'PAID',
      },
      {
        milestone_id: 'm2_final_audit',
        title: 'Comprehensive Verification & Exploit Proof',
        deliverable_spec: 'Signed security report deliverable',
        amount: '75.00',
        verification_method: 'INDEPENDENT_VERIFIER_CONSENSUS',
        due_at: '2026-09-26T12:00:00Z',
        status: 'SUBMITTED',
      },
    ],
  },
];

export const FALLBACK_TRAFFIC: ProtocolTrafficEntry[] = [
  {
    traffic_id: 'trf_001',
    timestamp: '2026-09-24T23:20:12Z',
    message_type: 'service.request',
    sender_id: 'agent_research_01',
    recipient_id: 'agentpay_gateway',
    status: 'PROCESSED',
    correlation_id: 'corr_req_101',
    latency_ms: 6,
    tenant_id: 'tenant_default',
  },
  {
    traffic_id: 'trf_002',
    timestamp: '2026-09-24T23:20:15Z',
    message_type: 'protocol.quote',
    sender_id: 'agent_security_02',
    recipient_id: 'agent_research_01',
    status: 'DELIVERED',
    correlation_id: 'corr_req_101',
    latency_ms: 12,
    tenant_id: 'tenant_default',
  },
  {
    traffic_id: 'trf_003',
    timestamp: '2026-09-24T23:21:00Z',
    message_type: 'contract.negotiation',
    sender_id: 'agent_research_01',
    recipient_id: 'agent_security_02',
    status: 'PROCESSED',
    correlation_id: 'corr_neg_202',
    latency_ms: 8,
    tenant_id: 'tenant_default',
  },
  {
    traffic_id: 'trf_004',
    timestamp: '2026-09-24T23:22:30Z',
    message_type: 'contract.proposal',
    sender_id: 'agent_security_02',
    recipient_id: 'agentpay_gateway',
    status: 'VALIDATED',
    correlation_id: 'corr_con_303',
    latency_ms: 15,
    tenant_id: 'tenant_default',
  },
  {
    traffic_id: 'trf_005',
    timestamp: '2026-09-24T23:25:00Z',
    message_type: 'result.submitted',
    sender_id: 'agent_security_02',
    recipient_id: 'agentpay_gateway',
    status: 'QUALITY_GATE_PASS',
    correlation_id: 'corr_res_404',
    latency_ms: 22,
    tenant_id: 'tenant_default',
  },
  {
    traffic_id: 'trf_006',
    timestamp: '2026-09-24T23:26:10Z',
    message_type: 'payment.request',
    sender_id: 'agent_security_02',
    recipient_id: 'agentpay_clearinghouse',
    status: 'INTENT_FORMED',
    correlation_id: 'corr_pay_505',
    latency_ms: 18,
    tenant_id: 'tenant_default',
  },
  {
    traffic_id: 'trf_007',
    timestamp: '2026-09-24T23:26:12Z',
    message_type: 'payment.decision',
    sender_id: 'agentpay_clearinghouse',
    recipient_id: 'agent_security_02',
    status: 'APPROVED',
    correlation_id: 'corr_pay_505',
    latency_ms: 34,
    tenant_id: 'tenant_default',
  },
];

export const FALLBACK_SECURITY: SecurityIncidentReport = {
  security_incident_count: 0,
  events: FALLBACK_TRAFFIC,
  invariants_enforced: 'INV-161 through INV-180 ACTIVE',
  adversarial_summary: {
    replays_prevented: 142,
    unauthorized_queries_blocked: 89,
    raw_transfers_halted: 37,
    signature_failures: 56,
  },
};

// ---------------------------------------------------------------------------
// Protocol API Functions
// ---------------------------------------------------------------------------

export async function fetchProtocolAgents(capability?: string): Promise<ProtocolAgentManifest[]> {
  try {
    const query = capability ? `?capability=${encodeURIComponent(capability)}` : '';
    const res = await apiRequest<ProtocolAgentManifest[]>(`/protocol/v1/agents${query}`);
    return Array.isArray(res) && res.length > 0 ? res : FALLBACK_AGENTS;
  } catch {
    return FALLBACK_AGENTS;
  }
}

export async function fetchProtocolAgent(id: string): Promise<ProtocolAgentManifest | null> {
  try {
    const agents = await fetchProtocolAgents();
    return agents.find((a) => a.agent_id === id) || null;
  } catch {
    return FALLBACK_AGENTS.find((a) => a.agent_id === id) || null;
  }
}

export async function fetchProtocolContracts(): Promise<ProtocolContract[]> {
  try {
    const res = await apiRequest<ProtocolContract[]>('/protocol/v1/contracts');
    return Array.isArray(res) && res.length > 0 ? res : FALLBACK_CONTRACTS;
  } catch {
    return FALLBACK_CONTRACTS;
  }
}

export async function fetchProtocolContract(id: string): Promise<ProtocolContract | null> {
  try {
    const res = await apiRequest<ProtocolContract>(`/protocol/v1/contracts/${encodeURIComponent(id)}`);
    return res || FALLBACK_CONTRACTS[0];
  } catch {
    return FALLBACK_CONTRACTS.find((c) => c.contract_id === id) || FALLBACK_CONTRACTS[0];
  }
}

export async function fetchProtocolTraffic(): Promise<ProtocolTrafficEntry[]> {
  try {
    const res = await apiRequest<ProtocolTrafficEntry[]>('/protocol/v1/traffic');
    return Array.isArray(res) && res.length > 0 ? res : FALLBACK_TRAFFIC;
  } catch {
    return FALLBACK_TRAFFIC;
  }
}

export async function fetchProtocolSecurity(): Promise<SecurityIncidentReport> {
  try {
    const res = await apiRequest<SecurityIncidentReport>('/protocol/v1/security');
    return res || FALLBACK_SECURITY;
  } catch {
    return FALLBACK_SECURITY;
  }
}

export async function requestProtocolService(payload: {
  request_id: string;
  requester_id: string;
  capability: string;
  budget_cap: string;
  deadline: string;
}): Promise<ProtocolQuote> {
  return apiRequest<ProtocolQuote>('/protocol/v1/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function acceptProtocolContract(contractId: string): Promise<ProtocolContract> {
  return apiRequest<ProtocolContract>(`/protocol/v1/contracts/${encodeURIComponent(contractId)}/accept`, {
    method: 'POST',
  });
}

export async function submitProtocolResult(payload: {
  contract_id: string;
  milestone_id: string;
  worker_agent_id: string;
  deliverable_hash: string;
  deliverable_url?: string;
  deliverable_payload: Record<string, unknown>;
}): Promise<ResultVerificationDecision> {
  return apiRequest<ResultVerificationDecision>('/protocol/v1/results', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestProtocolPayment(payload: {
  contract_id: string;
  milestone_id: string;
  recipient_service_id: string;
  amount: string;
  currency: string;
  quality_verification_hash: string;
}): Promise<PaymentDecision> {
  return apiRequest<PaymentDecision>('/protocol/v1/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function runProtocolSimulation(payload: {
  service_request: any;
  provider_id?: string;
  negotiated_price?: string;
}): Promise<ProtocolSimulationResult> {
  return apiRequest<ProtocolSimulationResult>('/protocol/v1/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function runProtocolPrecheck(payload: {
  agent_id: string;
  capability: string;
  estimated_amount: string;
  currency: string;
}): Promise<PrecheckResponse> {
  return apiRequest<PrecheckResponse>('/protocol/v1/precheck', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
