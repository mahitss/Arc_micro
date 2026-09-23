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

/**
 * Multi-Agent Swarm Orchestration Types (Phase 30)
 */

export type SwarmStatus =
  | 'CREATED'
  | 'PLANNING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type AgentRole =
  | 'ORCHESTRATOR'
  | 'RESEARCHER'
  | 'DATA_PROVIDER'
  | 'ANALYST'
  | 'VERIFIER'
  | 'CRITIC'
  | 'SYNTHESIZER';

export type TaskStatus =
  | 'PENDING'
  | 'READY'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'SKIPPED';

export interface CriticFeedback {
  task_id: string;
  critic_agent_id: string;
  score: number;
  feedback: string;
  passed: boolean;
  reviewed_at: string;
}

export interface ConsensusValidation {
  task_id: string;
  verifier_count: number;
  approval_count: number;
  rejection_count: number;
  consensus_reached: boolean;
  confidence: number;
  completed_at: string;
}

export interface SwarmCostIntelligence {
  total_budget: string;
  allocated_budget: string;
  committed_spend: string;
  active_reservations: string;
  unallocated_budget: string;
  budget_utilization_pct: number;
  projected_final_cost: string;
  cost_variance: string;
  is_over_budget_risk: boolean;
}

export interface SwarmRiskScore {
  overall_score: number;
  risk_level: string;
  budget_exhaustion_risk: number;
  dependency_bottleneck_risk: number;
  agent_reliability_risk: number;
  data_tampering_risk: number;
  recommendations: string[];
  evaluated_at: string;
}

