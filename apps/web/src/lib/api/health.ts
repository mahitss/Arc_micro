/**
 * @file health.ts
 * @description API queries for Gateway and Policy Engine health.
 */

import { apiRequest } from './client';
import { SystemHealth } from './types';

export async function fetchSystemHealth(): Promise<SystemHealth> {
  let gatewayStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' = 'OFFLINE';
  let policyEngineStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' = 'OFFLINE';

  try {
    const healthResp = await apiRequest<{ status: string }>('/health', { timeoutMs: 3000 });
    if (healthResp.status === 'ok') {
      gatewayStatus = 'HEALTHY';
    }
  } catch {
    gatewayStatus = 'OFFLINE';
  }

  try {
    const readyResp = await apiRequest<{ status: string; components?: { policy_engine?: string } }>('/ready', { timeoutMs: 3000 });
    if (readyResp.status === 'ready') {
      policyEngineStatus = 'HEALTHY';
    } else if (readyResp.components?.policy_engine === 'unhealthy') {
      policyEngineStatus = 'DEGRADED';
    }
  } catch {
    policyEngineStatus = 'OFFLINE';
  }

  return {
    gateway: gatewayStatus,
    policy_engine: policyEngineStatus,
    arc_rpc: gatewayStatus === 'HEALTHY' ? 'HEALTHY' : 'OFFLINE',
    database: gatewayStatus === 'HEALTHY' ? 'HEALTHY' : 'OFFLINE',
    network_name: 'Arc Network (Chain ID 5042)',
    is_mainnet_verified: false, // Remains false until production live deployment is verified
    auto_execution_enabled: false,
  };
}
