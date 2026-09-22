import type { AgentPay } from '../client.js';
import { AgentPayError } from '../errors.js';
import type {
  CreatePaymentIntentParams,
  PaymentIntent,
  PaymentIntentDetail,
  PaymentTrace,
  RequestOptions,
  WaitForCompletionOptions,
} from '../types.js';

const TERMINAL_STATUSES = new Set([
  'CONFIRMED',
  'DENIED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
]);

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
      service: params.service || params.serviceId,
      quote_id: params.quoteId,
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
   * Retrieve the deterministic financial flight recorder trace for a payment intent.
   */
  async trace(id: string, options?: RequestOptions): Promise<PaymentTrace> {
    return this.client.request<PaymentTrace>(
      `/v1/payment-intents/${encodeURIComponent(id)}/trace`,
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

  /**
   * Safely poll a Payment Intent until it reaches a terminal status
   * (CONFIRMED, DENIED, FAILED, CANCELLED, EXPIRED) or the timeout expires.
   *
   * @param id The Payment Intent ID to observe.
   * @param options Polling configuration (timeoutMs: default 30000ms, intervalMs: default 1000ms).
   * @returns Detailed Payment Intent information upon reaching terminal state.
   */
  async waitForCompletion(
    id: string,
    options: WaitForCompletionOptions = {}
  ): Promise<PaymentIntentDetail> {
    const timeoutMs = options.timeoutMs ?? 30000;
    const intervalMs = Math.max(options.intervalMs ?? 1000, 200); // Minimum 200ms
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const detail = await this.get(id, options.requestOptions);
      const status = (detail.intent?.status || '').toUpperCase();

      if (TERMINAL_STATUSES.has(status)) {
        return detail;
      }

      const elapsed = Date.now() - startTime;
      const remaining = timeoutMs - elapsed;
      if (remaining <= 0) break;

      await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, remaining)));
    }

    throw new AgentPayError(
      `Payment intent ${id} did not reach a terminal state within ${timeoutMs}ms.`,
      'POLLING_TIMEOUT',
      408
    );
  }
}
