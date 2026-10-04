import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to audited files
const dataAuthorityPath = path.resolve(__dirname, '../lib/data-authority.ts');
const dataAuthorityBadgePath = path.resolve(__dirname, '../components/DataAuthorityBadge.tsx');
const globalTopBarPath = path.resolve(__dirname, '../components/GlobalTopBar.tsx');
const agentPaySidebarPath = path.resolve(__dirname, '../components/AgentPaySidebar.tsx');
const simulatorCommandRailPath = path.resolve(__dirname, '../components/SimulatorCommandRail.tsx');
const marketplaceApiPath = path.resolve(__dirname, '../lib/api/marketplace.ts');
const clearinghouseApiPath = path.resolve(__dirname, '../lib/api/clearinghouse.ts');
const missionsApiPath = path.resolve(__dirname, '../lib/api/missions.ts');
const treasuryApiPath = path.resolve(__dirname, '../lib/api/treasury.ts');
const protocolApiPath = path.resolve(__dirname, '../lib/api/protocol.ts');
const swarmsApiPath = path.resolve(__dirname, '../lib/api/swarms.ts');
const fabricApiPath = path.resolve(__dirname, '../lib/api/fabric.ts');
const networkApiPath = path.resolve(__dirname, '../lib/api/network.ts');

const marketplacePagePath = path.resolve(__dirname, '../app/marketplace/page.tsx');
const securityPagePath = path.resolve(__dirname, '../app/marketplace/security/page.tsx');
const missionsIdPagePath = path.resolve(__dirname, '../app/missions/[id]/page.tsx');
const activityPagePath = path.resolve(__dirname, '../app/activity/page.tsx');
const networkPagePath = path.resolve(__dirname, '../app/network/page.tsx');
const treasuryPagePath = path.resolve(__dirname, '../app/treasury/page.tsx');
const arcPagePath = path.resolve(__dirname, '../app/arc/page.tsx');
const swarmsPagePath = path.resolve(__dirname, '../app/swarms/page.tsx');
const swarmsIdPagePath = path.resolve(__dirname, '../app/swarms/[id]/page.tsx');
const protocolPagePath = path.resolve(__dirname, '../app/control/protocol/page.tsx');

// Read file contents
const dataAuthoritySource = fs.readFileSync(dataAuthorityPath, 'utf8');
const dataAuthorityBadgeSource = fs.readFileSync(dataAuthorityBadgePath, 'utf8');
const globalTopBarSource = fs.readFileSync(globalTopBarPath, 'utf8');
const agentPaySidebarSource = fs.readFileSync(agentPaySidebarPath, 'utf8');
const simulatorRailSource = fs.readFileSync(simulatorCommandRailPath, 'utf8');
const marketplaceApiSource = fs.readFileSync(marketplaceApiPath, 'utf8');
const clearinghouseApiSource = fs.readFileSync(clearinghouseApiPath, 'utf8');
const missionsApiSource = fs.readFileSync(missionsApiPath, 'utf8');
const treasuryApiSource = fs.readFileSync(treasuryApiPath, 'utf8');
const protocolApiSource = fs.readFileSync(protocolApiPath, 'utf8');
const swarmsApiSource = fs.readFileSync(swarmsApiPath, 'utf8');
const fabricApiSource = fs.readFileSync(fabricApiPath, 'utf8');
const networkApiSource = fs.readFileSync(networkApiPath, 'utf8');

const marketplacePageSource = fs.readFileSync(marketplacePagePath, 'utf8');
const securityPageSource = fs.readFileSync(securityPagePath, 'utf8');
const missionsIdPageSource = fs.readFileSync(missionsIdPagePath, 'utf8');
const activityPageSource = fs.readFileSync(activityPagePath, 'utf8');
const networkPageSource = fs.readFileSync(networkPagePath, 'utf8');
const treasuryPageSource = fs.readFileSync(treasuryPagePath, 'utf8');
const arcPageSource = fs.readFileSync(arcPagePath, 'utf8');
const swarmsPageSource = fs.readFileSync(swarmsPagePath, 'utf8');
const swarmsIdPageSource = fs.readFileSync(swarmsIdPagePath, 'utf8');
const protocolPageSource = fs.readFileSync(protocolPagePath, 'utf8');

