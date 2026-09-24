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

// =============================================================================
// AUTONOMOUS ECONOMIC CLEARINGHOUSE TYPES (TASK 10)
// =============================================================================

export type ClearingExecutionMode = 'REAL' | 'SIMULATION';

export type ObligationStatus =
  | 'PROPOSED'
  | 'AUTHORIZED'
  | 'RESERVED'
  | 'DUE'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'SETTLEMENT_PENDING'
  | 'SETTLED'
  | 'PARTIALLY_SETTLED'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';

export type EscrowStatus =
  | 'CREATED'
  | 'RESERVED'
  | 'PARTIALLY_RELEASED'
  | 'RELEASED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'CANCELLED';

export type MilestoneStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SETTLED'
  | 'DISPUTED';

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'DUE'
  | 'SETTLED'
  | 'PARTIALLY_SETTLED'
  | 'VOID';

export type NettingStatus =
  | 'PROPOSED'
  | 'ELIGIBLE'
  | 'APPROVED'
  | 'EXECUTED'
  | 'REJECTED'
  | 'EXPIRED';

export type BatchStatus =
  | 'OPEN'
  | 'READY'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'PARTIALLY_SETTLED'
  | 'SETTLED'
  | 'FAILED'
  | 'RECONCILING';

export type RefundStatus =
  | 'REQUESTED'
  | 'VALIDATING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'SETTLED';

export type ReconciliationStatus =
  | 'MATCHED'
  | 'MISMATCH'
  | 'PENDING'
  | 'AMBIGUOUS'
  | 'RESOLVED';

export interface EconomicObligation {
  obligation_id: string;
  organization_id: string;
  payer_agent_id: string;
  payee_agent_id: string;
  contract_id: string;
  capability?: string;
  amount: string; // micro-USDC
  currency: string;
  status: ObligationStatus;
  due_at?: string;
  settled_amount: string;
  payment_intent_id?: string;
  execution_mode: ClearingExecutionMode;
  created_at: string;
  updated_at: string;
}

export interface EconomicEscrow {
  escrow_id: string;
  obligation_id: string;
  contract_id: string;
  organization_id: string;
  payer: string;
  payee: string;
  vault_address: string;
  amount: string;
  reserved_amount: string;
  released_amount: string;
  refunded_amount: string;
  currency: string;
  status: EscrowStatus;
  reservation_id?: string;
  execution_mode: ClearingExecutionMode;
  created_at: string;
  updated_at: string;
}

export interface PaymentMilestone {
  milestone_id: string;
  contract_id: string;
  obligation_id: string;
  organization_id: string;
  sequence: number;
  description: string;
  amount: string;
  verification_rule: string;
  due_at?: string;
  status: MilestoneStatus;
  actual_output?: string;
  result_hash?: string;
  evidence_uri?: string;
  verified_at?: string;
  settled_at?: string;
  payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  item_number: number;
  description: string;
  milestone_id?: string;
  quantity?: number;
  unit_price?: string;
  amount: string;
}

export interface EconomicInvoice {
  invoice_id: string;
  contract_id: string;
  obligation_id?: string;
  organization_id: string;
  provider_agent_id: string;
  requester_agent_id: string;
  amount: string;
  currency: string;
  line_items: InvoiceLineItem[];
  evidence?: Record<string, string>;
  milestone_refs?: string[];
  issued_at: string;
  due_at: string;
  status: InvoiceStatus;
  invoice_hash?: string;
  payment_intent_id?: string;
  execution_mode: ClearingExecutionMode;
  created_at: string;
  updated_at: string;
}

export interface NettingProposal {
  proposal_id: string;
  organization_id: string;
  agent_a: string;
  agent_b: string;
  currency: string;
  obligations_a_to_b: string[];
  obligations_b_to_a: string[];
  gross_amount_a_to_b: string;
  gross_amount_b_to_a: string;
  gross_total: string;
  net_payer: string;
  net_payee: string;
  net_amount: string;
  savings_amount: string;
  status: NettingStatus;
  approved_by_a: boolean;
  approved_by_b: boolean;
  payment_intent_id?: string;
  created_at: string;
  expires_at: string;
  executed_at?: string;
}

export interface SettlementBatch {
  batch_id: string;
  organization_id: string;
  currency: string;
  obligation_ids: string[];
  gross_amount: string;
  net_amount: string;
  savings: string;
  status: BatchStatus;
  failure_reason?: string;
  payment_intent_ids?: string[];
  execution_mode: ClearingExecutionMode;
  created_at: string;
  executed_at?: string;
}

