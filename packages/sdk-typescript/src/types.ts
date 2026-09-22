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
 * Options for polling payment completion.
 */
export interface WaitForCompletionOptions {
  /**
   * Maximum time to wait in milliseconds before timing out (default: 30,000ms).
   */
  timeoutMs?: number;

  /**
   * Polling interval in milliseconds between status checks (default: 1,000ms).
   */
  intervalMs?: number;

  /**
   * Optional custom request options passed to underlying get calls.
   */
  requestOptions?: RequestOptions;
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
 *
 * NOTE ON AMOUNTS:
 * Monetary amounts are represented as strings in base units (micro-units for USDC: 6 decimals).
 * Example: "1000000" = 1.00 USDC, "2500000" = 2.50 USDC.
 * NEVER use JavaScript floating-point numbers for financial amounts.
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
  service?: string;
  serviceId?: string;
  quoteId?: string;
  /**
   * Amount in base units as a string (e.g. "2500000" for 2.50 USDC).
   */
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
  category?: 'RESEARCH' | 'DATA' | 'COMPUTE' | 'ORACLE' | 'AI_MODELS' | string;
  description?: string;
  pricing_model?: 'FIXED' | 'VARIABLE' | 'QUOTE_REQUIRED' | string;
  trust_status?: 'TRUSTED' | 'VERIFIED' | 'UNVERIFIED' | 'DISABLED' | string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Filter options for querying the Service Marketplace.
 */
export interface ServiceFilter {
  category?: string;
  asset?: string;
  trustStatus?: string;
  enabled?: boolean;
}

/**
 * Time-bound service price quote.
 */
export interface ServiceQuote {
  quote_id: string;
  service_id: string;
  amount: string;
  asset: string;
  expires_at: string;
}

/**
 * Read-only agent financial context and budget limits.
 */
export interface AgentBudget {
  agent_id: string;
  daily_limit: string;
  daily_spent: string;
  remaining_daily_limit: string;
  payment_limit: string;
  available_budget: string;
}

/**
 * Input parameters for executing a dry-run financial simulation.
 */
export interface SimulationRequest {
  agent_id: string;
  service_id: string;
  amount: string;
  asset?: string;
  purpose?: string;
  quote_id?: string;
}

/**
 * Predicted financial outcome of a dry-run simulation.
 */
export interface SimulationResponse {
  simulation_id: string;
  predicted_outcome: 'WOULD_EXECUTE' | 'APPROVAL_REQUIRED' | 'WOULD_DENY' | 'INSUFFICIENT_TREASURY' | string;
  policy_decision: string;
  risk_level: string;
  approval_required: boolean;
  treasury_sufficient: boolean;
  reason?: string;
  evaluated_at: string;
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

/**
 * Webhook Endpoint registration.
 */
export interface WebhookEndpoint {
  id: string;
  organization_id: string;
  url: string;
  description: string;
  subscribed_events: string[];
  enabled: boolean;
  failure_count: number;
  last_delivery_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Parameters for creating a Webhook Endpoint.
 */
export interface CreateWebhookEndpointParams {
  url: string;
  description?: string;
  subscribedEvents?: string[];
}

/**
 * Response for creating a Webhook Endpoint containing the one-time secret.
 */
export interface CreateWebhookEndpointResponse {
  id: string;
  organization_id: string;
  url: string;
  description: string;
  subscribed_events: string[];
  enabled: boolean;
  secret: string; // Shown ONLY ONCE
  created_at: string;
  warning: string;
}

/**
 * Parameters for updating a Webhook Endpoint.
 */
export interface UpdateWebhookEndpointParams {
  url?: string;
  description?: string;
  subscribedEvents?: string[];
  enabled?: boolean;
}

/**
 * Webhook delivery tracking attempt.
 */
export interface WebhookDelivery {
  id: string;
  organization_id: string;
  endpoint_id: string;
  event_id: string;
  event_type: string;
  status: 'PENDING' | 'DELIVERING' | 'DELIVERED' | 'RETRYING' | 'FAILED' | string;
  http_status?: number;
  request_payload: string;
  response_body?: string;
  error_message?: string;
  attempt_count: number;
  max_attempts: number;
  next_retry_at?: string;
  latency_ms?: number;
  delivered_at?: string;
  created_at: string;
}

/**
 * Canonical Domain Event envelope.
 */
export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  version: number;
  occurred_at: string;
  organization_id: string;
  actor_type: string;
  actor_id: string;
  agent_id?: string;
  payment_intent_id?: string;
  execution_id?: string;
  approval_id?: string;
  transaction_id?: string;
  request_id: string;
  correlation_id: string;
  causation_id?: string;
  data: T;
}

/**
 * Query filter for listing events.
 */
export interface ListEventsFilter {
  eventType?: string;
  paymentIntentId?: string;
  agentId?: string;
  limit?: number;
}

/**
 * Formalized Agent Tool Contract: Input for requesting payment.
 */
export interface RequestPaymentInput {
  service_id: string;
  /**
   * Amount in base units (e.g. "2500000" for 2.50 USDC).
   */
  amount: string;
  asset?: string;
  purpose: string;
  justification?: string;
  idempotency_key?: string;
}

/**
 * Actionable next step returned to the AI agent.
 */
export type PaymentNextAction =
  | 'CONTINUE'
  | 'WAIT_FOR_APPROVAL'
  | 'WAIT_FOR_EXECUTION'
  | 'HANDLE_DENIAL'
  | 'HANDLE_FAILURE';

/**
 * Formalized Agent Tool Contract: Structured result returned to the AI agent.
 */
export interface RequestPaymentResult {
  payment_intent_id: string;
  status: string;
  decision: 'ALLOW' | 'APPROVAL_REQUIRED' | 'DENY' | string;
  risk?: string;
  next_action: PaymentNextAction;
  reason?: string;
  tx_hash?: string;
}

/**
 * Execution Mode for Payment Intents.
 */
export type ExecutionMode = 'LIVE' | 'SIMULATION' | string;

/**
 * Individual step recorded in the Financial Flight Recorder trace.
 */
export interface TraceStep {
  step_number: number;
  step_id: string;
  trace_id: string;
  type: string;
  status: string;
  timestamp: string;
  actor: string;
  correlation_id?: string;
  metadata?: Record<string, unknown>;
  reason_codes?: string[];
}

/**
 * Payment summary embedded inside the Financial Flight Recorder trace.
 */
export interface PaymentSummary {
  intent_id: string;
  organization_id: string;
  agent_id: string;
  service_id: string;
  recipient: string;
  amount: string;
  asset: string;
  purpose: string;
  justification?: string;
  request_id?: string;
}

/**
 * Policy evaluation audit evidence.
 */
export interface PolicyEvidence {
  policy_id?: string;
  policy_version?: string;
  decision: string;
  reason_code: string;
  reason?: string;
  risk_level?: string;
  risk_score?: number;
  checks?: Array<Record<string, unknown>>;
  remaining_daily_limit?: number;
  evaluated_at: string;
}

/**
 * Human approval audit evidence.
 */
export interface ApprovalEvidence {
  approval_id: string;
  required: boolean;
  status: string;
  requested_at: string;
  resolved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
}

/**
 * Treasury reservation audit evidence.
 */
export interface TreasuryEvidence {
  reservation_id?: string;
  vault_address: string;
  amount: string;
  asset: string;
  status: string;
  reserved_at: string;
  settled_at?: string;
  released_at?: string;
  release_reason?: string;
}

/**
 * Blockchain settlement proof on Arc.
 */
export interface BlockchainEvidence {
  chain_id: string;
  network: string;
  transaction_hash?: string;
  block_number?: string;
  from?: string;
  to?: string;
  submitted_at?: string;
  confirmed_at?: string;
  status: string;
  explorer_url?: string;
  error_message?: string;
}

/**
 * Deterministic Financial Flight Recorder record for a Payment Intent.
 */
export interface PaymentTrace {
  trace_id: string;
  organization_id: string;
  agent_id: string;
  payment_intent_id: string;
  payment_execution_id?: string;
  status: string;
  execution_mode: ExecutionMode;
  created_at: string;
  updated_at: string;
  steps: TraceStep[];
  payment_summary: PaymentSummary;
  policy_evidence?: PolicyEvidence;
  approval_evidence?: ApprovalEvidence;
  treasury_evidence?: TreasuryEvidence;
  blockchain_evidence?: BlockchainEvidence;
}

