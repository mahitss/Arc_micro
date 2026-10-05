/**
 * @file health.ts
 * @description API queries for Gateway and Policy Engine health.
 */

import { apiRequest } from './client';
import { SystemHealth } from './types';
import { probeArcRpc } from '../status-resolver';

export async function fetchSystemHealth(): Promise<SystemHealth> {
  let gatewayStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' = 'OFFLINE';
  let policyEngineStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' = 'OFFLINE';

  try {
    const healthResp = await apiRequest<{ status: string }>('/health', { timeoutMs: 2500 });
    if (healthResp.status === 'ok') {
      gatewayStatus = 'HEALTHY';
    }
  } catch {
    gatewayStatus = 'OFFLINE';
  }

  try {
    const readyResp = await apiRequest<{
      status: string;
      dependencies?: { policy_engine?: string; arc_rpc?: string };
      components?: { policy_engine?: string };
    }>('/ready', { timeoutMs: 2500 });
    const peStatus = readyResp.dependencies?.policy_engine || readyResp.components?.policy_engine;
    if (readyResp.status === 'ready' || peStatus === 'ok') {
      policyEngineStatus = 'HEALTHY';
    } else {
      policyEngineStatus = 'DEGRADED';
    }
  } catch {
    // If Gateway is online, internal deterministic policy simulation rules (INV-1..12) are fully active
    policyEngineStatus = gatewayStatus === 'HEALTHY' ? 'DEGRADED' : 'OFFLINE';
  }

  // Probe Arc RPC connectivity independently from Gateway and execution state
  const arcRpcConnectivity = await probeArcRpc();
  const isArcHealthy = arcRpcConnectivity === 'CONNECTED';

  return {
    gateway: gatewayStatus,
    policy_engine: policyEngineStatus,
    arc_rpc: isArcHealthy ? 'HEALTHY' : 'OFFLINE',
    database: gatewayStatus === 'HEALTHY' ? 'HEALTHY' : 'OFFLINE',
    network_name: 'Arc Network (Chain ID 5042)',
    is_mainnet_verified: false, // Remains false until production live deployment is verified
    auto_execution_enabled: false,
    // Canonical status mappings
    gateway_status: gatewayStatus === 'HEALTHY' ? 'ONLINE' : 'UNAVAILABLE',
    arc_rpc_status: arcRpcConnectivity,
    runtime_status: gatewayStatus === 'HEALTHY' ? 'HEALTHY' : 'UNAVAILABLE',
    policy_engine_status:
      policyEngineStatus === 'HEALTHY'
        ? 'ONLINE'
        : gatewayStatus === 'HEALTHY'
        ? 'READY (SIM)'
        : 'UNAVAILABLE',
    ai_status: 'READY',
    settlement_mode: 'SIMULATION ONLY',
    agent_vault_status: 'NOT DEPLOYED ON MAINNET (0x)',
    live_execution_status: 'DISABLED (Simulation Guard)',
  };
}
