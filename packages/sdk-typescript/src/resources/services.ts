import type { AgentPay } from '../client.js';
import { NotFoundError } from '../errors.js';
import type { RegisteredService, RequestOptions, ServiceFilter, ServiceQuote } from '../types.js';

export class ServicesResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * List registered external services available for agent procurement, with optional filters.
   */
  async list(filter?: ServiceFilter, options?: RequestOptions): Promise<RegisteredService[]> {
    const params = new URLSearchParams();
    if (filter?.category) params.set('category', filter.category);
    if (filter?.asset) params.set('asset', filter.asset);
    if (filter?.trustStatus) params.set('trust_status', filter.trustStatus);
    if (filter?.enabled !== undefined) params.set('enabled', String(filter.enabled));

    const qs = params.toString();
    const path = qs ? `/v1/services?${qs}` : '/v1/services';

    const res = await this.client.request<{ services: RegisteredService[] }>(
      path,
      { method: 'GET' },
      options
    );
    return res.services || [];
  }

  /**
   * Retrieve a specific registered service by ID.
   */
  async get(id: string, options?: RequestOptions): Promise<RegisteredService> {
    const list = await this.list(undefined, options);
    const found = list.find((s) => s.id === id);
    if (!found) {
      throw new NotFoundError(`Service '${id}' not found in registry`);
    }
    return found;
  }

  /**
   * Request a time-bound quote from a registered service.
   */
  async getQuote(
    serviceId: string,
    params?: { amount?: string; asset?: string },
    options?: RequestOptions
  ): Promise<ServiceQuote> {
    return this.client.request<ServiceQuote>(
      `/v1/services/${encodeURIComponent(serviceId)}/quote`,
      {
        method: 'POST',
        body: JSON.stringify(params || {}),
      },
      options
    );
  }
}
