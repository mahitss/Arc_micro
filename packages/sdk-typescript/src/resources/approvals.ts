import type { AgentPay } from '../client.js';
import type { Approval, PaymentIntent, RequestOptions } from '../types.js';

export class ApprovalsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * List pending and resolved human approvals for the organization.
   */
  async list(options?: RequestOptions): Promise<Approval[]> {
    const res = await this.client.request<{ approvals: Approval[] }>(
      '/v1/approvals',
      { method: 'GET' },
      options
    );
    return res.approvals || [];
  }

  /**
   * Retrieve an approval record by ID.
   */
  async get(id: string, options?: RequestOptions): Promise<Approval> {
    return this.client.request<Approval>(
      `/v1/approvals/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Grant approval for a pending high-value or elevated-risk payment intent.
   */
  async approve(
    id: string,
    options?: RequestOptions
  ): Promise<{ intent: PaymentIntent; approval: Approval }> {
    return this.client.request<{ intent: PaymentIntent; approval: Approval }>(
      `/v1/approvals/${encodeURIComponent(id)}/approve`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Reject a pending payment intent.
   */
  async reject(
    id: string,
    options?: RequestOptions
  ): Promise<{ intent: PaymentIntent; approval: Approval }> {
    return this.client.request<{ intent: PaymentIntent; approval: Approval }>(
      `/v1/approvals/${encodeURIComponent(id)}/reject`,
      { method: 'POST' },
      options
    );
  }
}