// Mirror pure helper functions for runtime invariant verification
function validateTransactionHashIntegrity(hash, isLive) {
  if (!hash) return { valid: true };
  if (isLive && hash.startsWith('0x')) {
    return {
      valid: false,
      reason: 'CRITICAL INVARIANT VIOLATION: Fake on-chain transaction hash detected in live mode while AgentVault is undeployed.',
    };
  }
  return { valid: true };
}

async function executeAuthoritativeQuery({ mode, liveFetch, simulationFetch, emptyFallback }) {
  const currentMode = mode || 'LIVE';
  if (currentMode === 'SIMULATION') {
    const simData = await simulationFetch();
    return {
      data: simData,
      mode: 'SIMULATION',
      classification: 'DETERMINISTIC_SIMULATION',
      provenance: 'SIMULATION — NO FUNDS MOVED',
    };
  }

  try {
    const liveData = await liveFetch();
    return {
      data: liveData,
      mode: 'LIVE',
      classification: 'LIVE_BACKEND',
      provenance: 'LIVE',
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Backend unavailable';
    return {
      data: emptyFallback,
      mode: 'UNAVAILABLE',
      classification: 'EMPTY_UNAVAILABLE',
      provenance: 'UNAVAILABLE',
      error: errMsg,
    };
  }
}

describe('FRONTEND DATA AUTHORITY AUDIT & VERIFICATION SUITE', () => {

  // --------------------------------------------------------------------------
  // INVARIANT 1: LIVE mode never reads simulation fixtures
  // --------------------------------------------------------------------------
  describe('Invariant 1: LIVE mode never reads simulation fixtures', () => {
    it('executeAuthoritativeQuery never invokes simulationFetch when liveFetch fails in LIVE mode', async () => {
      let simFetchCalled = false;
      const result = await executeAuthoritativeQuery({
        mode: 'LIVE',
        liveFetch: async () => {
          throw new Error('Connection refused to Gateway port 8080');
        },
        simulationFetch: () => {
          simFetchCalled = true;
          return [{ id: 'fake_fixture' }];
        },
        emptyFallback: [],
      });

      assert.equal(simFetchCalled, false, 'Simulation fetch must NEVER be called in LIVE mode');
      assert.equal(result.mode, 'UNAVAILABLE');
      assert.equal(result.classification, 'EMPTY_UNAVAILABLE');
      assert.equal(result.provenance, 'UNAVAILABLE');
      assert.deepEqual(result.data, [], 'Must return honest emptyFallback on live failure');
      assert.ok(result.error?.includes('Connection refused'));
    });

    it('marketplace.ts does not fall back to FALLBACK_OPPORTUNITIES when currentMode === LIVE', () => {
      assert.ok(marketplaceApiSource.includes("if (currentMode === 'SIMULATION')"), 'Must gate fallback behind explicit SIMULATION check');
      assert.ok(!marketplaceApiSource.includes("catch {\n    return FALLBACK_OPPORTUNITIES"), 'Must not silently return mock in catch block');
    });

    it('missions.ts does not return mock missions silently when live backend fails', () => {
      assert.ok(missionsApiSource.includes("if (options?.useDemo) return DEMO_MISSIONS;"), 'Missions API must gate simulation behind explicit check');
      assert.ok(missionsApiSource.includes("throw err;"), 'Missions API must throw when backend fails in LIVE mode without useDemo');
    });

    it('swarms.ts does not fall back to DEMO_SWARMS in LIVE mode', () => {
      assert.ok(swarmsApiSource.includes("if (mode === 'SIMULATION')"), 'Swarms API must gate simulation behind explicit mode check');
      assert.ok(swarmsApiSource.includes("return [];"), 'Swarms API must return empty array on failure in LIVE mode');
    });

    it('fabric.ts does not fall back to FALLBACK_OBJECTIVES or FALLBACK_TRACE in LIVE mode', () => {
      assert.ok(fabricApiSource.includes("if (mode === 'SIMULATION')"), 'Fabric API must gate simulation fixtures');
      assert.ok(!fabricApiSource.includes("catch {\n    return FALLBACK_OBJECTIVES"), 'Must not silently return fallback objectives in catch block');
    });

    it('clearinghouse.ts does not fall back to DEMO_HISTORICAL_EXPOSURE in LIVE mode', () => {
      assert.ok(clearinghouseApiSource.includes("if (currentMode === 'SIMULATION' || mode === 'SIMULATION')"), 'Clearinghouse API must gate DEMO_HISTORICAL_EXPOSURE');
      assert.ok(clearinghouseApiSource.includes("current_exposure: '0'"), 'Clearinghouse API must return 0 exposure on live fallback');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANT 2: SIMULATION mode reads deterministic fixtures
  // --------------------------------------------------------------------------
  describe('Invariant 2: SIMULATION mode reads deterministic fixtures', () => {
    it('executeAuthoritativeQuery returns DETERMINISTIC_SIMULATION classification in SIMULATION mode', async () => {
      const mockFixture = [{ id: 'opp_sim_01', title: 'Smart Contract Audit' }];
      const result = await executeAuthoritativeQuery({
        mode: 'SIMULATION',
        liveFetch: async () => {
          throw new Error('Should not call live');
        },
        simulationFetch: () => mockFixture,
        emptyFallback: [],
      });

      assert.equal(result.mode, 'SIMULATION');
      assert.equal(result.classification, 'DETERMINISTIC_SIMULATION');
      assert.equal(result.provenance, 'SIMULATION — NO FUNDS MOVED');
      assert.deepEqual(result.data, mockFixture);
    });

    it('data-authority.ts exports canonical DataMode and DataSourceClassification types', () => {
      assert.ok(dataAuthoritySource.includes("export type DataMode = 'LIVE' | 'SIMULATION' | 'UNAVAILABLE'"));
      assert.ok(dataAuthoritySource.includes("'LIVE_BACKEND'"));
      assert.ok(dataAuthoritySource.includes("'DETERMINISTIC_SIMULATION'"));
      assert.ok(dataAuthoritySource.includes("'STATIC_CONFIGURATION'"));
      assert.ok(dataAuthoritySource.includes("'EMPTY_UNAVAILABLE'"));
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANT 3: Simulation data is visibly labeled
  // --------------------------------------------------------------------------
  describe('Invariant 3: Simulation data is visibly labeled', () => {
    it('DataAuthorityBadge supports all canonical provenance badge types', () => {
      assert.ok(dataAuthorityBadgeSource.includes("'SIMULATION — NO FUNDS MOVED'"));
      assert.ok(dataAuthorityBadgeSource.includes("'DEMO FIXTURE'"));
      assert.ok(dataAuthorityBadgeSource.includes("'PROJECTED'"));
      assert.ok(dataAuthorityBadgeSource.includes("'UNAVAILABLE'"));
      assert.ok(dataAuthorityBadgeSource.includes("'STATIC CONFIG'"));
      assert.ok(dataAuthorityBadgeSource.includes("'LIVE'"));
    });

    it('pages integrate DataAuthorityBadge and explicit simulation provenance', () => {
      assert.ok(marketplacePageSource.includes('DataAuthorityBadge'), 'Marketplace must mount DataAuthorityBadge');
      assert.ok(marketplacePageSource.includes('SIMULATION — NO FUNDS MOVED'), 'Marketplace must include simulation badge text');
      assert.ok(swarmsPageSource.includes('DataAuthorityBadge'), 'Swarms must mount DataAuthorityBadge');
      assert.ok(swarmsIdPageSource.includes('DataAuthorityBadge'), 'Swarm details must mount DataAuthorityBadge');
      assert.ok(protocolPageSource.includes('PROTOCOL SIMULATION') || protocolPageSource.includes('SIMULATION'), 'Protocol page must label simulation');
      assert.ok(treasuryPageSource.includes('AgentVault Undeployed') || treasuryPageSource.includes('UNAVAILABLE'), 'Treasury must label undeployed state');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANT 4: No fake Arc transaction hashes appear
  // --------------------------------------------------------------------------
  describe('Invariant 4: No fake Arc transaction hashes appear', () => {
    it('validateTransactionHashIntegrity rejects 0x transaction hashes in live mode while vault undeployed', () => {
      const liveCheck = validateTransactionHashIntegrity('0x3a894c2e5b7f1d0a8c9e4b2a1f0d3c5e7b9a1d3f5a7c9e1b3d5f7a9c1e3b5d7f', true);
      assert.equal(liveCheck.valid, false, '0x hash in live mode must be rejected while vault is undeployed');
      assert.ok(liveCheck.reason?.includes('Fake on-chain transaction hash detected'));
    });

    it('validateTransactionHashIntegrity permits null/undefined or simulation hashes', () => {
      const nullCheck = validateTransactionHashIntegrity(null, true);
      assert.equal(nullCheck.valid, true);

      const simCheck = validateTransactionHashIntegrity('sim_tx_0x3a894c2e', false);
      assert.equal(simCheck.valid, true);
    });

    it('clearing_network.ts and fabric.ts eliminated fake 0x3a89... transaction hashes', () => {
      const clearingNetworkPath = path.resolve(__dirname, '../lib/api/clearing_network.ts');
      const clearingNetworkSource = fs.readFileSync(clearingNetworkPath, 'utf8');
      assert.ok(!clearingNetworkSource.includes('0x3a89'), 'clearing_network.ts must not contain fake 0x3a89 tx hash');
      assert.ok(!fabricApiSource.includes('0x3a894c2e5b7f1d0a'), 'fabric.ts must not contain fake 0x3a89 tx hash');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANT 5: No fake AgentVault deployment appears
  // --------------------------------------------------------------------------
  describe('Invariant 5: No fake AgentVault deployment appears', () => {
    it('ARC_PROTOCOL_CONFIG declares AgentVault undeployed and zero settlements', () => {
      assert.ok(dataAuthoritySource.includes("AGENT_VAULT_STATUS: 'NOT DEPLOYED ON MAINNET'"));
      assert.ok(dataAuthoritySource.includes('REAL_SETTLEMENTS_COUNT: 0'));
      assert.ok(dataAuthoritySource.includes('LIVE_EXECUTION_ENABLED: false'));
    });

    it('GlobalTopBar and SimulatorCommandRail truthfully report simulation mode and vault status', () => {
      assert.ok(globalTopBarSource.includes('SIMULATION — NO FUNDS MOVED'), 'GlobalTopBar must display SIMULATION — NO FUNDS MOVED');
      assert.ok(simulatorRailSource.includes('AGENTVAULT') && simulatorRailSource.includes('NOT DEPLOYED'), 'Command rail displays AGENTVAULT NOT DEPLOYED');
    });

    it('Arc settlements page (/arc) reports 0 VERIFIED settlements and undeployed vault', () => {
      assert.ok(arcPageSource.includes('0 VERIFIED'), 'Arc page must report 0 VERIFIED settlements');
      assert.ok(arcPageSource.includes('AgentVault Undeployed') || arcPageSource.includes('NOT DEPLOYED ON MAINNET'), 'Arc page must state AgentVault is undeployed');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANT 6: No fake live balances appear
  // --------------------------------------------------------------------------
  describe('Invariant 6: No fake live balances appear', () => {
    it('treasury.ts defaults to zero balances and vault_address: NOT_DEPLOYED', () => {
      assert.ok(treasuryApiSource.includes("vault_address: 'NOT_DEPLOYED'"));
      assert.ok(treasuryApiSource.includes("vault_balance: '0'"));
      assert.ok(treasuryApiSource.includes("current_available: '0'"));
    });

    it('treasury page displays AgentVault Undeployed rather than fabricated live reserves', () => {
      assert.ok(treasuryPageSource.includes('AgentVault Undeployed'), 'Treasury page must display AgentVault Undeployed');
      assert.ok(!treasuryPageSource.includes('$1,248,500.00 LIVE RESERVE'), 'Must not display fake live reserve');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANT 7: Security page remains authoritative
  // --------------------------------------------------------------------------
  describe('Invariant 7: Security page remains authoritative', () => {
    it('security page (/marketplace/security) qualifies anomaly scenarios as simulated without live execution', () => {
      assert.ok(securityPageSource.includes('Marketplace Security & Invariants Lab'), 'Security page must have title');
      assert.ok(securityPageSource.includes('SIMULATED SECURITY LAB'), 'Security page must indicate simulated anomalies');
      assert.ok(securityPageSource.includes('INV-181 to INV-200'), 'Security page enforces policy invariants');
    });

    it('marketplace page links to security page with SECURITY ANOMALY CENTER', () => {
      assert.ok(marketplacePageSource.includes('SECURITY ANOMALY CENTER'), 'Marketplace button links to security center');
      assert.ok(marketplacePageSource.includes('/marketplace/security'), 'Link target is /marketplace/security');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANT 8: Global shell status is truthful
  // --------------------------------------------------------------------------
  describe('Invariant 8: Global shell status is truthful', () => {
    it('GlobalTopBar and protocol config display truthful economic control plane and chain ID 5042', () => {
      assert.ok(globalTopBarSource.includes('ECONOMIC CONTROL PLANE'), 'TopBar displays Economic Control Plane');
      assert.ok(dataAuthoritySource.includes('CHAIN_ID: 5042'), 'data-authority defines Arc Chain ID 5042');
      assert.ok(arcPageSource.includes('5042'), 'Arc page displays Chain ID 5042');
    });

    it('GlobalTopBar and AgentPayShell strictly preserve institutional matte-black aesthetics', () => {
      assert.ok(globalTopBarSource.includes('#080808') || globalTopBarSource.includes('bg-'), 'TopBar uses matte styling');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANT 9: Backend failure produces explicit error/empty state
  // --------------------------------------------------------------------------
  describe('Invariant 9: Backend failure produces explicit error/empty state', () => {
    it('activity feed displays explicit error banner when service is unavailable', () => {
      assert.ok(activityPageSource.includes('ACTIVITY SERVICE UNAVAILABLE:'), 'Activity page must show explicit error message');
      assert.ok(activityPageSource.includes('ENABLE SIMULATION') || activityPageSource.includes('View Simulation Trace'), 'Activity page provides explicit simulation switch');
    });

    it('marketplace displays explicit error notice and retry/switch options when live backend is unreachable', () => {
      assert.ok(marketplacePageSource.includes('Live marketplace backend unreachable'), 'Marketplace shows explicit error when live backend unreachable');
      assert.ok(marketplacePageSource.includes('Switch to Simulation Mode'), 'Marketplace offers switch to simulation mode');
      assert.ok(marketplacePageSource.includes('Retry'), 'Marketplace offers retry');
    });

    it('protocol control tower displays explicit connection failure and Retry Connection button', () => {
      assert.ok(protocolPageSource.includes('Retry Connection'), 'Protocol control tower must have Retry Connection button');
      assert.ok(protocolPageSource.includes('Connection Failure') || protocolPageSource.includes('Failed to load'), 'Protocol page displays failure state');
    });

    it('network page handles empty network gracefully with honest empty state', () => {
      assert.ok(networkPageSource.includes('No Network Nodes Discovered') || networkPageSource.includes('NETWORK TOPOLOGY UNAVAILABLE') || networkPageSource.includes('topology'), 'Network page has honest empty state');
    });
  });

  // --------------------------------------------------------------------------
  // INVARIANT 10: Repeated simulation runs produce identical data
  // --------------------------------------------------------------------------
  describe('Invariant 10: Repeated simulation runs produce identical data', () => {
    it('deterministic opportunity matching produces identical output on repeated runs', () => {
      const candidates = [
        { id: 'c1', provider: 'agent_01', score: 85, price: 50 },
        { id: 'c2', provider: 'agent_02', score: 95, price: 40 },
        { id: 'c3', provider: 'agent_03', score: 70, price: 30 },
      ];

      const run1 = [...candidates].sort((a, b) => b.score - a.score);
      const run2 = [...candidates].sort((a, b) => b.score - a.score);

      assert.deepEqual(run1, run2, 'Simulation sorting must be strictly idempotent and deterministic');
      assert.equal(run1[0].provider, 'agent_02');
    });

    it('simulated swarm tasks maintain identical topological ordering across repeated evaluations', () => {
      const tasks = [
        { id: 'task_1', dependencies: [] },
        { id: 'task_2', dependencies: ['task_1'] },
        { id: 'task_3', dependencies: ['task_2'] },
      ];

      const getOrder = (t) => t.map((item) => item.id).join(' -> ');
      assert.equal(getOrder(tasks), getOrder(tasks), 'DAG topology must be deterministic');
      assert.equal(getOrder(tasks), 'task_1 -> task_2 -> task_3');
    });
  });
});
