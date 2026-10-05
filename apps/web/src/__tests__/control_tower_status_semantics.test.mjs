/**
 * @file control_tower_status_semantics.test.mjs
 * @description Invariant test suite for Control Tower Status Semantics & Subsystem Disambiguation.
 *
 * Core Principle:
 * PROCESS HEALTH MUST NEVER BE CONFUSED WITH FINANCIAL EXECUTION STATE.
 *
 * Test Scenarios:
 * A. Backend healthy + simulation mode: Gateway ONLINE, Runtime HEALTHY, Policy READY, Arc CONNECTED, Execution DISABLED, Settlement SIMULATION ONLY.
 * B. Arc RPC unavailable: Arc RPC UNAVAILABLE (not simply "live execution disabled").
 * C. Gateway unavailable: Gateway UNAVAILABLE (no silent simulation fallback for LIVE_BACKEND data).
 * D. Runtime unavailable: Runtime UNAVAILABLE.
 * E. Simulation mode: Simulation badge remains prominent across navigation.
 * F. AgentVault undeployed: NOT DEPLOYED ON MAINNET (0x bytecode).
 * G. Live execution disabled: DISABLED (Simulation Guard).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statusResolverPath = path.resolve(__dirname, '../lib/status-resolver.ts');
const statusResolverSource = fs.readFileSync(statusResolverPath, 'utf8');

const globalTopBarPath = path.resolve(__dirname, '../components/GlobalTopBar.tsx');
const globalTopBarSource = fs.readFileSync(globalTopBarPath, 'utf8');

const sidebarPath = path.resolve(__dirname, '../components/AgentPaySidebar.tsx');
const sidebarSource = fs.readFileSync(sidebarPath, 'utf8');

const bannerPath = path.resolve(__dirname, '../components/SystemStatusBanner.tsx');
const bannerSource = fs.readFileSync(bannerPath, 'utf8');

const controlPagePath = path.resolve(__dirname, '../app/control/page.tsx');
const controlPageSource = fs.readFileSync(controlPagePath, 'utf8');

const arcPagePath = path.resolve(__dirname, '../app/arc/page.tsx');
const arcPageSource = fs.readFileSync(arcPagePath, 'utf8');

const healthApiPath = path.resolve(__dirname, '../lib/api/health.ts');
const healthApiSource = fs.readFileSync(healthApiPath, 'utf8');

describe('AgentPay — Control Tower Status Semantics & Subsystem Disambiguation Suite', () => {

  // Scenario A: Backend healthy + simulation mode
  it('Scenario A: verifies healthy backend in simulation produces correct semantic states', () => {
    // 1. Gateway is ONLINE (not merely OFFLINE or execution-conflated)
    assert.ok(
      statusResolverSource.includes("status: 'ONLINE' | 'UNAVAILABLE'"),
      'status-resolver must type gateway as ONLINE | UNAVAILABLE'
    );
    assert.ok(
      sidebarSource.includes("{isGatewayHealthy ? 'ONLINE' : 'UNAVAILABLE'}"),
      'Sidebar must display ONLINE when Gateway is healthy and UNAVAILABLE when unreachable'
    );

    // 2. Runtime is HEALTHY in SIMULATION mode
    assert.ok(
      globalTopBarSource.includes("{isRuntimeHealthy ? 'HEALTHY' : 'UNAVAILABLE'}"),
      'GlobalTopBar must display HEALTHY / UNAVAILABLE for Runtime'
    );
    assert.ok(
      globalTopBarSource.includes('SIM'),
      'GlobalTopBar must show SIM secondary indicator on runtime'
    );

    // 3. Policy is READY (SIM) or ONLINE
    assert.ok(
      globalTopBarSource.includes("isPolicyOnline ? 'ONLINE' : (isPolicyReady ? 'READY (SIM)' : 'UNAVAILABLE')"),
      'GlobalTopBar must render ONLINE or READY (SIM) for Policy Engine'
    );

    // 4. Arc RPC is CONNECTED
    assert.ok(
      globalTopBarSource.includes("{isArcConnected ? 'CONNECTED' : 'UNAVAILABLE'}"),
      'GlobalTopBar must display CONNECTED / UNAVAILABLE for Arc RPC'
    );
    assert.ok(
      globalTopBarSource.includes('SIM · 5042'),
      'GlobalTopBar must display secondary state SIM · 5042 for Arc'
    );

    // 5. Execution is DISABLED
    assert.ok(
      sidebarSource.includes('LIVE EXECUTION: DISABLED'),
      'Sidebar must state LIVE EXECUTION: DISABLED'
    );

    // 6. Settlement is SIMULATION ONLY
    assert.ok(
      controlPageSource.includes('Settlement: <span className="font-mono">SIMULATION ONLY</span>'),
      'Control Tower must declare Settlement: SIMULATION ONLY'
    );
  });

  // Scenario B: Arc RPC unavailable
  it('Scenario B: verifies Arc RPC unavailable is distinct from live execution disabled', () => {
    assert.ok(
      globalTopBarSource.includes("Arc RPC: UNAVAILABLE (Unable to reach JSON-RPC endpoint)"),
      'GlobalTopBar must distinguish Arc RPC UNAVAILABLE from execution disabled'
    );
    assert.ok(
      statusResolverSource.includes('probeArcRpc'),
      'status-resolver must implement probeArcRpc independently'
    );
    assert.ok(
      sidebarSource.includes("{isArcConnected ? 'CONNECTED' : 'UNAVAILABLE'}"),
      'Sidebar Arc indicator must switch to UNAVAILABLE if RPC connectivity fails'
    );
    assert.ok(
      bannerSource.includes('ARC RPC UNAVAILABLE'),
      'SystemStatusBanner must explicitly show ARC RPC UNAVAILABLE if disconnected'
    );
  });

  // Scenario C: Gateway unavailable
  it('Scenario C: verifies Gateway unavailable is explicitly signaled without silent fallback', () => {
    assert.ok(
      sidebarSource.includes("{isGatewayHealthy ? 'ONLINE' : 'UNAVAILABLE'}"),
      'Sidebar must signal GATEWAY UNAVAILABLE when unreachable'
    );
    assert.ok(
      bannerSource.includes("{isGatewayOnline ? 'GATEWAY ONLINE' : 'GATEWAY UNAVAILABLE'}"),
      'SystemStatusBanner must display GATEWAY UNAVAILABLE when offline'
    );
    assert.ok(
      healthApiSource.includes("gateway_status: gatewayStatus === 'HEALTHY' ? 'ONLINE' : 'UNAVAILABLE'"),
      'health.ts must map gateway_status truthfully to ONLINE or UNAVAILABLE'
    );
  });

  // Scenario D: Runtime unavailable
  it('Scenario D: verifies Runtime unavailable reflects process reachability, not execution policy', () => {
    assert.ok(
      statusResolverSource.includes("resolveRuntimeStatus(isGatewayOnline: boolean): 'HEALTHY' | 'UNAVAILABLE'"),
      'status-resolver must evaluate runtime reachability from gateway connectivity'
    );
    assert.ok(
      globalTopBarSource.includes("{isRuntimeHealthy ? 'HEALTHY' : 'UNAVAILABLE'}"),
      'GlobalTopBar must render UNAVAILABLE when runtime process is unreachable'
    );
  });

  // Scenario E: Simulation mode prominence
  it('Scenario E: verifies simulation mode badge remains prominent across the application', () => {
    assert.ok(
      globalTopBarSource.includes('SIMULATION — NO FUNDS MOVED'),
      'GlobalTopBar must render prominent SIMULATION — NO FUNDS MOVED badge'
    );
    assert.ok(
      controlPageSource.includes('CURRENT ENVIRONMENT: SIMULATION — NO FUNDS MOVED'),
      'Control Tower must declare CURRENT ENVIRONMENT: SIMULATION — NO FUNDS MOVED'
    );
    assert.ok(
      arcPageSource.includes('SIMULATION CONSISTENT'),
      'Arc panel must declare SIMULATION CONSISTENT reconciliation'
    );
  });

  // Scenario F: AgentVault undeployed
  it('Scenario F: verifies AgentVault is truthfully reported NOT DEPLOYED on Mainnet', () => {
    assert.ok(
      controlPageSource.includes('AgentVault: <span className="font-mono">NOT DEPLOYED ON MAINNET (0x)</span>'),
      'Control Tower must declare AgentVault: NOT DEPLOYED ON MAINNET (0x)'
    );
    assert.ok(
      arcPageSource.includes('NOT DEPLOYED ON MAINNET'),
      'Arc page parameter table must report AgentVault as NOT DEPLOYED ON MAINNET'
    );
    assert.ok(
      sidebarSource.includes('AGENTVAULT: NOT DEPLOYED'),
      'Sidebar must report AgentVault as NOT DEPLOYED'
    );
  });

  // Scenario G: Live execution disabled
  it('Scenario G: verifies Live Execution is explicitly DISABLED', () => {
    assert.ok(
      controlPageSource.includes('Live Execution: <span className="font-mono text-[#B0ADA5]">DISABLED (Simulation Guard)</span>'),
      'Control Tower must report Live Execution: DISABLED (Simulation Guard)'
    );
    assert.ok(
      sidebarSource.includes('LIVE EXECUTION: DISABLED'),
      'Sidebar must report EXECUTION: DISABLED'
    );
    assert.ok(
      arcPageSource.includes('SIMULATION ONLY (Production broadcast operator-gated)'),
      'Arc page must state Execution Mode is SIMULATION ONLY'
    );
  });

  // AI Status Invariants
  it('verifies AI status represents provider reachability and strictly advisory authority', () => {
    assert.ok(
      globalTopBarSource.includes('ADVISORY ONLY'),
      'GlobalTopBar AI badge must state ADVISORY ONLY'
    );
    assert.ok(
      globalTopBarSource.includes('AI reasoning is strictly advisory (INV-01 & INV-02: Zero financial authority)'),
      'GlobalTopBar AI tooltip must state zero financial authority'
    );
    assert.ok(
      !globalTopBarSource.includes("AI • OFFLINE"),
      'GlobalTopBar must not mark AI offline merely because it is not currently invoked'
    );
  });

  // No cross-page contradictions
  it('verifies zero status contradictions across Top Bar, Sidebar, Control Tower, and Arc Panel', () => {
    // Both TopBar and Sidebar show CONNECTED when Arc RPC is reachable
    assert.ok(globalTopBarSource.includes("{isArcConnected ? 'CONNECTED' : 'UNAVAILABLE'}"));
    assert.ok(sidebarSource.includes("{isArcConnected ? 'CONNECTED' : 'UNAVAILABLE'}"));

    // Both TopBar and Sidebar show ONLINE when Gateway is reachable
    assert.ok(sidebarSource.includes("{isGatewayHealthy ? 'ONLINE' : 'UNAVAILABLE'}"));
    assert.ok(bannerSource.includes("{isGatewayOnline ? 'GATEWAY ONLINE' : 'GATEWAY UNAVAILABLE'}"));

    // Both Control Tower and Arc Panel state Chain 5042 and 0 Real Settlements
    assert.ok(controlPageSource.includes('Chain 5042'));
    assert.ok(arcPageSource.includes('5042'));
    assert.ok(controlPageSource.includes('0 (Zero fake transaction hashes)'));
    assert.ok(arcPageSource.includes('0 Verified (0.00 USDC)'));
  });
});
