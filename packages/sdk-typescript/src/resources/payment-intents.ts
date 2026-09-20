import type { AgentPay } from '../client.js';
import type {
  CreatePaymentIntentParams,
  PaymentIntent,
  PaymentIntentDetail,
  RequestOptions,
} from '../types.js';

export class PaymentIntentsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Create a new Payment Intent.
   *
   * The backend resolves the approved recipient, evaluates spending policies and risk,
   * and marks the intent as AUTHORIZED, APPROVAL_REQUIRED, or DENIED.
   *
   * Use options.idempotencyKey to guarantee exactly-once payment creation across retries.
   */
  async create(
    params: CreatePaymentIntentParams,
    options?: RequestOptions
  ): Promise<PaymentIntent> {
    const payload = {
      agent_id: params.agentId,
      service: params.service,
      amount: params.amount,
      asset: params.asset || 'USDC',
      purpose: params.purpose,
      justification: params.justification,
      vault_address: params.vaultAddress,
    };

    return this.client.request<PaymentIntent>(
      '/v1/payment-intents',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      options
    );
  }

  /**
   * Retrieve a Payment Intent by its ID.
   */
  async get(id: string, options?: RequestOptions): Promise<PaymentIntentDetail> {
    return this.client.request<PaymentIntentDetail>(
      `/v1/payment-intents/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * List Payment Intents for the authenticated organization.
   */
  async list(
    filter?: { status?: string },
    options?: RequestOptions
  ): Promise<PaymentIntent[]> {
    const query = filter?.status ? `?status=${encodeURIComponent(filter.status)}` : '';
    const res = await this.client.request<{ payment_intents: PaymentIntent[] }>(
      `/v1/payment-intents${query}`,
      { method: 'GET' },
      options
    );
    return res.payment_intents || [];
  }

  /**
   * Confirm and execute an authorized or approved Payment Intent on Arc.
   */
  async confirm(
    id: string,
    options?: RequestOptions
  ): Promise<{ intent: PaymentIntent; execution: unknown }> {
    return this.client.request<{ intent: PaymentIntent; execution: unknown }>(
      `/v1/payment-intents/${encodeURIComponent(id)}/confirm`,
      { method: 'POST' },
      options
    );
  }
}
