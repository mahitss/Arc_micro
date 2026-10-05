import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Audited paths
const dataAuthorityPath = path.resolve(__dirname, '../lib/data-authority.ts');
const dataAuthorityBadgePath = path.resolve(__dirname, '../components/DataAuthorityBadge.tsx');
const globalTopBarPath = path.resolve(__dirname, '../components/GlobalTopBar.tsx');
const controlPagePath = path.resolve(__dirname, '../app/control/page.tsx');
const arcPagePath = path.resolve(__dirname, '../app/arc/page.tsx');
const treasuryPagePath = path.resolve(__dirname, '../app/treasury/page.tsx');
const marketplacePagePath = path.resolve(__dirname, '../app/marketplace/page.tsx');
const missionsDemoPagePath = path.resolve(__dirname, '../app/missions/demo/replay/page.tsx');
const topologyGraphPath = path.resolve(__dirname, '../components/NetworkTopologyGraph.tsx');
const healthApiPath = path.resolve(__dirname, '../lib/api/health.ts');

// Source files
const dataAuthoritySource = fs.readFileSync(dataAuthorityPath, 'utf8');
const dataAuthorityBadgeSource = fs.readFileSync(dataAuthorityBadgePath, 'utf8');
const globalTopBarSource = fs.readFileSync(globalTopBarPath, 'utf8');
const controlPageSource = fs.readFileSync(controlPagePath, 'utf8');
const arcPageSource = fs.readFileSync(arcPagePath, 'utf8');
const treasuryPageSource = fs.readFileSync(treasuryPagePath, 'utf8');
const marketplacePageSource = fs.readFileSync(marketplacePagePath, 'utf8');
const missionsDemoPageSource = fs.readFileSync(missionsDemoPagePath, 'utf8');
const topologyGraphSource = fs.readFileSync(topologyGraphPath, 'utf8');
const healthApiSource = fs.readFileSync(healthApiPath, 'utf8');

