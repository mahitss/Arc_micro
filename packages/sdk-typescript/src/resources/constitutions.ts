import type { AgentPay } from '../client.js';
import type {
  RequestOptions,
  EconomicConstitution,
  ConstitutionDecision,
  PolicyDiff,
  PolicyChangeRequest,
  PolicyTestCase,
  PolicyTestReport,
} from '../types.js';

export class ConstitutionsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Retrieve the currently active Economic Constitution for the authenticated organization.
   */
  async getActive(options?: RequestOptions): Promise<{ constitution: EconomicConstitution }> {
    return this.client.request<{ constitution: EconomicConstitution }>('/v1/constitutions/active', {
      method: 'GET',
      ...options,
    });
  }

  /**
   * List all versions of the Economic Constitution for the organization.
   */
  async list(options?: RequestOptions): Promise<{ constitutions: EconomicConstitution[]; count: number }> {
    return this.client.request<{ constitutions: EconomicConstitution[]; count: number }>('/v1/constitutions', {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Get a specific historical version of the Economic Constitution.
   */
  async get(version: number, options?: RequestOptions): Promise<{ constitution: EconomicConstitution }> {
    return this.client.request<{ constitution: EconomicConstitution }>(`/v1/constitutions/${version}`, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Propose a new draft revision of the Economic Constitution.
   */
  async propose(
    candidate: Partial<EconomicConstitution>,
    proposer = 'operator',
    options?: RequestOptions
  ): Promise<{ change_request: PolicyChangeRequest }> {
    return this.client.request<{ change_request: PolicyChangeRequest }>('/v1/constitutions', {
      method: 'POST',
      body: JSON.stringify({ candidate, proposer }),
      ...options,
    });
  }

  /**
   * Deterministically evaluate an action against the active Economic Constitution with zero state side-effects.
   */
  async evaluate(
    context: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<{ decision: ConstitutionDecision }> {
    return this.client.request<{ decision: ConstitutionDecision }>('/v1/constitutions/evaluate', {
      method: 'POST',
      body: JSON.stringify(context),
      ...options,
    });
  }

  /**
   * Compute structural diff and quantitative authority delta between two constitution versions.
   */
  async diff(
    oldVersion: number,
    newVersion: number,
    options?: RequestOptions
  ): Promise<{ diff: PolicyDiff }> {
    return this.client.request<{ diff: PolicyDiff }>('/v1/constitutions/diff', {
      method: 'POST',
      body: JSON.stringify({ old_version: oldVersion, new_version: newVersion }),
      ...options,
    });
  }

  /**
   * Run automated test cases against a specified constitution version.
   */
  async test(
    version: number,
    testCases: PolicyTestCase[],
    options?: RequestOptions
  ): Promise<{ report: PolicyTestReport }> {
    return this.client.request<{ report: PolicyTestReport }>('/v1/constitutions/test', {
      method: 'POST',
      body: JSON.stringify({ version, test_cases: testCases }),
      ...options,
    });
  }

  /**
   * Atomically activate an approved policy change request (CAS activation).
   */
  async activate(
    changeRequestId: string,
    approver = 'security_lead',
    options?: RequestOptions
  ): Promise<{ status: string; constitution: EconomicConstitution }> {
    return this.client.request<{ status: string; constitution: EconomicConstitution }>('/v1/constitutions/activate', {
      method: 'POST',
      body: JSON.stringify({ change_request_id: changeRequestId, approver }),
      ...options,
    });
  }

  /**
   * Rollback the active constitution to a prior valid version.
   */
  async rollback(
    targetVersion: number,
    actor = 'security_admin',
    options?: RequestOptions
  ): Promise<{ status: string; constitution: EconomicConstitution }> {
    return this.client.request<{ status: string; constitution: EconomicConstitution }>('/v1/constitutions/rollback', {
      method: 'POST',
      body: JSON.stringify({ target_version: targetVersion, actor }),
      ...options,
    });
  }

  /**
   * List all policy change requests for the organization.
   */
  async listChanges(options?: RequestOptions): Promise<{ change_requests: PolicyChangeRequest[]; count: number }> {
    return this.client.request<{ change_requests: PolicyChangeRequest[]; count: number }>('/v1/constitutions/changes', {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Submit governance review (approve or reject) for a policy change request.
   */
  async reviewChange(
    changeRequestId: string,
    approve: boolean,
    reviewer = 'governance_reviewer',
    notes = '',
    options?: RequestOptions
  ): Promise<{ change_request: PolicyChangeRequest }> {
    return this.client.request<{ change_request: PolicyChangeRequest }>(`/v1/constitutions/changes/${changeRequestId}/review`, {
      method: 'POST',
      body: JSON.stringify({ approve, reviewer, notes }),
      ...options,
    });
  }
}
