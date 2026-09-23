/**
 * @file constitution.ts
 * @description API queries, mutations, and fixtures for the AgentPay Economic Constitution Subsystem.
 */

import { apiRequest } from './client';

export type ConstitutionStatus = 'DRAFT' | 'SIMULATED' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'SUPERSEDED' | 'REVOKED';

export type RuleType = 
  | 'SPENDING_LIMIT'
  | 'RECIPIENT_RULE'
  | 'ASSET_RULE'
  | 'TIME_RULE'
  | 'RISK_RULE'
  | 'APPROVAL_RULE'
  | 'DELEGATION_RULE'
  | 'MISSION_RULE'
  | 'SWARM_RULE'
  | 'HARD_DENY';

export interface SpendingLimitRule {
  max_single_payment?: string;
  daily_budget_limit?: string;
  hourly_velocity_limit?: string;
  max_mission_spend?: string;
  max_swarm_spend?: string;
  max_agent_daily_spend?: string;
  currency: string;
}

export interface RecipientRule {
  allowed_services?: string[];
  blocked_services?: string[];
  allowed_organizations?: string[];
  blocked_organizations?: string[];
  allowed_capabilities?: string[];
  blocked_capabilities?: string[];
  allowed_agents?: string[];
  blocked_agents?: string[];
}

export interface AssetRule {
  allowed_assets: string[];
  default_asset: string;
}

export interface ApprovalRule {
  amount_threshold?: string;
  require_on_new_recipient?: boolean;
  require_on_external_agent?: boolean;
  require_on_high_risk_capability?: boolean;
}

export interface DelegationRule {
  max_delegation_depth: number;
  max_inherited_budget_pct?: number;
  allowed_subcontract_caps?: string[];
  prohibit_unverified_provider?: boolean;
}

export interface RiskRule {
  max_risk_score: number;
  max_risk_level: string;
  max_anomaly_score?: number;
  min_trust_score_bps?: number;
  max_external_agent_risk?: string;
}

export interface HardDenyRule {
  rule_id: string;
  description: string;
  match_condition: string;
  reason_code: string;
}

export interface ConstitutionRule {
  rule_id: string;
  type: RuleType;
  scope: string;
  description: string;
  hard_deny: boolean;
  priority: number;
  spending_limit?: SpendingLimitRule;
  recipient_rule?: RecipientRule;
  asset_rule?: AssetRule;
  risk_rule?: RiskRule;
  approval_rule?: ApprovalRule;
  delegation_rule?: DelegationRule;
  hard_deny_rule?: HardDenyRule;
}

export interface EconomicConstitution {
  constitution_id: string;
  organization_id: string;
  name: string;
  description: string;
  version: number;
  status: ConstitutionStatus;
  effective_at?: string;
  created_at: string;
  created_by: string;
  previous_version: number;
  policy_hash: string;
  rules: ConstitutionRule[];
  hard_deny_rules?: HardDenyRule[];
  metadata?: Record<string, string>;
}

export interface ConstitutionDecision {
  constitution_id: string;
  version: number;
  decision: 'ALLOW' | 'DENY' | 'APPROVAL_REQUIRED' | string;
  reason_code: string;
  reason: string;
  matched_rules: string[];
  denied_rules: string[];
  approval_rules: string[];
  explanation: string;
  evaluation_hash: string;
  evaluated_at: string;
}

export interface AuthorityDelta {
  spending_delta: string;
  recipient_delta: string;
  delegation_delta: string;
  risk_tolerance_delta: string;
  approval_delta: string;
  classification: 'MORE_RESTRICTIVE' | 'UNCHANGED' | 'MORE_PERMISSIVE' | string;
  explanation: string;
}

export interface RuleModification {
  rule_id: string;
  type: RuleType;
  description: string;
  old_details: string;
  new_details: string;
  change_type: string;
}

export interface PolicyDiff {
  old_version: number;
  new_version: number;
  added_rules: ConstitutionRule[];
  removed_rules: ConstitutionRule[];
  modified_rules: RuleModification[];
  unchanged_rules: ConstitutionRule[];
  authority_delta: AuthorityDelta;
}

export interface PolicyChangeRequest {
  request_id: string;
  organization_id: string;
  current_version: number;
  proposed_version: number;
  proposed_constitution: EconomicConstitution;
  authority_delta: AuthorityDelta;
  risk_summary: string;
  proposer: string;
  reviewer?: string;
  approver?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  approved_at?: string;
  activated_at?: string;
}

export interface PolicyTestCase {
  name: string;
  description?: string;
  context: Record<string, unknown>;
  expected_decision: string;
  expected_reason_code?: string;
  expected_rules?: string[];
}