export interface RefundRequest {
  refund_id: string;
  original_payment_id: string;
  contract_id?: string;
  obligation_id?: string;
  organization_id: string;
  requester_agent_id: string;
  reason: string;
  original_amount: string;
  refund_amount: string;
  evidence?: string;
  status: RefundStatus;
  payment_intent_id?: string;
  execution_mode: ClearingExecutionMode;
  created_at: string;
  resolved_at?: string;
}

export interface ReconciliationRecord {
  record_id: string;
  organization_id: string;
  obligation_id: string;
  payment_intent_id: string;
  transaction_hash?: string;
  chain_id: string;
  target_contract: string;
  expected_amount: string;
  actual_amount: string;
  expected_recipient: string;
  actual_recipient: string;
  status: ReconciliationStatus;
  discrepancy_notes?: string;
  recommended_action?: string;
  execution_mode: ClearingExecutionMode;
  reconciled_at: string;
}

export interface CounterpartyExposure {
  agent_id: string;
  committed_payable: string;
  reserved_in_escrow: string;
  pending_settlement: string;
  receivable_amount: string;
  net_exposure: string;
  risk_level: string;
}

export interface EconomicExposureSnapshot {
  organization_id: string;
  current_exposure: string;
  max_possible_exposure: string;
  reserved_in_escrow: string;
  outstanding_obligations: string;
  pending_settlements: string;
  disputed_amount: string;
  unsettled_invoices: string;
  counterparties: CounterpartyExposure[];
  execution_mode: ClearingExecutionMode;
  calculated_at: string;
}

export interface EconomicHealthSnapshot {
  organization_id: string;
  on_chain_available: string;
  active_escrow_reserved: string;
  available_unencumbered: string;
  total_exposure: string;
  solvency_ratio: number;
  health_status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  deterministic_signals: string[];
  execution_mode: ClearingExecutionMode;
  evaluated_at: string;
}

export interface ClearingLedgerEntry {
  entry_id: string;
  organization_id: string;
  obligation_id: string;
  contract_id?: string;
  invoice_id?: string;
  milestone_id?: string;
  payment_intent_id?: string;
  transaction_hash?: string;
  entry_type: string;
  debit_account: string;
  credit_account: string;
  amount: string;
  currency: string;
  execution_mode: ClearingExecutionMode;
  timestamp: string;
  hash: string;
}

// ============================================================================
// TASK 11 — AUTONOMOUS TREASURY & LIQUIDITY ORCHESTRATOR TYPES
// ============================================================================

export type TreasuryOperationalMode = 'NORMAL' | 'CONSTRAINED' | 'EMERGENCY';
export type TreasuryReconciliationStatus = 'MATCHED' | 'MISMATCH' | 'PENDING' | 'AMBIGUOUS' | 'REQUIRES_REVIEW' | 'UNVERIFIED';
export type TreasuryReservationStatus = 'REQUESTED' | 'RESERVED' | 'CONSUMED' | 'RELEASED' | 'EXPIRED' | 'CANCELLED';
export type TreasuryCommitmentType = 'SOFT_COMMITMENT' | 'HARD_COMMITMENT';
export type TreasuryCommitmentLifecycle = 'EXPECTED' | 'PROPOSED' | 'AUTHORIZED' | 'RESERVED' | 'SETTLED';
export type TreasuryInflowStatus = 'EXPECTED' | 'VERIFIED' | 'RECEIVED' | 'DELAYED' | 'CANCELLED';
export type TreasuryScopeLevel = 'GLOBAL' | 'ORGANIZATION' | 'AGENT' | 'MISSION' | 'SWARM';
export type TreasuryForecastHorizon = '1h' | '6h' | '24h' | '7d' | '30d';
export type TreasuryStressScenarioType = 'BASELINE' | 'HIGH_OUTFLOW' | 'LOW_LIQUIDITY' | 'HIGH_FAILURE' | 'HIGH_RETRY' | 'HIGH_DELEGATION' | 'SETTLEMENT_CLUSTER' | 'CUSTOM';
export type TreasurySurvivalState = 'SAFE' | 'CONSTRAINED' | 'CRITICAL' | 'UNAVAILABLE';
export type TreasuryLiquidityGateResult = 'LIQUIDITY_AVAILABLE' | 'LIQUIDITY_CONSTRAINED' | 'LIQUIDITY_UNAVAILABLE';

export interface TreasuryState {
  treasury_id: string;
  organization_id: string;
  vault_address: string;
  currency: string;
  mode: 'REAL' | 'SIMULATION';
  total_balance: string;
  available_balance: string;
  reserved_balance: string;
  committed_balance: string;
  pending_settlement: string;
  disputed_balance: string;
  minimum_buffer: string;
  maximum_exposure: string;
  operational_mode: TreasuryOperationalMode;
  updated_at: string;
  source_version: number;
}

