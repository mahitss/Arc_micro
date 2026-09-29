/**
 * Canonical Financial Semantics & State Labeling Utility
 * Prevents UI components from inventing inconsistent financial terminology.
 */

export type CanonicalSystemMode = 'SIMULATION' | 'LIVE';
export type AuthorizationOutcome = 'ALLOWED' | 'HARD_DENY' | 'APPROVAL_REQUIRED';
export type ExecutionStatus = 'NOT_BROADCAST' | 'BROADCAST' | 'SIMULATED';

export const CONTROL_PLANE_TRUTH = {
  SYSTEM_MODE: 'SIMULATION' as const,
  LIVE_EXECUTION_ENABLED: false,
  AGENTVAULT_DEPLOYED: false,
  REAL_SETTLEMENT_COUNT: 0,
  KMS_IMPLEMENTED: false,
  ARC_CHAIN_ID: 5042,
  ARC_RPC_STATUS: 'CONNECTED' as const,
};

export const CANONICAL_PROVENANCE_BADGES = {
  LIVE: 'LIVE',
  VERIFIED: 'VERIFIED',
  PROJECTED: 'PROJECTED',
  SIMULATED: 'SIMULATED',
  HISTORICAL: 'HISTORICAL',
  CACHED: 'CACHED',
  UNAVAILABLE: 'UNAVAILABLE',
  NOT_DEPLOYED: 'NOT DEPLOYED',
} as const;

export function getBroadcastStatusLabel(hasBroadcast: boolean): string {
  return hasBroadcast ? 'BROADCAST' : 'NOT BROADCAST';
}

export function getFinancialStateLabel(
  type: 'SIMULATION' | 'PROJECTED' | 'LIVE' | 'HISTORICAL'
): string {
  switch (type) {
    case 'SIMULATION':
      return 'SIMULATED';
    case 'PROJECTED':
      return 'PROJECTED';
    case 'LIVE':
      return 'VERIFIED';
    case 'HISTORICAL':
      return 'HISTORICAL';
    default:
      return 'SIMULATED';
  }
}

export interface SemanticStateLabel {
  label: string;
  subtext: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral' | 'accent';
  provenance: 'LIVE' | 'VERIFIED' | 'PROJECTED' | 'SIMULATED' | 'HISTORICAL' | 'NOT DEPLOYED' | 'UNAVAILABLE';
}

/**
 * Returns canonical execution state label ensuring simulation is never confused with live broadcast.
 */
export function getExecutionStatusLabel(
  mode: CanonicalSystemMode = 'SIMULATION',
  hasBroadcast: boolean = false
): SemanticStateLabel {
  if (mode === 'SIMULATION' || !hasBroadcast) {
    return {
      label: 'SIMULATED EXECUTION',
      subtext: 'NOT BROADCAST ($0.00 moved)',
      variant: 'warning',
      provenance: 'SIMULATED',
    };
  }
  return {
    label: 'ON-CHAIN BROADCAST',
    subtext: 'Settled on Arc Mainnet',
    variant: 'success',
    provenance: 'LIVE',
  };
}

/**
 * Distinguishes policy authorization decisions (deterministic computation) from execution (settlement).
 */
export function getAuthorizationDecisionLabel(decision: string): SemanticStateLabel {
  const norm = decision.toUpperCase();
  if (norm.includes('ALLOW') || norm.includes('AUTHORIZED') || norm.includes('PASS')) {
    return {
      label: 'AUTHORIZED',
      subtext: 'Deterministic Policy Approved',
      variant: 'success',
      provenance: 'VERIFIED',
    };
  }
  if (norm.includes('DENY') || norm.includes('BLOCKED') || norm.includes('FAIL')) {
    return {
      label: 'HARD DENY',
      subtext: 'Blocked by Invariant Rule',
      variant: 'danger',
      provenance: 'VERIFIED',
    };
  }
  return {
    label: 'APPROVAL REQUIRED',
    subtext: 'Escalated to Dual-Custody',
    variant: 'warning',
    provenance: 'PROJECTED',
  };
}

/**
 * Formats volume metrics ensuring demo/projected volume is never claimed as live settlement.
 */
export function formatSettlementVolume(
  amountUsdc: string | number,
  mode: CanonicalSystemMode = 'SIMULATION'
): { label: string; value: string; subtext: string; provenance: 'PROJECTED' | 'VERIFIED' } {
  const num = typeof amountUsdc === 'number' ? amountUsdc : parseFloat(amountUsdc);
  const formatted = `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (mode === 'SIMULATION') {
    return {
      label: 'SIMULATED SETTLED',
      value: formatted,
      subtext: 'Simulated volume (0 real Arc settlements)',
      provenance: 'PROJECTED',
    };
  }
  return {
    label: 'REAL SETTLED',
    value: formatted,
    subtext: 'Confirmed on Arc Mainnet',
    provenance: 'VERIFIED',
  };
}