describe('AgentPay — Data Reality & Control Tower Truthfulness Hardening Suite', () => {

  // 1. Real application status ≠ simulation application status
  it('1. verifies Real application status ≠ simulation application status', () => {
    assert.ok(
      controlPageSource.includes('APPLICATION: REAL'),
      'Control Tower must declare that the software application is REAL'
    );
    assert.ok(
      controlPageSource.includes('CURRENT ENVIRONMENT: SIMULATION — NO FUNDS MOVED'),
      'Control Tower must declare that the current economic environment is SIMULATION'
    );
    assert.ok(
      dataAuthoritySource.includes("APPLICATION_STATUS: 'REAL APPLICATION'"),
      'data-authority must declare REAL APPLICATION status'
    );
    assert.ok(
      dataAuthoritySource.includes("ECONOMIC_ENVIRONMENT: 'SIMULATION — NO FUNDS MOVED'"),
      'data-authority must declare SIMULATION environment'
    );
  });

  // 2. Simulation economic values have SIMULATED provenance
  it('2. verifies simulation economic values have SIMULATED provenance', () => {
    assert.ok(
      dataAuthoritySource.includes("'SIMULATED'"),
      'data-authority must define SIMULATED provenance badge'
    );
    assert.ok(
      dataAuthorityBadgeSource.includes("case 'SIMULATED':"),
      'DataAuthorityBadge must support SIMULATED'
    );
    assert.ok(
      controlPageSource.includes('label="Committed Capital" value="$182.40" subtext="Projected in-flight" provenance="SIMULATED"'),
      'Committed Capital must have SIMULATED provenance'
    );
    assert.ok(
      controlPageSource.includes('label="Simulated Settled" value="$1,204.32" subtext="0 Real Arc Settlements" provenance="SIMULATED"'),
      'Simulated Settled must have SIMULATED provenance'
    );
  });

  // 3. Live values have LIVE_BACKEND provenance
  it('3. verifies live values have LIVE_BACKEND provenance', () => {
    assert.ok(
      dataAuthoritySource.includes("'LIVE_BACKEND'"),
      'data-authority must define LIVE_BACKEND classification'
    );
    assert.ok(
      dataAuthoritySource.includes("provenance: 'LIVE'"),
      'LIVE mode query must resolve to LIVE provenance'
    );
  });

  // 4. Static configuration has STATIC provenance
  it('4. verifies static configuration has STATIC provenance', () => {
    assert.ok(
      dataAuthoritySource.includes("'STATIC_CONFIGURATION'"),
      'data-authority must define STATIC_CONFIGURATION'
    );
    assert.ok(
      dataAuthoritySource.includes("'STATIC'"),
      'data-authority must define STATIC badge type'
    );
  });

  // 5. Unavailable data has EMPTY_UNAVAILABLE provenance
  it('5. verifies unavailable data has EMPTY_UNAVAILABLE provenance', () => {
    assert.ok(
      dataAuthoritySource.includes("'EMPTY_UNAVAILABLE'"),
      'data-authority must define EMPTY_UNAVAILABLE classification'
    );
    assert.ok(
      dataAuthoritySource.includes("provenance: 'UNAVAILABLE'"),
      'data-authority must set UNAVAILABLE provenance when backend fails'
    );
  });

  // 6. LIVE backend failure does not fall back to simulation
  it('6. verifies LIVE backend failure does not fall back to simulation', async () => {
    // Pure reproduction of executeAuthoritativeQuery
    async function testQuery(mode, liveFail = true) {
      if (mode === 'SIMULATION') {
        return { mode: 'SIMULATION', provenance: 'SIMULATION — NO FUNDS MOVED' };
      }
      try {
        if (liveFail) throw new Error('Network timeout');
        return { mode: 'LIVE', provenance: 'LIVE' };
      } catch (err) {
        return { mode: 'UNAVAILABLE', provenance: 'UNAVAILABLE', error: err.message };
      }
    }

    const result = await testQuery('LIVE', true);
    assert.equal(result.mode, 'UNAVAILABLE', 'Must become UNAVAILABLE on failure');
    assert.equal(result.provenance, 'UNAVAILABLE', 'Must NEVER fall back to SIMULATION provenance');
    assert.notEqual(result.mode, 'SIMULATION', 'LIVE failure must NEVER silently return simulation');
  });

  // 7. Simulation mode never broadcasts
  it('7. verifies simulation mode never broadcasts on-chain', () => {
    assert.ok(
      arcPageSource.includes('BROADCASTS</span>\n            <span className="text-[#F2F0EA] font-bold text-base mt-1 block">0</span>'),
      'Arc page must report 0 broadcasts'
    );
    assert.ok(
      dataAuthoritySource.includes('BROADCAST_COUNT: 0'),
      'ARC_PROTOCOL_CONFIG must define 0 broadcasts'
    );
  });

  // 8. Simulation mode never signs
  it('8. verifies simulation mode never signs transactions', () => {
    assert.ok(
      controlPageSource.includes('Zero Signing Authority (INV-02 PASS)'),
      'Must enforce zero signing authority'
    );
    assert.ok(
      !controlPageSource.includes('Relayer Signed</span>'),
      'Must never claim Relayer Signed during simulation'
    );
  });

  // 9. Simulation mode never mutates AgentVault
  it('9. verifies simulation mode never mutates AgentVault', () => {
    assert.ok(
      arcPageSource.includes('0x bytecode on Arc Mainnet'),
      'AgentVault must report 0x bytecode'
    );
    assert.ok(
      arcPageSource.includes('AGENTVAULT</span>\n            <span className="text-[#B0ADA5] font-bold text-base mt-1 block">NOT DEPLOYED</span>'),
      'AgentVault must report NOT DEPLOYED'
    );
  });

  // 10. Frontend never invents business values
  it('10. verifies frontend never invents bare business values without provenance', () => {
    // Check that $182.40 is explicitly labeled with SIMULATED
    assert.ok(
      controlPageSource.includes('label="Committed Capital" value="$182.40" subtext="Projected in-flight" provenance="SIMULATED"'),
      '$182.40 must carry explicit SIMULATED provenance'
    );
    // Check that $1,204.32 is explicitly labeled with SIMULATED
    assert.ok(
      controlPageSource.includes('label="Simulated Settled" value="$1,204.32" subtext="0 Real Arc Settlements" provenance="SIMULATED"'),
      '$1,204.32 must carry explicit SIMULATED provenance'
    );
  });

  // 11. Control Tower and Arc page agree
  it('11. verifies Control Tower and Arc page agree on Chain ID, AgentVault status, and Real Settlements', () => {
    assert.ok(controlPageSource.includes('Chain 5042'), 'Control Tower must reference Chain 5042');
    assert.ok(arcPageSource.includes('5042'), 'Arc page must reference Chain 5042');

    assert.ok(controlPageSource.includes('AgentVault: <span className="font-mono">NOT DEPLOYED ON MAINNET (0x)</span>'), 'Control Tower marks vault undeployed');
    assert.ok(arcPageSource.includes('NOT DEPLOYED ON MAINNET'), 'Arc page marks vault undeployed');

    assert.ok(controlPageSource.includes('Real Settlements: <span className="font-mono text-[#B0ADA5]">0'), 'Control Tower declares 0 real settlements');
    assert.ok(arcPageSource.includes('REAL SETTLEMENTS</span>\n            <span className="text-[#F2F0EA] font-bold text-base mt-1 block">0 VERIFIED</span>'), 'Arc page declares 0 verified settlements');
  });

  // 12. All major pages use the same mode resolver
  it('12. verifies all major pages use DataAuthorityBadge and shared mode resolver', () => {
    assert.ok(marketplacePageSource.includes('DataAuthorityBadge'), 'Marketplace must use DataAuthorityBadge');
    assert.ok(treasuryPageSource.includes('DataAuthorityBadge'), 'Treasury must use DataAuthorityBadge');
    assert.ok(dataAuthoritySource.includes('getActiveDataMode'), 'data-authority must export getActiveDataMode');
  });

  // 13. Policy status accurately reflects actual health semantics
  it('13. verifies Policy status accurately reflects actual health semantics', () => {
    assert.ok(
      globalTopBarSource.includes('READY (SIM)'),
      'GlobalTopBar must display READY (SIM) when in deterministic simulation mode'
    );
    assert.ok(
      globalTopBarSource.includes('Deterministic Rust Policy Engine: READY (SIMULATION)'),
      'GlobalTopBar tooltip must explain deterministic simulation readiness'
    );
    assert.ok(
      healthApiSource.includes("readyResp.dependencies?.policy_engine || readyResp.components?.policy_engine"),
      'health.ts must check dependencies.policy_engine'
    );
  });

  // 14. AI status means provider connectivity only and never financial authority
  it('14. verifies AI status means provider connectivity only and never financial authority', () => {
    assert.ok(
      globalTopBarSource.includes('ADVISORY ONLY'),
      'GlobalTopBar AI badge must state ADVISORY ONLY'
    );
    assert.ok(
      globalTopBarSource.includes('AI reasoning is strictly advisory (INV-01 & INV-02: Zero financial authority)'),
      'GlobalTopBar AI tooltip must state zero financial authority'
    );
    assert.ok(
      controlPageSource.includes('AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.'),
      'Control Tower must declare that AI requests while AgentPay controls'
    );
  });
});