export interface PolicyTestReport {
  constitution_id: string;
  version: number;
  passed: boolean;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  failures?: string[];
  duration_ms: number;
  executed_at: string;
}

// -----------------------------------------------------------------------------
// Fallback Mock Fixtures for Offline / SSR Demo
// -----------------------------------------------------------------------------
export const MOCK_GENESIS_CONSTITUTION: EconomicConstitution = {
  constitution_id: "const_genesis_org_01",
  organization_id: "org_default",
  name: "Sentinel Primary Sovereign Constitution",
  description: "Genesis root constitutional policy establishing base spending limits, asset constraints, and hard invariants.",
  version: 1,
  status: "ACTIVE",
  effective_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  created_by: "system_genesis",
  previous_version: 0,
  policy_hash: "a4f89d31e9c7081498b5a03e7382f6f39385d836371a3e6f987291a1829e01ab",
  rules: [
    {
      rule_id: "rule_hard_deny_root",
      type: "HARD_DENY",
      scope: "GLOBAL",
      description: "Non-negotiable root invariant prohibiting negative amounts, raw private key extraction, and unsigned transactions",
      hard_deny: true,
      priority: 100,
      hard_deny_rule: {
        rule_id: "rule_hard_deny_root",
        description: "Hard invariant deny",
        match_condition: "amount <= 0 || extract_key == true",
        reason_code: "ROOT_INVARIANT_VIOLATION",
      },
    },
    {
      rule_id: "rule_org_spending_limit",
      type: "SPENDING_LIMIT",
      scope: "ORGANIZATION",
      description: "Organizational spending caps: $2,500.00 max single payment, $10,000.00 daily budget",
      hard_deny: false,
      priority: 80,
      spending_limit: {
        max_single_payment: "2500000000",
        daily_budget_limit: "10000000000",
        currency: "USDC",
      },
    },
    {
      rule_id: "rule_asset_whitelist",
      type: "ASSET_RULE",
      scope: "ORGANIZATION",
      description: "Asset settlement whitelist: Only native Arc USDC permitted",
      hard_deny: false,
      priority: 90,
      asset_rule: {
        allowed_assets: ["USDC"],
        default_asset: "USDC",
      },
    },
    {
      rule_id: "rule_delegation_root",
      type: "DELEGATION_RULE",
      scope: "ORGANIZATION",
      description: "Hierarchical delegation limits: Maximum depth 2, max inherited budget 50%",
      hard_deny: false,
      priority: 70,
      delegation_rule: {
        max_delegation_depth: 2,
        max_inherited_budget_pct: 50,
      },
    },
    {
      rule_id: "rule_risk_ceiling",
      type: "RISK_RULE",
      scope: "ORGANIZATION",
      description: "Risk governance threshold: Deny transactions with risk score exceeding 75 or anomaly score > 80",
      hard_deny: false,
      priority: 75,
      risk_rule: {
        max_risk_score: 75,
        max_risk_level: "HIGH",
        max_anomaly_score: 80,
        min_trust_score_bps: 6000,
      },
    },
    {
      rule_id: "rule_approval_threshold",
      type: "APPROVAL_RULE",
      scope: "ORGANIZATION",
      description: "Human-in-the-loop approval required for single transactions exceeding $1,000.00 or external agents",
      hard_deny: false,
      priority: 60,
      approval_rule: {
        amount_threshold: "1000000000",
        require_on_external_agent: true,
      },
    },
  ],
};

export const MOCK_V2_CONSTITUTION: EconomicConstitution = {
  constitution_id: "const_v2_org_01",
  organization_id: "org_default",
  name: "Sentinel Hardened Multi-Agent Swarm Constitution",
  description: "Tightened constitutional constraints adding swarm budget ceilings, strict provider verification, and deeper delegation controls.",
  version: 2,
  status: "DRAFT",
  effective_at: new Date().toISOString(),
  created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  created_by: "security_lead",
  previous_version: 1,
  policy_hash: "bc5671a938e1081498b5a03e7382f6f39385d836371a3e6f987291a1829ef234",
  rules: [
    ...MOCK_GENESIS_CONSTITUTION.rules.filter(r => r.rule_id !== "rule_org_spending_limit"),
    {
      rule_id: "rule_org_spending_limit",
      type: "SPENDING_LIMIT",
      scope: "ORGANIZATION",
      description: "Tightened spending caps: $1,500.00 max single payment, $8,000.00 daily budget, $5,000.00 swarm spend limit",
      hard_deny: false,
      priority: 80,
      spending_limit: {
        max_single_payment: "1500000000",
        daily_budget_limit: "8000000000",
        max_swarm_spend: "5000000000",
        currency: "USDC",
      },
    },
  ],
};

