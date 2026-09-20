/**
 * Configuration options for the AgentPay client.
 */
export interface ClientOptions {
  /**
   * Secret API key for authentication (e.g. ap_live_... or apk_live_...).
   * Can also be set via the AGENTPAY_API_KEY environment variable.
   */
  apiKey?: string;

  /**
   * Base URL of the AgentPay Gateway API.
   * Defaults to 'http://localhost:8080' or process.env.AGENTPAY_BASE_URL.
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds (default: 10,000ms).
   */
  timeoutMs?: number;

  /**
   * Custom fetch implementation (optional, defaults to global fetch).
   */
  fetch?: typeof fetch;
}

/**
 * Per-request options.
 */
export interface RequestOptions {
  /**
   * Idempotency key for safe retries without double-charging or duplicate intent creation.
   */
  idempotencyKey?: string;

  /**
   * Timeout in milliseconds for this specific request.
   */
  timeoutMs?: number;

  /**
   * Additional HTTP headers.
   */
  headers?: Record<string, string>;
}

/**
 * Policy & risk decision summary returned by AgentPay.
 */
export interface IntentDecision {
  result: 'ALLOW' | 'APPROVAL_REQUIRED' | 'DENY' | string;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  reason?: string;
}

/**
 * Payment Intent created or retrieved from AgentPay.
 */
export interface PaymentIntent {
  id: string;
  status:
    | 'CREATED'
    | 'AUTHORIZED'
    | 'APPROVAL_REQUIRED'
    | 'APPROVED'
    | 'DENIED'
    | 'EXECUTING'
    | 'SUBMITTED'
    | 'CONFIRMED'
    | 'FAILED'
    | 'EXPIRED'
    | string;
  amount: string;
  asset: string;
  service: string;
  recipient: string;
  purpose?: string;
  agent_id: string;
  organization_id: string;
  decision?: IntentDecision;
  created_at: string;
  expires_at: string;
}

/**
 * Detailed Payment Intent view including lifecycle timestamps and execution status.
 */
export interface PaymentIntentDetail {
  intent: PaymentIntent;
  authorization_status: string;
  execution_status: string;
  transaction_hash?: string;
  timestamps: {
    created_at: string;
    expires_at: string;
    updated_at: string;
    submitted_at?: string;
    confirmed_at?: string;
  };
}

/**
 * Parameters for creating a Payment Intent.
 */
export interface CreatePaymentIntentParams {
  agentId: string;
  service: string;
  amount: string;
  asset?: string; // Default: 'USDC'
  purpose: string;
  justification?: string;
  vaultAddress?: string;
}

/**
 * Registered AI Agent summary.
 */
export interface Agent {
  id: string;
  name: string;
  status: string;
  organization_id?: string;
}

/**
 * Detailed Agent profile including spending policy and limits.
 */
export interface AgentDetail {
  id: string;
  name: string;
  status: string;
  organization_id?: string;
  vault_address: string;
  network: string;
  usdc_balance: string;
  policy: {
    enabled?: boolean;
    per_transaction_limit?: string;
    daily_spending_limit?: string;
    daily_spent?: string;
    remaining_daily_limit?: string;
    max_transactions_per_day?: number;
    transactions_today?: number;
    allowed_recipients?: string[];
    blocked_recipients?: string[];
    [key: string]: unknown;
  };
  created_at: string;
}

/**
 * Registered service provider approved for agent payments.
 */
export interface RegisteredService {
  id: string;
  name: string;
  recipient: string;
  asset: string;
  enabled: boolean;
  max_price: string;
  fixed_price?: string;
}

/**
 * Human approval record.
 */
export interface Approval {
  id: string;
  organization_id: string;
  agent_id: string;
  intent_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | string;
  amount: string;
  asset: string;
  recipient: string;
  service_id: string;
  reason: string;
  created_at: string;
  expires_at: string;
}

/**
 * Correlated blockchain execution transaction record.
 */
export interface TransactionRecord {
  intent_id: string;
  transaction_hash?: string;
  status: string;
  submitted_at?: string;
  confirmed_at?: string;
  error_code?: string;
}
