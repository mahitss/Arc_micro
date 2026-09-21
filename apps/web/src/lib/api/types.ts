/**
 * @file types.ts
 * @description Frontend API types for AgentPay Web Control Center.
 */

export type IntentStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVED'
  | 'DENIED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXECUTING'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED';

export interface Agent {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
  created_at: string;
  usdc_balance?: string;
  vault_address?: string;
  daily_limit?: string;
  daily_spent?: string;
  pending_intents?: number;
  last_activity?: string;
}

export interface AgentPolicy {
  enabled: boolean;
  per_transaction_limit: string;
  daily_spending_limit: string;
  daily_spent: string;
  remaining_daily_limit: string;
  max_transactions_per_day: number;
  transactions_today: number;
  allowed_recipients: string[];
  blocked_recipients: string[];
}

export interface AgentDetail extends Agent {
  network: string;
  policy: AgentPolicy;
}

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

export interface ServiceQuote {
  quote_id: string;
  service_id: string;
  amount: string;
  asset: string;
  expires_at: string;
}

export interface AgentBudget {
  agent_id: string;
  daily_limit: string;
  daily_spent: string;
  remaining_daily_limit: string;
  payment_limit: string;
  available_budget: string;
}

export interface SimulationRequest {
  agent_id: string;
  service_id: string;
  amount: string;
  asset?: string;
  purpose?: string;
  quote_id?: string;
}

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

export interface PaymentIntent {
  intent_id: string;
  organization_id?: string;
  agent_id: string;
  vault_address?: string;
  recipient: string;
  amount: string;
  asset: string;
  purpose: string;
  service: string;
  justification?: string;
  status: IntentStatus;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export type AgentState =
  | 'IDLE'
  | 'THINKING'
  | 'DISCOVERING_SERVICES'
  | 'NEEDS_SERVICE'
  | 'PAYMENT_REQUESTED'
  | 'WAITING_FOR_PAYMENT'
  | 'WAITING_FOR_APPROVAL'
  | 'EXECUTING'
  | 'CONTINUING'
  | 'COMPLETED'
  | 'FAILED';

export interface AgentStepRecord {
  step_index: number;
  state: AgentState;
  tool_name?: string;
  description: string;
  input?: string;
  output?: string;
  timestamp: string;
  duration_ms: number;
}

export interface AgentTaskExecutionResult {
  task_id: string;
  agent_id: string;
  state: AgentState;
  task: string;
  steps: AgentStepRecord[];
  payment_intent_id?: string;
  payment_intent?: PaymentIntent;
  service_used?: string;
  external_data?: string;
  final_report?: string;
  error?: string;
  started_at: string;
  completed_at?: string;
}

export interface PaymentIntentDetail {
  intent: PaymentIntent;
  authorization_status: 'AUTHORIZED' | 'DENIED' | 'PENDING' | 'EXPIRED' | 'NONE';
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

export interface TransactionRecord {
  intent_id: string;
  transaction_hash: string;
  status: string;
  submitted_at?: string;
  confirmed_at?: string;
  error_code?: string;
  agent_id?: string;
  vault_address?: string;
  recipient?: string;
  amount?: string;
}

export interface SystemHealth {
  gateway: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  policy_engine: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  arc_rpc: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  database: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  network_name: string;
  is_mainnet_verified: boolean;
  auto_execution_enabled: boolean;
}

export interface Approval {
  id: string;
  organization_id: string;
  payment_intent_id: string;
  required: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  requested_at: string;
  resolved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  expires_at: string;
  created_at: string;
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

export interface SystemStatus {
  global_execution: 'ACTIVE' | 'PAUSED';
  execution_paused: boolean;
}

export interface TraceStep {
  step_number: number;
  step_id: string;
  trace_id: string;
  type: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'SKIPPED' | string;
  timestamp: string;
  actor: string;
  correlation_id: string;
  metadata?: Record<string, any>;
  reason_codes?: string[];
}

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

export interface PolicyEvidence {
  policy_id?: string;
  policy_version?: string;
  decision: string;
  reason_code: string;
  reason: string;
  risk_level?: string;
  risk_score?: number;
  remaining_daily_limit?: number;
  evaluated_at: string;
}

export interface ApprovalEvidence {
  approval_id: string;
  required: boolean;
  status: string;
  requested_at: string;
  resolved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
}

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

export interface PaymentTrace {
  trace_id: string;
  organization_id: string;
  agent_id: string;
  payment_intent_id: string;
  payment_execution_id?: string;
  status: string;
  execution_mode: 'LIVE' | 'SIMULATION';
  created_at: string;
  updated_at: string;
  steps: TraceStep[];
  payment_summary: PaymentSummary;
  policy_evidence?: PolicyEvidence;
  approval_evidence?: ApprovalEvidence;
  treasury_evidence?: TreasuryEvidence;
  blockchain_evidence?: BlockchainEvidence;
}