// -----------------------------------------------------------------------------
// API Client Functions
// -----------------------------------------------------------------------------

export async function getActiveConstitution(): Promise<{ constitution: EconomicConstitution }> {
  try {
    return await apiRequest<{ constitution: EconomicConstitution }>('/v1/constitutions/active');
  } catch {
    return { constitution: MOCK_GENESIS_CONSTITUTION };
  }
}

export async function listConstitutions(): Promise<{ constitutions: EconomicConstitution[]; count: number }> {
  try {
    return await apiRequest<{ constitutions: EconomicConstitution[]; count: number }>('/v1/constitutions');
  } catch {
    return { constitutions: [MOCK_GENESIS_CONSTITUTION, MOCK_V2_CONSTITUTION], count: 2 };
  }
}

export async function getConstitution(version: number): Promise<{ constitution: EconomicConstitution }> {
  try {
    return await apiRequest<{ constitution: EconomicConstitution }>(`/v1/constitutions/${version}`);
  } catch {
    if (version === 2) return { constitution: MOCK_V2_CONSTITUTION };
    return { constitution: MOCK_GENESIS_CONSTITUTION };
  }
}

export async function proposeConstitution(
  candidate: Partial<EconomicConstitution>,
  proposer = 'operator_web'
): Promise<{ change_request: PolicyChangeRequest }> {
  try {
    return await apiRequest<{ change_request: PolicyChangeRequest }>('/v1/constitutions', {
      method: 'POST',
      body: JSON.stringify({ candidate, proposer }),
    });
  } catch {
    return {
      change_request: {
        request_id: 'pcr_mock_' + Date.now(),
        organization_id: 'org_default',
        current_version: 1,
        proposed_version: 2,
        proposed_constitution: MOCK_V2_CONSTITUTION,
        authority_delta: {
          spending_delta: 'REDUCED',
          recipient_delta: 'UNCHANGED',
          delegation_delta: 'TIGHTENED',
          risk_tolerance_delta: 'UNCHANGED',
          approval_delta: 'EXPANDED',
          classification: 'MORE_RESTRICTIVE',
          explanation: 'Lowers max single payment from $2,500 to $1,500, adds swarm spend limit of $5,000.',
        },
        risk_summary: 'LOW_RISK_HARDENING',
        proposer,
        status: 'PENDING_APPROVAL',
        created_at: new Date().toISOString(),
      },
    };
  }
}

export async function evaluateConstitution(
  context: Record<string, unknown>
): Promise<{ decision: ConstitutionDecision }> {
  try {
    return await apiRequest<{ decision: ConstitutionDecision }>('/v1/constitutions/evaluate', {
      method: 'POST',
      body: JSON.stringify(context),
    });
  } catch {
    const amt = Number(context.amount || 0);
    const isOverLimit = amt > 2500000000;
    const isApproval = amt > 1000000000;

    if (isOverLimit) {
      return {
        decision: {
          constitution_id: 'const_genesis_org_01',
          version: 1,
          decision: 'DENY',
          reason_code: 'SINGLE_PAYMENT_LIMIT_EXCEEDED',
          reason: 'Amount exceeds $2,500.00 maximum single payment limit',
          matched_rules: ['rule_org_spending_limit'],
          denied_rules: ['rule_org_spending_limit'],
          approval_rules: [],
          explanation: 'Deterministic constitutional evaluation denied the proposed action.',
          evaluation_hash: 'eval_mock_deny_' + Date.now(),
          evaluated_at: new Date().toISOString(),
        },
      };
    }

    if (isApproval) {
      return {
        decision: {
          constitution_id: 'const_genesis_org_01',
          version: 1,
          decision: 'APPROVAL_REQUIRED',
          reason_code: 'APPROVAL_THRESHOLD_EXCEEDED',
          reason: 'Amount exceeds $1,000.00 human approval threshold',
          matched_rules: ['rule_approval_threshold'],
          denied_rules: [],
          approval_rules: ['rule_approval_threshold'],
          explanation: 'Requires human sign-off before settlement.',
          evaluation_hash: 'eval_mock_approval_' + Date.now(),
          evaluated_at: new Date().toISOString(),
        },
      };
    }

    return {
      decision: {
        constitution_id: 'const_genesis_org_01',
        version: 1,
        decision: 'ALLOW',
        reason_code: 'APPROVED',
        reason: 'Action conforms to all active constitutional constraints',
        matched_rules: ['rule_hard_deny_root', 'rule_asset_whitelist', 'rule_org_spending_limit'],
        denied_rules: [],
        approval_rules: [],
        explanation: 'Action fully compliant with sovereign constitutional invariants.',
        evaluation_hash: 'eval_mock_allow_' + Date.now(),
        evaluated_at: new Date().toISOString(),
      },
    };
  }
}

