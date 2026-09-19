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
  | 'EXCEEDS_TRANSACTION_LIMIT'
  | 'EXCEEDS_DAILY_LIMIT'
  | 'RECIPIENT_NOT_WHITELISTED'
  | 'VAULT_INSUFFICIENT_FUNDS'
  | 'AGENT_NOT_REGISTERED'
  | 'INVALID_INTENT_SIGNATURE';

/**
 * Payment Intent submitted by an autonomous AI agent.
 */
export interface PaymentIntent {
  /** Unique intent UUID */
  id: string;
  /** Address or identifier of the AI agent requesting payment */
  agentId: string;
  /** Recipient address on Arc Network (0x...) */
  recipient: string;
  /**
   * Amount in smallest token units (micro-USDC: 1 USDC = 1_000_000).
   * Stored as string to prevent JSON serialization float precision loss.
   */
  amountMicroUSDC: string;
  /** Target currency */
  currency: SupportedCurrency;
  /** Purpose or metadata for audit trail */
  purpose: string;
  /** Unix timestamp in milliseconds when intent was created */
  createdAtMs: number;
}

/**
 * Result of policy evaluation produced by the Rust Policy Engine.
 */
export interface PolicyEvaluationResult {
  intentId: string;
  decision: PolicyDecision;
  reasonCode: PolicyReasonCode;
  reasonMessage: string;
  evaluatedAtMs: number;
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
