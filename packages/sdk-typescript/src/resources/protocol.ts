import type { AgentPay } from '../client.js';
import type {
  ProtocolMessage,
  ProtocolAgentManifest,
  ServiceRequest,
  ProtocolQuote,
  NegotiationPayload,
  ProtocolContract,
  ResultSubmittedPayload,
  PaymentRequestPayload,
  PaymentDecision,
  ProtocolTrafficEntry,
  ProtocolSimulationRequest,
  ProtocolSimulationResponse,
  PrecheckRequest,
  PrecheckResponse,
  RequestOptions,
} from '../types.js';

/**
 * ProtocolClient provides the client interface for external AI agents
 * participating in the AgentPay Autonomous Economic Protocol (Task 16).
 *
 * CORE PRINCIPLE:
 * ANY AGENT CAN PARTICIPATE IN THE ECONOMY.
 * NO AGENT CAN BECOME THE FINANCIAL AUTHORITY.
 *
 * Invariants INV-161 through INV-180 are enforced deterministically.
 */
export class ProtocolClient {
  constructor(private readonly client: AgentPay) {}

  /**
   * Discover registered agents matching an optional capability filter (Section 6).
   */
  async discoverAgents(
    capability?: string,
    options?: RequestOptions
  ): Promise<ProtocolAgentManifest[]> {
    const query = capability ? `?capability=${encodeURIComponent(capability)}` : '';
    return this.client.request<ProtocolAgentManifest[]>(`/protocol/v1/agents${query}`, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Alias for discoverAgents to query capabilities (Section 6).
   */
  async discoverCapabilities(
    capability?: string,
    options?: RequestOptions
  ): Promise<ProtocolAgentManifest[]> {
    return this.discoverAgents(capability, options);
  }

  /**
   * Request a structured service quote from provider agents (Section 7 & 8).
   * Note: The requester can specify a budget constraint, but cannot authorize
   * spending above existing policy (INV-165).
   */
  async requestService(
    params: ServiceRequest,
    options?: RequestOptions
  ): Promise<ProtocolQuote> {
    return this.client.request<ProtocolQuote>('/protocol/v1/requests', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  }

  /**
   * Request a quote (Section 8).
   */
  async requestQuote(
    params: ServiceRequest,
    options?: RequestOptions
  ): Promise<ProtocolQuote> {
    return this.requestService(params, options);
  }

  /**
   * Negotiate price, deadlines, or scope within economic envelopes (Section 9).
   * Financial terms remain bounded by policy and risk.
   */
  async negotiate(
    params: NegotiationPayload,
    options?: RequestOptions
  ): Promise<NegotiationPayload> {
    return this.client.request<NegotiationPayload>('/protocol/v1/negotiate', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  }

  /**
   * Accept a proposed contract, transitioning it to ACTIVE (Section 10 & 11).
   */
  async acceptContract(
    contractId: string,
    options?: RequestOptions
  ): Promise<ProtocolContract> {
    return this.client.request<ProtocolContract>(
      `/protocol/v1/contracts/${encodeURIComponent(contractId)}/accept`,
      {
        method: 'POST',
        ...options,
      }
    );
  }

  /**
   * Submit an untrusted result deliverable for independent verification (Section 15 & 16).
   * Result submission never directly triggers payment (INV-173).
   */
  async submitResult(
    params: ResultSubmittedPayload,
    options?: RequestOptions
  ): Promise<{
    decision: 'ACCEPT' | 'REJECT' | 'DISPUTE' | 'RETRY' | 'ESCALATE';
    confidence: number;
    reason: string;
    computed_hash: string;
    eligible_for_payment: boolean;
  }> {
    return this.client.request('/protocol/v1/results', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  }

  /**
   * Get authoritative contract details and state (Section 52).
   */
  async getContract(
    contractId: string,
    options?: RequestOptions
  ): Promise<ProtocolContract> {
    return this.client.request<ProtocolContract>(
      `/protocol/v1/contracts/${encodeURIComponent(contractId)}`,
      {
        method: 'GET',
        ...options,
      }
    );
  }

  /**
   * Request milestone payment disbursement (Section 13).
   * Translates into canonical PaymentIntent pipeline.
   */
  async requestPayment(
    params: PaymentRequestPayload,
    options?: RequestOptions
  ): Promise<PaymentDecision> {
    return this.client.request<PaymentDecision>('/protocol/v1/payments', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  }

  /**
   * Get authoritative settlement payment status (Section 53).
   */
  async getPaymentStatus(
    paymentId: string,
    options?: RequestOptions
  ): Promise<{
    payment_id: string;
    status: string;
    asset: string;
    chain: string;
    block_proof?: string;
  }> {
    return this.client.request(
      `/protocol/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        method: 'GET',
        ...options,
      }
    );
  }

  /**
   * Send a signed canonical protocol message through the ProtocolGateway (Section 22).
   */
  async sendMessage<T = unknown, R = unknown>(
    msg: ProtocolMessage<T>,
    options?: RequestOptions
  ): Promise<ProtocolMessage<R>> {
    return this.client.request<ProtocolMessage<R>>('/protocol/v1/messages', {
      method: 'POST',
      body: JSON.stringify(msg),
      ...options,
    });
  }

  /**
   * Run pre-flight digital twin simulation without real payments (Section 50).
   */
  async simulate(
    params: ProtocolSimulationRequest,
    options?: RequestOptions
  ): Promise<ProtocolSimulationResponse> {
    return this.client.request<ProtocolSimulationResponse>('/protocol/v1/simulate', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  }

  /**
   * Read-only precheck for agent eligibility (Section 51).
   */
  async precheck(
    params: PrecheckRequest,
    options?: RequestOptions
  ): Promise<PrecheckResponse> {
    return this.client.request<PrecheckResponse>('/protocol/v1/precheck', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  }

  /**
   * Get protocol traffic telemetry (Section 57).
   */
  async getTraffic(options?: RequestOptions): Promise<ProtocolTrafficEntry[]> {
    return this.client.request<ProtocolTrafficEntry[]>('/protocol/v1/traffic', {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Get protocol security incident logs (Section 58).
   */
  async getSecurityIncidents(options?: RequestOptions): Promise<{
    security_incident_count: number;
    events: ProtocolTrafficEntry[];
    invariants_enforced: string;
  }> {
    return this.client.request('/protocol/v1/security', {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Subscribe to protocol event stream with tenant boundary isolation (Section 26).
   */
  subscribeEvents(
    callback: (event: { event_type: string; payload: unknown; timestamp: string }) => void
  ): () => void {
    // In-process event subscription placeholder
    const listener = (evt: any) => callback(evt);
    return () => {
      // Unsubscribe cleanup
    };
  }
}

export { ProtocolClient as ProtocolResource };
