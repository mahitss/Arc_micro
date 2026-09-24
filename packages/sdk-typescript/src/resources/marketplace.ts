import type { AgentPay } from '../client.js';
import type {
  ServiceListing,
  MarketplaceOpportunity,
  CandidateSet,
  MarketplaceMetrics,
  MarketplaceTrustModel,
  MarketplaceHealth,
  CreateListingRequest,
  CreateOpportunityRequest,
  MarketplaceSearchQuery,
  AwardOpportunityRequest,
  MarketplaceSimulationRequest,
  MarketplaceSimulationResult,
  RequestOptions,
} from '../types.js';

/**
 * MarketplaceClient provides the client interface for the AgentPay Autonomous Economic Marketplace (Task 17).
 *
 * CORE PRINCIPLE:
 * THE MARKETPLACE DECIDES WHO MAY PARTICIPATE IN AN OPPORTUNITY.
 * AGENTPAY DECIDES WHETHER VALUE MAY MOVE.
 *
 * Invariants INV-181 through INV-200 are enforced deterministically.
 */
export class MarketplaceClient {
  constructor(private readonly client: AgentPay) {}

  /**
   * Publishes a new service listing to the marketplace (Section 2 & 50).
   */
  async createListing(
    req: CreateListingRequest,
    options?: RequestOptions
  ): Promise<ServiceListing> {
    return this.client.request<ServiceListing>('/api/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(req),
      ...options,
    });
  }

  /**
   * Updates an existing service listing.
   */
  async updateListing(
    listingId: string,
    updates: Partial<ServiceListing>,
    options?: RequestOptions
  ): Promise<ServiceListing> {
    return this.client.request<ServiceListing>(`/api/marketplace/listings/${encodeURIComponent(listingId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      ...options,
    });
  }

  /**
   * Pauses an active listing so it cannot receive new work (INV-188).
   */
  async pauseListing(
    listingId: string,
    options?: RequestOptions
  ): Promise<ServiceListing> {
    return this.client.request<ServiceListing>(`/api/marketplace/listings/${encodeURIComponent(listingId)}/pause`, {
      method: 'POST',
      ...options,
    });
  }

  /**
   * Retrieves a specific service listing by ID.
   */
  async getListing(
    listingId: string,
    options?: RequestOptions
  ): Promise<ServiceListing> {
    return this.client.request<ServiceListing>(`/api/marketplace/listings/${encodeURIComponent(listingId)}`, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Searches service listings based on structured filters (Section 11 & 50).
   */
  async search(
    query?: MarketplaceSearchQuery,
    options?: RequestOptions
  ): Promise<ServiceListing[]> {
    return this.client.request<ServiceListing[]>('/api/marketplace/search', {
      method: 'POST',
      body: JSON.stringify(query || {}),
      ...options,
    });
  }

  /**
   * Creates an authorized work opportunity (Section 5, 6 & 50).
   */
  async createOpportunity(
    req: CreateOpportunityRequest,
    options?: RequestOptions
  ): Promise<MarketplaceOpportunity> {
    return this.client.request<MarketplaceOpportunity>('/api/marketplace/opportunities', {
      method: 'POST',
      body: JSON.stringify(req),
      ...options,
    });
  }

  /**
   * Retrieves an opportunity by ID.
   */
  async getOpportunity(
    opportunityId: string,
    options?: RequestOptions
  ): Promise<MarketplaceOpportunity> {
    return this.client.request<MarketplaceOpportunity>(`/api/marketplace/opportunities/${encodeURIComponent(opportunityId)}`, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Retrieves quotes associated with an opportunity.
   */
  async getQuotes(
    opportunityId: string,
    options?: RequestOptions
  ): Promise<CandidateSet> {
    return this.client.request<CandidateSet>(`/api/marketplace/opportunities/${encodeURIComponent(opportunityId)}/match`, {
      method: 'POST',
      ...options,
    });
  }

  /**
   * Evaluates candidates deterministically using the 9-factor ranking engine (Section 7, 9 & 50).
   */
  async matchProviders(
    opportunityId: string,
    options?: RequestOptions
  ): Promise<CandidateSet> {
    return this.client.request<CandidateSet>(`/api/marketplace/opportunities/${encodeURIComponent(opportunityId)}/match`, {
      method: 'POST',
      ...options,
    });
  }

  /**
   * Awards an opportunity to a winning candidate, creating a binding Contract reference (Section 20, 50).
   * Note: Awarding does NOT authorize financial movement (INV-181).
   */
  async awardProvider(
    opportunityId: string,
    req: AwardOpportunityRequest,
    options?: RequestOptions
  ): Promise<MarketplaceOpportunity> {
    return this.client.request<MarketplaceOpportunity>(`/api/marketplace/opportunities/${encodeURIComponent(opportunityId)}/award`, {
      method: 'POST',
      body: JSON.stringify(req),
      ...options,
    });
  }

  /**
   * Retrieves multi-dimensional empirical trust and performance metrics for an agent (Section 12, 28, 50).
   */
  async getAgentProfile(
    agentId: string,
    options?: RequestOptions
  ): Promise<MarketplaceTrustModel> {
    return this.client.request<MarketplaceTrustModel>(`/api/marketplace/agents/${encodeURIComponent(agentId)}`, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Retrieves contextual performance metrics across capabilities (Section 13, 14, 50).
   */
  async getPerformance(
    agentId: string,
    capabilityId?: string,
    options?: RequestOptions
  ): Promise<MarketplaceMetrics[]> {
    const query = capabilityId ? `?capability=${encodeURIComponent(capabilityId)}` : '';
    return this.client.request<MarketplaceMetrics[]>(`/api/marketplace/agents/${encodeURIComponent(agentId)}/performance${query}`, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Provides a side-by-side read-only comparison across candidate providers (Section 46, 50; INV-193).
   */
  async compareProviders(
    capabilityId: string,
    providerIds: string[],
    options?: RequestOptions
  ): Promise<Record<string, unknown>[]> {
    const query = `?capability=${encodeURIComponent(capabilityId)}&providers=${encodeURIComponent(providerIds.join(','))}`;
    return this.client.request<Record<string, unknown>[]>(`/api/marketplace/compare${query}`, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Retrieves marketplace operational liquidity and health indicators (Section 36).
   */
  async getHealth(options?: RequestOptions): Promise<MarketplaceHealth> {
    return this.client.request<MarketplaceHealth>('/api/marketplace/health', {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Runs counterfactual simulations of market events without mutating production state (Section 39, 40; INV-192).
   */
  async simulate(
    req: MarketplaceSimulationRequest,
    options?: RequestOptions
  ): Promise<MarketplaceSimulationResult> {
    return this.client.request<MarketplaceSimulationResult>('/api/marketplace/simulate', {
      method: 'POST',
      body: JSON.stringify(req),
      ...options,
    });
  }
}