export interface LiquidityReservation {
  reservation_id: string;
  organization_id: string;
  source: string;
  obligation_id?: string;
  mission_id?: string;
  swarm_id?: string;
  agent_id?: string;
  amount: string;
  currency: string;
  mode: 'REAL' | 'SIMULATION';
  status: TreasuryReservationStatus;
  policy_version?: string;
  policy_hash?: string;
  created_at: string;
  expires_at: string;
  consumed_at?: string;
  released_at?: string;
}

export interface LiquidityReservationRequest {
  organization_id: string;
  source: string;
  obligation_id?: string;
  mission_id?: string;
  swarm_id?: string;
  agent_id?: string;
  amount_base: string;
  currency?: string;
  mode?: 'REAL' | 'SIMULATION';
  timeout_seconds?: number;
  policy_version?: string;
  policy_hash?: string;
}

export interface LiquidityCommitment {
  commitment_id: string;
  organization_id: string;
  type: TreasuryCommitmentType;
  lifecycle: TreasuryCommitmentLifecycle;
  amount: string;
  currency: string;
  source: string;
  source_id: string;
  agent_id?: string;
  created_at: string;
  matures_at: string;
  updated_at: string;
}

export interface ExpectedInflow {
  inflow_id: string;
  organization_id: string;
  source: string;
  expected_amount: string;
  currency: string;
  expected_at: string;
  confidence: number;
  status: TreasuryInflowStatus;
  verified_at?: string;
  tx_hash?: string;
}

export interface LiquidityEnvelope {
  scope: TreasuryScopeLevel;
  scope_id: string;
  currency: string;
  total_funds: string;
  current_available: string;
  reserved_funds: string;
  committed_funds: string;
  potential_exposure: string;
  minimum_buffer: string;
  current_capacity: string;
  safe_commitment_capacity: string;
  calculated_at: string;
}

export interface ForecastDataPoint {
  timestamp: string;
  available_liquidity: string;
  committed_liquidity: string;
  expected_outflow: string;
  expected_inflow: string;
  buffer: string;
  safe_capacity: string;
}

export interface LiquidityForecast {
  forecast_id: string;
  organization_id: string;
  horizon: TreasuryForecastHorizon;
  scenario: TreasuryStressScenarioType;
  current_balance: string;
  points: ForecastDataPoint[];
  confidence: number;
  assumptions: string[];
  sample_size: number;
  generated_at: string;
}

export interface LiquidityStressScenario {
  scenario_name: TreasuryStressScenarioType;
  simultaneous_settlements?: number;
  provider_fallback_rate?: number;
  retry_surge_percentage?: number;
  milestone_release_ratio?: number;
  refund_surge_ratio?: number;
  inflow_delay_hours?: number;
  network_latency_multiplier?: number;
}

export interface LiquidityStressResult {
  scenario_name: TreasuryStressScenarioType;
  starting_liquidity: string;
  total_projected_outflow: string;
  minimum_resulting_liquidity: string;
  buffer_breached: boolean;
  emergency_buffer_breached: boolean;
  worst_case_exposure: string;
  survival_state: TreasurySurvivalState;
  recommended_actions: string[];
  simulated_at: string;
}

export interface TreasuryReconciliationReport {
  report_id: string;
  organization_id: string;
  status: TreasuryReconciliationStatus;
  internal_ledger_balance: string;
  repository_balance: string;
  vault_balance: string;
  blockchain_balance: string;
  discrepancy_amount: string;
  chain_id: string;
  vault_address: string;
  token_address: string;
  vault_paused: boolean;
  vault_owner: string;
  verified_at: string;
  evidence: string;
}

export interface LiquidityAnomaly {
  anomaly_id: string;
  organization_id: string;
  type: string;
  severity: string;
  affected_scope: string;
  evidence: string;
  detected_at: string;
  status: string;
}

export interface TreasuryHealthSnapshot {
  organization_id: string;
  mode: 'REAL' | 'SIMULATION';
  total_balance: string;
  available_balance: string;
  reserved_balance: string;
  committed_balance: string;
  pending_settlement: string;
  disputed_balance: string;
  minimum_buffer: string;
  safe_capacity: string;
  worst_case_exposure: string;
  solvency_ratio: number;
  operational_mode: TreasuryOperationalMode;
  reconciliation_status: TreasuryReconciliationStatus;
  last_verified_on_chain_balance: string;
  verification_timestamp: string;
  active_reservations_count: number;
  active_anomalies_count: number;
}

