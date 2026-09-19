/**
 * @file types.ts
 * @description Frontend API types for AgentPay Web Control Center.
 */

export type IntentStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'DENIED'
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
}

export interface PaymentIntent {
  intent_id: string;
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
