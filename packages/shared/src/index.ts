/**
 * @file index.ts
 * @description Shared domain types and constants for AgentPay.
 *
 * CRITICAL INVARIANT:
 * Monetary values must NEVER use floating-point arithmetic.
 * All token amounts must be represented as integer units (e.g. micro-USDC with 6 decimals).
 * In TypeScript, use `bigint` or string representations.
 */

/**
 * Currency identifier.
 */
export type SupportedCurrency = 'USDC';

/**
 * USDC token precision on EVM / Arc Network.
 * 1 USDC = 1,000,000 micro-units (6 decimals).
 */
export const USDC_DECIMALS = 6;
export const USDC_BASE_UNIT = 1_000_000n;

/**
 * Decision output by the deterministic Rust Policy Engine.
 */
export type PolicyDecision = 'ALLOW' | 'DENY';

/**
 * Reason codes for policy evaluations.
 */
export type PolicyReasonCode =
  | 'POLICY_OK'
  | 'APPROVED'
  | 'EXCEEDS_TRANSACTION_LIMIT'
  | 'EXCEEDS_DAILY_LIMIT'
  | 'RECIPIENT_NOT_WHITELISTED'
  | 'VAULT_INSUFFICIENT_FUNDS'
  | 'AGENT_NOT_REGISTERED'
  | 'INVALID_INTENT_SIGNATURE';

/**
 * Explicit Payment Intent Lifecycle Statuses.
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

/**
 * Registered Service in the Server-side Service Registry.
 */
export interface RegisteredService {
  id: string;
  name: string;
  recipient: string;
  asset: SupportedCurrency;
  enabled: boolean;
  maxPrice: string;
  fixedPrice?: string;
}

/**
 * Payment Intent submitted by an autonomous AI agent or user.
 */
export interface PaymentIntent {
  intent_id: string;
  agent_id: string;
  vault_address?: string;
  recipient: string;
  amount: string;
  asset: SupportedCurrency;
  purpose: string;
  service: string;
  justification?: string;
  status: IntentStatus;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

/**
 * High-level task submitted to an AI agent.
 */
export interface AgentTaskRequest {
  agent_id: string;
  task: string;
  vault_address?: string;
}

/**
 * Response from AI agent task evaluation.
 */
export interface AgentTaskResponse {
  task_id: string;
  status: 'PAYMENT_REQUIRED' | 'NO_PAYMENT_REQUIRED';
  payment_intent?: PaymentIntent;
}

/**
 * Full detail response for GET /v1/payment-intents/:id.
 */
export interface PaymentIntentDetailResponse {
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

/**
 * Result of policy evaluation produced by the Rust Policy Engine.
 */
export interface PolicyEvaluationResult {
  request_id: string;
  decision: PolicyDecision;
  reason_code: PolicyReasonCode;
  reason: string;
}

/**
 * Helper to convert integer micro-USDC to human-readable string without float loss.
 */
export function formatMicroUSDCToDecimal(microUnits: bigint): string {
  const isNegative = microUnits < 0n;
  const abs = isNegative ? -microUnits : microUnits;
  const whole = abs / USDC_BASE_UNIT;
  const fraction = (abs % USDC_BASE_UNIT).toString().padStart(USDC_DECIMALS, '0');
  return `${isNegative ? '-' : ''}${whole}.${fraction}`;
}

/**
 * Helper to parse human-readable USDC decimal string to bigint micro-units.
 */
export function parseUSDCToMicro(usdcStr: string): bigint {
  const parts = usdcStr.trim().split('.');
  if (parts.length > 2) {
    throw new Error(`Invalid USDC amount format: ${usdcStr}`);
  }
  const wholePart = BigInt(parts[0] || '0');
  let fractionStr = parts[1] || '';
  if (fractionStr.length > USDC_DECIMALS) {
    fractionStr = fractionStr.substring(0, USDC_DECIMALS);
  } else {
    fractionStr = fractionStr.padEnd(USDC_DECIMALS, '0');
  }
  const fractionPart = BigInt(fractionStr);
  return wholePart * USDC_BASE_UNIT + fractionPart;
}