export interface TreasurySummary {
  organization_id: string;
  vault_address: string;
  on_chain_balance: string;
  reserved_amount: string;
  available_amount: string;
  asset: string;
  decimals: number;
}

// ==========================================
// Task 12: Autonomous Economic Control Tower
// ==========================================

export interface EconomicStateStrip {
  treasury_status: string;
  policy_version: string;
  risk_level: string;
  execution_mode: 'LIVE' | 'SIMULATION';
  arc_status: 'VERIFIED' | 'UNVERIFIED';
  last_updated: string;
}

export interface ExecutiveOverview {
  organization_id: string;
  execution_mode: 'REAL' | 'SIMULATION';
  active_missions_count: number;
  active_agents_count: number;
  active_contracts_count: number;
  available_liquidity: string;
  reserved_liquidity: string;
  outstanding_obligations: string;
  pending_settlements: string;
  active_approvals_count: number;
  current_policy_version: string;
  current_treasury_mode: string;
  security_status: string;
  arc_verified_balance: string;
  data_freshness: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
  state_strip: EconomicStateStrip;
  timestamp: string;
}

export type ControlCategory =
  | 'MISSION'
  | 'AGENT'
  | 'ECONOMY'
  | 'SECURITY'
  | 'POLICY'
  | 'TREASURY'
  | 'EXECUTION'
  | 'ARC'
  | 'INTELLIGENCE';

export interface ControlActivityEvent {
  event_id: string;
  type: string;
  category: ControlCategory;
  organization_id: string;
  aggregate_id: string;
  severity: string;
  title: string;
  summary: string;
  evidence?: string;
  timestamp: string;
}

export interface FinancialTraceStep {
  step_number: number;
  stage: string;
  status: string;
  reference_id: string;
  description: string;
  hash?: string;
  timestamp: string;
}

export interface UniversalFinancialTrace {
  trace_id: string;
  organization_id: string;
  payment_intent_id: string;
  mission_id?: string;
  task_id?: string;
  agent_id?: string;
  contract_id?: string;
  obligation_id?: string;
  policy_version: string;
  policy_hash: string;
  policy_decision: string;
  risk_score: number;
  risk_level: string;
  approval_id?: string;
  approval_status?: string;
  reservation_id?: string;
  reservation_status?: string;
  payment_status: string;
  execution_tx_hash?: string;
  agent_vault_address?: string;
  arc_chain_id?: string;
  arc_block_number?: number;
  reconciliation_id?: string;
  reconciliation_status?: string;
  observation_id?: string;
  learning_notes?: string;
  steps: FinancialTraceStep[];
  created_at: string;
}

export interface TaskGraphNodeView {
  task_id: string;
  title: string;
  agent_id: string;
  status: string;
  cost_reserved: string;
  cost_settled: string;
  duration_ms: number;
  verification_rule: string;
}

export interface TaskGraphEdgeView {
  from_task_id: string;
  to_task_id: string;
  type: 'DATA_FLOW' | 'DEPENDENCY' | 'DELEGATION';
}

export interface RejectedAlternativeAgent {
  agent_id: string;
  quoted_price: string;
  rejection_reason: string;
  score_difference: string;
}

export interface MissionAgentInfo {
  agent_id: string;
  display_name: string;
  capability: string;
  quoted_price: string;
  selection_reason: string;
  verification_rate: number;
  risk_level: string;
  rejected_alternatives?: RejectedAlternativeAgent[];
}

export interface MissionObligationView {
  obligation_id: string;
  contract_id: string;
  payer_agent_id: string;
  payee_agent_id: string;
  amount: string;
  settled_amount: string;
  currency: string;
  status: string;
}

export interface CurrentActionDesc {
  action: string;
  why: string;
  evidence: string;
  next_possible_action: string;
}

export interface MissionPolicySummary {
  constitution_version: string;
  policy_hash: string;
  effective_rules: Record<string, string>;
  explainability_notes: string;
}

export interface MissionTaskGraphView {
  max_depth: number;
  nodes: TaskGraphNodeView[];
  edges: TaskGraphEdgeView[];
}

export interface MissionCommandCenterView {
  mission_id: string;
  title: string;
  objective: string;
  status: string;
  budget_total: string;
  budget_reserved: string;
  budget_settled: string;
  budget_remaining: string;
  potential_exposure: string;
  current_action: CurrentActionDesc;
  next_expected_action: string;
  policy_summary: MissionPolicySummary;
  selected_agents: MissionAgentInfo[];
  task_graph: MissionTaskGraphView;
  obligations: MissionObligationView[];
  timeline: ControlActivityEvent[];
  learning_telemetry?: Record<string, unknown>;
  updated_at: string;
}

