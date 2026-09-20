import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AgentPay } from '../client.js';
import type {
  CreateWebhookEndpointParams,
  CreateWebhookEndpointResponse,
  RequestOptions,
  UpdateWebhookEndpointParams,
  WebhookDelivery,
  WebhookEndpoint,
} from '../types.js';

export class WebhooksResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Register a new webhook endpoint to receive real-time domain events.
   *
   * The returned response contains the signing secret (`whsec_...`), which is displayed
   * ONLY ONCE. Store it securely to verify HMAC-SHA256 signatures on incoming deliveries.
   */
  async create(
    params: CreateWebhookEndpointParams,
    options?: RequestOptions
  ): Promise<CreateWebhookEndpointResponse> {
    const payload = {
      url: params.url,
      description: params.description,
      subscribed_events: params.subscribedEvents || ['*'],
    };

    return this.client.request<CreateWebhookEndpointResponse>(
      '/v1/webhooks',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      options
    );
  }

  /**
   * List registered webhook endpoints for the authenticated organization.
   * Note: Secrets and secret hashes are never returned.
   */
  async list(options?: RequestOptions): Promise<WebhookEndpoint[]> {
    const res = await this.client.request<{ endpoints: WebhookEndpoint[] }>(
      '/v1/webhooks',
      { method: 'GET' },
      options
    );
    return res.endpoints || [];
  }

  /**
   * Retrieve details of a specific webhook endpoint.
   */
  async get(id: string, options?: RequestOptions): Promise<WebhookEndpoint> {
    return this.client.request<WebhookEndpoint>(
      `/v1/webhooks/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Update configuration or subscribed event types for a webhook endpoint.
   */
  async update(
    id: string,
    params: UpdateWebhookEndpointParams,
    options?: RequestOptions
  ): Promise<WebhookEndpoint> {
    const payload: Record<string, unknown> = {};
    if (params.url !== undefined) payload.url = params.url;
    if (params.description !== undefined) payload.description = params.description;
    if (params.subscribedEvents !== undefined) payload.subscribed_events = params.subscribedEvents;
    if (params.enabled !== undefined) payload.enabled = params.enabled;

    return this.client.request<WebhookEndpoint>(
      `/v1/webhooks/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      options
    );
  }

  /**
   * Permanently delete a webhook endpoint and stop all event deliveries.
   */
  async delete(id: string, options?: RequestOptions): Promise<{ deleted: boolean; id: string }> {
    return this.client.request<{ deleted: boolean; id: string }>(
      `/v1/webhooks/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      options
    );
  }

  /**
   * List delivery history, HTTP status codes, and latency for a webhook endpoint.
   */
  async listDeliveries(
    id: string,
    filter?: { limit?: number },
    options?: RequestOptions
  ): Promise<WebhookDelivery[]> {
    const query = filter?.limit ? `?limit=${encodeURIComponent(filter.limit)}` : '';
    const res = await this.client.request<{ deliveries: WebhookDelivery[] }>(
      `/v1/webhooks/${encodeURIComponent(id)}/deliveries${query}`,
      { method: 'GET' },
      options
    );
    return res.deliveries || [];
  }

  /**
   * Send a synthetic `test.ping` event to the endpoint to test integration.
   * Does NOT trigger any financial movements or payment executions.
   */
  async test(
    id: string,
    options?: RequestOptions
  ): Promise<{ status: string; delivery: WebhookDelivery; message: string }> {
    return this.client.request<{ status: string; delivery: WebhookDelivery; message: string }>(
      `/v1/webhooks/${encodeURIComponent(id)}/test`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Verify an incoming webhook signature using HMAC-SHA256 with replay attack protection.
   *
   * @param payload - Raw request body (string or Buffer)
   * @param signatureHeader - Value of the `AgentPay-Signature` or `X-AgentPay-Signature` header
   * @param secret - The endpoint signing secret (`whsec_...`)
   * @param toleranceSeconds - Maximum allowed age of the signature in seconds (default: 300 = 5 minutes)
   */
  verifySignature(
    payload: string | Buffer,
    signatureHeader: string,
    secret: string,
    toleranceSeconds: number = 300
  ): boolean {
    if (!signatureHeader || !secret) {
      return false;
    }

    const parts = signatureHeader.split(',');
    let timestamp = 0;
    let signature = '';

    for (const part of parts) {
      const [key, val] = part.trim().split('=');
      if (key === 't') {
        timestamp = parseInt(val, 10);
      } else if (key === 'v1') {
        signature = val;
      }
    }

    if (!timestamp || !signature) {
      return false;
    }

    // Check replay tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return false;
    }

    // Compute expected signature: HMAC-SHA256(secret, timestamp + "." + payload)
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8');
    const canonical = `${timestamp}.${payloadStr}`;
    const expectedSig = createHmac('sha256', secret).update(canonical).digest('hex');

    try {
      const sigBuf = Buffer.from(signature, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }
}
