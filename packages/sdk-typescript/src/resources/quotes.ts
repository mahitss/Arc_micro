import type { AgentPay } from '../client.js';
import type { AgentQuote, CounterQuoteParams, RequestOptions, RequestQuoteParams } from '../types.js';

export class QuotesResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Request an inter-agent quote from an agent service provider.
   */
  async request(
    serviceId: string,
    params: RequestQuoteParams,
    options?: RequestOptions
  ): Promise<AgentQuote> {
    return this.client.request<AgentQuote>(
      `/v1/agent-services/${encodeURIComponent(serviceId)}/quotes`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Retrieve an existing agent quote by ID.
   */
  async get(id: string, options?: RequestOptions): Promise<AgentQuote> {
    return this.client.request<AgentQuote>(
      `/v1/quotes/${encodeURIComponent(id)}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Propose a counter-offer during automated or structured negotiation (max 3 rounds).
   */
  async counter(
    id: string,
    params: CounterQuoteParams,
    options?: RequestOptions
  ): Promise<AgentQuote> {
    return this.client.request<AgentQuote>(
      `/v1/quotes/${encodeURIComponent(id)}/counter`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Accept an offered or countered quote, finalizing the binding price.
   */
  async accept(id: string, options?: RequestOptions): Promise<AgentQuote> {
    return this.client.request<AgentQuote>(
      `/v1/quotes/${encodeURIComponent(id)}/accept`,
      { method: 'POST' },
      options
    );
  }
}