export interface ArcStatusView {
  chain_id: string;
  rpc_url: string;
  rpc_reachable: boolean;
  latest_block_number: number;
  agent_vault_address: string;
  agent_vault_deployed: boolean;
  agent_vault_paused: boolean;
  usdc_address: string;
  verified_treasury_balance: string;
  live_execution_enabled: boolean;
  last_checked_at: string;
}

export interface IncidentTimelineStep {
  step_number: number;
  timestamp: string;
  subsystem: string;
  description: string;
}

export interface ControlIncident {
  incident_id: string;
  organization_id: string;
  title: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
  trigger_event: string;
  detected_at: string;
  mitigated_at?: string;
  resolved_at?: string;
  timeline: IncidentTimelineStep[];
  root_cause: string;
  resolution_notes?: string;
}

export interface ControlSearchResult {
  type: 'MISSION' | 'AGENT' | 'CONTRACT' | 'OBLIGATION' | 'PAYMENT' | 'INCIDENT' | 'POLICY' | 'TREASURY';
  id: string;
  title: string;
  subtitle: string;
  status: string;
  deep_link_url: string;
}

// ============================================================================
// TASK 13: DURABLE RUNTIME & AUTONOMOUS OPERATIONS TYPES
// ============================================================================

export type WorkflowState =
  | 'CREATED'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'PAUSED'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ABORTED';

export type StepState =
  | 'PENDING'
  | 'CLAIMED'
  | 'RUNNING'
  | 'WAITING'
  | 'SUCCEEDED'
  | 'RETRYABLE_FAILURE'
  | 'PERMANENT_FAILURE'
  | 'CANCELLED'
  | 'EXPIRED';

export type WorkerStatus =
  | 'STARTING'
  | 'HEALTHY'
  | 'DRAINING'
  | 'STOPPED'
  | 'STALE';

