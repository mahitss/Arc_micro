/**
 * @file data-authority.ts
 * @description Centralized frontend data authority boundary and provenance enforcement for AgentPay.
 * 
 * Strict Invariants:
 * 1. Category A: LIVE_BACKEND — Authoritative backend or on-chain state.
 * 2. Category B: DETERMINISTIC_SIMULATION — Gated under simulation mode; visibly badged.
 * 3. Category C: STATIC_CONFIGURATION — Read-only protocol constants (e.g. Chain 5042, USDC token).
 * 4. Category D: EMPTY_UNAVAILABLE — Explicit, structured unavailable or zero states.
 * 
 * NEVER convert Category B into Category A.
 * NEVER generate fake 0x transaction hashes, fake balances, or fake vault deployment.
 */

export type DataMode = 'LIVE' | 'SIMULATION' | 'UNAVAILABLE';

export type DataSourceClassification =
  | 'LIVE_BACKEND'
  | 'DETERMINISTIC_SIMULATION'
  | 'STATIC_CONFIGURATION'
  | 'EMPTY_UNAVAILABLE';

export type ProvenanceBadgeType =
  | 'LIVE'
  | 'SIMULATED'
  | 'SIMULATION — NO FUNDS MOVED'
  | 'PROJECTED'
  | 'DEMO FIXTURE'
  | 'UNAVAILABLE'
  | 'STATIC'
  | 'STATIC CONFIG';

/**
 * Reads the active data mode from environment, local storage, or URL query parameters.
 */
export function getActiveDataMode(): DataMode {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_DATA_MODE === 'SIMULATION' ? 'SIMULATION' : 'LIVE';
  }

  // 1. Query parameter override (?mode=simulation or ?mode=live)
  const urlParams = new URLSearchParams(window.location.search);
  const paramMode = urlParams.get('mode')?.toUpperCase();
  if (paramMode === 'SIMULATION' || paramMode === 'DEMO') return 'SIMULATION';
  if (paramMode === 'LIVE') return 'LIVE';

  // 2. Local storage preference
  try {
    const stored = localStorage.getItem('agentpay_data_mode')?.toUpperCase();
    if (stored === 'SIMULATION') return 'SIMULATION';
    if (stored === 'LIVE') return 'LIVE';
  } catch {
    // LocalStorage inaccessible
  }

  // 3. Fallback to default
  return process.env.NEXT_PUBLIC_DATA_MODE === 'SIMULATION' ? 'SIMULATION' : 'LIVE';
}

/**
 * Sets the persistent data mode in browser storage.
 */
export function setActiveDataMode(mode: DataMode): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('agentpay_data_mode', mode);
      window.dispatchEvent(new CustomEvent('agentpay:datamode_changed', { detail: { mode } }));
    } catch {
      // LocalStorage inaccessible
    }
  }
}

/**
 * Validates that a transaction hash is not a fake 0x Ethereum/Arc hash pretending to be live.
 * Real Arc settlements are 0 until AgentVault is deployed.
 * In simulation mode, hashes must be prefixed with "sim_tx_" or explicitly identified as simulated.
 */
export function validateTransactionHashIntegrity(hash: string | undefined | null, isLive: boolean): {
  valid: boolean;
  reason?: string;
} {
  if (!hash) return { valid: true };

  // If live mode, but AgentVault is not deployed on mainnet, any 0x transaction hash is fabricated
  if (isLive && hash.startsWith('0x')) {
    return {
      valid: false,
      reason: 'CRITICAL INVARIANT VIOLATION: Fake on-chain transaction hash detected in live mode while AgentVault is undeployed.',
    };
  }

  return { valid: true };
}

/**
 * Wraps data fetching with explicit boundary enforcement.
 * In LIVE mode: calls liveFetch. If it fails, sets UNAVAILABLE / throws. Never returns simulation fixtures silently.
 * In SIMULATION mode: calls simulationFetch with deterministic fixtures and labels accordingly.
 */
export async function executeAuthoritativeQuery<T>(params: {
  mode?: DataMode;
  liveFetch: () => Promise<T>;
  simulationFetch: () => Promise<T> | T;
  emptyFallback: T;
}): Promise<{
  data: T;
  mode: DataMode;
  classification: DataSourceClassification;
  provenance: ProvenanceBadgeType;
  error?: string;
}> {
  const currentMode = params.mode || getActiveDataMode();

  if (currentMode === 'SIMULATION') {
    const simData = await params.simulationFetch();
    return {
      data: simData,
      mode: 'SIMULATION',
      classification: 'DETERMINISTIC_SIMULATION',
      provenance: 'SIMULATION — NO FUNDS MOVED',
    };
  }

  // LIVE mode
  try {
    const liveData = await params.liveFetch();
    return {
      data: liveData,
      mode: 'LIVE',
      classification: 'LIVE_BACKEND',
      provenance: 'LIVE',
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Backend unavailable';
    return {
      data: params.emptyFallback,
      mode: 'UNAVAILABLE',
      classification: 'EMPTY_UNAVAILABLE',
      provenance: 'UNAVAILABLE',
      error: errMsg,
    };
  }
}

/**
 * Known protocol constants (Category C: STATIC_CONFIGURATION).
 * These are fixed architectural invariants, not dynamic state.
 */
export const ARC_PROTOCOL_CONFIG = {
  APPLICATION_STATUS: 'REAL APPLICATION',
  ECONOMIC_ENVIRONMENT: 'SIMULATION — NO FUNDS MOVED',
  FINANCIAL_EXECUTION: 'DISABLED',
  NETWORK_NAME: 'Arc Mainnet',
  CHAIN_ID: 5042,
  CHAIN_ID_HEX: '0x13b2',
  RPC_ENDPOINT: 'https://rpc.mainnet.arc.io',
  NATIVE_USDC_CONTRACT: '0x3600000000000000000000000000000000000000',
  AGENT_VAULT_STATUS: 'NOT DEPLOYED ON MAINNET',
  LIVE_EXECUTION_ENABLED: false,
  REAL_SETTLEMENTS_COUNT: 0,
  REAL_FUNDS_MOVED: '0.00 USDC',
  BROADCAST_COUNT: 0,
  POLICY_ENGINE_STATUS: 'READY (SIMULATION)',
  AI_STATUS: 'CONNECTED (ADVISORY ONLY)',
  AUTHORITY_TIERS: [
    'GLOBAL (Economic Constitution v8)',
    'ORGANIZATION (Tenant Policies)',
    'AGENT (Role-Specific Boundaries)',
    'MISSION (Budget Envelopes)',
    'SWARM (DAG Task Allocations)',
    'TASK (Milestone Clearances)',
    'EXECUTION_GATE (Arc Mainnet Settlement)',
  ],
} as const;
