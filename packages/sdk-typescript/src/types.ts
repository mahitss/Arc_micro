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

/**
 * Agent-to-Agent Economic Network Types
 */

export interface AgentCapability {
  capability: string;
  version: string;
  name?: string;
  description?: string;
  category?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
}

export interface AgentService {
  agent_id: string;
  service_id: string;
  organization_id: string;
  name: string;
  description: string;
  capabilities: string[];
  structured_capabilities?: AgentCapability[];
  pricing_model: 'FIXED' | 'VARIABLE' | 'QUOTE_REQUIRED' | string;
  base_price: string;
  max_price: string;
  supported_assets: string[];
  availability: 'ONLINE' | 'BUSY' | 'OFFLINE' | string;
  reputation: number;
  success_rate_bps: number;
  average_latency_ms: number;
  risk_profile: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  enabled: boolean;
  verified: boolean;
  trust_metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface AgentDiscoveryFilter {
  capability?: string;
  maxPrice?: string;
  minReputation?: number;
  risk?: string;
  availability?: string;
}

export interface NegotiationProposal {
  round: number;
  proposer_agent_id: string;
  proposed_price: string;
  terms?: Record<string, string>;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | string;
  created_at: string;
}

export type QuoteStatus =
  | 'REQUESTED'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | string;

export interface AgentQuote {
  quote_id: string;
  buyer_agent_id: string;
  seller_agent_id: string;
  service_id: string;
  mission_id?: string;
  price: string;
  asset: string;
  estimated_latency_ms: number;
  quality: number;
  valid_until: string;
  terms?: Record<string, string>;
  status: QuoteStatus;
  negotiation_rounds?: NegotiationProposal[];
  created_at: string;
}

export interface RequestQuoteParams {
  buyer_agent_id: string;
  mission_id?: string;
  proposed_price?: string;
  terms?: Record<string, string>;
}

export interface CounterQuoteParams {
  agent_id: string;
  proposed_price: string;
  terms?: Record<string, string>;
}

export type HireStatus =
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'EXECUTING'
  | 'RESULT_PENDING'
  | 'RESULT_RECEIVED'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | string;

export interface AgentResult {
  hire_id: string;
  status: 'SUCCESS' | 'FAILED' | string;
  result_type: string;
  result: Record<string, unknown>;
  quality: number;
  execution_time_ms: number;
  provider_metadata?: Record<string, string>;
  checksum_sha256: string;
  is_sanitized: boolean;
  created_at: string;
}

export interface Hire {
  id: string;
  organization_id: string;
  buyer_agent_id: string;
  seller_agent_id: string;
  service_id: string;
  capability: string;
  mission_id: string;
  root_mission_id: string;
  parent_hire_id?: string;
  call_depth: number;
  quote_id: string;
  price: string;
  asset: string;
  payment_intent_id?: string;
  expected_result: string;
  status: HireStatus;
  result?: AgentResult;
  error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateHireParams {
  buyer_agent_id: string;
  quote_id: string;
  mission_id: string;
  root_mission_id?: string;
  parent_hire_id?: string;
  expected_result: string;
}

export interface SubmitResultParams {
  result_type: string;
  result: Record<string, unknown>;
  quality?: number;
  execution_time_ms?: number;
  provider_metadata?: Record<string, string>;
}

export type GraphNodeType = 'AGENT' | 'SERVICE' | 'MISSION' | 'HIRE' | 'PAYMENT' | string;
export type GraphEdgeType = 'HIRED' | 'PAID' | 'DEPENDS_ON' | 'PRODUCED' | 'VALIDATED_BY' | string;

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface EconomicGraph {
  mission_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// -----------------------------------------------------------------------------
// Intelligence Layer & Adaptive Replanning Types
// -----------------------------------------------------------------------------

export type PerformanceWindow = 'last_10_jobs' | 'last_24_hours' | 'last_7_days' | 'all_time';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type RecoveryStrategy =
  | 'RETRY_SAME_SERVICE'
  | 'TRY_ALTERNATIVE_SERVICE'
  | 'REDUCE_SCOPE'
  | 'INCREASE_VERIFICATION'
  | 'REQUEST_HUMAN_APPROVAL'
  | 'ABORT_MISSION'
  | string;

export type CircuitBreakerStatus = 'HEALTHY' | 'DEGRADED' | 'TEMPORARILY_UNAVAILABLE' | string;
export type AnomalyType = 'PRICE_ANOMALY' | 'LATENCY_ANOMALY' | 'FAILURE_SPIKE' | 'QUALITY_DROP' | string;

export interface ContextualPerformance {
  capability: string;
  total_jobs: number;
  success_rate_bps: number;
  average_latency_ms: number;
  average_quality_bps: number;
}

export interface ServiceReputation {
  service_id: string;
  organization_id?: string;
  reputation_score: number;
  failure_rate_bps?: number;
  historical_reliability?: string;
  total_requests?: number;
  successful_requests?: number;
  failed_requests?: number;
  updated_at?: string;
}

export interface ServicePerformance {
  service_id: string;
  organization_id: string;
  window: PerformanceWindow;
  success_rate_bps: number;
  failure_rate_bps: number;
  average_price: string;
  price_variance: string;
  average_latency_ms: number;
  latency_variance: number;
  result_quality_bps: number;
  recent_success_rate_bps: number;
  recent_failure_rate_bps: number;
  total_jobs: number;
  total_volume: string;
  last_success?: string;
  last_failure?: string;
  contextual_breakdown?: Record<string, ContextualPerformance>;
  confidence: ConfidenceLevel;
  updated_at: string;
}

export interface AnomalySignal {
  id: string;
  service_id: string;
  organization_id: string;
  anomaly_type: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  baseline_value: string;
  observed_value: string;
  details: string;
  detected_at: string;
}

export interface ServiceAnomaliesResponse {
  service_id: string;
  circuit_breaker_status: CircuitBreakerStatus;
  anomalies: AnomalySignal[];
}

export interface EconomicObservation {
  id: string;
  organization_id: string;
  mission_id: string;
  agent_id: string;
  service_id: string;
  hire_id?: string;
  payment_id?: string;
  event_type: string;
  input_context?: Record<string, unknown>;
  outcome: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | string;
  price: string;
  latency_ms: number;
  quality_score: number;
  risk_score: number;
  success: boolean;
  failure_reason?: string;
  timestamp: string;
  correlation_id: string;
}

export interface ProposedStep {
  step_id: string;
  required_capability: string;
  recommended_service_id: string;
  estimated_cost: string;
  estimated_latency_ms: number;
  strategy: RecoveryStrategy;
  reason: string;
}

export interface ReplanProposal {
  mission_id: string;
  reason: string;
  strategy: RecoveryStrategy;
  proposed_steps: ProposedStep[];
  estimated_cost: string;
  estimated_duration_ms: number;
  confidence: ConfidenceLevel;
  requires_human: boolean;
  explanation: string;
  alternative_services?: string[];
  created_at: string;
}

export interface LearningTraceEntry {
  timestamp: string;
  event: string;
  details: string;
  strategy?: RecoveryStrategy;
  service_id?: string;
  confidence?: ConfidenceLevel;
  cost_delta?: string;
  explanation?: string;
}

export interface MissionIntelligence {
  mission_id: string;
  current_recommendation?: ReplanProposal;
  recovery_attempts: number;
  max_recovery_attempts: number;
  learning_trace: LearningTraceEntry[];
  observations_count: number;
  anomalies_detected?: AnomalySignal[];
  confidence: ConfidenceLevel;
  status: string;
}

export interface MissionRecoveryResponse {
  mission_id: string;
  recovery_attempts: number;
  max_recovery_attempts: number;
  recommendation?: ReplanProposal;
  status: string;
}



