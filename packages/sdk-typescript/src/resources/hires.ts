import type { AgentPay } from '../client.js';
import type { CreateHireParams, Hire, RequestOptions, SubmitResultParams } from '../types.js';

export class HiresResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Create an inter-agent hiring agreement from an accepted quote.
   * Enforces MAX_AGENT_CALL_DEPTH = 3 to prevent infinite nested call loops.
   */
  async create(
    params: CreateHireParams,
    options?: RequestOptions
  ): Promise<Hire> {
    return this.client.request<Hire>(
      '/v1/hires',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Retrieve details and status of an active or completed hire.
   */
  async get(id: string, options?: RequestOptions): Promise<Hire> {
    return this.client.request<Hire>(
      `/v1/hires/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Trigger canonical financial authorization and execution for the hire payment.
   *
   * Routes through the full AgentPay pipeline:
   * PaymentIntent -> Policy Engine -> Risk Engine -> Approval Gate -> Treasury -> Execution Gate -> Signer.
   */
  async executePayment(id: string, options?: RequestOptions): Promise<Hire> {
    return this.client.request<Hire>(
      `/v1/hires/${encodeURIComponent(id)}/pay`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Submit execution result from an untrusted hired peer agent.
   * Scanned for prompt injection and cryptographically hashed (SHA-256).
   */
  async submitResult(
    id: string,
    params: SubmitResultParams,
    options?: RequestOptions
  ): Promise<Hire> {
    return this.client.request<Hire>(
      `/v1/hires/${encodeURIComponent(id)}/results`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Cancel an inter-agent hire agreement and release any reserved treasury funds.
   */
  async cancel(
    id: string,
    reason?: string,
    options?: RequestOptions
  ): Promise<Hire> {
    return this.client.request<Hire>(
      `/v1/hires/${encodeURIComponent(id)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Cancelled by buyer agent' }),
      },
      options
    );
  }
}
