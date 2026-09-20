import type { AgentPay } from '../client.js';
import { NotFoundError } from '../errors.js';
import type { RegisteredService, RequestOptions } from '../types.js';

export class ServicesResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * List all registered external services available for agent procurement.
   */
  async list(options?: RequestOptions): Promise<RegisteredService[]> {
    const res = await this.client.request<{ services: RegisteredService[] }>(
      '/v1/services',
      { method: 'GET' },
      options
    );
    return res.services || [];
  }

  /**
   * Retrieve a specific registered service by ID.
   */
  async get(id: string, options?: RequestOptions): Promise<RegisteredService> {
    const list = await this.list(options);
    const found = list.find((s) => s.id === id);
    if (!found) {
      throw new NotFoundError(`Service '${id}' not found in registry`);
    }
    return found;
  }
}
