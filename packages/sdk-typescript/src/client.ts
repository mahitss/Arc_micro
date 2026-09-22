import {
  AgentPayError,
  ApprovalRequiredError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  ExecutionError,
  InsufficientTreasuryError,
  NetworkError,
  NotFoundError,
  PolicyDeniedError,
  RateLimitedError,
  ValidationError,
} from './errors.js';
import { AgentsResource } from './resources/agents.js';
import { ApprovalsResource } from './resources/approvals.js';
import { EventsResource } from './resources/events.js';
import { HiresResource } from './resources/hires.js';
import { MissionsResource } from './resources/missions.js';
import { PaymentIntentsResource } from './resources/payment-intents.js';
import { QuotesResource } from './resources/quotes.js';
import { ServicesResource } from './resources/services.js';
import { SimulationsResource } from './resources/simulations.js';
import { SwarmsResource } from './resources/swarms.js';
import { TransactionsResource } from './resources/transactions.js';
import { WebhooksResource } from './resources/webhooks.js';
import type { ClientOptions, RequestOptions } from './types.js';

declare const process: { env?: Record<string, string | undefined> } | undefined;

const DEFAULT_BASE_URL = 'http://localhost:8080';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * AgentPay — Programmable Financial Control Plane for AI Agents.
 *
 * Provides typed methods to interact with the AgentPay API, enabling AI agents
 * to procure external services and trigger on-chain USDC payments governed by
 * deterministic spending policies and human approvals.
 *
 * NOTE: The SDK never signs transactions, holds private keys, or directly
 * accesses the on-chain AgentVault.
 */
export class AgentPay {
  public readonly apiKey?: string;
  public readonly baseUrl: string;
  public readonly timeoutMs: number;
  private readonly customFetch?: typeof fetch;

  public readonly agents: AgentsResource;
  public readonly services: ServicesResource;
  public readonly quotes: QuotesResource;
  public readonly hires: HiresResource;
  public readonly missions: MissionsResource;
  public readonly paymentIntents: PaymentIntentsResource;
  public readonly payments: PaymentIntentsResource;
  public readonly approvals: ApprovalsResource;
  public readonly transactions: TransactionsResource;
  public readonly webhooks: WebhooksResource;
  public readonly events: EventsResource;
  public readonly simulations: SimulationsResource;
  public readonly swarms: SwarmsResource;

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env?.AGENTPAY_API_KEY : undefined);
    this.baseUrl = (
      options.baseUrl ||
      (typeof process !== 'undefined' ? process.env?.AGENTPAY_BASE_URL : undefined) ||
      DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.customFetch = options.fetch;

    this.agents = new AgentsResource(this);
    this.services = new ServicesResource(this);
    this.quotes = new QuotesResource(this);
    this.hires = new HiresResource(this);
    this.missions = new MissionsResource(this);
    this.paymentIntents = new PaymentIntentsResource(this);
    this.payments = this.paymentIntents;
    this.approvals = new ApprovalsResource(this);
    this.transactions = new TransactionsResource(this);
    this.webhooks = new WebhooksResource(this);
    this.events = new EventsResource(this);
    this.simulations = new SimulationsResource(this);
    this.swarms = new SwarmsResource(this);
  }

  /**
   * Internal request dispatcher with centralized error handling, request ID propagation,
   * and idempotency support.
   */
  public async request<T>(
    path: string,
    init: RequestInit = {},
    options: RequestOptions = {}
  ): Promise<T> {
    const fetchImpl = this.customFetch || globalThis.fetch;
    if (!fetchImpl) {
      throw new NetworkError('No fetch implementation available in the current environment.');
    }

    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const timeout = options.timeoutMs || this.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    try {
      const response = await fetchImpl(url, {
        ...init,
        headers,
        signal: controller.signal,
      });

      const requestId = response.headers.get('x-request-id') || undefined;

      if (!response.ok) {
        let code = 'UNKNOWN_ERROR';
        let message = `Request failed with status ${response.status}`;
        let details: unknown = undefined;

        try {
          const body = await response.json();
          if (body?.error) {
            code = body.error.code || code;
            message = body.error.message || message;
            details = body.error.details || body.error;
          } else if (body?.message) {
            message = body.message;
          }
        } catch {
          // Non-JSON response body
        }

        // Map to typed error classes
        switch (response.status) {
          case 400:
            if (code === 'POLICY_DENIED' || code === 'PAYMENT_POLICY_DENIED') {
              throw new PolicyDeniedError(message, typeof details === 'string' ? details : undefined, requestId);
            }
            if (code === 'INSUFFICIENT_FUNDS' || code === 'INSUFFICIENT_TREASURY') {
              throw new InsufficientTreasuryError(message, requestId);
            }
            throw new ValidationError(message, details, requestId);
          case 401:
            throw new AuthenticationError(message, requestId);
          case 403:
            throw new AuthorizationError(message, requestId);
          case 404:
            throw new NotFoundError(message, requestId);
          case 409:
            throw new ConflictError(message, requestId);
          case 429:
            throw new RateLimitedError(message, requestId);
          default:
            if (code === 'POLICY_DENIED' || code === 'PAYMENT_POLICY_DENIED') {
              throw new PolicyDeniedError(message, undefined, requestId);
            }
            if (code === 'APPROVAL_REQUIRED') {
              throw new ApprovalRequiredError(message, undefined, requestId);
            }
            if (code === 'EXECUTION_FAILED' || code === 'EXECUTION_ERROR') {
              throw new ExecutionError(message, undefined, requestId);
            }
            throw new AgentPayError(message, code, response.status, requestId, details);
        }
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof AgentPayError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new NetworkError(`Request timed out after ${timeout}ms`, 'TIMEOUT');
      }
      const msg = err instanceof Error ? err.message : 'Network request failed';
      throw new NetworkError(msg);
    } finally {
      clearTimeout(timer);
    }
  }
}