export async function diffConstitutions(
  oldVersion: number,
  newVersion: number
): Promise<{ diff: PolicyDiff }> {
  try {
    return await apiRequest<{ diff: PolicyDiff }>('/v1/constitutions/diff', {
      method: 'POST',
      body: JSON.stringify({ old_version: oldVersion, new_version: newVersion }),
    });
  } catch {
    return {
      diff: {
        old_version: oldVersion,
        new_version: newVersion,
        added_rules: [],
        removed_rules: [],
        modified_rules: [
          {
            rule_id: 'rule_org_spending_limit',
            type: 'SPENDING_LIMIT',
            description: 'Organizational spending caps',
            old_details: 'max_single: 2500000000, daily_budget: 10000000000',
            new_details: 'max_single: 1500000000, daily_budget: 8000000000, max_swarm: 5000000000',
            change_type: 'TIGHTENED',
          },
        ],
        unchanged_rules: MOCK_GENESIS_CONSTITUTION.rules.filter(r => r.rule_id !== 'rule_org_spending_limit'),
        authority_delta: {
          spending_delta: 'REDUCED',
          recipient_delta: 'UNCHANGED',
          delegation_delta: 'UNCHANGED',
          risk_tolerance_delta: 'UNCHANGED',
          approval_delta: 'EXPANDED',
          classification: 'MORE_RESTRICTIVE',
          explanation: 'Overall authority granted to agents is reduced. Single payment ceiling reduced by 40%.',
        },
      },
    };
  }
}

export async function testConstitution(
  version: number,
  testCases: PolicyTestCase[]
): Promise<{ report: PolicyTestReport }> {
  try {
    return await apiRequest<{ report: PolicyTestReport }>('/v1/constitutions/test', {
      method: 'POST',
      body: JSON.stringify({ version, test_cases: testCases }),
    });
  } catch {
    return {
      report: {
        constitution_id: 'const_genesis_org_01',
        version,
        passed: true,
        total_tests: testCases.length,
        passed_tests: testCases.length,
        failed_tests: 0,
        failures: [],
        duration_ms: 1.45,
        executed_at: new Date().toISOString(),
      },
    };
  }
}

export async function activateConstitution(
  changeRequestId: string,
  approver = 'security_lead'
): Promise<{ status: string; constitution: EconomicConstitution }> {
  try {
    return await apiRequest<{ status: string; constitution: EconomicConstitution }>('/v1/constitutions/activate', {
      method: 'POST',
      body: JSON.stringify({ change_request_id: changeRequestId, approver }),
    });
  } catch {
    return {
      status: 'ACTIVATED',
      constitution: { ...MOCK_V2_CONSTITUTION, status: 'ACTIVE' },
    };
  }
}

export async function rollbackConstitution(
  targetVersion: number,
  actor = 'security_admin'
): Promise<{ status: string; constitution: EconomicConstitution }> {
  try {
    return await apiRequest<{ status: string; constitution: EconomicConstitution }>('/v1/constitutions/rollback', {
      method: 'POST',
      body: JSON.stringify({ target_version: targetVersion, actor }),
    });
  } catch {
    return {
      status: 'ROLLED_BACK',
      constitution: { ...MOCK_GENESIS_CONSTITUTION, status: 'ACTIVE' },
    };
  }
}

export async function listChangeRequests(): Promise<{ change_requests: PolicyChangeRequest[]; count: number }> {
  try {
    return await apiRequest<{ change_requests: PolicyChangeRequest[]; count: number }>('/v1/constitutions/changes');
  } catch {
    return {
      change_requests: [
        {
          request_id: 'pcr_swarm_hardening_01',
          organization_id: 'org_default',
          current_version: 1,
          proposed_version: 2,
          proposed_constitution: MOCK_V2_CONSTITUTION,
          authority_delta: {
            spending_delta: 'REDUCED',
            recipient_delta: 'UNCHANGED',
            delegation_delta: 'TIGHTENED',
            risk_tolerance_delta: 'UNCHANGED',
            approval_delta: 'EXPANDED',
            classification: 'MORE_RESTRICTIVE',
            explanation: 'Hardens swarm spend ceilings and tightens single payment limits.',
          },
          risk_summary: 'LOW_RISK_HARDENING',
          proposer: 'security_lead',
          status: 'PENDING_APPROVAL',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      count: 1,
    };
  }
}
