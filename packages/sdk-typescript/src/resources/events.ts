import type { AgentPay } from '../client.js';
import type { DomainEvent, ListEventsFilter, RequestOptions } from '../types.js';

export class EventsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Query the immutable audit and domain event log.
   *
   * Supports filtering by event type, payment intent ID, agent ID, and limit.
   * All queries are strictly scoped to the authenticated organization.
   */
  async list<T = Record<string, unknown>>(
    filter?: ListEventsFilter,
    options?: RequestOptions
  ): Promise<DomainEvent<T>[]> {
    const params = new URLSearchParams();
    if (filter?.eventType) params.set('event_type', filter.eventType);
    if (filter?.paymentIntentId) params.set('payment_intent_id', filter.paymentIntentId);
    if (filter?.agentId) params.set('agent_id', filter.agentId);
    if (filter?.limit) params.set('limit', String(filter.limit));

    const qs = params.toString();
    const path = `/v1/events${qs ? `?${qs}` : ''}`;

    const res = await this.client.request<{ events: DomainEvent<T>[] }>(
      path,
      { method: 'GET' },
      options
    );
    return res.events || [];
  }

  /**
   * Retrieve a specific immutable domain event by its ID.
   */
  async get<T = Record<string, unknown>>(
    id: string,
    options?: RequestOptions
  ): Promise<DomainEvent<T>> {
    return this.client.request<DomainEvent<T>>(
      `/v1/events/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }
}