export interface DurableWorkflow {
  workflow_id: string;
  tenant_id: string;
  workflow_type: string;
  aggregate_type: string;
  aggregate_id: string;
  state: WorkflowState;
  version: number;
  priority: number;
  idempotency_key: string;
  parent_workflow_id?: string;
  correlation_id?: string;
  current_step?: string;
  failure_reason?: string;
  retry_count: number;
  deadline?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface ExecutionStep {
  step_id: string;
  workflow_id: string;
  tenant_id: string;
  step_type: string;
  sequence: number;
  state: StepState;
  attempt: number;
  idempotency_key: string;
  input_hash?: string;
  output_hash?: string;
  lease_owner?: string;
  lease_expires_at?: string;
  timeout_seconds: number;
  next_retry_at?: string;
  error_code?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
}

export interface RuntimeCheckpoint {
  checkpoint_id: string;
  workflow_id: string;
  step_id?: string;
  tenant_id: string;
  state_hash: string;
  event_position: number;
  schema_version: number;
  snapshot_data: Record<string, any>;
  created_at: string;
}

export interface RuntimeWorker {
  worker_id: string;
  worker_type: string;
  hostname: string;
  status: WorkerStatus;
  capabilities?: Record<string, any>;
  version: string;
  heartbeat_at: string;
  last_seen: string;
  created_at: string;
}

export interface RuntimeIncident {
  incident_id: string;
  tenant_id: string;
  workflow_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  state: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  detected_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  root_cause?: string;
  evidence?: Record<string, any>;
  remediation?: string;
  correlation_id?: string;
}

export interface RuntimeMetrics {
  active_workflows: number;
  waiting_workflows: number;
  retry_rate_bps: number;
  failure_rate_bps: number;
  recovery_rate_bps: number;
  average_step_duration_ms: number;
  lease_expirations_count: number;
  stale_worker_count: number;
  queue_depth: number;
  deadline_violations_count: number;
  reconciliation_queue_size: number;
  ambiguous_operations: number;
  worker_utilization_pct: number;
}

export interface CreateWorkflowParams {
  tenant_id?: string;
  workflow_type: string;
  aggregate_type: string;
  aggregate_id: string;
  idempotency_key: string;
  priority?: number;
  parent_workflow_id?: string;
  correlation_id?: string;
  deadline?: string;
  metadata?: Record<string, any>;
  steps?: Array<{
    step_type: string;
    sequence: number;
    idempotency_key: string;
    timeout_seconds?: number;
    inputs?: Record<string, any>;
  }>;
}

export interface OperationsSnapshot {
  snapshot_id: string;
  tenant_id: string;
  snapshot_version: number;
  freshness: 'FRESH' | 'STALE' | 'DEGRADED' | 'UNKNOWN';
  active_workflows: number;
  queued_workflows: number;
  blocked_workflows: number;
  failed_workflows: number;
  recovering_workflows: number;
  active_agents: number;
  available_workers: number;
  treasury_state: string;
  liquidity_state: string;
  clearing_state: string;
  security_state: string;
  policy_state: string;
  arc_state: string;
  incident_count: number;
  generated_at: string;
  metadata?: Record<string, any>;
}

export interface ArcVerificationState {
  rpc_connected: boolean;
  vault_deployed: boolean;
  live_execution_enabled: boolean;
  recent_settlement_verified: boolean;
  status_text: string;
  last_checked_at: string;
}

export interface ComponentHealth {
  name: string;
  state: 'HEALTHY' | 'DEGRADED' | 'BLOCKED' | 'CRITICAL' | 'UNKNOWN';
  message: string;
  last_probe_at: string;
}

export interface OperationsHealth {
  overall_state: 'HEALTHY' | 'DEGRADED' | 'BLOCKED' | 'CRITICAL' | 'UNKNOWN';
  components: Record<string, ComponentHealth>;
  arc: ArcVerificationState;
  generated_at: string;
}

export interface OperationsWorker {
  worker_id: string;
  worker_type: string;
  status: string;
  last_seen: string;
  capabilities: string[];
}

export interface OperationsQueuesData {
  queue_depths: Record<string, number>;
  dead_letters: any[];
  total_dead: number;
}

export interface OperationsIncident {
  incident_id: string;
  tenant_id: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  state: 'DETECTED' | 'TRIAGED' | 'INVESTIGATING' | 'MITIGATING' | 'MONITORING' | 'RESOLVED' | 'CLOSED';
  root_cause?: string;
  affected_workflows?: string[];
  affected_resources?: string[];
  mitigation_actions?: string[];
  correlation_id?: string;
  detected_at: string;
  triaged_at?: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface ReplayTraceEntry {
  sequence: number;
  step_id: string;
  step_type: string;
  state: string;
  worker_id?: string;
  timestamp: string;
  decision?: string;
  evidence?: string;
  financial_barrier_ok: boolean;
  metadata?: Record<string, any>;
}

export interface OperationalReplay {
  workflow_id: string;
  tenant_id: string;
  total_steps: number;
  final_state: string;
  entries: ReplayTraceEntry[];
  replayed_at: string;
}

export interface OperationalGraphNode {
  id: string;
  type: string;
  label: string;
  state: string;
  age_seconds: number;
  owner?: string;
  worker_id?: string;
  metadata?: Record<string, any>;
}

export interface OperationalGraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface OperationalGraph {
  nodes: OperationalGraphNode[];
  edges: OperationalGraphEdge[];
  generated_at: string;
}

export interface OperationsExplanation {
  current_state: string;
  previous_state?: string;
  trigger: string;
  evidence: string;
  policy?: string;
  risk?: string;
  resource_constraint?: string;
  economic_constraint?: string;
  decision: string;
  next_action: string;
  financial_authority: string;
}

export interface OperationsNextAction {
  action: string;
  reason: string;
  estimated_delay_seconds: number;
  requires_human: boolean;
}

export interface SystemStateAtSnapshot {
  timestamp: string;
  tenant_id: string;
  reconstructed_from: string;
  active_workflows: number;
  workflow_states: Record<string, string>;
  active_workers: string[];
  incidents: string[];
  financial_state_frozen: boolean;
}

// ============================================================
// TASK 15: AUTONOMOUS ECONOMIC FABRIC TYPES
// ============================================================

export type ObjectiveStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'SIMULATED'
  | 'APPROVED'
  | 'RUNNING'
  | 'WAITING'
  | 'DEGRADED'
  | 'RECOVERING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface ObjectiveConstraints {
  deadline?: string;
  max_budget_usdc: number;
  max_single_payment_usdc?: number;
  max_parallel_tasks?: number;
  required_capability?: string;
  minimum_confidence?: number;
  required_policy_hash?: string;
  execution_mode?: 'SIMULATION' | 'LIVE';
}

export interface EconomicObjective {
  objective_id: string;
  tenant_id: string;
  description: string;
  owner: string;
  status: ObjectiveStatus;
  constraints: ObjectiveConstraints;
  economic_budget_usdc: number;
  risk_tolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  required_capabilities: string[];
  active_blueprint_id?: string;
  active_mission_id?: string;
  active_workflow_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BlueprintTask {
  task_id: string;
  task_name: string;
  required_capability: string;
  dependencies: string[];
  estimated_cost_usdc: number;
  assigned_agent_id?: string;
  selected_provider?: string;
  requires_payment: boolean;
  milestone_hash?: string;
}

export interface EconomicEnvelope {
  envelope_id: string;
  objective_id: string;
  tenant_id: string;
  max_total_cost_usdc: number;
  max_single_cost_usdc: number;
  max_exposure_usdc: number;
  max_parallel_exposure_usdc: number;
  reserved_amount_usdc: number;
  spent_amount_usdc: number;
  expiry: string;
  policy_hash: string;
  created_at: string;
}

export interface RiskEnvelope {
  envelope_id: string;
  objective_id: string;
  tenant_id: string;
  max_risk_score: number;
  allowed_risk_classes: string[];
  escalation_threshold: number;
  confidence_threshold: number;
  security_requirements: string[];
  created_at: string;
}

export interface ResourceEnvelope {
  envelope_id: string;
  objective_id: string;
  tenant_id: string;
  max_workers: number;
  max_parallel_tasks: number;
  max_provider_calls: number;
  max_agent_depth: number;
  max_runtime_seconds: number;
  max_retries: number;
  created_at: string;
}

export interface ExecutionBlueprint {
  blueprint_id: string;
  objective_id: string;
  tenant_id: string;
  version: number;
  tasks: BlueprintTask[];
  agent_assignments: Record<string, string>;
  service_candidates: string[];
  economic_envelope: EconomicEnvelope;
  risk_envelope: RiskEnvelope;
  resource_envelope: ResourceEnvelope;
  policy_references: string[];
  simulation_id?: string;
  simulation_timestamp?: string;
  simulation_stale: boolean;
  policy_hash: string;
  status: string;
  created_at: string;
}

export interface BlueprintVersion {
  version_id: string;
  blueprint_id: string;
  objective_id: string;
  version: number;
  diff_summary: Record<string, any>;
  replan_reason: string;
  policy_revalidation_required: boolean;
  created_at: string;
}

export interface FabricDecision {
  decision_id: string;
  objective_id: string;
  tenant_id: string;
  decision_type: string;
  reason_code: string;
  explanation: string;
  inputs_hash: string;
  financial_authority: string;
  created_at: string;
}

export interface UnifiedTraceNode {
  id: string;
  stage: string;
  label: string;
  state: string;
  source_of_truth: string;
  hash?: string;
  timestamp: string;
}

export interface UnifiedEconomicTrace {
  objective_id: string;
  tenant_id: string;
  nodes: UnifiedTraceNode[];
  generated_at: string;
}

export interface WhyThisExplanation {
  objective_id: string;
  selected_provider: string;
  selection_factors: string[];
  quote_price_usdc: number;
  policy_decision: string;
  approval_status: string;
  treasury_status: string;
  rejected_candidates: Array<{ provider_id: string; reason: string }>;
}

export interface WhyNotExplanation {
  objective_id: string;
  requested_action: string;
  block_reason: string;
  policy_violated?: string;
  next_safe_actions: string[];
}

export interface AutonomyMetrics {
  tenant_id: string;
  automation_percentage: number;
  recovery_percentage: number;
  human_escalation_count: number;
  policy_block_count: number;
  financial_action_count: number;
  simulated_action_count: number;
  total_objectives: number;
  active_objectives: number;
}

export interface SimulationCompareResult {
  simulation_id: string;
  simulation_timestamp: string;
  expected_duration_seconds: number;
  expected_cost_usdc: number;
  max_exposure_usdc: number;
  policy_decision: string;
  risk_score: number;
  simulation_stale: boolean;
  stale_reasons?: string[];
}

export interface DryRunResult {
  is_dry_run: boolean;
  action: string;
  would_change: Record<string, any>;
  would_not_change: string[];
  financial_delta_usdc: number;
  policy_impact: string;
}

// =============================================================================
// AUTONOMOUS ECONOMIC PROTOCOL V1 TYPES (TASK 16)
// =============================================================================

export interface ProtocolMessage<T = unknown> {
  protocol_version: '1.0';
  message_type: string;
  message_id: string;
  timestamp: string;
  sender_id: string;
  recipient_id: string;
  correlation_id: string;
  causation_id?: string;
  idempotency_key?: string;
  nonce?: string;
  signature?: string;
  tenant_id?: string;
  payload: T;
}

export interface CapabilityDescriptor {
  capability_id: string;
  name: string;
  version: string;
  description: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  estimated_latency_ms?: number;
  pricing_model: 'FIXED' | 'VARIABLE' | 'QUOTE_REQUIRED';
  supported_assets: string[];
  required_trust_level?: 'UNVERIFIED' | 'IDENTIFIED' | 'VERIFIED' | 'TRUSTED';
  verification_requirements?: string;
}

export interface ManifestPricing {
  capability: string;
  model: string;
  base_price: string;
  max_price?: string;
  currency?: string;
}

export interface ReputationMetrics {
  agent_id: string;
  completion_rate: number;
  avg_latency_ms: number;
  quality_score: number;
  dispute_rate: number;
  quote_accuracy: number;
  reliability_score: number;
  cancellation_rate: number;
  sample_size: number;
  confidence: number;
  observation_period: string;
}

export interface ProtocolAgentManifest {
  protocol_version: '1.0';
  agent_id: string;
  organization_id: string;
  display_name: string;
  capabilities: CapabilityDescriptor[];
  endpoints: Record<string, string>;
  supported_protocols: string[];
  pricing: ManifestPricing[];
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  service_regions?: string[];
  authentication: Record<string, string>;
  result_formats: string[];
  reputation_reference?: ReputationMetrics;
  security_requirements?: string[];
}

export type AgentManifestV1 = ProtocolAgentManifest;

export interface ServiceRequest {
  request_id: string;
  requester_id: string;
  capability: string;
  input_data?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  deadline: string;
  budget_cap: string;
  quality_requirements?: Record<string, unknown>;
  risk_requirements?: Record<string, unknown>;
  result_requirements?: Record<string, unknown>;
}

export interface ProtocolQuote {
  quote_id: string;
  provider_id: string;
  request_id: string;
  amount: string;
  currency: string;
  expiration: string;
  expected_duration_seconds: number;
  deliverables: string[];
  assumptions?: string[];
  cancellation_terms?: string;
  verification_requirements?: string;
  policy_snapshot_hash?: string;
}

export interface NegotiationPayload {
  negotiation_id: string;
  contract_id?: string;
  round: number;
  sender_id: string;
  proposed_price: string;
  proposed_deadline?: string;
  deliverables?: string[];
  terms?: Record<string, string>;
  expires_at: string;
}

export interface ContractMilestone {
  milestone_id: string;
  title: string;
  deliverable_spec: string;
  amount: string;
  verification_method: string;
  due_at: string;
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'PAID';
}

export interface ProtocolContract {
  contract_id: string;
  tenant_id: string;
  requester_id: string;
  provider_id: string;
  capability: string;
  deliverables: string[];
  milestones?: ContractMilestone[];
  total_amount: string;
  currency: string;
  deadline: string;
  verification_policy?: string;
  dispute_terms?: string;
  policy_snapshot_hash: string;
  state:
    | 'PROPOSED'
    | 'NEGOTIATING'
    | 'ACCEPTED'
    | 'ACTIVE'
    | 'MILESTONE_PENDING'
    | 'COMPLETED'
    | 'DISPUTED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'REJECTED'
    | 'FAILED';
  created_at: string;
  accepted_at?: string;
  expires_at: string;
}

export interface ResultSubmittedPayload {
  result_id: string;
  contract_id: string;
  task_id: string;
  milestone_id?: string;
  schema_version: string;
  result_hash: string;
  deliverable_data: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  quality_metadata?: Record<string, unknown>;
  submitted_at: string;
}

export interface PaymentRequestPayload {
  contract_id: string;
  milestone_id: string;
  amount: string;
  currency: string;
  recipient_service_id: string;
  result_reference: string;
  evidence_reference?: string;
  proposed_justification?: string;
}

export interface PaymentDecision {
  decision: 'AUTHORIZED' | 'DENIED' | 'PENDING' | 'REQUIRED_APPROVAL';
  payment_intent_id?: string;
  reason_code?: string;
  policy_reference?: string;
  risk_reference?: string;
  approval_state?: string;
  retryable: boolean;
  recommended_safe_action?: string;
  details?: string[];
}

export interface ProtocolTrafficEntry {
  traffic_id: string;
  timestamp: string;
  message_type: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  correlation_id: string;
  latency_ms: number;
  error?: string;
  tenant_id: string;
}

export interface ProtocolSimulationRequest {
  service_request: ServiceRequest;
  provider_id?: string;
  negotiated_price?: string;
}

export interface ProtocolSimulationResponse {
  policy_decision: 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL';
  risk_score: number;
  estimated_cost_usdc: string;
  required_approvals: string[];
  treasury_status: string;
  execution_path: string;
  safe_to_execute: boolean;
  warnings?: string[];
}

export interface PrecheckRequest {
  agent_id: string;
  capability: string;
  estimated_amount: string;
  currency: string;
}

export interface PrecheckResponse {
  eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'REQUIRES_APPROVAL' | 'REQUIRES_MORE_INFORMATION';
  reasons: string[];
  max_allowable_budget: string;
}