export interface TaskNode {
  id: string;
  swarm_id: string;
  mission_id: string;
  title: string;
  role: AgentRole;
  required_capability: string;
  dependencies: string[];
  status: TaskStatus;
  assigned_agent_id?: string;
  assigned_service_id?: string;
  budget: string;
  actual_cost: string;
  depth: number;
  input_payload?: Record<string, unknown>;
  output_payload?: Record<string, unknown>;
  output_checksum?: string;
  critic_feedback?: CriticFeedback;
  consensus_validation?: ConsensusValidation;
  hire_id?: string;
  payment_id?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Swarm {
  id: string;
  organization_id: string;
  root_mission_id: string;
  name: string;
  objective: string;
  status: SwarmStatus;
  max_budget: string;
  total_spent: string;
  total_reserved: string;
  asset: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  task_count: number;
  completed_tasks: number;
  failed_tasks: number;
  orchestrator_agent_id: string;
  risk_score?: SwarmRiskScore;
  cost_intelligence?: SwarmCostIntelligence;
  tasks?: TaskNode[];
}

export interface SwarmGraphNode {
  id: string;
  type: string;
  label: string;
  role?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface SwarmGraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface SwarmGraph {
  nodes: SwarmGraphNode[];
  edges: SwarmGraphEdge[];
  depth: number;
  is_dag: boolean;
}

export interface SwarmTraceEvent {
  event_type: string;
  task_id?: string;
  agent_id?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface SwarmTrace {
  swarm_id: string;
  events: SwarmTraceEvent[];
}

export interface TaskNodeInput {
  title: string;
  role: AgentRole;
  required_capability: string;
  dependencies?: string[];
  budget: string;
  input_payload?: Record<string, unknown>;
}

export interface CreateSwarmRequest {
  name: string;
  objective: string;
  max_budget: string;
  asset?: string;
  deadline?: string;
  organization_id?: string;
  orchestrator_agent_id?: string;
  tasks?: TaskNodeInput[];
}

export interface SimulateSwarmResponse {
  estimated_cost: string;
  estimated_latency_ms: number;
  task_count: number;
  max_depth: number;
  is_valid_dag: boolean;
  risk_score: SwarmRiskScore;
  tasks: TaskNode[];
}

// ============================================================
// Economic Simulator & Digital Twin Types (Phases 0-33)
// ============================================================

export type SimulationExecutionMode = 'SIMULATION' | 'LIVE';

export type SimulationRunStatus =
  | 'CREATED'
  | 'PLANNING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type FailureInjectionType =
  | 'NO_FAILURE'
  | 'SERVICE_TIMEOUT'
  | 'SERVICE_FAILURE'
  | 'LOW_QUALITY_RESULT'
  | 'QUOTE_EXPIRY'
  | 'PAYMENT_FAILURE'
  | 'HIGH_RISK'
  | 'BUDGET_EXHAUSTION'
  | 'AGENT_UNAVAILABLE'
  | 'MULTIPLE_FAILURES';

export interface SimulationFailureInjection {
  step_id?: string;
  service_id?: string;
  failure_type: FailureInjectionType;
  reason: string;
}

export interface SimulationScenario {
  id?: string;
  name: string;
  objective?: string;
  budget?: string;
  currency?: string;
  deadline_seconds?: number;
  agent_id?: string;
  organization_id?: string;
  is_swarm?: boolean;
  failure_profile?: FailureInjectionType;
  injected_failures?: SimulationFailureInjection[];
  service_constraints?: string[];
  price_multiplier?: number;
  latency_multiplier?: number;
  policy_threshold?: string;
}

export interface SimulationProjectedEconomics {
  projected_spend: string;
  minimum_spend: string;
  maximum_spend: string;
  expected_spend: string;
  remaining_budget: string;
  number_of_payments: number;
  number_of_agents: number;
  number_of_services: number;
  approval_count: number;
  risk_score: number;
  currency: string;
  is_projected: boolean;
}

export interface SimulationWorstCaseExposure {
  maximum_exposure: string;
  budget_ceiling: string;
  per_transaction_limit: string;
  total_steps_planned: number;
  exposure_formula: string;
  explanation: string;
}

export interface SimulationPlanStep {
  step_number: number;
  step_id: string;
  agent_id: string;
  service_id: string;
  service_name: string;
  capability: string;
  estimated_cost: string;
  estimated_duration_ms: number;
  policy_decision: string;
  policy_reason_code: string;
  policy_reason: string;
  risk_level: string;
  risk_factors: string[];
  approval_required: boolean;
  dependencies?: string[];
  explanation: string;
}

export interface SimulationExecutionPlan {
  total_steps: number;
  estimated_cost: string;
  estimated_duration_ms: number;
  max_depth: number;
  steps: SimulationPlanStep[];
}

export interface SimulationTraceEvent {
  event_number: number;
  timestamp: string;
  event_type: string;
  actor: string;
  step_id?: string;
  details: string;
  policy_decision?: string;
  amount?: string;
  is_projected: boolean;
}

export interface SimulationRun {
  id: string;
  organization_id: string;
  created_by: string;
  source_type: string;
  source_id?: string;
  scenario_id: string;
  status: SimulationRunStatus;
  seed: number;
  execution_mode: SimulationExecutionMode;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_ms: number;
  summary: string;
  configuration_version: string;
  snapshot_id?: string;
  snapshot_version?: string;
  scenario: SimulationScenario;
  economics: SimulationProjectedEconomics;
  exposure: SimulationWorstCaseExposure;
  plan: SimulationExecutionPlan;
  trace: SimulationTraceEvent[];
  is_stale?: boolean;
  stale_reason?: string;
}

export interface CounterfactualComparison {
  baseline_run_id: string;
  counterfactual_run_id: string;
  perturbation_description: string;
  baseline_spend: string;
  counterfactual_spend: string;
  delta_spend: string;
  baseline_approvals: number;
  counterfactual_approvals: number;
  delta_approvals: number;
  baseline_duration_ms: number;
  counterfactual_duration_ms: number;
  baseline_completion: SimulationRunStatus;
  counterfactual_completion: SimulationRunStatus;
  risk_change: string;
  explanation: string;
}

export interface CounterfactualResponse {
  comparison: CounterfactualComparison;
  counterfactual_run: SimulationRun;
}

export interface MonteCarloRequest {
  scenario: SimulationScenario;
  snapshot_id?: string;
  base_seed?: number;
  iterations?: number;
}

export interface MonteCarloSummary {
  run_count: number;
  completion_rate: number;
  average_spend: string;
  minimum_spend: string;
  maximum_spend: string;
  p50_spend: string;
  p90_spend: string;
  p95_spend: string;
  avg_duration_ms: number;
  spend_distribution?: number[];
  currency: string;
  model_notice: string;
}

export interface LiveExecutionPayload {
  status: string;
  mode: 'LIVE';
  revalidated: boolean;
  payload: {
    plan_id: string;
    original_run_id: string;
    organization_id: string;
    objective: string;
    fresh_budget: string;
    revalidated_steps: SimulationPlanStep[];
    total_live_cost: string;
    max_live_exposure: string;
    policy_decision: string;
    projected_risk: number;
    requires_approval: boolean;
    mode: 'LIVE';
    prepared_at: string;
  };
}

// -----------------------------------------------------------------------------
// Open Agent Network Types
// -----------------------------------------------------------------------------

export interface AgentManifestPricing {
  capability: string;
  model: 'FIXED' | 'VARIABLE' | 'QUOTE_REQUIRED' | string;
  base_price?: string;
  currency: string;
}

export interface AgentManifestEndpoints {
  task_url: string;
  health_url?: string;
  dispute_url?: string;
}

export interface AgentManifest {
  protocol_version: string;
  agent_id: string;
  organization_id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  pricing: AgentManifestPricing[];
  settlement: string[];
  endpoints: AgentManifestEndpoints;
  trust_metadata?: Record<string, string>;
  created_at?: string;
}

export interface AgentNetworkIdentity {
  agent_id: string;
  organization_id: string;
  display_name: string;
  description: string;
  version: string;
  protocol_version: string;
  capabilities: string[];
  pricing_models: string[];
  currencies: string[];
  settlement_methods: string[];
  availability: string;
  trust_metadata?: Record<string, string>;
  endpoint_metadata?: Record<string, string>;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | string;
  created_at: string;
  updated_at: string;
}

export interface TrustSignal {
  signal: string;
  value: number;
  weight: number;
  impact: number;
  explanation: string;
}

export interface TrustEvaluation {
  agent_id: string;
  trust_score: number; // 0 - 10000 basis points
  confidence: number;
  signals: TrustSignal[];
  warnings?: string[];
  evaluated_at: string;
}

export interface DiscoveredAgent {
  identity: AgentNetworkIdentity;
  trust_evaluation: TrustEvaluation;
  matched_pricing?: AgentManifestPricing;
}

export interface NetworkDiscoveryFilter {
  capability?: string;
  protocol_version?: string;
  pricing_model?: string;
  availability?: string;
  min_trust_score?: number;
  organization_id?: string;
  limit?: number;
}

export interface CandidateRanking {
  agent_id: string;
  display_name: string;
  price_base_units: string;
  utility_score: number;
  price_score: number;
  trust_score: number;
  latency_score: number;
  match_score: number;
  risk_score: number;
  selected: boolean;
  explanation: string;
  warnings?: string[];
}

export interface ExecutionPlanDraft {
  plan_id: string;
  selected_agent_id: string;
  selected_capability: string;
  projected_cost: string;
  currency: string;
  estimated_latency_ms: number;
  rankings: CandidateRanking[];
  selected_ranking: CandidateRanking;
  safety_notice: string;
  created_at: string;
}

export interface AgentServiceContract {
  contract_id: string;
  organization_id: string;
  requester_agent_id: string;
  provider_agent_id: string;
  capability: string;
  mission_id?: string;
  root_mission_id?: string;
  parent_contract_id?: string;
  delegation_depth: number;
  input_spec?: Record<string, unknown>;
  output_spec?: Record<string, unknown>;
  price: string;
  currency: string;
  budget_ceiling: string;
  deadline: string;
  expiration: string;
  verification_policy?: string;
  cancellation_policy?: string;
  dispute_policy?: string;
  payment_terms?: string;
  payment_intent_id?: string;
  quote_id?: string;
  state: 'PROPOSED' | 'NEGOTIATING' | 'ACCEPTED' | 'FUNDED' | 'EXECUTING' | 'RESULT_SUBMITTED' | 'VERIFYING' | 'COMPLETED' | 'DISPUTED' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | string;
  result?: AgentResultPayload;
  error_msg?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface AgentResultPayload {
  contract_id: string;
  provider_agent_id: string;
  output: Record<string, unknown>;
  checksum_sha256: string;
  claimed_cost: string;
  claimed_duration_ms?: number;
  timestamp: string;
}

export interface VerificationReport {
  contract_id: string;
  passed: boolean;
  score_basis_points: number;
  checksum_valid: boolean;
  schema_valid: boolean;
  cost_compliant: boolean;
  deadline_met: boolean;
  reason: string;
  verified_at: string;
}

export interface DisputeRecord {
  dispute_id: string;
  contract_id: string;
  organization_id: string;
  initiator_agent_id: string;
  respondent_agent_id: string;
  reason: string;
  evidence: string;
  state: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_PROVIDER' | 'RESOLVED_REQUESTER' | 'PARTIAL_SETTLEMENT' | 'REFUND_REQUIRED' | 'CLOSED' | string;
  resolution_notes?: string;
  refund_amount: string;
  created_at: string;
  resolved_at?: string;
}

export interface NetworkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Economic Constitution Subsystem Types
 */
export type ConstitutionStatus = 'DRAFT' | 'SIMULATED' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'SUPERSEDED' | 'REVOKED';

export type RuleType = 
  | 'SPENDING_LIMIT'
  | 'RECIPIENT_RULE'
  | 'ASSET_RULE'
  | 'TIME_RULE'
  | 'RISK_RULE'
  | 'APPROVAL_RULE'
  | 'DELEGATION_RULE'
  | 'MISSION_RULE'
  | 'SWARM_RULE'
  | 'HARD_DENY';

export interface SpendingLimitRule {
  max_single_payment?: string;
  daily_budget_limit?: string;
  hourly_velocity_limit?: string;
  max_mission_spend?: string;
  max_swarm_spend?: string;
  max_agent_daily_spend?: string;
  currency: string;
}

export interface RecipientRule {
  allowed_services?: string[];
  blocked_services?: string[];
  allowed_organizations?: string[];
  blocked_organizations?: string[];
  allowed_capabilities?: string[];
  blocked_capabilities?: string[];
  allowed_agents?: string[];
  blocked_agents?: string[];
}

export interface AssetRule {
  allowed_assets: string[];
  default_asset: string;
}

export interface ApprovalRule {
  amount_threshold?: string;
  require_on_new_recipient?: boolean;
  require_on_external_agent?: boolean;
  require_on_high_risk_capability?: boolean;
}

export interface DelegationRule {
  max_delegation_depth: number;
  max_inherited_budget_pct?: number;
  allowed_subcontract_caps?: string[];
  prohibit_unverified_provider?: boolean;
}

export interface RiskRule {
  max_risk_score: number;
  max_risk_level: string;
  max_anomaly_score?: number;
  min_trust_score_bps?: number;
  max_external_agent_risk?: string;
}

export interface HardDenyRule {
  rule_id: string;
  description: string;
  match_condition: string;
  reason_code: string;
}

export interface ConstitutionRule {
  rule_id: string;
  type: RuleType;
  scope: string;
  description: string;
  hard_deny: boolean;
  priority: number;
  spending_limit?: SpendingLimitRule;
  recipient_rule?: RecipientRule;
  asset_rule?: AssetRule;
  risk_rule?: RiskRule;
  approval_rule?: ApprovalRule;
  delegation_rule?: DelegationRule;
  hard_deny_rule?: HardDenyRule;
}

export interface EconomicConstitution {
  constitution_id: string;
  organization_id: string;
  name: string;
  description: string;
  version: number;
  status: ConstitutionStatus;
  effective_at?: string;
  created_at: string;
  created_by: string;
  previous_version: number;
  policy_hash: string;
  rules: ConstitutionRule[];
  hard_deny_rules?: HardDenyRule[];
  metadata?: Record<string, string>;
}

export interface ConstitutionDecision {
  constitution_id: string;
  version: number;
  decision: 'ALLOW' | 'DENY' | 'APPROVAL_REQUIRED' | string;
  reason_code: string;
  reason: string;
  matched_rules: string[];
  denied_rules: string[];
  approval_rules: string[];
  explanation: string;
  evaluation_hash: string;
  evaluated_at: string;
}

export interface AuthorityDelta {
  spending_delta: string;
  recipient_delta: string;
  delegation_delta: string;
  risk_tolerance_delta: string;
  approval_delta: string;
  classification: 'MORE_RESTRICTIVE' | 'UNCHANGED' | 'MORE_PERMISSIVE' | string;
  explanation: string;
}

export interface RuleModification {
  rule_id: string;
  type: RuleType;
  description: string;
  old_details: string;
  new_details: string;
  change_type: string;
}

export interface PolicyDiff {
  old_version: number;
  new_version: number;
  added_rules: ConstitutionRule[];
  removed_rules: ConstitutionRule[];
  modified_rules: RuleModification[];
  unchanged_rules: ConstitutionRule[];
  authority_delta: AuthorityDelta;
}

export interface PolicyChangeRequest {
  request_id: string;
  organization_id: string;
  current_version: number;
  proposed_version: number;
  proposed_constitution: EconomicConstitution;
  authority_delta: AuthorityDelta;
  risk_summary: string;
  proposer: string;
  reviewer?: string;
  approver?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  approved_at?: string;
  activated_at?: string;
}

export interface PolicyTestCase {
  name: string;
  description?: string;
  context: Record<string, unknown>;
  expected_decision: string;
  expected_reason_code?: string;
  expected_rules?: string[];
}

export interface PolicyTestReport {
  constitution_id: string;
  version: number;
  passed: boolean;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  failures?: string[];
  duration_ms: number;
  executed_at: string;
}



